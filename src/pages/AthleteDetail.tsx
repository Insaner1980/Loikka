import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Plus,
  User,
  Trophy,
  BarChart3,
  Target,
  CheckCircle,
  Camera,
} from "lucide-react";
import { useAthleteStore } from "../stores/useAthleteStore";
import { useResultStore } from "../stores/useResultStore";
import { AthleteStats } from "../components/athletes/AthleteStats";
import { AthleteTabs, type AthleteTab } from "../components/athletes/AthleteTabs";
import { AthleteForm } from "../components/athletes/AthleteForm";
import { Dialog } from "../components/ui/Dialog";
import { ResultBadge } from "../components/results/ResultBadge";
import { ResultForm } from "../components/results/ResultForm";
import { PhotoGallery } from "../components/shared/PhotoGallery";
import { formatTime, formatDistance, formatDate } from "../lib/formatters";
import type {
  NewAthlete,
  NewResult,
  MedalType,
  Result,
  Medal,
  Goal,
  Discipline,
} from "../types";

const medalClasses: Record<"gold" | "silver" | "bronze", string> = {
  gold: "bg-gold",
  silver: "bg-silver",
  bronze: "bg-bronze",
};

interface ResultWithDiscipline extends Result {
  discipline: Discipline;
}

export function AthleteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    athletes,
    fetchAthletes,
    updateAthlete,
    getAthleteById,
    getAthleteResults,
    getAthletePersonalBests,
    getAthleteMedals,
    getAthleteGoals,
  } = useAthleteStore();

  const [activeTab, setActiveTab] = useState<AthleteTab>("records");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);

  // State for async data
  const [results, setResults] = useState<ResultWithDiscipline[]>([]);
  const [personalBests, setPersonalBests] = useState<ResultWithDiscipline[]>([]);
  const [medals, setMedals] = useState<Medal[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const { addResult } = useResultStore();

  const athleteId = id ? parseInt(id) : 0;

  useEffect(() => {
    if (athletes.length === 0) {
      fetchAthletes();
    }
  }, [athletes.length, fetchAthletes]);

  // Load async data when athlete changes
  useEffect(() => {
    if (athleteId) {
      const loadData = async () => {
        const [resultsData, pbData, medalsData, goalsData] = await Promise.all([
          getAthleteResults(athleteId),
          getAthletePersonalBests(athleteId),
          getAthleteMedals(athleteId),
          getAthleteGoals(athleteId),
        ]);
        setResults(resultsData);
        setPersonalBests(pbData);
        setMedals(medalsData);
        setGoals(goalsData);
      };
      loadData();
    }
  }, [
    athleteId,
    getAthleteResults,
    getAthletePersonalBests,
    getAthleteMedals,
    getAthleteGoals,
  ]);

  const athleteData = getAthleteById(athleteId);

  if (!athleteData) {
    return (
      <div className="p-8">
        <button
          onClick={() => navigate("/athletes")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft size={20} />
          Takaisin
        </button>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Urheilijaa ei löytynyt</p>
        </div>
      </div>
    );
  }

  const { athlete, stats } = athleteData;
  const currentYear = new Date().getFullYear();
  const age = currentYear - athlete.birthYear;

  const handleEditSave = async (data: NewAthlete) => {
    await updateAthlete(athlete.id, data);
    setEditDialogOpen(false);
  };

  const handleResultSave = async (
    data: NewResult,
    medal?: { type: MedalType; competitionName: string }
  ) => {
    await addResult(data, medal);
    // Reload results
    const [resultsData, pbData] = await Promise.all([
      getAthleteResults(athleteId),
      getAthletePersonalBests(athleteId),
    ]);
    setResults(resultsData);
    setPersonalBests(pbData);
    setResultDialogOpen(false);
  };

  const goalsProgress = {
    achieved: goals.filter((g) => g.status === "achieved").length,
    total: goals.length,
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "records":
        return (
          <div className="space-y-3">
            {personalBests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Ei ennätyksiä vielä
              </p>
            ) : (
              personalBests.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-4 bg-card rounded-xl border border-border"
                >
                  <div>
                    <div className="font-semibold">
                      {result.discipline.fullName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(result.date)}
                      {result.competitionName && ` • ${result.competitionName}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ResultBadge type="pb" />
                    <span className="text-xl font-bold">
                      {result.discipline.unit === "time"
                        ? formatTime(result.value)
                        : formatDistance(result.value)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case "results":
        return (
          <div className="space-y-3">
            {results.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Ei tuloksia vielä
              </p>
            ) : (
              results.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-4 bg-card rounded-xl border border-border"
                >
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {result.discipline.name}
                      {result.isPersonalBest && <ResultBadge type="pb" />}
                      {!result.isPersonalBest && result.isSeasonBest && (
                        <ResultBadge type="sb" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(result.date)}
                      {result.competitionName && ` • ${result.competitionName}`}
                      {result.location && ` • ${result.location}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold">
                      {result.discipline.unit === "time"
                        ? formatTime(result.value)
                        : formatDistance(result.value)}
                    </span>
                    {result.placement && (
                      <div className="text-sm text-muted-foreground">
                        Sija {result.placement}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case "medals":
        return (
          <div className="space-y-3">
            {medals.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Ei mitaleja vielä
              </p>
            ) : (
              medals.map((medal) => (
                <div
                  key={medal.id}
                  className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border"
                >
                  <div
                    className={`w-10 h-10 rounded-full ${medalClasses[medal.type]} flex items-center justify-center`}
                  >
                    <Trophy size={20} className="text-black/70" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{medal.competitionName}</div>
                    <div className="text-sm text-muted-foreground">
                      {medal.disciplineName && `${medal.disciplineName} • `}
                      {formatDate(medal.date)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case "progress":
        return (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
              <BarChart3 size={32} className="text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Kehityskaaviot</h2>
            <p className="text-muted-foreground">
              Tässä näkyvät pian tuloskehityskaaviot
            </p>
          </div>
        );

      case "goals":
        return (
          <div className="space-y-3">
            {goals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Target size={32} className="text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Ei tavoitteita</h2>
                <p className="text-muted-foreground">
                  Lisää ensimmäinen tavoite
                </p>
              </div>
            ) : (
              goals.map((goal) => (
                <div
                  key={goal.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${
                    goal.status === "achieved"
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-card border-border"
                  }`}
                >
                  {goal.status === "achieved" ? (
                    <CheckCircle size={24} className="text-green-500" />
                  ) : (
                    <Target size={24} className="text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold">
                      Tavoite: {goal.targetValue}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {goal.targetDate &&
                        `Tavoitepäivä: ${formatDate(goal.targetDate)}`}
                      {goal.achievedAt && (
                        <span className="text-green-600">
                          {" "}
                          • Saavutettu {formatDate(goal.achievedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );
    }
  };

  return (
    <div className="p-8">
      {/* Back button */}
      <button
        onClick={() => navigate("/athletes")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Takaisin
      </button>

      {/* Profile header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-6">
          {athlete.photoPath ? (
            <img
              src={athlete.photoPath}
              alt={`${athlete.firstName} ${athlete.lastName}`}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <User size={40} />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">
              {athlete.firstName} {athlete.lastName}
            </h1>
            <div className="text-muted-foreground mt-1">
              {athlete.birthYear} ({age} v.)
              {athlete.clubName && ` • ${athlete.clubName}`}
            </div>
          </div>
        </div>
        <button
          onClick={() => setEditDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl hover:bg-muted transition-colors"
        >
          <Edit size={18} />
          Muokkaa
        </button>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <AthleteStats
          resultsCount={stats.resultCount}
          personalBestsCount={stats.pbCount}
          medalsCount={stats.goldMedals + stats.silverMedals + stats.bronzeMedals}
          goalsProgress={goalsProgress}
        />
      </div>

      {/* Photo Gallery */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Camera size={20} className="text-muted-foreground" />
          <h2 className="font-semibold">Kuvat</h2>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <PhotoGallery
            entityType="athletes"
            entityId={athleteId}
            canAdd={true}
            canDelete={true}
            maxPhotos={12}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <AthleteTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Add result button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setResultDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary font-medium rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          Lisää tulos
        </button>
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
    </div>
  );
}
