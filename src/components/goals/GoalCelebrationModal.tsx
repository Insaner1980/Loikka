import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Trophy } from "lucide-react";
import type { Athlete, Discipline, Goal } from "../../types";
import { GoalCard } from "./GoalCard";

interface GoalWithProgress {
  goal: Goal;
  currentBest: number | null;
  progress: number;
  remaining: number | null;
  athlete?: Athlete;
  discipline?: Discipline;
}

interface GoalCelebrationModalProps {
  open: boolean;
  onClose: () => void;
  achievedGoals: GoalWithProgress[];
}

export function GoalCelebrationModal({
  open,
  onClose,
  achievedGoals,
}: GoalCelebrationModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open || achievedGoals.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-12">
      {/* Backdrop - clickable to close */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--accent)]/20 mb-4">
            <Trophy size={32} className="text-[var(--accent)]" />
          </div>
          <h2 className="text-heading font-bold text-foreground mb-2">
            {achievedGoals.length === 1
              ? "Tavoite saavutettu!"
              : `${achievedGoals.length} tavoitetta saavutettu!`}
          </h2>
          <p className="text-muted-foreground">
            Hienoa työtä! Jatka samaan malliin.
          </p>
        </div>

        {/* Goal cards */}
        <div className="space-y-3 max-h-[40vh] overflow-y-auto px-1">
          {achievedGoals.map((goalData) => (
            <GoalCard
              key={goalData.goal.id}
              goal={goalData.goal}
              currentBest={goalData.currentBest}
              progress={goalData.progress}
              remaining={goalData.remaining}
              athlete={goalData.athlete}
              discipline={goalData.discipline}
            />
          ))}
        </div>

        {/* Close button */}
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="btn-primary btn-press px-8"
          >
            Jatka
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
