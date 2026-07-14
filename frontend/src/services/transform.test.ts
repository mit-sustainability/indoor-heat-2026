import { describe, it, expect } from 'vitest';
import {
  transformReadings,
  roomsOnFloor,
  floorsWithNodes,
  computePhaseStats,
} from './transform';
import type { SensorReading } from './data';

describe('transformReadings', () => {
  it('builds nodes only for rooms present in the phase readings', () => {
    const readings: SensorReading[] = [
      {
        room: '303', floor: 3, timestamp: '2026-06-18T12:00:00Z',
        temperature_f: 80, humidity_pct: 50, node_x: 0.314, node_y: 0.316,
        orientation: 'East',
      },
      {
        room: '313', floor: 3, timestamp: '2026-06-18T12:00:00Z',
        temperature_f: 82, humidity_pct: 48, node_x: 0.137, node_y: 0.441,
        orientation: 'West',
      },
      {
        room: 'courtyard', floor: null, timestamp: '2026-06-18T12:00:00Z',
        temperature_f: 90, humidity_pct: 40,
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(Object.keys(roomData).sort()).toEqual(['303', '313']);
    expect(roomData['304']).toBeUndefined();
  });

  it('places nodes using node_x / node_y from the JSON', () => {
    const readings: SensorReading[] = [
      {
        room: '311', floor: 3, timestamp: '2026-07-06T12:00:00Z',
        temperature_f: 85, humidity_pct: 45, node_x: 0.42, node_y: 0.61,
        orientation: 'West',
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(roomData['311'].meta.xNorm).toBe(0.42);
    expect(roomData['311'].meta.yNorm).toBe(0.61);
    expect(roomData['311'].meta.orientation).toBe('West facing');
  });

  it('falls back to known positions when node_x / node_y are absent', () => {
    const readings: SensorReading[] = [
      {
        room: '311', floor: 3, timestamp: '2026-07-06T12:00:00Z',
        temperature_f: 85, humidity_pct: 45, orientation: 'West',
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(roomData['311'].meta.xNorm).toBe(0.137);
    expect(roomData['311'].meta.yNorm).toBe(0.57);
  });

  it('skips sensors that have no floor and no placeable coords', () => {
    const readings: SensorReading[] = [
      {
        room: 'hallway', floor: null, timestamp: '2026-06-23T12:00:00Z',
        temperature_f: 78, humidity_pct: 55,
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(roomData['hallway']).toBeUndefined();
  });

  it('places hallway when floor + node coords are present', () => {
    const readings: SensorReading[] = [
      {
        room: 'hallway', floor: 5, timestamp: '2026-06-18T12:00:00Z',
        temperature_f: 77, humidity_pct: 52, node_x: 0.224, node_y: 0.57,
        orientation: '(South)',
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(roomData['hallway'].meta.floor).toBe(5);
    expect(roomData['hallway'].meta.xNorm).toBe(0.224);
    expect(roomData['hallway'].meta.orientation).toBe('South facing');
  });

  it('builds interventions from window_state, blinds_state, and inferred fan', () => {
    const readings: SensorReading[] = [
      {
        room: '304', floor: 3, timestamp: '2026-06-10T12:00:00Z',
        temperature_f: 78, humidity_pct: 65, node_x: 0.314, node_y: 0.377,
        window_state: 'Open 24/7', blinds_state: 'Partial',
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(roomData['304'].interventions.map((i) => i.category)).toEqual([
      'window',
      'blinds',
      'fan',
    ]);
    expect(roomData['304'].interventions.map((i) => i.label)).toEqual([
      'Windows open',
      'Blinds partial',
      'No fan',
    ]);
  });

  it('uses explicit fan when present in the readings', () => {
    const readings: SensorReading[] = [
      {
        room: '304', floor: 3, timestamp: '2026-06-10T12:00:00Z',
        temperature_f: 78, humidity_pct: 65, node_x: 0.314, node_y: 0.377,
        window_state: 'Partial w/ fan', blinds_state: 'Partial', fan: 'On',
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(roomData['304'].interventions.map((i) => i.label)).toEqual([
      'Partial open + fan',
      'Blinds partial',
      'Fan on',
    ]);
  });

  it('computes peak daytime and average nighttime temperatures', () => {
    const dayHot = new Date(2026, 5, 10, 14, 0, 0).toISOString();
    const dayCool = new Date(2026, 5, 10, 10, 0, 0).toISOString();
    const nightWarm = new Date(2026, 5, 10, 2, 0, 0).toISOString();
    const nightCool = new Date(2026, 5, 10, 4, 0, 0).toISOString();
    const readings: SensorReading[] = [
      {
        room: '304', floor: 3, timestamp: dayHot,
        temperature_f: 86, humidity_pct: 50, node_x: 0.314, node_y: 0.377,
      },
      {
        room: '304', floor: 3, timestamp: dayCool,
        temperature_f: 80, humidity_pct: 55, node_x: 0.314, node_y: 0.377,
      },
      {
        room: '304', floor: 3, timestamp: nightWarm,
        temperature_f: 72, humidity_pct: 60, node_x: 0.314, node_y: 0.377,
      },
      {
        room: '304', floor: 3, timestamp: nightCool,
        temperature_f: 70, humidity_pct: 62, node_x: 0.314, node_y: 0.377,
      },
    ];
    const { roomData } = transformReadings(readings);
    // Daytime: 86°F → 30°C peak
    expect(roomData['304'].peakDaytimeC).toBeCloseTo(30, 0);
    // Nighttime mean of 72°F (22.22°C) and 70°F (21.11°C)
    expect(roomData['304'].avgNighttimeC).toBeCloseTo(21.66, 1);
  });

  it('filters roomsOnFloor to the active floor only', () => {
    const readings: SensorReading[] = [
      {
        room: '304', floor: 3, timestamp: '2026-06-09T12:00:00Z',
        temperature_f: 78, humidity_pct: 65, node_x: 0.314, node_y: 0.377,
      },
      {
        room: '504', floor: 5, timestamp: '2026-06-09T12:00:00Z',
        temperature_f: 80, humidity_pct: 60, node_x: 0.314, node_y: 0.377,
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(roomsOnFloor(roomData, 3).map((d) => d.meta.room)).toEqual(['304']);
    expect(roomsOnFloor(roomData, 5).map((d) => d.meta.room)).toEqual(['504']);
  });

  it('floorsWithNodes returns only floors that have placeable nodes', () => {
    const readings: SensorReading[] = [
      {
        room: '311', floor: 3, timestamp: '2026-07-01T12:00:00Z',
        temperature_f: 78, humidity_pct: 65, node_x: 0.137, node_y: 0.57,
      },
      {
        room: '711', floor: 7, timestamp: '2026-07-01T12:00:00Z',
        temperature_f: 80, humidity_pct: 60, node_x: 0.137, node_y: 0.57,
      },
      {
        room: 'courtyard', floor: null, timestamp: '2026-07-01T12:00:00Z',
        temperature_f: 90, humidity_pct: 55,
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(floorsWithNodes(roomData)).toEqual([7, 3]);
  });

  it('computePhaseStats finds temp high, heat index high, and lowest avg nighttime', () => {
    const day = new Date(2026, 5, 10, 14, 0, 0).toISOString();
    const nightA = new Date(2026, 5, 10, 2, 0, 0).toISOString();
    const nightB = new Date(2026, 5, 10, 3, 0, 0).toISOString();
    const readings: SensorReading[] = [
      {
        room: '304', floor: 3, timestamp: day,
        temperature_f: 90, humidity_pct: 55, heat_index_f: 95,
        node_x: 0.314, node_y: 0.377,
      },
      {
        room: '304', floor: 3, timestamp: nightA,
        temperature_f: 72, humidity_pct: 60, heat_index_f: 72,
        node_x: 0.314, node_y: 0.377,
      },
      {
        room: '311', floor: 3, timestamp: day,
        temperature_f: 86, humidity_pct: 70, heat_index_f: 100,
        node_x: 0.137, node_y: 0.57,
      },
      {
        room: '311', floor: 3, timestamp: nightB,
        temperature_f: 68, humidity_pct: 65, heat_index_f: 68,
        node_x: 0.137, node_y: 0.57,
      },
    ];
    const { roomData } = transformReadings(readings);
    const stats = computePhaseStats(roomData);

    // 90°F → ~32.22°C in room 304
    expect(stats.tempHigh?.node).toBe('304');
    expect(stats.tempHigh?.valueC).toBeCloseTo(32.22, 1);
    // 100°F heat index → ~37.78°C in room 311
    expect(stats.heatIndexHigh?.node).toBe('311');
    expect(stats.heatIndexHigh?.valueC).toBeCloseTo(37.78, 1);
    // Nighttime: 311 avg (68°F) cooler than 304 avg (72°F)
    expect(stats.lowestAvgNighttime?.node).toBe('311');
    expect(stats.lowestAvgNighttime?.valueC).toBeCloseTo(20, 0);
  });
});
