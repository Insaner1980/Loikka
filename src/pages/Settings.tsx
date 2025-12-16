import { useState } from "react";
import {
  Download,
  Upload,
  Info,
  Sun,
  Moon,
} from "lucide-react";
import { SettingsSection, SettingsToggle, GoogleDriveSettings } from "../components/settings";
import { useTheme } from "../hooks";
import { exportData, importData } from "../lib";

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Asetukset</h1>

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
