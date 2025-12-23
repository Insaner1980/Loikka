import { create } from "zustand";
import {
  checkAuthStatus,
  startAuthFlow,
  completeAuth,
  disconnectDrive,
  syncToDrive,
  syncFromDrive,
  getCloudBackups,
  deleteCloudBackup,
  listCloudPhotos,
  listLocalPhotos,
  syncToDriveWithOptions,
  restoreFromDriveWithOptions,
  type AuthStatus,
  type SyncResult,
  type CloudBackup,
} from "../lib/googleDrive";
import { getErrorMessage } from "../lib";
import type { SyncOptions, CloudPhoto, LocalPhoto, SyncOperationStatus } from "../types";

interface SyncStore {
  // State
  authStatus: AuthStatus;
  syncStatus: SyncOperationStatus;
  lastSyncAt: Date | null;
  lastSyncResult: SyncResult | null;
  backups: CloudBackup[];
  cloudPhotos: CloudPhoto[];
  localPhotos: LocalPhoto[];
  loading: boolean;
  error: string | null;
  autoSyncEnabled: boolean;

  // Auth actions
  checkStatus: () => Promise<void>;
  startAuth: () => Promise<string>;
  completeAuth: (code: string) => Promise<boolean>;
  disconnect: () => Promise<void>;

  // Sync actions
  syncToCloud: () => Promise<SyncResult>;
  syncFromCloud: (backupId?: string) => Promise<SyncResult>;
  syncToCloudWithOptions: (options: SyncOptions) => Promise<SyncResult>;
  syncFromCloudWithOptions: (backupId: string | null, options: SyncOptions) => Promise<SyncResult>;
  fetchBackups: () => Promise<void>;
  removeBackup: (backupId: string) => Promise<void>;

  // Photo listing
  fetchCloudPhotos: () => Promise<void>;
  fetchLocalPhotos: () => Promise<void>;

  // Settings
  setAutoSync: (enabled: boolean) => void;
}

const DEFAULT_AUTH_STATUS: AuthStatus = {
  isAuthenticated: false,
  userEmail: null,
  expiresAt: null,
};

const SYNC_STATUS_RESET_DELAY = 3000;

