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

// Simplified photo type for entity-specific fetching
export interface Photo {
  id: number;
  entityType: string;
  entityId: number;
  filePath: string;
  thumbnailPath: string | null;
  originalName: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  createdAt: string;
}

export type EntityType = "athletes" | "results" | "competitions";

interface PhotoFilters {
  athleteId?: number;
  competitionId?: number;
  year?: number;
}

// Cache for entity-specific photos
interface EntityPhotoCache {
  photos: Photo[];
  loading: boolean;
  error: string | null;
}

interface PhotoStore {
  // Gallery photos (Photos page)
  photos: PhotoWithDetails[];
  years: number[];
  loading: boolean;
  error: string | null;
  filters: PhotoFilters;

  // Entity-specific photo cache
  entityPhotos: Map<string, EntityPhotoCache>;
  photoCounts: Map<string, number>;

  // Gallery actions
  fetchPhotos: (filters?: PhotoFilters) => Promise<void>;
  fetchYears: () => Promise<void>;
  setFilters: (filters: PhotoFilters) => void;
  addPhoto: (entityType: string, entityId: number, eventName?: string) => Promise<PhotoWithDetails | null>;
  deletePhoto: (id: number) => Promise<boolean>;

  // Entity-specific actions
  fetchEntityPhotos: (entityType: EntityType, entityId: number) => Promise<void>;
  addEntityPhoto: (entityType: EntityType, entityId: number) => Promise<Photo | null>;
  deleteEntityPhoto: (entityType: EntityType, entityId: number, photoId: number) => Promise<boolean>;
  getEntityPhotos: (entityType: EntityType, entityId: number) => EntityPhotoCache;
  fetchPhotoCount: (entityType: EntityType, entityId: number) => Promise<void>;
  getPhotoCount: (entityType: EntityType, entityId: number) => number;

  // Helpers
  getPhotoUrl: (photo: Photo | PhotoWithDetails) => string;
  getThumbnailUrl: (photo: Photo | PhotoWithDetails) => string;
}

// Helper to create entity cache key
function getEntityKey(entityType: EntityType, entityId: number): string {
  return `${entityType}:${entityId}`;
}

export const usePhotoStore = create<PhotoStore>((set, get) => ({
  photos: [],
  years: [],
  loading: false,
  error: null,
  filters: {},
  entityPhotos: new Map(),
  photoCounts: new Map(),

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

  // Entity-specific photo fetching
  fetchEntityPhotos: async (entityType: EntityType, entityId: number) => {
    const key = getEntityKey(entityType, entityId);
    const current = get().entityPhotos.get(key) || { photos: [], loading: false, error: null };

    // Set loading state
    const newMap = new Map(get().entityPhotos);
    newMap.set(key, { ...current, loading: true, error: null });
    set({ entityPhotos: newMap });

    try {
      const photos = await invoke<Photo[]>("get_photos", {
        entityType,
        entityId,
      });

      const updatedMap = new Map(get().entityPhotos);
      updatedMap.set(key, { photos, loading: false, error: null });
      set({ entityPhotos: updatedMap });

      // Also update the photo count cache
      const countMap = new Map(get().photoCounts);
      countMap.set(key, photos.length);
      set({ photoCounts: countMap });
    } catch (error) {
      const updatedMap = new Map(get().entityPhotos);
      updatedMap.set(key, { photos: [], loading: false, error: getErrorMessage(error) });
      set({ entityPhotos: updatedMap });
    }
  },

  addEntityPhoto: async (entityType: EntityType, entityId: number): Promise<Photo | null> => {
    try {
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

      const key = getEntityKey(entityType, entityId);
      const current = get().entityPhotos.get(key) || { photos: [], loading: false, error: null };

      // Set loading state
      const newMap = new Map(get().entityPhotos);
      newMap.set(key, { ...current, loading: true, error: null });
      set({ entityPhotos: newMap });

      const photo = await invoke<Photo>("save_photo", {
        sourcePath: selected,
        entityType,
        entityId,
      });

      // Update local state
      const updatedMap = new Map(get().entityPhotos);
      const existing = updatedMap.get(key) || { photos: [], loading: false, error: null };
      updatedMap.set(key, {
        photos: [photo, ...existing.photos],
        loading: false,
        error: null
      });
      set({ entityPhotos: updatedMap });

      // Update photo count
      const countMap = new Map(get().photoCounts);
      countMap.set(key, (countMap.get(key) || 0) + 1);
      set({ photoCounts: countMap });

      return photo;
    } catch (error) {
      const key = getEntityKey(entityType, entityId);
      const updatedMap = new Map(get().entityPhotos);
      const existing = updatedMap.get(key) || { photos: [], loading: false, error: null };
      updatedMap.set(key, { ...existing, loading: false, error: getErrorMessage(error) });
      set({ entityPhotos: updatedMap });
      return null;
    }
  },

  deleteEntityPhoto: async (entityType: EntityType, entityId: number, photoId: number): Promise<boolean> => {
    const key = getEntityKey(entityType, entityId);
    const current = get().entityPhotos.get(key) || { photos: [], loading: false, error: null };

    // Set loading state
    const newMap = new Map(get().entityPhotos);
    newMap.set(key, { ...current, loading: true });
    set({ entityPhotos: newMap });

    try {
      const success = await invoke<boolean>("delete_photo", { id: photoId });

      if (success) {
        const updatedMap = new Map(get().entityPhotos);
        const existing = updatedMap.get(key) || { photos: [], loading: false, error: null };
        updatedMap.set(key, {
          photos: existing.photos.filter((p) => p.id !== photoId),
          loading: false,
          error: null
        });
        set({ entityPhotos: updatedMap });

        // Update photo count
        const countMap = new Map(get().photoCounts);
        const currentCount = countMap.get(key) || 0;
        countMap.set(key, Math.max(0, currentCount - 1));
        set({ photoCounts: countMap });

        // Also remove from global photos if present
        set((state) => ({
          photos: state.photos.filter((p) => p.id !== photoId),
        }));
      }

      return success;
    } catch (error) {
      const updatedMap = new Map(get().entityPhotos);
      const existing = updatedMap.get(key) || { photos: [], loading: false, error: null };
      updatedMap.set(key, { ...existing, loading: false, error: getErrorMessage(error) });
      set({ entityPhotos: updatedMap });
      return false;
    }
  },

  getEntityPhotos: (entityType: EntityType, entityId: number): EntityPhotoCache => {
    const key = getEntityKey(entityType, entityId);
    return get().entityPhotos.get(key) || { photos: [], loading: false, error: null };
  },

  fetchPhotoCount: async (entityType: EntityType, entityId: number) => {
    const key = getEntityKey(entityType, entityId);
    try {
      const count = await invoke<number>("get_photo_count", {
        entityType,
        entityId,
      });
      const countMap = new Map(get().photoCounts);
      countMap.set(key, count);
      set({ photoCounts: countMap });
    } catch (error) {
      console.error("Failed to fetch photo count:", error);
    }
  },

  getPhotoCount: (entityType: EntityType, entityId: number): number => {
    const key = getEntityKey(entityType, entityId);
    return get().photoCounts.get(key) || 0;
  },

  getPhotoUrl: (photo: Photo | PhotoWithDetails): string => {
    return convertFileSrc(photo.filePath);
  },

  getThumbnailUrl: (photo: Photo | PhotoWithDetails): string => {
    const path = photo.thumbnailPath || photo.filePath;
    return convertFileSrc(path);
  },
}));
