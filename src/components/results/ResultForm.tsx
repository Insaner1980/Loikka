import { useState, useEffect, useMemo } from "react";
import { Trophy } from "lucide-react";
import { useAthleteStore } from "../../stores/useAthleteStore";
import { useResultStore } from "../../stores/useResultStore";
import {
  disciplines,
  categoryLabels,
  categoryOrder,
  getDisciplineById,
} from "../../data/disciplines";
import { parseTime, parseDistance, getTodayISO } from "../../lib/formatters";
import type { NewResult, MedalType, ResultType } from "../../types";

interface ResultFormProps {
  athleteId?: number;
  onSave: (result: NewResult, medal?: { type: MedalType; competitionName: string }) => void;
  onCancel: () => void;
}

interface FormErrors {
  athleteId?: string;
  disciplineId?: string;
  value?: string;
  date?: string;
  competitionName?: string;
}

export function ResultForm({ athleteId, onSave, onCancel }: ResultFormProps) {
  const { athletes, fetchAthletes } = useAthleteStore();
  const { checkPersonalBest, checkSeasonBest } = useResultStore();

  const [selectedAthleteId, setSelectedAthleteId] = useState<number | "">(
    athleteId || ""
  );
  const [disciplineId, setDisciplineId] = useState<number | "">("");
  const [valueInput, setValueInput] = useState("");
  const [date, setDate] = useState(getTodayISO());
  const [resultType, setResultType] = useState<ResultType>("competition");
  const [competitionName, setCompetitionName] = useState("");
  const [location, setLocation] = useState("");
  const [placement, setPlacement] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [addMedal, setAddMedal] = useState(false);
  const [medalType, setMedalType] = useState<MedalType>("gold");
  const [errors, setErrors] = useState<FormErrors>({});

  // Fetch athletes if not loaded
  useEffect(() => {
    if (athletes.length === 0) {
      fetchAthletes();
    }
  }, [athletes.length, fetchAthletes]);

  // Get selected discipline
  const selectedDiscipline = useMemo(() => {
    return disciplineId ? getDisciplineById(disciplineId) : undefined;
  }, [disciplineId]);

  // State for potential PB/SB checks
  const [potentialBests, setPotentialBests] = useState({ isPB: false, isSB: false });

  // Check if result would be a PB/SB (async)
  useEffect(() => {
    const checkBests = async () => {
      if (!selectedAthleteId || !disciplineId || !valueInput || !selectedDiscipline) {
        setPotentialBests({ isPB: false, isSB: false });
        return;
      }

      try {
        const value =
          selectedDiscipline.unit === "time"
            ? parseTime(valueInput)
            : parseDistance(valueInput);

        const year = new Date(date).getFullYear();
        const [isPB, isSB] = await Promise.all([
          checkPersonalBest(selectedAthleteId as number, disciplineId, value),
          checkSeasonBest(selectedAthleteId as number, disciplineId, value, year),
        ]);

        setPotentialBests({ isPB, isSB });
      } catch {
        setPotentialBests({ isPB: false, isSB: false });
      }
    };

    checkBests();
  }, [selectedAthleteId, disciplineId, valueInput, date, selectedDiscipline, checkPersonalBest, checkSeasonBest]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!selectedAthleteId) {
      newErrors.athleteId = "Valitse urheilija";
    }

    if (!disciplineId) {
      newErrors.disciplineId = "Valitse laji";
    }

    if (!valueInput.trim()) {
      newErrors.value = "Syötä tulos";
    } else if (selectedDiscipline) {
      try {
        if (selectedDiscipline.unit === "time") {
          parseTime(valueInput);
        } else {
          parseDistance(valueInput);
        }
      } catch {
        newErrors.value =
          selectedDiscipline.unit === "time"
            ? "Virheellinen aika (esim. 12.34 tai 1:23.45)"
            : "Virheellinen matka (esim. 4.56)";
      }
    }

    if (!date) {
      newErrors.date = "Valitse päivämäärä";
    }

    if (resultType === "competition" && !competitionName.trim()) {
      newErrors.competitionName = "Syötä kilpailun nimi";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !selectedDiscipline) {
      return;
    }

    const value =
      selectedDiscipline.unit === "time"
        ? parseTime(valueInput)
        : parseDistance(valueInput);

    const resultData: NewResult = {
      athleteId: selectedAthleteId as number,
      disciplineId: disciplineId as number,
      date,
      value,
      type: resultType,
      competitionName: resultType === "competition" ? competitionName.trim() : undefined,
      location: location.trim() || undefined,
      placement: resultType === "competition" && placement ? (placement as number) : undefined,
      notes: notes.trim() || undefined,
      isPersonalBest: potentialBests.isPB,
      isSeasonBest: potentialBests.isSB,
    };

    const medal =
      addMedal && resultType === "competition"
        ? { type: medalType, competitionName: competitionName.trim() }
        : undefined;

    onSave(resultData, medal);
  };

  // Get placeholder for value input
  const getValuePlaceholder = () => {
    if (!selectedDiscipline) return "Valitse ensin laji";
    return selectedDiscipline.unit === "time"
      ? "esim. 12.34 tai 1:23.45"
      : "esim. 4.56";
  };

  // Get label for value input
  const getValueLabel = () => {
    if (!selectedDiscipline) return "Tulos";
    return selectedDiscipline.unit === "time" ? "Aika" : "Tulos (m)";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Athlete selector */}
      <div>
        <label
          htmlFor="athlete"
          className="block text-sm font-medium mb-1.5"
        >
          Urheilija <span className="text-red-500">*</span>
        </label>
        <select
          id="athlete"
          value={selectedAthleteId}
          onChange={(e) =>
            setSelectedAthleteId(e.target.value ? parseInt(e.target.value) : "")
          }
          disabled={!!athleteId}
          className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
            errors.athleteId ? "border-red-500" : "border-border"
          } ${athleteId ? "opacity-60" : ""}`}
        >
          <option value="">Valitse urheilija</option>
          {athletes.map(({ athlete }) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.firstName} {athlete.lastName}
            </option>
          ))}
        </select>
        {errors.athleteId && (
          <p className="mt-1 text-sm text-red-500">{errors.athleteId}</p>
        )}
      </div>

      {/* Discipline selector */}
      <div>
        <label
          htmlFor="discipline"
          className="block text-sm font-medium mb-1.5"
        >
          Laji <span className="text-red-500">*</span>
        </label>
        <select
          id="discipline"
          value={disciplineId}
          onChange={(e) =>
            setDisciplineId(e.target.value ? parseInt(e.target.value) : "")
          }
          className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
            errors.disciplineId ? "border-red-500" : "border-border"
          }`}
        >
          <option value="">Valitse laji</option>
          {categoryOrder.map((category) => {
            const categoryDisciplines = disciplines.filter(
              (d) => d.category === category
            );
            return (
              <optgroup key={category} label={categoryLabels[category]}>
                {categoryDisciplines.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        {errors.disciplineId && (
          <p className="mt-1 text-sm text-red-500">{errors.disciplineId}</p>
        )}
      </div>

      {/* Result value */}
      <div>
        <label htmlFor="value" className="block text-sm font-medium mb-1.5">
          {getValueLabel()} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            id="value"
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            placeholder={getValuePlaceholder()}
            className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
              errors.value ? "border-red-500" : "border-border"
            }`}
          />
          {/* PB/SB indicators */}
          {(potentialBests.isPB || potentialBests.isSB) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
              {potentialBests.isPB && (
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gold text-black">
                  SE!
                </span>
              )}
              {!potentialBests.isPB && potentialBests.isSB && (
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/20 text-primary">
                  KE!
                </span>
              )}
            </div>
          )}
        </div>
        {errors.value && (
          <p className="mt-1 text-sm text-red-500">{errors.value}</p>
        )}
      </div>

      {/* Date */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium mb-1.5">
          Päivämäärä <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
            errors.date ? "border-red-500" : "border-border"
          }`}
        />
        {errors.date && (
          <p className="mt-1 text-sm text-red-500">{errors.date}</p>
        )}
      </div>

      {/* Result type */}
      <div>
        <label className="block text-sm font-medium mb-2">Tyyppi</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="resultType"
              value="competition"
              checked={resultType === "competition"}
              onChange={() => setResultType("competition")}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <span>Kilpailu</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="resultType"
              value="training"
              checked={resultType === "training"}
              onChange={() => setResultType("training")}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <span>Harjoitus</span>
          </label>
        </div>
      </div>

      {/* Competition-only fields */}
      {resultType === "competition" && (
        <>
          {/* Competition name */}
          <div>
            <label
              htmlFor="competitionName"
              className="block text-sm font-medium mb-1.5"
            >
              Kilpailun nimi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="competitionName"
              value={competitionName}
              onChange={(e) => setCompetitionName(e.target.value)}
              placeholder="esim. Tampereen aluemestaruus"
              className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
                errors.competitionName ? "border-red-500" : "border-border"
              }`}
            />
            {errors.competitionName && (
              <p className="mt-1 text-sm text-red-500">{errors.competitionName}</p>
            )}
          </div>

          {/* Placement */}
          <div>
            <label htmlFor="placement" className="block text-sm font-medium mb-1.5">
              Sijoitus
            </label>
            <input
              type="number"
              id="placement"
              value={placement}
              onChange={(e) =>
                setPlacement(e.target.value ? parseInt(e.target.value) : "")
              }
              min={1}
              placeholder="esim. 1"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            />
          </div>
        </>
      )}

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium mb-1.5">
          Paikka
        </label>
        <input
          type="text"
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="esim. Tampere"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-1.5">
          Muistiinpanot
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Valinnainen lisätieto..."
          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors resize-none"
        />
      </div>

      {/* Medal checkbox - only for competitions */}
      {resultType === "competition" && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={addMedal}
              onChange={(e) => setAddMedal(e.target.checked)}
              className="w-4 h-4 text-primary focus:ring-primary rounded"
            />
            <Trophy size={18} className="text-gold" />
            <span className="font-medium">Lisää mitali</span>
          </label>

          {addMedal && (
            <div className="flex gap-2 pl-6">
              <button
                type="button"
                onClick={() => setMedalType("gold")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  medalType === "gold"
                    ? "bg-gold/20 border-gold"
                    : "border-border hover:bg-muted"
                }`}
              >
                <span className="text-lg">🥇</span>
                <span className="text-sm">Kulta</span>
              </button>
              <button
                type="button"
                onClick={() => setMedalType("silver")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  medalType === "silver"
                    ? "bg-silver/20 border-silver"
                    : "border-border hover:bg-muted"
                }`}
              >
                <span className="text-lg">🥈</span>
                <span className="text-sm">Hopea</span>
              </button>
              <button
                type="button"
                onClick={() => setMedalType("bronze")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  medalType === "bronze"
                    ? "bg-bronze/20 border-bronze"
                    : "border-border hover:bg-muted"
                }`}
              >
                <span className="text-lg">🥉</span>
                <span className="text-sm">Pronssi</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
        >
          Peruuta
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-secondary hover:bg-primary/90 transition-colors"
        >
          Tallenna
        </button>
      </div>
    </form>
  );
}
