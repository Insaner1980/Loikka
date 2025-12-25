import { useState, useEffect } from "react";
import { ResultCard } from "../../results/ResultCard";
import { categoryLabels, categoryOrder } from "../../../data/disciplines";
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

  // Filter results by discipline first (for year options)
  const resultsForYearFilter = disciplineFilter
    ? results.filter((r) => r.disciplineId === disciplineFilter)
    : results;

  // Get unique years from discipline-filtered results
  const uniqueYears = [...new Set(
    resultsForYearFilter.map((r) => new Date(r.date).getFullYear())
  )].sort((a, b) => b - a);

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
          <select
            value={disciplineFilter ?? ""}
            onChange={(e) => handleDisciplineChange(e.target.value ? parseInt(e.target.value) : null)}
            className="flex-1 px-3 py-2 bg-card border border-border-subtle rounded-lg text-sm input-focus cursor-pointer"
          >
            <option value="">Kaikki lajit</option>
            {categoryOrder.map((category) => {
              const categoryDisciplines = uniqueDisciplines.filter(
                (d) => d.category === category
              );
              if (categoryDisciplines.length === 0) return null;
              return (
                <optgroup key={category} label={categoryLabels[category]}>
                  {categoryDisciplines.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <select
            value={seasonFilter ?? ""}
            onChange={(e) => setSeasonFilter(e.target.value ? parseInt(e.target.value) : null)}
            className="flex-1 px-3 py-2 bg-card border border-border-subtle rounded-lg text-sm input-focus cursor-pointer"
          >
            <option value="">Kaikki kaudet</option>
            {uniqueYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
