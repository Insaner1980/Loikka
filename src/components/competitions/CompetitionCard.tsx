import { memo, useCallback } from "react";
import { Calendar, MapPin, Users } from "lucide-react";
import { format, differenceInDays, isBefore, startOfDay } from "date-fns";
import { fi } from "date-fns/locale";
import type { Competition, Athlete, CompetitionParticipant, CompetitionLevel } from "../../types";
import { HoverCheckbox } from "../ui";

// Competition level labels and highlight status
const levelConfig: Record<CompetitionLevel, { label: string; highlighted: boolean }> = {
  seurakisat: { label: "Seurakisat", highlighted: false },
  koululaiskisat: { label: "Koululaiskisat", highlighted: false },
  seuran_sisaiset: { label: "Seuran sisäiset", highlighted: false },
  seuraottelut: { label: "Seuraottelut", highlighted: false },
  piirikisat: { label: "Piirikisat", highlighted: false },
  pm: { label: "PM", highlighted: true },
  hallikisat: { label: "Hallikisat", highlighted: false },
  aluekisat: { label: "Aluekisat", highlighted: false },
  pohjola_seuracup: { label: "Pohjola Seuracup", highlighted: true },
  sm: { label: "SM", highlighted: true },
  muu: { label: "Muu", highlighted: false },
};

interface CompetitionCardProps {
  competition: Competition;
  participants?: (CompetitionParticipant & { athlete?: Athlete })[];
  onClick?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onCheckboxClick?: () => void;
}

function DaysUntilBadge({ date }: { date: string }) {
  const today = startOfDay(new Date());
  const competitionDate = startOfDay(new Date(date));
  const daysUntil = differenceInDays(competitionDate, today);

  if (daysUntil < 0) {
    return <span className="badge-status">Päättynyt</span>;
  }

  if (daysUntil === 0) {
    return <span className="badge-status">Tänään</span>;
  }

  if (daysUntil === 1) {
    return <span className="badge-status">Huomenna</span>;
  }

  return <span className="badge-status">{daysUntil} pv</span>;
}

function LevelBadge({ level, customLevelName }: { level: CompetitionLevel; customLevelName?: string }) {
  const config = levelConfig[level];
  // Show custom level name if level is "muu" and customLevelName exists
  const displayLabel = level === "muu" && customLevelName ? customLevelName : config.label;

  return (
    <span className="badge-status">
      {displayLabel}
    </span>
  );
}

export const CompetitionCard = memo(function CompetitionCard({
  competition,
  participants = [],
  onClick,
  selectionMode = false,
  isSelected = false,
  onCheckboxClick,
}: CompetitionCardProps) {
  const competitionDate = new Date(competition.date);
  const today = startOfDay(new Date());
  const isPast = isBefore(startOfDay(competitionDate), today);

  // Format date with weekday (e.g., "La 15.3.2025")
  const formattedDate = format(competitionDate, "EEEEEE d.M.yyyy", { locale: fi });
  const capitalizedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // If multi-day event, show date range
  const dateDisplay = competition.endDate
    ? `${capitalizedDate} – ${format(new Date(competition.endDate), "EEEEEE d.M.yyyy", { locale: fi })}`
    : capitalizedDate;

  // Get athlete names (first name only)
  const athleteNames = participants
    .filter((p) => p.athlete)
    .map((p) => p.athlete!.firstName);

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
    onClick?.();
  }, [onClick, onCheckboxClick, selectionMode]);

  return (
    <div
      data-card
      onClick={handleCardClick}
      className={`group relative rounded-xl bg-card border p-4 transition-colors duration-150 flex flex-col ${
        isSelected
          ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
          : "border-border-subtle hover:border-border-hover"
      } ${onClick || selectionMode ? "cursor-pointer" : ""} ${isPast ? "opacity-60" : ""}`}
    >
      {/* Top right: Checkbox + days badge */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
        {/* Hover checkbox - only shown when onCheckboxClick is provided */}
        {onCheckboxClick && (
          <div
            className={`transition-all duration-200 ${
              isSelected
                ? "opacity-100 scale-100"
                : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto"
            }`}
          >
            <HoverCheckbox
              isSelected={isSelected}
              onClick={handleCheckboxClick}
              itemType="kilpailu"
            />
          </div>
        )}
        {/* Days until badge */}
        <DaysUntilBadge date={competition.date} />
      </div>

      {/* Top: Name and level */}
      <div className="flex items-center gap-2 mb-2 pr-16">
        <h3 className="font-semibold text-foreground truncate">{competition.name}</h3>
        {competition.level && <LevelBadge level={competition.level} customLevelName={competition.customLevelName} />}
      </div>

      {/* Date */}
      <div className="flex items-center gap-1.5 text-body text-muted-foreground mb-3">
        <Calendar size={13} className="shrink-0" />
        <span>{dateDisplay}</span>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-border my-2" />

      {/* Bottom info */}
      <div className="space-y-1.5 text-body text-muted-foreground">
        {/* Location */}
        {competition.location && (
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="shrink-0" />
            <span className="truncate">
              {competition.location}
              {competition.address && `, ${competition.address}`}
            </span>
          </div>
        )}

        {/* Participants */}
        {athleteNames.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Users size={13} className="shrink-0" />
            <span className="truncate">{athleteNames.join(", ")}</span>
          </div>
        )}

        {/* Notes */}
        {competition.notes && (
          <p className="italic truncate">{competition.notes}</p>
        )}
      </div>
    </div>
  );
});
