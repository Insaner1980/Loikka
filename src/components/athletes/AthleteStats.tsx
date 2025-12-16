import { Trophy, Medal, Target, TrendingUp } from "lucide-react";
import { StatCard } from "../shared/StatCard";

interface AthleteStatsProps {
  resultsCount: number;
  personalBestsCount: number;
  medalsCount: number;
  goalsProgress: { achieved: number; total: number };
}

export function AthleteStats({
  resultsCount,
  personalBestsCount,
  medalsCount,
  goalsProgress,
}: AthleteStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<TrendingUp size={24} />}
        value={resultsCount}
        label="Tuloksia"
      />
      <StatCard
        icon={<Trophy size={24} />}
        value={personalBestsCount}
        label="Ennätyksiä"
        highlight
      />
      <StatCard
        icon={<Medal size={24} />}
        value={medalsCount}
        label="Mitaleita"
      />
      <StatCard
        icon={<Target size={24} />}
        value={`${goalsProgress.achieved}/${goalsProgress.total}`}
        label="Tavoitteita"
      />
    </div>
  );
}
