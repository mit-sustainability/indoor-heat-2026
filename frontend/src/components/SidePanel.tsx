import { Link, useSearchParams } from "react-router-dom";
import type { FloorNumber } from "../config/floors";
import {
  HEAT_METRICS,
  heatMetricLabel,
  type HeatMetric,
} from "../config/heatMetrics";
import { DEFAULT_PHASE, PHASES } from "../config/phases";
import { TEMP_SCALE_GRADIENT } from "../lib/colorScale";

interface FloorStats {
  avgTempC: number | null;
  avgHumidity: number | null;
  lastUpdated: string | null;
}

interface Props {
  floor: FloorNumber;
  stats: FloorStats;
  heatMetric: HeatMetric;
  onHeatMetricChange: (metric: HeatMetric) => void;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SidePanel({
  floor,
  stats,
  heatMetric,
  onHeatMetricChange,
}: Props) {
  const avg = stats;
  const [searchParams, setSearchParams] = useSearchParams();
  const phase = searchParams.get("phase") ?? DEFAULT_PHASE;
  const backTo = `/?phase=${phase}`;

  return (
    <aside className="flex h-full w-72 flex-col gap-6 bg-zinc-900 px-6 py-5 text-zinc-200">
      <div>
        <div className="flex items-center justify-between gap-3">
          <Link
            to={backTo}
            className="inline-flex shrink-0 items-center gap-1 text-xs text-zinc-400 hover:text-white"
          >
            ← All floors
          </Link>
          <select
            className="max-w-[9.5rem] cursor-pointer truncate border-b border-zinc-500 bg-transparent text-right font-mono text-[10px] uppercase tracking-widest text-zinc-300 outline-none hover:text-white"
            value={phase}
            onChange={(e) => setSearchParams({ phase: e.target.value })}
            aria-label="Study phase"
          >
            {PHASES.map((p) => (
              <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-200">
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          Floor {floor}
        </h2>
        <p className="text-xs text-zinc-400">West Tower · McCormick Hall</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Floor averages
        </h3>

        <Stat
          label="Avg temperature"
          value={avg.avgTempC !== null ? `${avg.avgTempC.toFixed(1)} °C` : "—"}
          accent="rgb(239 68 68)"
        />
        <Stat
          label="Avg humidity"
          value={avg.avgHumidity !== null ? `${avg.avgHumidity.toFixed(0)} %` : "—"}
          accent="rgb(59 130 246)"
        />
        <Stat label="Last collected" value={formatTimestamp(avg.lastUpdated)} />
      </div>

      <div className="mt-auto rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-xs leading-relaxed text-zinc-400">
        <div className="mb-2 font-semibold text-zinc-300">Heat metric</div>
        <div
          className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-zinc-900/80 p-1"
          role="group"
          aria-label="Heat metric for node colors"
        >
          {HEAT_METRICS.map((option) => {
            const selected = heatMetric === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onHeatMetricChange(option.id)}
                aria-pressed={selected}
                className={`rounded px-2 py-1.5 text-left text-[11px] font-medium leading-snug transition ${
                  selected
                    ? "bg-zinc-600 text-white shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {option.shortLabel}
              </button>
            );
          })}
        </div>
        <p className="mb-3">
          Nodes are colored by {heatMetricLabel(heatMetric).toLowerCase()} on
          this floor. Click a node for room-level details.
        </p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            <span>Hotter</span>
            <span>Cooler</span>
          </div>
          <div
            className="h-2.5 w-full rounded-full ring-1 ring-white/10"
            style={{ background: TEMP_SCALE_GRADIENT }}
            role="img"
            aria-label="Temperature color scale from red (hot) through purple to blue (cool)"
          />
          <div className="flex justify-between text-[10px] text-neutral-500">
            <span className="text-red-400">Red</span>
            <span className="text-purple-400">Purple</span>
            <span className="text-blue-400">Blue</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div
        className="mt-0.5 text-2xl font-semibold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
