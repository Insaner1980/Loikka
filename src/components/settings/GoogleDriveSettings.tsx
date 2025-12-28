import { useEffect, useState } from "react";
import {
  Trash2,
  Download,
  Loader2,
  ExternalLink,
  ArrowUpFromLine,
  ArrowDownToLine,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import DriveIcon from "../../assets/drive.svg";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useSyncStore } from "../../stores/useSyncStore";
import { formatBackupDate, formatBackupSize } from "../../lib/googleDrive";
import { toast } from "../ui/Toast";
import { SettingsSection } from "./SettingsSection";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { SyncOptionsDialog } from "./SyncOptionsDialog";
import type { SyncOptions } from "../../types";

type ConfirmAction = "disconnect" | "restore" | "delete" | null;
type SyncDialogMode = "upload" | "download" | null;

export function GoogleDriveSettings() {
  const {
    authStatus,
    backups,
    loading,
    checkStatus,
    startAuth,
    disconnect,
    syncToCloudWithOptions,
    syncFromCloudWithOptions,
    fetchBackups,
    removeBackup,
  } = useSyncStore();

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [syncDialogMode, setSyncDialogMode] = useState<SyncDialogMode>(null);
  const [restoreBackupId, setRestoreBackupId] = useState<string | null>(null);
  const [backupsExpanded, setBackupsExpanded] = useState(() => {
    const saved = localStorage.getItem("loikka-backups-expanded");
    return saved !== "false"; // Default to expanded
  });

  // Save expanded state to localStorage
  useEffect(() => {
    localStorage.setItem("loikka-backups-expanded", String(backupsExpanded));
  }, [backupsExpanded]);

  // Check auth status on mount
  useEffect(() => {
    checkStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch backups when authenticated
  useEffect(() => {
    if (authStatus.isAuthenticated) {
      fetchBackups();
    }
  }, [authStatus.isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = async () => {
    try {
      const authUrl = await startAuth();
      // Open in default browser using Tauri opener plugin
      await openUrl(authUrl);

      // Poll for auth status after opening browser
      const pollInterval = setInterval(async () => {
        await checkStatus();
        if (authStatus.isAuthenticated) {
          clearInterval(pollInterval);
          toast.success("Google Drive yhdistetty!");
        }
      }, 2000); // Check every 2 seconds

      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000);
    } catch (e) {
      console.error("Auth error:", e);
      toast.error("Yhdistäminen epäonnistui");
    }
  };

  const handleDisconnect = () => {
    setConfirmAction("disconnect");
  };

  const handleUploadClick = () => {
    setSyncDialogMode("upload");
  };

  const handleDownloadClick = () => {
    setRestoreBackupId(null);
    setSyncDialogMode("download");
  };

  const handleRestoreBackup = (backupId: string) => {
    setRestoreBackupId(backupId);
    setSyncDialogMode("download");
  };

  const handleDeleteBackup = (backupId: string) => {
    setSelectedBackupId(backupId);
    setConfirmAction("delete");
  };

  const handleSyncWithOptions = async (options: SyncOptions) => {
    let result;
    if (syncDialogMode === "upload") {
      result = await syncToCloudWithOptions(options);
    } else {
      result = await syncFromCloudWithOptions(restoreBackupId, options);
    }

    if (result.success) {
      toast.success(result.message);
      fetchBackups();
    } else {
      toast.error(result.message);
    }

    setSyncDialogMode(null);
    setRestoreBackupId(null);
  };

  const handleConfirm = async () => {
    if (confirmAction === "disconnect") {
      await disconnect();
    } else if (confirmAction === "delete" && selectedBackupId) {
      await removeBackup(selectedBackupId);
      toast.success("Varmuuskopio poistettu");
    }
    setConfirmAction(null);
    setSelectedBackupId(null);
  };

  const handleCancel = () => {
    setConfirmAction(null);
    setSelectedBackupId(null);
  };

  const getConfirmDialogProps = () => {
    switch (confirmAction) {
      case "disconnect":
        return {
          title: "Katkaise yhteys",
          message: "Haluatko varmasti katkaista yhteyden Google Driveen? Pilvivarmuuskopioita ei poisteta.",
          confirmText: "Katkaise",
          variant: "warning" as const,
        };
      case "delete":
        return {
          title: "Poista varmuuskopio",
          message: "Haluatko varmasti poistaa tämän varmuuskopion?",
          confirmText: "Poista",
          variant: "danger" as const,
        };
      default:
        return {
          title: "",
          message: "",
          confirmText: "OK",
          variant: "default" as const,
        };
    }
  };

  const dialogProps = getConfirmDialogProps();

  return (
    <>
      <SettingsSection>
        {/* Connection status */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <img
              src={DriveIcon}
              alt="Google Drive"
              className={`w-10 h-10 ${!authStatus.isAuthenticated ? "grayscale opacity-50" : ""}`}
              loading="eager"
            />
            <div>
              <div className="font-medium">
                {authStatus.isAuthenticated ? "Yhdistetty" : "Ei yhdistetty"}
              </div>
              {authStatus.isAuthenticated && authStatus.userEmail && (
                <div className="text-body text-muted-foreground">
                  {authStatus.userEmail}
                </div>
              )}
              {!authStatus.isAuthenticated && (
                <div className="text-body text-muted-foreground">
                  Yhdistä Google Drive varmuuskopiointia varten
                </div>
              )}
            </div>
          </div>

          {authStatus.isAuthenticated ? (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-4 py-2 text-body font-medium text-muted-foreground border border-border rounded-lg hover:text-foreground hover:border-border-hover transition-colors disabled:opacity-50 cursor-pointer"
            >
              Katkaise yhteys
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-body font-medium bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ExternalLink size={16} />
              )}
              Yhdistä
            </button>
          )}
        </div>

        {/* Sync controls - shown when authenticated */}
        {authStatus.isAuthenticated && (
          <>
            {/* Cloud backups - only show if there are backups */}
            {backups.length > 0 && (
              <div>
                <button
                  onClick={() => setBackupsExpanded(!backupsExpanded)}
                  className="flex items-center gap-2 font-medium mb-3 hover:text-accent transition-colors cursor-pointer"
                >
                  {backupsExpanded ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                  Pilvivarmuuskopiot ({backups.length})
                </button>
                {backupsExpanded && (
                  <div className="space-y-2">
                    {backups.map((backup) => (
                      <div
                        key={backup.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-body">{backup.name}</div>
                          <div className="text-caption text-muted-foreground">
                            {formatBackupDate(backup.createdAt)} •{" "}
                            {formatBackupSize(backup.sizeBytes)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRestoreBackup(backup.id)}
                            disabled={loading}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteBackup(backup.id)}
                            disabled={loading}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manual sync buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleUploadClick}
                disabled={loading}
                className="flex-1 flex items-center justify-center px-4 py-4 border border-border rounded-lg hover:bg-muted hover:text-accent transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ArrowUpFromLine size={28} />
              </button>
              <button
                onClick={handleDownloadClick}
                disabled={loading}
                className="flex-1 flex items-center justify-center px-4 py-4 border border-border rounded-lg hover:bg-muted hover:text-accent transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ArrowDownToLine size={28} />
              </button>
            </div>
          </>
        )}
      </SettingsSection>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        title={dialogProps.title}
        message={dialogProps.message}
        confirmText={dialogProps.confirmText}
        cancelText="Peruuta"
        variant={dialogProps.variant}
      />

      {/* Sync Options Dialog */}
      <SyncOptionsDialog
        open={syncDialogMode !== null}
        mode={syncDialogMode || "upload"}
        backupId={restoreBackupId}
        onClose={() => {
          setSyncDialogMode(null);
          setRestoreBackupId(null);
        }}
        onSync={handleSyncWithOptions}
      />
    </>
  );
}
