import { useEffect } from "react";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useSyncStore } from "../../stores/useSyncStore";
import { formatBackupDate, formatBackupSize } from "../../lib/googleDrive";
import { SettingsSection } from "./SettingsSection";
import { SettingsToggle } from "./SettingsToggle";

export function GoogleDriveSettings() {
  const {
    authStatus,
    syncStatus,
    lastSyncAt,
    lastSyncResult,
    backups,
    loading,
    autoSyncEnabled,
    checkStatus,
    startAuth,
    disconnect,
    syncToCloud,
    syncFromCloud,
    fetchBackups,
    removeBackup,
    setAutoSync,
  } = useSyncStore();

  // Check auth status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Fetch backups when authenticated
  useEffect(() => {
    if (authStatus.isAuthenticated) {
      fetchBackups();
    }
  }, [authStatus.isAuthenticated, fetchBackups]);

  const handleConnect = async () => {
    try {
      const authUrl = await startAuth();
      // Open in default browser
      window.open(authUrl, "_blank");
    } catch (error) {
      console.error("Failed to start auth:", error);
    }
  };

  const handleDisconnect = async () => {
    if (
      window.confirm(
        "Haluatko varmasti katkaista yhteyden Google Driveen? Pilvivarmuuskopioita ei poisteta."
      )
    ) {
      await disconnect();
    }
  };

  const handleSync = async () => {
    await syncToCloud();
  };

  const handleRestore = async (backupId: string) => {
    if (
      window.confirm(
        "Haluatko varmasti palauttaa tämän varmuuskopion? Nykyiset tiedot korvataan."
      )
    ) {
      await syncFromCloud(backupId);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (window.confirm("Haluatko varmasti poistaa tämän varmuuskopion?")) {
      await removeBackup(backupId);
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case "syncing":
        return <Loader2 size={16} className="animate-spin text-primary" />;
      case "success":
        return <CheckCircle size={16} className="text-green-500" />;
      case "error":
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <SettingsSection title="Google Drive">
      {/* Connection status */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          {authStatus.isAuthenticated ? (
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Cloud size={20} className="text-green-500" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <CloudOff size={20} className="text-muted-foreground" />
            </div>
          )}
          <div>
            <div className="font-medium">
              {authStatus.isAuthenticated ? "Yhdistetty" : "Ei yhdistetty"}
            </div>
            {authStatus.isAuthenticated && authStatus.userEmail && (
              <div className="text-sm text-muted-foreground">
                {authStatus.userEmail}
              </div>
            )}
            {!authStatus.isAuthenticated && (
              <div className="text-sm text-muted-foreground">
                Yhdistä Google Drive varmuuskopiointia varten
              </div>
            )}
          </div>
        </div>

        {authStatus.isAuthenticated ? (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            Katkaise yhteys
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
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

      {/* Feature notice */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-500 mt-0.5" />
          <div>
            <div className="font-medium text-amber-600 dark:text-amber-400">
              Tulossa pian
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Google Drive -synkronointi on kehitteillä. Käytä toistaiseksi
              paikallista vientiä ja tuontia tietojen varmuuskopiointiin.
            </p>
          </div>
        </div>
      </div>

      {/* Sync controls - shown when authenticated */}
      {authStatus.isAuthenticated && (
        <>
          {/* Auto-sync toggle */}
          <SettingsToggle
            label="Automaattinen synkronointi"
            description="Synkronoi muutokset automaattisesti Google Driveen"
            checked={autoSyncEnabled}
            onChange={setAutoSync}
          />

          {/* Last sync info */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">
                Viimeisin synkronointi
              </div>
              <div className="font-medium">
                {lastSyncAt
                  ? formatBackupDate(lastSyncAt.toISOString())
                  : "Ei synkronoitu"}
              </div>
              {lastSyncResult && !lastSyncResult.success && (
                <div className="text-sm text-red-500 mt-1">
                  {lastSyncResult.message}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getSyncStatusIcon()}
              <button
                onClick={handleSync}
                disabled={loading || syncStatus === "syncing"}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={syncStatus === "syncing" ? "animate-spin" : ""}
                />
                Synkronoi nyt
              </button>
            </div>
          </div>

          {/* Cloud backups */}
          <div>
            <h3 className="font-medium mb-3">Pilvivarmuuskopiot</h3>
            {backups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Ei varmuuskopioita
              </p>
            ) : (
              <div className="space-y-2">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-sm">{backup.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatBackupDate(backup.createdAt)} •{" "}
                        {formatBackupSize(backup.sizeBytes)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestore(backup.id)}
                        disabled={loading}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        title="Palauta"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup.id)}
                        disabled={loading}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Poista"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual sync buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={loading || syncStatus === "syncing"}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Upload size={18} />
              Lähetä pilveen
            </button>
            <button
              onClick={() => syncFromCloud()}
              disabled={loading || syncStatus === "syncing"}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Download size={18} />
              Lataa pilvestä
            </button>
          </div>
        </>
      )}
    </SettingsSection>
  );
}
