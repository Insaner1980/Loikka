import { useState, useEffect, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { useResultStore } from "../stores/useResultStore";
import { useAthleteStore } from "../stores/useAthleteStore";
import { getDisciplineById } from "../data/disciplines";
import { ProgressChart } from "../components/statistics/ProgressChart";
import { SeasonStats } from "../components/statistics/SeasonStats";
import { ComparisonChart } from "../components/statistics/ComparisonChart";
import { DisciplineFilterSelect, FilterSelect, type FilterOption } from "../components/ui";

export function Statistics() {
  const {
    getResultsForChart,
    getSeasonStats,
    getSeasonComparison,
    results,
  } = useResultStore();
  const { athletes } = useAthleteStore();

  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(
    null
  );
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<
    number | null
  >(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Data is fetched in Layout.tsx on app start

  // Auto-select first athlete if none selected
  useEffect(() => {
    if (athletes.length > 0 && selectedAthleteId === null) {
      setSelectedAthleteId(athletes[0].athlete.id);
    }
  }, [athletes, selectedAthleteId]);

  // Get available disciplines for the selected athlete (only valid results)
  // Note: undefined/null status is treated as valid for backwards compatibility
  const availableDisciplines = useMemo(() => {
    if (selectedAthleteId === null) return [];

    const athleteResults = results.filter(
      (r) =>
        r.athleteId === selectedAthleteId &&
        (r.status === "valid" || r.status === undefined || r.status === null)
    );
    const disciplineIds = [...new Set(athleteResults.map((r) => r.disciplineId))];

    return disciplineIds
      .map((id) => getDisciplineById(id))
      .filter((d) => d !== undefined)
      .sort((a, b) => a!.id - b!.id);
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

  // Get years that have results for the selected athlete and discipline
  const yearsWithResults = useMemo(() => {
    if (selectedAthleteId === null) return [];

    // Filter results by athlete and optionally discipline
    let filteredResults = results.filter(
      (r) =>
        r.athleteId === selectedAthleteId &&
        (r.status === "valid" || r.status === undefined || r.status === null)
    );

    if (selectedDisciplineId !== null) {
      filteredResults = filteredResults.filter(
        (r) => r.disciplineId === selectedDisciplineId
      );
    }

    const years = new Set(filteredResults.map((r) => new Date(r.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a); // Descending order
  }, [results, selectedAthleteId, selectedDisciplineId]);

  // Auto-select first year when available years change
  useEffect(() => {
    if (yearsWithResults.length > 0) {
      if (selectedYear === null || !yearsWithResults.includes(selectedYear)) {
        setSelectedYear(yearsWithResults[0]); // Select most recent year
      }
    }
  }, [yearsWithResults, selectedYear]);

  // Filter options for FilterSelect components
  const athleteOptions: FilterOption[] = useMemo(() => [
    { value: "", label: "Valitse urheilija" },
    ...athletes.map(({ athlete }) => ({
      value: athlete.id,
      label: `${athlete.firstName} ${athlete.lastName}`,
    })),
  ], [athletes]);

  const yearFilterOptions: FilterOption[] = useMemo(() =>
    yearsWithResults.map((y) => ({ value: y, label: `Kausi ${y}` })),
  [yearsWithResults]);

  // Get data for charts
  // Note: Store functions are NOT in dependencies - they change every render
  const chartData = useMemo(() => {
    if (selectedAthleteId === null || selectedDisciplineId === null) return [];
    return getResultsForChart(selectedAthleteId, selectedDisciplineId);
  }, [selectedAthleteId, selectedDisciplineId, results]); // eslint-disable-line react-hooks/exhaustive-deps

  const seasonStats = useMemo(() => {
    if (selectedAthleteId === null || selectedDisciplineId === null || selectedYear === null) {
      return {
        bestResult: null,
        averageResult: null,
        competitionCount: 0,
        improvementPercent: null,
      };
    }
    return getSeasonStats(selectedAthleteId, selectedDisciplineId, selectedYear);
  }, [selectedAthleteId, selectedDisciplineId, selectedYear, results]); // eslint-disable-line react-hooks/exhaustive-deps

  const comparisonData = useMemo(() => {
    if (selectedAthleteId === null || selectedDisciplineId === null) return [];
    return getSeasonComparison(selectedAthleteId, selectedDisciplineId);
  }, [selectedAthleteId, selectedDisciplineId, results]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedDiscipline = selectedDisciplineId
    ? getDisciplineById(selectedDisciplineId)
    : undefined;

  const hasData =
    selectedAthleteId !== null &&
    selectedDisciplineId !== null &&
    chartData.length > 0;

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 pb-5 border-b border-border-subtle">
        <h1 className="text-title font-medium text-foreground">Tilastot</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Athlete selector */}
        <FilterSelect
          value={selectedAthleteId ?? ""}
          onChange={(value) =>
            setSelectedAthleteId(value === "" ? null : (value as number))
          }
          options={athleteOptions}
        />

        {/* Discipline selector */}
        <DisciplineFilterSelect
          value={selectedDisciplineId}
          onChange={setSelectedDisciplineId}
          disciplines={availableDisciplines.filter((d) => d !== undefined)}
          placeholder="Valitse laji"
          showPlaceholderOption={false}
          minWidth={120}
        />

        {/* Year selector - only show if there are years with results */}
        {yearFilterOptions.length > 0 && (
          <FilterSelect
            value={selectedYear ?? ""}
            onChange={(value) => setSelectedYear(value as number)}
            options={yearFilterOptions}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <BarChart3 size={48} className="mb-4 opacity-50" />
            <p className="text-title font-medium">Ei tilastoja näytettäväksi</p>
            <p className="text-body">
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
          <div className="space-y-6">
            {/* Progress Chart */}
            {selectedDiscipline && (
              <ProgressChart data={chartData} discipline={selectedDiscipline} />
            )}

            {/* Season Stats */}
            {selectedDiscipline && selectedYear !== null && (
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
