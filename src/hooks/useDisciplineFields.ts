import { useMemo } from "react";
import { getDisciplineById } from "../data/disciplines";
import {
  WIND_AFFECTED_DISCIPLINES,
  EQUIPMENT_WEIGHTS,
  DISCIPLINE_EQUIPMENT_MAP,
} from "../lib/constants";
import type { Discipline } from "../types";

interface UseDisciplineFieldsReturn {
  /** The selected discipline object */
  selectedDiscipline: Discipline | undefined;
  /** Whether wind field should be shown */
  showWindField: boolean;
  /** Whether discipline is hurdles category */
  isHurdleDiscipline: boolean;
  /** Whether discipline is throws category */
  isThrowDiscipline: boolean;
  /** Equipment type for throws (kuula, kiekko, keihäs, moukari) */
  equipmentType: keyof typeof EQUIPMENT_WEIGHTS | null;
  /** Available weights for the equipment type */
  availableWeights: readonly number[];
}

/**
 * Hook for calculating discipline-related field visibility and options.
 * Used by ResultForm and ResultEditDialog.
 */
export function useDisciplineFields(disciplineId: number | "" | null): UseDisciplineFieldsReturn {
  // Get selected discipline
  const selectedDiscipline = useMemo(() => {
    return disciplineId ? getDisciplineById(disciplineId as number) : undefined;
  }, [disciplineId]);

  // Check if discipline requires wind field
  const showWindField = useMemo(() => {
    if (!selectedDiscipline) return false;
    return WIND_AFFECTED_DISCIPLINES.includes(
      selectedDiscipline.name as (typeof WIND_AFFECTED_DISCIPLINES)[number]
    );
  }, [selectedDiscipline]);

  // Check if discipline is hurdles
  const isHurdleDiscipline = useMemo(() => {
    return selectedDiscipline?.category === "hurdles";
  }, [selectedDiscipline]);

  // Check if discipline is throws
  const isThrowDiscipline = useMemo(() => {
    return selectedDiscipline?.category === "throws";
  }, [selectedDiscipline]);

  // Get equipment type for throws
  const equipmentType = useMemo(() => {
    if (!selectedDiscipline || !isThrowDiscipline) return null;
    return (DISCIPLINE_EQUIPMENT_MAP[selectedDiscipline.name] as keyof typeof EQUIPMENT_WEIGHTS) || null;
  }, [selectedDiscipline, isThrowDiscipline]);

  // Get available weights for the equipment type
  const availableWeights = useMemo(() => {
    if (!equipmentType) return [] as readonly number[];
    return EQUIPMENT_WEIGHTS[equipmentType] || ([] as readonly number[]);
  }, [equipmentType]);

  return {
    selectedDiscipline,
    showWindField,
    isHurdleDiscipline,
    isThrowDiscipline,
    equipmentType,
    availableWeights,
  };
}
