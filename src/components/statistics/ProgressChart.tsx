import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
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

  const formattedValue =
    discipline.unit === "time"
      ? formatTime(dataPoint.value)
      : formatDistance(dataPoint.value);
  const formattedDate = format(new Date(dataPoint.date), "d. MMMM yyyy", {
    locale: fi,
  });

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm text-muted-foreground">{formattedDate}</p>
      <p className="text-lg font-bold">{formattedValue}</p>
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

  // Calculate Y axis domain with padding
  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const padding = range * 0.1 || maxValue * 0.1;

  // For time events (lower is better), we want to invert the axis
  // so that better results appear higher on the chart
  const yDomain: [number, number] = discipline.lowerIsBetter
    ? [maxValue + padding, minValue - padding]
    : [minValue - padding, maxValue + padding];

  // Format value for Y axis ticks
  const formatYAxis = (value: number) => {
    if (discipline.unit === "time") {
      return formatTime(value);
    }
    // Show meters without "m" suffix for cleaner axis
    return value.toFixed(2);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="text-sm font-medium text-foreground mb-4">Kehitys</h3>
      <div className="h-96">
          <LineChart
            data={chartData}
            width={800}
            height={384}
            margin={{ top: 10, right: 30, left: 20, bottom: 25 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              opacity={0.5}
            />
            <XAxis
              dataKey="index"
              stroke="var(--color-muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              padding={{ left: 20, right: 20 }}
              dy={10}
              tickFormatter={(index) => chartData[index]?.formattedDate || ""}
            />
            <YAxis
              domain={yDomain}
              tickCount={5}
              tickFormatter={formatYAxis}
              stroke="var(--color-muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              content={<CustomTooltip discipline={discipline} />}
              cursor={{ stroke: "var(--accent)", strokeWidth: 1 }}
            />
            <Line
              type="linear"
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{
                fill: "var(--accent)",
                strokeWidth: 0,
                r: 4,
              }}
              activeDot={{
                fill: "var(--accent)",
                strokeWidth: 0,
                r: 6,
              }}
              label={({ x, y, value }) => (
                <text
                  x={x}
                  y={typeof y === "number" ? y - 10 : 0}
                  fill="var(--foreground)"
                  textAnchor="middle"
                  fontSize={10}
                >
                  {typeof value === "number" ? value.toFixed(2) : ""}
                </text>
              )}
            />
            {/* Highlight personal best with larger accent-colored dot */}
            {pbPoint && (
              <ReferenceDot
                x={chartData.findIndex((d) => d.isPersonalBest)}
                y={pbPoint.value}
                r={8}
                fill="var(--accent)"
                stroke="var(--bg-card)"
                strokeWidth={2}
              />
            )}
          </LineChart>
      </div>
    </div>
  );
}
