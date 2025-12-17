import { X } from "lucide-react";
import type { Athlete, ResultType } from "../../types";
import { disciplines, categoryLabels, categoryOrder } from "../../data/disciplines";

export interface ResultFiltersState {
  athleteId: number | null;
  disciplineId: number | null;
  type: ResultType | null;
  timeRange: "all" | "thisYear" | "lastYear" | "custom";
  startDate?: string;
  endDate?: string;
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
    filters.timeRange !== "all";

  const clearFilters = () => {
    onFilterChange({
      athleteId: null,
      disciplineId: null,
      type: null,
      timeRange: "all",
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Athlete filter */}
      <select
        className="bg-[#141414] rounded-md px-3 py-2 text-[13px] input-focus"
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
        className="bg-[#141414] rounded-md px-3 py-2 text-[13px] input-focus"
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
        className="bg-[#141414] rounded-md px-3 py-2 text-[13px] input-focus"
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

      {/* Time range filter */}
      <select
        className="bg-[#141414] rounded-md px-3 py-2 text-[13px] input-focus"
        value={filters.timeRange}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            timeRange: e.target.value as ResultFiltersState["timeRange"],
            startDate: undefined,
            endDate: undefined,
          })
        }
      >
        <option value="all">Kaikki ajat</option>
        <option value="thisYear">Tämä kausi</option>
        <option value="lastYear">Viime kausi</option>
        <option value="custom">Mukautettu</option>
      </select>

      {/* Custom date range inputs */}
      {filters.timeRange === "custom" && (
        <>
          <input
            type="date"
            className="bg-[#141414] rounded-md px-3 py-2 text-[13px] input-focus"
            value={filters.startDate ?? ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                startDate: e.target.value || undefined,
              })
            }
          />
          <span className="text-[#555555]">–</span>
          <input
            type="date"
            className="bg-[#141414] rounded-md px-3 py-2 text-[13px] input-focus"
            value={filters.endDate ?? ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                endDate: e.target.value || undefined,
              })
            }
          />
        </>
      )}

      {/* Clear filters button */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 px-3 py-2 text-[13px] text-[#555555] hover:text-foreground transition-colors duration-150"
        >
          <X size={14} />
          Tyhjennä
        </button>
      )}
    </div>
  );
}
