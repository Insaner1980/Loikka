import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  MapPin,
  Calendar,
  Users,
  Trash2,
  Trophy,
  Pencil,
} from "lucide-react";
import { useAthleteStore } from "../stores/useAthleteStore";
import { useResultStore } from "../stores/useResultStore";
import { useCompetitionStore } from "../stores/useCompetitionStore";
import { getDisciplineById } from "../data/disciplines";
import { formatTime, formatDistance, formatDate, toAssetUrl, getStatusLabel, getInitials, getDaysUntil } from "../lib/formatters";
import { DASHBOARD } from "../lib/constants";
import { Dialog } from "../components/ui/Dialog";
import { CompetitionForm } from "../components/competitions/CompetitionForm";
import { ResultEditDialog } from "../components/results/ResultEditDialog";
import type { Competition, NewCompetition, Result } from "../types";

// Badge style for days until competition
const DAYS_BADGE_STYLE = "bg-transparent text-[var(--text-muted)] border border-[var(--border-hover)]";

export function Dashboard() {
  const navigate = useNavigate();
  const { athletes, fetchAthletes } = useAthleteStore();
  const { results, fetchResults, deleteResult } = useResultStore();
  const { competitions, fetchCompetitions, updateCompetition, deleteCompetition, getParticipants } = useCompetitionStore();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedResultForDelete, setSelectedResultForDelete] = useState<typeof results[0] | null>(null);
  const [selectedResultForEdit, setSelectedResultForEdit] = useState<Result | null>(null);
  const [resultEditDialogOpen, setResultEditDialogOpen] = useState(false);

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
            <div className="text-body text-tertiary py-4">
              Ei tulevia kilpailuja
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {upcomingCompetitions.map((competition) => (
                <button
                  key={competition.id}
                  onClick={() => handleCompetitionClick(competition)}
                  className="block w-full text-left py-3 first:pt-0 last:pb-0 hover:bg-card-hover -mx-2 px-2 rounded-lg transition-colors duration-150"
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
            <div className="grid grid-cols-2 gap-3">
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
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-initials)] text-4xl font-medium">
                      {getInitials(athlete.firstName, athlete.lastName)}
                    </div>
                  )}
                  {/* Name overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: "var(--overlay-gradient)" }}>
                    <div className="text-sm font-medium text-white">
                      {athlete.firstName}
                    </div>
                    <div className="text-xs text-white/70">
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
          <div className="text-body text-tertiary py-4">
            Ei tuloksia vielä
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {recentResults.map((result) => {
              const hasMedal = result.placement && result.placement >= 1 && result.placement <= 3;
              const medalColors: Record<number, string> = { 1: "bg-gold", 2: "bg-silver", 3: "bg-bronze" };

              return (
                <div
                  key={result.id}
                  onClick={() => navigate(`/athletes/${result.athleteId}?discipline=${result.disciplineId}`)}
                  className="group rounded-xl bg-card border border-border-subtle hover:border-border-hover transition-colors duration-150 cursor-pointer"
                >
                  <div className="p-4 flex flex-col h-full">
                    {/* Top row: Athlete name + discipline */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{result.athleteName?.split(' ')[0] || "Tuntematon"}</div>
                        <div className="text-sm text-muted-foreground truncate">{result.disciplineName}</div>
                      </div>
                      {/* Action icons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResultForDelete(result);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResultForEdit(result);
                            setResultEditDialogOpen(true);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Center: Result value (big) */}
                    <div className="flex-1 flex flex-col items-center justify-center py-2">
                      {(result.status && result.status !== "valid") || result.value === 0 ? (
                        <span className="px-3 py-1.5 text-sm font-medium rounded-lg bg-muted text-muted-foreground">
                          {getStatusLabel(result.status) || "Ei tulosta"}
                        </span>
                      ) : (
                        <>
                          <span className="text-2xl font-bold tabular-nums text-foreground">
                            {result.disciplineUnit === "time"
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
                    <div className="flex items-center justify-between gap-2 text-sm">
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
                            <span className="text-xs font-bold text-black/70">{result.placement}</span>
                          </div>
                        )}
                        {result.placement && result.placement > 3 && (
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-xs font-semibold text-muted-foreground">{result.placement}</span>
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
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Trash2 size={16} />
                Poista kilpailu
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Competition Confirmation Dialog */}
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

      {/* Delete Result Confirmation Dialog */}
      <Dialog
        open={selectedResultForDelete !== null}
        onClose={() => setSelectedResultForDelete(null)}
        title="Poista tulos"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Haluatko varmasti poistaa tämän tuloksen? Tätä toimintoa ei voi peruuttaa.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setSelectedResultForDelete(null)}
              className="btn-secondary"
            >
              Peruuta
            </button>
            <button
              onClick={async () => {
                if (selectedResultForDelete) {
                  await deleteResult(selectedResultForDelete.id);
                  setSelectedResultForDelete(null);
                }
              }}
              className="btn-primary bg-[var(--status-error)] hover:bg-[var(--status-error)]/90"
            >
              Poista
            </button>
          </div>
        </div>
      </Dialog>

      {/* Result Edit Dialog */}
      <ResultEditDialog
        result={selectedResultForEdit}
        open={resultEditDialogOpen}
        onClose={() => {
          setResultEditDialogOpen(false);
          setSelectedResultForEdit(null);
        }}
        onSaved={() => {
          fetchResults();
        }}
      />
    </div>
  );
}
