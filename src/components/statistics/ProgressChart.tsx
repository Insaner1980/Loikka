import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
      {dataPoint.isPersonalBest && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gold text-black mt-1">
          SE
        </span>
      )}
    </div>
  );
}

export function ProgressChart({ data, discipline }: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-card rounded-xl border border-border">
        <p className="text-muted-foreground">Ei tuloksia näytettäväksi</p>
      </div>
    );
  }

  // Find personal best point for highlighting
  const pbPoint = data.find((d) => d.isPersonalBest);

  // Format dates for X axis
  const chartData = data.map((d) => ({
    ...d,
    formattedDate: format(new Date(d.date), "d.M.yy"),
  }));

  // Calculate Y axis domain with padding
  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.1 || maxValue * 0.1;

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
    return `${value.toFixed(2)}`;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="text-lg font-semibold mb-4">Kehitys</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              opacity={0.5}
            />
            <XAxis
              dataKey="formattedDate"
              stroke="var(--color-muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={yDomain}
              tickFormatter={formatYAxis}
              stroke="var(--color-muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              content={<CustomTooltip discipline={discipline} />}
              cursor={{ stroke: "var(--color-primary)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-primary)",
                strokeWidth: 0,
                r: 4,
              }}
              activeDot={{
                fill: "var(--color-primary)",
                strokeWidth: 0,
                r: 6,
              }}
            />
            {/* Highlight personal best */}
            {pbPoint && (
              <ReferenceDot
                x={format(new Date(pbPoint.date), "d.M.yy")}
                y={pbPoint.value}
                r={8}
                fill="var(--color-gold)"
                stroke="var(--color-gold)"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
