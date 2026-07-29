// Room types and fallback node placement.
//
// Live node set + positions come from each phase's readings JSON
// (`node_x` / `node_y` → xNorm / yNorm). Fallbacks below cover exports
// that omit coordinates (e.g. heat_event).

import type { FloorNumber } from "./floors";

export type Orientation =
  | "East facing"
  | "South facing"
  | "West facing";

export type SensorRole = "room" | "indoor_control" | "outdoor_courtyard";

export interface RoomMeta {
  /** Sensor / room id from export (`"304"`, `"hallway"`, …). */
  room: string;
  floor: FloorNumber;
  xNorm: number;
  yNorm: number;
  orientation: Orientation;
  role: SensorRole;
  /** Optional display name from phase metadata.json. */
  label?: string | null;
}

/** Known positions when readings lack node_x / node_y. */
export const FALLBACK_NODE_POS: Record<string, { xNorm: number; yNorm: number }> = {
  "303": { xNorm: 0.314, yNorm: 0.316 },
  "304": { xNorm: 0.314, yNorm: 0.377 },
  "309": { xNorm: 0.224, yNorm: 0.639 },
  "311": { xNorm: 0.137, yNorm: 0.57 },
  "312": { xNorm: 0.137, yNorm: 0.506 },
  "313": { xNorm: 0.137, yNorm: 0.441 },
  "314": { xNorm: 0.137, yNorm: 0.377 },
  "315": { xNorm: 0.137, yNorm: 0.316 },
  "504": { xNorm: 0.314, yNorm: 0.377 },
  "514": { xNorm: 0.137, yNorm: 0.377 },
  "703": { xNorm: 0.314, yNorm: 0.316 },
  "704": { xNorm: 0.314, yNorm: 0.377 },
  "709": { xNorm: 0.224, yNorm: 0.639 },
  "711": { xNorm: 0.137, yNorm: 0.57 },
  "712": { xNorm: 0.137, yNorm: 0.506 },
  "713": { xNorm: 0.137, yNorm: 0.441 },
  "714": { xNorm: 0.137, yNorm: 0.377 },
  "715": { xNorm: 0.137, yNorm: 0.316 },
  hallway: { xNorm: 0.224, yNorm: 0.57 },
};

export function normalizeOrientation(raw?: string | null): Orientation {
  const s = (raw ?? "").toLowerCase().replace(/[()]/g, "").trim();
  if (s.includes("east")) return "East facing";
  if (s.includes("west")) return "West facing";
  if (s.includes("south")) return "South facing";
  return "South facing";
}

export function roomLabel(meta: RoomMeta): string {
  const custom = meta.label?.trim();
  if (custom) return custom;
  if (meta.role === "outdoor_courtyard") return "Courtyard";
  if (meta.room === "hallway") return "Hallway";
  return meta.room;
}

export function nodeRole(room: string): SensorRole {
  if (room === "courtyard") return "outdoor_courtyard";
  if (room === "hallway") return "indoor_control";
  return "room";
}
