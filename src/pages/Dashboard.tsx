import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  MapPin,
  Calendar,
  Users,
  Trash2,
  Trophy,
  Plus,
} from "lucide-react";
import { useAthleteStore } from "../stores/useAthleteStore";
import { useResultStore } from "../stores/useResultStore";
import { useCompetitionStore } from "../stores/useCompetitionStore";
import { getDisciplineById } from "../data/disciplines";
import { formatTime, formatDistance, formatDate, toAssetUrl, getStatusLabel, getInitials, getDaysUntil } from "../lib/formatters";
import { DASHBOARD } from "../lib/constants";
import { Dialog } from "../components/ui/Dialog";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { CompetitionForm } from "../components/competitions/CompetitionForm";
import type { Competition, NewCompetition } from "../types";

// Badge style for days until competition
const DAYS_BADGE_STYLE = "bg-transparent text-[var(--text-muted)] border border-[var(--border-hover)]";

export function Dashboard() {
  const navigate = useNavigate();
  const { athletes } = useAthleteStore();
  const { results } = useResultStore();
  const { competitions, updateCompetition, deleteCompetition, getParticipants } = useCompetitionStore();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Data is fetched in Layout.tsx on app start

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
  const upcomingCompetitions = useMemo(() =>
    competitions
      .filter((c) => getDaysUntil(c.date) >= 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, DASHBOARD.MAX_COMPETITIONS),
    [competitions]
  );

  // Get recent results with athlete names
  const recentResults = useMemo(() =>
    results
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, DASHBOARD.MAX_RESULTS)
      .map((result) => {
        const athleteData = athletes.find((a) => a.athlete.id === result.athleteId);
        const discipline = getDisciplineById(result.disciplineId);
        return {
          ...result,
          athleteName: athleteData
            ? `${athleteData.athlete.firstName} ${athleteData.athlete.lastName}`
            : "Tuntematon",
          disciplineName: discipline?.fullName || "Tuntematon",
          disciplineUnit: discipline?.unit || "time",
          disciplineCategory: discipline?.category,
          status: result.status,
        };
      }),
    [results, athletes]
  );

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="pb-5 border-b border-border-subtle">
        <h1 className="text-title font-medium text-foreground">Lähtöviiva</h1>
      </div>

      {/* Two column layout for competitions and athletes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming competitions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-body font-medium text-muted-foreground">Tulevat kilpailut</h2>
            <Link
              to="/calendar"
              className="text-body text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center gap-0.5 transition-colors duration-150 cursor-pointer"
            >
              Kaikki <ChevronRight size={14} />
            </Link>
          </div>
          {upcomingCompetitions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar size={32} className="text-[var(--text-initials)] mb-2" />
              <p className="text-body text-tertiary">Ei tulevia kilpailuja</p>
              <Link
                to="/calendar"
                className="inline-flex items-center gap-1 text-body text-[var(--accent)] hover:text-[var(--accent-hover)] mt-2 transition-colors duration-150"
              >
                <Plus size={14} />
                Lisää kilpailu
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {upcomingCompetitions.map((competition) => (
                <button
                  key={competition.id}
                  onClick={() => handleCompetitionClick(competition)}
                  className="block w-full text-left py-3 first:pt-0 last:pb-0 hover:bg-card-hover -mx-2 px-2 rounded-lg transition-colors duration-150 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-default font-medium text-foreground">{competition.name}</div>
                      <div className="flex items-center gap-3 mt-1.5 text-body text-[var(--text-placeholder)]">
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
                    <div className={`px-2 py-1 rounded-md text-caption font-medium ${DAYS_BADGE_STYLE}`}>
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
            <h2 className="text-body font-medium text-muted-foreground">Urheilijat</h2>
            <Link
              to="/athletes"
              className="text-body text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center gap-0.5 transition-colors duration-150 cursor-pointer"
            >
              Kaikki <ChevronRight size={14} />
            </Link>
          </div>
          {athletes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users size={32} className="text-[var(--text-initials)] mb-2" />
              <p className="text-body text-tertiary">Ei urheilijoita</p>
              <Link
                to="/athletes"
                className="text-body text-[var(--accent)] hover:text-[var(--accent-hover)] mt-1 transition-colors duration-150"
              >
                Lisää urheilija
              </Link>
            </div>
          ) : (
            <div className={`grid gap-3 ${athletes.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {athletes.slice(0, DASHBOARD.MAX_ATHLETES).map(({ athlete }) => (
                <Link
                  key={athlete.id}
                  to={`/athletes/${athlete.id}`}
                  className="aspect-square rounded-xl bg-card hover:bg-card-hover transition-colors duration-150 overflow-hidden relative group"
                >
                  {athlete.photoPath ? (
                    <img
                      src={toAssetUrl(athlete.photoPath)}
                      alt={`${athlete.firstName} ${athlete.lastName}`}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-initials)] text-4xl font-medium">
                      {getInitials(athlete.firstName, athlete.lastName)}
                    </div>
                  )}
                  {/* Name overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: "var(--overlay-gradient)" }}>
                    <div className="text-body font-medium text-white">
                      {athlete.firstName}
                    </div>
                    <div className="text-caption text-white/70">
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
          <h2 className="text-body font-medium text-muted-foreground">Viimeisimmät tulokset</h2>
          <Link
            to="/results"
            className="text-body text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center gap-0.5 transition-colors duration-150 cursor-pointer"
          >
            Kaikki <ChevronRight size={14} />
          </Link>
        </div>
        {recentResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy size={32} className="text-[var(--text-initials)] mb-2" />
            <p className="text-body text-tertiary">Ei tuloksia vielä</p>
            <Link
              to="/results"
              className="inline-flex items-center gap-1 text-body text-[var(--accent)] hover:text-[var(--accent-hover)] mt-2 transition-colors duration-150"
            >
              <Plus size={14} />
              Lisää tulos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {recentResults.map((result) => {
              const hasMedal = result.placement && result.placement >= 1 && result.placement <= 3;
              const medalColors: Record<number, string> = { 1: "bg-gold", 2: "bg-silver", 3: "bg-bronze" };

              // Check if result has a record (OE or SE)
              const hasRecord = result.isPersonalBest || result.isNationalRecord;

              return (
                <div
                  key={result.id}
                  onClick={() => navigate(`/athletes/${result.athleteId}?discipline=${result.disciplineId}`)}
                  className={`group rounded-xl bg-card border border-border-subtle hover:border-border-hover transition-colors duration-150 cursor-pointer card-interactive ${hasRecord ? "border-l-3 border-l-[var(--accent)]" : ""}`}
                >
                  <div className="p-4 flex flex-col h-full">
                    {/* Top row: Athlete name + discipline */}
                    <div className="mb-3">
                      <div className="font-medium text-foreground truncate">{result.athleteName?.split(' ')[0] || "Tuntematon"}</div>
                      <div className="text-body text-muted-foreground truncate">{result.disciplineName}</div>
                    </div>

                    {/* Center: Result value (big) */}
                    <div className="flex-1 flex flex-col items-center justify-center py-2">
                      {(result.status && result.status !== "valid") || result.value === 0 ? (
                        <span className="px-3 py-1.5 text-body font-medium rounded-lg bg-muted text-muted-foreground">
                          {getStatusLabel(result.status) || "Ei tulosta"}
                        </span>
                      ) : (
                        <>
                          <span className="text-stat font-bold tabular-nums text-foreground">
                            {result.disciplineCategory === "combined"
                              ? `${Math.round(result.value)} p`
                              : result.disciplineUnit === "time"
                                ? formatTime(result.value)
                                : formatDistance(result.value)}
                          </span>
                          {/* Badges */}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {result.isPersonalBest && <span className="badge-pb">OE</span>}
                            {result.isSeasonBest && <span className="badge-sb">KE</span>}
                            {result.isNationalRecord && <span className="badge-nr">SE</span>}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="h-px w-full bg-border my-3" />

                    {/* Bottom: Date, competition/training, placement */}
                    <div className="flex items-center justify-between gap-2 text-body">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Calendar size={13} className="text-muted-foreground shrink-0" />
                          <span>{formatDate(result.date)}</span>
                        </div>
                        {result.competitionName && (
                          <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                            <Trophy size={13} className="shrink-0" />
                            <span className="truncate">{result.competitionName}</span>
                          </div>
                        )}
                        {result.type === "training" && (
                          <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                            {result.location ? (
                              <>
                                <MapPin size={13} className="shrink-0" />
                                <span className="truncate">{result.location}</span>
                              </>
                            ) : (
                              <span>Harjoitus</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Medal */}
                      <div className="shrink-0">
                        {hasMedal && (
                          <div
                            className={`w-7 h-7 rounded-full ${medalColors[result.placement as 1 | 2 | 3]} flex items-center justify-center shadow-sm`}
                          >
                            <span className="text-caption font-bold text-medal-text">{result.placement}</span>
                          </div>
                        )}
                        {result.placement && result.placement > 3 && (
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-caption font-semibold text-muted-foreground">{result.placement}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
        maxWidth="3xl"
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
                className="flex items-center gap-2 text-body text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Trash2 size={16} />
                Poista kilpailu
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Competition Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmOpen(false)}
        title="Poista kilpailu"
        message={`Haluatko varmasti poistaa kilpailun "${selectedCompetition?.name}"? Tätä toimintoa ei voi peruuttaa.`}
        confirmText="Poista"
        variant="danger"
      />

    </div>
  );
}
