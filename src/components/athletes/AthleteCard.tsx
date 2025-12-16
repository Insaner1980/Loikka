import { Link } from "react-router-dom";
import type { Athlete } from "../../types";

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
      className="block p-4 bg-card rounded-xl border border-border hover:border-primary transition-colors"
    >
      {/* Profile section */}
      <div className="flex items-center gap-4 mb-4">
        {athlete.photoPath ? (
          <img
            src={athlete.photoPath}
            alt={`${athlete.firstName} ${athlete.lastName}`}
            className="w-14 h-14 rounded-full object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium text-lg">
            {getInitials(athlete.firstName, athlete.lastName)}
          </div>
        )}
        <div>
          <div className="font-semibold text-lg">
            {athlete.firstName} {athlete.lastName}
          </div>
          <div className="text-sm text-muted-foreground">
            {athlete.birthYear}
            {athlete.clubName && ` • ${athlete.clubName}`}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border mb-4" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-sm mb-4">
        <div>
          <div className="font-semibold">{athleteStats.disciplineCount}</div>
          <div className="text-muted-foreground text-xs">Lajeja</div>
        </div>
        <div>
          <div className="font-semibold">{athleteStats.resultCount}</div>
          <div className="text-muted-foreground text-xs">Tuloksia</div>
        </div>
        <div>
          <div className="font-semibold">{athleteStats.pbCount}</div>
          <div className="text-muted-foreground text-xs">Ennätyksiä</div>
        </div>
      </div>

      {/* Medals */}
      {hasMedals && (
        <div className="flex justify-center gap-4 text-sm">
          {athleteStats.goldMedals > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-gold" />
              <span>{athleteStats.goldMedals}</span>
            </span>
          )}
          {athleteStats.silverMedals > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-silver" />
              <span>{athleteStats.silverMedals}</span>
            </span>
          )}
          {athleteStats.bronzeMedals > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-bronze" />
              <span>{athleteStats.bronzeMedals}</span>
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
