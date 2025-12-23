import type { Result, Medal, Goal, Discipline, Athlete } from "../../../types";

export interface ResultWithDiscipline extends Result {
  discipline: Discipline;
}

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
