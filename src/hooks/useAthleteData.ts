import { useState, useEffect, useCallback } from "react";
import { useAthleteStore } from "../stores/useAthleteStore";
import type { Medal, Goal } from "../types";
import type { ResultWithDiscipline } from "../components/athletes/tabs";

interface AthleteData {
  results: ResultWithDiscipline[];
  personalBests: ResultWithDiscipline[];
  medals: Medal[];
  goals: Goal[];
  loading: boolean;
}

interface UseAthleteDataReturn extends AthleteData {
  refetch: () => Promise<void>;
  refetchResults: () => Promise<void>;
  refetchGoals: () => Promise<void>;
}

export function useAthleteData(athleteId: number): UseAthleteDataReturn {
  const {
    getAthleteResults,
    getAthletePersonalBests,
    getAthleteMedals,
    getAthleteGoals,
  } = useAthleteStore();

  const [data, setData] = useState<AthleteData>({
    results: [],
    personalBests: [],
    medals: [],
    goals: [],
    loading: true,
  });

  const fetchAll = useCallback(async () => {
    if (!athleteId) return;

    setData((prev) => ({ ...prev, loading: true }));

    const [resultsData, pbData, medalsData, goalsData] = await Promise.all([
      getAthleteResults(athleteId),
      getAthletePersonalBests(athleteId),
      getAthleteMedals(athleteId),
      getAthleteGoals(athleteId),
    ]);

    setData({
      results: resultsData,
      personalBests: pbData,
      medals: medalsData,
      goals: goalsData,
      loading: false,
    });
  }, [athleteId, getAthleteResults, getAthletePersonalBests, getAthleteMedals, getAthleteGoals]);

  const refetchResults = useCallback(async () => {
    if (!athleteId) return;

    const [resultsData, pbData, medalsData] = await Promise.all([
      getAthleteResults(athleteId),
      getAthletePersonalBests(athleteId),
      getAthleteMedals(athleteId),
    ]);

    setData((prev) => ({
      ...prev,
      results: resultsData,
      personalBests: pbData,
      medals: medalsData,
    }));
  }, [athleteId, getAthleteResults, getAthletePersonalBests, getAthleteMedals]);

  const refetchGoals = useCallback(async () => {
    if (!athleteId) return;

    const goalsData = await getAthleteGoals(athleteId);
    setData((prev) => ({ ...prev, goals: goalsData }));
  }, [athleteId, getAthleteGoals]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    ...data,
    refetch: fetchAll,
    refetchResults,
    refetchGoals,
  };
}
