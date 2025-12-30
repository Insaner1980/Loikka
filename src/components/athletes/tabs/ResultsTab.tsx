import { useState, useEffect, useMemo } from "react";
import { ResultCard } from "../../results/ResultCard";
import { DisciplineFilterSelect, FilterSelect, type FilterOption } from "../../ui";
import type { ResultWithDiscipline } from "./types";

interface ResultsTabProps {
  results: ResultWithDiscipline[];
  initialDisciplineFilter?: number | null;
  onDisciplineFilterChange?: (disciplineId: number | null) => void;
  onEditResult: (result: ResultWithDiscipline) => void;
}

export function ResultsTab({
  results,
  initialDisciplineFilter,
  onDisciplineFilterChange,
  onEditResult,
}: ResultsTabProps) {
  const [disciplineFilter, setDisciplineFilter] = useState<number | null>(
    initialDisciplineFilter ?? null
  );
  const [seasonFilter, setSeasonFilter] = useState<number | null>(null);

  // Sync with external filter changes
  useEffect(() => {
    setDisciplineFilter(initialDisciplineFilter ?? null);
  }, [initialDisciplineFilter]);

  // Get unique disciplines from all results
  const uniqueDisciplines = [...new Map(
    results.map((r) => [r.disciplineId, r.discipline])
  ).values()];

  // Create a lookup for combined event names (result id -> discipline name)
  // This is used to show "3-ottelu" under sub-results
  const combinedEventNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const result of results) {
      if (result.discipline?.category === "combined") {
        map.set(result.id, result.discipline.name);
      }
    }
    return map;
  }, [results]);

  // Filter results by discipline first (for year options)
  const resultsForYearFilter = disciplineFilter
    ? results.filter((r) => r.disciplineId === disciplineFilter)
    : results;

  // Get unique years from discipline-filtered results
  const uniqueYears = [...new Set(
    resultsForYearFilter.map((r) => new Date(r.date).getFullYear())
  )].sort((a, b) => b - a);

  // Year filter options for FilterSelect
  const yearFilterOptions: FilterOption[] = useMemo(() => [
    { value: "all", label: "Kaikki kaudet" },
    ...uniqueYears.map((y) => ({ value: y, label: String(y) })),
  ], [uniqueYears]);

  // Apply both filters for display
  const filteredResults = results.filter((r) => {
    if (disciplineFilter && r.disciplineId !== disciplineFilter) return false;
    if (seasonFilter && new Date(r.date).getFullYear() !== seasonFilter) return false;
    return true;
  });

  const handleDisciplineChange = (value: number | null) => {
    setDisciplineFilter(value);
    setSeasonFilter(null);
    onDisciplineFilterChange?.(value);
  };

  return (
    <div className="space-y-3">
      {/* Filter row */}
      {results.length > 0 && (
        <div className="flex gap-3">
          <DisciplineFilterSelect
            value={disciplineFilter}
            onChange={handleDisciplineChange}
            disciplines={uniqueDisciplines}
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

      {/* Results grid */}
      {filteredResults.length === 0 ? (
        <p className="text-muted-foreground text-body text-center py-8">
          {results.length === 0
            ? "Ei tuloksia vielä"
            : "Ei tuloksia valituilla suodattimilla"}
        </p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredResults.map((result) => (
            <ResultCard
              key={result.id}
              result={result}
              discipline={result.discipline}
              showAthleteName={false}
              onEdit={() => onEditResult(result)}
              combinedEventName={result.combinedEventId ? combinedEventNameMap.get(result.combinedEventId) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
