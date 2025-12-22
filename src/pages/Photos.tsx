import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Camera } from "lucide-react";
import { usePhotoStore, type PhotoWithDetails } from "../stores/usePhotoStore";
import { useAthleteStore } from "../stores/useAthleteStore";
import { useCompetitionStore } from "../stores/useCompetitionStore";
import { PhotoGrid } from "../components/photos/PhotoGrid";
import { PhotoViewerEnhanced } from "../components/photos/PhotoViewerEnhanced";
import { AddPhotoDialog } from "../components/photos/AddPhotoDialog";
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
  } = usePhotoStore();

  const { athletes, fetchAthletes } = useAthleteStore();
  const { competitions, fetchCompetitions } = useCompetitionStore();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Fetch data on mount, apply URL params if present
  useEffect(() => {
    if (athletes.length === 0) fetchAthletes();
    if (competitions.length === 0) fetchCompetitions();
  }, [fetchAthletes, fetchCompetitions, athletes.length, competitions.length]);

  // Apply URL params on initial mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const athleteParam = searchParams.get("athlete");
    if (athleteParam) {
      const athleteId = parseInt(athleteParam, 10);
      if (!isNaN(athleteId)) {
        setFilters({ ...filters, athleteId });
        return;
      }
    }
    fetchPhotos();
  }, [searchParams, setFilters, fetchPhotos, filters]);

  const handlePhotoClick = useCallback((index: number) => {
    setSelectedIndex(index);
    setViewerOpen(true);
  }, []);

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
    fetchPhotos();
  }, [fetchPhotos]);

  // Generate year options (fixed range)
  const currentYear = new Date().getFullYear();
  const startYear = YEAR_RANGE.START_YEAR;
  const endYear = currentYear + YEAR_RANGE.YEARS_AHEAD;
  const yearOptions: number[] = [];
  for (let y = endYear; y >= startYear; y--) {
    yearOptions.push(y);
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-border-subtle">
        <h1 className="text-title font-medium text-foreground">Kuvat</h1>
        <button
          onClick={() => setAddDialogOpen(true)}
          className="btn-primary btn-press"
        >
          <Plus size={18} />
          Lisää kuva
        </button>
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
        getThumbnailUrl={getThumbnailUrl}
        emptyIcon={<Camera size={48} className="text-tertiary" />}
        emptyMessage="Ei kuvia"
        emptySubMessage="Lisää ensimmäinen kuva klikkaamalla Lisää kuva -painiketta"
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
    </div>
  );
}
