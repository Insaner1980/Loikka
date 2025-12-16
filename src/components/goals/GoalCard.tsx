import { Check, Calendar, Target } from "lucide-react";
import type { Athlete, Discipline, Goal } from "../../types";
import { formatTime, formatDistance, formatDate } from "../../lib/formatters";

interface GoalCardProps {
  goal: Goal;
  currentBest: number | null;
  progress: number;
  remaining: number | null;
  athlete?: Athlete;
  discipline?: Discipline;
  onClick?: () => void;
}

export function GoalCard({
  goal,
  currentBest,
  progress,
  remaining,
  athlete,
  discipline,
  onClick,
}: GoalCardProps) {
  const isAchieved = goal.status === "achieved";
  const isCloseToGoal = progress >= 90 && !isAchieved;

  const formatValue = (value: number | null) => {
    if (value === null) return "-";
    if (!discipline) return value.toString();
    return discipline.unit === "time" ? formatTime(value) : formatDistance(value);
  };

  const athleteName = athlete
    ? `${athlete.firstName} ${athlete.lastName}`
    : "Tuntematon urheilija";

  const disciplineName = discipline?.fullName ?? "Tuntematon laji";

  // Calculate progress bar color
  const getProgressColor = () => {
    if (isAchieved) return "bg-success";
    if (isCloseToGoal) return "bg-primary";
    return "bg-secondary";
  };

  return (
    <div
      onClick={onClick}
      className={`bg-card rounded-xl border p-4 transition-all ${
        onClick ? "cursor-pointer hover:shadow-md" : ""
      } ${
        isAchieved
          ? "border-success/50 bg-success/5"
          : isCloseToGoal
            ? "border-primary/50"
            : "border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{athleteName}</span>
            {isAchieved && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-success text-white">
                <Check size={12} />
                Saavutettu
              </span>
            )}
            {isCloseToGoal && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary">
                Lähellä!
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{disciplineName}</p>
        </div>
        <div className="p-2 bg-muted rounded-lg">
          <Target size={20} className="text-muted-foreground" />
        </div>
      </div>

      {/* Target */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Tavoite:</span>
          <span className="text-xl font-bold">{formatValue(goal.targetValue)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">Edistyminen</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getProgressColor()}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Nykyinen:</span>
          <p className="font-medium">{formatValue(currentBest)}</p>
        </div>
        {!isAchieved && remaining !== null && (
          <div>
            <span className="text-muted-foreground">Jäljellä:</span>
            <p className="font-medium">{formatValue(remaining)}</p>
          </div>
        )}
        {isAchieved && goal.achievedAt && (
          <div>
            <span className="text-muted-foreground">Saavutettu:</span>
            <p className="font-medium">{formatDate(goal.achievedAt)}</p>
          </div>
        )}
      </div>

      {/* Target date */}
      {goal.targetDate && !isAchieved && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar size={14} />
          <span>DDL: {formatDate(goal.targetDate)}</span>
        </div>
      )}
    </div>
  );
}
