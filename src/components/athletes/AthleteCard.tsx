import { Link } from "react-router-dom";
import type { Athlete, AthleteStats } from "../../types";
import { toAssetUrl, getAgeCategory, getInitials } from "../../lib/formatters";

interface AthleteCardProps {
  athlete: Athlete;
  stats?: AthleteStats;
}

export function AthleteCard({ athlete, stats }: AthleteCardProps) {
  const defaultStats: AthleteStats = {
    disciplineCount: 0,
    resultCount: 0,
    pbCount: 0,
    sbCount: 0,
    nrCount: 0,
    goldMedals: 0,
    silverMedals: 0,
    bronzeMedals: 0,
  };

  const athleteStats = stats || defaultStats;
  const hasMedals =
    athleteStats.goldMedals > 0 ||
    athleteStats.silverMedals > 0 ||
    athleteStats.bronzeMedals > 0;

  const hasRecords =
    athleteStats.pbCount > 0 ||
    athleteStats.sbCount > 0 ||
    athleteStats.nrCount > 0;

  return (
    <Link
      to={`/athletes/${athlete.id}`}
      className="p-5 rounded-xl bg-card border border-border-subtle hover:border-border-hover transition-colors duration-150 cursor-pointer flex flex-col"
    >
      {/* Top row: Avatar + Medals */}
      <div className="flex items-center justify-between mb-4">
        {/* Avatar */}
        {athlete.photoPath ? (
          <img
            src={toAssetUrl(athlete.photoPath)}
            alt={`${athlete.firstName} ${athlete.lastName}`}
            className="w-20 h-20 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-initials font-medium text-2xl flex-shrink-0">
            {getInitials(athlete.firstName, athlete.lastName)}
          </div>
        )}

        {/* Medals */}
        {hasMedals && (
          <div className="flex items-center gap-2.5">
            {athleteStats.goldMedals > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-gold" />
                <span className="text-default font-medium text-foreground">{athleteStats.goldMedals}</span>
              </span>
            )}
            {athleteStats.silverMedals > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-silver" />
                <span className="text-default font-medium text-foreground">{athleteStats.silverMedals}</span>
              </span>
            )}
            {athleteStats.bronzeMedals > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-bronze" />
                <span className="text-default font-medium text-foreground">{athleteStats.bronzeMedals}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Middle: Name, age class, club */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground truncate">
          {athlete.firstName} {athlete.lastName}
        </h3>
        <div className="text-body text-muted-foreground mt-0.5">
          {getAgeCategory(athlete.birthYear)}
        </div>
        {athlete.clubName && (
          <div className="text-body text-muted-foreground truncate">
            {athlete.clubName}
          </div>
        )}
      </div>

      {/* Bottom row: Results count + record badges */}
      <div className="flex items-center justify-between">
        <span className="text-body text-muted-foreground">
          {athleteStats.resultCount} tulosta
        </span>
        {hasRecords && (
          <div className="flex items-center gap-1.5">
            {athleteStats.pbCount > 0 && (
              <span className="badge-pb">{athleteStats.pbCount} OE</span>
            )}
            {athleteStats.sbCount > 0 && (
              <span className="badge-sb">{athleteStats.sbCount} KE</span>
            )}
            {athleteStats.nrCount > 0 && (
              <span className="badge-nr">{athleteStats.nrCount} SE</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
