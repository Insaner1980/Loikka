import { useMemo } from "react";
import { X } from "lucide-react";
import type { Athlete, Result, ResultType } from "../../types";
import { getDisciplineById, sortAgeCategories } from "../../data/disciplines";
import { getAgeCategory } from "../../lib/formatters";
import { DisciplineFilterSelect, FilterSelect, type FilterOption } from "../ui";

export interface ResultFiltersState {
  athleteId: number | null;
  disciplineId: number | null;
  type: ResultType | null;
  year: number | null; // null = all years
  ageCategory: string | null; // null = all categories
}

interface ResultFiltersProps {
  filters: ResultFiltersState;
  onFilterChange: (filters: ResultFiltersState) => void;
  athletes: Athlete[];
  results: Result[];
}

export function ResultFilters({
  filters,
  onFilterChange,
  athletes,
  results,
}: ResultFiltersProps) {
  // Get disciplines that have at least one result (filtered by selected athlete if any)
  const disciplinesWithResults = useMemo(() => {
    // Filter results by selected athlete if one is chosen
    const filteredResults = filters.athleteId
      ? results.filter((r) => r.athleteId === filters.athleteId)
      : results;

    const disciplineIds = new Set(filteredResults.map((r) => r.disciplineId));
    return Array.from(disciplineIds)
      .map((id) => getDisciplineById(id))
      .filter((d) => d !== undefined);
  }, [results, filters.athleteId]);

  const hasActiveFilters =
    filters.athleteId !== null ||
    filters.disciplineId !== null ||
    filters.type !== null ||
    filters.year !== null ||
    filters.ageCategory !== null;

  const clearFilters = () => {
    onFilterChange({
      athleteId: null,
      disciplineId: null,
      type: null,
      year: null,
      ageCategory: null,
    });
  };

  // Get unique age categories from athletes (sorted youngest to oldest)
  const ageCategories = sortAgeCategories([...new Set(athletes.map((a) => getAgeCategory(a.birthYear)))]);

  // Get years that have results (filtered by selected athlete if any)
  const yearsWithResults = useMemo(() => {
    const filteredResults = filters.athleteId
      ? results.filter((r) => r.athleteId === filters.athleteId)
      : results;

    const years = new Set(filteredResults.map((r) => new Date(r.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a); // Descending order
  }, [results, filters.athleteId]);

  // Filter options for FilterSelect components
  const athleteOptions: FilterOption[] = useMemo(() => [
    { value: "all", label: "Kaikki urheilijat" },
    ...athletes.map((a) => ({
      value: a.id,
      label: `${a.firstName} ${a.lastName}`,
    })),
  ], [athletes]);

  const typeOptions: FilterOption[] = [
    { value: "all", label: "Kaikki tyypit" },
    { value: "competition", label: "Kilpailu" },
    { value: "training", label: "Harjoitus" },
  ];

  const yearFilterOptions: FilterOption[] = useMemo(() => [
    { value: "all", label: "Kaikki vuodet" },
    ...yearsWithResults.map((y) => ({ value: y, label: String(y) })),
  ], [yearsWithResults]);

  const ageCategoryOptions: FilterOption[] = useMemo(() => [
    { value: "all", label: "Kaikki ikäsarjat" },
    ...ageCategories.map((c) => ({ value: c, label: c })),
  ], [ageCategories]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Athlete filter */}
      <FilterSelect
        value={filters.athleteId ?? "all"}
        onChange={(value) =>
          onFilterChange({
            ...filters,
            athleteId: value === "all" ? null : (value as number),
          })
        }
        options={athleteOptions}
      />

      {/* Discipline filter */}
      <DisciplineFilterSelect
        value={filters.disciplineId}
        onChange={(value) =>
          onFilterChange({
            ...filters,
            disciplineId: value,
          })
        }
        disciplines={disciplinesWithResults}
      />

      {/* Type filter */}
      <FilterSelect
        value={filters.type ?? "all"}
        onChange={(value) =>
          onFilterChange({
            ...filters,
            type: value === "all" ? null : (value as ResultType),
          })
        }
        options={typeOptions}
      />

      {/* Year filter */}
      <FilterSelect
        value={filters.year ?? "all"}
        onChange={(value) =>
          onFilterChange({
            ...filters,
            year: value === "all" ? null : (value as number),
          })
        }
        options={yearFilterOptions}
      />

      {/* Age category filter */}
      {ageCategories.length > 0 && (
        <FilterSelect
          value={filters.ageCategory ?? "all"}
          onChange={(value) =>
            onFilterChange({
              ...filters,
              ageCategory: value === "all" ? null : (value as string),
            })
          }
          options={ageCategoryOptions}
        />
      )}

      {/* Clear filters button */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 px-3 py-2 text-body text-tertiary hover:text-foreground transition-colors duration-150 cursor-pointer"
        >
          <X size={14} />
          Tyhjennä
        </button>
      )}
    </div>
  );
}
