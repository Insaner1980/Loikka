import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Goal, NewGoal, GoalStatus, GoalWithProgress } from "../types";
import { getDisciplineById } from "../data/disciplines";
import { useResultStore } from "./useResultStore";
import { getErrorMessage } from "../lib";

interface GoalStore {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  fetchGoals: () => Promise<void>;
  addGoal: (goal: NewGoal) => Promise<Goal>;
  updateGoal: (id: number, data: Partial<NewGoal>) => Promise<void>;
  deleteGoal: (id: number) => Promise<void>;
  markAchieved: (goalId: number) => Promise<void>;
  abandonGoal: (goalId: number) => Promise<void>;
  getActiveGoals: () => Goal[];
  getAchievedGoals: () => Goal[];
  getGoalsByAthlete: (athleteId: number) => Goal[];
  calculateProgress: (goal: Goal, currentBest: number | null) => number;
  getGoalWithProgress: (goal: Goal) => GoalWithProgress;
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: [],
  loading: false,
  error: null,

  fetchGoals: async (force = false) => {
    const state = get();
    // Skip if already loaded (unless forced)
    if (!force && state.goals.length > 0) {
      return;
    }
    // Prevent concurrent fetches
    if (state.loading) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const goals = await invoke<Goal[]>("get_all_goals");
      set({ goals, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
    }
  },

  addGoal: async (goalData: NewGoal) => {
    set({ loading: true, error: null });
    try {
      const newGoal = await invoke<Goal>("create_goal", {
        goal: {
          athleteId: goalData.athleteId,
          disciplineId: goalData.disciplineId,
          targetValue: goalData.targetValue,
          targetDate: goalData.targetDate || null,
        },
      });

      const goals = await invoke<Goal[]>("get_all_goals");
      set({ goals, loading: false });

      return newGoal;
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  updateGoal: async (id: number, data: Partial<NewGoal>) => {
    set({ loading: true, error: null });
    try {
      await invoke<Goal>("update_goal", {
        id,
        goal: {
          targetValue: data.targetValue,
          targetDate: data.targetDate,
          status: data.status,
        },
      });

      const goals = await invoke<Goal[]>("get_all_goals");
      set({ goals, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  deleteGoal: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await invoke<boolean>("delete_goal", { id });

      const goals = await invoke<Goal[]>("get_all_goals");
      set({ goals, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  markAchieved: async (goalId: number) => {
    set({ loading: true, error: null });
    try {
      await invoke<Goal>("mark_goal_achieved", { id: goalId });

      const goals = await invoke<Goal[]>("get_all_goals");
      set({ goals, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  abandonGoal: async (goalId: number) => {
    set({ loading: true, error: null });
    try {
      await invoke<Goal>("update_goal", {
        id: goalId,
        goal: {
          status: "abandoned" as GoalStatus,
        },
      });

      const goals = await invoke<Goal[]>("get_all_goals");
      set({ goals, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  getActiveGoals: (): Goal[] => {
    return get().goals.filter((g) => g.status === "active");
  },

  getAchievedGoals: (): Goal[] => {
    return get()
      .goals.filter((g) => g.status === "achieved")
      .sort(
        (a, b) =>
          new Date(b.achievedAt || 0).getTime() -
          new Date(a.achievedAt || 0).getTime()
      );
  },

  getGoalsByAthlete: (athleteId: number): Goal[] => {
    return get().goals.filter((g) => g.athleteId === athleteId);
  },

  calculateProgress: (goal: Goal, currentBest: number | null): number => {
    if (currentBest === null) return 0;

    const discipline = getDisciplineById(goal.disciplineId);
    if (!discipline) return 0;

    // Prevent division by zero
    if (goal.targetValue === 0) return currentBest === 0 ? 100 : 0;

    if (discipline.lowerIsBetter) {
      if (currentBest <= goal.targetValue) return 100;

      const estimatedStart = goal.targetValue * 1.2;
      const totalImprovement = estimatedStart - goal.targetValue;

      // Prevent division by zero (happens when targetValue is very small)
      if (totalImprovement === 0) return 0;

      const achievedImprovement = estimatedStart - currentBest;

      return Math.max(
        0,
        Math.min(100, (achievedImprovement / totalImprovement) * 100)
      );
    } else {
      if (currentBest >= goal.targetValue) return 100;
      return Math.max(0, Math.min(100, (currentBest / goal.targetValue) * 100));
    }
  },

  getGoalWithProgress: (goal: Goal): GoalWithProgress => {
    const resultStore = useResultStore.getState();
    const discipline = getDisciplineById(goal.disciplineId);

    const athleteResults = resultStore.results.filter(
      (r) =>
        r.athleteId === goal.athleteId && r.disciplineId === goal.disciplineId
    );

    let currentBest: number | null = null;
    if (athleteResults.length > 0) {
      const values = athleteResults.map((r) => r.value);
      currentBest = discipline?.lowerIsBetter
        ? Math.min(...values)
        : Math.max(...values);
    }

    const progress = get().calculateProgress(goal, currentBest);

    let remaining: number | null = null;
    if (currentBest !== null && discipline) {
      if (discipline.lowerIsBetter) {
        remaining = Math.max(0, currentBest - goal.targetValue);
      } else {
        remaining = Math.max(0, goal.targetValue - currentBest);
      }
    }

    return {
      ...goal,
      currentBest,
      progress,
      remaining,
    };
  },
}));
