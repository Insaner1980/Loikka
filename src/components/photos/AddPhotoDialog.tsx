import { useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Dialog } from "../ui/Dialog";
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAthleteId(preselectedAthleteId || "");
    setCompetitionId(preselectedCompetitionId || "");
    setError(null);
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
    } catch (err) {
      console.error("Failed to select file:", err);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) {
      setError("Valitse kuva");
      return;
    }

    // Determine entity type and ID
    let entityType: string;
    let entityId: number;

    if (competitionId) {
      entityType = "competitions";
      entityId = competitionId as number;
    } else if (athleteId) {
      entityType = "athletes";
      entityId = athleteId as number;
    } else {
      setError("Valitse urheilija tai kilpailu");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await invoke("save_photo", {
        sourcePath: selectedFile,
        entityType,
        entityId,
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
                className="w-full max-h-64 object-contain rounded-lg bg-[#141414]"
              />
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black rounded-full transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSelectFile}
              className="w-full h-40 border-2 border-dashed border-border hover:border-primary/50 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors"
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
            Urheilija {!competitionId && <span className="text-error">*</span>}
          </label>
          <select
            value={athleteId}
            onChange={(e) => {
              setAthleteId(e.target.value ? Number(e.target.value) : "");
              if (e.target.value) setCompetitionId(""); // Clear competition if athlete selected
            }}
            className="w-full bg-[#141414] border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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

        {/* Competition selector */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Kilpailu {!athleteId && <span className="text-error">*</span>}
          </label>
          <select
            value={competitionId}
            onChange={(e) => {
              setCompetitionId(e.target.value ? Number(e.target.value) : "");
              if (e.target.value) setAthleteId(""); // Clear athlete if competition selected
            }}
            className="w-full bg-[#141414] border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={!!preselectedCompetitionId}
          >
            <option value="">Valitse kilpailu</option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            Valitse joko urheilija tai kilpailu
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
