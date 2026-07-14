// Red → purple → blue scale by selected heat metric.
// Warm rooms = red, cool rooms = blue, mid-range = purple (no green/cyan).

export interface ColorScaleOptions {
  minC?: number;
  maxC?: number;
}

/** CSS gradient for legends: hot (red) → mid (purple) → cool (blue). */
export const TEMP_SCALE_GRADIENT =
  "linear-gradient(to right, #ef4444, #a855f7, #3b82f6)";

const STOPS = [
  { t: 0, r: 59, g: 130, b: 246 }, // blue — coolest
  { t: 0.5, r: 168, g: 85, b: 247 }, // purple — mid
  { t: 1, r: 239, g: 68, b: 68 }, // red — hottest
] as const;

function lerpChannel(
  t: number,
  c0: number,
  c1: number,
  c2: number,
): number {
  if (t <= 0.5) return Math.round(c0 + (c1 - c0) * (t / 0.5));
  return Math.round(c1 + (c2 - c1) * ((t - 0.5) / 0.5));
}

export function tempToColor(tempC: number, opts: ColorScaleOptions = {}): string {
  const min = opts.minC ?? 22;
  const max = opts.maxC ?? 30;
  const t = Math.min(1, Math.max(0, (tempC - min) / (max - min)));
  const r = lerpChannel(t, STOPS[0].r, STOPS[1].r, STOPS[2].r);
  const g = lerpChannel(t, STOPS[0].g, STOPS[1].g, STOPS[2].g);
  const b = lerpChannel(t, STOPS[0].b, STOPS[1].b, STOPS[2].b);
  return `rgb(${r}, ${g}, ${b})`;
}
