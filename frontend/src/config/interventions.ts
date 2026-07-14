// Intervention catalog — edit labels and descriptions HERE.
//
// Keys must match the exact `window_state` / `blinds_state` / `fan` strings in
// the phase readings JSON (see output/*/readings_*.json).
//
// When `fan` is absent from the export, fan status is inferred from
// `window_state` via FAN_FROM_WINDOW_STATE below.
//
// Each room popup shows one card per category (window, blinds, fan).

export type InterventionCategory = "window" | "blinds" | "fan";

export interface Intervention {
  category: InterventionCategory;
  label: string;
  description: string;
}

const CATEGORY_LABEL: Record<InterventionCategory, string> = {
  window: "Window status",
  blinds: "Blinds status",
  fan: "Fan status",
};

export function interventionCategoryLabel(category: InterventionCategory): string {
  return CATEGORY_LABEL[category];
}

/** Window / ventilation protocols (`window_state` in the export). */
export const WINDOW_INTERVENTIONS: Record<string, Omit<Intervention, "category">> = {
  "Closed 24/7": {
    label: "Windows closed",
    description: "Windows kept closed at all times.",
  },
  "Open 24/7": {
    label: "Windows open",
    description: "Windows kept open at all times.",
  },
  "Night Flush": {
    label: "Night flush",
    description: "Windows cracked to fit the fan. Blinds pulled down to cover the fan in the morning.",
  },
  "Fan in window but not on": {
    label: "Partial open with fan (off)",
    description: "Windows cracked to fit the fan.",
  },
  "Partial w/ fan": {
    label: "Partial open + fan",
    description: "Windows cracked to fit the fan.",
  },
};

/** Blind / shade protocols (`blinds_state` in the export). */
export const BLINDS_INTERVENTIONS: Record<string, Omit<Intervention, "category">> = {
  Open: {
    label: "Blinds open",
    description: "Blinds left fully open.",
  },
  Closed: {
    label: "Blinds closed",
    description: "Blinds left fully closed.",
  },
  Partial: {
    label: "Blinds partial",
    description: "Blinds left partially closed to the top of the fan to prevent interference.",
  },
};

/** Fan protocols (`fan` in the export, or inferred from window_state). */
export const FAN_INTERVENTIONS: Record<string, Omit<Intervention, "category">> = {
  None: {
    label: "No fan",
    description: "No fan in use for this protocol.",
  },
  Off: {
    label: "Fan off",
    description: "Fan placed in the window but not running.",
  },
  On: {
    label: "Fan on",
    description: "Fan running.",
  },
  "Night Flush": {
    label: "Night flush",
    description: "Fan turned on overnight to flush heat.",
  },
};

/**
 * When readings omit `fan`, map known window_state values to a fan catalog key.
 * Edit here if new combined window/fan protocols appear in the export.
 */
export const FAN_FROM_WINDOW_STATE: Record<string, string> = {
  "Closed 24/7": "None",
  "Open 24/7": "None",
  "Night Flush": "Night Flush",
  "Fan in window but not on": "Off",
  "Partial w/ fan": "On",
};

function withCategory(
  category: InterventionCategory,
  entry: Omit<Intervention, "category">,
): Intervention {
  return { category, ...entry };
}

function resolveFanKey(
  fanState?: string | null,
  windowState?: string | null,
): string {
  const explicit = fanState?.trim() ?? "";
  if (explicit) return explicit;
  const windowKey = windowState?.trim() ?? "";
  return FAN_FROM_WINDOW_STATE[windowKey] ?? "";
}

/**
 * Map a room's window / blinds / fan states into three popup category cards.
 * Unknown non-empty values still show a card (label = raw string) so new
 * export values don't silently disappear.
 */
export function interventionsFromStates(
  windowState?: string | null,
  blindsState?: string | null,
  fanState?: string | null,
): Intervention[] {
  const out: Intervention[] = [];

  const windowKey = windowState?.trim() ?? "";
  if (windowKey) {
    out.push(
      withCategory(
        "window",
        WINDOW_INTERVENTIONS[windowKey] ?? {
          label: windowKey,
          description: "",
        },
      ),
    );
  }

  const blindsKey = blindsState?.trim() ?? "";
  if (blindsKey) {
    out.push(
      withCategory(
        "blinds",
        BLINDS_INTERVENTIONS[blindsKey] ?? {
          label: `Blinds ${blindsKey}`,
          description: "",
        },
      ),
    );
  }

  const fanKey = resolveFanKey(fanState, windowState);
  if (fanKey) {
    out.push(
      withCategory(
        "fan",
        FAN_INTERVENTIONS[fanKey] ?? {
          label: fanKey,
          description: "",
        },
      ),
    );
  }

  return out;
}
