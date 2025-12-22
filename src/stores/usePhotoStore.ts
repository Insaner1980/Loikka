import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getErrorMessage } from "../lib";

export interface PhotoWithDetails {
  id: number;
  entityType: string;
  entityId: number;
  filePath: string;
  thumbnailPath: string | null;
  originalName: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  eventName: string | null;
  createdAt: string;
  athleteName: string | null;
  competitionName: string | null;
}

interface PhotoFilters {
  athleteId?: number;
  competitionId?: number;
  year?: number;
}

interface PhotoStore {
  photos: PhotoWithDetails[];
  years: number[];
  loading: boolean;
  error: string | null;
  filters: PhotoFilters;

  // Actions
  fetchPhotos: (filters?: PhotoFilters) => Promise<void>;
  fetchYears: () => Promise<void>;
  setFilters: (filters: PhotoFilters) => void;
  addPhoto: (entityType: string, entityId: number, eventName?: string) => Promise<PhotoWithDetails | null>;
  deletePhoto: (id: number) => Promise<boolean>;

  // Helpers
  getPhotoUrl: (photo: PhotoWithDetails) => string;
  getThumbnailUrl: (photo: PhotoWithDetails) => string;
}

export const usePhotoStore = create<PhotoStore>((set, get) => ({
  photos: [],
  years: [],
  loading: false,
  error: null,
  filters: {},

  fetchPhotos: async (filters?: PhotoFilters) => {
    const effectiveFilters = filters || get().filters;
    set({ loading: true, error: null });

    try {
      const photos = await invoke<PhotoWithDetails[]>("get_all_photos", {
        athleteId: effectiveFilters.athleteId || null,
        competitionId: effectiveFilters.competitionId || null,
        year: effectiveFilters.year || null,
      });
      set({ photos, loading: false, filters: effectiveFilters });
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
    }
  },

  fetchYears: async () => {
    try {
      const years = await invoke<number[]>("get_photo_years");
      set({ years });
    } catch (error) {
      console.error("Failed to fetch photo years:", error);
    }
  },

  setFilters: (filters: PhotoFilters) => {
    set({ filters });
    get().fetchPhotos(filters);
  },

  addPhoto: async (entityType: string, entityId: number, eventName?: string): Promise<PhotoWithDetails | null> => {
    try {
      // Open file picker
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["jpg", "jpeg", "png", "gif", "webp"],
          },
        ],
      });

      if (!selected || typeof selected !== "string") {
        return null;
      }

      set({ loading: true, error: null });

      // Save photo via backend
      const photo = await invoke<PhotoWithDetails>("save_photo", {
        sourcePath: selected,
        entityType,
        entityId,
        eventName: eventName || null,
      });

      // Refetch photos to get the updated list with details
      const photos = await invoke<PhotoWithDetails[]>("get_all_photos", {
        athleteId: get().filters.athleteId || null,
        competitionId: get().filters.competitionId || null,
        year: get().filters.year || null,
      });
      set({ photos, loading: false });

      return photo;
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
      return null;
    }
  },

  deletePhoto: async (id: number): Promise<boolean> => {
    set({ loading: true, error: null });
    try {
      const success = await invoke<boolean>("delete_photo", { id });
      if (success) {
        set((state) => ({
          photos: state.photos.filter((p) => p.id !== id),
          loading: false,
        }));
      }
      return success;
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
      return false;
    }
  },

  getPhotoUrl: (photo: PhotoWithDetails): string => {
    return convertFileSrc(photo.filePath);
  },

  getThumbnailUrl: (photo: PhotoWithDetails): string => {
    const path = photo.thumbnailPath || photo.filePath;
    return convertFileSrc(path);
  },
}));
