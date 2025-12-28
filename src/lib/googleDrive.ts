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

// Photo and selective sync functions
import type { SyncOptions, CloudPhoto, LocalPhoto } from "../types";

export async function listCloudPhotos(): Promise<CloudPhoto[]> {
  return invoke<CloudPhoto[]>("list_cloud_photos");
}

export async function listLocalPhotos(): Promise<LocalPhoto[]> {
  return invoke<LocalPhoto[]>("list_local_photos");
}

export async function syncToDriveWithOptions(options: SyncOptions): Promise<SyncResult> {
  return invoke<SyncResult>("sync_to_drive_with_options", { options });
}

export async function restoreFromDriveWithOptions(
  backupId: string | null,
  options: SyncOptions
): Promise<SyncResult> {
  return invoke<SyncResult>("restore_from_drive_with_options", { backupId, options });
}

// Utility functions
export function formatBackupSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Re-export from formatters for backwards compatibility
export { formatDateTime as formatBackupDate } from "./formatters";
