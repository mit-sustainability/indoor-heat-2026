import { describe, it, expect } from 'vitest';
import {
  transformReadings,
  roomsOnFloor,
  floorsWithNodes,
  computePhaseStats,
  chartDomainTicks,
  computeFloorChartDomain,
  skippedTimeRanges,
} from './transform';
import type { SensorReading } from './data';

describe('transformReadings', () => {
  it('builds nodes only for rooms present in the phase readings', () => {
    const readings: SensorReading[] = [
      {
        room: '303', floor: 3, timestamp: '2026-06-18T12:00:00Z',
        temperature_f: 80, temperature_c: 26.67, humidity_pct: 50, node_x: 0.314, node_y: 0.316,
        orientation: 'East',
      },
      {
        room: '313', floor: 3, timestamp: '2026-06-18T12:00:00Z',
        temperature_f: 82, temperature_c: 27.78, humidity_pct: 48, node_x: 0.137, node_y: 0.441,
        orientation: 'West',
      },
      {
        room: 'courtyard', floor: null, timestamp: '2026-06-18T12:00:00Z',
        temperature_f: 90, temperature_c: 32.22, humidity_pct: 40,
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(Object.keys(roomData).sort()).toEqual(['303', '313']);
    expect(roomData['304']).toBeUndefined();
  });

  it('uses kresge readings as outdoor average with Kresge Oval label', () => {
    const readings: SensorReading[] = [
      {
        room: '311', floor: 3, timestamp: '2026-06-30T21:00:00Z',
        temperature_f: 88, temperature_c: 31.11, humidity_pct: 48, node_x: 0.137, node_y: 0.57,
      },
      {
        room: 'kresge', floor: null, timestamp: '2026-06-30T21:00:00Z',
        temperature_f: 84.47, temperature_c: 29.15, humidity_pct: 60.24,
      },
      {
        room: 'kresge', floor: null, timestamp: '2026-06-30T21:20:00Z',
        temperature_f: 83.5, temperature_c: 28.61, humidity_pct: 61,
      },
    ];
    const { roomData, outdoorReadings, outdoorLabel } = transformReadings(readings);
    expect(roomData['kresge']).toBeUndefined();
    expect(outdoorReadings).toHaveLength(2);
    expect(outdoorReadings[0].temperatureF).toBe(84.47);
    expect(outdoorReadings[0].temperatureC).toBe(29.15);
    expect(outdoorLabel).toBe('Outdoor (Kresge)');
  });

  it('places nodes using node_x / node_y from the JSON', () => {
    const readings: SensorReading[] = [
      {
        room: '311', floor: 3, timestamp: '2026-07-06T12:00:00Z',
        temperature_f: 85, temperature_c: 29.44, humidity_pct: 45, node_x: 0.42, node_y: 0.61,
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
        temperature_f: 85, temperature_c: 29.44, humidity_pct: 45, orientation: 'West',
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
        temperature_f: 78, temperature_c: 25.56, humidity_pct: 55,
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(roomData['hallway']).toBeUndefined();
  });

  it('places hallway when floor + node coords are present', () => {
    const readings: SensorReading[] = [
      {
        room: 'hallway', floor: 5, timestamp: '2026-06-18T12:00:00Z',
        temperature_f: 77, temperature_c: 25, humidity_pct: 52, node_x: 0.224, node_y: 0.57,
        orientation: '(South)',
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(roomData['hallway'].meta.floor).toBe(5);
    expect(roomData['hallway'].meta.xNorm).toBe(0.224);
    expect(roomData['hallway'].meta.orientation).toBe('South facing');
  });

  it('places hallway from metadata when readings omit floor and node coords', () => {
    const readings: SensorReading[] = [
      {
        room: 'hallway', floor: null, timestamp: '2026-06-23T21:00:00Z',
        temperature_f: 78.854, temperature_c: 26.03, humidity_pct: 48.09,
      },
    ];
    const { roomData } = transformReadings(readings, {
      generated_at: '2026-07-21T18:48:07Z',
      interventions: {
        categories: { window: 'Window status', blinds: 'Blinds status', fan: 'Fan status' },
        window: {},
        blinds: {},
        fan: {},
        fan_from_window_state: {},
      },
      sensors: {
        hallway: { floor: 7, node_x: 0.15, node_y: 0.441, device_type: 'hobo' },
      },
    });
    expect(roomData['hallway'].meta.floor).toBe(7);
    expect(roomData['hallway'].meta.xNorm).toBe(0.15);
    expect(roomData['hallway'].meta.yNorm).toBe(0.441);
    expect(roomData['hallway'].meta.role).toBe('indoor_control');
  });

  it('uses kestrel for metrics but keeps hobo as the chart series', () => {
    const readings: SensorReading[] = [
      {
        room: '311', floor: 3, timestamp: '2026-07-02T14:00:00Z',
        temperature_f: 80, temperature_c: 26.67, humidity_pct: 50,
        node_x: 0.137, node_y: 0.57, device_type: 'hobo',
      },
      {
        room: '311', floor: 3, timestamp: '2026-07-02T14:00:00Z',
        temperature_f: 90, temperature_c: 32.22, humidity_pct: 55,
        node_x: 0.137, node_y: 0.57, device_type: 'kestrel', wbgt_f: 85,
      },
    ];
    const { roomData, kestrelRoomData } = transformReadings(
      readings,
      null,
      { primaryDevice: 'kestrel' },
    );
    expect(roomData['311'].peakDaytimeF).toBe(90);
    expect(roomData['311'].readings[0].temperatureF).toBe(80);
    expect(roomData['311'].metricReadings?.[0].temperatureF).toBe(90);
    expect(kestrelRoomData['311']).toHaveLength(1);
    expect(kestrelRoomData['311'][0].wbgtF).toBe(85);
  });

  it('keeps kestrel as overlay when primaryDevice is hobo', () => {
    const readings: SensorReading[] = [
      {
        room: '311', floor: 3, timestamp: '2026-07-02T14:00:00Z',
        temperature_f: 80, temperature_c: 26.67, humidity_pct: 50,
        node_x: 0.137, node_y: 0.57, device_type: 'hobo',
      },
      {
        room: '311', floor: 3, timestamp: '2026-07-02T14:00:00Z',
        temperature_f: 90, temperature_c: 32.22, humidity_pct: 55,
        node_x: 0.137, node_y: 0.57, device_type: 'kestrel',
      },
    ];
    const { roomData, kestrelRoomData } = transformReadings(readings);
    expect(roomData['311'].peakDaytimeF).toBe(80);
    expect(roomData['311'].metricReadings).toBeUndefined();
    expect(kestrelRoomData['311']).toHaveLength(1);
  });

  it('builds interventions from window_state, blinds_state, and inferred fan', () => {
    const readings: SensorReading[] = [
      {
        room: '304', floor: 3, timestamp: '2026-06-10T12:00:00Z',
        temperature_f: 78, temperature_c: 25.56, humidity_pct: 65, node_x: 0.314, node_y: 0.377,
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
        temperature_f: 78, temperature_c: 25.56, humidity_pct: 65, node_x: 0.314, node_y: 0.377,
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

  it('prefers intervention states from phase metadata when present', () => {
    const readings: SensorReading[] = [
      {
        room: '304', floor: 3, timestamp: '2026-06-10T12:00:00Z',
        temperature_f: 78, temperature_c: 25.56, humidity_pct: 65, node_x: 0.314, node_y: 0.377,
        window_state: 'Open 24/7', blinds_state: 'Partial',
      },
    ];
    const { roomData } = transformReadings(readings, {
      generated_at: '2026-06-10T00:00:00Z',
      interventions: {
        categories: { window: 'Window status', blinds: 'Blinds status', fan: 'Fan status' },
        window: {
          'Closed 24/7': { label: 'Windows closed', description: 'Closed.' },
        },
        blinds: {
          Open: { label: 'Blinds open', description: 'Open.' },
        },
        fan: {
          None: { label: 'No fan', description: 'None.' },
        },
        fan_from_window_state: { 'Closed 24/7': 'None' },
      },
      sensors: {
        '304': {
          window_state: 'Closed 24/7',
          blinds_state: 'Open',
          blinds_shade: 'Light and Dark',
          fan: null,
          label: 'Room 304 (baseline)',
        },
      },
    });
    expect(roomData['304'].interventions.map((i) => i.label)).toEqual([
      'Windows closed',
      'Blinds open',
      'No fan',
    ]);
    expect(roomData['304'].interventions.find((i) => i.category === 'blinds')?.badge).toBe('⬜⬛');
    expect(roomData['304'].meta.label).toBe('Room 304 (baseline)');
  });

  it('maps blinds_shade to dark / light square badges', () => {
    const catalog = {
      categories: { window: 'Window status', blinds: 'Blinds status', fan: 'Fan status' },
      window: {
        'Closed 24/7': { label: 'Windows closed', description: 'Closed.' },
      },
      blinds: {
        Open: { label: 'Blinds open', description: 'Open.' },
      },
      fan: {
        None: { label: 'No fan', description: 'None.' },
      },
      fan_from_window_state: { 'Closed 24/7': 'None' },
    };
    const base = {
      room: '314', floor: 3, timestamp: '2026-06-10T12:00:00Z',
      temperature_f: 78, temperature_c: 25.56, humidity_pct: 65, node_x: 0.137, node_y: 0.377,
      window_state: 'Closed 24/7', blinds_state: 'Open',
    } as const;
    const dark = transformReadings([base], {
      generated_at: '',
      interventions: catalog,
      sensors: { '314': { blinds_shade: 'Dark', blinds_state: 'Open', window_state: 'Closed 24/7' } },
    });
    expect(dark.roomData['314'].interventions.find((i) => i.category === 'blinds')?.badge).toBe('⬛');

    const light = transformReadings([{ ...base, room: '514' }], {
      generated_at: '',
      interventions: catalog,
      sensors: { '514': { blinds_shade: 'Light', blinds_state: 'Open', window_state: 'Closed 24/7' } },
    });
    expect(light.roomData['514'].interventions.find((i) => i.category === 'blinds')?.badge).toBe('⬜');
  });

  it('computes peak daytime and average nighttime temperatures', () => {
    const dayHot = new Date(2026, 5, 10, 14, 0, 0).toISOString();
    const dayCool = new Date(2026, 5, 10, 10, 0, 0).toISOString();
    const nightWarm = new Date(2026, 5, 10, 2, 0, 0).toISOString();
    const nightCool = new Date(2026, 5, 10, 4, 0, 0).toISOString();
    const readings: SensorReading[] = [
      {
        room: '304', floor: 3, timestamp: dayHot,
        temperature_f: 86, temperature_c: 30, humidity_pct: 50, node_x: 0.314, node_y: 0.377,
      },
      {
        room: '304', floor: 3, timestamp: dayCool,
        temperature_f: 80, temperature_c: 26.67, humidity_pct: 55, node_x: 0.314, node_y: 0.377,
      },
      {
        room: '304', floor: 3, timestamp: nightWarm,
        temperature_f: 72, temperature_c: 22.22, humidity_pct: 60, node_x: 0.314, node_y: 0.377,
      },
      {
        room: '304', floor: 3, timestamp: nightCool,
        temperature_f: 70, temperature_c: 21.11, humidity_pct: 62, node_x: 0.314, node_y: 0.377,
      },
    ];
    const { roomData } = transformReadings(readings);
    // Daytime peak from exported C/F fields
    expect(roomData['304'].peakDaytimeC).toBeCloseTo(30, 0);
    expect(roomData['304'].peakDaytimeF).toBe(86);
    // Nighttime mean of 72°F / 22.22°C and 70°F / 21.11°C
    expect(roomData['304'].avgNighttimeC).toBeCloseTo(21.66, 1);
    expect(roomData['304'].avgNighttimeF).toBeCloseTo(71, 0);
  });

  it('filters roomsOnFloor to the active floor only', () => {
    const readings: SensorReading[] = [
      {
        room: '304', floor: 3, timestamp: '2026-06-09T12:00:00Z',
        temperature_f: 78, temperature_c: 25.56, humidity_pct: 65, node_x: 0.314, node_y: 0.377,
      },
      {
        room: '504', floor: 5, timestamp: '2026-06-09T12:00:00Z',
        temperature_f: 80, temperature_c: 26.67, humidity_pct: 60, node_x: 0.314, node_y: 0.377,
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
        temperature_f: 78, temperature_c: 25.56, humidity_pct: 65, node_x: 0.137, node_y: 0.57,
      },
      {
        room: '711', floor: 7, timestamp: '2026-07-01T12:00:00Z',
        temperature_f: 80, temperature_c: 26.67, humidity_pct: 60, node_x: 0.137, node_y: 0.57,
      },
      {
        room: 'courtyard', floor: null, timestamp: '2026-07-01T12:00:00Z',
        temperature_f: 90, temperature_c: 32.22, humidity_pct: 55,
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
        temperature_f: 90, temperature_c: 32.22, humidity_pct: 55,
        heat_index_f: 95, heat_index_c: 35,
        node_x: 0.314, node_y: 0.377,
      },
      {
        room: '304', floor: 3, timestamp: nightA,
        temperature_f: 72, temperature_c: 22.22, humidity_pct: 60,
        heat_index_f: 72, heat_index_c: 22.22,
        node_x: 0.314, node_y: 0.377,
      },
      {
        room: '311', floor: 3, timestamp: day,
        temperature_f: 86, temperature_c: 30, humidity_pct: 70,
        heat_index_f: 100, heat_index_c: 37.78,
        node_x: 0.137, node_y: 0.57,
      },
      {
        room: '311', floor: 3, timestamp: nightB,
        temperature_f: 68, temperature_c: 20, humidity_pct: 65,
        heat_index_f: 68, heat_index_c: 20,
        node_x: 0.137, node_y: 0.57,
      },
    ];
    const { roomData } = transformReadings(readings);
    const stats = computePhaseStats(roomData);

    // 90°F / 32.22°C in room 304
    expect(stats.tempHigh?.node).toBe('304');
    expect(stats.tempHigh?.valueC).toBeCloseTo(32.22, 1);
    expect(stats.tempHigh?.valueF).toBe(90);
    // Heat index from export C/F fields — highest in room 311
    expect(stats.heatIndexHigh?.node).toBe('311');
    expect(stats.heatIndexHigh?.valueF).toBe(100);
    expect(stats.heatIndexHigh?.valueC).toBeCloseTo(37.78, 1);
    // Nighttime: 311 avg (68°F) cooler than 304 avg (72°F)
    expect(stats.lowestAvgNighttime?.node).toBe('311');
    expect(stats.lowestAvgNighttime?.valueC).toBeCloseTo(20, 0);
    expect(stats.lowestAvgNighttime?.valueF).toBe(68);
  });

  it('computeFloorChartDomain pads 1° then snaps to multiples of 5', () => {
    const readings: SensorReading[] = [
      {
        room: '303', floor: 3, timestamp: '2026-06-18T12:00:00Z',
        temperature_f: 77, temperature_c: 25, humidity_pct: 50, node_x: 0.314, node_y: 0.316,
      },
      {
        room: '313', floor: 3, timestamp: '2026-06-18T12:00:00Z',
        temperature_f: 86, temperature_c: 30, humidity_pct: 48, node_x: 0.137, node_y: 0.441,
      },
      {
        room: '504', floor: 5, timestamp: '2026-06-18T12:00:00Z',
        temperature_f: 95, temperature_c: 35, humidity_pct: 40, node_x: 0.2, node_y: 0.3,
      },
      {
        room: 'courtyard', floor: null, timestamp: '2026-06-18T12:00:00Z',
        temperature_f: 95, temperature_c: 35, humidity_pct: 40,
      },
    ];
    const { roomData, outdoorReadings } = transformReadings(readings);
    // Floor 3 °C: 25–35 → pad 24–36 → [20, 40]
    const domainC = computeFloorChartDomain(roomData, 3, 'c', { outdoor: outdoorReadings });
    expect(domainC).toEqual([20, 40]);
    expect(chartDomainTicks(domainC!)).toEqual([20, 25, 30, 35, 40]);

    // Floor 3 °F: 77–95 → pad 76–96 → [75, 100]; 6 fine ticks → 10° labels
    const domainF = computeFloorChartDomain(roomData, 3, 'f', { outdoor: outdoorReadings });
    expect(domainF).toEqual([75, 100]);
    expect(chartDomainTicks(domainF!)).toEqual([80, 90, 100]);

    // Floor 5 °C: 35 → pad 34–36 → [30, 40]
    const domain5 = computeFloorChartDomain(roomData, 5, 'c', { outdoor: outdoorReadings });
    expect(domain5).toEqual([30, 40]);
    expect(chartDomainTicks(domain5!)).toEqual([30, 35, 40]);
  });

  it('uses multiples-of-10 ticks without widening domain past multiples of 5', () => {
    const readings: SensorReading[] = [
      {
        room: '303', floor: 3, timestamp: '2026-06-18T12:00:00Z',
        temperature_f: 72, temperature_c: 22.22, humidity_pct: 50, node_x: 0.314, node_y: 0.316,
      },
      {
        room: '313', floor: 3, timestamp: '2026-06-18T12:00:00Z',
        temperature_f: 93, temperature_c: 33.89, humidity_pct: 48, node_x: 0.137, node_y: 0.441,
      },
    ];
    const { roomData } = transformReadings(readings);
    // °F 72–93 → pad 71–94 → [70, 95]; 6 fine ticks → labels at 70, 80, 90
    const domainF = computeFloorChartDomain(roomData, 3, 'f');
    expect(domainF).toEqual([70, 95]);
    expect(chartDomainTicks(domainF!)).toEqual([70, 80, 90]);

    // °C 22.22–33.89 → pad 21.22–34.89 → [20, 35]
    const domainC = computeFloorChartDomain(roomData, 3, 'c');
    expect(domainC).toEqual([20, 35]);
    expect(chartDomainTicks(domainC!)).toEqual([20, 25, 30, 35]);
  });

  it('keeps skipped readings for plotting but excludes them from stats', () => {
    const dayKept = new Date(2026, 5, 19, 14, 0, 0).toISOString();
    const daySkipped = new Date(2026, 5, 18, 14, 0, 0).toISOString();
    const daySkipped2 = new Date(2026, 5, 18, 15, 0, 0).toISOString();
    const readings: SensorReading[] = [
      {
        room: '304', floor: 3, timestamp: daySkipped,
        temperature_f: 99, temperature_c: 37.22, humidity_pct: 50,
        node_x: 0.314, node_y: 0.377, skipped: true,
      },
      {
        room: '304', floor: 3, timestamp: daySkipped2,
        temperature_f: 98, temperature_c: 36.67, humidity_pct: 50,
        node_x: 0.314, node_y: 0.377, skipped: true,
      },
      {
        room: '304', floor: 3, timestamp: dayKept,
        temperature_f: 86, temperature_c: 30, humidity_pct: 50,
        node_x: 0.314, node_y: 0.377,
      },
    ];
    const { roomData } = transformReadings(readings);
    expect(roomData['304'].readings).toHaveLength(3);
    expect(roomData['304'].readings.filter((r) => r.skipped)).toHaveLength(2);
    expect(roomData['304'].peakDaytimeC).toBeCloseTo(30, 0);
    expect(roomData['304'].peakDaytimeF).toBe(86);
    expect(skippedTimeRanges(roomData['304'].readings)).toEqual([
      { start: daySkipped, end: daySkipped2 },
    ]);
  });
});
