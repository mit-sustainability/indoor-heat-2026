import { useRef } from "react";
import { Link } from "react-router-dom";
import { FLOORS } from "../config/floors";
import { coverPointToPercent, useElementSize } from "../lib/useElementSize";

const ELEVATION_RATIO = 6048 / 4320;
// Normalized point on elevation.png: centered below the ground line.
const ELEVATION_CAPTION = { x: 0.5, y: 0.825 };

export default function Landing() {
  const stageRef = useRef<HTMLDivElement>(null);
  const stageSize = useElementSize(stageRef);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-white text-on-surface">
      <div ref={stageRef} className="absolute inset-0">
        <img
          src="/elevation.png"
          alt="Stanley McCormick Hall elevation"
          className="absolute inset-0 h-full w-full select-none object-cover object-center"
          draggable={false}
        />

        <nav className="absolute inset-0 z-10">
          {stageSize.width > 0 &&
            FLOORS.map((f) => {
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
                  to={`/floor/${f.floor}`}
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
          const captionPos = coverPointToPercent(
            stageSize.width,
            stageSize.height,
            ELEVATION_RATIO,
            ELEVATION_CAPTION.x,
            ELEVATION_CAPTION.y,
          );
          return (
            <p
              className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-700 opacity-60"
              style={{
                left: `${captionPos.left}%`,
                top: `${captionPos.top}%`,
              }}
            >
              North Elevation of McCormick Hall - Front view from Amherst Street
            </p>
          );
        })()}
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

      <aside className="glass-panel-info absolute top-20 left-6 z-20 hidden max-w-[230px] rounded-lg p-5 md:block md:left-10">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-900">
          About the Project
        </h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-zinc-600">
          Brief overview of the Indoor Heat Project mission, monitoring goals,
          and building context will appear here. Mention of MITOS goals and intersection of operations and research. Info on the key stakeholders will also go here. The timeline, building history/timeline overview, etc.
        </p>
      </aside>

      <footer className="absolute bottom-0 left-0 right-0 z-20 flex justify-center px-4 pb-5 opacity-70">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-900">
          Click a floor to explore sensor readings
        </p>
      </footer>
    </div>
  );
}
