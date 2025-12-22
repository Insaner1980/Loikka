import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getErrorMessage } from "../lib";

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

interface UsePhotosReturn {
  photos: Photo[];
  loading: boolean;
  error: string | null;
  fetchPhotos: () => Promise<void>;
  addPhoto: () => Promise<Photo | null>;
  deletePhoto: (id: number) => Promise<boolean>;
  getPhotoUrl: (photo: Photo) => string;
  getThumbnailUrl: (photo: Photo) => string;
}

export function usePhotos(entityType: EntityType, entityId: number): UsePhotosReturn {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!entityId) return;

    setLoading(true);
    setError(null);
    try {
      const result = await invoke<Photo[]>("get_photos", {
        entityType,
        entityId,
      });
      setPhotos(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  const addPhoto = useCallback(async (): Promise<Photo | null> => {
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

      setLoading(true);
      setError(null);

      // Save photo via backend
      const photo = await invoke<Photo>("save_photo", {
        sourcePath: selected,
        entityType,
        entityId,
      });

      // Update local state
      setPhotos((prev) => [photo, ...prev]);

      return photo;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  const deletePhoto = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const success = await invoke<boolean>("delete_photo", { id });
      if (success) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      }
      return success;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPhotoUrl = useCallback((photo: Photo): string => {
    // Convert file path to Tauri asset URL
    return convertFileSrc(photo.filePath);
  }, []);

  const getThumbnailUrl = useCallback((photo: Photo): string => {
    // Use thumbnail if available, otherwise use full image
    const path = photo.thumbnailPath || photo.filePath;
    return convertFileSrc(path);
  }, []);

  return {
    photos,
    loading,
    error,
    fetchPhotos,
    addPhoto,
    deletePhoto,
    getPhotoUrl,
    getThumbnailUrl,
  };
}

// Utility hook to get photo count for an entity
export function usePhotoCount(entityType: EntityType, entityId: number) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    if (!entityId) return;

    setLoading(true);
    try {
      const result = await invoke<number>("get_photo_count", {
        entityType,
        entityId,
      });
      setCount(result);
    } catch (err) {
      console.error("Failed to fetch photo count:", err);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  return { count, loading, fetchCount };
}
