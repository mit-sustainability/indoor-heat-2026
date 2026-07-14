import { describe, it, expect } from 'vitest';
import { transformReadings, roomsOnFloor } from './transform';
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

  it('builds interventions from window_state and blinds_state', () => {
    const readings: SensorReading[] = [
      {
        room: '304', floor: 3, timestamp: '2026-06-10T12:00:00Z',
        temperature_f: 78, humidity_pct: 65, node_x: 0.314, node_y: 0.377,
        window_state: 'Open 24/7', blinds_state: 'Partial',
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(roomData['304'].interventions.map((i) => i.label)).toEqual([
      'Windows open',
      'Blinds partial',
    ]);
    expect(roomData['304'].interventions.map((i) => i.emoji)).toEqual(['🌬️', '🪟']);
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
});
