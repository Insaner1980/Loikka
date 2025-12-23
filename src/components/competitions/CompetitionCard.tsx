import { Calendar, MapPin, Users } from "lucide-react";
import { format, differenceInDays, isBefore, startOfDay } from "date-fns";
import { fi } from "date-fns/locale";
import type { Competition, Athlete, CompetitionParticipant, CompetitionLevel } from "../../types";

// Competition level labels and highlight status
const levelConfig: Record<CompetitionLevel, { label: string; highlighted: boolean }> = {
  seura: { label: "Seura", highlighted: false },
  seuraottelu: { label: "Seuraottelu", highlighted: false },
  piiri: { label: "Piiri", highlighted: false },
  pm: { label: "PM", highlighted: true },
  alue: { label: "Alue", highlighted: false },
  sm: { label: "SM", highlighted: true },
  kll: { label: "KLL", highlighted: true },
  muu: { label: "Muu", highlighted: false },
};

interface CompetitionCardProps {
  competition: Competition;
  participants?: (CompetitionParticipant & { athlete?: Athlete })[];
  onClick?: () => void;
}

function DaysUntilBadge({ date }: { date: string }) {
  const today = startOfDay(new Date());
  const competitionDate = startOfDay(new Date(date));
  const daysUntil = differenceInDays(competitionDate, today);

  // All badges use the same gray style
  const baseStyle = "px-1.5 py-0.5 rounded text-caption font-medium bg-transparent text-[var(--text-muted)] border border-[var(--border-hover)]";

  if (daysUntil < 0) {
    return <span className={baseStyle}>Päättynyt</span>;
  }

  if (daysUntil === 0) {
    return <span className={baseStyle}>Tänään</span>;
  }

  if (daysUntil === 1) {
    return <span className={baseStyle}>Huomenna</span>;
  }

  return <span className={baseStyle}>{daysUntil} pv</span>;
}

function LevelBadge({ level }: { level: CompetitionLevel }) {
  const config = levelConfig[level];

  // All badges use the same style as OE/KE/SE (badge-pb style)
  return (
    <span className="px-1.5 py-0.5 font-medium rounded text-caption bg-transparent text-[var(--text-muted)] border border-[var(--border-hover)]">
      {config.label}
    </span>
  );
}

export function CompetitionCard({
  competition,
  participants = [],
  onClick,
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

  return (
    <div
      onClick={onClick}
      className={`rounded-xl bg-card border border-border-subtle p-4 transition-colors duration-150 flex flex-col ${
        onClick ? "cursor-pointer hover:border-border-hover" : ""
      } ${isPast ? "opacity-60" : ""}`}
    >
      {/* Top: Date + days badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar size={13} className="shrink-0" />
          <span>{dateDisplay}</span>
        </div>
        <DaysUntilBadge date={competition.date} />
      </div>

      {/* Name and level */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-foreground truncate">{competition.name}</h3>
        {competition.level && <LevelBadge level={competition.level} />}
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-border my-2" />

      {/* Bottom info */}
      <div className="space-y-1.5 text-sm text-muted-foreground">
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
}
