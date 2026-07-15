import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FLOORS, type FloorNumber } from "../config/floors";
import {
  PHASES,
  DEFAULT_PHASE,
  phaseById,
  phaseManifest,
} from "../config/phases";
import { PROJECT_SECTION } from "../config/project";
import { coverPointToPercent, useElementSize } from "../lib/useElementSize";
import { loadReadings } from "../services/data";
import {
  computePhaseStats,
  floorsWithNodes,
  transformReadings,
  type PhaseStats,
} from "../services/transform";

const ELEVATION_RATIO = 6048 / 4320;
// Between the two towers, just above the flat central wing.
// Caption + scroll link share this x so their centers stay aligned.
const FLOOR_HINT = { x: 0.53, y: 0.68 };
const ELEVATION_CAPTION_Y = 0.825;

const EMPTY_STATS: PhaseStats = {
  tempHigh: null,
  heatIndexHigh: null,
  lowestAvgNighttime: null,
};

export default function Landing() {
  const stageRef = useRef<HTMLDivElement>(null);
  const stageSize = useElementSize(stageRef);
  const [searchParams, setSearchParams] = useSearchParams();
  const phase = searchParams.get("phase") ?? DEFAULT_PHASE;
  const [activeFloors, setActiveFloors] = useState<FloorNumber[] | null>(null);
  const [phaseStats, setPhaseStats] = useState<PhaseStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    setActiveFloors(null);
    setPhaseStats(null);
    loadReadings(phaseManifest(phase))
      .then((readings) => {
        if (cancelled) return;
        const { roomData } = transformReadings(readings);
        setActiveFloors(floorsWithNodes(roomData));
        setPhaseStats(computePhaseStats(roomData));
      })
      .catch(() => {
        if (!cancelled) {
          setActiveFloors([]);
          setPhaseStats(EMPTY_STATS);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [phase]);

  const visibleFloors =
    activeFloors === null
      ? []
      : FLOORS.filter((f) => activeFloors.includes(f.floor));

  const phaseInfo = phaseById(phase);
  const stats = phaseStats ?? EMPTY_STATS;

  return (
    <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-white text-on-surface">
      <section className="relative h-screen w-full shrink-0">
        <div ref={stageRef} className="absolute inset-0">
          <img
            src="/elevation.png"
            alt="Stanley McCormick Hall elevation"
            className="absolute inset-0 h-full w-full select-none object-cover object-center"
            draggable={false}
          />

          <nav className="absolute inset-0 z-10">
            {stageSize.width > 0 &&
              visibleFloors.map((f) => {
                const pos = coverPointToPercent(
                  stageSize.width,
                  stageSize.height,
                  ELEVATION_RATIO,
                  f.buttonX,
                  f.buttonY,
                );
                return (
                  <Link
                    key={f.floor}
                    to={`/floor/${f.floor}?phase=${phase}`}
                    className="floor-button group absolute -translate-x-full -translate-y-1/2 pr-2"
                    style={{
                      left: `${pos.left}%`,
                      top: `${pos.top}%`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="glass-panel inline-flex min-w-[5rem] items-center justify-center rounded-lg px-4 py-2 font-mono text-xs font-medium tracking-wide text-zinc-800 transition-colors group-hover:text-zinc-950">
                        Floor {f.floor}
                      </span>
                      <span className="accent-line h-0.5 w-0 bg-zinc-900 opacity-0 transition-all duration-300 group-hover:w-5 group-hover:opacity-70" />
                    </div>
                  </Link>
                );
              })}
          </nav>

          {stageSize.width > 0 && (() => {
            const hintPos = coverPointToPercent(
              stageSize.width,
              stageSize.height,
              ELEVATION_RATIO,
              FLOOR_HINT.x,
              FLOOR_HINT.y,
            );
            return (
              <p
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-900 opacity-70"
                style={{
                  left: `${hintPos.left}%`,
                  top: `${hintPos.top}%`,
                }}
              >
                Click a floor to explore sensor readings
              </p>
            );
          })()}

          {stageSize.width > 0 && (() => {
            const captionPos = coverPointToPercent(
              stageSize.width,
              stageSize.height,
              ELEVATION_RATIO,
              FLOOR_HINT.x,
              ELEVATION_CAPTION_Y,
            );
            return (
              <p
                className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700 opacity-60"
                style={{
                  left: `${captionPos.left}%`,
                  top: `${captionPos.top}%`,
                }}
              >
                Northern Elevation of McCormick Hall - Front view from Amherst Street
              </p>
            );
          })()}
        </div>

        <div className="absolute right-6 top-5 z-20 md:right-10">
          <select
            className="cursor-pointer border-b border-zinc-400 bg-transparent font-mono text-[10px] uppercase tracking-widest text-zinc-900 outline-none"
            value={phase}
            onChange={(e) => setSearchParams({ phase: e.target.value })}
          >
            {PHASES.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>

        <header className="pointer-events-none absolute left-0 top-0 z-20 px-6 py-5 md:px-10">
          <h1 className="font-display text-xl font-semibold tracking-tight text-zinc-900 md:text-2xl">
            Indoor Heat Project
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-900">
            <span className="opacity-100">MIT Office of Sustainability</span>
            <span className="h-1 w-1 rounded-full bg-outline-variant" />
            <span className="opacity-100">Stanley McCormick Hall</span>
            <span className="h-1 w-1 rounded-full bg-outline-variant" />
            <span className="opacity-100">West Tower</span>
          </div>
        </header>

        {stageSize.width > 0 && (() => {
          const scrollPos = coverPointToPercent(
            stageSize.width,
            stageSize.height,
            ELEVATION_RATIO,
            FLOOR_HINT.x,
            0.5,
          );
          return (
            <a
              href="#phase-overview"
              className="absolute bottom-0 z-20 -translate-x-1/2 whitespace-nowrap px-4 pb-10 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-900 opacity-70 transition-opacity hover:opacity-90"
              style={{ left: `${scrollPos.left}%` }}
            >
              Scroll for overview ↓
            </a>
          );
        })()}

        <div className="pointer-events-none absolute bottom-10 right-16 z-20 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-zinc-700 opacity-60 md:right-24">
          <span>East</span>
          <svg
            width="48"
            height="10"
            viewBox="0 0 48 10"
            fill="none"
            className="text-zinc-600"
          >
            <path d="M0 5 L7 1.5 L7 3.5 L41 3.5 L41 1.5 L48 5 L41 8.5 L41 6.5 L7 6.5 L7 8.5 Z" fill="currentColor" />
          </svg>
          <span>West</span>
        </div>
      </section>

      <section
        id="phase-overview"
        className="relative min-h-[70vh] bg-zinc-50 px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Phase overview
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
            {phaseInfo.label}
          </h2>
          <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-zinc-600 md:text-base">
            {phaseInfo.description}
          </p>

          <div className="mt-12 grid gap-10 border-t border-zinc-200 pt-10 sm:grid-cols-3 sm:gap-8">
            <PhaseStat
              label="Temperature high"
              highlight={stats.tempHigh}
              loading={phaseStats === null}
            />
            <PhaseStat
              label="Heat index high"
              highlight={stats.heatIndexHigh}
              loading={phaseStats === null}
            />
            <PhaseStat
              label="Lowest avg nighttime"
              highlight={stats.lowestAvgNighttime}
              loading={phaseStats === null}
            />
          </div>
        </div>
      </section>

      <section
        id="project-overview"
        className="relative min-h-[70vh] bg-white px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            {PROJECT_SECTION.eyebrow}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
            {PROJECT_SECTION.title}
          </h2>
          <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-zinc-600 md:text-base">
            {PROJECT_SECTION.body}
          </p>

          <div className="mt-12 grid gap-10 border-t border-zinc-200 pt-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
            {PROJECT_SECTION.subsections.map((item) => (
              <OverviewItem
                key={item.label}
                label={item.label}
                body={item.body}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function OverviewItem({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </h3>
      <p className="mt-3 font-body text-sm leading-relaxed text-zinc-600">
        {body}
      </p>
    </div>
  );
}

function PhaseStat({
  label,
  highlight,
  loading,
}: {
  label: string;
  highlight: PhaseStats["tempHigh"];
  loading: boolean;
}) {
  return (
    <div>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </h3>
      {loading ? (
        <p className="mt-3 font-display text-3xl font-semibold tabular-nums text-zinc-300">
          —
        </p>
      ) : highlight ? (
        <>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums tracking-tight text-zinc-900">
            {highlight.valueC.toFixed(1)}
            <span className="ml-1 text-lg font-medium text-zinc-500">°C</span>
          </p>
          <p className="mt-2 font-body text-sm text-zinc-600">
            at{" "}
            <span className="font-semibold text-zinc-800">{highlight.node}</span>
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums text-zinc-300">
            —
          </p>
          <p className="mt-2 font-body text-sm text-zinc-400">No data</p>
        </>
      )}
    </div>
  );
}
