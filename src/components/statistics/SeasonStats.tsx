import { Trophy, Activity, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import type { Discipline } from "../../types";
import type { SeasonStatsData } from "../../stores/useResultStore";
import { formatTime, formatDistance } from "../../lib/formatters";

interface SeasonStatsProps {
  stats: SeasonStatsData;
  discipline: Discipline;
  year: number;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
      </div>
      {trend && (
        <div
          className={`flex items-center gap-1 mt-3 text-sm ${
            trend.isPositive ? "text-success" : "text-error"
          }`}
        >
          {trend.isPositive ? (
            <TrendingUp size={16} />
          ) : (
            <TrendingDown size={16} />
          )}
          <span>
            {trend.isPositive ? "+" : ""}
            {trend.value.toFixed(1)}% edellisestä kaudesta
          </span>
        </div>
      )}
    </div>
  );
}

export function SeasonStats({ stats, discipline, year }: SeasonStatsProps) {
  const formatValue = (value: number | null) => {
    if (value === null) return "-";
    return discipline.unit === "time"
      ? formatTime(value)
      : formatDistance(value);
  };

  // Determine if improvement is positive based on discipline type
  const getImprovementTrend = () => {
    if (stats.improvementPercent === null) return undefined;
    // For both time and distance events, positive improvementPercent means improvement
    return {
      value: stats.improvementPercent,
      isPositive: stats.improvementPercent > 0,
    };
  };

  if (
    stats.bestResult === null &&
    stats.competitionCount === 0
  ) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-full flex items-center justify-center h-32 bg-card rounded-xl border border-border">
          <p className="text-muted-foreground">
            Ei tuloksia kaudelta {year}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Kauden paras"
        value={formatValue(stats.bestResult)}
        icon={<Trophy size={20} />}
        trend={getImprovementTrend()}
      />
      <StatCard
        title="Keskiarvo"
        value={formatValue(stats.averageResult)}
        icon={<Activity size={20} />}
      />
      <StatCard
        title="Kilpailuja"
        value={stats.competitionCount.toString()}
        subtitle="tällä kaudella"
        icon={<Calendar size={20} />}
      />
      <StatCard
        title="Kausi"
        value={year.toString()}
        icon={<Calendar size={20} />}
      />
    </div>
  );
}
