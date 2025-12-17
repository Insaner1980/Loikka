import { Link } from "react-router-dom";
import type { Athlete } from "../../types";
import { toAssetUrl } from "../../lib/formatters";

interface AthleteStats {
  disciplineCount: number;
  resultCount: number;
  pbCount: number;
  goldMedals: number;
  silverMedals: number;
  bronzeMedals: number;
}

interface AthleteCardProps {
  athlete: Athlete;
  stats?: AthleteStats;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function AthleteCard({ athlete, stats }: AthleteCardProps) {
  const defaultStats: AthleteStats = {
    disciplineCount: 0,
    resultCount: 0,
    pbCount: 0,
    goldMedals: 0,
    silverMedals: 0,
    bronzeMedals: 0,
  };

  const athleteStats = stats || defaultStats;
  const hasMedals =
    athleteStats.goldMedals > 0 ||
    athleteStats.silverMedals > 0 ||
    athleteStats.bronzeMedals > 0;

  return (
    <Link
      to={`/athletes/${athlete.id}`}
      className="block p-4 rounded-xl bg-[#141414] border border-transparent hover:border-white/[0.06] transition-colors duration-150"
    >
      {/* Profile section */}
      <div className="flex items-center gap-3 mb-4">
        {athlete.photoPath ? (
          <img
            src={toAssetUrl(athlete.photoPath)}
            alt={`${athlete.firstName} ${athlete.lastName}`}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#191919] flex items-center justify-center text-[#666666] font-medium text-sm">
            {getInitials(athlete.firstName, athlete.lastName)}
          </div>
        )}
        <div>
          <div className="font-medium text-sm text-foreground">
            {athlete.firstName} {athlete.lastName}
          </div>
          <div className="text-[13px] text-[#666666]">
            {athlete.birthYear}
            {athlete.clubName && ` · ${athlete.clubName}`}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-sm pt-4">
        <div>
          <div className="font-medium text-foreground">{athleteStats.disciplineCount}</div>
          <div className="text-[#555555] text-[11px]">Lajeja</div>
        </div>
        <div>
          <div className="font-medium text-foreground">{athleteStats.resultCount}</div>
          <div className="text-[#555555] text-[11px]">Tuloksia</div>
        </div>
        <div>
          <div className="font-medium text-foreground">{athleteStats.pbCount}</div>
          <div className="text-[#555555] text-[11px]">Ennätyksiä</div>
        </div>
      </div>

      {/* Medals */}
      {hasMedals && (
        <div className="flex justify-center gap-4 text-sm mt-4 pt-4">
          {athleteStats.goldMedals > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gold" />
              <span className="text-[#666666] text-[13px]">{athleteStats.goldMedals}</span>
            </span>
          )}
          {athleteStats.silverMedals > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-silver" />
              <span className="text-[#666666] text-[13px]">{athleteStats.silverMedals}</span>
            </span>
          )}
          {athleteStats.bronzeMedals > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-bronze" />
              <span className="text-[#666666] text-[13px]">{athleteStats.bronzeMedals}</span>
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
