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
  type AuthStatus,
  type SyncResult,
  type CloudBackup,
} from "../lib/googleDrive";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

interface SyncStore {
  // State
  authStatus: AuthStatus;
  syncStatus: SyncStatus;
  lastSyncAt: Date | null;
  lastSyncResult: SyncResult | null;
  backups: CloudBackup[];
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
  fetchBackups: () => Promise<void>;
  removeBackup: (backupId: string) => Promise<void>;

  // Settings
  setAutoSync: (enabled: boolean) => void;
}

const DEFAULT_AUTH_STATUS: AuthStatus = {
  isAuthenticated: false,
  userEmail: null,
  expiresAt: null,
};

export const useSyncStore = create<SyncStore>((set, get) => ({
  // Initial state
  authStatus: DEFAULT_AUTH_STATUS,
  syncStatus: "idle",
  lastSyncAt: null,
  lastSyncResult: null,
  backups: [],
  loading: false,
  error: null,
  autoSyncEnabled: localStorage.getItem("autoSyncEnabled") === "true",

  // Check authentication status
  checkStatus: async () => {
    set({ loading: true, error: null });
    try {
      const status = await checkAuthStatus();
      set({ authStatus: status, loading: false });
    } catch (error) {
      set({
        error: (error as Error).message || String(error),
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
        error: (error as Error).message || String(error),
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
        error: (error as Error).message || String(error),
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
        error: (error as Error).message || String(error),
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
      }, 3000);

      return result;
    } catch (error) {
      const result: SyncResult = {
        success: false,
        message: (error as Error).message || String(error),
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
      }, 3000);

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
      }, 3000);

      return result;
    } catch (error) {
      const result: SyncResult = {
        success: false,
        message: (error as Error).message || String(error),
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
      }, 3000);

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
        error: (error as Error).message || String(error),
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
        error: (error as Error).message || String(error),
        loading: false,
      });
    }
  },

  // Toggle auto-sync
  setAutoSync: (enabled: boolean) => {
    localStorage.setItem("autoSyncEnabled", String(enabled));
    set({ autoSyncEnabled: enabled });
  },
}));
