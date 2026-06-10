import type { SensorReading } from './data';
import type { RoomData, Reading } from '../data/mockData';
import { INTERVENTION_SETS } from '../data/mockData';
import { ROOMS } from '../config/rooms';
import type { FloorNumber } from '../config/floors';

export interface TransformedData {
  roomData: Record<number, RoomData>;
  courtyardReadings: Reading[];
  penthouseReadings: Reading[];
  controlReadings: Record<FloorNumber, Reading[] | null>;
}

const fToC = (f: number): number => +((f - 32) * 5 / 9).toFixed(2);

function isDaytime(iso: string): boolean {
  const h = new Date(iso).getHours();
  return h >= 7 && h < 19;
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function transformReadings(readings: SensorReading[]): TransformedData {
  const byRoom = new Map<string, SensorReading[]>();
  for (const r of readings) {
    const list = byRoom.get(r.room) ?? [];
    list.push(r);
    byRoom.set(r.room, list);
  }

  const roomData: Record<number, RoomData> = {};
  for (const meta of ROOMS) {
    const raw = byRoom.get(String(meta.room)) ?? [];
    const rs: Reading[] = raw.map(r => ({
      timestamp: r.timestamp,
      temperatureC: fToC(r.temperature_f),
      humidityPct: r.humidity_pct,
    }));
    const day = rs.filter(r => isDaytime(r.timestamp));
    const night = rs.filter(r => !isDaytime(r.timestamp));
    roomData[meta.room] = {
      meta,
      readings: rs,
      avgDaytimeC: +(mean(day.map(r => r.temperatureC))).toFixed(2),
      avgNighttimeC: +(mean(night.map(r => r.temperatureC))).toFixed(2),
      avgHumidity: +(mean(rs.map(r => r.humidityPct))).toFixed(1),
      lastCollected: rs.length ? rs[rs.length - 1].timestamp : '',
      interventions: INTERVENTION_SETS[meta.room] ?? [],
    };
  }

  const toReadings = (raw: SensorReading[]): Reading[] =>
    raw.map(r => ({ timestamp: r.timestamp, temperatureC: fToC(r.temperature_f), humidityPct: r.humidity_pct }));

  return {
    roomData,
    courtyardReadings: toReadings(byRoom.get('courtyard') ?? []),
    penthouseReadings: toReadings(byRoom.get('penthouse') ?? []),
    controlReadings: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
  };
}

export function computeFloorStats(roomData: Record<number, RoomData>, floor: FloorNumber) {
  const rooms = ROOMS.filter(r => r.floor === floor);
  if (rooms.length === 0) return { avgTempC: null as number | null, avgHumidity: null as number | null, lastUpdated: null as string | null };
  const data = rooms.map(r => roomData[r.room]).filter(Boolean);
  if (data.length === 0) return { avgTempC: null as number | null, avgHumidity: null as number | null, lastUpdated: null as string | null };
  const allReadings = data.flatMap(d => d.readings);
  return {
    avgTempC: allReadings.length ? +(mean(allReadings.map(r => r.temperatureC))).toFixed(2) : null as number | null,
    avgHumidity: +(mean(data.map(d => d.avgHumidity))).toFixed(1),
    lastUpdated: data.map(d => d.lastCollected).filter(Boolean).sort().reverse()[0] ?? null as string | null,
  };
}
