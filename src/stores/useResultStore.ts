import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Result, NewResult, MedalType, ResultType } from "../types";
import { getDisciplineById } from "../data/disciplines";

export interface ResultFilters {
  athleteId: number | null;
  disciplineId: number | null;
  type: ResultType | null;
  timeRange: "all" | "thisYear" | "lastYear" | "custom";
  startDate?: string;
  endDate?: string;
}

export interface ResultsByDate {
  date: string;
  results: Result[];
}

export interface ChartDataPoint {
  date: string;
  value: number;
  isPersonalBest: boolean;
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
  getFilteredResults: (filters: ResultFilters) => Result[];
  getResultsByDate: (filters: ResultFilters) => ResultsByDate[];
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

  fetchResults: async () => {
    set({ loading: true, error: null });
    try {
      const results = await invoke<Result[]>("get_all_results");
      set({ results, loading: false });
    } catch (error) {
      set({ error: (error as Error).message || String(error), loading: false });
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
          location: resultData.location || null,
          placement: resultData.placement || null,
          notes: resultData.notes || null,
        },
      });

      // Medal creation is handled by the backend when placement is provided
      if (medal) {
        console.log("Medal data provided:", medal);
      }

      // Refetch all results
      const results = await invoke<Result[]>("get_all_results");
      set({ results, loading: false });

      return newResult;
    } catch (error) {
      set({ error: (error as Error).message || String(error), loading: false });
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
        (r) => r.athleteId === athleteId && r.disciplineId === disciplineId
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

  getFilteredResults: (filters: ResultFilters): Result[] => {
    const { results } = get();
    const currentYear = new Date().getFullYear();

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

      const resultDate = new Date(result.date);
      const resultYear = resultDate.getFullYear();

      switch (filters.timeRange) {
        case "thisYear":
          if (resultYear !== currentYear) return false;
          break;
        case "lastYear":
          if (resultYear !== currentYear - 1) return false;
          break;
        case "custom":
          if (filters.startDate && result.date < filters.startDate) return false;
          if (filters.endDate && result.date > filters.endDate) return false;
          break;
      }

      return true;
    });
  },

  getResultsByDate: (filters: ResultFilters): ResultsByDate[] => {
    const filteredResults = get().getFilteredResults(filters);

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
        (r) => r.athleteId === athleteId && r.disciplineId === disciplineId
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((r) => ({
        date: r.date,
        value: r.value,
        isPersonalBest: r.isPersonalBest,
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
        new Date(r.date).getFullYear() === year
    );

    const previousSeasonResults = results.filter(
      (r) =>
        r.athleteId === athleteId &&
        r.disciplineId === disciplineId &&
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
      (r) => r.athleteId === athleteId && r.disciplineId === disciplineId
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
