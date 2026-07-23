import type { PhaseMetadata, SensorMeta, SensorReading } from './data';
import type { RoomData, Reading } from '../data/mockData';
import {
  DEFAULT_INTERVENTION_CATALOG,
  interventionsFromStates,
} from '../config/interventions';
import {
  FALLBACK_NODE_POS,
  nodeRole,
  normalizeOrientation,
  roomLabel,
  type RoomMeta,
} from '../config/rooms';
import { FLOORS, type FloorNumber } from '../config/floors';
import type { PrimaryDevice } from '../config/phases';
import type { TempUnit } from '../config/tempUnit';

export type { PrimaryDevice };

export interface TransformOptions {
  /** Device that drives room metrics / color (chart still plots both when present). */
  primaryDevice?: PrimaryDevice;
}

export interface TransformedData {
  roomData: Record<string, RoomData>;
  /** Kestrel overlay series for the popup chart (always when present). */
  kestrelRoomData: Record<string, Reading[]>;
  outdoorReadings: Reading[];
  /** Legend label for the outdoor series (e.g. includes Kresge Oval when used). */
  outdoorLabel: string;
}

const OUTDOOR_ROOMS = new Set(['courtyard', 'penthouse', 'kresge']);
const DEFAULT_OUTDOOR_LABEL = 'Outdoor (avg)';
const KRESGE_OUTDOOR_LABEL = 'Outdoor (avg) — Kresge Oval';

/** Night is 20:00–09:00; daytime is everything else (09:00–20:00). */
function isDaytime(iso: string): boolean {
  const h = new Date(iso).getHours();
  return h >= 9 && h < 20;
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
  sensorMeta?: SensorMeta,
): { xNorm: number; yNorm: number } | null {
  const x = sensorMeta?.node_x ?? sample.node_x;
  const y = sensorMeta?.node_y ?? sample.node_y;
  if (x != null && y != null) {
    return { xNorm: x, yNorm: y };
  }
  return FALLBACK_NODE_POS[room] ?? null;
}

function buildMeta(
  room: string,
  sample: SensorReading,
  sensorMeta?: SensorMeta,
): RoomMeta | null {
  const floor = sensorMeta?.floor ?? sample.floor;
  if (floor == null || !isFloorNumber(floor)) return null;
  const pos = resolvePosition(room, sample, sensorMeta);
  if (!pos) return null;
  return {
    room,
    floor,
    xNorm: pos.xNorm,
    yNorm: pos.yNorm,
    orientation: normalizeOrientation(sensorMeta?.orientation ?? sample.orientation),
    role: nodeRole(room),
    label: sensorMeta?.label ?? null,
  };
}

function protocolStates(
  sample: SensorReading,
  sensorMeta?: SensorMeta,
): {
  window_state?: string | null;
  blinds_state?: string | null;
  blinds_shade?: string | null;
  fan?: string | null;
} {
  // Prefer editable metadata.json when the sensor entry exists; otherwise readings.
  if (!sensorMeta) {
    return {
      window_state: sample.window_state,
      blinds_state: sample.blinds_state,
      fan: sample.fan,
    };
  }
  return {
    window_state:
      "window_state" in sensorMeta ? sensorMeta.window_state : sample.window_state,
    blinds_state:
      "blinds_state" in sensorMeta ? sensorMeta.blinds_state : sample.blinds_state,
    blinds_shade:
      "blinds_shade" in sensorMeta ? sensorMeta.blinds_shade : null,
    fan: "fan" in sensorMeta ? sensorMeta.fan : sample.fan,
  };
}

/** Pull C/F and heat index (°F) from the export — no unit conversion. */
function toReading(r: SensorReading): Reading {
  return {
    timestamp: r.timestamp,
    temperatureC: r.temperature_c,
    temperatureF: r.temperature_f,
    humidityPct: r.humidity_pct,
    ...(r.heat_index_c != null ? { heatIndexC: r.heat_index_c } : {}),
    ...(r.heat_index_f != null ? { heatIndexF: r.heat_index_f } : {}),
    ...(r.wbgt_f != null ? { wbgtF: r.wbgt_f } : {}),
    ...(r.skipped ? { skipped: true } : {}),
  };
}

export function readingTemp(r: Reading, unit: TempUnit): number {
  return unit === 'f' ? r.temperatureF : r.temperatureC;
}

/** WBGT is exported only as °F; convert for the chart when the dashboard is in °C. */
export function readingWbgt(r: Reading, unit: TempUnit): number | undefined {
  if (r.wbgtF === undefined) return undefined;
  return unit === 'f' ? r.wbgtF : +(((r.wbgtF - 32) * 5) / 9).toFixed(2);
}

