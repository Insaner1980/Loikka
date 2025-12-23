import { useEffect } from "react";
import { Trophy, Calendar, ImageIcon, Pencil, Trash2, MapPin } from "lucide-react";
import type { Athlete, Discipline, ResultStatus } from "../../types";
import {
  formatTime,
  formatDistance,
  formatDate,
  formatWind,
  getStatusLabel,
} from "../../lib/formatters";
import { ResultBadge } from "./ResultBadge";
import { usePhotoCount } from "../../hooks";

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
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const medalColors = {
  1: "bg-gold",
  2: "bg-silver",
  3: "bg-bronze",
};

export function ResultCard({ result, athlete, discipline, onClick, onEdit, onDelete }: ResultCardProps) {
  const { count: photoCount, fetchCount } = usePhotoCount("results", result.id);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Get result year for wind check
  const resultYear = new Date(result.date).getFullYear();

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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  // Medal placement (1-3)
  const hasMedal = result.placement && result.placement >= 1 && result.placement <= 3;

  return (
    <div
      onClick={onClick}
      className={`group rounded-xl bg-card border border-border-subtle hover:border-border-hover transition-colors duration-150 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="p-4 flex flex-col h-full">
        {/* Top row: Athlete name + discipline + metadata */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="font-medium text-foreground truncate">{athleteName}</div>
            <div className="text-sm text-muted-foreground truncate">{disciplineName}</div>
            {metadataLine && (
              <div className="text-xs text-muted-foreground truncate">{metadataLine}</div>
            )}
          </div>
          {/* Action icons */}
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1 shrink-0">
              {onDelete && (
                <button
                  onClick={handleDeleteClick}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={handleEditClick}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
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

          {/* Right: Medal + photos */}
          <div className="flex items-center gap-2 shrink-0">
            {photoCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground" title={`${photoCount} kuvaa`}>
                <ImageIcon size={13} />
                <span className="text-xs">{photoCount}</span>
              </div>
            )}
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
}
