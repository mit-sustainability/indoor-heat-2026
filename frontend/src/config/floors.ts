// Floor metadata: which PNG to show, and where to place the clickable
// floor buttons on top of sky_mccorm.jpg.
//
// Button x/y are normalized (0..1) coordinates over the hero image.
// They cluster on the right tower per the dashboard sketch.

export type FloorNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface FloorMeta {
  floor: FloorNumber;
  png: string;
  buttonX: number; // normalized 0..1 over the hero image
  buttonY: number;
}

export const FLOORS: FloorMeta[] = [
  { floor: 7, png: "/floorplans/floor-7.png", buttonX: 0.72, buttonY: 0.27 },
  { floor: 6, png: "/floorplans/floor-6.png", buttonX: 0.72, buttonY: 0.36 },
  { floor: 5, png: "/floorplans/floor-5.png", buttonX: 0.72, buttonY: 0.45 },
  { floor: 4, png: "/floorplans/floor-4.png", buttonX: 0.72, buttonY: 0.54 },
  { floor: 3, png: "/floorplans/floor-3.png", buttonX: 0.72, buttonY: 0.63 },
  { floor: 2, png: "/floorplans/floor-2.png", buttonX: 0.72, buttonY: 0.72 },
  { floor: 1, png: "/floorplans/floor-1.png", buttonX: 0.72, buttonY: 0.81 },
];
