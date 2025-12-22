import { useState } from "react";
import {
  Download,
  Upload,
  Palette,
} from "lucide-react";
import { SettingsSection, GoogleDriveSettings } from "../components/settings";
import { SegmentedControl } from "../components/ui";
import { useTheme } from "../hooks";
import { exportData, importData } from "../lib";

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await exportData();
      if (saved) {
        setSuccess("Tiedot viety onnistuneesti");
      }
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
      const imported = await importData();
      if (imported) {
        setSuccess("Tiedot tuotu onnistuneesti");
      }
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
        <h1 className="text-title font-medium text-foreground">Asetukset</h1>
      </div>

      <div className="space-y-6">
        {/* Appearance section */}
        <SettingsSection title="Ulkoasu">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Palette size={20} className="text-muted-foreground" />
              <div>
                <span className="font-medium">Teema</span>
                <p className="text-sm text-muted-foreground">
                  Valitse sovelluksen ulkoasu
                </p>
              </div>
            </div>
            <SegmentedControl
              options={[
                { value: "light", label: "Vaalea" },
                { value: "dark", label: "Tumma" },
              ]}
              value={theme}
              onChange={setTheme}
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
              className="flex items-center gap-3 px-4 py-3 bg-card border border-border-subtle rounded-lg hover:border-border-hover transition-colors duration-150 disabled:opacity-50 cursor-pointer"
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
              className="flex items-center gap-3 px-4 py-3 bg-card border border-border-subtle rounded-lg hover:border-border-hover transition-colors duration-150 disabled:opacity-50 cursor-pointer"
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
        </SettingsSection>

        {/* Google Drive section */}
        <GoogleDriveSettings />
      </div>
    </div>
  );
}
