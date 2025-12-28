import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Camera, X, Trash2, Link, User } from "lucide-react";
import { usePhotoStore, type PhotoWithDetails } from "../stores/usePhotoStore";
import { useAthleteStore } from "../stores/useAthleteStore";
import { useCompetitionStore } from "../stores/useCompetitionStore";
import { PhotoGrid } from "../components/photos/PhotoGrid";
import { PhotoViewerEnhanced } from "../components/photos/PhotoViewerEnhanced";
import { AddPhotoDialog } from "../components/photos/AddPhotoDialog";
import { Dialog, FilterSelect, type FilterOption } from "../components/ui";
import { useAddShortcut, useEscapeKey, useBackgroundDeselect } from "../hooks";

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

  // Keyboard shortcut: Ctrl+U opens add dialog
  useAddShortcut(() => setAddDialogOpen(true));

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

  // Esc exits selection mode
  useEscapeKey(() => {
    setSelectionMode(false);
    clearSelection();
    lastSelectedIndexRef.current = null;
  }, selectionMode);

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

  // Click on empty area exits selection mode
  const handleBackgroundClick = useBackgroundDeselect(selectionMode, handleCancelSelection);

  // Get years that have photos
  const yearsWithPhotos = useMemo(() => {
    const years = new Set(photos.map((p) => new Date(p.createdAt).getFullYear()));
    return Array.from(years).sort((a, b) => b - a); // Descending order
  }, [photos]);

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  // Filter options for FilterSelect components
  const athleteFilterOptions: FilterOption[] = useMemo(() => [
    { value: "all", label: "Kaikki urheilijat" },
    ...athletes.map((a) => ({
      value: a.athlete.id,
      label: `${a.athlete.firstName} ${a.athlete.lastName}`,
    })),
  ], [athletes]);

  const competitionFilterOptions: FilterOption[] = useMemo(() => [
    { value: "all", label: "Kaikki kilpailut" },
    ...competitions.map((c) => ({
      value: c.id,
      label: c.name,
    })),
  ], [competitions]);

  const yearFilterOptions: FilterOption[] = useMemo(() => [
    { value: "all", label: "Kaikki vuodet" },
    ...yearsWithPhotos.map((y) => ({
      value: y,
      label: String(y),
    })),
  ], [yearsWithPhotos]);

  // Options for link dialogs
  const linkCompetitionOptions: FilterOption[] = useMemo(() => [
    { value: "", label: "Valitse kilpailu" },
    ...competitions.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.date})`,
    })),
  ], [competitions]);

  const linkAthleteOptions: FilterOption[] = useMemo(() => [
    { value: "", label: "Valitse urheilija" },
    ...athletes.map((a) => ({
      value: a.athlete.id,
      label: `${a.athlete.firstName} ${a.athlete.lastName}`,
    })),
  ], [athletes]);

  return (
    <div className="p-6 h-full flex flex-col" onClick={handleBackgroundClick}>
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
        <FilterSelect
          value={filters.athleteId ?? "all"}
          onChange={(value) => handleFilterChange("athleteId", value === "all" ? undefined : (value as number))}
          options={athleteFilterOptions}
        />

        {/* Competition filter */}
        <FilterSelect
          value={filters.competitionId ?? "all"}
          onChange={(value) => handleFilterChange("competitionId", value === "all" ? undefined : (value as number))}
          options={competitionFilterOptions}
        />

        {/* Year filter */}
        <FilterSelect
          value={filters.year ?? "all"}
          onChange={(value) => handleFilterChange("year", value === "all" ? undefined : (value as number))}
          options={yearFilterOptions}
        />
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
          <FilterSelect
            value={selectedCompetitionId}
            onChange={(value) => setSelectedCompetitionId(value === "" ? "" : (value as number))}
            options={linkCompetitionOptions}
            className="w-full"
          />
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
          <FilterSelect
            value={selectedAthleteId}
            onChange={(value) => setSelectedAthleteId(value === "" ? "" : (value as number))}
            options={linkAthleteOptions}
            className="w-full"
          />
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