function getStoredAutoSync(): boolean {
  try {
    return localStorage.getItem("autoSyncEnabled") === "true";
  } catch {
    return false;
  }
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  // Initial state
  authStatus: DEFAULT_AUTH_STATUS,
  syncStatus: "idle",
  lastSyncAt: null,
  lastSyncResult: null,
  backups: [],
  cloudPhotos: [],
  localPhotos: [],
  loading: false,
  error: null,
  autoSyncEnabled: getStoredAutoSync(),

  // Check authentication status
  checkStatus: async () => {
    set({ loading: true, error: null });
    try {
      const status = await checkAuthStatus();
      set({ authStatus: status, loading: false });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        loading: false,
        authStatus: DEFAULT_AUTH_STATUS,
      });
    }
  },

  // Start OAuth flow
  startAuth: async () => {
    set({ loading: true, error: null });
    try {
      const authUrl = await startAuthFlow();
      set({ loading: false });
      return authUrl;
    } catch (error) {
      set({
        error: getErrorMessage(error),
        loading: false,
      });
      throw error;
    }
  },

  // Complete OAuth flow
  completeAuth: async (code: string) => {
    set({ loading: true, error: null });
    try {
      const success = await completeAuth(code);
      if (success) {
        await get().checkStatus();
      }
      set({ loading: false });
      return success;
    } catch (error) {
      set({
        error: getErrorMessage(error),
        loading: false,
      });
      return false;
    }
  },

  // Disconnect from Google Drive
  disconnect: async () => {
    set({ loading: true, error: null });
    try {
      await disconnectDrive();
      set({
        authStatus: DEFAULT_AUTH_STATUS,
        backups: [],
        lastSyncAt: null,
        lastSyncResult: null,
        loading: false,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        loading: false,
      });
    }
  },

  // Sync to Google Drive
  syncToCloud: async () => {
    set({ syncStatus: "syncing", error: null });
    try {
      const result = await syncToDrive();
      set({
        syncStatus: result.success ? "success" : "error",
        lastSyncResult: result,
        lastSyncAt: result.success && result.syncedAt ? new Date(result.syncedAt) : get().lastSyncAt,
      });

      // Reset status after a delay
      setTimeout(() => {
        set({ syncStatus: "idle" });
      }, SYNC_STATUS_RESET_DELAY);

      return result;
    } catch (error) {
      const result: SyncResult = {
        success: false,
        message: getErrorMessage(error),
        syncedAt: null,
        itemsSynced: null,
      };
      set({
        syncStatus: "error",
        lastSyncResult: result,
        error: result.message,
      });

      setTimeout(() => {
        set({ syncStatus: "idle" });
      }, SYNC_STATUS_RESET_DELAY);

      return result;
    }
  },

  // Sync from Google Drive
  syncFromCloud: async (backupId?: string) => {
    set({ syncStatus: "syncing", error: null });
    try {
      const result = await syncFromDrive(backupId);
      set({
        syncStatus: result.success ? "success" : "error",
        lastSyncResult: result,
      });

      setTimeout(() => {
        set({ syncStatus: "idle" });
      }, SYNC_STATUS_RESET_DELAY);

      return result;
    } catch (error) {
      const result: SyncResult = {
        success: false,
        message: getErrorMessage(error),
        syncedAt: null,
        itemsSynced: null,
      };
      set({
        syncStatus: "error",
        lastSyncResult: result,
        error: result.message,
      });

      setTimeout(() => {
        set({ syncStatus: "idle" });
      }, SYNC_STATUS_RESET_DELAY);

      return result;
    }
  },

  // Fetch cloud backups
  fetchBackups: async () => {
    set({ loading: true, error: null });
    try {
      const backups = await getCloudBackups();
      set({ backups, loading: false });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        loading: false,
      });
    }
  },

  // Delete a backup
  removeBackup: async (backupId: string) => {
    set({ loading: true, error: null });
    try {
      await deleteCloudBackup(backupId);
      set((state) => ({
        backups: state.backups.filter((b) => b.id !== backupId),
        loading: false,
      }));
    } catch (error) {
      set({
        error: getErrorMessage(error),
        loading: false,
      });
    }
  },

  // Toggle auto-sync
  setAutoSync: (enabled: boolean) => {
    localStorage.setItem("autoSyncEnabled", String(enabled));
    set({ autoSyncEnabled: enabled });
  },

  // Sync to cloud with options
  syncToCloudWithOptions: async (options: SyncOptions) => {
    set({ syncStatus: "syncing", error: null });
    try {
      const result = await syncToDriveWithOptions(options);
      set({
        syncStatus: result.success ? "success" : "error",
        lastSyncResult: result,
        lastSyncAt: result.success && result.syncedAt ? new Date(result.syncedAt) : get().lastSyncAt,
      });

      setTimeout(() => {
        set({ syncStatus: "idle" });
      }, SYNC_STATUS_RESET_DELAY);

      return result;
    } catch (error) {
      const result: SyncResult = {
        success: false,
        message: getErrorMessage(error),
        syncedAt: null,
        itemsSynced: null,
      };
      set({
        syncStatus: "error",
        lastSyncResult: result,
        error: result.message,
      });

      setTimeout(() => {
        set({ syncStatus: "idle" });
      }, SYNC_STATUS_RESET_DELAY);

      return result;
    }
  },

  // Sync from cloud with options
  syncFromCloudWithOptions: async (backupId: string | null, options: SyncOptions) => {
    set({ syncStatus: "syncing", error: null });
    try {
      const result = await restoreFromDriveWithOptions(backupId, options);
      set({
        syncStatus: result.success ? "success" : "error",
        lastSyncResult: result,
      });

      setTimeout(() => {
        set({ syncStatus: "idle" });
      }, SYNC_STATUS_RESET_DELAY);

      return result;
    } catch (error) {
      const result: SyncResult = {
        success: false,
        message: getErrorMessage(error),
        syncedAt: null,
        itemsSynced: null,
      };
      set({
        syncStatus: "error",
        lastSyncResult: result,
        error: result.message,
      });

      setTimeout(() => {
        set({ syncStatus: "idle" });
      }, SYNC_STATUS_RESET_DELAY);

      return result;
    }
  },

  // Fetch cloud photos
  fetchCloudPhotos: async () => {
    try {
      const photos = await listCloudPhotos();
      set({ cloudPhotos: photos });
    } catch (error) {
      console.error("Failed to fetch cloud photos:", error);
    }
  },

  // Fetch local photos
  fetchLocalPhotos: async () => {
    try {
      const photos = await listLocalPhotos();
      set({ localPhotos: photos });
    } catch (error) {
      console.error("Failed to fetch local photos:", error);
    }
  },
}));
