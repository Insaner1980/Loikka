import { Trophy, TrendingUp, TrendingDown, Hash, Calculator } from "lucide-react";
import type { Discipline } from "../../types";
import type { SeasonStatsData } from "../../stores/useResultStore";
import { formatTime, formatDistance } from "../../lib/formatters";

interface SeasonStatsProps {
  stats: SeasonStatsData;
  discipline: Discipline;
  year: number;
}

export function SeasonStats({ stats, discipline, year }: SeasonStatsProps) {
  const isCombinedEvent = discipline.category === "combined";

  const formatValue = (value: number | null) => {
    if (value === null) return "-";
    if (isCombinedEvent) {
      return `${Math.round(value)} p`;
    }
    return discipline.unit === "time"
      ? formatTime(value)
      : formatDistance(value);
  };

  // Format improvement value (time shows as seconds, distance as cm, points as points)
  const formatImprovement = (percent: number | null) => {
    if (percent === null || stats.bestResult === null) return "-";
    // Convert percentage back to approximate value change
    // This is an approximation since we don't have the raw improvement value
    const improvement = (stats.bestResult * percent) / 100;

    if (discipline.unit === "time") {
      const prefix = percent > 0 ? "-" : "+";
      return `${prefix}${Math.abs(improvement).toFixed(2)} s`;
    } else if (isCombinedEvent) {
      const prefix = percent > 0 ? "+" : "";
      return `${prefix}${Math.round(improvement)} p`;
    } else {
      const prefix = percent > 0 ? "+" : "";
      return `${prefix}${(improvement * 100).toFixed(0)} cm`;
    }
  };

  const improvementPositive = stats.improvementPercent !== null && stats.improvementPercent > 0;

  if (stats.bestResult === null && stats.competitionCount === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="col-span-full flex items-center justify-center h-32 bg-card rounded-xl border border-border">
          <p className="text-muted-foreground">
            Ei tuloksia kaudelta {year}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Paras */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-body text-muted-foreground">Paras</p>
            <p className="text-stat font-bold tabular-nums mt-1">
              {formatValue(stats.bestResult)}
            </p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Trophy size={20} />
          </div>
        </div>
      </div>

      {/* Kehitys */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-body text-muted-foreground">Kehitys</p>
            <p className="text-stat font-bold tabular-nums mt-1 text-foreground">
              {formatImprovement(stats.improvementPercent)}
            </p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {improvementPositive ? (
              <TrendingUp size={20} />
            ) : (
              <TrendingDown size={20} />
            )}
          </div>
        </div>
      </div>

      {/* Tuloksia */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-body text-muted-foreground">Tuloksia</p>
            <p className="text-stat font-bold tabular-nums mt-1">
              {stats.competitionCount}
            </p>
            <p className="text-body text-muted-foreground mt-1">kaudella</p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Hash size={20} />
          </div>
        </div>
      </div>

      {/* Keskiarvo */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-body text-muted-foreground">Keskiarvo</p>
            <p className="text-stat font-bold tabular-nums mt-1">
              {formatValue(stats.averageResult)}
            </p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Calculator size={20} />
          </div>
        </div>
      </div>
    </div>
  );
}
