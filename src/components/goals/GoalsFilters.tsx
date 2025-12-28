import { useMemo } from "react";
import { FilterSelect, type FilterOption } from "../ui";
import type { AthleteWithStats } from "../../types";

export type StatusFilter = "active" | "achieved" | "all";

interface GoalsFiltersProps {
  athletes: AthleteWithStats[];
  athleteFilter: number | null;
  statusFilter: StatusFilter;
  onAthleteFilterChange: (value: number | null) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
}

export function GoalsFilters({
  athletes,
  athleteFilter,
  statusFilter,
  onAthleteFilterChange,
  onStatusFilterChange,
}: GoalsFiltersProps) {
  const athleteOptions: FilterOption[] = useMemo(() => [
    { value: "all", label: "Kaikki urheilijat" },
    ...athletes.map(({ athlete }) => ({
      value: athlete.id,
      label: `${athlete.firstName} ${athlete.lastName}`,
    })),
  ], [athletes]);

  const statusOptions: FilterOption[] = [
    { value: "active", label: "Aktiiviset" },
    { value: "achieved", label: "Saavutetut" },
    { value: "all", label: "Kaikki" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <FilterSelect
        value={athleteFilter ?? "all"}
        onChange={(value) => onAthleteFilterChange(value === "all" ? null : (value as number))}
        options={athleteOptions}
      />
      <FilterSelect
        value={statusFilter}
        onChange={(value) => onStatusFilterChange(value as StatusFilter)}
        options={statusOptions}
      />
    </div>
  );
}
