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
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tulokset</h1>
          <p className="text-muted-foreground">
            Kilpailu- ja harjoitustulokset
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 bg-primary text-black px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
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
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileText size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">Ei tuloksia</p>
            <p className="text-sm">
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
                <div className="sticky top-0 bg-background py-2 mb-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
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
