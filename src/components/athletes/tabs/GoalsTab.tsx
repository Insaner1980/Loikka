import { Target, CheckCircle, Trash2 } from "lucide-react";
import { formatTime, formatDistance, formatDate } from "../../../lib/formatters";
import type { Goal, Discipline } from "../../../types";

interface GoalsTabProps {
  goals: Goal[];
  getDisciplineForGoal: (disciplineId: number) => Discipline | undefined;
  onDeleteGoal?: (goal: Goal) => void;
}

export function GoalsTab({ goals, getDisciplineForGoal, onDeleteGoal }: GoalsTabProps) {
  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Target size={48} className="text-icon-muted mb-4" />
        <h2 className="text-sm font-medium text-muted-foreground mb-1.5">Ei tavoitteita</h2>
        <p className="text-body text-tertiary">
          Lisää ensimmäinen tavoite
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {goals.map((goal) => {
        const discipline = getDisciplineForGoal(goal.disciplineId);
        const isAchieved = goal.status === "achieved";

        // Format target value based on discipline unit
        const formattedTarget = discipline
          ? discipline.unit === "time"
            ? formatTime(goal.targetValue)
            : formatDistance(goal.targetValue)
          : goal.targetValue.toString();

        return (
          <div
            key={goal.id}
            className="rounded-xl bg-card border border-border-subtle p-4 flex flex-col"
          >
            {/* Top: Icon + discipline + delete */}
            <div className="flex items-center gap-2 mb-3">
              {isAchieved ? (
                <CheckCircle size={18} className="text-muted-foreground shrink-0" />
              ) : (
                <Target size={18} className="text-muted-foreground shrink-0" />
              )}
              <span className="text-sm font-medium text-foreground truncate flex-1">
                {discipline?.fullName || "Tuntematon laji"}
              </span>
              {onDeleteGoal && (
                <button
                  onClick={() => onDeleteGoal(goal)}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Center: Target value (big) */}
            <div className="flex-1 flex flex-col items-center justify-center py-2">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {formattedTarget}
              </span>
              {isAchieved && (
                <span className="px-1.5 py-0.5 mt-1.5 rounded text-caption font-medium bg-transparent text-[var(--text-muted)] border border-[var(--border-hover)]">
                  Saavutettu
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-border my-3" />

            {/* Bottom: Dates */}
            <div className="text-sm text-muted-foreground text-center">
              {goal.targetDate && (
                <div>DDL: {formatDate(goal.targetDate)}</div>
              )}
              {goal.achievedAt && (
                <div className="text-foreground mt-0.5">
                  {formatDate(goal.achievedAt)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
