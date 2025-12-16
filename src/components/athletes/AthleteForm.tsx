import { useState, useEffect } from "react";
import { Camera, User } from "lucide-react";
import type { Athlete, NewAthlete } from "../../types";

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

// Generate birth year options (2005-2022)
const birthYearOptions = Array.from({ length: 18 }, (_, i) => 2022 - i);

export function AthleteForm({ athlete, onSave, onCancel, disabled = false }: AthleteFormProps) {
  const [firstName, setFirstName] = useState(athlete?.firstName || "");
  const [lastName, setLastName] = useState(athlete?.lastName || "");
  const [birthYear, setBirthYear] = useState<number | "">(
    athlete?.birthYear || ""
  );
  const [clubName, setClubName] = useState(athlete?.clubName || "");
  const [photoPath, setPhotoPath] = useState(athlete?.photoPath || "");
  const [errors, setErrors] = useState<FormErrors>({});

  // Reset form when athlete prop changes
  useEffect(() => {
    if (athlete) {
      setFirstName(athlete.firstName);
      setLastName(athlete.lastName);
      setBirthYear(athlete.birthYear);
      setClubName(athlete.clubName || "");
      setPhotoPath(athlete.photoPath || "");
    } else {
      setFirstName("");
      setLastName("");
      setBirthYear("");
      setClubName("");
      setPhotoPath("");
    }
    setErrors({});
  }, [athlete]);

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
      clubName: clubName.trim() || undefined,
      photoPath: photoPath || undefined,
    });
  };

  const handlePhotoSelect = async () => {
    // TODO: Implement file picker using Tauri dialog
    // const { open } = await import('@tauri-apps/plugin-dialog');
    // const selected = await open({
    //   multiple: false,
    //   filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    // });
    // if (selected) setPhotoPath(selected as string);
    console.log("Photo picker not yet implemented");
  };

  const getInitials = () => {
    const first = firstName.charAt(0) || "?";
    const last = lastName.charAt(0) || "?";
    return `${first}${last}`.toUpperCase();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photo picker */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handlePhotoSelect}
          className="relative group"
        >
          {photoPath ? (
            <img
              src={photoPath}
              alt="Urheilijan kuva"
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium text-2xl">
              {firstName || lastName ? getInitials() : <User size={32} />}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera size={24} className="text-white" />
          </div>
        </button>
      </div>

      {/* First name */}
      <div>
        <label
          htmlFor="firstName"
          className="block text-sm font-medium mb-1.5"
        >
          Etunimi <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
            errors.firstName ? "border-red-500" : "border-border"
          }`}
          placeholder="Esim. Eemeli"
        />
        {errors.firstName && (
          <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
        )}
      </div>

      {/* Last name */}
      <div>
        <label htmlFor="lastName" className="block text-sm font-medium mb-1.5">
          Sukunimi <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
            errors.lastName ? "border-red-500" : "border-border"
          }`}
          placeholder="Esim. Virtanen"
        />
        {errors.lastName && (
          <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
        )}
      </div>

      {/* Birth year */}
      <div>
        <label htmlFor="birthYear" className="block text-sm font-medium mb-1.5">
          Syntymävuosi <span className="text-red-500">*</span>
        </label>
        <select
          id="birthYear"
          value={birthYear}
          onChange={(e) =>
            setBirthYear(e.target.value ? parseInt(e.target.value) : "")
          }
          className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
            errors.birthYear ? "border-red-500" : "border-border"
          }`}
        >
          <option value="">Valitse vuosi</option>
          {birthYearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        {errors.birthYear && (
          <p className="mt-1 text-sm text-red-500">{errors.birthYear}</p>
        )}
      </div>

      {/* Club name */}
      <div>
        <label htmlFor="clubName" className="block text-sm font-medium mb-1.5">
          Seura
        </label>
        <input
          type="text"
          id="clubName"
          value={clubName}
          onChange={(e) => setClubName(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          placeholder="Esim. Tampereen Pyrintö"
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          Peruuta
        </button>
        <button
          type="submit"
          disabled={disabled}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-secondary hover:bg-primary/90 transition-colors disabled:opacity-50 btn-press"
        >
          {disabled ? "Tallennetaan..." : "Tallenna"}
        </button>
      </div>
    </form>
  );
}
