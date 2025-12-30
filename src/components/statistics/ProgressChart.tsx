import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import type { Discipline } from "../../types";
import type { ChartDataPoint } from "../../stores/useResultStore";
import { formatTime, formatDistance } from "../../lib/formatters";

interface ProgressChartProps {
  data: ChartDataPoint[];
  discipline: Discipline;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
  discipline: Discipline;
}

function CustomTooltip({ active, payload, discipline }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const dataPoint = payload[0].payload;
  const isCombinedEvent = discipline.category === "combined";

  const formattedValue = isCombinedEvent
    ? `${Math.round(dataPoint.value)} p`
    : discipline.unit === "time"
      ? formatTime(dataPoint.value)
      : formatDistance(dataPoint.value);
  const formattedDate = format(new Date(dataPoint.date), "d. MMMM yyyy", {
    locale: fi,
  });

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-body text-muted-foreground">{formattedDate}</p>
      <p className="text-title font-bold">{formattedValue}</p>
      {(dataPoint.isPersonalBest || dataPoint.isSeasonBest || dataPoint.isNationalRecord) && (
        <div className="flex gap-1 mt-1">
          {dataPoint.isPersonalBest && <span className="badge-pb">OE</span>}
          {dataPoint.isSeasonBest && <span className="badge-sb">KE</span>}
          {dataPoint.isNationalRecord && <span className="badge-nr">SE</span>}
        </div>
      )}
    </div>
  );
}

export function ProgressChart({ data, discipline }: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-card rounded-xl border border-border">
        <p className="text-muted-foreground">Ei tuloksia näytettäväksi</p>
      </div>
    );
  }

  // Find personal best point for highlighting
  const pbPoint = data.find((d) => d.isPersonalBest);

  // Format dates for X axis - add unique index to handle same-day results
  const chartData = data.map((d, index) => ({
    ...d,
    index, // Unique identifier for each point
    formattedDate: format(new Date(d.date), "d.M.yy"),
  }));

  // Check if this is a combined event (moniottelu)
  const isCombinedEvent = discipline.category === "combined";

  // Format value for Y axis ticks
  const formatYAxis = (value: number) => {
    if (discipline.unit === "time") {
      return formatTime(value);
    }
    if (isCombinedEvent) {
      // Combined events: show points without decimals
      return Math.round(value).toString();
    }
    // Show meters without "m" suffix for cleaner axis
    return value.toFixed(2);
  };

  return (
    <div className="bg-card rounded-xl border border-border-subtle p-4">
      <h3 className="text-body font-medium text-foreground mb-4">Tuloskehitys</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis
              dataKey="index"
              tick={{ fill: "var(--text-muted)", fontSize: 11, dy: 10 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border-subtle)" }}
              tickFormatter={(index) => chartData[index]?.formattedDate || ""}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border-subtle)" }}
              domain={["auto", "auto"]}
              reversed={discipline.lowerIsBetter}
              tickFormatter={formatYAxis}
            />
            <Tooltip
              content={<CustomTooltip discipline={discipline} />}
              cursor={{ stroke: "var(--accent)", strokeWidth: 1 }}
            />
            {pbPoint && (
              <ReferenceLine
                y={pbPoint.value}
                stroke="var(--accent)"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.isPersonalBest) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="var(--accent)"
                      stroke="var(--bg-card)"
                      strokeWidth={2}
                    />
                  );
                }
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="var(--accent)"
                  />
                );
              }}
              activeDot={{ r: 6, fill: "var(--accent)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
