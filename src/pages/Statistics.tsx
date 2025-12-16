import { useState, useEffect, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { useResultStore } from "../stores/useResultStore";
import { useAthleteStore } from "../stores/useAthleteStore";
import { getDisciplineById } from "../data/disciplines";
import { ProgressChart } from "../components/statistics/ProgressChart";
import { SeasonStats } from "../components/statistics/SeasonStats";
import { ComparisonChart } from "../components/statistics/ComparisonChart";

export function Statistics() {
  const {
    fetchResults,
    getResultsForChart,
    getSeasonStats,
    getSeasonComparison,
    results,
  } = useResultStore();
  const { athletes, fetchAthletes } = useAthleteStore();

  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(
    null
  );
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<
    number | null
  >(null);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );

  useEffect(() => {
    fetchResults();
    fetchAthletes();
  }, [fetchResults, fetchAthletes]);

  // Auto-select first athlete if none selected
  useEffect(() => {
    if (athletes.length > 0 && selectedAthleteId === null) {
      setSelectedAthleteId(athletes[0].athlete.id);
    }
  }, [athletes, selectedAthleteId]);

  // Get available disciplines for the selected athlete
  const availableDisciplines = useMemo(() => {
    if (selectedAthleteId === null) return [];

    const athleteResults = results.filter(
      (r) => r.athleteId === selectedAthleteId
    );
    const disciplineIds = [...new Set(athleteResults.map((r) => r.disciplineId))];

    return disciplineIds
      .map((id) => getDisciplineById(id))
      .filter((d) => d !== undefined);
  }, [selectedAthleteId, results]);

  // Auto-select first discipline if available
  useEffect(() => {
    if (availableDisciplines.length > 0 && selectedDisciplineId === null) {
      setSelectedDisciplineId(availableDisciplines[0]!.id);
    } else if (
      availableDisciplines.length > 0 &&
      selectedDisciplineId !== null &&
      !availableDisciplines.find((d) => d!.id === selectedDisciplineId)
    ) {
      setSelectedDisciplineId(availableDisciplines[0]!.id);
    }
  }, [availableDisciplines, selectedDisciplineId]);

  // Get available years for the selected athlete and discipline
  const availableYears = useMemo(() => {
    if (selectedAthleteId === null || selectedDisciplineId === null) return [];

    const relevantResults = results.filter(
      (r) =>
        r.athleteId === selectedAthleteId &&
        r.disciplineId === selectedDisciplineId
    );

    const years = [
      ...new Set(relevantResults.map((r) => new Date(r.date).getFullYear())),
    ].sort((a, b) => b - a);

    return years;
  }, [selectedAthleteId, selectedDisciplineId, results]);

  // Auto-select most recent year
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Get data for charts
  const chartData = useMemo(() => {
    if (selectedAthleteId === null || selectedDisciplineId === null) return [];
    return getResultsForChart(selectedAthleteId, selectedDisciplineId);
  }, [selectedAthleteId, selectedDisciplineId, getResultsForChart]);

  const seasonStats = useMemo(() => {
    if (selectedAthleteId === null || selectedDisciplineId === null) {
      return {
        bestResult: null,
        averageResult: null,
        competitionCount: 0,
        improvementPercent: null,
      };
    }
    return getSeasonStats(selectedAthleteId, selectedDisciplineId, selectedYear);
  }, [selectedAthleteId, selectedDisciplineId, selectedYear, getSeasonStats]);

  const comparisonData = useMemo(() => {
    if (selectedAthleteId === null || selectedDisciplineId === null) return [];
    return getSeasonComparison(selectedAthleteId, selectedDisciplineId);
  }, [selectedAthleteId, selectedDisciplineId, getSeasonComparison]);

  const selectedDiscipline = selectedDisciplineId
    ? getDisciplineById(selectedDisciplineId)
    : undefined;

  const hasData =
    selectedAthleteId !== null &&
    selectedDisciplineId !== null &&
    chartData.length > 0;

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tilastot</h1>
        <p className="text-muted-foreground">Tilastot ja analyysit</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Athlete selector */}
        <select
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={selectedAthleteId ?? ""}
          onChange={(e) =>
            setSelectedAthleteId(
              e.target.value ? Number(e.target.value) : null
            )
          }
        >
          <option value="">Valitse urheilija</option>
          {athletes.map(({ athlete }) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.firstName} {athlete.lastName}
            </option>
          ))}
        </select>

        {/* Discipline selector */}
        <select
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={selectedDisciplineId ?? ""}
          onChange={(e) =>
            setSelectedDisciplineId(
              e.target.value ? Number(e.target.value) : null
            )
          }
          disabled={availableDisciplines.length === 0}
        >
          <option value="">Valitse laji</option>
          {availableDisciplines.length > 0 ? (
            availableDisciplines.map(
              (discipline) =>
                discipline && (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.fullName}
                  </option>
                )
            )
          ) : (
            <option disabled>Ei tuloksia</option>
          )}
        </select>

        {/* Year selector */}
        <select
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          disabled={availableYears.length === 0}
        >
          {availableYears.length > 0 ? (
            availableYears.map((year) => (
              <option key={year} value={year}>
                Kausi {year}
              </option>
            ))
          ) : (
            <option>{new Date().getFullYear()}</option>
          )}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <BarChart3 size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">Ei tilastoja näytettäväksi</p>
            <p className="text-sm">
              {athletes.length === 0
                ? "Lisää urheilija aloittaaksesi"
                : selectedAthleteId === null
                  ? "Valitse urheilija nähdäksesi tilastot"
                  : availableDisciplines.length === 0
                    ? "Ei tuloksia tälle urheilijalle"
                    : "Valitse laji nähdäksesi tilastot"}
            </p>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {/* Progress Chart */}
            {selectedDiscipline && (
              <ProgressChart data={chartData} discipline={selectedDiscipline} />
            )}

            {/* Season Stats */}
            {selectedDiscipline && (
              <SeasonStats
                stats={seasonStats}
                discipline={selectedDiscipline}
                year={selectedYear}
              />
            )}

            {/* Comparison Chart */}
            {selectedDiscipline && comparisonData.length > 1 && (
              <ComparisonChart
                data={comparisonData}
                discipline={selectedDiscipline}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
