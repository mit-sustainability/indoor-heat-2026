// Floor metadata: which PNG to show, and where to place the clickable
// floor buttons on top of elevation.png.
//
// HOW TO NUDGE BUTTON POSITIONS
// -----------------------------
// Edit buttonX / buttonY below, save, and the dev server hot-reloads.
//
// Coordinates are normalized (0..1) over the full elevation.png (6048×4320),
// not the browser window. object-fit: cover is handled automatically.
//
//   buttonX — horizontal (0 = left edge, 1 = right edge)
//             ↑ decrease = move buttons left (away from tower)
//             ↓ increase = move buttons right (closer to / over the tower)
//
//   buttonY — vertical (0 = top of image, 1 = bottom of image)
//             ↑ decrease = move buttons up
//             ↓ increase = move buttons down
//
// Try steps of 0.005–0.01 per nudge. buttonX is the tower face; the label
// renders to the left of that point (see Landing.tsx -translate-x-full).

export type FloorNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface FloorMeta {
  floor: FloorNumber;
  png: string;
  buttonX: number;
  buttonY: number;
}

// Calibrated to the right tower in elevation.png (F7 = top windows, F1 = ground).
export const FLOORS: FloorMeta[] = [
  { floor: 7, png: "/floorplans/floor-7.png", buttonX: 0.718, buttonY: 0.340 },
  { floor: 6, png: "/floorplans/floor-6.png", buttonX: 0.718, buttonY: 0.407 },
  { floor: 5, png: "/floorplans/floor-5.png", buttonX: 0.718, buttonY: 0.474 },
  { floor: 4, png: "/floorplans/floor-4.png", buttonX: 0.718, buttonY: 0.541 },
  { floor: 3, png: "/floorplans/floor-3.png", buttonX: 0.718, buttonY: 0.608 },
  { floor: 2, png: "/floorplans/floor-2.png", buttonX: 0.718, buttonY: 0.675 },
  { floor: 1, png: "/floorplans/floor-1.png", buttonX: 0.718, buttonY: 0.742 },
];
