import { useState, useMemo } from "react";
import { ResultBadge } from "../../results/ResultBadge";
import { formatTime, formatDistance, formatDate, getStatusLabel } from "../../../lib/formatters";
import { DisciplineFilterSelect, FilterSelect, type FilterOption } from "../../ui";
import type { ResultWithDiscipline } from "./types";

interface RecordsTabProps {
  personalBests: ResultWithDiscipline[];
}

export function RecordsTab({ personalBests }: RecordsTabProps) {
  const [disciplineFilter, setDisciplineFilter] = useState<number | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<number | null>(null);

  // Get unique disciplines from personal bests
  const disciplines = [...new Map(
    personalBests.map((r) => [r.disciplineId, r.discipline])
  ).values()].sort((a, b) => a.id - b.id);

  // Filter personal bests by discipline first (for year options)
  const recordsForYearFilter = disciplineFilter
    ? personalBests.filter((r) => r.disciplineId === disciplineFilter)
    : personalBests;

  // Get unique years from discipline-filtered records
  const uniqueYears = [...new Set(
    recordsForYearFilter.map((r) => new Date(r.date).getFullYear())
  )].sort((a, b) => b - a);

  // Year filter options for FilterSelect
  const yearFilterOptions: FilterOption[] = useMemo(() => [
    { value: "all", label: "Kaikki kaudet" },
    ...uniqueYears.map((y) => ({ value: y, label: String(y) })),
  ], [uniqueYears]);

  // Apply both filters for display
  const filteredRecords = personalBests.filter((r) => {
    if (disciplineFilter && r.disciplineId !== disciplineFilter) return false;
    if (seasonFilter && new Date(r.date).getFullYear() !== seasonFilter) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Filter row */}
      {personalBests.length > 0 && (
        <div className="flex gap-3">
          <DisciplineFilterSelect
            value={disciplineFilter}
            onChange={(value) => {
              setDisciplineFilter(value);
              setSeasonFilter(null);
            }}
            disciplines={disciplines}
            className="flex-1"
          />
          <FilterSelect
            value={seasonFilter ?? "all"}
            onChange={(value) => setSeasonFilter(value === "all" ? null : (value as number))}
            options={yearFilterOptions}
            className="flex-1"
          />
        </div>
      )}

      {/* Records grid */}
      {filteredRecords.length === 0 ? (
        <p className="text-muted-foreground text-body text-center py-8">
          {personalBests.length === 0
            ? "Ei ennätyksiä vielä"
            : "Ei ennätyksiä valitulla suodattimella"}
        </p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRecords.map((result) => (
            <div
              key={result.id}
              className="rounded-xl bg-card border border-border-subtle hover:border-border-hover transition-colors duration-150 border-l-3 border-l-[var(--accent)] p-4 flex flex-col"
            >
              {/* Top: Discipline */}
              <div className="text-body font-medium text-foreground mb-3">
                {result.discipline.fullName}
              </div>

              {/* Center: Result value (big) */}
              <div className="flex-1 flex flex-col items-center justify-center py-2">
                {(result.status && result.status !== "valid") || result.value === 0 ? (
                  <span className="px-3 py-1.5 text-body font-medium rounded-lg bg-muted text-muted-foreground">
                    {getStatusLabel(result.status) || "Ei tulosta"}
                  </span>
                ) : (
                  <>
                    <span className="text-stat font-bold tabular-nums text-foreground">
                      {result.discipline.unit === "time"
                        ? formatTime(result.value)
                        : formatDistance(result.value)}
                    </span>
                    {/* Badges */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <ResultBadge type="pb" />
                      {result.isSeasonBest && <ResultBadge type="sb" />}
                      {result.isNationalRecord && <ResultBadge type="nr" />}
                    </div>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-border my-3" />

              {/* Bottom: Date + competition */}
              <div className="text-body text-muted-foreground">
                <div>{formatDate(result.date)}</div>
                {result.competitionName && (
                  <div className="truncate mt-0.5">{result.competitionName}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
