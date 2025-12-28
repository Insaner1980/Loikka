import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import type { Discipline } from "../../types";
import type { SeasonComparisonData } from "../../stores/useResultStore";
import { formatTime, formatDistance } from "../../lib/formatters";

interface ComparisonChartProps {
  data: SeasonComparisonData[];
  discipline: Discipline;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: SeasonComparisonData & { formattedValue: string };
  }>;
  discipline: Discipline;
}

function CustomTooltip({ active, payload, discipline }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const dataPoint = payload[0].payload;
  const formattedValue =
    dataPoint.bestResult !== null
      ? discipline.unit === "time"
        ? formatTime(dataPoint.bestResult)
        : formatDistance(dataPoint.bestResult)
      : "-";

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-body text-muted-foreground">Kausi {dataPoint.year}</p>
      <p className="text-title font-bold">{formattedValue}</p>
    </div>
  );
}

export function ComparisonChart({ data, discipline }: ComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-card rounded-xl border border-border">
        <p className="text-muted-foreground">Ei vertailutietoja</p>
      </div>
    );
  }

  // Prepare chart data with formatted values
  const chartData = data.map((d) => ({
    ...d,
    formattedValue:
      d.bestResult !== null
        ? discipline.unit === "time"
          ? formatTime(d.bestResult)
          : formatDistance(d.bestResult)
        : "-",
    displayValue: d.bestResult ?? 0,
  }));

  // Calculate Y axis domain
  const values = data.filter((d) => d.bestResult !== null).map((d) => d.bestResult!);
  if (values.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-card rounded-xl border border-border">
        <p className="text-muted-foreground">Ei vertailutietoja</p>
      </div>
    );
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.1 || maxValue * 0.1;

  // For time events, we don't invert for bar charts - just show the bars normally
  // but we calculate domain to show bars properly
  const yDomain: [number, number] = [0, maxValue + padding];

  // Format value for Y axis ticks
  const formatYAxis = (value: number) => {
    if (value === 0) return "0";
    if (discipline.unit === "time") {
      return formatTime(value);
    }
    return `${value.toFixed(1)}`;
  };

  // Find the current (latest) year for highlighting
  const currentYear = Math.max(...data.map((d) => d.year));

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="text-title font-semibold mb-4">Kausivertailu</h3>
      <div className="h-64">
          <BarChart
            data={chartData}
            width={800}
            height={256}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              opacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="year"
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
              cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
            />
            <Bar dataKey="displayValue" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.year === currentYear
                      ? "var(--accent)"
                      : "var(--text-secondary)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
      </div>
    </div>
  );
}
