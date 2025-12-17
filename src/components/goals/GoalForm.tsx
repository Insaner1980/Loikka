import { useState, useEffect, useMemo } from "react";
import { useAthleteStore } from "../../stores/useAthleteStore";
import {
  disciplines,
  categoryLabels,
  categoryOrder,
  getDisciplineById,
} from "../../data/disciplines";
import { parseTime, parseDistance } from "../../lib/formatters";
import type { Goal, NewGoal } from "../../types";

interface GoalFormProps {
  goal?: Goal;
  athleteId?: number;
  onSave: (goal: NewGoal) => void;
  onCancel: () => void;
}

interface FormErrors {
  athleteId?: string;
  disciplineId?: string;
  targetValue?: string;
}

export function GoalForm({ goal, athleteId, onSave, onCancel }: GoalFormProps) {
  const { athletes, fetchAthletes } = useAthleteStore();

  const [selectedAthleteId, setSelectedAthleteId] = useState<number | "">(
    goal?.athleteId ?? athleteId ?? ""
  );
  const [disciplineId, setDisciplineId] = useState<number | "">(
    goal?.disciplineId ?? ""
  );
  const [targetValueInput, setTargetValueInput] = useState(
    goal?.targetValue?.toString() ?? ""
  );
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
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

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!selectedAthleteId) {
      newErrors.athleteId = "Valitse urheilija";
    }

    if (!disciplineId) {
      newErrors.disciplineId = "Valitse laji";
    }

    if (!targetValueInput.trim()) {
      newErrors.targetValue = "Syötä tavoitetulos";
    } else if (selectedDiscipline) {
      try {
        if (selectedDiscipline.unit === "time") {
          parseTime(targetValueInput);
        } else {
          parseDistance(targetValueInput);
        }
      } catch {
        newErrors.targetValue =
          selectedDiscipline.unit === "time"
            ? "Virheellinen aika (esim. 12.34 tai 1:23.45)"
            : "Virheellinen matka (esim. 4.56)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !selectedDiscipline) {
      return;
    }

    const targetValue =
      selectedDiscipline.unit === "time"
        ? parseTime(targetValueInput)
        : parseDistance(targetValueInput);

    const goalData: NewGoal = {
      athleteId: selectedAthleteId as number,
      disciplineId: disciplineId as number,
      targetValue,
      targetDate: targetDate || undefined,
      status: "active",
    };

    onSave(goalData);
  };

  // Get placeholder for target input
  const getValuePlaceholder = () => {
    if (!selectedDiscipline) return "Valitse ensin laji";
    return selectedDiscipline.unit === "time"
      ? "esim. 12.00 tai 1:20.00"
      : "esim. 5.50";
  };

  // Get label for target input
  const getValueLabel = () => {
    if (!selectedDiscipline) return "Tavoitetulos";
    return selectedDiscipline.unit === "time"
      ? "Tavoiteaika"
      : "Tavoitetulos (m)";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Athlete selector */}
      <div>
        <label
          htmlFor="athlete"
          className="block text-sm font-medium mb-1.5"
        >
          Urheilija <span className="text-error">*</span>
        </label>
        <select
          id="athlete"
          value={selectedAthleteId}
          onChange={(e) =>
            setSelectedAthleteId(e.target.value ? parseInt(e.target.value) : "")
          }
          disabled={!!athleteId}
          className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
            errors.athleteId ? "border-error" : "border-border"
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
          <p className="mt-1 text-sm text-error">{errors.athleteId}</p>
        )}
      </div>

      {/* Discipline selector */}
      <div>
        <label
          htmlFor="discipline"
          className="block text-sm font-medium mb-1.5"
        >
          Laji <span className="text-error">*</span>
        </label>
        <select
          id="discipline"
          value={disciplineId}
          onChange={(e) =>
            setDisciplineId(e.target.value ? parseInt(e.target.value) : "")
          }
          className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
            errors.disciplineId ? "border-error" : "border-border"
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
          <p className="mt-1 text-sm text-error">{errors.disciplineId}</p>
        )}
      </div>

      {/* Target value */}
      <div>
        <label
          htmlFor="targetValue"
          className="block text-sm font-medium mb-1.5"
        >
          {getValueLabel()} <span className="text-error">*</span>
        </label>
        <input
          type="text"
          id="targetValue"
          value={targetValueInput}
          onChange={(e) => setTargetValueInput(e.target.value)}
          placeholder={getValuePlaceholder()}
          className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
            errors.targetValue ? "border-error" : "border-border"
          }`}
        />
        {errors.targetValue && (
          <p className="mt-1 text-sm text-error">{errors.targetValue}</p>
        )}
      </div>

      {/* Target date */}
      <div>
        <label
          htmlFor="targetDate"
          className="block text-sm font-medium mb-1.5"
        >
          Tavoitepäivä
        </label>
        <input
          type="date"
          id="targetDate"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Valinnainen. Aseta päivämäärä, johon mennessä tavoite tulisi saavuttaa.
        </p>
      </div>

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
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors"
        >
          Tallenna
        </button>
      </div>
    </form>
  );
}
