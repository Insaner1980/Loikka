import { Link } from "react-router-dom";
import type { Athlete } from "../../types";
import { toAssetUrl, getAgeCategory, getInitials } from "../../lib/formatters";

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
      className="flex items-center gap-5 p-4 rounded-xl bg-card border border-border-subtle hover:border-border-hover transition-colors duration-150 cursor-pointer"
    >
      {/* Square profile photo */}
      {athlete.photoPath ? (
        <img
          src={toAssetUrl(athlete.photoPath)}
          alt={`${athlete.firstName} ${athlete.lastName}`}
          className="w-56 h-56 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-56 h-56 rounded-lg bg-muted flex items-center justify-center text-initials font-semibold text-6xl flex-shrink-0">
          {getInitials(athlete.firstName, athlete.lastName)}
        </div>
      )}

      {/* Info section */}
      <div className="flex-1 min-w-0 h-56 flex flex-col">
        {/* Header row: Name and medals */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-heading font-semibold text-foreground truncate">
              {athlete.firstName} {athlete.lastName}
            </h3>
            {athlete.clubName && (
              <div className="text-base text-muted-foreground mt-1">
                {athlete.clubName}
              </div>
            )}
            <span className="text-sm font-medium text-accent mt-1 inline-block">
              {getAgeCategory(athlete.birthYear)}
            </span>
          </div>

          {/* Medals in top right */}
          {hasMedals && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {athleteStats.goldMedals > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-gold" />
                  <span className="text-lg font-medium text-foreground">{athleteStats.goldMedals}</span>
                </span>
              )}
              {athleteStats.silverMedals > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-silver" />
                  <span className="text-lg font-medium text-foreground">{athleteStats.silverMedals}</span>
                </span>
              )}
              {athleteStats.bronzeMedals > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-bronze" />
                  <span className="text-lg font-medium text-foreground">{athleteStats.bronzeMedals}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats row - spread across bottom */}
        {(() => {
          const medalCount = athleteStats.goldMedals + athleteStats.silverMedals + athleteStats.bronzeMedals;
          return (
            <div className="flex items-end justify-between pt-4 border-t border-border-subtle">
              <div className="text-center flex-1">
                <div className="text-hero-stat font-medium text-foreground">{medalCount}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {medalCount === 1 ? "Mitali" : "Mitalia"}
                </div>
              </div>
              <div className="text-center flex-1">
                <div className="text-hero-stat font-medium text-foreground">{athleteStats.resultCount}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {athleteStats.resultCount === 1 ? "Tulos" : "Tulosta"}
                </div>
              </div>
              <div className="text-center flex-1">
                <div className="text-hero-stat font-medium text-foreground">{athleteStats.pbCount}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {athleteStats.pbCount === 1 ? "Ennätys" : "Ennätystä"}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </Link>
  );
}
