import { Target } from "lucide-react";
import { GoalCard } from "./GoalCard";
import { getDisciplineById } from "../../data/disciplines";
import type { GoalWithProgress, Athlete } from "../../types";

interface ActiveGoalsListProps {
  goals: GoalWithProgress[];
  athleteFilter: number | null;
  athleteMap: Map<number, Athlete>;
  selectionMode: boolean;
  selectedIds: Set<number>;
  onCheckboxClick: (goalId: number) => void;
}

export function ActiveGoalsList({
  goals,
  athleteFilter,
  athleteMap,
  selectionMode,
  selectedIds,
  onCheckboxClick,
}: ActiveGoalsListProps) {
  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <Target size={48} className="mb-4 text-tertiary" />
        <p className="text-body font-medium">Ei aktiivisia tavoitteita</p>
        <p className="text-body text-tertiary mt-1">
          {athleteFilter !== null
            ? "Ei tavoitteita tälle urheilijalle"
            : "Lisää ensimmäinen tavoite painamalla yllä olevaa nappia"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
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
  );
}
