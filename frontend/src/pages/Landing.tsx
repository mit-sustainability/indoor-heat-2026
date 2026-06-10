import { Link } from "react-router-dom";
import { FLOORS } from "../config/floors";

export default function Landing() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <img
        src="/sky_mccorm.jpg"
        alt="Stanley McCormick Hall"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Subtle vignette so buttons pop */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/30" />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white drop-shadow">
          Internal Heat Project
        </h1>
        <p className="text-sm text-white/80 drop-shadow">
          MITOS · Stanley McCormick Hall · West Tower
        </p>
      </header>

      {/* Floor buttons over the right tower */}
      <nav className="absolute inset-0 z-10">
        {FLOORS.map((f) => (
          <Link
            key={f.floor}
            to={`/floor/${f.floor}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{
              left: `${f.buttonX * 100}%`,
              top: `${f.buttonY * 100}%`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="hidden group-hover:inline-block h-px w-8 bg-white/80" />
              <button
                type="button"
                className="rounded-md bg-white/95 px-5 py-2 text-sm font-semibold text-neutral-900 shadow-lg ring-1 ring-black/10 transition hover:bg-white hover:scale-105 hover:shadow-xl"
              >
                Floor {f.floor}
              </button>
            </div>
          </Link>
        ))}
      </nav>

      {/* Footer credit */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 p-4 text-center text-xs text-white/50">
        Click a floor to explore sensor readings
      </footer>
    </div>
  );
}
