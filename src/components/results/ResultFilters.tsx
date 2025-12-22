import { X } from "lucide-react";
import type { Athlete, ResultType } from "../../types";
import { disciplines, categoryLabels, categoryOrder } from "../../data/disciplines";
import { getAgeCategory } from "../../lib/formatters";
import { YEAR_RANGE } from "../../lib/constants";

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
}

export function ResultFilters({
  filters,
  onFilterChange,
  athletes,
}: ResultFiltersProps) {
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

  // Get unique age categories from athletes
  const ageCategories = [...new Set(athletes.map((a) => getAgeCategory(a.birthYear)))].sort();

  // Generate year options (fixed range)
  const currentYear = new Date().getFullYear();
  const startYear = YEAR_RANGE.START_YEAR;
  const endYear = currentYear + YEAR_RANGE.YEARS_AHEAD;
  const yearOptions: number[] = [];
  for (let y = endYear; y >= startYear; y--) {
    yearOptions.push(y);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Athlete filter */}
      <select
        className="bg-card border border-border rounded-md px-3 py-2 text-body input-focus cursor-pointer"
        value={filters.athleteId ?? ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            athleteId: e.target.value ? Number(e.target.value) : null,
          })
        }
      >
        <option value="">Kaikki urheilijat</option>
        {athletes.map((athlete) => (
          <option key={athlete.id} value={athlete.id}>
            {athlete.firstName} {athlete.lastName}
          </option>
        ))}
      </select>

      {/* Discipline filter */}
      <select
        className="bg-card border border-border rounded-md px-3 py-2 text-body input-focus cursor-pointer"
        value={filters.disciplineId ?? ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            disciplineId: e.target.value ? Number(e.target.value) : null,
          })
        }
      >
        <option value="">Kaikki lajit</option>
        {categoryOrder.map((category) => (
          <optgroup key={category} label={categoryLabels[category]}>
            {disciplines
              .filter((d) => d.category === category)
              .map((discipline) => (
                <option key={discipline.id} value={discipline.id}>
                  {discipline.fullName}
                </option>
              ))}
          </optgroup>
        ))}
      </select>

      {/* Type filter */}
      <select
        className="bg-card border border-border rounded-md px-3 py-2 text-body input-focus cursor-pointer"
        value={filters.type ?? ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            type: e.target.value ? (e.target.value as ResultType) : null,
          })
        }
      >
        <option value="">Kaikki tyypit</option>
        <option value="competition">Kilpailu</option>
        <option value="training">Harjoitus</option>
      </select>

      {/* Year filter */}
      <select
        className="bg-card border border-border rounded-md px-3 py-2 text-body input-focus cursor-pointer"
        value={filters.year ?? ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            year: e.target.value ? Number(e.target.value) : null,
          })
        }
      >
        <option value="">Kaikki vuodet</option>
        {yearOptions.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      {/* Age category filter */}
      {ageCategories.length > 0 && (
        <select
          className="bg-card border border-border rounded-md px-3 py-2 text-body input-focus cursor-pointer"
          value={filters.ageCategory ?? ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              ageCategory: e.target.value || null,
            })
          }
        >
          <option value="">Kaikki ikäsarjat</option>
          {ageCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
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
