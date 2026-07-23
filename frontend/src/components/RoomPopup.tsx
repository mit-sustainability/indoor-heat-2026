import type { RoomData } from "../data/mockData";
import type { Reading } from "../data/mockData";
import type { TempUnit } from "../config/tempUnit";
import { tempUnitSymbol } from "../config/tempUnit";
import { roomLabel } from "../config/rooms";
import TempTrajectoryChart from "./TempTrajectoryChart";

interface Props {
  data: RoomData;
  outdoorReadings: Reading[];
  outdoorLabel?: string;
  kestrelReadings?: Reading[];
  unit: TempUnit;
  yDomain?: [number, number];
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
  outdoorReadings,
  outdoorLabel,
  kestrelReadings,
  unit,
  yDomain,
  onClose,
}: Props) {
  const m = data.meta;
  const isCourtyard = m.role === "outdoor_courtyard";
  const symbol = tempUnitSymbol(unit);
  const peak =
    unit === "f" ? data.peakDaytimeF : data.peakDaytimeC;
  const avgNight =
    unit === "f" ? data.avgNighttimeF : data.avgNighttimeC;

  return (
    <div
      className={
        isCourtyard
          ? "pointer-events-none absolute inset-y-3 left-[40%] right-3 z-20 flex max-w-4xl"
          : "pointer-events-none absolute inset-y-3 right-3 z-20 flex w-[62%] max-w-4xl"
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

        <header className="flex shrink-0 items-start justify-between gap-6 border-b border-neutral-200 bg-neutral-50 px-6 py-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {m.role === "outdoor_courtyard"
                ? "Outdoor sensor"
                : m.room === "hallway"
                  ? "Indoor sensor"
                  : "Room"}
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">
              {roomLabel(m)}
            </h2>
            <p className="text-sm text-neutral-600">
              {m.role === "outdoor_courtyard"
                ? "Outdoor courtyard reference"
                : m.orientation}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 pr-10 text-right">
            <Stat label="Peak daytime" value={`${peak.toFixed(1)} ${symbol}`} />
            <Stat label="Avg nighttime" value={`${avgNight.toFixed(1)} ${symbol}`} />
            <Stat label="Avg humidity" value={`${data.avgHumidity.toFixed(0)} %`} />
          </div>
        </header>

        {/* No scroll: fixed intervention band + chart fills the rest. */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-6 py-4">
          <section className="shrink-0">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Interventions
            </h3>
            {/* Fixed grid height keeps the plot at the same Y for every node. */}
            <div className="grid h-32 grid-cols-3 gap-3">
              {data.interventions.length === 0 ? (
                <div className="col-span-3 flex items-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4">
                  <p className="text-sm italic text-neutral-500">
                    {m.role === "outdoor_courtyard"
                      ? "None — outdoor reference sensor."
                      : "None — no window, blinds, or fan protocol for this sensor."}
                  </p>
                </div>
              ) : (
                data.interventions.map((it) => (
                  <div
                    key={it.category}
                    className="relative flex h-full flex-col rounded-lg border border-neutral-200 bg-white p-3 shadow-sm"
                  >
                    {it.badge ? (
                      <span
                        className="absolute right-2.5 top-2.5 text-sm leading-none"
                        title="Blinds shade"
                        aria-label="Blinds shade"
                      >
                        {it.badge}
                      </span>
                    ) : null}
                    <div className="pr-8 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      {it.categoryLabel}
                    </div>
                    <div className="mt-1 text-sm font-semibold">{it.label}</div>
                    <div className="mt-1 flex-1 text-xs leading-snug text-neutral-600">
                      {it.description}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col">
            <div className="mb-2 flex shrink-0 items-baseline justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Latest temperature trajectory
              </h3>
              <span className="text-[11px] text-neutral-500">
                Last collected {formatTimestamp(data.lastCollected)}
              </span>
            </div>
            <div className="min-h-0 flex-1">
              <TempTrajectoryChart
                room={data.readings}
                outdoor={outdoorReadings}
                outdoorLabel={outdoorLabel}
                kestrel={kestrelReadings}
                unit={unit}
                yDomain={yDomain}
              />
            </div>
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
