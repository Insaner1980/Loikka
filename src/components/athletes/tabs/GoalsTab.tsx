import { Target } from "lucide-react";
import { formatTime, formatDistance, formatDate } from "../../../lib/formatters";
import type { Goal, Discipline } from "../../../types";

interface GoalsTabProps {
  goals: Goal[];
  getDisciplineForGoal: (disciplineId: number) => Discipline | undefined;
}

export function GoalsTab({ goals, getDisciplineForGoal }: GoalsTabProps) {
  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Target size={48} className="text-icon-muted mb-4" />
        <h2 className="text-body font-medium text-muted-foreground mb-1.5">Ei tavoitteita</h2>
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
            {/* Top: Discipline name */}
            <div className="mb-3">
              <span className="text-body font-medium text-foreground">
                {discipline?.fullName || "Tuntematon laji"}
              </span>
            </div>

            {/* Center: Target value (big) */}
            <div className="flex-1 flex flex-col items-center justify-center py-2">
              <span className="text-stat font-bold tabular-nums text-foreground">
                {formattedTarget}
              </span>
              {isAchieved && (
                <span className="badge-status mt-1.5">
                  Saavutettu
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-border my-3" />

            {/* Bottom: Dates */}
            <div className="text-body text-muted-foreground text-center">
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
