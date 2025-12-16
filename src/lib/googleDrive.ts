import { invoke } from "@tauri-apps/api/core";

// Types
export interface AuthStatus {
  isAuthenticated: boolean;
  userEmail: string | null;
  expiresAt: string | null;
}

export interface SyncResult {
  success: boolean;
  message: string;
  syncedAt: string | null;
  itemsSynced: number | null;
}

export interface CloudBackup {
  id: string;
  name: string;
  createdAt: string;
  sizeBytes: number;
}

// API functions
export async function checkAuthStatus(): Promise<AuthStatus> {
  return invoke<AuthStatus>("check_auth_status");
}

export async function startAuthFlow(): Promise<string> {
  return invoke<string>("start_auth_flow");
}

export async function completeAuth(code: string): Promise<boolean> {
  return invoke<boolean>("complete_auth", { code });
}

export async function disconnectDrive(): Promise<boolean> {
  return invoke<boolean>("disconnect_drive");
}

export async function syncToDrive(): Promise<SyncResult> {
  return invoke<SyncResult>("sync_to_drive");
}

export async function syncFromDrive(backupId?: string): Promise<SyncResult> {
  return invoke<SyncResult>("sync_from_drive", { backupId });
}

export async function getCloudBackups(): Promise<CloudBackup[]> {
  return invoke<CloudBackup[]>("get_cloud_backups");
}

export async function deleteCloudBackup(backupId: string): Promise<boolean> {
  return invoke<boolean>("delete_cloud_backup", { backupId });
}

// Utility functions
export function formatBackupSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatBackupDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
