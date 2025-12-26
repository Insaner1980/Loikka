import { memo, useCallback } from "react";
import { Trophy, Calendar, MapPin } from "lucide-react";
import type { Athlete, Discipline, ResultStatus } from "../../types";
import {
  formatTime,
  formatDistance,
  formatDate,
  formatWind,
  getStatusLabel,
} from "../../lib/formatters";
import { ResultBadge } from "./ResultBadge";
import { HoverCheckbox } from "../ui";

interface ResultCardProps {
  result: {
    id: number;
    athleteId: number;
    disciplineId: number;
    date: string;
    value: number;
    type: "competition" | "training";
    competitionName?: string;
    location?: string;
    placement?: number;
    notes?: string;
    isPersonalBest: boolean;
    isSeasonBest: boolean;
    isNationalRecord: boolean;
    wind?: number;
    status?: ResultStatus;
    equipmentWeight?: number;
    hurdleHeight?: number;
    hurdleSpacing?: number;
  };
  athlete?: Athlete;
  discipline?: Discipline;
  showAthleteName?: boolean;
  onEdit?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onCheckboxClick?: () => void;
}

const medalColors = {
  1: "bg-gold",
  2: "bg-silver",
  3: "bg-bronze",
};

export const ResultCard = memo(function ResultCard({
  result,
  athlete,
  discipline,
  showAthleteName = true,
  onEdit,
  selectionMode = false,
  isSelected = false,
  onCheckboxClick,
}: ResultCardProps) {
  // Get result year for wind check
  const resultYear = new Date(result.date).getFullYear();

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckboxClick?.();
  }, [onCheckboxClick]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // If Ctrl/Cmd is held, treat as checkbox click
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation();
      onCheckboxClick?.();
      return;
    }
    // In selection mode, clicking card toggles selection
    if (selectionMode) {
      onCheckboxClick?.();
      return;
    }
    // Normal click opens edit dialog
    onEdit?.();
  }, [onEdit, onCheckboxClick, selectionMode]);

  // Format the result value
  const formattedValue = discipline
    ? discipline.unit === "time"
      ? formatTime(result.value)
      : formatDistance(result.value)
    : result.value.toString();

  // Format wind with potential "w" suffix for wind-assisted
  const windDisplay = result.wind !== undefined && result.wind !== null
    ? formatWind(result.wind, athlete?.birthYear, resultYear)
    : null;

  // Format equipment metadata line (wind, equipment weight, hurdle height)
  const getMetadataLine = (): string | null => {
    // Wind for sprints, hurdles, and horizontal jumps
    if (windDisplay) {
      return `${windDisplay} m/s`;
    }
    // Equipment weight for throws
    if (result.equipmentWeight && discipline?.category === "throws") {
      // Keihäs uses grams, others use kg
      if (discipline.name === "Keihäs") {
        return `${result.equipmentWeight} g`;
      }
      return `${result.equipmentWeight} kg`;
    }
    // Hurdle height for hurdles
    if (result.hurdleHeight && discipline?.category === "hurdles") {
      return `${result.hurdleHeight} cm`;
    }
    return null;
  };

  const metadataLine = getMetadataLine();

  // Check if result is not valid (NM, DNS, DNF, DQ) or has zero value
  const isInvalidStatus = (result.status && result.status !== "valid") || result.value === 0;

  const athleteName = athlete?.firstName ?? "Tuntematon";
  const disciplineName = discipline?.fullName ?? "Tuntematon laji";

  // Medal placement (1-3)
  const hasMedal = result.placement && result.placement >= 1 && result.placement <= 3;

  return (
    <div
      data-card
      onClick={handleCardClick}
      className={`group relative rounded-xl bg-card border transition-colors duration-150 ${
        isSelected
          ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
          : "border-border-subtle hover:border-border-hover"
      } ${onEdit || selectionMode ? "cursor-pointer" : ""}`}
    >
      {/* Hover checkbox - only shown when onCheckboxClick is provided */}
      {onCheckboxClick && (
        <div
          className={`absolute top-3 right-3 z-10 transition-all duration-200 ${
            isSelected
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto"
          }`}
        >
          <HoverCheckbox
            isSelected={isSelected}
            onClick={handleCheckboxClick}
            itemType="tulos"
          />
        </div>
      )}

      <div className="p-4 flex flex-col h-full">
        {/* Top row: Athlete name (optional) + discipline + metadata */}
        <div className="mb-3">
          {showAthleteName && (
            <div className="font-medium text-foreground truncate">{athleteName}</div>
          )}
          <div className={`truncate ${showAthleteName ? "text-sm text-muted-foreground" : "text-sm font-medium text-foreground"}`}>
            {disciplineName}
          </div>
          {metadataLine && (
            <div className="text-xs text-muted-foreground truncate">{metadataLine}</div>
          )}
        </div>

        {/* Center: Result value (big) */}
        <div className="flex-1 flex flex-col items-center justify-center py-2">
          {isInvalidStatus ? (
            <span className="px-3 py-1.5 text-sm font-medium rounded-lg bg-muted text-muted-foreground">
              {getStatusLabel(result.status) || "Ei tulosta"}
            </span>
          ) : (
            <>
              <span className="text-2xl font-bold tabular-nums text-foreground">{formattedValue}</span>
              {/* Badges */}
              <div className="flex items-center gap-1.5 mt-1.5">
                {result.isPersonalBest && <ResultBadge type="pb" />}
                {result.isSeasonBest && <ResultBadge type="sb" />}
                {result.isNationalRecord && <ResultBadge type="nr" />}
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-border my-3" />

        {/* Bottom: Date, competition/training, placement, photos */}
        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-foreground">
              <Calendar size={13} className="text-muted-foreground shrink-0" />
              <span>{formatDate(result.date)}</span>
            </div>
            {result.competitionName && (
              <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                <Trophy size={13} className="shrink-0" />
                <span className="truncate">
                  {result.competitionName}
                  {result.location && ` · ${result.location}`}
                </span>
              </div>
            )}
            {result.type === "training" && (
              <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                {result.location ? (
                  <>
                    <MapPin size={13} className="shrink-0" />
                    <span className="truncate">{result.location}</span>
                  </>
                ) : (
                  <span>Harjoitus</span>
                )}
              </div>
            )}
          </div>

          {/* Right: Medal */}
          <div className="flex items-center gap-2 shrink-0">
            {hasMedal && (
              <div
                className={`w-7 h-7 rounded-full ${medalColors[result.placement as 1 | 2 | 3]} flex items-center justify-center shadow-sm`}
              >
                <span className="text-xs font-bold text-black/70">{result.placement}</span>
              </div>
            )}
            {result.placement && result.placement > 3 && (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs font-semibold text-muted-foreground">{result.placement}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
