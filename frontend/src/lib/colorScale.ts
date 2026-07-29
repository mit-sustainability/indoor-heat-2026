// Green → yellow → orange → red heat scale by selected metric.
// Cool rooms = green, warm rooms = red. Interpolated in OKLCH.

import type { TempUnit } from "../config/tempUnit";

export interface ColorScaleOptions {
  min?: number;
  max?: number;
}

/** Legend stops: cool (green) → hot (red). */
const STOP_HEX = [
  "#41B507", // green
  "#FFD500", // yellow
  "#FF6A00", // orange
  "#DD1C1A", // red
] as const;

/** CSS gradient for legends — same stops as node coloring. */
export const TEMP_SCALE_GRADIENT = `linear-gradient(to right, ${STOP_HEX.join(", ")})`;

interface Oklch {
  L: number;
  C: number;
  h: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Max pad (°C / °F) when all rooms share the same temperature. */
const PAD_MAX: Record<TempUnit, number> = { c: 1, f: 2 };
/** Spread at which padding is half of PAD_MAX (then keeps shrinking). */
const PAD_HALF_SPREAD: Record<TempUnit, number> = { c: 0.5, f: 0.9 };

/**
 * Domain for node colors: pad min/max so near-identical temps still get
 * distinct hues. Padding decays as the floor spread grows
 * (pad = padMax / (1 + spread / halfSpread)).
 */
export function colorScaleDomain(
  rawMin: number,
  rawMax: number,
  unit: TempUnit,
): ColorScaleOptions {
  const spread = Math.max(0, rawMax - rawMin);
  const pad = PAD_MAX[unit] / (1 + spread / PAD_HALF_SPREAD[unit]);
  return { min: rawMin - pad, max: rawMax + pad };
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(255, Math.max(0, v * 255)));
}

function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.hypot(a, bOk);
  let h = (Math.atan2(bOk, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

function oklchToRgb({ L, C, h }: Oklch): Rgb {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const bOk = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * bOk;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bOk;
  const s_ = L - 0.0894841775 * a - 1.291485548 * bOk;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    r: linearToSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

function parseHex(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Stops in OKLCH with consecutive hues on the shortest arc (not +360 unwrap). */
const STOPS: { t: number; L: number; C: number; h: number }[] = (() => {
  const stops = STOP_HEX.map((hex, i) => {
    const { L, C, h } = rgbToOklch(parseHex(hex));
    return { t: i / (STOP_HEX.length - 1), L, C, h };
  });
  // Green→yellow→orange→red decreases in hue; forcing h to rise takes the
  // long way through cyan/blue/purple. Keep each step within ±180°.
  for (let i = 1; i < stops.length; i++) {
    while (stops[i].h - stops[i - 1].h > 180) stops[i].h -= 360;
    while (stops[i - 1].h - stops[i].h > 180) stops[i].h += 360;
  }
  return stops;
})();

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function colorAt(t: number): string {
  const x = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < STOPS.length - 2 && x > STOPS[i + 1].t) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const u = (x - a.t) / (b.t - a.t);
  const rgb = oklchToRgb({
    L: lerp(a.L, b.L, u),
    C: lerp(a.C, b.C, u),
    h: lerp(a.h, b.h, u),
  });
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function tempToColor(temp: number, opts: ColorScaleOptions = {}): string {
  const min = opts.min ?? 22;
  const max = opts.max ?? 30;
  const t = (temp - min) / (max - min);
  return colorAt(t);
}
