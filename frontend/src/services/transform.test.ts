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

  it('excludes skipped readings from both the chart series and the room averages', () => {
    const readings: SensorReading[] = [
      { room: '304', floor: 3, timestamp: '2026-06-17T21:00:00Z', temperature_f: 100, humidity_pct: 90, skipped: true },
      { room: '304', floor: 3, timestamp: '2026-06-19T12:00:00Z', temperature_f: 80, humidity_pct: 50 },
    ];
    const { roomData } = transformReadings(readings);
    expect(roomData[304].readings).toHaveLength(1);
    expect(roomData[304].readings[0].timestamp).toBe('2026-06-19T12:00:00Z');
    // fToC(80) = 26.67, and with only the non-skipped reading, day/night avg equals it exactly.
    const expectedC = +((80 - 32) * 5 / 9).toFixed(2);
    expect(roomData[304].avgHumidity).toBe(50);
    expect([roomData[304].avgDaytimeC, roomData[304].avgNighttimeC]).toContain(expectedC);
  });
});
