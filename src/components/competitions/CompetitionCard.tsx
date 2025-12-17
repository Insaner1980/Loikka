import { Calendar, MapPin, Users, Timer } from "lucide-react";
import { format, differenceInDays, isBefore, startOfDay } from "date-fns";
import { fi } from "date-fns/locale";
import type { Competition, Athlete, CompetitionParticipant } from "../../types";
import { getDisciplineById } from "../../data/disciplines";

interface CompetitionCardProps {
  competition: Competition;
  participants?: (CompetitionParticipant & { athlete?: Athlete })[];
  onClick?: () => void;
}

function DaysUntilBadge({ date }: { date: string }) {
  const today = startOfDay(new Date());
  const competitionDate = startOfDay(new Date(date));
  const daysUntil = differenceInDays(competitionDate, today);

  if (daysUntil < 0) {
    return (
      <span className="px-2 py-1 rounded-md text-xs font-medium bg-white/5 text-[#666666]">
        Päättynyt
      </span>
    );
  }

  if (daysUntil === 0) {
    return (
      <span className="px-2 py-1 rounded-md text-xs font-medium bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
        Tänään
      </span>
    );
  }

  if (daysUntil === 1) {
    return (
      <span className="px-2 py-1 rounded-md text-xs font-medium bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
        Huomenna
      </span>
    );
  }

  if (daysUntil <= 3) {
    return (
      <span className="px-2 py-1 rounded-md text-xs font-medium bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
        {daysUntil} pv
      </span>
    );
  }

  if (daysUntil <= 7) {
    return (
      <span className="px-2 py-1 rounded-md text-xs font-medium bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/25">
        {daysUntil} pv
      </span>
    );
  }

  if (daysUntil <= 14) {
    return (
      <span className="px-2 py-1 rounded-md text-xs font-medium bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25">
        {daysUntil} pv
      </span>
    );
  }

  return (
    <span className="px-2 py-1 rounded-md text-xs font-medium bg-white/5 text-[#888888]">
      {daysUntil} pv
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

  // Format date with weekday (e.g., "La 15.3.")
  const formattedDate = format(competitionDate, "EEEEEE d.M.", { locale: fi });
  const capitalizedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // If multi-day event, show date range
  const dateDisplay = competition.endDate
    ? `${capitalizedDate} – ${format(new Date(competition.endDate), "EEEEEE d.M.", { locale: fi })}`
    : capitalizedDate;

  // Get unique disciplines planned
  const disciplineIds = new Set<number>();
  for (const participant of participants) {
    if (participant.disciplinesPlanned) {
      for (const id of participant.disciplinesPlanned) {
        disciplineIds.add(id);
      }
    }
  }
  const disciplines = Array.from(disciplineIds)
    .map((id) => getDisciplineById(id))
    .filter(Boolean);

  // Get athlete names
  const athleteNames = participants
    .filter((p) => p.athlete)
    .map((p) => `${p.athlete!.firstName} ${p.athlete!.lastName.charAt(0)}.`);

  return (
    <div
      onClick={onClick}
      className={`rounded-xl bg-[#141414] border border-transparent p-4 transition-colors duration-150 ${
        onClick ? "cursor-pointer hover:border-white/[0.06]" : ""
      } ${isPast ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Calendar size={14} />
            <span>{dateDisplay}</span>
          </div>

          {/* Name */}
          <h3 className="font-semibold text-base truncate">{competition.name}</h3>

          {/* Location */}
          {competition.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <MapPin size={14} />
              <span>
                {competition.location}
                {competition.address && `, ${competition.address}`}
              </span>
            </div>
          )}

          {/* Participants */}
          {athleteNames.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Users size={14} />
              <span className="truncate">{athleteNames.join(", ")}</span>
            </div>
          )}

          {/* Disciplines */}
          {disciplines.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Timer size={14} />
              <span className="truncate">
                {disciplines.map((d) => d!.name).join(", ")}
              </span>
            </div>
          )}

          {/* Notes */}
          {competition.notes && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              {competition.notes}
            </p>
          )}
        </div>

        {/* Days until badge */}
        <DaysUntilBadge date={competition.date} />
      </div>
    </div>
  );
}