export function transformReadings(
  readings: SensorReading[],
  metadata?: PhaseMetadata | null,
  options?: TransformOptions,
): TransformedData {
  const catalog = metadata?.interventions ?? DEFAULT_INTERVENTION_CATALOG;
  const sensors = metadata?.sensors ?? {};
  const primaryDevice: PrimaryDevice = options?.primaryDevice ?? "hobo";

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
    const sensorMeta = sensors[room];
    const meta = buildMeta(room, sample, sensorMeta);
    if (!meta) continue;

    const hoboRaw = raw.filter((r) => !r.device_type || r.device_type === 'hobo');
    const kestrelRaw = raw.filter((r) => r.device_type === 'kestrel');

    // Chart primary series stays HOBO whenever present (legend color/position).
    const chartRaw =
      hoboRaw.length > 0 ? hoboRaw : kestrelRaw.length > 0 ? kestrelRaw : raw;
    // Metrics / color use the phase's preferred device.
    const metricRaw =
      primaryDevice === "kestrel" && kestrelRaw.length > 0
        ? kestrelRaw
        : chartRaw;

    const rs: Reading[] = chartRaw.map(toReading);
    const metricRs: Reading[] = metricRaw.map(toReading);
    const kept = metricRs.filter((r) => !r.skipped);
    const day = kept.filter((r) => isDaytime(r.timestamp));
    const night = kept.filter((r) => !isDaytime(r.timestamp));
    const stateSample =
      raw.find(
        (r) =>
          r.window_state?.trim() ||
          r.blinds_state?.trim() ||
          r.fan?.trim(),
      ) ?? sample;
    const protocol = protocolStates(stateSample, sensorMeta);

    roomData[room] = {
      meta,
      readings: rs,
      ...(metricRaw !== chartRaw ? { metricReadings: metricRs } : {}),
      peakDaytimeC: +(peak(day.map((r) => r.temperatureC))).toFixed(2),
      peakDaytimeF: +(peak(day.map((r) => r.temperatureF))).toFixed(2),
      avgDaytimeC: +(mean(day.map((r) => r.temperatureC))).toFixed(2),
      avgDaytimeF: +(mean(day.map((r) => r.temperatureF))).toFixed(2),
      avgNighttimeC: +(mean(night.map((r) => r.temperatureC))).toFixed(2),
      avgNighttimeF: +(mean(night.map((r) => r.temperatureF))).toFixed(2),
      avgHumidity: +(mean(kept.map((r) => r.humidityPct))).toFixed(1),
      lastCollected: kept.length
        ? kept[kept.length - 1].timestamp
        : rs.length
          ? rs[rs.length - 1].timestamp
          : '',
      interventions: interventionsFromStates(
        protocol.window_state,
        protocol.blinds_state,
        protocol.fan,
        catalog,
        protocol.blinds_shade,
      ),
    };

    if (kestrelRaw.length > 0) {
      kestrelRoomData[room] = kestrelRaw.map(toReading);
    }
  }

  const outdoorRaw = [
    ...(byRoom.get('courtyard') ?? []).map(toReading),
    ...(byRoom.get('penthouse') ?? []).map(toReading),
    ...(byRoom.get('kresge') ?? []).map(toReading),
  ];
  const outdoorByTime = new Map<string, { c: number[]; f: number[] }>();
  for (const r of outdoorRaw) {
    const bucket = outdoorByTime.get(r.timestamp) ?? { c: [], f: [] };
    bucket.c.push(r.temperatureC);
    bucket.f.push(r.temperatureF);
    outdoorByTime.set(r.timestamp, bucket);
  }
  const outdoorReadings: Reading[] = [...outdoorByTime.entries()]
    .map(([timestamp, temps]) => ({
      timestamp,
      temperatureC: +mean(temps.c).toFixed(2),
      temperatureF: +mean(temps.f).toFixed(2),
      humidityPct: 0,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const outdoorLabel = byRoom.has('kresge')
    ? KRESGE_OUTDOOR_LABEL
    : DEFAULT_OUTDOOR_LABEL;

  return {
    roomData,
    kestrelRoomData,
    outdoorReadings,
    outdoorLabel,
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
      avgPeakDaytimeC: null as number | null,
      avgPeakDaytimeF: null as number | null,
      avgNighttimeC: null as number | null,
      avgNighttimeF: null as number | null,
      avgHumidity: null as number | null,
      lastUpdated: null as string | null,
    };
  }
  return {
    avgPeakDaytimeC: +(mean(data.map((d) => d.peakDaytimeC))).toFixed(2),
    avgPeakDaytimeF: +(mean(data.map((d) => d.peakDaytimeF))).toFixed(2),
    avgNighttimeC: +(mean(data.map((d) => d.avgNighttimeC))).toFixed(2),
    avgNighttimeF: +(mean(data.map((d) => d.avgNighttimeF))).toFixed(2),
    avgHumidity: +(mean(data.map((d) => d.avgHumidity))).toFixed(1),
    lastUpdated:
      data.map((d) => d.lastCollected).filter(Boolean).sort().reverse()[0] ??
      (null as string | null),
  };
}

/** Shared Y-axis domain for node popups on one floor so switching nodes does not rescale. */
export type ChartYDomain = [number, number];

const CHART_TICK_STEP_FINE = 5;
const CHART_TICK_STEP_COARSE = 10;
/** Prefer 5° ticks unless that would exceed this many labels. */
const MAX_FINE_TICKS = 5;
/** Degrees of padding applied before snapping to multiples of 5. */
const CHART_DOMAIN_PAD = 1;

function pushTemps(
  values: number[],
  readings: Reading[] | null | undefined,
  unit: TempUnit,
) {
  if (!readings) return;
  for (const r of readings) {
    values.push(readingTemp(r, unit));
    const wbgt = readingWbgt(r, unit);
    if (wbgt !== undefined) values.push(wbgt);
  }
}

/** Pad by 1°, then snap to multiples of 5: floor min down, ceil max up. */
function snapChartDomain(min: number, max: number): ChartYDomain {
  let lo = Math.floor((min - CHART_DOMAIN_PAD) / CHART_TICK_STEP_FINE) * CHART_TICK_STEP_FINE;
  let hi = Math.ceil((max + CHART_DOMAIN_PAD) / CHART_TICK_STEP_FINE) * CHART_TICK_STEP_FINE;
  if (lo === hi) hi += CHART_TICK_STEP_FINE;
  return [lo, hi];
}

function tickCount(lo: number, hi: number, step: number): number {
  return Math.round((hi - lo) / step) + 1;
}

/**
 * Y ticks within a snapped (multiples-of-5) domain.
 * Every 5° when that yields ≤5 labels; otherwise only multiples of 10
 * that fall inside the domain (domain itself is not widened).
 */
export function chartDomainTicks([lo, hi]: ChartYDomain): number[] {
  if (tickCount(lo, hi, CHART_TICK_STEP_FINE) <= MAX_FINE_TICKS) {
    const ticks: number[] = [];
    for (let t = lo; t <= hi + 1e-9; t += CHART_TICK_STEP_FINE) {
      ticks.push(t);
    }
    return ticks;
  }
  const ticks: number[] = [];
  const start = Math.ceil(lo / CHART_TICK_STEP_COARSE) * CHART_TICK_STEP_COARSE;
  for (let t = start; t <= hi + 1e-9; t += CHART_TICK_STEP_COARSE) {
    ticks.push(t);
  }
  return ticks;
}

export function computeFloorChartDomain(
  roomData: Record<string, RoomData>,
  floor: FloorNumber,
  unit: TempUnit,
  extras?: {
    outdoor?: Reading[];
    kestrelByRoom?: Record<string, Reading[]>;
  },
): ChartYDomain | null {
  const values: number[] = [];
  const floorRooms = roomsOnFloor(roomData, floor);

  for (const room of floorRooms) {
    pushTemps(values, room.readings, unit);
    pushTemps(values, extras?.kestrelByRoom?.[room.meta.room], unit);
  }
  pushTemps(values, extras?.outdoor, unit);

  if (values.length === 0) return null;

  return snapChartDomain(Math.min(...values), Math.max(...values));
}

/** Contiguous timestamp ranges where readings are marked skipped. */
export function skippedTimeRanges(
  readings: Reading[],
): { start: string; end: string }[] {
  const sorted = [...readings].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const ranges: { start: string; end: string }[] = [];
  let i = 0;
  while (i < sorted.length) {
    if (!sorted[i].skipped) {
      i += 1;
      continue;
    }
    const start = sorted[i].timestamp;
    while (i < sorted.length && sorted[i].skipped) i += 1;
    ranges.push({ start, end: sorted[i - 1].timestamp });
  }
  return ranges;
}

export interface PhaseStatHighlight {
  valueC: number;
  valueF: number;
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
    const series = data.metricReadings ?? data.readings;

    for (const r of series) {
      if (r.skipped) continue;
      if (tempHigh === null || r.temperatureC > tempHigh.valueC) {
        tempHigh = {
          valueC: r.temperatureC,
          valueF: r.temperatureF,
          node,
        };
      }
      if (r.heatIndexC != null && r.heatIndexF != null) {
        if (heatIndexHigh === null || r.heatIndexF > heatIndexHigh.valueF) {
          heatIndexHigh = {
            valueC: r.heatIndexC,
            valueF: r.heatIndexF,
            node,
          };
        }
      }
    }

    if (
      lowestAvgNighttime === null ||
      data.avgNighttimeC < lowestAvgNighttime.valueC
    ) {
      lowestAvgNighttime = {
        valueC: data.avgNighttimeC,
        valueF: data.avgNighttimeF,
        node,
      };
    }
  }

  return {
    tempHigh: tempHigh
      ? {
          valueC: +tempHigh.valueC.toFixed(2),
          valueF: +tempHigh.valueF.toFixed(2),
          node: tempHigh.node,
        }
      : null,
    heatIndexHigh: heatIndexHigh
      ? {
          valueC: +heatIndexHigh.valueC.toFixed(2),
          valueF: +heatIndexHigh.valueF.toFixed(2),
          node: heatIndexHigh.node,
        }
      : null,
    lowestAvgNighttime: lowestAvgNighttime
      ? {
          valueC: +lowestAvgNighttime.valueC.toFixed(2),
          valueF: +lowestAvgNighttime.valueF.toFixed(2),
          node: lowestAvgNighttime.node,
        }
      : null,
  };
}
