import { useRef, useState, useEffect } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";

import { FLOORS, type FloorNumber } from "../config/floors";
import {
  DEFAULT_HEAT_METRIC,
  heatValue,
  type HeatMetric,
} from "../config/heatMetrics";
import { DEFAULT_PHASE, phaseManifest, phasePrimaryDevice } from "../config/phases";
import { parseTempUnit } from "../config/tempUnit";
import { loadPhaseData } from "../services/data";
import {
  transformReadings,
  computeFloorStats,
  computeFloorChartDomain,
  roomsOnFloor,
  type TransformedData,
} from "../services/transform";

import SidePanel from "../components/SidePanel";
import RoomNode from "../components/RoomNode";
import RoomPopup from "../components/RoomPopup";
import { colorScaleDomain } from "../lib/colorScale";
import { useElementSize, computeFitBox } from "../lib/useElementSize";

// Native pixel dimensions of the rendered floor plan PNGs.
const PLAN_W = 2448;
const PLAN_H = 1584;
const PLAN_RATIO = PLAN_W / PLAN_H;

const PLAN_STREET_LABEL =
  "whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-700 opacity-60";

// Nudge labels: % inset from the top/bottom edge of the floor plan image.
// (Tailwind spacing skips 17–19 — pb-17 etc. are invalid and get ignored.)
const PLAN_LABEL_INSET = { top: "4.5%", bottom: "11.5%" };

const PLAN_STREET_LABEL_POS = {
  position: "absolute" as const,
  left: "50%",
  transform: "translateX(-50%)",
};

function parseFloor(raw: string | undefined): FloorNumber | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n)) return null;
  if (!FLOORS.some((f) => f.floor === n)) return null;
  return n as FloorNumber;
}

export default function FloorView() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const phase = searchParams.get("phase") ?? DEFAULT_PHASE;
  const unit = parseTempUnit(searchParams.get("unit"));
  const manifestUrl = phaseManifest(phase);
  const floor = parseFloor(params.floor);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [heatMetric, setHeatMetric] = useState<HeatMetric>(DEFAULT_HEAT_METRIC);
  const [data, setData] = useState<TransformedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageSize = useElementSize(stageRef);
  const fit = computeFitBox(stageSize.width, stageSize.height, PLAN_RATIO);

  useEffect(() => {
    setSelectedRoom(null);
    setData(null);
    setError(null);
    loadPhaseData(manifestUrl)
      .then(({ readings, metadata }) =>
        setData(
          transformReadings(readings, metadata, {
            primaryDevice: phasePrimaryDevice(phase),
          }),
        ),
      )
      .catch((err) => setError(String(err)));
  }, [manifestUrl, phase]);

  useEffect(() => {
    setSelectedRoom(null);
  }, [floor]);

  if (floor === null) {
    return <Navigate to="/" replace />;
  }

  const meta = FLOORS.find((f) => f.floor === floor)!;
  const roomData = data?.roomData ?? {};
  const floorRooms = roomsOnFloor(roomData, floor);
  const selectedData = selectedRoom !== null ? roomData[selectedRoom] ?? null : null;
  const outdoorReadings = data?.outdoorReadings ?? [];
  const outdoorLabel = data?.outdoorLabel ?? "Outdoor (avg)";
  const kestrelRoomData = data?.kestrelRoomData ?? {};
  const stats = data
    ? computeFloorStats(data.roomData, floor)
    : {
        avgPeakDaytimeC: null,
        avgPeakDaytimeF: null,
        avgNighttimeC: null,
        avgNighttimeF: null,
        avgHumidity: null,
        lastUpdated: null,
      };

  // Shared popup chart Y-axis for every node on this floor.
  const chartYDomain = data
    ? computeFloorChartDomain(data.roomData, floor, unit, {
        outdoor: outdoorReadings,
        kestrelByRoom: kestrelRoomData,
      })
    : null;

  // Per-floor min/max for node colour scale (only rooms present in this phase).
  const floorTemps = floorRooms.map((d) => heatValue(d, heatMetric, unit));
  const rawMin = floorTemps.length > 0 ? Math.min(...floorTemps) : unit === "f" ? 72 : 22;
  const rawMax = floorTemps.length > 0 ? Math.max(...floorTemps) : unit === "f" ? 86 : 30;
  const colorOpts = colorScaleDomain(rawMin, rawMax, unit);

  return (
    <div className="flex h-screen w-screen bg-neutral-900 text-white">
      <SidePanel
        floor={floor}
        stats={stats}
        unit={unit}
        heatMetric={heatMetric}
        onHeatMetricChange={setHeatMetric}
        colorOpts={colorOpts}
      />

      <main className="relative flex-1 overflow-hidden bg-neutral-100">
        {data && floorRooms.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <p className="rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow">
              No sensors deployed on floor {floor} during this phase.
            </p>
          </div>
        )}

        {/* Stage = available space (inset for breathing room). We measure
            this box, then place the plan + nodes in a child whose size is
            exactly the contain-rect of the floor plan PNG. */}
        <div ref={stageRef} className="absolute inset-4">
          {error && (
            <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded bg-red-100 px-3 py-2 text-sm text-red-700 shadow">
              Failed to load sensor data: {error}
            </div>
          )}
          {!data && !error && (
            <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded bg-white/90 px-3 py-2 text-sm text-neutral-500 shadow">
              Loading…
            </div>
          )}

          {fit.width > 0 && (
            <div
              className="absolute"
              style={{
                left: fit.left,
                top: fit.top,
                width: fit.width,
                height: fit.height,
              }}
            >
              <img
                src={meta.png}
                alt={`Floor ${floor} plan`}
                className="block h-full w-full select-none"
                draggable={false}
              />

              {/* Street labels — % inset from plan edges; edit PLAN_LABEL_INSET above. */}
              <div className="pointer-events-none absolute inset-0 z-20">
                <p
                  className={PLAN_STREET_LABEL}
                  style={{ ...PLAN_STREET_LABEL_POS, top: PLAN_LABEL_INSET.top }}
                >
                  Amherst Street
                </p>
                <p
                  className={PLAN_STREET_LABEL}
                  style={{
                    ...PLAN_STREET_LABEL_POS,
                    bottom: PLAN_LABEL_INSET.bottom,
                  }}
                >
                  Memorial Drive
                </p>
              </div>

              {/* Node layer — coords from phase JSON node_x / node_y. */}
              <div className="absolute inset-0">
                {floorRooms.map((d) => {
                  const temp = heatValue(d, heatMetric, unit);
                  return (
                    <RoomNode
                      key={d.meta.room}
                      meta={d.meta}
                      temp={temp}
                      unit={unit}
                      colorOpts={colorOpts}
                      active={selectedRoom === d.meta.room}
                      onClick={() => setSelectedRoom(d.meta.room)}
                    />
                  );
                })}
              </div>

              {/* Popup overlays the East tower (right half of the plan) */}
              {selectedData && (
                <RoomPopup
                  data={selectedData}
                  outdoorReadings={
                    selectedData.meta.role === "outdoor_courtyard"
                      ? []
                      : outdoorReadings
                  }
                  outdoorLabel={outdoorLabel}
                  kestrelReadings={
                    selectedRoom !== null
                      ? kestrelRoomData[selectedRoom]
                      : undefined
                  }
                  unit={unit}
                  yDomain={chartYDomain ?? undefined}
                  onClose={() => setSelectedRoom(null)}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
