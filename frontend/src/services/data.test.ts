import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadReadings, type SensorReading } from './data';

const mockManifest = {
  generated_at: '2026-06-09T12:00:00Z',
  files: {
    readings: '/data/readings_20260609T120000Z.json',
  },
};

const mockReadings: SensorReading[] = [
  { room: '304', floor: 3, timestamp: '2026-06-09T12:00:00Z', temperature_f: 78.2, humidity_pct: 65 },
  { room: '309', floor: 3, timestamp: '2026-06-09T12:00:00Z', temperature_f: 76.1, humidity_pct: 62 },
];

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('loadReadings', () => {
  it('fetches manifest then readings and returns the array', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockManifest })
      .mockResolvedValueOnce({ ok: true, json: async () => mockReadings }),
    );

    const result = await loadReadings();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, '/data/manifest.json');
    expect(fetch).toHaveBeenNthCalledWith(2, '/data/readings_20260609T120000Z.json');
    expect(result).toEqual(mockReadings);
  });

  it('throws with "manifest <status>" when manifest fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 }),
    );

    await expect(loadReadings()).rejects.toThrow('manifest 404');
  });

  it('throws with "readings <status>" when data file fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockManifest })
      .mockResolvedValueOnce({ ok: false, status: 500 }),
    );

    await expect(loadReadings()).rejects.toThrow('readings 500');
  });
});
