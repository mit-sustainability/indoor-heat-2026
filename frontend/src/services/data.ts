import {
  DEFAULT_INTERVENTION_CATALOG,
  type InterventionCatalog,
} from "../config/interventions";

export interface Manifest {
  generated_at: string;
  files: Record<string, string>;
}

export interface SensorReading {
  room: string;
  floor: number | null;
  timestamp: string;
  temperature_f: number;
  temperature_c: number;
  humidity_pct: number;
  heat_index_f?: number | null;
  heat_index_c?: number | null;
  wbgt_f?: number | null;
  device_type?: string;
  orientation?: string | null;
  window_state?: string | null;
  blinds_state?: string | null;
  fan?: string | null;
  node_x?: number | null;
  node_y?: number | null;
  skipped?: boolean | null;
}

/** Per-sensor / room fields from phase metadata.json (editable). */
export interface SensorMeta {
  floor?: number | null;
  orientation?: string | null;
  window_state?: string | null;
  blinds_state?: string | null;
  /** "Light" | "Dark" | "Light and Dark" — shade color of installed blinds. */
  blinds_shade?: string | null;
  fan?: string | null;
  device_type?: string | null;
  node_x?: number | null;
  node_y?: number | null;
  /** Display name override for the popup / labels. */
  label?: string | null;
}

export interface PhaseMetadata {
  generated_at: string;
  interventions: InterventionCatalog;
  sensors: Record<string, SensorMeta>;
}

export interface PhaseData {
  readings: SensorReading[];
  metadata: PhaseMetadata;
}

const EMPTY_METADATA: PhaseMetadata = {
  generated_at: "",
  interventions: DEFAULT_INTERVENTION_CATALOG,
  sensors: {},
};

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

function normalizeMetadata(raw: PhaseMetadata): PhaseMetadata {
  return {
    generated_at: raw.generated_at ?? "",
    interventions: {
      ...DEFAULT_INTERVENTION_CATALOG,
      ...raw.interventions,
      categories: {
        ...DEFAULT_INTERVENTION_CATALOG.categories,
        ...(raw.interventions?.categories ?? {}),
      },
      window: {
        ...DEFAULT_INTERVENTION_CATALOG.window,
        ...(raw.interventions?.window ?? {}),
      },
      blinds: {
        ...DEFAULT_INTERVENTION_CATALOG.blinds,
        ...(raw.interventions?.blinds ?? {}),
      },
      fan: {
        ...DEFAULT_INTERVENTION_CATALOG.fan,
        ...(raw.interventions?.fan ?? {}),
      },
      fan_from_window_state: {
        ...DEFAULT_INTERVENTION_CATALOG.fan_from_window_state,
        ...(raw.interventions?.fan_from_window_state ?? {}),
      },
    },
    sensors: raw.sensors ?? {},
  };
}

/** Load readings only (tests / callers that do not need metadata). */
export async function loadReadings(manifestUrl: string): Promise<SensorReading[]> {
  const { readings } = await loadPhaseData(manifestUrl);
  return readings;
}

/** Load readings + phase metadata (interventions catalog + sensor meta). */
export async function loadPhaseData(manifestUrl: string): Promise<PhaseData> {
  const manifestRes = await fetch(manifestUrl);
  if (!manifestRes.ok) throw new Error(`manifest ${manifestRes.status}`);
  const manifest = await readJson<Manifest>(manifestRes, manifestUrl);

  const readingsUrl = manifest.files.readings;
  if (!readingsUrl) throw new Error(`manifest missing files.readings`);

  const readingsRes = await fetch(readingsUrl);
  if (!readingsRes.ok) throw new Error(`readings ${readingsRes.status}`);
  const readings = await readJson<SensorReading[]>(readingsRes, readingsUrl);

  const metadataUrl = manifest.files.metadata;
  if (!metadataUrl) {
    return { readings, metadata: EMPTY_METADATA };
  }

  const metadataRes = await fetch(metadataUrl);
  if (!metadataRes.ok) throw new Error(`metadata ${metadataRes.status}`);
  const raw = await readJson<PhaseMetadata>(metadataRes, metadataUrl);
  return { readings, metadata: normalizeMetadata(raw) };
}
