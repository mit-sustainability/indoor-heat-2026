export const PHASES = [
  {
    id: "phase1",
    label: "Phase 1 (Jun 3–9)",
    manifest: "/data/phase1/manifest.json",
    description:
      "Baseline monitoring of the greenhouse effect with windows closed 24/7 and blinds open.",
  },
  {
    id: "phase2",
    label: "Phase 2 (Jun 10–16)",
    manifest: "/data/phase2/manifest.json",
    description:
      "Windows left open 24/7 with blinds closed to the top of the window opening to test shaded natural ventilation.",
  },
  {
    id: "phase3",
    label: "Phase 3 (Jun 18–21)",
    manifest: "/data/phase3/manifest.json",
    description:
      "Night-flush protocol with window fans, plus comparison rooms kept with windows open 24/7 or with fans present but turned off.",
  },
  {
    id: "phase4",
    label: "Phase 4 (Jun 23–30)",
    manifest: "/data/phase4/manifest.json",
    description:
      "Side-by-side comparison of closed windows, fully open windows, and partial open with different fan usage protocol (night-flush, 24/7 open).",
  },
  {
    id: "heat_event",
    label: "Heat Event (Jul 1–6)",
    manifest: "/data/heat_event/manifest.json",
    description:
      "Monitoring during a heat event, comparing closed windows against partial open with a window fan running 24/7.",
  },
] as const;

export type PhaseId = typeof PHASES[number]["id"];
export const DEFAULT_PHASE: PhaseId = "phase1";

export function phaseManifest(id: string): string {
  return PHASES.find((p) => p.id === id)?.manifest ?? PHASES[0].manifest;
}

export function phaseById(id: string) {
  return PHASES.find((p) => p.id === id) ?? PHASES[0];
}
