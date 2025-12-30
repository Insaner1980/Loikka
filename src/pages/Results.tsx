import { useState, useMemo, useCallback } from "react";
import { Plus, FileText, X, Trash2 } from "lucide-react";
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
import { useAddShortcut, useEscapeKey, useBackgroundDeselect } from "../hooks";
import type { NewResult, MedalType, Result } from "../types";

export function Results() {
  const { results, getResultsByDate, addResult, deleteResultsBulk } = useResultStore();
  const { athletes } = useAthleteStore();

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

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Keyboard shortcut: Ctrl+U opens add dialog
  useAddShortcut(() => setIsFormOpen(true));

  // Esc exits selection mode
  useEscapeKey(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, selectionMode);

  const handleEditResult = (result: Result) => {
    setSelectedResult(result);
    setIsEditDialogOpen(true);
  };

  // Toggle selection for a result
  const handleCheckboxClick = useCallback((resultId: number) => {
    // If not in selection mode, enter it
    if (!selectionMode) {
      setSelectionMode(true);
    }

    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  }, [selectionMode]);

  // Cancel selection mode
  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Click on empty area exits selection mode
  const handleBackgroundClick = useBackgroundDeselect(selectionMode, handleCancelSelection);

  // Confirm bulk delete
  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    await deleteResultsBulk(ids);
    setBulkDeleteConfirmOpen(false);
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [selectedIds, deleteResultsBulk]);

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  // Data is fetched in Layout.tsx on app start

  const athleteMap = useMemo(
    () => new Map(athletes.map((a) => [a.athlete.id, a.athlete])),
    [athletes]
  );
  const athleteList = useMemo(() => athletes.map((a) => a.athlete), [athletes]);

  // Create a lookup for combined event names (result id -> discipline name)
  // This is used to show "3-ottelu" under sub-results
  const combinedEventNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const result of results) {
      const discipline = getDisciplineById(result.disciplineId);
      if (discipline?.category === "combined") {
        map.set(result.id, discipline.name);
      }
    }
    return map;
  }, [results]);

  const resultsByDate = useMemo(
    () => getResultsByDate(filters as ResultFilters, athleteList),
    [results, filters, athleteList] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="p-6 h-full flex flex-col" onClick={handleBackgroundClick}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-border-subtle">
        {selectionMode ? (
          <>
            {/* Selection mode header */}
            <h1 className="text-title font-medium text-foreground">
              {hasSelection ? `${selectedCount} valittu` : "Valitse tuloksia"}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBulkDeleteConfirmOpen(true)}
                disabled={!hasSelection}
                className="btn-secondary btn-press"
              >
                <Trash2 size={16} />
                Poista
              </button>
              <button
                onClick={handleCancelSelection}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="Peruuta valinta"
              >
                <X size={18} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Normal header */}
            <h1 className="text-title font-medium text-foreground">Tulokset</h1>
            <button
              onClick={() => setIsFormOpen(true)}
              className="btn-primary btn-press"
            >
              <Plus size={18} />
              Lisää tulos
            </button>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <ResultFiltersComponent
          filters={filters}
          onFilterChange={setFilters}
          athletes={athleteList}
          results={results}
        />
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {resultsByDate.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileText size={48} className="mb-4 text-tertiary" />
            <p className="text-body font-medium">Ei tuloksia</p>
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
                  <h2 className="text-caption font-medium text-tertiary">
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
                      onEdit={() => handleEditResult(result)}
                      selectionMode={selectionMode}
                      isSelected={selectedIds.has(result.id)}
                      onCheckboxClick={() => handleCheckboxClick(result.id)}
                      combinedEventName={result.combinedEventId ? combinedEventNameMap.get(result.combinedEventId) : undefined}
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
        maxWidth="3xl"
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

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        title="Poista tulokset"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-body text-muted-foreground">
            Haluatko varmasti poistaa {selectedCount} {selectedCount === 1 ? "tuloksen" : "tulosta"}? Tätä toimintoa ei voi perua.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setBulkDeleteConfirmOpen(false)}
              className="btn-secondary"
            >
              Peruuta
            </button>
            <button
              onClick={handleBulkDelete}
              className="btn-primary"
            >
              Poista
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
