import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, X, Trash2 } from "lucide-react";
import { useAthleteStore } from "../stores/useAthleteStore";
import { useResultStore } from "../stores/useResultStore";
import { useGoalStore } from "../stores/useGoalStore";
import { useAthleteData } from "../hooks";
import { AthleteTabs, type AthleteTab } from "../components/athletes/AthleteTabs";
import { AthleteForm } from "../components/athletes/AthleteForm";
import {
  AthleteHeader,
  RecordsTab,
  ResultsTab,
  MedalsTab,
  ProgressTab,
  GoalsTab,
  type ResultWithDiscipline,
} from "../components/athletes/tabs";
import { Dialog } from "../components/ui/Dialog";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { toast } from "../components/ui/Toast";
import { ResultForm } from "../components/results/ResultForm";
import { ResultEditDialog } from "../components/results/ResultEditDialog";
import type {
  NewAthlete,
  NewResult,
  MedalType,
  Goal,
} from "../types";

export function AthleteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const athleteId = id ? parseInt(id) : 0;

  const {
    athletes,
    fetchAthletes,
    updateAthlete,
    deleteAthlete,
    getAthleteById,
  } = useAthleteStore();

  // Use centralized hook for athlete data
  const {
    results,
    personalBests,
    medals,
    goals,
    refetchResults,
    refetchGoals,
  } = useAthleteData(athleteId);

  const { addResult, deleteResult } = useResultStore();
  const { deleteGoal } = useGoalStore();

  // Get discipline filter from URL params
  const disciplineFilterParam = searchParams.get("discipline");
  const [disciplineFilter, setDisciplineFilter] = useState<number | null>(
    disciplineFilterParam ? parseInt(disciplineFilterParam) : null
  );

  // UI state
  const [activeTab, setActiveTab] = useState<AthleteTab>("records");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [confirmDeletePhotoOpen, setConfirmDeletePhotoOpen] = useState(false);
  const [confirmDeleteAthleteOpen, setConfirmDeleteAthleteOpen] = useState(false);

  // State for result editing and deletion
  const [selectedResult, setSelectedResult] = useState<ResultWithDiscipline | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmResult, setDeleteConfirmResult] = useState<ResultWithDiscipline | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  // Update discipline filter when URL changes and switch to results tab
  useEffect(() => {
    const param = searchParams.get("discipline");
    const newFilter = param ? parseInt(param) : null;
    setDisciplineFilter(newFilter);
    if (newFilter) {
      setActiveTab("results");
    }
  }, [searchParams]);

  // Update URL when discipline filter changes
  const handleDisciplineFilterChange = (value: number | null) => {
    setDisciplineFilter(value);
    if (value) {
      setSearchParams({ discipline: value.toString() });
    } else {
      setSearchParams({});
    }
  };

  const handleEditResult = (result: ResultWithDiscipline) => {
    setSelectedResult(result);
    setIsEditDialogOpen(true);
  };

  const handleDeleteResult = (result: ResultWithDiscipline) => {
    setDeleteConfirmResult(result);
  };

  const confirmDeleteResult = async () => {
    if (deleteConfirmResult) {
      await deleteResult(deleteConfirmResult.id);
      await refetchResults();
      setDeleteConfirmResult(null);
    }
  };

  const handleEditDialogClose = async () => {
    setIsEditDialogOpen(false);
    setSelectedResult(null);
    await refetchResults();
  };

  useEffect(() => {
    if (athletes.length === 0) {
      fetchAthletes();
    }
  }, [athletes.length, fetchAthletes]);

  const athleteData = getAthleteById(athleteId);

  if (!athleteData) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate("/athletes")}
          className="flex items-center gap-2 text-tertiary hover:text-foreground mb-6 transition-colors duration-150 cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span className="text-body">Takaisin</span>
        </button>
        <div className="text-center py-16">
          <p className="text-muted-foreground text-body">Urheilijaa ei löytynyt</p>
        </div>
      </div>
    );
  }

  const { athlete } = athleteData;

  // Count medals by type
  const goldMedals = medals.filter(m => m.type === "gold").length;
  const silverMedals = medals.filter(m => m.type === "silver").length;
  const bronzeMedals = medals.filter(m => m.type === "bronze").length;

  // Count season bests and national records
  const sbCount = results.filter(r => r.isSeasonBest).length;
  const nrCount = results.filter(r => r.isNationalRecord).length;

  const handleEditSave = async (data: NewAthlete) => {
    await updateAthlete(athlete.id, data);
    setEditDialogOpen(false);
  };

  const handleResultSave = async (
    data: NewResult,
    medal?: { type: MedalType; competitionName: string }
  ) => {
    await addResult(data, medal);
    await refetchResults();
    setResultDialogOpen(false);
  };

  const handleMedalClick = (disciplineId: number) => {
    setActiveTab("results");
    handleDisciplineFilterChange(disciplineId);
  };

  const getDisciplineForGoal = (disciplineId: number) => {
    const result = results.find(r => r.disciplineId === disciplineId);
    return result?.discipline;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "records":
        return <RecordsTab personalBests={personalBests} />;
      case "results":
        return (
          <ResultsTab
            athlete={athlete}
            results={results}
            initialDisciplineFilter={disciplineFilter}
            onDisciplineFilterChange={handleDisciplineFilterChange}
            onEditResult={handleEditResult}
            onDeleteResult={handleDeleteResult}
          />
        );
      case "medals":
        return (
          <MedalsTab
            medals={medals}
            results={results}
            onMedalClick={handleMedalClick}
          />
        );
      case "progress":
        return <ProgressTab results={results} />;
      case "goals":
        return (
          <GoalsTab
            goals={goals}
            getDisciplineForGoal={getDisciplineForGoal}
            onDeleteGoal={(goal) => setGoalToDelete(goal)}
          />
        );
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <AthleteHeader
        athlete={athlete}
        resultsCount={results.length}
        personalBestsCount={personalBests.length}
        medalsCount={medals.length}
        goldMedals={goldMedals}
        silverMedals={silverMedals}
        bronzeMedals={bronzeMedals}
        sbCount={sbCount}
        nrCount={nrCount}
        onBack={() => navigate("/athletes")}
        onEdit={() => setEditDialogOpen(true)}
        onDelete={() => setConfirmDeleteAthleteOpen(true)}
        onPhotoClick={() => setPhotoViewerOpen(true)}
      />

      {/* Tabs */}
      <div className="mb-6">
        <AthleteTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab content */}
      {renderTabContent()}

      {/* Edit dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        title="Muokkaa urheilijaa"
      >
        <AthleteForm
          athlete={athlete}
          onSave={handleEditSave}
          onCancel={() => setEditDialogOpen(false)}
        />
      </Dialog>

      {/* Add Result dialog */}
      <Dialog
        open={resultDialogOpen}
        onClose={() => setResultDialogOpen(false)}
        title="Lisää tulos"
        maxWidth="lg"
      >
        <ResultForm
          athleteId={athleteId}
          onSave={handleResultSave}
          onCancel={() => setResultDialogOpen(false)}
        />
      </Dialog>

      {/* Profile Photo Viewer */}
      {photoViewerOpen && athlete.photoPath && createPortal(
        <div
          className="photo-viewer-overlay"
          onClick={() => setPhotoViewerOpen(false)}
        >
          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDeletePhotoOpen(true);
            }}
            className="absolute top-4 left-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10 cursor-pointer"
          >
            <Trash2 size={20} />
          </button>

          {/* Close button */}
          <button
            onClick={() => setPhotoViewerOpen(false)}
            className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10 cursor-pointer"
          >
            <X size={24} />
          </button>

          <div className="photo-viewer-content">
            <img
              src={`asset://localhost/${athlete.photoPath.replace(/\\/g, "/")}`}
              alt={`${athlete.firstName} ${athlete.lastName}`}
              className="photo-viewer-image rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Confirm delete profile photo dialog */}
      <Dialog
        open={confirmDeletePhotoOpen}
        onClose={() => setConfirmDeletePhotoOpen(false)}
        title="Poista kuva"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Haluatko varmasti poistaa tämän kuvan? Tätä toimintoa ei voi perua.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmDeletePhotoOpen(false)}
              className="btn-secondary"
            >
              Peruuta
            </button>
            <button
              onClick={async () => {
                await updateAthlete(athlete.id, { ...athlete, photoPath: undefined });
                setConfirmDeletePhotoOpen(false);
                setPhotoViewerOpen(false);
              }}
              className="btn-primary bg-[var(--status-error)] hover:bg-[var(--status-error)]/90 cursor-pointer"
            >
              Poista
            </button>
          </div>
        </div>
      </Dialog>

      {/* Edit Result Dialog */}
      <ResultEditDialog
        result={selectedResult}
        open={isEditDialogOpen}
        onClose={handleEditDialogClose}
      />

      {/* Delete Result Confirmation Dialog */}
      <Dialog
        open={deleteConfirmResult !== null}
        onClose={() => setDeleteConfirmResult(null)}
        title="Poista tulos"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Haluatko varmasti poistaa tämän tuloksen? Tätä toimintoa ei voi
            perua.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteConfirmResult(null)}
              className="btn-secondary"
            >
              Peruuta
            </button>
            <button
              onClick={confirmDeleteResult}
              className="btn-primary bg-[var(--status-error)] hover:bg-[var(--status-error)]/90 cursor-pointer"
            >
              Poista
            </button>
          </div>
        </div>
      </Dialog>

      {/* Delete Athlete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDeleteAthleteOpen}
        onCancel={() => setConfirmDeleteAthleteOpen(false)}
        onConfirm={async () => {
          await deleteAthlete(athlete.id);
          toast.success("Urheilija poistettu");
          navigate("/athletes");
        }}
        title="Poista urheilija"
        message={
          <>
            Haluatko varmasti poistaa urheilijan <strong>{athlete.firstName} {athlete.lastName}</strong>?
            {results.length > 0 && (
              <> Kaikki {results.length} tulosta poistetaan myös.</>
            )}
          </>
        }
        confirmText="Poista"
        cancelText="Peruuta"
      />

      {/* Delete Goal Confirmation Dialog */}
      <ConfirmDialog
        open={goalToDelete !== null}
        onCancel={() => setGoalToDelete(null)}
        onConfirm={async () => {
          if (goalToDelete) {
            await deleteGoal(goalToDelete.id);
            await refetchGoals();
            toast.success("Tavoite poistettu");
            setGoalToDelete(null);
          }
        }}
        title="Poista tavoite"
        message="Haluatko varmasti poistaa tämän tavoitteen?"
        confirmText="Poista"
        cancelText="Peruuta"
      />
    </div>
  );
}
