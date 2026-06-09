import { useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";

import { FLOORS, type FloorNumber } from "../config/floors";
import { roomsForFloor } from "../config/rooms";
import {
  ROOM_DATA,
  CONTROL_ROOMS,
  CONTROL_READINGS,
  COURTYARD_READINGS,
} from "../data/mockData";

import SidePanel from "../components/SidePanel";
import RoomNode from "../components/RoomNode";
import RoomPopup from "../components/RoomPopup";
import { useElementSize, computeFitBox } from "../lib/useElementSize";

// Native pixel dimensions of the rendered floor plan PNGs.
const PLAN_W = 2448;
const PLAN_H = 1584;
const PLAN_RATIO = PLAN_W / PLAN_H;

function parseFloor(raw: string | undefined): FloorNumber | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n)) return null;
  if (n < 1 || n > 7) return null;
  return n as FloorNumber;
}

export default function FloorView() {
  const params = useParams();
  const floor = parseFloor(params.floor);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageSize = useElementSize(stageRef);
  const fit = computeFitBox(stageSize.width, stageSize.height, PLAN_RATIO);

  if (floor === null) {
    return <Navigate to="/" replace />;
  }

  const meta = FLOORS.find((f) => f.floor === floor)!;
  const rooms = roomsForFloor(floor);
  const selectedData = selectedRoom !== null ? ROOM_DATA[selectedRoom] : null;
  const controlRoom = CONTROL_ROOMS[floor];
  const controlReadings = CONTROL_READINGS[floor];

  // Per-floor min/max: hottest → red, coolest → blue, mid → purple.
  // Single-room floors get a ±1 °C buffer so the node isn't solid blue.
  const floorAvgTemps = rooms.map((r) => {
    const d = ROOM_DATA[r.room];
    return (d.avgDaytimeC + d.avgNighttimeC) / 2;
  });
  const rawMin = floorAvgTemps.length > 0 ? Math.min(...floorAvgTemps) : 22;
  const rawMax = floorAvgTemps.length > 0 ? Math.max(...floorAvgTemps) : 30;
  const spread = rawMax - rawMin;
  const colorOpts = {
    minC: spread < 0.5 ? rawMin - 1 : rawMin,
    maxC: spread < 0.5 ? rawMax + 1 : rawMax,
  };

  return (
    <div className="flex h-screen w-screen bg-neutral-900 text-white">
      <SidePanel floor={floor} />

      <main className="relative flex-1 overflow-hidden bg-neutral-100">
        {/* Stage = available space (inset for breathing room). We measure
            this box, then place the plan + nodes in a child whose size is
            exactly the contain-rect of the floor plan PNG. */}
        <div ref={stageRef} className="absolute inset-4">
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

              {/* Node layer — coords are normalized to this box, which is the
                  exact rendered plan rect. */}
              <div className="absolute inset-0">
                {rooms.length === 0 && (
                  <div className="absolute left-1/2 top-8 -translate-x-1/2 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow">
                    No sensors deployed on floor {floor} yet.
                  </div>
                )}
                {rooms.map((r) => {
                  const data = ROOM_DATA[r.room];
                  const avgTemp =
                    (data.avgDaytimeC + data.avgNighttimeC) / 2;
                  return (
                    <RoomNode
                      key={r.room}
                      meta={r}
                      avgTempC={avgTemp}
                      colorOpts={colorOpts}
                      active={selectedRoom === r.room}
                      onClick={() => setSelectedRoom(r.room)}
                    />
                  );
                })}
              </div>

              {/* Popup overlays the East tower (right half of the plan) */}
              {selectedData && (
                <RoomPopup
                  data={selectedData}
                  controlReadings={
                    controlRoom !== null && controlRoom !== selectedRoom
                      ? controlReadings
                      : null
                  }
                  courtyardReadings={COURTYARD_READINGS}
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
