import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { Reading } from "../data/mockData";

interface Props {
  room: Reading[];
  control: Reading[] | null;
  outdoor: Reading[];
  kestrel?: Reading[];
}

type Row = { time: string; room?: number; control?: number; outdoor?: number; kestrel?: number; wbgt?: number };

function buildSeries(props: Props) {
  const byTime = new Map<string, Row>();
  const upsert = (list: Reading[], key: "room" | "control" | "outdoor" | "kestrel") => {
    for (const r of list) {
      const row = byTime.get(r.timestamp) ?? { time: r.timestamp };
      row[key] = r.temperatureC;
      byTime.set(r.timestamp, row);
    }
  };
  upsert(props.room, "room");
  if (props.control) upsert(props.control, "control");
  upsert(props.outdoor, "outdoor");
  if (props.kestrel) {
    for (const r of props.kestrel) {
      const row = byTime.get(r.timestamp) ?? { time: r.timestamp };
      row.kestrel = r.temperatureC;
      if (r.wbgtF !== undefined) row.wbgt = (r.wbgtF - 32) * 5 / 9;
      byTime.set(r.timestamp, row);
    }
  }
  return Array.from(byTime.values()).sort((a, b) =>
    a.time < b.time ? -1 : 1,
  );
}

function formatTick(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}h`;
}

export default function TempTrajectoryChart(props: Props) {
  const data = buildSeries(props);
  const hasKestrel = (props.kestrel?.length ?? 0) > 0;
  const hasWbgt = hasKestrel && props.kestrel!.some(r => r.wbgtF !== undefined);
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tickFormatter={formatTick}
            tick={{ fontSize: 10, fill: "#525252" }}
            minTickGap={40}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#525252" }}
            unit="°C"
            domain={["dataMin - 1", "dataMax + 1"]}
          />
          <Tooltip
            labelFormatter={(v) => new Date(v as string).toLocaleString()}
            formatter={(v: number, name: string) => [`${v.toFixed(1)} °C`, name]}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="room"
            stroke="#dc2626"
            strokeWidth={2}
            dot={false}
            name="HOBO"
          />
          {props.control && (
            <Line
              type="monotone"
              dataKey="control"
              stroke="#2563eb"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              name="Indoor control"
            />
          )}
          {props.outdoor.length > 0 && (
            <Line
              type="monotone"
              dataKey="outdoor"
              stroke="#65a30d"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              name="Outdoor (avg)"
            />
          )}
          {hasKestrel && (
            <Line
              type="monotone"
              dataKey="kestrel"
              stroke="#d97706"
              strokeWidth={1.5}
              dot={false}
              name="Kestrel"
            />
          )}
          {hasWbgt && (
            <Line
              type="monotone"
              dataKey="wbgt"
              stroke="#7c3aed"
              strokeWidth={1.5}
              strokeDasharray="2 3"
              dot={false}
              name="WBGT (Kestrel)"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
