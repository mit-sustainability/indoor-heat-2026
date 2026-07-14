import { describe, it, expect } from 'vitest';
import { transformReadings } from './transform';
import type { SensorReading } from './data';

describe('transformReadings', () => {
  it('overrides room position from node_x/node_y when present in the data', () => {
    const readings: SensorReading[] = [
      {
        room: '311', floor: 3, timestamp: '2026-07-06T12:00:00Z',
        temperature_f: 85, humidity_pct: 45, node_x: 0.42, node_y: 0.61,
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(roomData[311].meta.xNorm).toBe(0.42);
    expect(roomData[311].meta.yNorm).toBe(0.61);
  });

  it('falls back to the configured position when node_x/node_y are absent', () => {
    const readings: SensorReading[] = [
      { room: '304', floor: 3, timestamp: '2026-06-09T12:00:00Z', temperature_f: 78, humidity_pct: 65 },
    ];
    const { roomData } = transformReadings(readings);
    expect(roomData[304].meta.xNorm).toBe(0.314);
    expect(roomData[304].meta.yNorm).toBe(0.377);
  });
});
