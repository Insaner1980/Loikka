import { useState, useEffect, useMemo } from "react";
import { useAthleteStore } from "../../stores/useAthleteStore";
import {
  disciplines,
  categoryLabels,
  categoryOrder,
  getDisciplineById,
  disciplineNeedsMinutes,
} from "../../data/disciplines";
import { TimeInput, DistanceInput, DatePicker } from "../ui";
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
  const [targetValue, setTargetValue] = useState<number | null>(
    goal?.targetValue ?? null
  );
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const [errors, setErrors] = useState<FormErrors>({});

  // Fetch athletes if not loaded
  useEffect(() => {
    if (athletes.length === 0) {
      fetchAthletes();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get selected discipline
  const selectedDiscipline = useMemo(() => {
    return disciplineId ? getDisciplineById(disciplineId) : undefined;
  }, [disciplineId]);

  // Reset target value when discipline changes
  useEffect(() => {
    if (!goal) {
      setTargetValue(null);
    }
  }, [disciplineId, goal]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!selectedAthleteId) {
      newErrors.athleteId = "Valitse urheilija";
    }

    if (!disciplineId) {
      newErrors.disciplineId = "Valitse laji";
    }

    if (targetValue === null || targetValue <= 0) {
      newErrors.targetValue = "Syötä tavoitetulos";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !selectedDiscipline || targetValue === null) {
      return;
    }

    // Convert from input format to database format:
    // Time: hundredths to seconds (e.g., 184240 -> 1842.40)
    // Distance: centimeters to meters (e.g., 550 -> 5.50)
    const dbValue = targetValue / 100;

    const goalData: NewGoal = {
      athleteId: selectedAthleteId as number,
      disciplineId: disciplineId as number,
      targetValue: dbValue,
      targetDate: targetDate || undefined,
      status: "active",
    };

    onSave(goalData);
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
          className={`w-full px-3 py-2 bg-background border rounded-lg input-focus cursor-pointer ${
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
          className={`w-full px-3 py-2 bg-background border rounded-lg input-focus cursor-pointer ${
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
        {!selectedDiscipline ? (
          <p className="text-sm text-muted-foreground py-2">
            Valitse ensin laji
          </p>
        ) : selectedDiscipline.unit === "time" ? (
          <TimeInput
            id="targetValue"
            value={targetValue}
            onChange={setTargetValue}
            showMinutes={disciplineNeedsMinutes(selectedDiscipline.id)}
            error={!!errors.targetValue}
          />
        ) : (
          <DistanceInput
            id="targetValue"
            value={targetValue}
            onChange={setTargetValue}
            error={!!errors.targetValue}
          />
        )}
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
        <DatePicker
          id="targetDate"
          value={targetDate}
          onChange={setTargetDate}
          min={new Date().toISOString().split("T")[0]}
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
          className="btn-secondary"
        >
          Peruuta
        </button>
        <button
          type="submit"
          className="btn-primary"
        >
          Tallenna
        </button>
      </div>
    </form>
  );
}
