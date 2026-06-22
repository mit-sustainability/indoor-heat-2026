// Mock readings for local development. Generates a few days of hourly temp +
// humidity for each instrumented room, indoor control rooms, and the courtyard
// sensor. Replace with real API calls when a backend is added.

import { ROOMS, CONTROL_ROOMS, type RoomMeta } from "../config/rooms";
import type { FloorNumber } from "../config/floors";

export interface Reading {
  timestamp: string; // ISO
  temperatureC: number;
  humidityPct: number;
}

export interface RoomData {
  meta: RoomMeta;
  readings: Reading[];
  avgDaytimeC: number;
  avgNighttimeC: number;
  avgHumidity: number;
  lastCollected: string;
  interventions: Intervention[];
}

export interface Intervention {
  label: string;
  emoji: string;
  description: string;
}

const HOURS = 24 * 5; // 5 days of hourly data
const NOW = new Date("2026-05-12T18:00:00");

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateReadings(
  baseTemp: number,
  baseHumidity: number,
  seed: number,
): Reading[] {
  const rand = seedRandom(seed);
  const readings: Reading[] = [];
  for (let h = HOURS - 1; h >= 0; h--) {
    const t = new Date(NOW.getTime() - h * 60 * 60 * 1000);
    const hour = t.getHours();
    const diurnal = Math.sin(((hour - 6) / 24) * Math.PI * 2) * 2.2;
    const noise = (rand() - 0.5) * 0.8;
    const temp = baseTemp + diurnal + noise;
    const humidity =
      baseHumidity - diurnal * 1.5 + (rand() - 0.5) * 4;
    readings.push({
      timestamp: t.toISOString(),
      temperatureC: +temp.toFixed(2),
      humidityPct: +Math.max(20, Math.min(80, humidity)).toFixed(1),
    });
  }
  return readings;
}

function dayMask(reading: Reading): boolean {
  const h = new Date(reading.timestamp).getHours();
  return h >= 7 && h < 19;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export const INTERVENTION_SETS: Record<number, Intervention[]> = {
  304: [],
  309: [
    { label: "Box fan", emoji: "💨", description: "Medium speed, toward window" },
  ],
  314: [
    { label: "Reflective film", emoji: "🪞", description: "North-facing window" },
  ],
  504: [
    { label: "Box fan", emoji: "💨", description: "Set to medium, oriented toward window" },
  ],
  514: [],
  704: [
    { label: "Window AC unit", emoji: "❄️", description: "5,000 BTU unit installed 2026-05-01" },
  ],
  709: [],
  714: [
    { label: "Blackout blinds", emoji: "🪟", description: "Closed 10:00–18:00 daily" },
  ],
};

function buildRoomData(meta: RoomMeta, seed: number, baseTemp: number, baseHumidity: number): RoomData {
  const readings = generateReadings(baseTemp, baseHumidity, seed);
  const day = readings.filter(dayMask);
  const night = readings.filter((r) => !dayMask(r));
  return {
    meta,
    readings,
    avgDaytimeC: +mean(day.map((r) => r.temperatureC)).toFixed(2),
    avgNighttimeC: +mean(night.map((r) => r.temperatureC)).toFixed(2),
    avgHumidity: +mean(readings.map((r) => r.humidityPct)).toFixed(1),
    lastCollected: readings[readings.length - 1].timestamp,
    interventions: INTERVENTION_SETS[meta.room] ?? [],
  };
}

function buildRoomDataFromReadings(meta: RoomMeta, readings: Reading[]): RoomData {
  const day = readings.filter(dayMask);
  const night = readings.filter((r) => !dayMask(r));
  return {
    meta,
    readings,
    avgDaytimeC: +mean(day.map((r) => r.temperatureC)).toFixed(2),
    avgNighttimeC: +mean(night.map((r) => r.temperatureC)).toFixed(2),
    avgHumidity: +mean(readings.map((r) => r.humidityPct)).toFixed(1),
    lastCollected: readings[readings.length - 1].timestamp,
    interventions: [],
  };
}

const BASE_TEMP_BY_FLOOR: Record<number, number> = {
  1: 22.0,
  3: 24.0,
  5: 26.5,
  7: 28.0,
};

const ROOM_OFFSET: Record<number, number> = {
  304: 1.8,
  309: 1.2,
  314: 0.5,
  504: 2.2,
  514: 0.9,
  704: 1.6,
  709: 2.4,
  714: 0.7,
};

export const COURTYARD_READINGS: Reading[] = generateReadings(22.0, 65, 8888).map((r) => ({
  ...r,
  temperatureC: +(r.temperatureC + Math.sin(((new Date(r.timestamp).getHours() - 6) / 24) * Math.PI * 2) * 3.5).toFixed(2),
}));

export const ROOM_DATA: Record<number, RoomData> = Object.fromEntries(
  ROOMS.filter((meta) => meta.role === "room").map((meta, i) => {
    const base = BASE_TEMP_BY_FLOOR[meta.floor] ?? 25;
    const offset = ROOM_OFFSET[meta.room] ?? 1;
    return [meta.room, buildRoomData(meta, 100 + i * 17, base + offset, 52)];
  }),
);

const courtyardMeta = ROOMS.find((r) => r.role === "outdoor_courtyard");
if (courtyardMeta) {
  ROOM_DATA[courtyardMeta.room] = buildRoomDataFromReadings(
    courtyardMeta,
    COURTYARD_READINGS,
  );
}

export const CONTROL_READINGS: Record<FloorNumber, Reading[] | null> = {
  1: null,
  2: null,
  3: generateReadings(24.0, 50, 7001),
  4: null,
  5: generateReadings(26.3, 50, 7005),
  6: null,
  7: generateReadings(27.5, 50, 7007),
};

export function floorAverages(floor: FloorNumber) {
  const rooms = ROOMS.filter((r) => r.floor === floor && r.role === "room");
  if (rooms.length === 0) {
    return { avgTempC: null, avgHumidity: null, lastUpdated: null };
  }
  const datas = rooms.map((r) => ROOM_DATA[r.room]);
  return {
    avgTempC: +mean(datas.map((d) => mean(d.readings.map((x) => x.temperatureC)))).toFixed(2),
    avgHumidity: +mean(datas.map((d) => d.avgHumidity)).toFixed(1),
    lastUpdated: datas
      .map((d) => d.lastCollected)
      .sort()
      .reverse()[0],
  };
}

export { CONTROL_ROOMS };
