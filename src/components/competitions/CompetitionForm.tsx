import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { useAthleteStore } from "../../stores/useAthleteStore";
import { useCompetitionStore } from "../../stores/useCompetitionStore";
import { disciplines, categoryOrder } from "../../data/disciplines";
import { getTodayISO } from "../../lib/formatters";
import { COMPETITION_LEVEL_OPTIONS } from "../../lib/constants";
import { DatePicker } from "../ui/DatePicker";
import { AutocompleteInput } from "../shared";
import type { Competition, NewCompetition, CompetitionLevel } from "../../types";

interface CompetitionFormProps {
  competition?: Competition;
  initialDate?: string;
  initialParticipants?: {
    athleteId: number;
    disciplinesPlanned?: number[];
  }[];
  onSave: (
    competition: NewCompetition,
    participants: { athleteId: number; disciplinesPlanned?: number[] }[]
  ) => void;
  onCancel: () => void;
}

interface FormErrors {
  name?: string;
  date?: string;
  endDate?: string;
}

export function CompetitionForm({
  competition,
  initialDate,
  initialParticipants = [],
  onSave,
  onCancel,
}: CompetitionFormProps) {
  const { athletes, fetchAthletes } = useAthleteStore();
  const { competitions, fetchCompetitions } = useCompetitionStore();

  // Form state
  const [name, setName] = useState(competition?.name ?? "");
  const [date, setDate] = useState(competition?.date ?? initialDate ?? getTodayISO());
  const [endDate, setEndDate] = useState(competition?.endDate ?? "");
  const [location, setLocation] = useState(competition?.location ?? "");
  const [address, setAddress] = useState(competition?.address ?? "");
  const [level, setLevel] = useState<CompetitionLevel | "">(competition?.level ?? "");
  const [notes, setNotes] = useState(competition?.notes ?? "");

  // Participants state: map of athleteId -> selected disciplines
  const [selectedParticipants, setSelectedParticipants] = useState<
    Map<number, number[]>
  >(() => {
    const map = new Map<number, number[]>();
    for (const p of initialParticipants) {
      map.set(p.athleteId, p.disciplinesPlanned ?? []);
    }
    return map;
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Fetch athletes and competitions if not loaded
  useEffect(() => {
    if (athletes.length === 0) {
      fetchAthletes();
    }
    if (competitions.length === 0) {
      fetchCompetitions();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get unique competition names for autocomplete
  const uniqueCompetitionNames = [...new Set(competitions.map((c) => c.name))];

  const toggleParticipant = (athleteId: number) => {
    setSelectedParticipants((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(athleteId)) {
        newMap.delete(athleteId);
      } else {
        newMap.set(athleteId, []);
      }
      return newMap;
    });
  };

  const toggleDiscipline = (athleteId: number, disciplineId: number) => {
    setSelectedParticipants((prev) => {
      const newMap = new Map(prev);
      const currentDisciplines = newMap.get(athleteId) ?? [];

      if (currentDisciplines.includes(disciplineId)) {
        newMap.set(
          athleteId,
          currentDisciplines.filter((id) => id !== disciplineId)
        );
      } else {
        newMap.set(athleteId, [...currentDisciplines, disciplineId]);
      }

      return newMap;
    });
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Syötä kilpailun nimi";
    }

    if (!date) {
      newErrors.date = "Valitse päivämäärä";
    }

    if (endDate && endDate < date) {
      newErrors.endDate = "Päättymispäivä ei voi olla ennen alkamispäivää";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const competitionData: NewCompetition = {
      name: name.trim(),
      date,
      endDate: endDate || undefined,
      location: location.trim() || undefined,
      address: address.trim() || undefined,
      level: level || undefined,
      notes: notes.trim() || undefined,
      reminderEnabled: false,
      reminderDaysBefore: undefined,
    };

    const participants = Array.from(selectedParticipants.entries()).map(
      ([athleteId, disciplinesPlanned]) => ({
        athleteId,
        disciplinesPlanned: disciplinesPlanned.length > 0 ? disciplinesPlanned : undefined,
      })
    );

    onSave(competitionData, participants);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Row 1: Name and Level */}
      <div className="grid grid-cols-2 gap-4">
        {/* Name */}
        <AutocompleteInput
          id="name"
          value={name}
          onChange={setName}
          suggestions={uniqueCompetitionNames}
          label="Nimi"
          required
          placeholder="esim. Tampereen aluemestaruus"
          error={errors.name}
        />

        {/* Competition level */}
        <div>
          <label htmlFor="level" className="block text-sm font-medium mb-1.5">
            Kilpailutaso
          </label>
          <select
            id="level"
            value={level}
            onChange={(e) => setLevel(e.target.value as CompetitionLevel | "")}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg input-focus cursor-pointer"
          >
            <option value="">Valitse taso</option>
            {COMPETITION_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Date fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium mb-1.5">
            Päivämäärä <span className="text-error">*</span>
          </label>
          <DatePicker
            id="date"
            value={date}
            onChange={setDate}
            error={!!errors.date}
          />
          {errors.date && (
            <p className="mt-1 text-sm text-error">{errors.date}</p>
          )}
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium mb-1.5">
            Päättymispäivä
          </label>
          <DatePicker
            id="endDate"
            value={endDate}
            onChange={setEndDate}
            min={date}
            error={!!errors.endDate}
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-error">{errors.endDate}</p>
          )}
        </div>
      </div>

      {/* Row 3: Location and Address */}
      <div className="grid grid-cols-2 gap-4">
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
            className="w-full px-3 py-2 bg-background border border-border rounded-lg input-focus"
          />
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium mb-1.5">
            Osoite
          </label>
          <input
            type="text"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="esim. Ratina stadion"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg input-focus"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-1.5">
          Muistiinpanot
        </label>
        <input
          type="text"
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Valinnainen lisätieto..."
          className="w-full px-3 py-2 bg-background border border-border rounded-lg input-focus"
        />
      </div>

      {/* Participants section */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <div className="flex items-center gap-2 font-medium">
          <Users size={18} />
          <span>Osallistujat</span>
        </div>

        {athletes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ei urheilijoita. Lisää urheilijat ensin.
          </p>
        ) : (
          <div className="space-y-3">
            {athletes.map(({ athlete }) => {
              const isSelected = selectedParticipants.has(athlete.id);
              const selectedDisciplines =
                selectedParticipants.get(athlete.id) ?? [];

              return (
                <div key={athlete.id} className="space-y-2">
                  {/* Athlete checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleParticipant(athlete.id)}
                      className="w-4 h-4 text-primary focus:ring-primary rounded"
                    />
                    <span className="font-medium">
                      {athlete.firstName} {athlete.lastName}
                    </span>
                  </label>

                  {/* Discipline selector - only shown when athlete is selected */}
                  {isSelected && (
                    <div className="pl-6 mt-2">
                      <div className="flex flex-wrap gap-1">
                        {categoryOrder.map((category) => {
                          const categoryDisciplines = disciplines.filter(
                            (d) => d.category === category
                          );
                          return categoryDisciplines.map((discipline) => {
                            const isChecked = selectedDisciplines.includes(
                              discipline.id
                            );
                            return (
                              <button
                                key={discipline.id}
                                type="button"
                                onClick={() =>
                                  toggleDiscipline(athlete.id, discipline.id)
                                }
                                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                                  isChecked
                                    ? "bg-[var(--accent-muted)] text-foreground border-[var(--accent)]"
                                    : "bg-card border-border hover:border-border-hover"
                                }`}
                              >
                                {discipline.name}
                              </button>
                            );
                          });
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
