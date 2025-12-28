import { useState, useMemo, useCallback } from "react";
import { useGoalStore } from "../stores/useGoalStore";
import { useAthleteStore } from "../stores/useAthleteStore";
import {
  GoalForm,
  GoalsHeader,
  GoalsFilters,
  ActiveGoalsList,
  AchievedGoalsList,
  AchievedEmptyState,
  GoalCelebrationModal,
  type StatusFilter,
} from "../components/goals";
import { Dialog, Confetti, toast } from "../components/ui";
import { useAddShortcut, useEscapeKey, useBackgroundDeselect, useGoalCelebration } from "../hooks";
import type { NewGoal } from "../types";

export function Goals() {
  const {
    goals,
    addGoal,
    deleteGoal,
    getActiveGoals,
    getAchievedGoals,
    getGoalWithProgress,
  } = useGoalStore();
  const { athletes } = useAthleteStore();

  // Filters
  const [athleteFilter, setAthleteFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [showAchieved, setShowAchieved] = useState(true);

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Celebration hook
  const {
    showConfetti,
    showCelebrationModal,
    celebrationGoals,
    closeCelebrationModal,
    onConfettiComplete,
  } = useGoalCelebration();

  // Keyboard shortcut: Ctrl+U opens add dialog
  useAddShortcut(() => setIsFormOpen(true));

  // Map athlete ID to athlete data
  const athleteMap = useMemo(() => {
    return new Map(athletes.map((a) => [a.athlete.id, a.athlete]));
  }, [athletes]);

  // Filter and process goals
  const activeGoals = useMemo(() => {
    let filtered = getActiveGoals();

    if (athleteFilter !== null) {
      filtered = filtered.filter((g) => g.athleteId === athleteFilter);
    }

    // Get progress for each goal and sort by progress (closest to goal first)
    return filtered
      .map((goal) => getGoalWithProgress(goal))
      .sort((a, b) => b.progress - a.progress);
  }, [goals, athleteFilter, getActiveGoals, getGoalWithProgress]);

  const achievedGoals = useMemo(() => {
    let filtered = getAchievedGoals();

    if (athleteFilter !== null) {
      filtered = filtered.filter((g) => g.athleteId === athleteFilter);
    }

    return filtered.map((goal) => getGoalWithProgress(goal));
  }, [goals, athleteFilter, getAchievedGoals, getGoalWithProgress]);

  // Determine which goals to show based on filter
  const displayGoals = useMemo(() => {
    switch (statusFilter) {
      case "active":
        return { active: activeGoals, achieved: [] };
      case "achieved":
        return { active: [], achieved: achievedGoals };
      case "all":
        return { active: activeGoals, achieved: achievedGoals };
    }
  }, [statusFilter, activeGoals, achievedGoals]);

  const handleSaveGoal = async (goalData: NewGoal) => {
    await addGoal(goalData);
    setIsFormOpen(false);
  };

  // Esc exits selection mode
  useEscapeKey(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, selectionMode);

  // Toggle selection for a goal
  const handleCheckboxClick = useCallback((goalId: number) => {
    if (!selectionMode) {
      setSelectionMode(true);
    }

    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
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

    for (const id of ids) {
      await deleteGoal(id);
    }
    toast.success(`${ids.length} tavoitetta poistettu`);
    setBulkDeleteConfirmOpen(false);
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [selectedIds, deleteGoal]);

  const selectedCount = selectedIds.size;

  return (
    <div className="p-6 h-full flex flex-col" onClick={handleBackgroundClick}>
      {/* Header */}
      <GoalsHeader
        selectionMode={selectionMode}
        selectedCount={selectedCount}
        onAddClick={() => setIsFormOpen(true)}
        onDeleteClick={() => setBulkDeleteConfirmOpen(true)}
        onCancelSelection={handleCancelSelection}
      />

      {/* Filters */}
      <GoalsFilters
        athletes={athletes}
        athleteFilter={athleteFilter}
        statusFilter={statusFilter}
        onAthleteFilterChange={setAthleteFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Active goals */}
        {(statusFilter === "active" || statusFilter === "all") && (
          <div className="mb-8">
            <ActiveGoalsList
              goals={displayGoals.active}
              athleteFilter={athleteFilter}
              athleteMap={athleteMap}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onCheckboxClick={handleCheckboxClick}
            />
          </div>
        )}

        {/* Achieved goals */}
        {(statusFilter === "achieved" || statusFilter === "all") &&
          displayGoals.achieved.length > 0 && (
            <AchievedGoalsList
              goals={displayGoals.achieved}
              statusFilter={statusFilter}
              showAchieved={showAchieved}
              onToggleShowAchieved={() => setShowAchieved(!showAchieved)}
              athleteMap={athleteMap}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onCheckboxClick={handleCheckboxClick}
            />
          )}

        {/* Empty state for achieved filter */}
        {statusFilter === "achieved" && displayGoals.achieved.length === 0 && (
          <AchievedEmptyState />
        )}
      </div>

      {/* Add Goal Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Lisää tavoite"
        maxWidth="2xl"
      >
        <GoalForm
          onSave={handleSaveGoal}
          onCancel={() => setIsFormOpen(false)}
        />
      </Dialog>

      {/* Celebration modal for achieved goals */}
      <GoalCelebrationModal
        open={showCelebrationModal}
        onClose={closeCelebrationModal}
        achievedGoals={celebrationGoals}
      />

      {/* Confetti celebration for achieved goals */}
      <Confetti
        active={showConfetti}
        onComplete={onConfettiComplete}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        title="Poista tavoitteet"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-body text-muted-foreground">
            Haluatko varmasti poistaa {selectedCount} {selectedCount === 1 ? "tavoitteen" : "tavoitetta"}? Tätä toimintoa ei voi perua.
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
