import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  Competition,
  NewCompetition,
  CompetitionParticipant,
  CompetitionWithParticipants,
} from "../types";
import { getErrorMessage } from "../lib";

interface CompetitionStore {
  competitions: Competition[];
  participants: CompetitionParticipant[];
  loading: boolean;
  error: string | null;
  fetchCompetitions: () => Promise<void>;
  addCompetition: (
    competition: NewCompetition,
    participantIds?: number[]
  ) => Promise<Competition>;
  updateCompetition: (
    id: number,
    data: Partial<NewCompetition>
  ) => Promise<void>;
  deleteCompetition: (id: number) => Promise<void>;
  getCompetitionById: (id: number) => CompetitionWithParticipants | undefined;
  getUpcomingCompetitions: (limit?: number) => Competition[];
  getCompetitionsByMonth: (year: number, month: number) => Competition[];
  getCompetitionsByDate: (date: string) => Competition[];
  addParticipant: (
    competitionId: number,
    athleteId: number,
    disciplines?: number[]
  ) => Promise<void>;
  removeParticipant: (competitionId: number, athleteId: number) => Promise<void>;
  getParticipants: (competitionId: number) => CompetitionParticipant[];
}

export const useCompetitionStore = create<CompetitionStore>((set, get) => ({
  competitions: [],
  participants: [],
  loading: false,
  error: null,

  fetchCompetitions: async (force = false) => {
    const state = get();
    // Skip if already loaded (unless forced)
    if (!force && state.competitions.length > 0) {
      return;
    }
    // Prevent concurrent fetches
    if (state.loading) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const competitions = await invoke<Competition[]>("get_all_competitions");
      // Fetch participants for all competitions in parallel (not sequentially!)
      const participantPromises = competitions.map((comp) =>
        invoke<CompetitionParticipant[]>("get_competition_participants", {
          competitionId: comp.id,
        }).catch(() => [] as CompetitionParticipant[])
      );
      const participantArrays = await Promise.all(participantPromises);
      const allParticipants = participantArrays.flat();
      set({ competitions, participants: allParticipants, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
    }
  },

  addCompetition: async (
    competitionData: NewCompetition,
    participantIds?: number[]
  ) => {
    set({ loading: true, error: null });
    try {
      const newCompetition = await invoke<Competition>("create_competition", {
        competition: {
          name: competitionData.name,
          date: competitionData.date,
          endDate: competitionData.endDate || null,
          location: competitionData.location || null,
          address: competitionData.address || null,
          level: competitionData.level || null,
          notes: competitionData.notes || null,
          reminderEnabled: competitionData.reminderEnabled,
          reminderDaysBefore: competitionData.reminderDaysBefore || null,
        },
      });

      // Add participants if provided
      if (participantIds && participantIds.length > 0) {
        for (const athleteId of participantIds) {
          await invoke("add_competition_participant", {
            participant: {
              competitionId: newCompetition.id,
              athleteId,
              disciplinesPlanned: null,
            },
          });
        }
      }

      // Refetch all competitions
      const competitions = await invoke<Competition[]>("get_all_competitions");
      set((state) => ({ ...state, competitions, loading: false }));

      return newCompetition;
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  updateCompetition: async (id: number, data: Partial<NewCompetition>) => {
    set({ loading: true, error: null });
    try {
      await invoke<Competition>("update_competition", {
        id,
        competition: {
          name: data.name,
          date: data.date,
          endDate: data.endDate,
          location: data.location,
          address: data.address,
          level: data.level,
          notes: data.notes,
          reminderEnabled: data.reminderEnabled,
          reminderDaysBefore: data.reminderDaysBefore,
        },
      });

      const competitions = await invoke<Competition[]>("get_all_competitions");
      set((state) => ({ ...state, competitions, loading: false }));
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  deleteCompetition: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await invoke<boolean>("delete_competition", { id });

      const competitions = await invoke<Competition[]>("get_all_competitions");
      set((state) => ({
        ...state,
        competitions,
        participants: state.participants.filter((p) => p.competitionId !== id),
        loading: false,
      }));
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  getCompetitionById: (id: number): CompetitionWithParticipants | undefined => {
    const competition = get().competitions.find((c) => c.id === id);
    if (!competition) return undefined;

    const participants = get().participants.filter(
      (p) => p.competitionId === id
    );

    return {
      ...competition,
      participants,
    };
  },

  getUpcomingCompetitions: (limit?: number): Competition[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = get()
      .competitions.filter((c) => new Date(c.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return limit ? upcoming.slice(0, limit) : upcoming;
  },

  getCompetitionsByMonth: (year: number, month: number): Competition[] => {
    return get().competitions.filter((c) => {
      const date = new Date(c.date);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  },

  getCompetitionsByDate: (date: string): Competition[] => {
    return get().competitions.filter((c) => {
      if (c.endDate) {
        return date >= c.date && date <= c.endDate;
      }
      return c.date === date;
    });
  },

  addParticipant: async (
    competitionId: number,
    athleteId: number,
    disciplines?: number[]
  ) => {
    try {
      const participant = await invoke<CompetitionParticipant>(
        "add_competition_participant",
        {
          participant: {
            competitionId,
            athleteId,
            disciplinesPlanned: disciplines || null,
          },
        }
      );

      set((state) => ({
        participants: [...state.participants, participant],
      }));
    } catch (error) {
      console.error("Failed to add participant:", error);
    }
  },

  removeParticipant: async (competitionId: number, athleteId: number) => {
    try {
      await invoke<boolean>("remove_competition_participant", {
        competitionId,
        athleteId,
      });

      set((state) => ({
        participants: state.participants.filter(
          (p) =>
            !(p.competitionId === competitionId && p.athleteId === athleteId)
        ),
      }));
    } catch (error) {
      console.error("Failed to remove participant:", error);
    }
  },

  getParticipants: (competitionId: number): CompetitionParticipant[] => {
    return get().participants.filter((p) => p.competitionId === competitionId);
  },
}));
