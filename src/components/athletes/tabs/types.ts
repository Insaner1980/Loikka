import type { Medal, Goal, Athlete, ResultWithDiscipline } from "../../../types";

// Re-export for backwards compatibility
export type { ResultWithDiscipline };

export interface TabProps {
  athlete: Athlete;
  results: ResultWithDiscipline[];
  personalBests: ResultWithDiscipline[];
  medals: Medal[];
  goals: Goal[];
  onEditResult: (result: ResultWithDiscipline) => void;
  onDeleteResult: (result: ResultWithDiscipline) => void;
  onDisciplineFilterChange?: (disciplineId: number | null) => void;
}

export const medalClasses: Record<"gold" | "silver" | "bronze", string> = {
  gold: "bg-gold",
  silver: "bg-silver",
  bronze: "bg-bronze",
};
