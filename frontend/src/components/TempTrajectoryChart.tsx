import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ReferenceArea,
} from "recharts";
import type { Reading } from "../data/mockData";
import type { TempUnit } from "../config/tempUnit";
import { tempUnitSymbol } from "../config/tempUnit";
import {
  chartDomainTicks,
  readingTemp,
  readingWbgt,
  skippedTimeRanges,
} from "../services/transform";

interface Props {
  room: Reading[];
  outdoor: Reading[];
  /** Chart legend name for the outdoor series. */
  outdoorLabel?: string;
  kestrel?: Reading[];
  unit: TempUnit;
  /** Fixed floor-wide domain so switching nodes does not rescale the Y-axis. */
  yDomain?: [number, number];
}

type Row = {
  time: string;
  room?: number;
  outdoor?: number;
  kestrel?: number;
  wbgt?: number;
};

const OMITTED_FILL = "#a8a29e";
const OMITTED_OPACITY = 0.35;

function buildSeries(props: Props) {
  const byTime = new Map<string, Row>();
  const upsert = (list: Reading[], key: "room" | "outdoor" | "kestrel") => {
    for (const r of list) {
      const row = byTime.get(r.timestamp) ?? { time: r.timestamp };
      row[key] = readingTemp(r, props.unit);
      byTime.set(r.timestamp, row);
    }
  };
  upsert(props.room, "room");
  upsert(props.outdoor, "outdoor");
  if (props.kestrel) {
    for (const r of props.kestrel) {
      const row = byTime.get(r.timestamp) ?? { time: r.timestamp };
      row.kestrel = readingTemp(r, props.unit);
      const wbgt = readingWbgt(r, props.unit);
      if (wbgt !== undefined) row.wbgt = wbgt;
      byTime.set(r.timestamp, row);
    }
  }
  return Array.from(byTime.values()).sort((a, b) =>
    a.time < b.time ? -1 : 1,
  );
}

function formatTick(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

/** X ticks (and vertical grid lines) at local 20:00 for each day in the series. */
function xTicksAt2000(data: Row[]): string[] {
  const ticks: string[] = [];
  for (const row of data) {
    const d = new Date(row.time);
    if (d.getHours() === 20 && d.getMinutes() === 0) {
      ticks.push(row.time);
    }
  }
  return ticks;
}

function ChartLegend({
  payload,
}: {
  payload?: ReadonlyArray<{ value?: string; color?: string; type?: string }>;
}) {
  const items = [...(payload ?? [])];
  if (!items.some((entry) => entry.value === "Omitted Values")) {
    items.push({
      value: "Omitted Values",
      color: OMITTED_FILL,
      type: "square",
    });
  }
  return (
    <ul
      className="recharts-default-legend"
      style={{
        padding: 0,
        margin: 0,
        textAlign: "center",
        // One legend row — keeps plot height stable across rooms.
        minHeight: 18,
        lineHeight: "18px",
      }}
    >
      {items.map((entry) => (
        <li
          key={String(entry.value)}
          className="recharts-legend-item"
          style={{
            display: "inline-block",
            marginRight: 10,
            fontSize: 11,
            color: "#525252",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            style={{
              display: "inline-block",
              verticalAlign: "middle",
              marginRight: 4,
            }}
            aria-hidden
          >
            {entry.type === "square" || entry.value === "Omitted Values" ? (
              <rect
                x="1"
                y="1"
                width="12"
                height="12"
                fill={entry.color}
                fillOpacity={
                  entry.value === "Omitted Values" ? OMITTED_OPACITY + 0.25 : 1
                }
                stroke={entry.color}
                strokeOpacity={0.7}
              />
            ) : (
              <line
                x1="0"
                y1="7"
                x2="14"
                y2="7"
                stroke={entry.color}
                strokeWidth="2"
              />
            )}
          </svg>
          <span className="recharts-legend-item-text">{entry.value}</span>
        </li>
      ))}
    </ul>
  );
}

const LINE_ANIMATION_MS = 450;

export default function TempTrajectoryChart(props: Props) {
  const data = buildSeries(props);
  const omittedRanges = skippedTimeRanges(props.room);
  const hasOutdoor = props.outdoor.length > 0;
  const hasKestrel = (props.kestrel?.length ?? 0) > 0;
  const hasWbgt = hasKestrel && props.kestrel!.some((r) => r.wbgtF !== undefined);
  const symbol = tempUnitSymbol(props.unit);
  const yTicks = props.yDomain ? chartDomainTicks(props.yDomain) : undefined;
  const xTicks = xTicksAt2000(data);

  // Always mount every Line (toggle via `hide`) and give each a stable React
  // key. Conditional series / a changing ReferenceArea count otherwise remounts
  // lines and triggers Recharts' full redraw instead of a path morph.
  return (
    <div className="h-full min-h-[14rem] w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 0, right: 16, left: -10, bottom: 28 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            ticks={xTicks}
            tickFormatter={formatTick}
            tick={{ fontSize: 10, fill: "#525252" }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#525252" }}
            unit={symbol}
            domain={props.yDomain ?? ["dataMin - 1", "dataMax + 1"]}
            ticks={yTicks}
            tickFormatter={(v) => Number(v).toFixed(1)}
          />
          <Tooltip
            labelFormatter={(v) => new Date(v as string).toLocaleString()}
            formatter={(v: number, name: string) => [`${v.toFixed(1)} ${symbol}`, name]}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            content={(legendProps) => (
              <ChartLegend payload={legendProps.payload} />
            )}
          />
          <Line
            key="room"
            type="monotone"
            dataKey="room"
            stroke="#dc2626"
            strokeWidth={2}
            dot={false}
            name="HOBO"
            isAnimationActive
            animationDuration={LINE_ANIMATION_MS}
            animationEasing="ease-in-out"
          />
          <Line
            key="outdoor"
            type="monotone"
            dataKey="outdoor"
            stroke="#65a30d"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            name={props.outdoorLabel ?? "Outdoor (avg)"}
            hide={!hasOutdoor}
            isAnimationActive
            animationDuration={LINE_ANIMATION_MS}
            animationEasing="ease-in-out"
          />
          <Line
            key="kestrel"
            type="monotone"
            dataKey="kestrel"
            stroke="#d97706"
            strokeWidth={1.5}
            dot={false}
            name="Kestrel"
            hide={!hasKestrel}
            isAnimationActive
            animationDuration={LINE_ANIMATION_MS}
            animationEasing="ease-in-out"
          />
          <Line
            key="wbgt"
            type="monotone"
            dataKey="wbgt"
            stroke="#7c3aed"
            strokeWidth={1.5}
            strokeDasharray="2 3"
            dot={false}
            name="WBGT (Kestrel)"
            hide={!hasWbgt}
            isAnimationActive
            animationDuration={LINE_ANIMATION_MS}
            animationEasing="ease-in-out"
          />
          {omittedRanges.map((range) => (
            <ReferenceArea
              key={`${range.start}-${range.end}`}
              x1={range.start}
              x2={range.end}
              fill={OMITTED_FILL}
              fillOpacity={OMITTED_OPACITY}
              ifOverflow="visible"
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
