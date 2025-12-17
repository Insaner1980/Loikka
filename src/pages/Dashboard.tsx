import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  MapPin,
  Calendar,
  Users,
  Trash2,
} from "lucide-react";
import { useAthleteStore } from "../stores/useAthleteStore";
import { useResultStore } from "../stores/useResultStore";
import { useCompetitionStore } from "../stores/useCompetitionStore";
import { getDisciplineById } from "../data/disciplines";
import { formatTime, formatDistance, toAssetUrl } from "../lib/formatters";
import { Dialog } from "../components/ui/Dialog";
import { CompetitionForm } from "../components/competitions/CompetitionForm";
import type { Competition, NewCompetition } from "../types";

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

function getDaysUntilColor(days: number): string {
  if (days <= 3) return "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30"; // Green - imminent
  if (days <= 7) return "bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/25"; // Yellow - soon
  if (days <= 14) return "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25"; // Orange - upcoming
  return "bg-white/5 text-[#888888]"; // Default gray
}

export function Dashboard() {
  const navigate = useNavigate();
  const { athletes, fetchAthletes } = useAthleteStore();
  const { results, fetchResults } = useResultStore();
  const { competitions, fetchCompetitions, updateCompetition, deleteCompetition, getParticipants } = useCompetitionStore();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    fetchAthletes();
    fetchResults();
    fetchCompetitions();
  }, [fetchAthletes, fetchResults, fetchCompetitions]);

  const handleCompetitionClick = (competition: Competition) => {
    setSelectedCompetition(competition);
    setEditDialogOpen(true);
  };

  const handleCompetitionSave = async (
    competitionData: NewCompetition,
    _participants: { athleteId: number; disciplinesPlanned?: number[] }[]
  ) => {
    if (!selectedCompetition) return;
    await updateCompetition(selectedCompetition.id, competitionData);
    setEditDialogOpen(false);
    setSelectedCompetition(null);
  };

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCompetition) return;
    await deleteCompetition(selectedCompetition.id);
    setDeleteConfirmOpen(false);
    setEditDialogOpen(false);
    setSelectedCompetition(null);
  };

  // Get upcoming competitions (future dates only)
  const upcomingCompetitions = competitions
    .filter((c) => getDaysUntil(c.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

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
      {/* Header */}
      <div className="pb-5 border-b border-border-subtle">
        <h1 className="text-base font-medium text-foreground">Lähtöviiva</h1>
      </div>

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
                <button
                  key={competition.id}
                  onClick={() => handleCompetitionClick(competition)}
                  className="block w-full text-left py-3 first:pt-0 last:pb-0 hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors duration-150"
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
                    <div className={`px-2 py-1 rounded-md text-[11px] font-medium ${getDaysUntilColor(getDaysUntil(competition.date))}`}>
                      {getDaysUntil(competition.date)} pv
                    </div>
                  </div>
                </button>
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
            <div className="grid grid-cols-2 gap-3">
              {athletes.slice(0, 2).map(({ athlete }) => (
                <Link
                  key={athlete.id}
                  to={`/athletes/${athlete.id}`}
                  className="aspect-square rounded-xl bg-[#141414] hover:bg-[#191919] transition-colors duration-150 overflow-hidden relative group"
                >
                  {athlete.photoPath ? (
                    <img
                      src={toAssetUrl(athlete.photoPath)}
                      alt={`${athlete.firstName} ${athlete.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#444444] text-4xl font-medium">
                      {getInitials(athlete.firstName, athlete.lastName)}
                    </div>
                  )}
                  {/* Name overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="text-sm font-medium text-white">
                      {athlete.firstName}
                    </div>
                    <div className="text-[12px] text-white/70">
                      {athlete.lastName}
                    </div>
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
          <div className="rounded-xl">
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
                    className={`hover:bg-white/[0.02] transition-colors duration-150 cursor-pointer ${
                      index !== recentResults.length - 1 ? "border-b border-white/[0.03]" : ""
                    }`}
                    onClick={() => navigate(`/athletes/${result.athleteId}`)}
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

      {/* Edit Competition Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedCompetition(null);
        }}
        title="Muokkaa kilpailua"
        maxWidth="lg"
      >
        {selectedCompetition && (
          <div className="space-y-4">
            <CompetitionForm
              competition={selectedCompetition}
              initialParticipants={getParticipants(selectedCompetition.id).map((p) => ({
                athleteId: p.athleteId,
                disciplinesPlanned: p.disciplinesPlanned || undefined,
              }))}
              onSave={handleCompetitionSave}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedCompetition(null);
              }}
            />
            <div className="pt-4 border-t border-border">
              <button
                onClick={handleDeleteClick}
                className="flex items-center gap-2 text-sm text-[#888888] hover:text-foreground transition-colors"
              >
                <Trash2 size={16} />
                Poista kilpailu
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Poista kilpailu"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Haluatko varmasti poistaa kilpailun "{selectedCompetition?.name}"? Tätä toimintoa ei voi peruuttaa.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="btn-secondary"
            >
              Peruuta
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="btn-primary"
            >
              Poista
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
