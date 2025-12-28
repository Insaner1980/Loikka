import { useState, useEffect, useCallback } from "react";
import { useGoalStore } from "../stores/useGoalStore";
import { useAthleteStore } from "../stores/useAthleteStore";
import { getDisciplineById } from "../data/disciplines";
import type { Goal, Athlete, Discipline } from "../types";

export interface CelebrationGoalData {
  goal: Goal;
  currentBest: number | null;
  progress: number;
  remaining: number | null;
  athlete?: Athlete;
  discipline?: Discipline;
}

const CELEBRATED_GOALS_KEY = "loikka-celebrated-goals";

export function useGoalCelebration() {
  const { goals, getGoalWithProgress } = useGoalStore();
  const { athletes } = useAthleteStore();

  const [showConfetti, setShowConfetti] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [celebrationGoals, setCelebrationGoals] = useState<CelebrationGoalData[]>([]);

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

  const closeCelebrationModal = useCallback(() => {
    setShowCelebrationModal(false);
  }, []);

  const onConfettiComplete = useCallback(() => {
    setShowConfetti(false);
  }, []);

  return {
    showConfetti,
    showCelebrationModal,
    celebrationGoals,
    closeCelebrationModal,
    onConfettiComplete,
  };
}
