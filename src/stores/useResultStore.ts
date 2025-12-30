import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Result, NewResult, UpdateResult, MedalType, ResultType, Athlete, Goal } from "../types";
import { getDisciplineById } from "../data/disciplines";
import { getAgeCategory, getErrorMessage } from "../lib";

// Helper to check if a result is valid (treats undefined/null status as valid for backwards compatibility)
function isValidResult(result: Result): boolean {
  return result.status === "valid" || result.status === undefined || result.status === null;
}

// Helper function to check and mark goals as achieved
async function checkAndMarkGoalsAchieved(
  athleteId: number,
  disciplineId: number,
  results: Result[]
) {
  try {
    // Get all goals
    const goals = await invoke<Goal[]>("get_all_goals");

    // Find active goals for this athlete and discipline
    const activeGoals = goals.filter(
      (g) => g.athleteId === athleteId &&
             g.disciplineId === disciplineId &&
             g.status === "active"
    );

    if (activeGoals.length === 0) return;

    // Get the discipline to determine if lower is better
    const discipline = getDisciplineById(disciplineId);
    if (!discipline) return;

    // Calculate current best for this athlete/discipline (only valid results)
    const athleteResults = results.filter(
      (r) =>
        r.athleteId === athleteId &&
        r.disciplineId === disciplineId &&
        isValidResult(r)
    );

    if (athleteResults.length === 0) return;

    const values = athleteResults.map((r) => r.value);
    const currentBest = discipline.lowerIsBetter
      ? Math.min(...values)
      : Math.max(...values);

    // Check each active goal and mark as achieved if target is met
    let goalsMarked = false;
    for (const goal of activeGoals) {
      const isAchieved = discipline.lowerIsBetter
        ? currentBest <= goal.targetValue
        : currentBest >= goal.targetValue;

      if (isAchieved) {
        await invoke("mark_goal_achieved", { id: goal.id });
        goalsMarked = true;
      }
    }

    // Refresh the goal store if any goals were marked as achieved
    if (goalsMarked) {
      // Dynamic import to avoid circular dependency
      const { useGoalStore } = await import("./useGoalStore");
      await useGoalStore.getState().fetchGoals();
    }
  } catch (error) {
    console.error("Error checking goals:", error);
  }
}

export interface ResultFilters {
  athleteId: number | null;
  disciplineId: number | null;
  type: ResultType | null;
  year: number | null; // null = all years
  ageCategory: string | null; // null = all categories
}

export interface ResultsByDate {
  date: string;
  results: Result[];
}

export interface ChartDataPoint {
  date: string;
  value: number;
  isPersonalBest: boolean;
  isSeasonBest: boolean;
  isNationalRecord: boolean;
}

export interface SeasonStatsData {
  bestResult: number | null;
  averageResult: number | null;
  competitionCount: number;
  improvementPercent: number | null;
}

export interface SeasonComparisonData {
  year: number;
  bestResult: number | null;
}

interface ResultStore {
  results: Result[];
  loading: boolean;
  error: string | null;
  fetchResults: () => Promise<void>;
  addResult: (
    result: NewResult,
    medal?: { type: MedalType; competitionName: string }
  ) => Promise<Result>;
  updateResult: (id: number, result: UpdateResult) => Promise<Result>;
  deleteResult: (id: number) => Promise<boolean>;
  deleteResultsBulk: (ids: number[]) => Promise<boolean>;
  checkPersonalBest: (
    athleteId: number,
    disciplineId: number,
    value: number
  ) => Promise<boolean>;
  checkSeasonBest: (
    athleteId: number,
    disciplineId: number,
    value: number,
    year: number
  ) => Promise<boolean>;
  getResultsByAthlete: (athleteId: number) => Result[];
  getFilteredResults: (filters: ResultFilters, athletes?: Athlete[]) => Result[];
  getResultsByDate: (filters: ResultFilters, athletes?: Athlete[]) => ResultsByDate[];
  getResultsForChart: (
    athleteId: number,
    disciplineId: number
  ) => ChartDataPoint[];
  getSeasonStats: (
    athleteId: number,
    disciplineId: number,
    year: number
  ) => SeasonStatsData;
  getSeasonComparison: (
    athleteId: number,
    disciplineId: number
  ) => SeasonComparisonData[];
}

