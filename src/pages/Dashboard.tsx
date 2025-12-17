import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  MapPin,
  Calendar,
  Users,
} from "lucide-react";
import { useAthleteStore } from "../stores/useAthleteStore";
import { useResultStore } from "../stores/useResultStore";
import { useCompetitionStore } from "../stores/useCompetitionStore";
import { getDisciplineById } from "../data/disciplines";
import { formatTime, formatDistance, toAssetUrl } from "../lib/formatters";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fi-FI", { day: "numeric", month: "numeric" });
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = date.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function Dashboard() {
  const { athletes, fetchAthletes } = useAthleteStore();
  const { results, fetchResults } = useResultStore();
  const { competitions, fetchCompetitions } = useCompetitionStore();

  useEffect(() => {
    fetchAthletes();
    fetchResults();
    fetchCompetitions();
  }, [fetchAthletes, fetchResults, fetchCompetitions]);

  // Get upcoming competitions (future dates only)
  const upcomingCompetitions = competitions
    .filter((c) => getDaysUntil(c.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Get recent results with athlete names
  const recentResults = results
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map((result) => {
      const athleteData = athletes.find((a) => a.athlete.id === result.athleteId);
      const discipline = getDisciplineById(result.disciplineId);
      return {
        ...result,
        athleteName: athleteData
          ? `${athleteData.athlete.firstName} ${athleteData.athlete.lastName}`
          : "Tuntematon",
        disciplineName: discipline?.name || "Tuntematon",
        disciplineUnit: discipline?.unit || "time",
      };
    });

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto w-full">
      {/* Two column layout for competitions and athletes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming competitions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-medium text-[#888888]">Tulevat kilpailut</h2>
            <Link
              to="/calendar"
              className="text-[13px] text-[#555555] hover:text-[#888888] flex items-center gap-0.5 transition-colors duration-150"
            >
              Kaikki <ChevronRight size={14} />
            </Link>
          </div>
          {upcomingCompetitions.length === 0 ? (
            <div className="text-[13px] text-[#555555] py-4">
              Ei tulevia kilpailuja
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {upcomingCompetitions.map((competition) => (
                <div
                  key={competition.id}
                  className="py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[14px] font-medium text-foreground">{competition.name}</div>
                      <div className="flex items-center gap-3 mt-1.5 text-[13px] text-[#666666]">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} />
                          {formatDate(competition.date)}
                        </span>
                        {competition.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={13} />
                            {competition.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded-md bg-white/5 text-[11px] text-[#888888]">
                      {getDaysUntil(competition.date)} pv
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Athletes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-medium text-[#888888]">Urheilijat</h2>
            <Link
              to="/athletes"
              className="text-[13px] text-[#555555] hover:text-[#888888] flex items-center gap-0.5 transition-colors duration-150"
            >
              Kaikki <ChevronRight size={14} />
            </Link>
          </div>
          {athletes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users size={32} className="text-[#444444] mb-2" />
              <p className="text-[13px] text-[#555555]">Ei urheilijoita</p>
              <Link
                to="/athletes"
                className="text-[13px] text-[#888888] hover:text-foreground mt-1"
              >
                Lisää urheilija
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {athletes.slice(0, 3).map(({ athlete }) => (
                <Link
                  key={athlete.id}
                  to={`/athletes/${athlete.id}`}
                  className="p-4 rounded-lg hover:bg-white/[0.02] transition-colors duration-150 text-center"
                >
                  {athlete.photoPath ? (
                    <img
                      src={toAssetUrl(athlete.photoPath)}
                      alt={`${athlete.firstName} ${athlete.lastName}`}
                      className="w-9 h-9 mx-auto mb-2.5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 mx-auto mb-2.5 rounded-full bg-[#191919] flex items-center justify-center text-[#666666] text-sm font-medium">
                      {getInitials(athlete.firstName, athlete.lastName)}
                    </div>
                  )}
                  <div className="text-sm font-medium truncate text-foreground">
                    {athlete.firstName}
                  </div>
                  <div className="text-[13px] text-[#666666] truncate">
                    {athlete.lastName}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent results */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium text-[#888888]">Viimeisimmät tulokset</h2>
          <Link
            to="/results"
            className="text-[13px] text-[#555555] hover:text-[#888888] flex items-center gap-0.5 transition-colors duration-150"
          >
            Kaikki <ChevronRight size={14} />
          </Link>
        </div>
        {recentResults.length === 0 ? (
          <div className="text-[13px] text-[#555555] py-4">
            Ei tuloksia vielä
          </div>
        ) : (
          <div className="rounded-xl bg-[#0F0F0F]">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[12px] font-medium text-[#555555]">
                  <th className="px-4 py-3">Urheilija</th>
                  <th className="px-4 py-3">Laji</th>
                  <th className="px-4 py-3">Tulos</th>
                  <th className="px-4 py-3"></th>
                  <th className="px-4 py-3 text-right">Pvm</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.map((result, index) => (
                  <tr
                    key={result.id}
                    className={`hover:bg-white/[0.02] transition-colors duration-150 ${
                      index !== recentResults.length - 1 ? "border-b border-white/[0.03]" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {result.athleteName}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#888888]">
                      {result.disciplineName}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono tabular-nums text-foreground">
                      {result.disciplineUnit === "time"
                        ? formatTime(result.value)
                        : formatDistance(result.value)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {result.isPersonalBest && (
                          <span className="badge-pb">SE</span>
                        )}
                        {result.isSeasonBest && !result.isPersonalBest && (
                          <span className="badge-sb">KE</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-[#888888]">
                      {formatDate(result.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
