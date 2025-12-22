import { useState, useRef, useEffect } from "react";
import { ImagePlus, X, Loader2, ChevronDown } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Dialog } from "../ui/Dialog";
import { toast } from "../ui/Toast";
import type { Athlete, Competition } from "../../types";

interface AddPhotoDialogProps {
  open: boolean;
  onClose: () => void;
  onPhotoAdded: () => void;
  athletes: Athlete[];
  competitions: Competition[];
  preselectedAthleteId?: number;
  preselectedCompetitionId?: number;
}

export function AddPhotoDialog({
  open: isOpen,
  onClose,
  onPhotoAdded,
  athletes,
  competitions,
  preselectedAthleteId,
  preselectedCompetitionId,
}: AddPhotoDialogProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [athleteId, setAthleteId] = useState<number | "">(preselectedAthleteId || "");
  const [competitionId, setCompetitionId] = useState<number | "">(preselectedCompetitionId || "");
  const [competitionName, setCompetitionName] = useState("");
  const [competitionDropdownOpen, setCompetitionDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const competitionInputRef = useRef<HTMLInputElement>(null);
  const competitionDropdownRef = useRef<HTMLDivElement>(null);

  // Filter competitions based on input
  const filteredCompetitions = competitions.filter((c) =>
    c.name.toLowerCase().includes(competitionName.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        competitionDropdownRef.current &&
        !competitionDropdownRef.current.contains(event.target as Node) &&
        competitionInputRef.current &&
        !competitionInputRef.current.contains(event.target as Node)
      ) {
        setCompetitionDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAthleteId(preselectedAthleteId || "");
    setCompetitionId(preselectedCompetitionId || "");
    setCompetitionName("");
    setCompetitionDropdownOpen(false);
    setError(null);
  };

  const handleSelectCompetition = (competition: Competition) => {
    setCompetitionId(competition.id);
    setCompetitionName(competition.name);
    setCompetitionDropdownOpen(false);
  };

  const handleCompetitionInputChange = (value: string) => {
    setCompetitionName(value);
    setCompetitionId(""); // Clear selected competition when typing
    setCompetitionDropdownOpen(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["jpg", "jpeg", "png", "gif", "webp"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        setSelectedFile(selected);
        setPreviewUrl(convertFileSrc(selected));
        setError(null);
      }
    } catch {
      toast.error("Tiedoston valinta epäonnistui");
    }
  };

  const handleSave = async () => {
    if (!selectedFile) {
      setError("Valitse kuva");
      return;
    }

    if (!athleteId) {
      setError("Valitse urheilija");
      return;
    }

    // Determine entity type and ID
    let entityType: string;
    let entityId: number;

    if (competitionId) {
      // Existing competition selected - save to competition
      entityType = "competitions";
      entityId = competitionId as number;
    } else {
      // Save to athlete (with optional free-text competition name)
      entityType = "athletes";
      entityId = athleteId as number;
    }

    setSaving(true);
    setError(null);

    try {
      // Determine event name to pass
      // If user typed a custom name (not from dropdown), use it
      const eventNameToSave = competitionId ? null : (competitionName.trim() || null);

      await invoke("save_photo", {
        sourcePath: selectedFile,
        entityType,
        entityId,
        eventName: eventNameToSave,
      });

      handleClose();
      onPhotoAdded();
    } catch (err) {
      setError((err as Error).message || "Kuvan tallentaminen epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} title="Lisää kuva">
      <div className="space-y-4">
        {/* Photo selector */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Kuva
          </label>
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Esikatselu"
                className="w-full max-h-64 object-contain rounded-lg bg-card"
              />
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black rounded-full transition-colors cursor-pointer"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSelectFile}
              className="w-full h-40 border-2 border-dashed border-border hover:border-[var(--accent)]/50 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ImagePlus size={32} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Klikkaa valitaksesi kuva
              </span>
            </button>
          )}
        </div>

        {/* Athlete selector */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Urheilija <span className="text-error">*</span>
          </label>
          <select
            value={athleteId}
            onChange={(e) => {
              setAthleteId(e.target.value ? Number(e.target.value) : "");
            }}
            className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 cursor-pointer"
            disabled={!!preselectedAthleteId}
          >
            <option value="">Valitse urheilija</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.firstName} {a.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Competition selector - combobox with free text */}
        <div className="relative">
          <label className="block text-sm font-medium text-foreground mb-2">
            Kilpailu
          </label>
          <div className="relative">
            <input
              ref={competitionInputRef}
              type="text"
              value={competitionName}
              onChange={(e) => handleCompetitionInputChange(e.target.value)}
              onFocus={() => setCompetitionDropdownOpen(true)}
              placeholder="Kirjoita tai valitse kilpailu"
              autoComplete="off"
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 pr-10"
              disabled={!!preselectedCompetitionId}
            />
            <button
              type="button"
              onClick={() => setCompetitionDropdownOpen(!competitionDropdownOpen)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              disabled={!!preselectedCompetitionId}
            >
              <ChevronDown size={18} className={`transition-transform ${competitionDropdownOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Dropdown list */}
          {competitionDropdownOpen && filteredCompetitions.length > 0 && (
            <div
              ref={competitionDropdownRef}
              className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
            >
              {filteredCompetitions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCompetition(c)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors cursor-pointer ${
                    competitionId === c.id ? "bg-muted text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Voit valita olemassa olevan tai kirjoittaa uuden nimen
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            className="btn-secondary"
            disabled={saving}
          >
            Peruuta
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={saving || !selectedFile}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Tallennetaan...
              </>
            ) : (
              "Tallenna"
            )}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
