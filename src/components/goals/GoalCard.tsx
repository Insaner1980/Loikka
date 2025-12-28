import { memo, useCallback } from "react";
import { Check, Calendar } from "lucide-react";
import type { Athlete, Discipline, Goal } from "../../types";
import { formatTime, formatDistance, formatDate } from "../../lib/formatters";
import { HoverCheckbox } from "../ui";

interface GoalCardProps {
  goal: Goal;
  currentBest: number | null;
  progress: number;
  remaining: number | null;
  athlete?: Athlete;
  discipline?: Discipline;
  onClick?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onCheckboxClick?: () => void;
}

export const GoalCard = memo(function GoalCard({
  goal,
  currentBest,
  progress,
  remaining,
  athlete,
  discipline,
  onClick,
  selectionMode = false,
  isSelected = false,
  onCheckboxClick,
}: GoalCardProps) {
  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckboxClick?.();
  }, [onCheckboxClick]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // If Ctrl/Cmd is held, treat as checkbox click
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation();
      onCheckboxClick?.();
      return;
    }
    // In selection mode, clicking card toggles selection
    if (selectionMode) {
      onCheckboxClick?.();
      return;
    }
    onClick?.();
  }, [onClick, onCheckboxClick, selectionMode]);
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
      data-card
      onClick={handleCardClick}
      className={`group relative rounded-xl p-4 border transition-colors duration-150 bg-card card-interactive ${
        isSelected
          ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
          : "border-border-subtle hover:border-border-hover"
      } ${onClick || selectionMode ? "cursor-pointer" : ""}`}
    >
      {/* Hover checkbox - only shown when onCheckboxClick is provided */}
      {onCheckboxClick && (
        <div
          className={`absolute top-3 right-3 z-10 transition-all duration-200 ${
            isSelected
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto"
          }`}
        >
          <HoverCheckbox
            isSelected={isSelected}
            onClick={handleCheckboxClick}
            itemType="tavoite"
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">{athleteName}</span>
          {isCompleted && (
            <span className="badge-status flex items-center gap-1">
              <Check size={12} />
              Saavutettu
            </span>
          )}
          {isCloseToGoal && (
            <span className="badge-status">
              Lähellä!
            </span>
          )}
        </div>
        <p className="text-body text-muted-foreground">{disciplineName}</p>
      </div>

      {/* Target */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between">
          <span className="text-body text-muted-foreground">Tavoite:</span>
          <span className="text-heading font-bold">{formatValue(goal.targetValue)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-body mb-1">
          <span className="text-muted-foreground">Edistyminen</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${getProgressColor()}`}
            style={{
              width: `${Math.min(100, progress)}%`,
              transition: "width 500ms ease-out"
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 text-body">
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
        <div className="mt-3 pt-3 flex items-center gap-2 text-body text-muted-foreground">
          <Calendar size={14} />
          <span>DDL: {formatDate(goal.targetDate)}</span>
        </div>
      )}
    </div>
  );
});
