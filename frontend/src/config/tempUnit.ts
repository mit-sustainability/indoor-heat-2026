export const TEMP_UNITS = [
  { id: "c", label: "Celsius (°C)", shortLabel: "°C" },
  { id: "f", label: "Fahrenheit (°F)", shortLabel: "°F" },
] as const;

export type TempUnit = (typeof TEMP_UNITS)[number]["id"];

export const DEFAULT_TEMP_UNIT: TempUnit = "c";

export function parseTempUnit(raw: string | null | undefined): TempUnit {
  return raw === "f" ? "f" : DEFAULT_TEMP_UNIT;
}

export function tempUnitSymbol(unit: TempUnit): "°C" | "°F" {
  return unit === "f" ? "°F" : "°C";
}

export function tempUnitLabel(unit: TempUnit): string {
  return TEMP_UNITS.find((u) => u.id === unit)?.label ?? unit;
}
