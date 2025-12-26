import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Target, ChevronDown, ChevronUp, Check, X, Trash2 } from "lucide-react";
import { useGoalStore } from "../stores/useGoalStore";
import { useAthleteStore } from "../stores/useAthleteStore";
import { getDisciplineById } from "../data/disciplines";
import { GoalCard } from "../components/goals/GoalCard";
import { GoalForm } from "../components/goals/GoalForm";
import { GoalCelebrationModal } from "../components/goals/GoalCelebrationModal";
import { Dialog, Confetti, toast, FilterSelect, type FilterOption } from "../components/ui";
import { useAddShortcut, useEscapeKey, useBackgroundDeselect } from "../hooks";
import type { Goal, NewGoal, Athlete, Discipline } from "../types";

interface CelebrationGoalData {
  goal: Goal;
  currentBest: number | null;
  progress: number;
  remaining: number | null;
  athlete?: Athlete;
  discipline?: Discipline;
}

type StatusFilter = "active" | "achieved" | "all";

// Key for storing celebrated goal IDs in localStorage
const CELEBRATED_GOALS_KEY = "loikka-celebrated-goals";

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

  const [athleteFilter, setAthleteFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [showAchieved, setShowAchieved] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [celebrationGoals, setCelebrationGoals] = useState<CelebrationGoalData[]>([]);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Keyboard shortcut: Ctrl+U opens add dialog
  useAddShortcut(() => setIsFormOpen(true));

  // Data is fetched in Layout.tsx on app start

  // Get celebrated goal IDs from localStorage
  const getCelebratedGoals = useCallback((): Set<number> => {
    try {
      const stored = localStorage.getItem(CELEBRATED_GOALS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }, []);

  // Save celebrated goal ID to localStorage
  const markGoalAsCelebrated = useCallback((goalId: number) => {
    const celebrated = getCelebratedGoals();
    celebrated.add(goalId);
    localStorage.setItem(CELEBRATED_GOALS_KEY, JSON.stringify([...celebrated]));
  }, [getCelebratedGoals]);

  // Check for newly completed goals that haven't been celebrated yet
  useEffect(() => {
    if (goals.length === 0 || athletes.length === 0) return;

    const celebrated = getCelebratedGoals();
    const athleteMapLocal = new Map(athletes.map((a) => [a.athlete.id, a.athlete]));

    // Find goals that are completed (status = achieved OR progress >= 100) but not yet celebrated
    const newlyCompleted = goals.filter((goal) => {
      if (celebrated.has(goal.id)) return false;

      // Check if goal is achieved by status
      if (goal.status === "achieved") return true;

      // Check if goal is achieved by progress (100%)
      const goalWithProgress = getGoalWithProgress(goal);
      return goalWithProgress.progress >= 100;
    });

    if (newlyCompleted.length > 0) {
      // Prepare data for celebration modal
      const celebrationData: CelebrationGoalData[] = newlyCompleted.map((goal) => {
        const goalWithProgress = getGoalWithProgress(goal);
        return {
          goal,
          currentBest: goalWithProgress.currentBest,
          progress: goalWithProgress.progress,
          remaining: goalWithProgress.remaining,
          athlete: athleteMapLocal.get(goal.athleteId),
          discipline: getDisciplineById(goal.disciplineId),
        };
      });

      setCelebrationGoals(celebrationData);
      setShowCelebrationModal(true);
      setShowConfetti(true);

      // Mark all newly completed goals as celebrated
      newlyCompleted.forEach((goal) => markGoalAsCelebrated(goal.id));
    }
  }, [goals, athletes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Map athlete ID to athlete data
  const athleteMap = useMemo(() => {
    return new Map(athletes.map((a) => [a.athlete.id, a.athlete]));
  }, [athletes]);

  // Filter options for FilterSelect components
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
  const hasSelection = selectedCount > 0;

  return (
    <div className="p-6 h-full flex flex-col" onClick={handleBackgroundClick}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-border-subtle">
        {selectionMode ? (
          <>
            {/* Selection mode header */}
            <h1 className="text-title font-medium text-foreground">
              {hasSelection ? `${selectedCount} valittu` : "Valitse tavoitteita"}
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
            <h1 className="text-title font-medium text-foreground">Tavoitteet</h1>
            <button
              onClick={() => setIsFormOpen(true)}
              className="btn-primary btn-press"
            >
              <Plus size={18} />
              Lisää tavoite
            </button>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Athlete filter */}
        <FilterSelect
          value={athleteFilter ?? "all"}
          onChange={(value) => setAthleteFilter(value === "all" ? null : (value as number))}
          options={athleteOptions}
        />

        {/* Status filter */}
        <FilterSelect
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          options={statusOptions}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Active goals */}
        {(statusFilter === "active" || statusFilter === "all") && (
          <div className="mb-8">
            {displayGoals.active.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Target size={48} className="mb-4 text-tertiary" />
                <p className="text-sm font-medium">Ei aktiivisia tavoitteita</p>
                <p className="text-body text-tertiary mt-1">
                  {athleteFilter !== null
                    ? "Ei tavoitteita tälle urheilijalle"
                    : "Lisää ensimmäinen tavoite painamalla yllä olevaa nappia"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayGoals.active.map((goalWithProgress) => (
                  <GoalCard
                    key={goalWithProgress.id}
                    goal={goalWithProgress}
                    currentBest={goalWithProgress.currentBest}
                    progress={goalWithProgress.progress}
                    remaining={goalWithProgress.remaining}
                    athlete={athleteMap.get(goalWithProgress.athleteId)}
                    discipline={getDisciplineById(goalWithProgress.disciplineId)}
                    selectionMode={selectionMode}
                    isSelected={selectedIds.has(goalWithProgress.id)}
                    onCheckboxClick={() => handleCheckboxClick(goalWithProgress.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Achieved goals */}
        {(statusFilter === "achieved" || statusFilter === "all") &&
          displayGoals.achieved.length > 0 && (
            <div>
              {/* Collapsible header */}
              {statusFilter === "all" && (
                <button
                  onClick={() => setShowAchieved(!showAchieved)}
                  className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer"
                >
                  {showAchieved ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronUp size={16} />
                  )}
                  <span>Saavutetut tavoitteet</span>
                  <span className="text-body font-normal text-tertiary">
                    ({displayGoals.achieved.length})
                  </span>
                </button>
              )}

              {(statusFilter !== "all" || showAchieved) && (
                <>
                  {statusFilter === "achieved" && (
                    <h2 className="flex items-center gap-2 mb-4 text-sm font-medium text-foreground">
                      <Check size={16} className="text-success" />
                      Saavutetut tavoitteet
                    </h2>
                  )}

                  {displayGoals.achieved.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground bg-card rounded-lg">
                      <p className="text-body">
                        Ei vielä saavutettuja tavoitteita
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {displayGoals.achieved.map((goalWithProgress) => (
                        <GoalCard
                          key={goalWithProgress.id}
                          goal={goalWithProgress}
                          currentBest={goalWithProgress.currentBest}
                          progress={goalWithProgress.progress}
                          remaining={goalWithProgress.remaining}
                          athlete={athleteMap.get(goalWithProgress.athleteId)}
                          discipline={getDisciplineById(
                            goalWithProgress.disciplineId
                          )}
                          selectionMode={selectionMode}
                          isSelected={selectedIds.has(goalWithProgress.id)}
                          onCheckboxClick={() => handleCheckboxClick(goalWithProgress.id)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        {/* Empty state for achieved filter */}
        {statusFilter === "achieved" && displayGoals.achieved.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Check size={48} className="mb-4 text-tertiary" />
            <p className="text-sm font-medium">
              Ei saavutettuja tavoitteita
            </p>
            <p className="text-body text-tertiary mt-1">
              Saavutetut tavoitteet näkyvät täällä
            </p>
          </div>
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
        onClose={() => setShowCelebrationModal(false)}
        achievedGoals={celebrationGoals}
      />

      {/* Confetti celebration for achieved goals */}
      <Confetti
        active={showConfetti}
        onComplete={() => setShowConfetti(false)}
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
