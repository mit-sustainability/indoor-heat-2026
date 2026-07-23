import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadPhaseData, loadReadings, type SensorReading } from './data';

const mockManifest = {
  generated_at: '2026-06-09T12:00:00Z',
  files: {
    readings: '/data/readings_20260609T120000Z.json',
    metadata: '/data/phase1/metadata.json',
  },
};

const mockReadings: SensorReading[] = [
  { room: '304', floor: 3, timestamp: '2026-06-09T12:00:00Z', temperature_f: 78.2, temperature_c: 25.67, humidity_pct: 65 },
  { room: '309', floor: 3, timestamp: '2026-06-09T12:00:00Z', temperature_f: 76.1, temperature_c: 24.5, humidity_pct: 62 },
];

const mockMetadata = {
  generated_at: '2026-06-09T12:00:00Z',
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
    fan_from_window_state: {
      'Closed 24/7': 'None',
    },
  },
  sensors: {
    '304': {
      floor: 3,
      orientation: 'East',
      window_state: 'Closed 24/7',
      blinds_state: 'Open',
      fan: null,
      label: null,
    },
  },
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('loadPhaseData', () => {
  it('fetches manifest, readings, and metadata', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockManifest) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockReadings) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockMetadata) }),
    );

    const result = await loadPhaseData('/data/phase1/manifest.json');

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenNthCalledWith(1, '/data/phase1/manifest.json');
    expect(fetch).toHaveBeenNthCalledWith(2, '/data/readings_20260609T120000Z.json');
    expect(fetch).toHaveBeenNthCalledWith(3, '/data/phase1/metadata.json');
    expect(result.readings).toEqual(mockReadings);
    expect(result.metadata.sensors['304'].label).toBeNull();
    expect(result.metadata.interventions.window['Closed 24/7'].label).toBe('Windows closed');
  });

  it('skips metadata fetch when manifest omits files.metadata', async () => {
    const legacyManifest = {
      generated_at: '2026-06-09T12:00:00Z',
      files: { readings: '/data/readings_20260609T120000Z.json' },
    };
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(legacyManifest) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockReadings) }),
    );

    const result = await loadPhaseData('/data/phase1/manifest.json');

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.readings).toEqual(mockReadings);
    expect(result.metadata.sensors).toEqual({});
  });
});

describe('loadReadings', () => {
  it('fetches manifest then readings and returns the array', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockManifest) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockReadings) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockMetadata) }),
    );

    const result = await loadReadings('/data/phase1/manifest.json');

    expect(result).toEqual(mockReadings);
  });

  it('throws with "manifest <status>" when manifest fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 }),
    );

    await expect(loadReadings('/data/phase1/manifest.json')).rejects.toThrow('manifest 404');
  });

  it('throws with "readings <status>" when data file fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(mockManifest) })
      .mockResolvedValueOnce({ ok: false, status: 500 }),
    );

    await expect(loadReadings('/data/phase1/manifest.json')).rejects.toThrow('readings 500');
  });

  it('throws a clear error when a 200 response is HTML, not JSON (unexported phase / SPA fallback)', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, text: async () => '<!doctype html><html>...' }),
    );

    await expect(loadReadings('/data/heat_event/manifest.json'))
      .rejects.toThrow('has this phase been exported yet?');
  });
});
