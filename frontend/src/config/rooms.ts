// Room metadata: instrumented study rooms, node placement, orientation.
//
// Coordinates are normalized 0..1 over the floor plan PNG (2448×1584).
// yNorm targets the center of each room label; RoomNode renders above it.
// Layout matches W4 west-wing rooms 04 / 09 / 14 on floors 3, 5, and 7.

import type { FloorNumber } from "./floors";

export type Orientation =
  | "East facing"
  | "South facing"
  | "West facing";

export type SensorRole = "room" | "indoor_control" | "outdoor_courtyard";

export interface RoomMeta {
  room: number;
  floor: FloorNumber;
  xNorm: number;
  yNorm: number;
  orientation: Orientation;
  role: SensorRole;
}

// Shared layout: x04 right perimeter, x09 bottom center, x14 left perimeter.
const POS_X04 = { xNorm: 0.314, yNorm: 0.377 };
const POS_X09 = { xNorm: 0.224, yNorm: 0.639 };
const POS_X14 = { xNorm: 0.137, yNorm: 0.377 };

function room(
  room: number,
  floor: FloorNumber,
  pos: { xNorm: number; yNorm: number },
  orientation: Orientation,
): RoomMeta {
  return { room, floor, ...pos, orientation, role: "room" };
}

function courtyardSensor(
  room: number,
  floor: FloorNumber,
  pos: { xNorm: number; yNorm: number },
): RoomMeta {
  return { room, floor, ...pos, orientation: "South facing", role: "outdoor_courtyard" };
}

// Center of the open courtyard on the floor 1 plan (both towers).
const POS_COURTYARD_F1 = { xNorm: 0.400, yNorm: 0.440 };

export const ROOMS: RoomMeta[] = [
  // Floor 1 — outdoor courtyard reference sensor
  courtyardSensor(199, 1, POS_COURTYARD_F1),
  // Floor 3
  room(304, 3, POS_X04, "East facing"),
  room(309, 3, POS_X09, "South facing"),
  room(311, 3, POS_X14, "West facing"), // heat event; position overridden by node_x/node_y from data when present
  room(314, 3, POS_X14, "West facing"),
  // Floor 5
  room(504, 5, POS_X04, "East facing"),
  room(514, 5, POS_X14, "West facing"),
  // Floor 7
  room(704, 7, POS_X04, "East facing"),
  room(709, 7, POS_X09, "South facing"),
  room(711, 7, POS_X14, "West facing"), // heat event; position overridden by node_x/node_y from data when present
  room(714, 7, POS_X14, "West facing"),
];

export const CONTROL_ROOMS: Record<FloorNumber, number | null> = {
  1: null,
  2: null,
  3: 301,
  4: null,
  5: 501,
  6: null,
  7: 701,
};

export function roomsForFloor(floor: FloorNumber): RoomMeta[] {
  return ROOMS.filter((r) => r.floor === floor);
}
