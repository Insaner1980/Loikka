import { useState, useEffect, useMemo } from "react";
import { Plus, Target, ChevronDown, ChevronUp, Check } from "lucide-react";
import { useGoalStore } from "../stores/useGoalStore";
import { useAthleteStore } from "../stores/useAthleteStore";
import { useResultStore } from "../stores/useResultStore";
import { getDisciplineById } from "../data/disciplines";
import { GoalCard } from "../components/goals/GoalCard";
import { GoalForm } from "../components/goals/GoalForm";
import { Dialog } from "../components/ui/Dialog";
import type { NewGoal } from "../types";

type StatusFilter = "active" | "achieved" | "all";

export function Goals() {
  const {
    goals,
    fetchGoals,
    addGoal,
    getActiveGoals,
    getAchievedGoals,
    getGoalWithProgress,
  } = useGoalStore();
  const { athletes, fetchAthletes } = useAthleteStore();
  const { fetchResults } = useResultStore();

  const [athleteFilter, setAthleteFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [showAchieved, setShowAchieved] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchGoals();
    fetchAthletes();
    fetchResults();
  }, [fetchGoals, fetchAthletes, fetchResults]);

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

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-border-subtle">
        <h1 className="text-base font-medium text-foreground">Tavoitteet</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="btn-primary btn-press"
        >
          <Plus size={18} />
          Lisää tavoite
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Athlete filter */}
        <select
          className="bg-[#141414] rounded-md px-3 py-2 text-[13px] input-focus"
          value={athleteFilter ?? ""}
          onChange={(e) =>
            setAthleteFilter(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">Kaikki urheilijat</option>
          {athletes.map(({ athlete }) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.firstName} {athlete.lastName}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          className="bg-[#141414] rounded-md px-3 py-2 text-[13px] input-focus"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="active">Aktiiviset</option>
          <option value="achieved">Saavutetut</option>
          <option value="all">Kaikki</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Active goals */}
        {(statusFilter === "active" || statusFilter === "all") && (
          <div className="mb-8">
            {displayGoals.active.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#666666]">
                <Target size={48} className="mb-4 text-[#444444]" />
                <p className="text-sm font-medium">Ei aktiivisia tavoitteita</p>
                <p className="text-[13px] text-[#555555] mt-1">
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
                  className="flex items-center gap-2 mb-4 text-sm font-medium text-text-secondary hover:text-foreground transition-colors duration-150"
                >
                  {showAchieved ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronUp size={16} />
                  )}
                  <span>Saavutetut tavoitteet</span>
                  <span className="text-[13px] font-normal text-text-tertiary">
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
                    <div className="flex flex-col items-center justify-center h-32 text-[#666666] bg-[#141414] rounded-lg">
                      <p className="text-[13px]">
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
          <div className="flex flex-col items-center justify-center h-48 text-[#666666]">
            <Check size={48} className="mb-4 text-[#444444]" />
            <p className="text-sm font-medium">
              Ei saavutettuja tavoitteita
            </p>
            <p className="text-[13px] text-[#555555] mt-1">
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
      >
        <GoalForm
          onSave={handleSaveGoal}
          onCancel={() => setIsFormOpen(false)}
        />
      </Dialog>
    </div>
  );
}
