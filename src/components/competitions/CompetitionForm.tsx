import { useState, useEffect } from "react";
import { Bell, Users } from "lucide-react";
import { useAthleteStore } from "../../stores/useAthleteStore";
import { disciplines, categoryOrder } from "../../data/disciplines";
import { getTodayISO } from "../../lib/formatters";
import type { Competition, NewCompetition } from "../../types";

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

const reminderDaysOptions = [
  { value: 1, label: "1 päivä ennen" },
  { value: 2, label: "2 päivää ennen" },
  { value: 3, label: "3 päivää ennen" },
  { value: 7, label: "1 viikko ennen" },
  { value: 14, label: "2 viikkoa ennen" },
];

export function CompetitionForm({
  competition,
  initialDate,
  initialParticipants = [],
  onSave,
  onCancel,
}: CompetitionFormProps) {
  const { athletes, fetchAthletes } = useAthleteStore();

  // Form state
  const [name, setName] = useState(competition?.name ?? "");
  const [date, setDate] = useState(competition?.date ?? initialDate ?? getTodayISO());
  const [endDate, setEndDate] = useState(competition?.endDate ?? "");
  const [location, setLocation] = useState(competition?.location ?? "");
  const [address, setAddress] = useState(competition?.address ?? "");
  const [notes, setNotes] = useState(competition?.notes ?? "");
  const [reminderEnabled, setReminderEnabled] = useState(
    competition?.reminderEnabled ?? true
  );
  const [reminderDaysBefore, setReminderDaysBefore] = useState(
    competition?.reminderDaysBefore ?? 3
  );

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

  // Fetch athletes if not loaded
  useEffect(() => {
    if (athletes.length === 0) {
      fetchAthletes();
    }
  }, [athletes.length, fetchAthletes]);

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
      notes: notes.trim() || undefined,
      reminderEnabled,
      reminderDaysBefore: reminderEnabled ? reminderDaysBefore : undefined,
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1.5">
          Nimi <span className="text-error">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="esim. Tampereen aluemestaruus"
          className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
            errors.name ? "border-error" : "border-border"
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-error">{errors.name}</p>
        )}
      </div>

      {/* Date fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium mb-1.5">
            Päivämäärä <span className="text-error">*</span>
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
              errors.date ? "border-error" : "border-border"
            }`}
          />
          {errors.date && (
            <p className="mt-1 text-sm text-error">{errors.date}</p>
          )}
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium mb-1.5">
            Päättymispäivä
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={date}
            className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
              errors.endDate ? "border-error" : "border-border"
            }`}
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-error">{errors.endDate}</p>
          )}
        </div>
      </div>

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
                                    ? "bg-white/10 text-foreground border-white/20"
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

      {/* Reminder section */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="w-4 h-4 text-primary focus:ring-primary rounded"
          />
          <Bell size={18} />
          <span className="font-medium">Muistutus</span>
        </label>

        {reminderEnabled && (
          <div className="pl-6">
            <select
              value={reminderDaysBefore}
              onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
              className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            >
              {reminderDaysOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
