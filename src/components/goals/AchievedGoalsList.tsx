import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { GoalCard } from "./GoalCard";
import { getDisciplineById } from "../../data/disciplines";
import type { GoalWithProgress, Athlete } from "../../types";
import type { StatusFilter } from "./GoalsFilters";

interface AchievedGoalsListProps {
  goals: GoalWithProgress[];
  statusFilter: StatusFilter;
  showAchieved: boolean;
  onToggleShowAchieved: () => void;
  athleteMap: Map<number, Athlete>;
  selectionMode: boolean;
  selectedIds: Set<number>;
  onCheckboxClick: (goalId: number) => void;
}

export function AchievedGoalsList({
  goals,
  statusFilter,
  showAchieved,
  onToggleShowAchieved,
  athleteMap,
  selectionMode,
  selectedIds,
  onCheckboxClick,
}: AchievedGoalsListProps) {
  if (goals.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Collapsible header - only shown when viewing "all" */}
      {statusFilter === "all" && (
        <button
          onClick={onToggleShowAchieved}
          className="flex items-center gap-2 mb-4 text-body font-medium text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer"
        >
          {showAchieved ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronUp size={16} />
          )}
          <span>Saavutetut tavoitteet</span>
          <span className="text-body font-normal text-tertiary">
            ({goals.length})
          </span>
        </button>
      )}

      {(statusFilter !== "all" || showAchieved) && (
        <>
          {statusFilter === "achieved" && (
            <h2 className="flex items-center gap-2 mb-4 text-body font-medium text-foreground">
              <Check size={16} className="text-success" />
              Saavutetut tavoitteet
            </h2>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {goals.map((goalWithProgress) => (
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
                onCheckboxClick={() => onCheckboxClick(goalWithProgress.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
