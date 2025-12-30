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
      className="p-4 rounded-xl bg-card border border-border-subtle hover:border-border-hover transition-colors duration-150 cursor-pointer flex gap-4 card-interactive"
    >
      {/* Left: Large square photo */}
      {athlete.photoPath ? (
        <img
          src={toAssetUrl(athlete.photoPath)}
          alt={`${athlete.firstName} ${athlete.lastName}`}
          className="w-28 h-28 rounded-lg object-cover flex-shrink-0"
          loading="eager"
        />
      ) : (
        <div className="w-28 h-28 rounded-lg bg-muted flex items-center justify-center text-initials font-medium text-heading flex-shrink-0">
          {getInitials(athlete.firstName, athlete.lastName)}
        </div>
      )}

      {/* Right: Info */}
      <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
        {/* Top: Name, age, club */}
        <div>
          <h3 className="text-title font-semibold text-foreground truncate">
            {athlete.firstName} {athlete.lastName}
          </h3>
          <div className="text-body text-muted-foreground">
            {getAgeCategory(athlete.birthYear)}
          </div>
          {athlete.clubName && (
            <div className="text-body text-muted-foreground truncate">
              {athlete.clubName}
            </div>
          )}
        </div>

        {/* Bottom: Medals, results, records */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* Medals */}
            {hasMedals && (
              <div className="flex items-center gap-2">
                {athleteStats.goldMedals > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-gold" />
                    <span className="text-body font-medium text-foreground">{athleteStats.goldMedals}</span>
                  </span>
                )}
                {athleteStats.silverMedals > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-silver" />
                    <span className="text-body font-medium text-foreground">{athleteStats.silverMedals}</span>
                  </span>
                )}
                {athleteStats.bronzeMedals > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-bronze" />
                    <span className="text-body font-medium text-foreground">{athleteStats.bronzeMedals}</span>
                  </span>
                )}
              </div>
            )}
            {/* Results count */}
            <span className="text-body text-muted-foreground">
              {athleteStats.resultCount} tulosta
            </span>
          </div>

          {/* Record badges */}
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
      </div>
    </Link>
  );
}
