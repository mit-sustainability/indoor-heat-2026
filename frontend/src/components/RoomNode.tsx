import type { RoomMeta } from "../config/rooms";
import { tempToColor, type ColorScaleOptions } from "../lib/colorScale";

interface Props {
  meta: RoomMeta;
  avgTempC: number;
  colorOpts: ColorScaleOptions;
  onClick: () => void;
  active: boolean;
}

export default function RoomNode({ meta, avgTempC, colorOpts, onClick, active }: Props) {
  const color = tempToColor(avgTempC, colorOpts);
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute group"
      style={{
        left: `${meta.xNorm * 100}%`,
        top: `${meta.yNorm * 100}%`,
        transform: "translateX(-50%) translateY(calc(-100% - 8px))",
      }}
      aria-label={`Room ${meta.room}`}
    >
      {/* Pulsing halo */}
      <span
        className="absolute inset-0 m-auto h-6 w-6 rounded-full opacity-60 animate-ping"
        style={{ background: color }}
      />
      {/* Solid dot */}
      <span
        className={`relative block rounded-full ring-2 ring-white/90 shadow-lg transition-all ${
          active ? "h-7 w-7 ring-4" : "h-5 w-5 group-hover:h-6 group-hover:w-6"
        }`}
        style={{ background: color }}
      />
      {/* Room number tooltip */}
      <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-900/90 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow group-hover:opacity-100 transition">
        {meta.room} · {avgTempC.toFixed(1)}°C
      </span>
    </button>
  );
}
