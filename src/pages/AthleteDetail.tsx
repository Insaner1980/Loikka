import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Target,
  CheckCircle,
  ChevronRight,
  X,
  Trash2,
  TrendingUp,
  TrendingDown,
  Trophy,
  Hash,
  Calculator,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useAthleteStore } from "../stores/useAthleteStore";
import { useResultStore } from "../stores/useResultStore";
import { AthleteTabs, type AthleteTab } from "../components/athletes/AthleteTabs";
import { AthleteForm } from "../components/athletes/AthleteForm";
import { Dialog } from "../components/ui/Dialog";
import { ResultBadge } from "../components/results/ResultBadge";
import { ResultCard } from "../components/results/ResultCard";
import { ResultForm } from "../components/results/ResultForm";
import { ResultEditDialog } from "../components/results/ResultEditDialog";
import { formatTime, formatDistance, formatDate, toAssetUrl, getAgeCategory, getStatusLabel } from "../lib/formatters";
import { categoryLabels, categoryOrder } from "../data/disciplines";
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
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Get discipline filter from URL params
  const disciplineFilterParam = searchParams.get("discipline");
  const [disciplineFilter, setDisciplineFilter] = useState<number | null>(
    disciplineFilterParam ? parseInt(disciplineFilterParam) : null
  );
  const [seasonFilter, setSeasonFilter] = useState<number | null>(null);
  const [recordsDisciplineFilter, setRecordsDisciplineFilter] = useState<number | null>(null);
  const [recordsSeasonFilter, setRecordsSeasonFilter] = useState<number | null>(null);
  const [progressDisciplineFilter, setProgressDisciplineFilter] = useState<number | null>(null);
  const [progressSeasonFilter, setProgressSeasonFilter] = useState<number | null>(null);
  const [medalsDisciplineFilter, setMedalsDisciplineFilter] = useState<number | null>(null);
  const [medalsCompetitionFilter, setMedalsCompetitionFilter] = useState<string | null>(null);
  const [medalsSeasonFilter, setMedalsSeasonFilter] = useState<number | null>(null);

  // Update discipline filter when URL changes and switch to results tab
  useEffect(() => {
    const param = searchParams.get("discipline");
    const newFilter = param ? parseInt(param) : null;
    setDisciplineFilter(newFilter);
    // Switch to results tab when discipline filter is active
    if (newFilter) {
      setActiveTab("results");
    }
  }, [searchParams]);

  // Reset filters when athlete changes
  useEffect(() => {
    setSeasonFilter(null);
    setRecordsDisciplineFilter(null);
    setRecordsSeasonFilter(null);
    setProgressDisciplineFilter(null);
    setProgressSeasonFilter(null);
  }, [id]);

  // Update URL when discipline filter changes (but not for season)
  const handleDisciplineFilterChange = (value: number | null) => {
    setDisciplineFilter(value);
    setSeasonFilter(null); // Reset season filter when discipline changes
    if (value) {
      setSearchParams({ discipline: value.toString() });
    } else {
      setSearchParams({});
    }
  };

  const [activeTab, setActiveTab] = useState<AthleteTab>("records");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [confirmDeletePhotoOpen, setConfirmDeletePhotoOpen] = useState(false);

  // State for async data
  const [results, setResults] = useState<ResultWithDiscipline[]>([]);
  const [personalBests, setPersonalBests] = useState<ResultWithDiscipline[]>([]);
  const [medals, setMedals] = useState<Medal[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const { addResult, deleteResult } = useResultStore();

  // State for result editing and deletion
  const [selectedResult, setSelectedResult] = useState<ResultWithDiscipline | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmResult, setDeleteConfirmResult] = useState<ResultWithDiscipline | null>(null);


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
      // Reload data after deletion
      const [resultsData, pbData, medalsData] = await Promise.all([
        getAthleteResults(athleteId),
        getAthletePersonalBests(athleteId),
        getAthleteMedals(athleteId),
      ]);
      setResults(resultsData);
      setPersonalBests(pbData);
      setMedals(medalsData);
      setDeleteConfirmResult(null);
    }
  };

  const handleEditDialogClose = async () => {
    setIsEditDialogOpen(false);
    setSelectedResult(null);
    // Reload data after edit
    const [resultsData, pbData, medalsData] = await Promise.all([
      getAthleteResults(athleteId),
      getAthletePersonalBests(athleteId),
      getAthleteMedals(athleteId),
    ]);
    setResults(resultsData);
    setPersonalBests(pbData);
    setMedals(medalsData);
  };

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

  const handleEditSave = async (data: NewAthlete) => {
    await updateAthlete(athlete.id, data);
    setEditDialogOpen(false);
  };

  const handleResultSave = async (
    data: NewResult,
    medal?: { type: MedalType; competitionName: string }
  ) => {
    await addResult(data, medal);
    // Reload results and medals
    const [resultsData, pbData, medalsData] = await Promise.all([
      getAthleteResults(athleteId),
      getAthletePersonalBests(athleteId),
      getAthleteMedals(athleteId),
    ]);
    setResults(resultsData);
    setPersonalBests(pbData);
    setMedals(medalsData);
    setResultDialogOpen(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "records": {
        // Get unique disciplines from personal bests
        const recordsDisciplines = [...new Map(
          personalBests.map((r) => [r.disciplineId, r.discipline])
        ).values()];

        // Filter personal bests by discipline first (for year options)
        const recordsForYearFilter = recordsDisciplineFilter
          ? personalBests.filter((r) => r.disciplineId === recordsDisciplineFilter)
          : personalBests;

        // Get unique years from discipline-filtered records
        const recordsUniqueYears = [...new Set(
          recordsForYearFilter.map((r) => new Date(r.date).getFullYear())
        )].sort((a, b) => b - a);

        // Apply both filters for display
        const filteredRecords = personalBests.filter((r) => {
          if (recordsDisciplineFilter && r.disciplineId !== recordsDisciplineFilter) return false;
          if (recordsSeasonFilter && new Date(r.date).getFullYear() !== recordsSeasonFilter) return false;
          return true;
        });

        return (
          <div className="space-y-3">
            {/* Filter row */}
            {personalBests.length > 0 && (
              <div className="flex gap-3">
                <select
                  value={recordsDisciplineFilter ?? ""}
                  onChange={(e) => {
                    setRecordsDisciplineFilter(e.target.value ? parseInt(e.target.value) : null);
                    setRecordsSeasonFilter(null); // Reset season filter when discipline changes
                  }}
                  className="flex-1 px-3 py-2 bg-card border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
                >
                  <option value="">Kaikki lajit</option>
                  {categoryOrder.map((category) => {
                    const categoryDisciplines = recordsDisciplines.filter(
                      (d) => d.category === category
                    );
                    if (categoryDisciplines.length === 0) return null;
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
                <select
                  value={recordsSeasonFilter ?? ""}
                  onChange={(e) => setRecordsSeasonFilter(e.target.value ? parseInt(e.target.value) : null)}
                  className="flex-1 px-3 py-2 bg-card border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
                >
                  <option value="">Kaikki kaudet</option>
                  {recordsUniqueYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Records grid */}
            {filteredRecords.length === 0 ? (
              <p className="text-muted-foreground text-body text-center py-8">
                {personalBests.length === 0
                  ? "Ei ennätyksiä vielä"
                  : "Ei ennätyksiä valitulla suodattimella"}
              </p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredRecords.map((result) => (
                  <div
                    key={result.id}
                    className="rounded-xl bg-card border border-border-subtle hover:border-border-hover transition-colors duration-150 p-4 flex flex-col"
                  >
                    {/* Top: Discipline */}
                    <div className="text-sm font-medium text-foreground mb-3">
                      {result.discipline.fullName}
                    </div>

                    {/* Center: Result value (big) */}
                    <div className="flex-1 flex flex-col items-center justify-center py-2">
                      {(result.status && result.status !== "valid") || result.value === 0 ? (
                        <span className="px-3 py-1.5 text-sm font-medium rounded-lg bg-muted text-muted-foreground">
                          {getStatusLabel(result.status) || "Ei tulosta"}
                        </span>
                      ) : (
                        <>
                          <span className="text-2xl font-bold tabular-nums text-foreground">
                            {result.discipline.unit === "time"
                              ? formatTime(result.value)
                              : formatDistance(result.value)}
                          </span>
                          {/* Badges */}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <ResultBadge type="pb" />
                            {result.isSeasonBest && <ResultBadge type="sb" />}
                            {result.isNationalRecord && <ResultBadge type="nr" />}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="h-px w-full bg-white/10 my-3" />

                    {/* Bottom: Date + competition */}
                    <div className="text-sm text-muted-foreground">
                      <div>{formatDate(result.date)}</div>
                      {result.competitionName && (
                        <div className="truncate mt-0.5">{result.competitionName}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case "results": {
        // Get unique disciplines from all results
        const uniqueDisciplines = [...new Map(
          results.map((r) => [r.disciplineId, r.discipline])
        ).values()];

        // Filter results by discipline first (for year options)
        const resultsForYearFilter = disciplineFilter
          ? results.filter((r) => r.disciplineId === disciplineFilter)
          : results;

        // Get unique years from discipline-filtered results
        const uniqueYears = [...new Set(
          resultsForYearFilter.map((r) => new Date(r.date).getFullYear())
        )].sort((a, b) => b - a);

        // Apply both filters for display
        const filteredResults = results.filter((r) => {
          if (disciplineFilter && r.disciplineId !== disciplineFilter) return false;
          if (seasonFilter && new Date(r.date).getFullYear() !== seasonFilter) return false;
          return true;
        });

        return (
          <div className="space-y-3">
            {/* Filter row */}
            {results.length > 0 && (
              <div className="flex gap-3">
                <select
                  value={disciplineFilter ?? ""}
                  onChange={(e) => handleDisciplineFilterChange(e.target.value ? parseInt(e.target.value) : null)}
                  className="flex-1 px-3 py-2 bg-card border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
                >
                  <option value="">Kaikki lajit</option>
                  {categoryOrder.map((category) => {
                    const categoryDisciplines = uniqueDisciplines.filter(
                      (d) => d.category === category
                    );
                    if (categoryDisciplines.length === 0) return null;
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
                <select
                  value={seasonFilter ?? ""}
                  onChange={(e) => setSeasonFilter(e.target.value ? parseInt(e.target.value) : null)}
                  className="flex-1 px-3 py-2 bg-card border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
                >
                  <option value="">Kaikki kaudet</option>
                  {uniqueYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Results grid */}
            {filteredResults.length === 0 ? (
              <p className="text-muted-foreground text-body text-center py-8">
                {results.length === 0
                  ? "Ei tuloksia vielä"
                  : "Ei tuloksia valituilla suodattimilla"}
              </p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredResults.map((result) => (
                  <ResultCard
                    key={result.id}
                    result={result}
                    athlete={athlete}
                    discipline={result.discipline}
                    onEdit={() => handleEditResult(result)}
                    onDelete={() => handleDeleteResult(result)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      }

      case "medals": {
        // Get unique disciplines from medals
        const medalsDisciplinesMap = new Map(
          medals
            .filter(m => m.disciplineId && m.disciplineName)
            .map(m => [m.disciplineId!, { id: m.disciplineId!, name: m.disciplineName! }])
        );
        const medalsDisciplines = [...medalsDisciplinesMap.values()];

        // Filter by discipline first (for competition options)
        const medalsForCompetitionFilter = medalsDisciplineFilter
          ? medals.filter(m => m.disciplineId === medalsDisciplineFilter)
          : medals;

        // Get unique competition names from discipline-filtered medals
        const medalsCompetitions = [...new Set(medalsForCompetitionFilter.map(m => m.competitionName))].sort();

        // Filter by discipline and competition (for year options)
        const medalsForYearFilter = medalsForCompetitionFilter.filter(m =>
          !medalsCompetitionFilter || m.competitionName === medalsCompetitionFilter
        );

        // Get unique years from filtered medals
        const medalsUniqueYears = [...new Set(
          medalsForYearFilter.map(m => new Date(m.date).getFullYear())
        )].sort((a, b) => b - a);

        // Apply all filters for display
        const filteredMedals = medals.filter(m => {
          if (medalsDisciplineFilter && m.disciplineId !== medalsDisciplineFilter) return false;
          if (medalsCompetitionFilter && m.competitionName !== medalsCompetitionFilter) return false;
          if (medalsSeasonFilter && new Date(m.date).getFullYear() !== medalsSeasonFilter) return false;
          return true;
        });

        // Medal number mapping
        const medalNumber: Record<string, number> = { gold: 1, silver: 2, bronze: 3 };

        return (
          <div className="space-y-3">
            {/* Filter row */}
            {medals.length > 0 && (
              <div className="flex gap-3">
                <select
                  value={medalsDisciplineFilter ?? ""}
                  onChange={(e) => setMedalsDisciplineFilter(e.target.value ? parseInt(e.target.value) : null)}
                  className="flex-1 px-3 py-2 bg-card border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
                >
                  <option value="">Kaikki lajit</option>
                  {medalsDisciplines.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <select
                  value={medalsCompetitionFilter ?? ""}
                  onChange={(e) => setMedalsCompetitionFilter(e.target.value || null)}
                  className="flex-1 px-3 py-2 bg-card border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
                >
                  <option value="">Kaikki kilpailut</option>
                  {medalsCompetitions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <select
                  value={medalsSeasonFilter ?? ""}
                  onChange={(e) => setMedalsSeasonFilter(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-28 px-3 py-2 bg-card border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
                >
                  <option value="">Kaudet</option>
                  {medalsUniqueYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Medal cards grid */}
            {filteredMedals.length === 0 ? (
              <p className="text-muted-foreground text-body text-center py-8">
                {medals.length === 0 ? "Ei mitaleja vielä" : "Ei mitaleja valituilla suodattimilla"}
              </p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMedals.map((medal) => {
                  // Find linked result
                  const linkedResult = medal.resultId
                    ? results.find(r => r.id === medal.resultId)
                    : null;

                  return (
                    <button
                      key={medal.id}
                      onClick={() => {
                        if (medal.disciplineId) {
                          setActiveTab("results");
                          handleDisciplineFilterChange(medal.disciplineId);
                        }
                      }}
                      className="rounded-xl bg-card border border-border-subtle hover:border-border-hover transition-colors duration-150 p-4 flex flex-col text-left cursor-pointer"
                    >
                      {/* Top: Medal circle centered */}
                      <div className="flex justify-center mb-3">
                        <div
                          className={`w-12 h-12 rounded-full ${medalClasses[medal.type]} shadow-lg flex items-center justify-center`}
                        >
                          <span className="text-lg font-bold text-black/70">{medalNumber[medal.type]}</span>
                        </div>
                      </div>

                      {/* Center: Discipline + result */}
                      <div className="flex-1 flex flex-col items-center justify-center py-1">
                        <span className="text-sm font-medium text-foreground text-center">
                          {medal.disciplineName || "Tuntematon laji"}
                        </span>
                        {linkedResult && (
                          <span className="text-lg font-bold tabular-nums text-foreground mt-1">
                            {linkedResult.discipline.unit === "time"
                              ? formatTime(linkedResult.value)
                              : formatDistance(linkedResult.value)}
                          </span>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="h-px w-full bg-white/10 my-3" />

                      {/* Bottom: Competition, date, location */}
                      <div className="text-sm text-muted-foreground text-center">
                        <div className="truncate">{medal.competitionName}</div>
                        <div className="mt-0.5">
                          {formatDate(medal.date)}
                          {medal.location && ` · ${medal.location}`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case "progress": {
        // Get unique disciplines from all results (only those with results)
        const progressDisciplinesMap = new Map(
          results.map((r) => [r.disciplineId, r.discipline])
        );
        const progressDisciplines = [...progressDisciplinesMap.values()];

        // Filter by discipline first
        const disciplineResults = progressDisciplineFilter
          ? results.filter((r) => r.disciplineId === progressDisciplineFilter)
          : [];

        // Get unique years from discipline-filtered results
        const progressUniqueYears = [...new Set(
          disciplineResults.map((r) => new Date(r.date).getFullYear())
        )].sort((a, b) => b - a);

        // Get the selected discipline
        const selectedDiscipline = progressDisciplineFilter
          ? progressDisciplines.find((d) => d.id === progressDisciplineFilter)
          : null;

        // Determine if lower is better (time events)
        const isLowerBetter = selectedDiscipline?.unit === "time";

        // Filter by season
        const seasonResults = progressSeasonFilter
          ? disciplineResults.filter(
              (r) => new Date(r.date).getFullYear() === progressSeasonFilter
            )
          : disciplineResults;

        // Sort by date for chart
        const sortedResults = [...seasonResults].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Find best result (all-time for this discipline)
        const allTimeBest = disciplineResults.length > 0
          ? disciplineResults.reduce((best, r) => {
              if (r.value === 0 || (r.status && r.status !== "valid")) return best;
              if (!best || (isLowerBetter ? r.value < best.value : r.value > best.value)) {
                return r;
              }
              return best;
            }, null as ResultWithDiscipline | null)
          : null;

        // Season stats
        const validSeasonResults = sortedResults.filter(
          (r) => r.value > 0 && (!r.status || r.status === "valid")
        );

        const seasonBest = validSeasonResults.length > 0
          ? validSeasonResults.reduce((best, r) =>
              isLowerBetter ? (r.value < best.value ? r : best) : (r.value > best.value ? r : best)
            )
          : null;

        const seasonFirst = validSeasonResults.length > 0 ? validSeasonResults[0] : null;

        const improvement =
          seasonFirst && seasonBest
            ? isLowerBetter
              ? seasonFirst.value - seasonBest.value
              : seasonBest.value - seasonFirst.value
            : 0;

        const average =
          validSeasonResults.length > 0
            ? validSeasonResults.reduce((sum, r) => sum + r.value, 0) /
              validSeasonResults.length
            : 0;

        // Chart data - use unique key for each point to handle same-day results
        const chartData = sortedResults
          .filter((r) => r.value > 0 && (!r.status || r.status === "valid"))
          .map((r, index) => ({
            key: `${r.date}-${index}`,
            date: new Date(r.date).toLocaleDateString("fi-FI", {
              day: "numeric",
              month: "numeric",
            }),
            fullDate: formatDate(r.date),
            value: r.value,
            isPB: allTimeBest ? r.id === allTimeBest.id : false,
            isSB: r.isSeasonBest || false,
            isNR: r.isNationalRecord || false,
          }));

        // Season comparison (best per year for last 4 years)
        const seasonBests = progressUniqueYears.slice(0, 4).map((year) => {
          const yearResults = disciplineResults.filter(
            (r) =>
              new Date(r.date).getFullYear() === year &&
              r.value > 0 &&
              (!r.status || r.status === "valid")
          );
          if (yearResults.length === 0) return { year, value: 0 };
          const best = yearResults.reduce((best, r) =>
            isLowerBetter ? (r.value < best.value ? r : best) : (r.value > best.value ? r : best)
          );
          return { year, value: best.value };
        }).filter(s => s.value > 0).reverse();

        // Custom tooltip for line chart
        const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { fullDate: string; value: number; isPB: boolean; isSB: boolean; isNR: boolean } }> }) => {
          if (active && payload && payload.length) {
            const data = payload[0].payload;
            const hasBadges = data.isNR || data.isPB || data.isSB;
            return (
              <div className="bg-card border border-border-subtle rounded-lg px-3 py-2 shadow-lg">
                <p className="text-body text-muted-foreground">{data.fullDate}</p>
                <p className="text-lg font-bold text-foreground">
                  {selectedDiscipline?.unit === "time"
                    ? formatTime(data.value)
                    : formatDistance(data.value)}
                </p>
                {hasBadges && (
                  <div className="flex gap-1 mt-1">
                    {data.isNR && <span className="badge-nr">SE</span>}
                    {data.isPB && <span className="badge-pb">OE</span>}
                    {data.isSB && <span className="badge-sb">KE</span>}
                  </div>
                )}
              </div>
            );
          }
          return null;
        };

        // Format improvement value
        const formatImprovement = (value: number) => {
          if (selectedDiscipline?.unit === "time") {
            const prefix = value > 0 ? "-" : "+";
            return `${prefix}${Math.abs(value).toFixed(2)} s`;
          } else {
            const prefix = value > 0 ? "+" : "";
            return `${prefix}${(value * 100).toFixed(0)} cm`;
          }
        };

        return (
          <div className="space-y-6">
            {/* Filter row */}
            <div className="flex gap-3">
              <select
                value={progressDisciplineFilter ?? ""}
                onChange={(e) => {
                  setProgressDisciplineFilter(
                    e.target.value ? parseInt(e.target.value) : null
                  );
                  setProgressSeasonFilter(null);
                }}
                className="flex-1 px-3 py-2 bg-card border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
              >
                <option value="">Valitse laji</option>
                {categoryOrder.map((category) => {
                  const categoryDisciplines = progressDisciplines.filter(
                    (d) => d.category === category
                  );
                  if (categoryDisciplines.length === 0) return null;
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
              {progressDisciplineFilter && (
                <select
                  value={progressSeasonFilter ?? ""}
                  onChange={(e) =>
                    setProgressSeasonFilter(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="flex-1 px-3 py-2 bg-card border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
                >
                  <option value="">Kaikki kaudet</option>
                  {progressUniqueYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Empty state if no discipline selected */}
            {!progressDisciplineFilter && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <TrendingUp size={48} className="text-icon-muted mb-4" />
                <h2 className="text-sm font-medium text-muted-foreground mb-1.5">
                  Valitse laji
                </h2>
                <p className="text-body text-tertiary">
                  Valitse laji nähdäksesi kehityksen
                </p>
              </div>
            )}

            {/* Empty state if no results for discipline */}
            {progressDisciplineFilter && chartData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <TrendingUp size={48} className="text-icon-muted mb-4" />
                <h2 className="text-sm font-medium text-muted-foreground mb-1.5">
                  Ei tuloksia
                </h2>
                <p className="text-body text-tertiary">
                  Ei vielä tuloksia tässä lajissa
                </p>
              </div>
            )}

            {/* Progress chart */}
            {progressDisciplineFilter && chartData.length > 0 && (
              <>
                <div className="bg-card border border-border-subtle rounded-lg p-4">
                  <h3 className="text-sm font-medium text-foreground mb-4">
                    Tuloskehitys
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis
                          dataKey="key"
                          tick={{ fill: "var(--text-muted)", fontSize: 11, dy: 10 }}
                          tickLine={false}
                          axisLine={{ stroke: "var(--border-subtle)" }}
                          tickFormatter={(value) => {
                            // Extract date part from key (format: "YYYY-MM-DD-index")
                            const datePart = value.split("-").slice(0, 3).join("-");
                            return new Date(datePart).toLocaleDateString("fi-FI", {
                              day: "numeric",
                              month: "numeric",
                            });
                          }}
                        />
                        <YAxis
                          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: "var(--border-subtle)" }}
                          domain={["auto", "auto"]}
                          reversed={isLowerBetter}
                          tickFormatter={(value) =>
                            selectedDiscipline?.unit === "time"
                              ? formatTime(value)
                              : `${value.toFixed(2)}`
                          }
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ stroke: "var(--accent)", strokeWidth: 1 }}
                        />
                        {allTimeBest && (
                          <ReferenceLine
                            y={allTimeBest.value}
                            stroke="var(--accent)"
                            strokeDasharray="3 3"
                            strokeOpacity={0.5}
                          />
                        )}
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="var(--accent)"
                          strokeWidth={2}
                          dot={(props) => {
                            const { cx, cy, payload } = props;
                            if (payload.isPB) {
                              return (
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={6}
                                  fill="var(--accent)"
                                  stroke="var(--bg-card)"
                                  strokeWidth={2}
                                />
                              );
                            }
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={4}
                                fill="var(--accent)"
                              />
                            );
                          }}
                          activeDot={{ r: 6, fill: "var(--accent)" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Best result */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Paras</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-stat font-bold tabular-nums">
                            {seasonBest
                              ? selectedDiscipline?.unit === "time"
                                ? formatTime(seasonBest.value)
                                : formatDistance(seasonBest.value)
                              : "-"}
                          </p>
                        </div>
                      </div>
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Trophy size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Improvement */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Kehitys</p>
                        <p className="text-stat font-bold tabular-nums mt-1 text-foreground">
                          {validSeasonResults.length >= 2
                            ? formatImprovement(improvement)
                            : "-"}
                        </p>
                      </div>
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        {improvement > 0 ? (
                          <TrendingUp size={20} />
                        ) : (
                          <TrendingDown size={20} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Count */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Tuloksia</p>
                        <p className="text-stat font-bold tabular-nums mt-1">
                          {validSeasonResults.length}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {progressSeasonFilter ? "kaudella" : "yhteensä"}
                        </p>
                      </div>
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Hash size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Average */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Keskiarvo</p>
                        <p className="text-stat font-bold tabular-nums mt-1">
                          {average > 0
                            ? selectedDiscipline?.unit === "time"
                              ? formatTime(average)
                              : formatDistance(average)
                            : "-"}
                        </p>
                      </div>
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Calculator size={20} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Season comparison */}
                {seasonBests.length > 1 && (
                  <div className="bg-card border border-border-subtle rounded-lg p-4">
                    <h3 className="text-sm font-medium text-foreground mb-4">
                      Kausien vertailu
                    </h3>
                    <div className="space-y-3">
                      {seasonBests.map((season) => {
                        const bestValue = isLowerBetter
                          ? Math.min(...seasonBests.map(s => s.value))
                          : Math.max(...seasonBests.map(s => s.value));
                        const worstValue = isLowerBetter
                          ? Math.max(...seasonBests.map(s => s.value))
                          : Math.min(...seasonBests.map(s => s.value));
                        const isBest = season.value === bestValue;
                        // Calculate percentage: best = 100%, others proportionally less
                        const range = Math.abs(worstValue - bestValue);
                        const percentage = range === 0
                          ? 100
                          : isLowerBetter
                            ? 100 - ((season.value - bestValue) / range) * 40 // 60-100% range
                            : 100 - ((bestValue - season.value) / range) * 40;

                        return (
                          <div key={season.year} className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-12 shrink-0">
                              {season.year}
                            </span>
                            <div className="flex-1 h-8 bg-elevated rounded overflow-hidden">
                              <div
                                className={`h-full rounded transition-all duration-300 ${
                                  isBest ? "bg-[var(--accent)]" : "bg-[var(--accent)]/40"
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className={`text-sm font-medium tabular-nums w-20 text-right ${
                              isBest ? "text-[var(--accent)]" : "text-foreground"
                            }`}>
                              {selectedDiscipline?.unit === "time"
                                ? formatTime(season.value)
                                : formatDistance(season.value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

      case "goals": {
        // Get discipline info for goals
        const getDisciplineForGoal = (disciplineId: number) => {
          const result = results.find(r => r.disciplineId === disciplineId);
          return result?.discipline;
        };

        return (
          <div>
            {goals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Target size={48} className="text-icon-muted mb-4" />
                <h2 className="text-sm font-medium text-muted-foreground mb-1.5">Ei tavoitteita</h2>
                <p className="text-body text-tertiary">
                  Lisää ensimmäinen tavoite
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {goals.map((goal) => {
                  const discipline = getDisciplineForGoal(goal.disciplineId);
                  const isAchieved = goal.status === "achieved";

                  // Format target value based on discipline unit
                  const formattedTarget = discipline
                    ? discipline.unit === "time"
                      ? formatTime(goal.targetValue)
                      : formatDistance(goal.targetValue)
                    : goal.targetValue.toString();

                  return (
                    <div
                      key={goal.id}
                      className="rounded-xl bg-card border border-border-subtle p-4 flex flex-col"
                    >
                      {/* Top: Icon + discipline */}
                      <div className="flex items-center gap-2 mb-3">
                        {isAchieved ? (
                          <CheckCircle size={18} className="text-muted-foreground shrink-0" />
                        ) : (
                          <Target size={18} className="text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm font-medium text-foreground truncate">
                          {discipline?.fullName || "Tuntematon laji"}
                        </span>
                      </div>

                      {/* Center: Target value (big) */}
                      <div className="flex-1 flex flex-col items-center justify-center py-2">
                        <span className="text-2xl font-bold tabular-nums text-foreground">
                          {formattedTarget}
                        </span>
                        {isAchieved && (
                          <span className="px-1.5 py-0.5 mt-1.5 rounded text-caption font-medium bg-transparent text-[var(--text-muted)] border border-[var(--border-hover)]">
                            Saavutettu
                          </span>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="h-px w-full bg-white/10 my-3" />

                      {/* Bottom: Dates */}
                      <div className="text-sm text-muted-foreground text-center">
                        {goal.targetDate && (
                          <div>DDL: {formatDate(goal.targetDate)}</div>
                        )}
                        {goal.achievedAt && (
                          <div className="text-foreground mt-0.5">
                            {formatDate(goal.achievedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div className="p-6">
      {/* Compact Header */}
      <div className="flex items-center gap-4 mb-6">
        {/* Back button */}
        <button
          onClick={() => navigate("/athletes")}
          className="text-tertiary hover:text-foreground transition-colors duration-150 shrink-0"
          aria-label="Takaisin"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Profile photo */}
        {athlete.photoPath ? (
          <button
            onClick={() => setPhotoViewerOpen(true)}
            className="w-16 h-16 rounded-full overflow-hidden shrink-0 hover:ring-2 hover:ring-[var(--accent)] transition-all duration-150 cursor-pointer"
          >
            <img
              src={toAssetUrl(athlete.photoPath)}
              alt={`${athlete.firstName} ${athlete.lastName}`}
              className="w-full h-full object-cover"
            />
          </button>
        ) : (
          <div className="w-16 h-16 rounded-full bg-elevated flex items-center justify-center text-initials shrink-0">
            <span className="text-xl font-medium">
              {athlete.firstName[0]}
              {athlete.lastName[0]}
            </span>
          </div>
        )}

        {/* Name and details */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-foreground truncate">
            {athlete.firstName} {athlete.lastName}
          </h1>
          <div className="text-default text-muted-foreground mt-0.5">
            {getAgeCategory(athlete.birthYear)}
            {athlete.clubName && ` · ${athlete.clubName}`}
          </div>
          <div className="text-body text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
            <span>{results.length} tulosta</span>
            <span>·</span>
            <span>{personalBests.length} {personalBests.length === 1 ? "ennätys" : "ennätystä"}</span>
            <span>·</span>
            <span>{medals.length} {medals.length === 1 ? "mitali" : "mitalia"}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={`/photos?athlete=${athleteId}`}
            className="text-body text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center gap-0.5 transition-colors duration-150 cursor-pointer"
          >
            Kuvat <ChevronRight size={14} />
          </Link>
          <button
            onClick={() => setEditDialogOpen(true)}
            className="btn-secondary btn-press"
          >
            <Edit size={16} />
            Muokkaa
          </button>
        </div>
      </div>

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
            className="absolute top-4 left-4 p-2 text-white/50 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors z-10 cursor-pointer"
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
              src={toAssetUrl(athlete.photoPath)}
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

    </div>
  );
}
