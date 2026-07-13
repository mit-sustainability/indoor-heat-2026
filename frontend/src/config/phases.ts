export const PHASES = [
  { id: "phase1",     label: "Phase 1 (Jun 3–9)",    manifest: "/data/phase1/manifest.json" },
  { id: "phase2",     label: "Phase 2 (Jun 10–16)",  manifest: "/data/phase2/manifest.json" },
  { id: "phase3",     label: "Phase 3 (Jun 18–21)",  manifest: "/data/phase3/manifest.json" },
  { id: "phase4",     label: "Phase 4 (Jun 23–30)",  manifest: "/data/phase4/manifest.json" },
  { id: "heat_event", label: "Heat Event (Jul 1–6)", manifest: "/data/heat_event/manifest.json" },
] as const;

export type PhaseId = typeof PHASES[number]["id"];
export const DEFAULT_PHASE: PhaseId = "phase1";

export function phaseManifest(id: string): string {
  return PHASES.find((p) => p.id === id)?.manifest ?? PHASES[0].manifest;
}
