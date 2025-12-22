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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={<TrendingUp size={20} />}
        value={resultsCount}
        label={resultsCount === 1 ? "Tulos" : "Tulosta"}
      />
      <StatCard
        icon={<Trophy size={20} />}
        value={personalBestsCount}
        label={personalBestsCount === 1 ? "Ennätys" : "Ennätystä"}
      />
      <StatCard
        icon={<Medal size={20} />}
        value={medalsCount}
        label={medalsCount === 1 ? "Mitali" : "Mitalia"}
      />
      <StatCard
        icon={<Target size={20} />}
        value={`${goalsProgress.achieved}/${goalsProgress.total}`}
        label={goalsProgress.total === 1 ? "Tavoite" : "Tavoitetta"}
      />
    </div>
  );
}
