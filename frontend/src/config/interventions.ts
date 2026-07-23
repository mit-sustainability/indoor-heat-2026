// Intervention resolution — catalog lives in each phase's metadata.json
// (`interventions` key). Edit labels / options there, not here.
//
// Keys must match the exact `window_state` / `blinds_state` / `fan` strings
// in metadata.sensors (or phase readings when metadata omits them).
//
// When `fan` is absent, fan status is inferred from `window_state` via
// `fan_from_window_state` in the catalog.
//
// Each room popup shows one card per category (window, blinds, fan).

export type InterventionCategory = "window" | "blinds" | "fan";

export interface InterventionEntry {
  label: string;
  description: string;
}

export interface InterventionCatalog {
  categories: Record<InterventionCategory, string>;
  window: Record<string, InterventionEntry>;
  blinds: Record<string, InterventionEntry>;
  fan: Record<string, InterventionEntry>;
  fan_from_window_state: Record<string, string>;
}

export interface Intervention {
  category: InterventionCategory;
  categoryLabel: string;
  label: string;
  description: string;
  /** Top-right badge on the card (e.g. blinds shade squares). */
  badge?: string;
}

/** Map metadata `blinds_shade` to square emojis for the blinds card. */
export function blindsShadeBadge(shade?: string | null): string | undefined {
  if (!shade?.trim()) return undefined;
  const s = shade.toLowerCase();
  const hasLight = s.includes("light");
  const hasDark = s.includes("dark");
  if (hasLight && hasDark) return "⬜⬛";
  if (hasDark) return "⬛";
  if (hasLight) return "⬜";
  return undefined;
}

/** Fallback when a phase manifest has no metadata file yet. */
export const DEFAULT_INTERVENTION_CATALOG: InterventionCatalog = {
  categories: {
    window: "Window status",
    blinds: "Blinds status",
    fan: "Fan status",
  },
  window: {
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
      description:
        "Windows cracked to fit the fan. Blinds pulled down to cover the fan in the morning.",
    },
    "Fan in window but not on": {
      label: "Partial open with fan (off)",
      description: "Windows cracked to fit the fan.",
    },
    "Partial w/ fan": {
      label: "Partial open + fan",
      description: "Windows cracked to fit the fan.",
    },
  },
  blinds: {
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
      description:
        "Blinds left partially closed to the top of the fan to prevent interference.",
    },
  },
  fan: {
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
  },
  fan_from_window_state: {
    "Closed 24/7": "None",
    "Open 24/7": "None",
    "Night Flush": "Night Flush",
    "Fan in window but not on": "Off",
    "Partial w/ fan": "On",
  },
};

function withCategory(
  category: InterventionCategory,
  entry: InterventionEntry,
  catalog: InterventionCatalog,
): Intervention {
  return {
    category,
    categoryLabel: catalog.categories[category] ?? category,
    ...entry,
  };
}

function resolveFanKey(
  fanState: string | null | undefined,
  windowState: string | null | undefined,
  catalog: InterventionCatalog,
): string {
  const explicit = fanState?.trim() ?? "";
  if (explicit) return explicit;
  const windowKey = windowState?.trim() ?? "";
  return catalog.fan_from_window_state[windowKey] ?? "";
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
  catalog: InterventionCatalog = DEFAULT_INTERVENTION_CATALOG,
  blindsShade?: string | null,
): Intervention[] {
  const out: Intervention[] = [];

  const windowKey = windowState?.trim() ?? "";
  if (windowKey) {
    out.push(
      withCategory(
        "window",
        catalog.window[windowKey] ?? {
          label: windowKey,
          description: "",
        },
        catalog,
      ),
    );
  }

  const blindsKey = blindsState?.trim() ?? "";
  if (blindsKey) {
    const blinds = withCategory(
      "blinds",
      catalog.blinds[blindsKey] ?? {
        label: `Blinds ${blindsKey}`,
        description: "",
      },
      catalog,
    );
    const badge = blindsShadeBadge(blindsShade);
    out.push(badge ? { ...blinds, badge } : blinds);
  }

  const fanKey = resolveFanKey(fanState, windowState, catalog);
  if (fanKey) {
    out.push(
      withCategory(
        "fan",
        catalog.fan[fanKey] ?? {
          label: fanKey,
          description: "",
        },
        catalog,
      ),
    );
  }

  return out;
}
