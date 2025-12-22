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
  // Goal is completed when progress reaches 100% (even if not yet marked in DB)
  const isCompleted = progress >= 100 || isAchieved;
  // Show "Lähellä!" only when close but not yet completed
  const isCloseToGoal = progress >= 90 && progress < 100 && !isCompleted;

  const formatValue = (value: number | null) => {
    if (value === null) return "-";
    if (!discipline) return value.toString();
    return discipline.unit === "time" ? formatTime(value) : formatDistance(value);
  };

  const athleteName = athlete
    ? `${athlete.firstName} ${athlete.lastName}`
    : "Tuntematon urheilija";

  const disciplineName = discipline?.fullName ?? "Tuntematon laji";

  // Calculate progress bar color - accent color when completed or close
  const getProgressColor = () => {
    if (isCompleted || isCloseToGoal) return "bg-[var(--accent)]";
    return "bg-muted";
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-4 border transition-colors duration-150 bg-card border-border-subtle hover:border-border-hover ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{athleteName}</span>
            {isCompleted && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-caption font-medium bg-transparent text-[var(--text-muted)] border border-[var(--border-hover)]">
                <Check size={12} />
                Saavutettu
              </span>
            )}
            {isCloseToGoal && (
              <span className="px-1.5 py-0.5 rounded text-caption font-medium bg-transparent text-[var(--text-muted)] border border-[var(--border-hover)]">
                Lähellä!
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{disciplineName}</p>
        </div>
        <div className="p-2 bg-muted rounded-lg">
          <Target size={20} className="text-tertiary" />
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
        {!isCompleted && remaining !== null && (
          <div>
            <span className="text-muted-foreground">Jäljellä:</span>
            <p className="font-medium">{formatValue(remaining)}</p>
          </div>
        )}
        {goal.achievedAt && (
          <div>
            <span className="text-muted-foreground">Saavutettu:</span>
            <p className="font-medium">{formatDate(goal.achievedAt)}</p>
          </div>
        )}
      </div>

      {/* Target date */}
      {goal.targetDate && !isCompleted && (
        <div className="mt-3 pt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar size={14} />
          <span>DDL: {formatDate(goal.targetDate)}</span>
        </div>
      )}
    </div>
  );
}
