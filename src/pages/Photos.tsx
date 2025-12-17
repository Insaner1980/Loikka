import { useEffect, useState, useCallback } from "react";
import { Plus, Camera, ChevronDown } from "lucide-react";
import { usePhotoStore, type PhotoWithDetails } from "../stores/usePhotoStore";
import { useAthleteStore } from "../stores/useAthleteStore";
import { useCompetitionStore } from "../stores/useCompetitionStore";
import { PhotoGrid } from "../components/photos/PhotoGrid";
import { PhotoViewerEnhanced } from "../components/photos/PhotoViewerEnhanced";
import { AddPhotoDialog } from "../components/photos/AddPhotoDialog";

export function Photos() {
  const {
    photos,
    years,
    loading,
    filters,
    fetchPhotos,
    fetchYears,
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

  // Fetch data on mount
  useEffect(() => {
    fetchPhotos();
    fetchYears();
    if (athletes.length === 0) fetchAthletes();
    if (competitions.length === 0) fetchCompetitions();
  }, [fetchPhotos, fetchYears, fetchAthletes, fetchCompetitions, athletes.length, competitions.length]);

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
    fetchYears();
  }, [fetchPhotos, fetchYears]);

  // Generate year options (current year + stored years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(new Set([currentYear, ...years])).sort((a, b) => b - a);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kuvat</h1>
        <button
          onClick={() => setAddDialogOpen(true)}
          className="btn-primary btn-press"
        >
          <Plus size={18} />
          Lisää kuva
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Athlete filter */}
        <div className="relative">
          <select
            value={filters.athleteId || ""}
            onChange={(e) => handleFilterChange("athleteId", e.target.value ? Number(e.target.value) : undefined)}
            className="appearance-none bg-[#141414] border border-border rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[160px]"
          >
            <option value="">Kaikki urheilijat</option>
            {athletes.map((a) => (
              <option key={a.athlete.id} value={a.athlete.id}>
                {a.athlete.firstName} {a.athlete.lastName}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {/* Competition filter */}
        <div className="relative">
          <select
            value={filters.competitionId || ""}
            onChange={(e) => handleFilterChange("competitionId", e.target.value ? Number(e.target.value) : undefined)}
            className="appearance-none bg-[#141414] border border-border rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[160px]"
          >
            <option value="">Kaikki kilpailut</option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {/* Year filter */}
        <div className="relative">
          <select
            value={filters.year || ""}
            onChange={(e) => handleFilterChange("year", e.target.value ? Number(e.target.value) : undefined)}
            className="appearance-none bg-[#141414] border border-border rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[120px]"
          >
            <option value="">Kaikki vuodet</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Photo count */}
      {photos.length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          {photos.length} kuvaa
        </p>
      )}

      {/* Photo Grid */}
      <PhotoGrid
        photos={photos}
        loading={loading}
        onPhotoClick={handlePhotoClick}
        getThumbnailUrl={getThumbnailUrl}
        emptyIcon={<Camera size={48} className="text-[#444444]" />}
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
