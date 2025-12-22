import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { ResultEditDialog } from "../components/results/ResultEditDialog";
import { Dialog } from "../components/ui/Dialog";
import type { NewResult, MedalType, Result } from "../types";

export function Results() {
  const navigate = useNavigate();
  const { results, fetchResults, getResultsByDate, addResult, deleteResult } = useResultStore();
  const { athletes, fetchAthletes } = useAthleteStore();

  const [filters, setFilters] = useState<ResultFiltersState>({
    athleteId: null,
    disciplineId: null,
    type: null,
    year: null,
    ageCategory: null,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmResult, setDeleteConfirmResult] = useState<Result | null>(null);

  const handleEditResult = (result: Result) => {
    setSelectedResult(result);
    setIsEditDialogOpen(true);
  };

  const handleDeleteResult = (result: Result) => {
    setDeleteConfirmResult(result);
  };

  const confirmDelete = async () => {
    if (deleteConfirmResult) {
      await deleteResult(deleteConfirmResult.id);
      setDeleteConfirmResult(null);
    }
  };

  useEffect(() => {
    fetchResults();
    fetchAthletes();
  }, [fetchResults, fetchAthletes]);

  const athleteMap = useMemo(
    () => new Map(athletes.map((a) => [a.athlete.id, a.athlete])),
    [athletes]
  );
  const athleteList = useMemo(() => athletes.map((a) => a.athlete), [athletes]);

  const resultsByDate = useMemo(
    () => getResultsByDate(filters as ResultFilters, athleteList),
    [results, filters, athleteList, getResultsByDate]
  );

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-border-subtle">
        <h1 className="text-title font-medium text-foreground">Tulokset</h1>
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
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileText size={48} className="mb-4 text-tertiary" />
            <p className="text-sm font-medium">Ei tuloksia</p>
            <p className="text-body text-tertiary mt-1">
              {filters.athleteId !== null ||
              filters.disciplineId !== null ||
              filters.type !== null ||
              filters.year !== null ||
              filters.ageCategory !== null
                ? "Kokeile muuttaa suodattimia"
                : "Lisää ensimmäinen tulos painamalla yllä olevaa nappia"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {resultsByDate.map(({ date, results }) => (
              <div key={date}>
                {/* Date header */}
                <div className="sticky top-0 bg-background py-2 mb-3 border-b border-border-subtle">
                  <h2 className="text-xs font-medium text-tertiary">
                    {formatDate(date)}
                  </h2>
                </div>

                {/* Results for this date */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {results.map((result) => (
                    <ResultCard
                      key={result.id}
                      result={result}
                      athlete={athleteMap.get(result.athleteId)}
                      discipline={getDisciplineById(result.disciplineId)}
                      onClick={() => navigate(`/athletes/${result.athleteId}?discipline=${result.disciplineId}`)}
                      onEdit={() => handleEditResult(result)}
                      onDelete={() => handleDeleteResult(result)}
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

      {/* Edit Result Dialog */}
      <ResultEditDialog
        result={selectedResult}
        open={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedResult(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmResult !== null}
        onClose={() => setDeleteConfirmResult(null)}
        title="Poista tulos"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Haluatko varmasti poistaa tämän tuloksen? Tätä toimintoa ei voi
            perua.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteConfirmResult(null)}
              className="btn-secondary"
            >
              Peruuta
            </button>
            <button
              onClick={confirmDelete}
              className="btn-primary bg-[var(--status-error)] hover:bg-[var(--status-error)]/90 cursor-pointer"
            >
              Poista
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
