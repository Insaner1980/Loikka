import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Trophy, Calendar, MapPin, ImageIcon } from "lucide-react";
import type { Athlete, Discipline } from "../../types";
import { formatTime, formatDistance, formatDate } from "../../lib/formatters";
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
  };
  athlete?: Athlete;
  discipline?: Discipline;
}

function PlacementBadge({ placement }: { placement: number }) {
  const colors = {
    1: "bg-gold text-black",
    2: "bg-silver text-black",
    3: "bg-bronze text-white",
  };

  const label = {
    1: "1.",
    2: "2.",
    3: "3.",
  };

  if (placement > 3) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
        {placement}.
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${colors[placement as 1 | 2 | 3]}`}
    >
      {label[placement as 1 | 2 | 3]}
    </span>
  );
}

export function ResultCard({ result, athlete, discipline }: ResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { count: photoCount, fetchCount } = usePhotoCount("results", result.id);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  const formattedValue = discipline
    ? discipline.unit === "time"
      ? formatTime(result.value)
      : formatDistance(result.value)
    : result.value.toString();

  const athleteName = athlete
    ? `${athlete.firstName} ${athlete.lastName}`
    : "Tuntematon urheilija";

  const disciplineName = discipline?.fullName ?? "Tuntematon laji";

  const hasDetails = result.notes || result.location;

  return (
    <div
      className={`bg-card rounded-lg border border-border transition-all ${
        hasDetails ? "cursor-pointer hover:border-primary/50" : ""
      }`}
      onClick={() => hasDetails && setIsExpanded(!isExpanded)}
    >
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Left: Athlete name and discipline */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{athleteName}</span>
              {result.placement && <PlacementBadge placement={result.placement} />}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {disciplineName}
            </div>
          </div>

          {/* Center: Result value */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tabular-nums">{formattedValue}</span>
            <div className="flex flex-col gap-1">
              {result.isPersonalBest && <ResultBadge type="pb" />}
              {result.isSeasonBest && !result.isPersonalBest && (
                <ResultBadge type="sb" />
              )}
            </div>
            {photoCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground" title={`${photoCount} kuvaa`}>
                <ImageIcon size={14} />
                <span className="text-xs">{photoCount}</span>
              </div>
            )}
          </div>

          {/* Right: Date and competition info */}
          <div className="text-right min-w-[120px]">
            <div className="flex items-center justify-end gap-1 text-sm">
              <Calendar size={14} className="text-muted-foreground" />
              <span>{formatDate(result.date)}</span>
            </div>
            {result.competitionName && (
              <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground mt-1">
                <Trophy size={14} />
                <span className="truncate max-w-[140px]">{result.competitionName}</span>
              </div>
            )}
            {result.type === "training" && (
              <div className="text-sm text-muted-foreground mt-1">Harjoitus</div>
            )}
          </div>

          {/* Expand indicator */}
          {hasDetails && (
            <div className="text-muted-foreground">
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="px-4 pb-4 pt-0 border-t border-border mt-0">
          <div className="pt-4 space-y-2 text-sm">
            {result.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin size={14} />
                <span>{result.location}</span>
              </div>
            )}
            {result.notes && (
              <div className="text-muted-foreground">
                <span className="font-medium">Muistiinpanot: </span>
                {result.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
