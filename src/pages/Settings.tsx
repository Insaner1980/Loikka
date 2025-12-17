import { useState, useEffect } from "react";
import {
  Download,
  Upload,
  Info,
  Sun,
  Moon,
  Bell,
  BellOff,
  Check,
} from "lucide-react";
import { SettingsSection, SettingsToggle, GoogleDriveSettings } from "../components/settings";
import { useTheme, checkNotificationPermission, requestNotificationPermission } from "../hooks";
import { exportData, importData } from "../lib";

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Notification permission state
  const [notificationSupported, setNotificationSupported] = useState(true);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Check notification permission on mount
  useEffect(() => {
    checkNotificationPermission().then(({ supported, granted }) => {
      setNotificationSupported(supported);
      setNotificationGranted(granted);
    });
  }, []);

  const handleRequestNotificationPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const granted = await requestNotificationPermission();
      setNotificationGranted(granted);
      if (granted) {
        setSuccess("Ilmoitukset käytössä");
      } else {
        setError("Ilmoituslupa evätty");
      }
    } catch {
      setError("Ilmoitusluvan pyytäminen epäonnistui");
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(null);
    try {
      await exportData();
      setSuccess("Tiedot viety onnistuneesti");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    setSuccess(null);
    try {
      await importData();
      setSuccess("Tiedot tuotu onnistuneesti");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6 pb-5 border-b border-border-subtle">
        <h1 className="text-base font-medium text-foreground">Asetukset</h1>
      </div>

      <div className="space-y-6">
        {/* Appearance section */}
        <SettingsSection title="Ulkoasu">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon size={20} className="text-muted-foreground" />
              ) : (
                <Sun size={20} className="text-muted-foreground" />
              )}
              <div>
                <span className="font-medium">Tumma teema</span>
                <p className="text-sm text-muted-foreground">
                  {theme === "dark" ? "Käytössä" : "Ei käytössä"}
                </p>
              </div>
            </div>
            <SettingsToggle
              label=""
              checked={theme === "dark"}
              onChange={toggleTheme}
            />
          </div>
        </SettingsSection>

        {/* Notifications section */}
        {notificationSupported && (
          <SettingsSection title="Ilmoitukset">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {notificationGranted ? (
                  <Bell size={20} className="text-muted-foreground" />
                ) : (
                  <BellOff size={20} className="text-muted-foreground" />
                )}
                <div>
                  <span className="font-medium">Kilpailumuistutukset</span>
                  <p className="text-sm text-muted-foreground">
                    {notificationGranted
                      ? "Saat ilmoituksia tulevista kilpailuista"
                      : "Salli ilmoitukset muistutusten saamiseksi"}
                  </p>
                </div>
              </div>
              {notificationGranted ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-lg text-sm">
                  <Check size={16} />
                  <span>Käytössä</span>
                </div>
              ) : (
                <button
                  onClick={handleRequestNotificationPermission}
                  disabled={isRequestingPermission}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {isRequestingPermission ? "Odotetaan..." : "Salli ilmoitukset"}
                </button>
              )}
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Info size={18} className="text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Muistutukset lähetetään kilpailulle asetetun päivämäärän mukaisesti.
                Voit hallita yksittäisten kilpailujen muistutuksia kalenterinäkymässä.
              </p>
            </div>
          </SettingsSection>
        )}

        {/* Data section */}
        <SettingsSection title="Tiedot">
          {error && (
            <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
              {success}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-3 px-4 py-3 bg-muted rounded-lg hover:bg-muted-foreground/10 transition-colors disabled:opacity-50"
            >
              <Download size={20} className="text-muted-foreground" />
              <div className="text-left">
                <span className="font-medium">Vie tiedot</span>
                <p className="text-sm text-muted-foreground">
                  Tallenna kaikki tiedot JSON-tiedostoon
                </p>
              </div>
            </button>

            <button
              onClick={handleImport}
              disabled={isImporting}
              className="flex items-center gap-3 px-4 py-3 bg-muted rounded-lg hover:bg-muted-foreground/10 transition-colors disabled:opacity-50"
            >
              <Upload size={20} className="text-muted-foreground" />
              <div className="text-left">
                <span className="font-medium">Tuo tiedot</span>
                <p className="text-sm text-muted-foreground">
                  Lataa tiedot JSON-tiedostosta
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Info size={18} className="text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Varmuuskopioi tiedot säännöllisesti viemällä ne JSON-tiedostoon.
              Voit palauttaa tiedot tuomalla ne takaisin.
            </p>
          </div>
        </SettingsSection>

        {/* Google Drive section */}
        <GoogleDriveSettings />

        {/* About section */}
        <SettingsSection title="Tietoja">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sovellus</span>
              <span className="font-medium">Loikka</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Versio</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                Tehty rakkaudella perheelle
              </p>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
