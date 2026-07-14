import type { SensorReading } from './data';
import type { RoomData, Reading } from '../data/mockData';
import { interventionsFromStates } from '../config/interventions';
import {
  FALLBACK_NODE_POS,
  nodeRole,
  normalizeOrientation,
  roomLabel,
  type RoomMeta,
} from '../config/rooms';
import { FLOORS, type FloorNumber } from '../config/floors';

export interface TransformedData {
  roomData: Record<string, RoomData>;
  kestrelRoomData: Record<string, Reading[]>;
  outdoorReadings: Reading[];
  controlReadings: Record<FloorNumber, Reading[] | null>;
}

const OUTDOOR_ROOMS = new Set(['courtyard', 'penthouse']);

const fToC = (f: number): number => +((f - 32) * 5 / 9).toFixed(2);

function isDaytime(iso: string): boolean {
  const h = new Date(iso).getHours();
  return h >= 7 && h < 19;
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

function peak(xs: number[]): number {
  return xs.length === 0 ? 0 : Math.max(...xs);
}

function isFloorNumber(n: number): n is FloorNumber {
  return FLOORS.some((f) => f.floor === n);
}

/** Prefer a reading that carries floor + node coords. */
function pickPlacementSample(raw: SensorReading[]): SensorReading | null {
  return (
    raw.find((r) => r.floor != null && r.node_x != null && r.node_y != null) ??
    raw.find((r) => r.floor != null) ??
    raw[0] ??
    null
  );
}

function resolvePosition(
  room: string,
  sample: SensorReading,
): { xNorm: number; yNorm: number } | null {
  if (sample.node_x != null && sample.node_y != null) {
    return { xNorm: sample.node_x, yNorm: sample.node_y };
  }
  return FALLBACK_NODE_POS[room] ?? null;
}

function buildMeta(room: string, sample: SensorReading): RoomMeta | null {
  if (sample.floor == null || !isFloorNumber(sample.floor)) return null;
  const pos = resolvePosition(room, sample);
  if (!pos) return null;
  return {
    room,
    floor: sample.floor,
    xNorm: pos.xNorm,
    yNorm: pos.yNorm,
    orientation: normalizeOrientation(sample.orientation),
    role: nodeRole(room),
  };
}

export function transformReadings(readings: SensorReading[]): TransformedData {
  const byRoom = new Map<string, SensorReading[]>();
  for (const r of readings) {
    const key = String(r.room).toLowerCase();
    const list = byRoom.get(key) ?? [];
    list.push(r);
    byRoom.set(key, list);
  }

  const roomData: Record<string, RoomData> = {};
  const kestrelRoomData: Record<string, Reading[]> = {};

  for (const [room, raw] of byRoom) {
    if (OUTDOOR_ROOMS.has(room)) continue;

    const sample = pickPlacementSample(raw);
    if (!sample) continue;
    const meta = buildMeta(room, sample);
    if (!meta) continue;

    const hoboRaw = raw.filter((r) => !r.device_type || r.device_type === 'hobo');
    const kestrelRaw = raw.filter((r) => r.device_type === 'kestrel');
    const source = hoboRaw.length > 0 ? hoboRaw : raw;

    const rs: Reading[] = source.map((r) => ({
      timestamp: r.timestamp,
      temperatureC: fToC(r.temperature_f),
      humidityPct: r.humidity_pct,
      ...(r.heat_index_f != null ? { heatIndexC: fToC(r.heat_index_f) } : {}),
    }));
    const day = rs.filter((r) => isDaytime(r.timestamp));
    const night = rs.filter((r) => !isDaytime(r.timestamp));
    const stateSample =
      raw.find(
        (r) =>
          r.window_state?.trim() ||
          r.blinds_state?.trim() ||
          r.fan?.trim(),
      ) ?? sample;

    roomData[room] = {
      meta,
      readings: rs,
      peakDaytimeC: +(peak(day.map((r) => r.temperatureC))).toFixed(2),
      avgDaytimeC: +(mean(day.map((r) => r.temperatureC))).toFixed(2),
      avgNighttimeC: +(mean(night.map((r) => r.temperatureC))).toFixed(2),
      avgHumidity: +(mean(rs.map((r) => r.humidityPct))).toFixed(1),
      lastCollected: rs.length ? rs[rs.length - 1].timestamp : '',
      interventions: interventionsFromStates(
        stateSample.window_state,
        stateSample.blinds_state,
        stateSample.fan,
      ),
    };

    if (kestrelRaw.length > 0) {
      kestrelRoomData[room] = kestrelRaw.map((r) => ({
        timestamp: r.timestamp,
        temperatureC: fToC(r.temperature_f),
        humidityPct: r.humidity_pct,
        ...(r.heat_index_f != null ? { heatIndexC: fToC(r.heat_index_f) } : {}),
        wbgtF: r.wbgt_f ?? undefined,
      }));
    }
  }

  const toReadings = (raw: SensorReading[]): Reading[] =>
    raw.map((r) => ({
      timestamp: r.timestamp,
      temperatureC: fToC(r.temperature_f),
      humidityPct: r.humidity_pct,
      ...(r.heat_index_f != null ? { heatIndexC: fToC(r.heat_index_f) } : {}),
    }));

  const outdoorRaw = [
    ...toReadings(byRoom.get('courtyard') ?? []),
    ...toReadings(byRoom.get('penthouse') ?? []),
  ];
  const outdoorByTime = new Map<string, number[]>();
  for (const r of outdoorRaw) {
    const bucket = outdoorByTime.get(r.timestamp) ?? [];
    bucket.push(r.temperatureC);
    outdoorByTime.set(r.timestamp, bucket);
  }
  const outdoorReadings: Reading[] = [...outdoorByTime.entries()]
    .map(([timestamp, temps]) => ({
      timestamp,
      temperatureC: +mean(temps).toFixed(2),
      humidityPct: 0,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return {
    roomData,
    kestrelRoomData,
    outdoorReadings,
    controlReadings: { 3: null, 5: null, 7: null },
  };
}

/** Floors that have at least one placeable node in this phase (landing-button order). */
export function floorsWithNodes(roomData: Record<string, RoomData>): FloorNumber[] {
  const present = new Set(
    Object.values(roomData).map((d) => d.meta.floor),
  );
  return FLOORS.filter((f) => present.has(f.floor)).map((f) => f.floor);
}

export function roomsOnFloor(
  roomData: Record<string, RoomData>,
  floor: FloorNumber,
): RoomData[] {
  return Object.values(roomData).filter((d) => d.meta.floor === floor);
}

export function computeFloorStats(roomData: Record<string, RoomData>, floor: FloorNumber) {
  const data = roomsOnFloor(roomData, floor);
  if (data.length === 0) {
    return {
      avgTempC: null as number | null,
      avgHumidity: null as number | null,
      lastUpdated: null as string | null,
    };
  }
  const allReadings = data.flatMap((d) => d.readings);
  return {
    avgTempC: allReadings.length
      ? +(mean(allReadings.map((r) => r.temperatureC))).toFixed(2)
      : (null as number | null),
    avgHumidity: +(mean(data.map((d) => d.avgHumidity))).toFixed(1),
    lastUpdated:
      data.map((d) => d.lastCollected).filter(Boolean).sort().reverse()[0] ??
      (null as string | null),
  };
}

export interface PhaseStatHighlight {
  valueC: number;
  node: string;
}

export interface PhaseStats {
  tempHigh: PhaseStatHighlight | null;
  heatIndexHigh: PhaseStatHighlight | null;
  lowestAvgNighttime: PhaseStatHighlight | null;
}

/** Phase-wide extrema from already-transformed room nodes. */
export function computePhaseStats(roomData: Record<string, RoomData>): PhaseStats {
  const rooms = Object.values(roomData);
  if (rooms.length === 0) {
    return { tempHigh: null, heatIndexHigh: null, lowestAvgNighttime: null };
  }

  let tempHigh: PhaseStatHighlight | null = null;
  let heatIndexHigh: PhaseStatHighlight | null = null;
  let lowestAvgNighttime: PhaseStatHighlight | null = null;

  for (const data of rooms) {
    const node = roomLabel(data.meta);

    for (const r of data.readings) {
      if (tempHigh === null || r.temperatureC > tempHigh.valueC) {
        tempHigh = { valueC: r.temperatureC, node };
      }
      if (r.heatIndexC != null) {
        if (heatIndexHigh === null || r.heatIndexC > heatIndexHigh.valueC) {
          heatIndexHigh = { valueC: r.heatIndexC, node };
        }
      }
    }

    if (
      lowestAvgNighttime === null ||
      data.avgNighttimeC < lowestAvgNighttime.valueC
    ) {
      lowestAvgNighttime = { valueC: data.avgNighttimeC, node };
    }
  }

  return {
    tempHigh: tempHigh
      ? { ...tempHigh, valueC: +tempHigh.valueC.toFixed(2) }
      : null,
    heatIndexHigh: heatIndexHigh
      ? { ...heatIndexHigh, valueC: +heatIndexHigh.valueC.toFixed(2) }
      : null,
    lowestAvgNighttime: lowestAvgNighttime
      ? { ...lowestAvgNighttime, valueC: +lowestAvgNighttime.valueC.toFixed(2) }
      : null,
  };
}
