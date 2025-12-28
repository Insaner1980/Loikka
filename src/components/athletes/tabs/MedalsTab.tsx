import { useState, useMemo } from "react";
import { formatTime, formatDistance, formatDate } from "../../../lib/formatters";
import { getDisciplineById } from "../../../data/disciplines";
import { DisciplineFilterSelect, FilterSelect, type FilterOption } from "../../ui";
import type { Medal } from "../../../types";
import type { ResultWithDiscipline } from "./types";

const medalClasses: Record<"gold" | "silver" | "bronze", string> = {
  gold: "bg-gold",
  silver: "bg-silver",
  bronze: "bg-bronze",
};

const medalNumber: Record<string, number> = { gold: 1, silver: 2, bronze: 3 };

interface MedalsTabProps {
  medals: Medal[];
  results: ResultWithDiscipline[];
  onMedalClick: (disciplineId: number) => void;
}

export function MedalsTab({ medals, results, onMedalClick }: MedalsTabProps) {
  const [disciplineFilter, setDisciplineFilter] = useState<number | null>(null);
  const [competitionFilter, setCompetitionFilter] = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<number | null>(null);

  // Get unique disciplines from medals (full discipline objects)
  const disciplines = useMemo(() => {
    const uniqueIds = new Set(
      medals.filter(m => m.disciplineId).map(m => m.disciplineId!)
    );
    return Array.from(uniqueIds)
      .map(id => getDisciplineById(id))
      .filter(d => d !== undefined);
  }, [medals]);

  // Filter by discipline first (for competition options)
  const medalsForCompetitionFilter = disciplineFilter
    ? medals.filter(m => m.disciplineId === disciplineFilter)
    : medals;

  // Get unique competition names from discipline-filtered medals
  const competitions = [...new Set(medalsForCompetitionFilter.map(m => m.competitionName))].sort();

  // Filter by discipline and competition (for year options)
  const medalsForYearFilter = medalsForCompetitionFilter.filter(m =>
    !competitionFilter || m.competitionName === competitionFilter
  );

  // Get unique years from filtered medals
  const uniqueYears = [...new Set(
    medalsForYearFilter.map(m => new Date(m.date).getFullYear())
  )].sort((a, b) => b - a);

  // Filter options for FilterSelect components
  const competitionOptions: FilterOption[] = useMemo(() => [
    { value: "all", label: "Kaikki kilpailut" },
    ...competitions.map(name => ({ value: name, label: name })),
  ], [competitions]);

  const yearFilterOptions: FilterOption[] = useMemo(() => [
    { value: "all", label: "Kaudet" },
    ...uniqueYears.map(y => ({ value: y, label: String(y) })),
  ], [uniqueYears]);

  // Apply all filters for display
  const filteredMedals = medals.filter(m => {
    if (disciplineFilter && m.disciplineId !== disciplineFilter) return false;
    if (competitionFilter && m.competitionName !== competitionFilter) return false;
    if (seasonFilter && new Date(m.date).getFullYear() !== seasonFilter) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Filter row */}
      {medals.length > 0 && (
        <div className="flex gap-3">
          <DisciplineFilterSelect
            value={disciplineFilter}
            onChange={setDisciplineFilter}
            disciplines={disciplines}
            className="flex-1"
          />
          <FilterSelect
            value={competitionFilter ?? "all"}
            onChange={(value) => setCompetitionFilter(value === "all" ? null : (value as string))}
            options={competitionOptions}
            className="flex-1"
          />
          <FilterSelect
            value={seasonFilter ?? "all"}
            onChange={(value) => setSeasonFilter(value === "all" ? null : (value as number))}
            options={yearFilterOptions}
          />
        </div>
      )}

      {/* Medal cards grid */}
      {filteredMedals.length === 0 ? (
        <p className="text-muted-foreground text-body text-center py-8">
          {medals.length === 0 ? "Ei mitaleja vielä" : "Ei mitaleja valituilla suodattimilla"}
        </p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMedals.map((medal) => {
            // Find linked result
            const linkedResult = medal.resultId
              ? results.find(r => r.id === medal.resultId)
              : null;

            return (
              <button
                key={medal.id}
                onClick={() => {
                  if (medal.disciplineId) {
                    onMedalClick(medal.disciplineId);
                  }
                }}
                className="rounded-xl bg-card border border-border-subtle hover:border-border-hover transition-colors duration-150 p-4 flex flex-col text-left cursor-pointer"
              >
                {/* Top: Medal circle centered */}
                <div className="flex justify-center mb-3">
                  <div
                    className={`w-12 h-12 rounded-full ${medalClasses[medal.type]} shadow-lg flex items-center justify-center`}
                  >
                    <span className="text-title font-bold text-medal-text">{medalNumber[medal.type]}</span>
                  </div>
                </div>

                {/* Center: Discipline + result */}
                <div className="flex-1 flex flex-col items-center justify-center py-1">
                  <span className="text-body font-medium text-foreground text-center">
                    {medal.disciplineName || "Tuntematon laji"}
                  </span>
                  {linkedResult && (
                    <span className="text-title font-bold tabular-nums text-foreground mt-1">
                      {linkedResult.discipline.unit === "time"
                        ? formatTime(linkedResult.value)
                        : formatDistance(linkedResult.value)}
                    </span>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px w-full bg-border my-3" />

                {/* Bottom: Competition, date, location */}
                <div className="text-body text-muted-foreground text-center">
                  <div className="truncate">{medal.competitionName}</div>
                  <div className="mt-0.5">
                    {formatDate(medal.date)}
                    {medal.location && ` · ${medal.location}`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
