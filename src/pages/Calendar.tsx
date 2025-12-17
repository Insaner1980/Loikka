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
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-border-subtle">
        <div>
          <h1 className="text-base font-medium text-foreground">Kalenteri</h1>
          <p className="text-[13px] text-text-secondary mt-0.5">Kilpailukalenteri</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="btn-primary btn-press"
        >
          <Plus size={18} />
          Lisää kilpailu
        </button>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 mb-6">
        <button
          onClick={() => setViewMode("list")}
          className={`flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 border-b ${
            viewMode === "list"
              ? "text-foreground border-foreground"
              : "text-[#666666] border-transparent hover:text-text-secondary"
          }`}
        >
          <List size={15} />
          Lista
        </button>
        <button
          onClick={() => setViewMode("month")}
          className={`flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 border-b ${
            viewMode === "month"
              ? "text-foreground border-foreground"
              : "text-[#666666] border-transparent hover:text-text-secondary"
          }`}
        >
          <CalendarDays size={15} />
          Kuukausi
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "list" ? (
          // List view
          <div>
            {upcomingCompetitions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-[#666666]">
                <CalendarIcon size={48} className="mb-4 text-[#444444]" />
                <p className="text-sm font-medium">Ei tulevia kilpailuja</p>
                <p className="text-[13px] text-[#555555] mt-1">
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
                  <h3 className="text-sm font-medium mb-4 text-foreground">
                    {format(selectedDate, "EEEE d. MMMM", { locale: fi })}
                  </h3>
                  {selectedDateCompetitions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-[#666666] bg-[#141414] rounded-lg">
                      <CalendarIcon size={28} className="mb-2 text-[#444444]" />
                      <p className="text-[13px]">Ei kilpailuja tänä päivänä</p>
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
                <div className="flex flex-col items-center justify-center h-48 text-[#666666] bg-[#141414] rounded-lg">
                  <CalendarIcon size={28} className="mb-2 text-[#444444]" />
                  <p className="text-[13px]">Valitse päivä nähdäksesi kilpailut</p>
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
