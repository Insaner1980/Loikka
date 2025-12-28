import { useState, useEffect, useCallback, useRef } from "react";
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

  // Track current athlete ID to prevent stale updates
  const currentAthleteIdRef = useRef(athleteId);

  const fetchAll = useCallback(async () => {
    if (!athleteId) return;

    // Update ref to current athlete
    currentAthleteIdRef.current = athleteId;
    const fetchAthleteId = athleteId;

    setData((prev) => ({ ...prev, loading: true }));

    const [resultsData, pbData, medalsData, goalsData] = await Promise.all([
      getAthleteResults(athleteId),
      getAthletePersonalBests(athleteId),
      getAthleteMedals(athleteId),
      getAthleteGoals(athleteId),
    ]);

    // Only update if this is still the current athlete (prevent stale updates)
    if (currentAthleteIdRef.current === fetchAthleteId) {
      setData({
        results: resultsData,
        personalBests: pbData,
        medals: medalsData,
        goals: goalsData,
        loading: false,
      });
    }
  }, [athleteId, getAthleteResults, getAthletePersonalBests, getAthleteMedals, getAthleteGoals]);

  const refetchResults = useCallback(async () => {
    if (!athleteId) return;

    const fetchAthleteId = athleteId;

    const [resultsData, pbData, medalsData] = await Promise.all([
      getAthleteResults(athleteId),
      getAthletePersonalBests(athleteId),
      getAthleteMedals(athleteId),
    ]);

    // Only update if this is still the current athlete
    if (currentAthleteIdRef.current === fetchAthleteId) {
      setData((prev) => ({
        ...prev,
        results: resultsData,
        personalBests: pbData,
        medals: medalsData,
      }));
    }
  }, [athleteId, getAthleteResults, getAthletePersonalBests, getAthleteMedals]);

  const refetchGoals = useCallback(async () => {
    if (!athleteId) return;

    const fetchAthleteId = athleteId;

    const goalsData = await getAthleteGoals(athleteId);

    // Only update if this is still the current athlete
    if (currentAthleteIdRef.current === fetchAthleteId) {
      setData((prev) => ({ ...prev, goals: goalsData }));
    }
  }, [athleteId, getAthleteGoals]);

  useEffect(() => {
    // Update ref when athleteId changes
    currentAthleteIdRef.current = athleteId;
    fetchAll();
  }, [athleteId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...data,
    refetch: fetchAll,
    refetchResults,
    refetchGoals,
  };
}
