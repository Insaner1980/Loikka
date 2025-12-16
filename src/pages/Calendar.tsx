import { useState, useEffect, useMemo } from "react";
import { Plus, List, CalendarDays, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { useCompetitionStore } from "../stores/useCompetitionStore";
import { useAthleteStore } from "../stores/useAthleteStore";
import { CalendarView } from "../components/competitions/CalendarView";
import { CompetitionCard } from "../components/competitions/CompetitionCard";
import { CompetitionForm } from "../components/competitions/CompetitionForm";
import { Dialog } from "../components/ui/Dialog";
import type { NewCompetition } from "../types";

type ViewMode = "list" | "month";

export function Calendar() {
  const {
    competitions,
    participants,
    fetchCompetitions,
    getUpcomingCompetitions,
    getCompetitionsByDate,
    addCompetition,
    addParticipant,
  } = useCompetitionStore();
  const { athletes, fetchAthletes } = useAthleteStore();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchCompetitions();
    fetchAthletes();
  }, [fetchCompetitions, fetchAthletes]);

  // Map athlete ID to athlete data
  const athleteMap = useMemo(() => {
    return new Map(athletes.map((a) => [a.athlete.id, a.athlete]));
  }, [athletes]);

  // Get participants with athlete data
  const getParticipantsWithAthletes = (competitionId: number) => {
    return participants
      .filter((p) => p.competitionId === competitionId)
      .map((p) => ({
        ...p,
        athlete: athleteMap.get(p.athleteId),
      }));
  };

  // Upcoming competitions for list view
  const upcomingCompetitions = getUpcomingCompetitions();

  // Competitions for selected date in month view
  const selectedDateCompetitions = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return getCompetitionsByDate(dateStr);
  }, [selectedDate, getCompetitionsByDate]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSaveCompetition = async (
    competitionData: NewCompetition,
    competitionParticipants: { athleteId: number; disciplinesPlanned?: number[] }[]
  ) => {
    const newCompetition = await addCompetition(competitionData);

    // Add participants
    for (const participant of competitionParticipants) {
      await addParticipant(
        newCompetition.id,
        participant.athleteId,
        participant.disciplinesPlanned
      );
    }

    setIsFormOpen(false);
  };

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kalenteri</h1>
          <p className="text-muted-foreground">Kilpailukalenteri</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 bg-primary text-black px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          Lisää kilpailu
        </button>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-6">
        <div className="inline-flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "list"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List size={16} />
            Lista
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "month"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays size={16} />
            Kuukausi
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "list" ? (
          // List view
          <div>
            {upcomingCompetitions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <CalendarIcon size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">Ei tulevia kilpailuja</p>
                <p className="text-sm">
                  Lisää ensimmäinen kilpailu painamalla yllä olevaa nappia
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingCompetitions.map((competition) => (
                  <CompetitionCard
                    key={competition.id}
                    competition={competition}
                    participants={getParticipantsWithAthletes(competition.id)}
                    onClick={() => {
                      // TODO: Open edit dialog
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Month view
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <CalendarView
              competitions={competitions}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onDayClick={handleDayClick}
              selectedDate={selectedDate}
            />

            {/* Selected day competitions */}
            <div>
              {selectedDate ? (
                <>
                  <h3 className="text-lg font-semibold mb-4">
                    {format(selectedDate, "EEEE d. MMMM", { locale: fi })}
                  </h3>
                  {selectedDateCompetitions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground bg-card rounded-xl border border-border">
                      <CalendarIcon size={32} className="mb-2 opacity-50" />
                      <p className="text-sm">Ei kilpailuja tänä päivänä</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateCompetitions.map((competition) => (
                        <CompetitionCard
                          key={competition.id}
                          competition={competition}
                          participants={getParticipantsWithAthletes(
                            competition.id
                          )}
                          onClick={() => {
                            // TODO: Open edit dialog
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground bg-card rounded-xl border border-border">
                  <CalendarIcon size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">Valitse päivä nähdäksesi kilpailut</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Competition Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Lisää kilpailu"
        maxWidth="lg"
      >
        <CompetitionForm
          onSave={handleSaveCompetition}
          onCancel={() => setIsFormOpen(false)}
        />
      </Dialog>
    </div>
  );
}
