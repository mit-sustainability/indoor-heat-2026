export const PHASES = [
  { id: "phase1", label: "Phase 1", manifest: "/data/phase1/manifest.json" },
  { id: "phase2", label: "Phase 2", manifest: "/data/phase2/manifest.json" },
  { id: "phase3", label: "Phase 3", manifest: "/data/phase3/manifest.json" },
] as const;

export type PhaseId = typeof PHASES[number]["id"];
export const DEFAULT_PHASE: PhaseId = "phase1";

export function phaseManifest(id: string): string {
  return PHASES.find((p) => p.id === id)?.manifest ?? PHASES[0].manifest;
}
