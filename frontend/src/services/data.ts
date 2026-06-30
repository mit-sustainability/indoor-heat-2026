export interface Manifest {
  generated_at: string;
  files: Record<string, string>;
}

export interface SensorReading {
  room: string;
  floor: number;
  timestamp: string;
  temperature_f: number;
  humidity_pct: number;
}

export async function loadReadings(manifestUrl: string): Promise<SensorReading[]> {
  const manifestRes = await fetch(manifestUrl);
  if (!manifestRes.ok) throw new Error(`manifest ${manifestRes.status}`);
  const manifest: Manifest = await manifestRes.json();

  const readingsRes = await fetch(manifest.files.readings);
  if (!readingsRes.ok) throw new Error(`readings ${readingsRes.status}`);
  return readingsRes.json() as Promise<SensorReading[]>;
}