export const useResultStore = create<ResultStore>((set, get) => ({
  results: [],
  loading: false,
  error: null,

  fetchResults: async (force = false) => {
    const state = get();
    // Skip if already loaded (unless forced)
    if (!force && state.results.length > 0) {
      return;
    }
    // Prevent concurrent fetches
    if (state.loading) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const results = await invoke<Result[]>("get_all_results");
      set({ results, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
    }
  },

  addResult: async (resultData: NewResult, medal) => {
    set({ loading: true, error: null });
    try {
      const newResult = await invoke<Result>("create_result", {
        result: {
          athleteId: resultData.athleteId,
          disciplineId: resultData.disciplineId,
          date: resultData.date,
          value: resultData.value,
          type: resultData.type,
          competitionName: resultData.competitionName || null,
          competitionLevel: resultData.competitionLevel || null,
          customLevelName: resultData.customLevelName || null,
          location: resultData.location || null,
          placement: resultData.placement || null,
          notes: resultData.notes || null,
          isPersonalBest: resultData.isPersonalBest || false,
          isSeasonBest: resultData.isSeasonBest || false,
          isNationalRecord: resultData.isNationalRecord || false,
          wind: resultData.wind ?? null,
          status: resultData.status || "valid",
          equipmentWeight: resultData.equipmentWeight ?? null,
          hurdleHeight: resultData.hurdleHeight ?? null,
          hurdleSpacing: resultData.hurdleSpacing ?? null,
          subResults: resultData.subResults || null,
          combinedEventId: resultData.combinedEventId ?? null,
        },
      });

      // Create medal if provided
      if (medal) {
        await invoke("create_medal", {
          athleteId: resultData.athleteId,
          resultId: newResult.id,
          medalType: medal.type,
          competitionName: medal.competitionName,
          date: resultData.date,
        });
      }

      // For combined events (moniottelu), create separate results for each sub-discipline
      if (resultData.subResults) {
        try {
          const subResults = JSON.parse(resultData.subResults) as Array<{
            disciplineId: number;
            value: number;
            wind?: number;
          }>;

          for (const sub of subResults) {
            await invoke<Result>("create_result", {
              result: {
                athleteId: resultData.athleteId,
                disciplineId: sub.disciplineId,
                date: resultData.date,
                value: sub.value,
                type: resultData.type,
                competitionName: resultData.competitionName || null,
                competitionLevel: resultData.competitionLevel || null,
                customLevelName: resultData.customLevelName || null,
                location: resultData.location || null,
                placement: null, // Sub-results don't have placement
                notes: null,
                isPersonalBest: false, // Will be calculated by backend
                isSeasonBest: false,
                isNationalRecord: false,
                wind: sub.wind ?? null,
                status: "valid",
                equipmentWeight: null,
                hurdleHeight: null,
                hurdleSpacing: null,
                subResults: null,
                combinedEventId: newResult.id, // Link to parent combined event
              },
            });
          }
        } catch (e) {
          console.error("Failed to parse or create sub-results:", e);
        }
      }

      // Refetch all results
      const results = await invoke<Result[]>("get_all_results");
      set({ results, loading: false });

      // Check if any goals should be marked as achieved
      await checkAndMarkGoalsAchieved(resultData.athleteId, resultData.disciplineId, results);

      return newResult;
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  updateResult: async (id: number, resultData: UpdateResult) => {
    set({ loading: true, error: null });
    try {
      const updatedResult = await invoke<Result>("update_result", {
        id,
        result: {
          athleteId: resultData.athleteId,
          disciplineId: resultData.disciplineId,
          date: resultData.date,
          value: resultData.value,
          type: resultData.type,
          competitionName: resultData.competitionName || null,
          competitionLevel: resultData.competitionLevel || null,
          customLevelName: resultData.customLevelName || null,
          location: resultData.location || null,
          placement: resultData.placement || null,
          notes: resultData.notes || null,
          wind: resultData.wind ?? null,
          status: resultData.status || null,
          equipmentWeight: resultData.equipmentWeight ?? null,
          hurdleHeight: resultData.hurdleHeight ?? null,
          hurdleSpacing: resultData.hurdleSpacing ?? null,
          isNationalRecord: resultData.isNationalRecord,
          subResults: resultData.subResults || null,
          combinedEventId: resultData.combinedEventId ?? null,
        },
      });

      // Refetch all results to ensure consistency
      const results = await invoke<Result[]>("get_all_results");
      set({ results, loading: false });

      // Check if any goals should be marked as achieved
      if (resultData.athleteId && resultData.disciplineId) {
        await checkAndMarkGoalsAchieved(resultData.athleteId, resultData.disciplineId, results);
      }

      return updatedResult;
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  deleteResult: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await invoke<boolean>("delete_result", { id });

      // Refetch all results
      const results = await invoke<Result[]>("get_all_results");
      set({ results, loading: false });

      return true;
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  deleteResultsBulk: async (ids: number[]) => {
    if (ids.length === 0) return false;

    set({ loading: true, error: null });
    try {
      // Delete each result
      for (const id of ids) {
        await invoke<boolean>("delete_result", { id });
      }

      // Refetch all results
      const results = await invoke<Result[]>("get_all_results");
      set({ results, loading: false });

      return true;
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  checkPersonalBest: async (
    athleteId: number,
    disciplineId: number,
    value: number
  ): Promise<boolean> => {
    try {
      return await invoke<boolean>("check_personal_best", {
        athleteId,
        disciplineId,
        value,
      });
    } catch (error) {
      console.error("Failed to check personal best:", error);
      // Fall back to local check
      const { results } = get();
      const discipline = getDisciplineById(disciplineId);
      if (!discipline) return false;

      const athleteResults = results.filter(
        (r) =>
          r.athleteId === athleteId &&
          r.disciplineId === disciplineId &&
          isValidResult(r)
      );

      if (athleteResults.length === 0) return true;

      if (discipline.lowerIsBetter) {
        const currentBest = Math.min(...athleteResults.map((r) => r.value));
        return value < currentBest;
      } else {
        const currentBest = Math.max(...athleteResults.map((r) => r.value));
        return value > currentBest;
      }
    }
  },

  checkSeasonBest: async (
    athleteId: number,
    disciplineId: number,
    value: number,
    year: number
  ): Promise<boolean> => {
    try {
      return await invoke<boolean>("check_season_best", {
        athleteId,
        disciplineId,
        value,
        year,
      });
    } catch (error) {
      console.error("Failed to check season best:", error);
      // Fall back to local check
      const { results } = get();
      const discipline = getDisciplineById(disciplineId);
      if (!discipline) return false;

      const seasonResults = results.filter(
        (r) =>
          r.athleteId === athleteId &&
          r.disciplineId === disciplineId &&
          isValidResult(r) &&
          new Date(r.date).getFullYear() === year
      );

      if (seasonResults.length === 0) return true;

      if (discipline.lowerIsBetter) {
        const currentBest = Math.min(...seasonResults.map((r) => r.value));
        return value < currentBest;
      } else {
        const currentBest = Math.max(...seasonResults.map((r) => r.value));
        return value > currentBest;
      }
    }
  },

  getResultsByAthlete: (athleteId: number): Result[] => {
    return get()
      .results.filter((r) => r.athleteId === athleteId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getFilteredResults: (filters: ResultFilters, athletes?: Athlete[]): Result[] => {
    const { results } = get();

    // Build athlete birth year map for age category filtering
    const athleteBirthYearMap = new Map<number, number>();
    if (athletes && filters.ageCategory !== null) {
      athletes.forEach((a) => athleteBirthYearMap.set(a.id, a.birthYear));
    }

    return results.filter((result) => {
      if (
        filters.athleteId !== null &&
        result.athleteId !== filters.athleteId
      ) {
        return false;
      }

      if (
        filters.disciplineId !== null &&
        result.disciplineId !== filters.disciplineId
      ) {
        return false;
      }

      if (filters.type !== null && result.type !== filters.type) {
        return false;
      }

      // Year filter
      if (filters.year !== null) {
        const resultYear = new Date(result.date).getFullYear();
        if (resultYear !== filters.year) return false;
      }

      // Age category filter
      if (filters.ageCategory !== null) {
        const birthYear = athleteBirthYearMap.get(result.athleteId);
        if (birthYear === undefined) return false;
        if (getAgeCategory(birthYear) !== filters.ageCategory) return false;
      }

      return true;
    });
  },

  getResultsByDate: (filters: ResultFilters, athletes?: Athlete[]): ResultsByDate[] => {
    const filteredResults = get().getFilteredResults(filters, athletes);

    const sorted = [...filteredResults].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const grouped = new Map<string, Result[]>();
    for (const result of sorted) {
      const existing = grouped.get(result.date) || [];
      existing.push(result);
      grouped.set(result.date, existing);
    }

    return Array.from(grouped.entries()).map(([date, results]) => ({
      date,
      results,
    }));
  },

  getResultsForChart: (
    athleteId: number,
    disciplineId: number
  ): ChartDataPoint[] => {
    const { results } = get();

    return results
      .filter(
        (r) =>
          r.athleteId === athleteId &&
          r.disciplineId === disciplineId &&
          isValidResult(r)
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((r) => ({
        date: r.date,
        value: r.value,
        isPersonalBest: r.isPersonalBest,
        isSeasonBest: r.isSeasonBest,
        isNationalRecord: r.isNationalRecord,
      }));
  },

  getSeasonStats: (
    athleteId: number,
    disciplineId: number,
    year: number
  ): SeasonStatsData => {
    const { results } = get();
    const discipline = getDisciplineById(disciplineId);

    const seasonResults = results.filter(
      (r) =>
        r.athleteId === athleteId &&
        r.disciplineId === disciplineId &&
        isValidResult(r) &&
        new Date(r.date).getFullYear() === year
    );

    const previousSeasonResults = results.filter(
      (r) =>
        r.athleteId === athleteId &&
        r.disciplineId === disciplineId &&
        isValidResult(r) &&
        new Date(r.date).getFullYear() === year - 1
    );

    if (seasonResults.length === 0) {
      return {
        bestResult: null,
        averageResult: null,
        competitionCount: 0,
        improvementPercent: null,
      };
    }

    const values = seasonResults.map((r) => r.value);
    const bestResult = discipline?.lowerIsBetter
      ? Math.min(...values)
      : Math.max(...values);
    const averageResult = values.reduce((a, b) => a + b, 0) / values.length;
    const competitionCount = seasonResults.filter(
      (r) => r.type === "competition"
    ).length;

    let improvementPercent: number | null = null;
    if (previousSeasonResults.length > 0 && discipline) {
      const previousValues = previousSeasonResults.map((r) => r.value);
      const previousBest = discipline.lowerIsBetter
        ? Math.min(...previousValues)
        : Math.max(...previousValues);

      if (discipline.lowerIsBetter) {
        improvementPercent = ((previousBest - bestResult) / previousBest) * 100;
      } else {
        improvementPercent = ((bestResult - previousBest) / previousBest) * 100;
      }
    }

    return {
      bestResult,
      averageResult,
      competitionCount,
      improvementPercent,
    };
  },

  getSeasonComparison: (
    athleteId: number,
    disciplineId: number
  ): SeasonComparisonData[] => {
    const { results } = get();
    const discipline = getDisciplineById(disciplineId);

    const athleteResults = results.filter(
      (r) =>
        r.athleteId === athleteId &&
        r.disciplineId === disciplineId &&
        isValidResult(r)
    );

    if (athleteResults.length === 0) {
      return [];
    }

    const years = [
      ...new Set(athleteResults.map((r) => new Date(r.date).getFullYear())),
    ].sort((a, b) => a - b);

    const recentYears = years.slice(-4);

    return recentYears.map((year) => {
      const yearResults = athleteResults.filter(
        (r) => new Date(r.date).getFullYear() === year
      );
      const values = yearResults.map((r) => r.value);
      const bestResult =
        values.length > 0
          ? discipline?.lowerIsBetter
            ? Math.min(...values)
            : Math.max(...values)
          : null;

      return {
        year,
        bestResult,
      };
    });
  },
}));
