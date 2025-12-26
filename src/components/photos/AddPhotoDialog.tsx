import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, X, Loader2, ChevronDown } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Dialog } from "../ui/Dialog";
import { toast } from "../ui/Toast";
import { FilterSelect, type FilterOption } from "../ui/FilterSelect";
import { calculateDropdownPosition } from "../../hooks";
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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Calculate dropdown position when opening
  useEffect(() => {
    if (competitionDropdownOpen && competitionInputRef.current) {
      setDropdownStyle(calculateDropdownPosition(competitionInputRef.current));
    }
  }, [competitionDropdownOpen]);

  // Filter competitions based on input
  const filteredCompetitions = competitions.filter((c) =>
    c.name.toLowerCase().includes(competitionName.toLowerCase())
  );

  // Athlete options for FilterSelect
  const athleteOptions: FilterOption[] = useMemo(() => [
    { value: "", label: "Valitse urheilija" },
    ...athletes.map((a) => ({
      value: a.id,
      label: `${a.firstName} ${a.lastName}`,
    })),
  ], [athletes]);

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

    // Use 'click' instead of 'mousedown' to allow scrollbar dragging
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
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

      toast.success("Kuva lisätty");
      handleClose();
      onPhotoAdded();
    } catch (err) {
      setError((err as Error).message || "Kuvan tallentaminen epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} title="Lisää kuva" maxWidth="2xl">
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
                className="w-full max-h-48 object-contain rounded-lg bg-card"
                loading="eager"
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
              className="w-full h-32 border-2 border-dashed border-border hover:border-[var(--accent)]/50 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ImagePlus size={32} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Klikkaa valitaksesi kuva
              </span>
            </button>
          )}
        </div>

        {/* Row: Athlete + Competition */}
        <div className="grid grid-cols-2 gap-4">
          {/* Athlete selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Urheilija <span className="text-error">*</span>
            </label>
            <FilterSelect
              value={athleteId}
              onChange={(value) => setAthleteId(value === "" ? "" : (value as number))}
              options={athleteOptions}
              disabled={!!preselectedAthleteId}
              className="w-full"
            />
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
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm input-focus pr-10"
                disabled={!!preselectedCompetitionId}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCompetitionDropdownOpen(!competitionDropdownOpen);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                disabled={!!preselectedCompetitionId}
              >
                <ChevronDown size={18} className={`transition-transform ${competitionDropdownOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Dropdown list - rendered as portal */}
            {competitionDropdownOpen && filteredCompetitions.length > 0 && createPortal(
              <div
                ref={competitionDropdownRef}
                style={dropdownStyle}
                className="dropdown-menu"
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
              </div>,
              document.body
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Voit valita olemassa olevan tai kirjoittaa uuden nimen
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center overflow-hidden rounded-lg bg-elevated">
            <div className="w-1 self-stretch bg-[var(--accent)]" />
            <div className="px-3 py-2 text-sm text-foreground">{error}</div>
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
