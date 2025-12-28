import { useState, useEffect } from "react";
import { Camera, User, X } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import type { Athlete, NewAthlete } from "../../types";
import { toAssetUrl } from "../../lib/formatters";
import { ATHLETE_BIRTH_YEAR } from "../../lib/constants";
import { toast } from "../ui/Toast";
import { FilterSelect, type FilterOption } from "../ui/FilterSelect";

interface AthleteFormProps {
  athlete?: Athlete;
  onSave: (data: NewAthlete) => void;
  onCancel: () => void;
  disabled?: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  birthYear?: string;
}

// Generate birth year options
const birthYearValues = Array.from(
  { length: ATHLETE_BIRTH_YEAR.MAX - ATHLETE_BIRTH_YEAR.MIN + 1 },
  (_, i) => ATHLETE_BIRTH_YEAR.MAX - i
);

const birthYearOptions: FilterOption[] = [
  { value: "", label: "Valitse vuosi" },
  ...birthYearValues.map((year) => ({ value: year, label: String(year) })),
];

export function AthleteForm({ athlete, onSave, onCancel, disabled = false }: AthleteFormProps) {
  const [firstName, setFirstName] = useState(athlete?.firstName || "");
  const [lastName, setLastName] = useState(athlete?.lastName || "");
  const [birthYear, setBirthYear] = useState<number | "">(
    athlete?.birthYear || ""
  );
  const [clubName, setClubName] = useState(athlete?.clubName || "");
  const [photoPath, setPhotoPath] = useState(athlete?.photoPath || "");
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>("");
  const [pendingPhotoSource, setPendingPhotoSource] = useState<string>("");
  const [errors, setErrors] = useState<FormErrors>({});

  // Reset form when athlete prop changes
  useEffect(() => {
    if (athlete) {
      setFirstName(athlete.firstName);
      setLastName(athlete.lastName);
      setBirthYear(athlete.birthYear);
      setClubName(athlete.clubName || "");
      setPhotoPath(athlete.photoPath || "");
      setPendingPhotoSource("");
      // Set preview URL immediately when loading existing athlete
      setPhotoPreviewUrl(athlete.photoPath ? toAssetUrl(athlete.photoPath) : "");
    } else {
      setFirstName("");
      setLastName("");
      setBirthYear("");
      setClubName("");
      setPhotoPath("");
      setPendingPhotoSource("");
      setPhotoPreviewUrl("");
    }
    setErrors({});
  }, [athlete]);

  // Update photo preview URL when photoPath changes (for new photo selections)
  useEffect(() => {
    // Only update if we have a photoPath and no preview yet (e.g., after saving a new photo)
    if (photoPath && !photoPreviewUrl) {
      setPhotoPreviewUrl(toAssetUrl(photoPath));
    } else if (!photoPath) {
      setPhotoPreviewUrl("");
    }
  }, [photoPath, photoPreviewUrl]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = "Etunimi on pakollinen";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Sukunimi on pakollinen";
    }

    if (!birthYear) {
      newErrors.birthYear = "Syntymävuosi on pakollinen";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthYear: birthYear as number,
      gender: "T", // Always female athletes
      clubName: clubName.trim() || undefined,
      // For new athletes, pass the pending source path; for existing, pass the saved path
      photoPath: pendingPhotoSource || photoPath || undefined,
    });
  };

  const handlePhotoSelect = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Kuvat",
            extensions: ["png", "jpg", "jpeg", "webp", "gif"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        // For editing existing athlete, save photo immediately
        if (athlete?.id) {
          const savedPath = await invoke<string>("save_athlete_profile_photo", {
            sourcePath: selected,
            athleteId: athlete.id,
          });
          setPhotoPath(savedPath);
          setPhotoPreviewUrl(toAssetUrl(savedPath));
          setPendingPhotoSource("");
        } else {
          // For new athlete, store the source path to save after creation
          setPendingPhotoSource(selected);
          // Use the local file path directly for preview
          setPhotoPreviewUrl(toAssetUrl(selected));
        }
      }
    } catch {
      toast.error("Kuvan valinta epäonnistui");
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPath("");
    setPhotoPreviewUrl("");
    setPendingPhotoSource("");
  };

  const getInitials = () => {
    const first = firstName.charAt(0) || "?";
    const last = lastName.charAt(0) || "?";
    return `${first}${last}`.toUpperCase();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Photo picker */}
      <div className="flex justify-center pb-2">
        <div className="relative">
          <button
            type="button"
            onClick={handlePhotoSelect}
            className="relative group cursor-pointer"
          >
            {photoPreviewUrl ? (
              <img
                src={photoPreviewUrl}
                alt="Urheilijan kuva"
                className="w-20 h-20 rounded-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-elevated flex items-center justify-center text-[var(--text-placeholder)] font-medium text-xl">
                {firstName || lastName ? getInitials() : <User size={28} />}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-150">
              <Camera size={20} className="text-white" />
            </div>
          </button>
          {(photoPath || pendingPhotoSource) && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-muted hover:bg-card-hover flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Row 1: First name + Last name */}
      <div className="grid grid-cols-2 gap-4">
        {/* First name */}
        <div>
          <label
            htmlFor="firstName"
            className="block text-body font-medium text-muted-foreground mb-1.5"
          >
            Etunimi <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="one-time-code"
            className={`w-full px-3 py-2 text-sm bg-card border rounded-md input-focus ${
              errors.firstName ? "border-error" : "border-border-subtle"
            }`}
            placeholder="Esim. Eemeli"
          />
          {errors.firstName && (
            <p className="mt-1.5 text-xs text-error">{errors.firstName}</p>
          )}
        </div>

        {/* Last name */}
        <div>
          <label htmlFor="lastName" className="block text-body font-medium text-muted-foreground mb-1.5">
            Sukunimi <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="one-time-code"
            className={`w-full px-3 py-2 text-sm bg-card border rounded-md input-focus ${
              errors.lastName ? "border-error" : "border-border-subtle"
            }`}
            placeholder="Esim. Virtanen"
          />
          {errors.lastName && (
            <p className="mt-1.5 text-xs text-error">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Row 2: Birth year + Club name */}
      <div className="grid grid-cols-2 gap-4">
        {/* Birth year */}
        <div>
          <label htmlFor="birthYear" className="block text-body font-medium text-muted-foreground mb-1.5">
            Syntymävuosi <span className="text-error">*</span>
          </label>
          <FilterSelect
            value={birthYear}
            onChange={(value) => setBirthYear(value === "" ? "" : (value as number))}
            options={birthYearOptions}
            className={`w-full ${errors.birthYear ? "border-error" : ""}`}
          />
          {errors.birthYear && (
            <p className="mt-1.5 text-xs text-error">{errors.birthYear}</p>
          )}
        </div>

        {/* Club name */}
        <div>
          <label htmlFor="clubName" className="block text-body font-medium text-muted-foreground mb-1.5">
            Seura
          </label>
          <input
            type="text"
            id="clubName"
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            autoComplete="one-time-code"
            className="w-full px-3 py-2 text-sm bg-card border border-border-subtle rounded-md input-focus"
            placeholder="Esim. Tampereen Pyrintö"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="btn-secondary btn-press"
        >
          Peruuta
        </button>
        <button
          type="submit"
          disabled={disabled}
          className="btn-primary btn-press"
        >
          {disabled ? "Tallennetaan..." : "Tallenna"}
        </button>
      </div>
    </form>
  );
}
