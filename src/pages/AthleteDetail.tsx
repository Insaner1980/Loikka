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
import { formatTime, formatDistance, formatDate, toAssetUrl } from "../lib/formatters";
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
      <div className="p-6">
        <button
          onClick={() => navigate("/athletes")}
          className="flex items-center gap-2 text-text-tertiary hover:text-foreground mb-6 transition-colors duration-150"
        >
          <ArrowLeft size={18} />
          <span className="text-[13px]">Takaisin</span>
        </button>
        <div className="text-center py-16">
          <p className="text-text-secondary text-[13px]">Urheilijaa ei löytynyt</p>
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
          <div className="space-y-2">
            {personalBests.length === 0 ? (
              <p className="text-text-secondary text-[13px] text-center py-8">
                Ei ennätyksiä vielä
              </p>
            ) : (
              personalBests.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-4 bg-[#141414] rounded-lg"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {result.discipline.fullName}
                    </div>
                    <div className="text-[13px] text-[#666666] mt-0.5">
                      {formatDate(result.date)}
                      {result.competitionName && ` · ${result.competitionName}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ResultBadge type="pb" />
                    <span className="text-lg font-semibold tabular-nums text-foreground">
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
          <div className="space-y-2">
            {results.length === 0 ? (
              <p className="text-text-secondary text-[13px] text-center py-8">
                Ei tuloksia vielä
              </p>
            ) : (
              results.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-4 bg-[#141414] rounded-lg"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground flex items-center gap-2">
                      {result.discipline.name}
                      {result.isPersonalBest && <ResultBadge type="pb" />}
                      {!result.isPersonalBest && result.isSeasonBest && (
                        <ResultBadge type="sb" />
                      )}
                    </div>
                    <div className="text-[13px] text-[#666666] mt-0.5">
                      {formatDate(result.date)}
                      {result.competitionName && ` · ${result.competitionName}`}
                      {result.location && ` · ${result.location}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {result.discipline.unit === "time"
                        ? formatTime(result.value)
                        : formatDistance(result.value)}
                    </span>
                    {result.placement && (
                      <div className="text-[13px] text-[#666666]">
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
          <div className="space-y-2">
            {medals.length === 0 ? (
              <p className="text-text-secondary text-[13px] text-center py-8">
                Ei mitaleja vielä
              </p>
            ) : (
              medals.map((medal) => (
                <div
                  key={medal.id}
                  className="flex items-center gap-4 p-4 bg-[#141414] rounded-lg"
                >
                  <div
                    className={`w-9 h-9 rounded-full ${medalClasses[medal.type]} flex items-center justify-center`}
                  >
                    <Trophy size={18} className="text-black/70" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{medal.competitionName}</div>
                    <div className="text-[13px] text-[#666666] mt-0.5">
                      {medal.disciplineName && `${medal.disciplineName} · `}
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
            <BarChart3 size={48} className="text-[#444444] mb-4" />
            <h2 className="text-sm font-medium text-[#666666] mb-1.5">Kehityskaaviot</h2>
            <p className="text-[13px] text-[#555555]">
              Tässä näkyvät pian tuloskehityskaaviot
            </p>
          </div>
        );

      case "goals":
        return (
          <div className="space-y-2">
            {goals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Target size={48} className="text-[#444444] mb-4" />
                <h2 className="text-sm font-medium text-[#666666] mb-1.5">Ei tavoitteita</h2>
                <p className="text-[13px] text-[#555555]">
                  Lisää ensimmäinen tavoite
                </p>
              </div>
            ) : (
              goals.map((goal) => (
                <div
                  key={goal.id}
                  className={`flex items-center gap-4 p-4 rounded-lg ${
                    goal.status === "achieved"
                      ? "bg-success/10"
                      : "bg-[#141414]"
                  }`}
                >
                  {goal.status === "achieved" ? (
                    <CheckCircle size={20} className="text-success" />
                  ) : (
                    <Target size={20} className="text-[#555555]" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">
                      Tavoite: {goal.targetValue}
                    </div>
                    <div className="text-[13px] text-[#666666] mt-0.5">
                      {goal.targetDate &&
                        `Tavoitepäivä: ${formatDate(goal.targetDate)}`}
                      {goal.achievedAt && (
                        <span className="text-success">
                          {" "}
                          · Saavutettu {formatDate(goal.achievedAt)}
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
    <div className="p-6">
      {/* Back button */}
      <button
        onClick={() => navigate("/athletes")}
        className="flex items-center gap-2 text-text-tertiary hover:text-foreground mb-6 transition-colors duration-150"
      >
        <ArrowLeft size={18} />
        <span className="text-[13px]">Takaisin</span>
      </button>

      {/* Profile header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b border-border-subtle">
        <div className="flex items-center gap-4">
          {athlete.photoPath ? (
            <img
              src={toAssetUrl(athlete.photoPath)}
              alt={`${athlete.firstName} ${athlete.lastName}`}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#191919] flex items-center justify-center text-[#666666]">
              <User size={28} />
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {athlete.firstName} {athlete.lastName}
            </h1>
            <div className="text-[13px] text-text-secondary mt-0.5">
              {athlete.birthYear} ({age} v.)
              {athlete.clubName && ` · ${athlete.clubName}`}
            </div>
          </div>
        </div>
        <button
          onClick={() => setEditDialogOpen(true)}
          className="btn-secondary btn-press"
        >
          <Edit size={16} />
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
        <div className="flex items-center gap-2 mb-3">
          <Camera size={16} className="text-[#555555]" />
          <h2 className="text-[13px] font-medium text-[#888888]">Kuvat</h2>
        </div>
        <div className="bg-[#141414] rounded-lg p-4">
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
          className="btn-primary btn-press"
        >
          <Plus size={18} />
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
