import type { RoomData } from "../data/mockData";

export type HeatMetric = "peakDaytime" | "avgNighttime";

export interface HeatMetricOption {
  id: HeatMetric;
  label: string;
  shortLabel: string;
}

export const HEAT_METRICS: HeatMetricOption[] = [
  {
    id: "peakDaytime",
    label: "Peak daytime temperature",
    shortLabel: "Peak daytime",
  },
  {
    id: "avgNighttime",
    label: "Average nighttime temperature",
    shortLabel: "Avg nighttime",
  },
];

export const DEFAULT_HEAT_METRIC: HeatMetric = "peakDaytime";

export function heatValue(data: RoomData, metric: HeatMetric): number {
  return metric === "peakDaytime" ? data.peakDaytimeC : data.avgNighttimeC;
}

export function heatMetricLabel(metric: HeatMetric): string {
  return HEAT_METRICS.find((m) => m.id === metric)?.label ?? metric;
}
