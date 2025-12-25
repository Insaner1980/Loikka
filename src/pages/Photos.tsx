import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Camera, X, Trash2, Link, User } from "lucide-react";
import { usePhotoStore, type PhotoWithDetails } from "../stores/usePhotoStore";
import { useAthleteStore } from "../stores/useAthleteStore";
import { useCompetitionStore } from "../stores/useCompetitionStore";
import { PhotoGrid } from "../components/photos/PhotoGrid";
import { PhotoViewerEnhanced } from "../components/photos/PhotoViewerEnhanced";
import { AddPhotoDialog } from "../components/photos/AddPhotoDialog";
import { Dialog } from "../components/ui/Dialog";
import { YEAR_RANGE } from "../lib/constants";

export function Photos() {
  const [searchParams] = useSearchParams();
  const initializedRef = useRef(false);

  const {
    photos,
    loading,
    filters,
    fetchPhotos,
    setFilters,
    deletePhoto,
    getPhotoUrl,
    getThumbnailUrl,
    selectionMode,
    selectedIds,
    setSelectionMode,
    toggleSelection,
    clearSelection,
    deleteSelected,
    linkSelectedToCompetition,
    linkSelectedToAthlete,
  } = usePhotoStore();

  const { athletes } = useAthleteStore();
  const { competitions } = useCompetitionStore();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [linkCompetitionOpen, setLinkCompetitionOpen] = useState(false);
  const [linkAthleteOpen, setLinkAthleteOpen] = useState(false);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | "">("");
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | "">("");

  // Track last selected index for Shift+click range selection
  const lastSelectedIndexRef = useRef<number | null>(null);

  // Athletes and competitions are fetched in Layout.tsx on app start

  // Apply URL params on initial mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const athleteParam = searchParams.get("athlete");
    if (athleteParam) {
      const athleteId = parseInt(athleteParam, 10);
      if (!isNaN(athleteId)) {
        setFilters({ athleteId });
        return;
      }
    }
    fetchPhotos();
  }, []);

  // Handle Esc key to exit selection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectionMode) {
        setSelectionMode(false);
        clearSelection();
        lastSelectedIndexRef.current = null;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectionMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle checkbox click - enters selection mode and handles Shift+click
  const handleCheckboxClick = useCallback((index: number, event: React.MouseEvent) => {
    const photo = photos[index];
    if (!photo) return;

    // If not in selection mode, enter it
    if (!selectionMode) {
      setSelectionMode(true);
    }

    // Handle Shift+click for range selection
    if (event.shiftKey && lastSelectedIndexRef.current !== null) {
      const start = Math.min(lastSelectedIndexRef.current, index);
      const end = Math.max(lastSelectedIndexRef.current, index);

      // Select all photos in range
      for (let i = start; i <= end; i++) {
        const p = photos[i];
        if (p && !selectedIds.has(p.id)) {
          toggleSelection(p.id);
        }
      }
    } else {
      // Normal click - toggle single photo
      toggleSelection(photo.id);
    }

    // Update last selected index
    lastSelectedIndexRef.current = index;
  }, [photos, selectionMode, setSelectionMode, selectedIds, toggleSelection]);

  // Handle photo click (not checkbox)
  const handlePhotoClick = useCallback((index: number, event: React.MouseEvent) => {
    // Ctrl+click is handled in PhotoGrid, so this is only for normal clicks
    if (selectionMode) {
      // In selection mode, clicking photo toggles selection
      const photo = photos[index];
      if (photo) {
        // Handle Shift+click for range selection
        if (event.shiftKey && lastSelectedIndexRef.current !== null) {
          const start = Math.min(lastSelectedIndexRef.current, index);
          const end = Math.max(lastSelectedIndexRef.current, index);

          for (let i = start; i <= end; i++) {
            const p = photos[i];
            if (p && !selectedIds.has(p.id)) {
              toggleSelection(p.id);
            }
          }
        } else {
          toggleSelection(photo.id);
        }
        lastSelectedIndexRef.current = index;
      }
    } else {
      // Normal mode, open viewer
      setSelectedIndex(index);
      setViewerOpen(true);
    }
  }, [selectionMode, photos, selectedIds, toggleSelection]);

  const handleViewerNavigate = useCallback((direction: "prev" | "next") => {
    setSelectedIndex((prev) => {
      if (direction === "prev") {
        return prev > 0 ? prev - 1 : photos.length - 1;
      }
      return prev < photos.length - 1 ? prev + 1 : 0;
    });
  }, [photos.length]);

  const handleViewerDelete = useCallback(async (photo: PhotoWithDetails) => {
    await deletePhoto(photo.id);
    if (photos.length <= 1) {
      setViewerOpen(false);
    } else if (selectedIndex >= photos.length - 1) {
      setSelectedIndex(photos.length - 2);
    }
  }, [deletePhoto, photos.length, selectedIndex]);

  const handleFilterChange = useCallback((key: string, value: number | undefined) => {
    setFilters({
      ...filters,
      [key]: value,
    });
  }, [filters, setFilters]);

  const handlePhotoAdded = useCallback(() => {
    setAddDialogOpen(false);
    // Clear filters and refetch to ensure new photo is visible
    setFilters({});
  }, [setFilters]);

  const handleDeleteSelected = useCallback(async () => {
    const success = await deleteSelected();
    if (success) {
      setDeleteConfirmOpen(false);
    }
  }, [deleteSelected]);

  const handleLinkToCompetition = useCallback(async () => {
    if (selectedCompetitionId === "") return;
    const success = await linkSelectedToCompetition(selectedCompetitionId);
    if (success) {
      setLinkCompetitionOpen(false);
      setSelectedCompetitionId("");
    }
  }, [linkSelectedToCompetition, selectedCompetitionId]);

  const handleLinkToAthlete = useCallback(async () => {
    if (selectedAthleteId === "") return;
    const success = await linkSelectedToAthlete(selectedAthleteId);
    if (success) {
      setLinkAthleteOpen(false);
      setSelectedAthleteId("");
    }
  }, [linkSelectedToAthlete, selectedAthleteId]);

  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    clearSelection();
    lastSelectedIndexRef.current = null;
  }, [setSelectionMode, clearSelection]);

  // Generate year options (fixed range)
  const currentYear = new Date().getFullYear();
  const startYear = YEAR_RANGE.START_YEAR;
  const endYear = currentYear + YEAR_RANGE.YEARS_AHEAD;
  const yearOptions: number[] = [];
  for (let y = endYear; y >= startYear; y--) {
    yearOptions.push(y);
  }

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-border-subtle">
        {selectionMode ? (
          <>
            {/* Selection mode header */}
            <h1 className="text-title font-medium text-foreground">
              {hasSelection ? `${selectedCount} valittu` : "Valitse kuvia"}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLinkCompetitionOpen(true)}
                disabled={!hasSelection}
                className="btn-secondary btn-press"
              >
                <Link size={16} />
                Liitä kilpailuun
              </button>
              <button
                onClick={() => setLinkAthleteOpen(true)}
                disabled={!hasSelection}
                className="btn-secondary btn-press"
              >
                <User size={16} />
                Liitä urheilijaan
              </button>
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={!hasSelection}
                className="btn-secondary btn-press"
              >
                <Trash2 size={16} />
                Poista
              </button>
              <button
                onClick={handleCancelSelection}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="Peruuta valinta"
              >
                <X size={18} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Normal header */}
            <h1 className="text-title font-medium text-foreground">Kuvat</h1>
            <button
              onClick={() => setAddDialogOpen(true)}
              className="btn-primary btn-press"
            >
              <Plus size={18} />
              Lisää kuva
            </button>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Athlete filter */}
        <select
          value={filters.athleteId || ""}
          onChange={(e) => handleFilterChange("athleteId", e.target.value ? Number(e.target.value) : undefined)}
          className="bg-card border border-border rounded-md px-3 py-2 text-body input-focus cursor-pointer"
        >
          <option value="">Kaikki urheilijat</option>
          {athletes.map((a) => (
            <option key={a.athlete.id} value={a.athlete.id}>
              {a.athlete.firstName} {a.athlete.lastName}
            </option>
          ))}
        </select>

        {/* Competition filter */}
        <select
          value={filters.competitionId || ""}
          onChange={(e) => handleFilterChange("competitionId", e.target.value ? Number(e.target.value) : undefined)}
          className="bg-card border border-border rounded-md px-3 py-2 text-body input-focus cursor-pointer"
        >
          <option value="">Kaikki kilpailut</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Year filter */}
        <select
          value={filters.year || ""}
          onChange={(e) => handleFilterChange("year", e.target.value ? Number(e.target.value) : undefined)}
          className="bg-card border border-border rounded-md px-3 py-2 text-body input-focus cursor-pointer"
        >
          <option value="">Kaikki vuodet</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Photo count */}
      {photos.length > 0 && (
        <p className="text-body text-muted-foreground mb-4">
          {photos.length} kuvaa
        </p>
      )}

      {/* Photo Grid */}
      <PhotoGrid
        photos={photos}
        loading={loading}
        onPhotoClick={handlePhotoClick}
        onCheckboxClick={handleCheckboxClick}
        getThumbnailUrl={getThumbnailUrl}
        emptyIcon={<Camera size={48} className="text-tertiary" />}
        emptyMessage="Ei kuvia"
        emptySubMessage="Lisää ensimmäinen kuva klikkaamalla Lisää kuva -painiketta"
        selectionMode={selectionMode}
        selectedIds={selectedIds}
      />

      {/* Photo Viewer */}
      {viewerOpen && photos.length > 0 && (
        <PhotoViewerEnhanced
          photos={photos}
          currentIndex={selectedIndex}
          onClose={() => setViewerOpen(false)}
          onNavigate={handleViewerNavigate}
          onDelete={handleViewerDelete}
          getPhotoUrl={getPhotoUrl}
        />
      )}

      {/* Add Photo Dialog */}
      <AddPhotoDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onPhotoAdded={handlePhotoAdded}
        athletes={athletes.map((a) => a.athlete)}
        competitions={competitions}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Poista kuvat"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-body text-muted-foreground">
            Haluatko varmasti poistaa {selectedCount} {selectedCount === 1 ? "kuvan" : "kuvaa"}? Tätä toimintoa ei voi perua.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="btn-secondary"
            >
              Peruuta
            </button>
            <button
              onClick={handleDeleteSelected}
              className="btn-primary"
            >
              Poista
            </button>
          </div>
        </div>
      </Dialog>

      {/* Link to Competition Dialog */}
      <Dialog
        open={linkCompetitionOpen}
        onClose={() => setLinkCompetitionOpen(false)}
        title="Liitä kilpailuun"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-body text-muted-foreground">
            Valitse kilpailu, johon haluat liittää {selectedCount} {selectedCount === 1 ? "kuvan" : "kuvaa"}.
          </p>
          <select
            value={selectedCompetitionId}
            onChange={(e) => setSelectedCompetitionId(e.target.value ? Number(e.target.value) : "")}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-body input-focus cursor-pointer"
          >
            <option value="">Valitse kilpailu</option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.date})
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setLinkCompetitionOpen(false)}
              className="btn-secondary"
            >
              Peruuta
            </button>
            <button
              onClick={handleLinkToCompetition}
              disabled={selectedCompetitionId === ""}
              className="btn-primary"
            >
              Liitä
            </button>
          </div>
        </div>
      </Dialog>

      {/* Link to Athlete Dialog */}
      <Dialog
        open={linkAthleteOpen}
        onClose={() => setLinkAthleteOpen(false)}
        title="Liitä urheilijaan"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-body text-muted-foreground">
            Valitse urheilija, johon haluat liittää {selectedCount} {selectedCount === 1 ? "kuvan" : "kuvaa"}.
          </p>
          <select
            value={selectedAthleteId}
            onChange={(e) => setSelectedAthleteId(e.target.value ? Number(e.target.value) : "")}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-body input-focus cursor-pointer"
          >
            <option value="">Valitse urheilija</option>
            {athletes.map((a) => (
              <option key={a.athlete.id} value={a.athlete.id}>
                {a.athlete.firstName} {a.athlete.lastName}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setLinkAthleteOpen(false)}
              className="btn-secondary"
            >
              Peruuta
            </button>
            <button
              onClick={handleLinkToAthlete}
              disabled={selectedAthleteId === ""}
              className="btn-primary"
            >
              Liitä
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
