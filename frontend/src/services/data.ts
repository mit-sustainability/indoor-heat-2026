export interface Manifest {
  generated_at: string;
  files: Record<string, string>;
}

export interface SensorReading {
  room: string;
  floor: number | null;
  timestamp: string;
  temperature_f: number;
  humidity_pct: number;
  heat_index_f?: number | null;
  wbgt_f?: number | null;
  device_type?: string;
  orientation?: string | null;
  window_state?: string | null;
  blinds_state?: string | null;
  fan?: string | null;
  node_x?: number | null;
  node_y?: number | null;
}

// A dev-server SPA fallback (or misconfigured static host) returns index.html
// with a 200 for an unexported phase, so `res.ok` alone can't be trusted —
// verify the body actually parses as JSON and say so plainly when it doesn't.
async function readJson<T>(res: Response, url: string): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${url} did not return JSON — has this phase been exported yet?`);
  }
}

export async function loadReadings(manifestUrl: string): Promise<SensorReading[]> {
  const manifestRes = await fetch(manifestUrl);
  if (!manifestRes.ok) throw new Error(`manifest ${manifestRes.status}`);
  const manifest = await readJson<Manifest>(manifestRes, manifestUrl);

  const readingsRes = await fetch(manifest.files.readings);
  if (!readingsRes.ok) throw new Error(`readings ${readingsRes.status}`);
  return readJson<SensorReading[]>(readingsRes, manifest.files.readings);
}
