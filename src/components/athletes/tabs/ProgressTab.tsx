import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Hash,
  Calculator,
} from "lucide-react";
import { formatTime, formatDistance, formatDate, formatShortDate } from "../../../lib/formatters";
import { isVerticalJump } from "../../../data/disciplines";
import { DisciplineFilterSelect, FilterSelect, type FilterOption } from "../../ui";
import type { ResultWithDiscipline } from "./types";

interface ProgressTabProps {
  results: ResultWithDiscipline[];
}

export function ProgressTab({ results }: ProgressTabProps) {
  const [disciplineFilter, setDisciplineFilter] = useState<number | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<number | null>(null);

  // Get unique disciplines from all results (only those with results)
  const disciplines = useMemo(() => {
    const map = new Map(
      results.map((r) => [r.disciplineId, r.discipline])
    );
    return [...map.values()].sort((a, b) => a.id - b.id);
  }, [results]);

  // Filter by discipline first
  const disciplineResults = useMemo(() =>
    disciplineFilter
      ? results.filter((r) => r.disciplineId === disciplineFilter)
      : [],
    [results, disciplineFilter]
  );

  // Get unique years from discipline-filtered results
  const uniqueYears = useMemo(() =>
    [...new Set(
      disciplineResults.map((r) => new Date(r.date).getFullYear())
    )].sort((a, b) => b - a),
    [disciplineResults]
  );

  // Season filter options for FilterSelect
  const seasonFilterOptions: FilterOption[] = useMemo(() => [
    { value: "all", label: "Kaikki kaudet" },
    ...uniqueYears.map((year) => ({ value: year, label: String(year) })),
  ], [uniqueYears]);

  // Get the selected discipline
  const selectedDiscipline = disciplineFilter
    ? disciplines.find((d) => d.id === disciplineFilter)
    : null;

  // Determine if lower is better (time events)
  const isLowerBetter = selectedDiscipline?.unit === "time";

  // Check if combined event (moniottelu)
  const isCombinedEvent = selectedDiscipline?.category === "combined";

  // Filter by season
  const seasonResults = useMemo(() =>
    seasonFilter
      ? disciplineResults.filter(
          (r) => new Date(r.date).getFullYear() === seasonFilter
        )
      : disciplineResults,
    [disciplineResults, seasonFilter]
  );

  // Sort by date for chart
  const sortedResults = useMemo(() =>
    [...seasonResults].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    ),
    [seasonResults]
  );

  // Find best result (all-time for this discipline)
  const allTimeBest = useMemo(() => {
    if (disciplineResults.length === 0) return null;
    return disciplineResults.reduce((best, r) => {
      if (r.value === 0 || (r.status && r.status !== "valid")) return best;
      if (!best || (isLowerBetter ? r.value < best.value : r.value > best.value)) {
        return r;
      }
      return best;
    }, null as ResultWithDiscipline | null);
  }, [disciplineResults, isLowerBetter]);

  // Season stats
  const validSeasonResults = useMemo(() =>
    sortedResults.filter(
      (r) => r.value > 0 && (!r.status || r.status === "valid")
    ),
    [sortedResults]
  );

  const seasonBest = useMemo(() =>
    validSeasonResults.length > 0
      ? validSeasonResults.reduce((best, r) =>
          isLowerBetter ? (r.value < best.value ? r : best) : (r.value > best.value ? r : best)
        )
      : null,
    [validSeasonResults, isLowerBetter]
  );

  const seasonFirst = validSeasonResults.length > 0 ? validSeasonResults[0] : null;
  const seasonLast = validSeasonResults.length > 0 ? validSeasonResults[validSeasonResults.length - 1] : null;

  // Improvement = Last - First (shows actual progress/regression over time)
  const improvement = useMemo(() =>
    seasonFirst && seasonLast
      ? isLowerBetter
        ? seasonFirst.value - seasonLast.value  // For time: positive = faster (improved)
        : seasonLast.value - seasonFirst.value  // For distance/points: positive = better
      : 0,
    [seasonFirst, seasonLast, isLowerBetter]
  );

  const average = useMemo(() =>
    validSeasonResults.length > 0
      ? validSeasonResults.reduce((sum, r) => sum + r.value, 0) /
        validSeasonResults.length
      : 0,
    [validSeasonResults]
  );

  // Chart data
  const chartData = useMemo(() =>
    sortedResults
      .filter((r) => r.value > 0 && (!r.status || r.status === "valid"))
      .map((r, index) => ({
        key: `${r.date}-${index}`,
        date: formatShortDate(r.date),
        fullDate: formatDate(r.date),
        value: r.value,
        isPB: allTimeBest ? r.id === allTimeBest.id : false,
        isSB: r.isSeasonBest || false,
        isNR: r.isNationalRecord || false,
      })),
    [sortedResults, allTimeBest]
  );

  // Season comparison (best per year for last 4 years)
  const seasonBests = useMemo(() =>
    uniqueYears.slice(0, 4).map((year) => {
      const yearResults = disciplineResults.filter(
        (r) =>
          new Date(r.date).getFullYear() === year &&
          r.value > 0 &&
          (!r.status || r.status === "valid")
      );
      if (yearResults.length === 0) return { year, value: 0 };
      const best = yearResults.reduce((best, r) =>
        isLowerBetter ? (r.value < best.value ? r : best) : (r.value > best.value ? r : best)
      );
      return { year, value: best.value };
    }).filter(s => s.value > 0).reverse(),
    [uniqueYears, disciplineResults, isLowerBetter]
  );

  // Custom tooltip for line chart
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { fullDate: string; value: number; isPB: boolean; isSB: boolean; isNR: boolean } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const hasBadges = data.isNR || data.isPB || data.isSB;
      return (
        <div className="bg-card border border-border-subtle rounded-lg px-3 py-2 shadow-lg">
          <p className="text-body text-muted-foreground">{data.fullDate}</p>
          <p className="text-title font-bold text-foreground">
            {isCombinedEvent
              ? `${Math.round(data.value)} p`
              : selectedDiscipline?.unit === "time"
                ? formatTime(data.value)
                : formatDistance(data.value, false, selectedDiscipline ? isVerticalJump(selectedDiscipline.id) : false)}
          </p>
          {hasBadges && (
            <div className="flex gap-1 mt-1">
              {data.isNR && <span className="badge-nr">SE</span>}
              {data.isPB && <span className="badge-pb">OE</span>}
              {data.isSB && <span className="badge-sb">KE</span>}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Format improvement value
  const formatImprovement = (value: number) => {
    if (selectedDiscipline?.unit === "time") {
      const prefix = value > 0 ? "-" : "+";
      return `${prefix}${Math.abs(value).toFixed(2)} s`;
    } else if (isCombinedEvent) {
      const prefix = value > 0 ? "+" : "";
      return `${prefix}${Math.round(value)} p`;
    } else {
      const prefix = value > 0 ? "+" : "";
      return `${prefix}${(value * 100).toFixed(0)} cm`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter row */}
      <div className="flex gap-3">
        <DisciplineFilterSelect
          value={disciplineFilter}
          onChange={(value) => {
            setDisciplineFilter(value);
            setSeasonFilter(null);
          }}
          disciplines={disciplines}
          placeholder="Valitse laji"
          showPlaceholderOption={false}
          className="flex-1"
        />
        {disciplineFilter && (
          <FilterSelect
            value={seasonFilter ?? "all"}
            onChange={(value) => setSeasonFilter(value === "all" ? null : (value as number))}
            options={seasonFilterOptions}
            className="flex-1"
          />
        )}
      </div>

      {/* Empty state if no discipline selected */}
      {!disciplineFilter && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <TrendingUp size={48} className="text-icon-muted mb-4" />
          <h2 className="text-body font-medium text-muted-foreground mb-1.5">
            Valitse laji
          </h2>
          <p className="text-body text-tertiary">
            Valitse laji nähdäksesi kehityksen
          </p>
        </div>
      )}

      {/* Empty state if no results for discipline */}
      {disciplineFilter && chartData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <TrendingUp size={48} className="text-icon-muted mb-4" />
          <h2 className="text-body font-medium text-muted-foreground mb-1.5">
            Ei tuloksia
          </h2>
          <p className="text-body text-tertiary">
            Ei vielä tuloksia tässä lajissa
          </p>
        </div>
      )}

      {/* Progress chart */}
      {disciplineFilter && chartData.length > 0 && (
        <>
          <div className="bg-card border border-border-subtle rounded-lg p-4">
            <h3 className="text-body font-medium text-foreground mb-4">
              Tuloskehitys
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="key"
                    tick={{ fill: "var(--text-muted)", fontSize: 11, dy: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border-subtle)" }}
                    tickFormatter={(value) => {
                      const datePart = value.split("-").slice(0, 3).join("-");
                      return formatShortDate(datePart);
                    }}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border-subtle)" }}
                    domain={["auto", "auto"]}
                    reversed={isLowerBetter}
                    tickFormatter={(value) =>
                      isCombinedEvent
                        ? Math.round(value).toString()
                        : selectedDiscipline?.unit === "time"
                          ? formatTime(value)
                          : `${value.toFixed(2)}`
                    }
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: "var(--accent)", strokeWidth: 1 }}
                  />
                  {allTimeBest && (
                    <ReferenceLine
                      y={allTimeBest.value}
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
                      if (payload.isPB) {
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

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Best result */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-body text-muted-foreground">Paras</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-stat font-bold tabular-nums">
                      {seasonBest
                        ? isCombinedEvent
                          ? `${Math.round(seasonBest.value)} p`
                          : selectedDiscipline?.unit === "time"
                            ? formatTime(seasonBest.value)
                            : formatDistance(seasonBest.value, false, selectedDiscipline ? isVerticalJump(selectedDiscipline.id) : false)
                        : "-"}
                    </p>
                  </div>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Trophy size={20} />
                </div>
              </div>
            </div>

            {/* Improvement */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-body text-muted-foreground">Kehitys</p>
                  <p className="text-stat font-bold tabular-nums mt-1 text-foreground">
                    {validSeasonResults.length >= 2
                      ? formatImprovement(improvement)
                      : "-"}
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  {improvement > 0 ? (
                    <TrendingUp size={20} />
                  ) : (
                    <TrendingDown size={20} />
                  )}
                </div>
              </div>
            </div>

            {/* Count */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-body text-muted-foreground">Tuloksia</p>
                  <p className="text-stat font-bold tabular-nums mt-1">
                    {validSeasonResults.length}
                  </p>
                  <p className="text-body text-muted-foreground mt-1">
                    {seasonFilter ? "kaudella" : "yhteensä"}
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Hash size={20} />
                </div>
              </div>
            </div>

            {/* Average */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-body text-muted-foreground">Keskiarvo</p>
                  <p className="text-stat font-bold tabular-nums mt-1">
                    {average > 0
                      ? isCombinedEvent
                        ? `${Math.round(average)} p`
                        : selectedDiscipline?.unit === "time"
                          ? formatTime(average)
                          : formatDistance(average, false, selectedDiscipline ? isVerticalJump(selectedDiscipline.id) : false)
                      : "-"}
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Calculator size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Season comparison */}
          {seasonBests.length > 1 && (
            <div className="bg-card border border-border-subtle rounded-lg p-4">
              <h3 className="text-body font-medium text-foreground mb-4">
                Kausien vertailu
              </h3>
              <div className="space-y-3">
                {seasonBests.map((season) => {
                  const bestValue = isLowerBetter
                    ? Math.min(...seasonBests.map(s => s.value))
                    : Math.max(...seasonBests.map(s => s.value));
                  const worstValue = isLowerBetter
                    ? Math.max(...seasonBests.map(s => s.value))
                    : Math.min(...seasonBests.map(s => s.value));
                  const isBest = season.value === bestValue;
                  const range = Math.abs(worstValue - bestValue);
                  const percentage = range === 0
                    ? 100
                    : isLowerBetter
                      ? 100 - ((season.value - bestValue) / range) * 40
                      : 100 - ((bestValue - season.value) / range) * 40;

                  return (
                    <div key={season.year} className="flex items-center gap-3">
                      <span className="text-body text-muted-foreground w-12 shrink-0">
                        {season.year}
                      </span>
                      <div className="flex-1 h-8 bg-elevated rounded overflow-hidden">
                        <div
                          className={`h-full rounded transition-all duration-300 ${
                            isBest ? "bg-[var(--accent)]" : "bg-[var(--accent)]/40"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className={`text-body font-medium tabular-nums w-20 text-right ${
                        isBest ? "text-[var(--accent)]" : "text-foreground"
                      }`}>
                        {isCombinedEvent
                          ? `${Math.round(season.value)} p`
                          : selectedDiscipline?.unit === "time"
                            ? formatTime(season.value)
                            : formatDistance(season.value, false, selectedDiscipline ? isVerticalJump(selectedDiscipline.id) : false)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
