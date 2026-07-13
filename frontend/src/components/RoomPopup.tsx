import type { RoomData } from "../data/mockData";
import type { Reading } from "../data/mockData";
import TempTrajectoryChart from "./TempTrajectoryChart";

interface Props {
  data: RoomData;
  controlReadings: Reading[] | null;
  outdoorReadings: Reading[];
  onClose: () => void;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RoomPopup({
  data,
  controlReadings,
  outdoorReadings,
  onClose,
}: Props) {
  const m = data.meta;
  const isCourtyard = m.role === "outdoor_courtyard";

  return (
    <div
      className={
        isCourtyard
          ? "pointer-events-none absolute inset-y-6 left-[44%] right-6 z-20 flex max-w-3xl"
          : "pointer-events-none absolute inset-y-6 right-6 z-20 flex w-[58%] max-w-3xl"
      }
    >
      <div className="pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl ring-1 ring-black/10">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-neutral-100 p-1.5 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <header className="flex items-start justify-between gap-6 border-b border-neutral-200 bg-neutral-50 px-6 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {m.role === "outdoor_courtyard" ? "Outdoor sensor" : "Room"}
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">
              {m.role === "outdoor_courtyard" ? "Courtyard" : m.room}
            </h2>
            <p className="text-sm text-neutral-600">
              {m.role === "outdoor_courtyard"
                ? "Outdoor courtyard reference"
                : m.orientation}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 pr-10 text-right">
            <Stat label="Avg daytime" value={`${data.avgDaytimeC.toFixed(1)} °C`} />
            <Stat label="Avg nighttime" value={`${data.avgNighttimeC.toFixed(1)} °C`} />
            <Stat label="Avg humidity" value={`${data.avgHumidity.toFixed(0)} %`} />
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Interventions
            </h3>
            {data.interventions.length === 0 ? (
              <p className="text-sm italic text-neutral-500">
                {m.role === "outdoor_courtyard"
                  ? "None — outdoor reference sensor."
                  : "None — this room is part of the unintervened control set."}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {data.interventions.map((it) => (
                  <div
                    key={it.label}
                    className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm"
                  >
                    <div className="text-2xl">{it.emoji}</div>
                    <div className="mt-1 text-sm font-semibold">{it.label}</div>
                    <div className="text-xs leading-snug text-neutral-600">
                      {it.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Latest temperature trajectory
              </h3>
              <span className="text-[11px] text-neutral-500">
                Last collected {formatTimestamp(data.lastCollected)}
              </span>
            </div>
            <TempTrajectoryChart
              room={data.readings}
              control={controlReadings}
              outdoor={outdoorReadings}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
