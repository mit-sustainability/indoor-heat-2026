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
  courtyard: Reading[];
}

// Recharts wants flat rows keyed by timestamp.
function buildSeries(props: Props) {
  const byTime = new Map<
    string,
    { time: string; room?: number; control?: number; courtyard?: number }
  >();
  const upsert = (
    list: Reading[],
    key: "room" | "control" | "courtyard",
  ) => {
    for (const r of list) {
      const row = byTime.get(r.timestamp) ?? { time: r.timestamp };
      row[key] = r.temperatureC;
      byTime.set(r.timestamp, row);
    }
  };
  upsert(props.room, "room");
  if (props.control) upsert(props.control, "control");
  upsert(props.courtyard, "courtyard");
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
            name="This room"
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
          <Line
            type="monotone"
            dataKey="courtyard"
            stroke="#65a30d"
            strokeWidth={1.5}
            strokeDasharray="2 3"
            dot={false}
            name="Courtyard (outdoor)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
