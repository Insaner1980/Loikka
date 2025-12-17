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
import type { Competition, NewCompetition } from "../types";

type ViewMode = "list" | "month";

export function Calendar() {
  const {
    competitions,
    participants,
    fetchCompetitions,
    getUpcomingCompetitions,
    getCompetitionsByDate,
    addCompetition,
    updateCompetition,
    addParticipant,
    removeParticipant,
  } = useCompetitionStore();
  const { athletes, fetchAthletes } = useAthleteStore();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);

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

  const handleOpenEdit = (competition: Competition) => {
    setEditingCompetition(competition);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCompetition(null);
  };

  const handleSaveCompetition = async (
    competitionData: NewCompetition,
    competitionParticipants: { athleteId: number; disciplinesPlanned?: number[] }[]
  ) => {
    if (editingCompetition) {
      // Update existing competition
      await updateCompetition(editingCompetition.id, competitionData);

      // Get current participants for this competition
      const currentParticipants = participants.filter(
        (p) => p.competitionId === editingCompetition.id
      );

      // Remove participants that are no longer in the list
      for (const current of currentParticipants) {
        const stillExists = competitionParticipants.some(
          (p) => p.athleteId === current.athleteId
        );
        if (!stillExists) {
          await removeParticipant(editingCompetition.id, current.athleteId);
        }
      }

      // Add new participants or update disciplines for existing
      for (const participant of competitionParticipants) {
        const existingParticipant = currentParticipants.find(
          (p) => p.athleteId === participant.athleteId
        );
        if (!existingParticipant) {
          await addParticipant(
            editingCompetition.id,
            participant.athleteId,
            participant.disciplinesPlanned
          );
        } else {
          // Update disciplines by removing and re-adding the participant
          const currentDisciplines = existingParticipant.disciplinesPlanned ?? [];
          const newDisciplines = participant.disciplinesPlanned ?? [];
          const disciplinesChanged =
            currentDisciplines.length !== newDisciplines.length ||
            !currentDisciplines.every((d) => newDisciplines.includes(d));

          if (disciplinesChanged) {
            await removeParticipant(editingCompetition.id, participant.athleteId);
            await addParticipant(
              editingCompetition.id,
              participant.athleteId,
              participant.disciplinesPlanned
            );
          }
        }
      }
    } else {
      // Create new competition
      const newCompetition = await addCompetition(competitionData);

      // Add participants
      for (const participant of competitionParticipants) {
        await addParticipant(
          newCompetition.id,
          participant.athleteId,
          participant.disciplinesPlanned
        );
      }
    }

    handleCloseForm();
  };

  // Get initial participants for editing
  const getInitialParticipants = (competitionId: number) => {
    return participants
      .filter((p) => p.competitionId === competitionId)
      .map((p) => ({
        athleteId: p.athleteId,
        disciplinesPlanned: p.disciplinesPlanned,
      }));
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-border-subtle">
        <h1 className="text-base font-medium text-foreground">Kalenteri</h1>
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
                    onClick={() => handleOpenEdit(competition)}
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
                          onClick={() => handleOpenEdit(competition)}
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

      {/* Add/Edit Competition Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={handleCloseForm}
        title={editingCompetition ? "Muokkaa kilpailua" : "Lisää kilpailu"}
        maxWidth="lg"
      >
        <CompetitionForm
          competition={editingCompetition ?? undefined}
          initialDate={selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined}
          initialParticipants={
            editingCompetition
              ? getInitialParticipants(editingCompetition.id)
              : undefined
          }
          onSave={handleSaveCompetition}
          onCancel={handleCloseForm}
        />
      </Dialog>
    </div>
  );
}
