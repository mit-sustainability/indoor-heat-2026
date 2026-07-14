// Intervention catalog — edit labels, icons, and descriptions HERE.
//
// Keys must match the exact `window_state` / `blinds_state` strings in the
// phase readings JSON (see output/*/readings_*.json).
//
// Each room popup shows one card per matched state. Icons (emoji) are kept
// here so you can tweak them without touching the floor-plan UI.

export interface Intervention {
  label: string;
  emoji: string;
  description: string;
}

/** Window / ventilation protocols (`window_state` in the export). */
export const WINDOW_INTERVENTIONS: Record<string, Intervention> = {
  "Closed 24/7": {
    label: "Windows closed",
    emoji: "🪟",
    description: "Windows kept closed at all times.",
  },
  "Open 24/7": {
    label: "Windows open",
    emoji: "🌬️",
    description: "Windows kept open at all times.",
  },
  "Night Flush": {
    label: "Night flush",
    emoji: "🌙",
    description: "Fan turned on overnight to flush heat. Blinds pulled down to cover the fan in the morning.",
  },
  "Fan in window but not on": {
    label: "Box fan (off)",
    emoji: "💨",
    description: "Fan placed in the window but not running.",
  },
  "Partial w/ fan": {
    label: "Partial open + fan",
    emoji: "",
    description: "Windows partially open with a fan running. Edit this explanation.",
  },
};

/** Blind / shade protocols (`blinds_state` in the export). */
export const BLINDS_INTERVENTIONS: Record<string, Intervention> = {
  Open: {
    label: "Blinds open",
    emoji: "☀️",
    description: "Blinds left fully open.",
  },
  Closed: {
    label: "Blinds closed",
    emoji: "🔳",
    description: "Blinds closed to the top of the fan to prevent interference.",
  },
  Partial: {
    label: "Blinds partial",
    emoji: "",
    description: "Blinds closed to the top of the fan to prevent interference.",
  },
};

/**
 * Map a room's window_state + blinds_state into popup intervention cards.
 * Unknown non-empty values still show a card (label = raw string) so new
 * export values don't silently disappear.
 */
export function interventionsFromStates(
  windowState?: string | null,
  blindsState?: string | null,
): Intervention[] {
  const out: Intervention[] = [];

  const windowKey = windowState?.trim() ?? "";
  if (windowKey) {
    out.push(
      WINDOW_INTERVENTIONS[windowKey] ?? {
        label: windowKey,
        emoji: "🪟",
        description: "",
      },
    );
  }

  const blindsKey = blindsState?.trim() ?? "";
  if (blindsKey) {
    out.push(
      BLINDS_INTERVENTIONS[blindsKey] ?? {
        label: `Blinds ${blindsKey}`,
        emoji: "🪟",
        description: "",
      },
    );
  }

  return out;
}
