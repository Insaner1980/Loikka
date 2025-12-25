import { useState } from "react";
import { formatTime, formatDistance, formatDate } from "../../../lib/formatters";
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

  // Get unique disciplines from medals
  const disciplinesMap = new Map(
    medals
      .filter(m => m.disciplineId && m.disciplineName)
      .map(m => [m.disciplineId!, { id: m.disciplineId!, name: m.disciplineName! }])
  );
  const disciplines = [...disciplinesMap.values()].sort((a, b) => a.id - b.id);

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
          <select
            value={disciplineFilter ?? ""}
            onChange={(e) => setDisciplineFilter(e.target.value ? parseInt(e.target.value) : null)}
            className="flex-1 px-3 py-2 bg-card border border-border-subtle rounded-lg text-sm input-focus cursor-pointer"
          >
            <option value="">Kaikki lajit</option>
            {disciplines.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={competitionFilter ?? ""}
            onChange={(e) => setCompetitionFilter(e.target.value || null)}
            className="flex-1 px-3 py-2 bg-card border border-border-subtle rounded-lg text-sm input-focus cursor-pointer"
          >
            <option value="">Kaikki kilpailut</option>
            {competitions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select
            value={seasonFilter ?? ""}
            onChange={(e) => setSeasonFilter(e.target.value ? parseInt(e.target.value) : null)}
            className="w-28 px-3 py-2 bg-card border border-border-subtle rounded-lg text-sm input-focus cursor-pointer"
          >
            <option value="">Kaudet</option>
            {uniqueYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
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
                    <span className="text-lg font-bold text-black/70">{medalNumber[medal.type]}</span>
                  </div>
                </div>

                {/* Center: Discipline + result */}
                <div className="flex-1 flex flex-col items-center justify-center py-1">
                  <span className="text-sm font-medium text-foreground text-center">
                    {medal.disciplineName || "Tuntematon laji"}
                  </span>
                  {linkedResult && (
                    <span className="text-lg font-bold tabular-nums text-foreground mt-1">
                      {linkedResult.discipline.unit === "time"
                        ? formatTime(linkedResult.value)
                        : formatDistance(linkedResult.value)}
                    </span>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px w-full bg-border my-3" />

                {/* Bottom: Competition, date, location */}
                <div className="text-sm text-muted-foreground text-center">
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
