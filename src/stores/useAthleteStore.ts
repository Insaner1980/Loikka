import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  Athlete,
  NewAthlete,
  Result,
  Medal,
  Goal,
  Discipline,
} from "../types";
import { getDisciplineById } from "../data/disciplines";

interface AthleteStats {
  disciplineCount: number;
  resultCount: number;
  pbCount: number;
  goldMedals: number;
  silverMedals: number;
  bronzeMedals: number;
}

interface AthleteWithStats {
  athlete: Athlete;
  stats: AthleteStats;
}

interface ResultWithDiscipline extends Result {
  discipline: Discipline;
}

interface AthleteStore {
  athletes: AthleteWithStats[];
  loading: boolean;
  error: string | null;
  fetchAthletes: () => Promise<void>;
  addAthlete: (athlete: NewAthlete) => Promise<Athlete>;
  updateAthlete: (id: number, data: Partial<NewAthlete>) => Promise<void>;
  deleteAthlete: (id: number) => Promise<void>;
  getAthleteById: (id: number) => AthleteWithStats | undefined;
  getAthleteResults: (id: number) => Promise<ResultWithDiscipline[]>;
  getAthletePersonalBests: (id: number) => Promise<ResultWithDiscipline[]>;
  getAthleteMedals: (id: number) => Promise<Medal[]>;
  getAthleteGoals: (id: number) => Promise<Goal[]>;
}

export const useAthleteStore = create<AthleteStore>((set, get) => ({
  athletes: [],
  loading: false,
  error: null,

  fetchAthletes: async () => {
    set({ loading: true, error: null });
    try {
      const athletes = await invoke<AthleteWithStats[]>("get_all_athletes");
      set({ athletes, loading: false });
    } catch (error) {
      set({ error: (error as Error).message || String(error), loading: false });
    }
  },

  addAthlete: async (athleteData: NewAthlete) => {
    set({ loading: true, error: null });
    try {
      const newAthlete = await invoke<Athlete>("create_athlete", {
        athlete: {
          firstName: athleteData.firstName,
          lastName: athleteData.lastName,
          birthYear: athleteData.birthYear,
          clubName: athleteData.clubName || null,
          photoPath: athleteData.photoPath || null,
        },
      });

      // Refetch to get updated stats
      const athletes = await invoke<AthleteWithStats[]>("get_all_athletes");
      set({ athletes, loading: false });

      return newAthlete;
    } catch (error) {
      set({ error: (error as Error).message || String(error), loading: false });
      throw error;
    }
  },

  updateAthlete: async (id: number, data: Partial<NewAthlete>) => {
    set({ loading: true, error: null });
    try {
      await invoke<Athlete>("update_athlete", {
        id,
        athlete: {
          firstName: data.firstName,
          lastName: data.lastName,
          birthYear: data.birthYear,
          clubName: data.clubName,
          photoPath: data.photoPath,
        },
      });

      // Refetch to get updated data
      const athletes = await invoke<AthleteWithStats[]>("get_all_athletes");
      set({ athletes, loading: false });
    } catch (error) {
      set({ error: (error as Error).message || String(error), loading: false });
      throw error;
    }
  },

  deleteAthlete: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await invoke<boolean>("delete_athlete", { id });

      // Refetch
      const athletes = await invoke<AthleteWithStats[]>("get_all_athletes");
      set({ athletes, loading: false });
    } catch (error) {
      set({ error: (error as Error).message || String(error), loading: false });
      throw error;
    }
  },

  getAthleteById: (id: number) => {
    return get().athletes.find((item) => item.athlete.id === id);
  },

  getAthleteResults: async (id: number) => {
    try {
      const results = await invoke<Result[]>("get_results_by_athlete", {
        athleteId: id,
      });
      return results
        .map((r) => ({
          ...r,
          discipline: getDisciplineById(r.disciplineId)!,
        }))
        .filter((r) => r.discipline)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    } catch (error) {
      console.error("Failed to fetch athlete results:", error);
      return [];
    }
  },

  getAthletePersonalBests: async (id: number) => {
    try {
      const results = await invoke<Result[]>("get_results_by_athlete", {
        athleteId: id,
      });
      return results
        .filter((r) => r.isPersonalBest)
        .map((r) => ({
          ...r,
          discipline: getDisciplineById(r.disciplineId)!,
        }))
        .filter((r) => r.discipline);
    } catch (error) {
      console.error("Failed to fetch personal bests:", error);
      return [];
    }
  },

  getAthleteMedals: async (id: number) => {
    try {
      const medals = await invoke<Medal[]>("get_athlete_medals", {
        athleteId: id,
      });
      return medals;
    } catch (error) {
      console.error("Failed to fetch medals:", error);
      return [];
    }
  },

  getAthleteGoals: async (id: number) => {
    try {
      const goals = await invoke<Goal[]>("get_goals_by_athlete", {
        athleteId: id,
      });
      return goals;
    } catch (error) {
      console.error("Failed to fetch goals:", error);
      return [];
    }
  },
}));
