import { useState, useEffect } from "react";
import { Plus, FileText } from "lucide-react";
import { useResultStore, type ResultFilters } from "../stores/useResultStore";
import { useAthleteStore } from "../stores/useAthleteStore";
import { getDisciplineById } from "../data/disciplines";
import { formatDate } from "../lib/formatters";
import { ResultCard } from "../components/results/ResultCard";
import {
  ResultFilters as ResultFiltersComponent,
  type ResultFiltersState,
} from "../components/results/ResultFilters";
import { ResultForm } from "../components/results/ResultForm";
import { Dialog } from "../components/ui/Dialog";
import type { NewResult, MedalType } from "../types";

export function Results() {
  const { fetchResults, getResultsByDate, addResult } = useResultStore();
  const { athletes, fetchAthletes } = useAthleteStore();

  const [filters, setFilters] = useState<ResultFiltersState>({
    athleteId: null,
    disciplineId: null,
    type: null,
    timeRange: "all",
  });

  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchResults();
    fetchAthletes();
  }, [fetchResults, fetchAthletes]);

  const resultsByDate = getResultsByDate(filters as ResultFilters);

  const athleteMap = new Map(athletes.map((a) => [a.athlete.id, a.athlete]));
  const athleteList = athletes.map((a) => a.athlete);

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-border-subtle">
        <div>
          <h1 className="text-base font-medium text-foreground">Tulokset</h1>
          <p className="text-[13px] text-text-secondary mt-0.5">
            Kilpailu- ja harjoitustulokset
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="btn-primary btn-press"
        >
          <Plus size={18} />
          Lisää tulos
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <ResultFiltersComponent
          filters={filters}
          onFilterChange={setFilters}
          athletes={athleteList}
        />
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {resultsByDate.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#666666]">
            <FileText size={48} className="mb-4 text-[#444444]" />
            <p className="text-sm font-medium">Ei tuloksia</p>
            <p className="text-[13px] text-[#555555] mt-1">
              {filters.athleteId !== null ||
              filters.disciplineId !== null ||
              filters.type !== null ||
              filters.timeRange !== "all"
                ? "Kokeile muuttaa suodattimia"
                : "Lisää ensimmäinen tulos painamalla yllä olevaa nappia"}
            </p>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {resultsByDate.map(({ date, results }) => (
              <div key={date}>
                {/* Date header */}
                <div className="sticky top-0 bg-background py-2 mb-3 border-b border-white/[0.03]">
                  <h2 className="text-[12px] font-medium text-text-tertiary">
                    {formatDate(date)}
                  </h2>
                </div>

                {/* Results for this date */}
                <div className="space-y-2">
                  {results.map((result) => (
                    <ResultCard
                      key={result.id}
                      result={result}
                      athlete={athleteMap.get(result.athleteId)}
                      discipline={getDisciplineById(result.disciplineId)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Result Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Lisää tulos"
      >
        <ResultForm
          onSave={async (
            result: NewResult,
            medal?: { type: MedalType; competitionName: string }
          ) => {
            await addResult(result, medal);
            setIsFormOpen(false);
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </Dialog>
    </div>
  );
}
