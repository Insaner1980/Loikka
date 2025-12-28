import { useEffect, useState } from "react";
import { Plus, Trash2, ImageIcon, Loader2 } from "lucide-react";
import { usePhotoStore, type EntityType, type Photo } from "../../stores";
import { PhotoViewer } from "./PhotoViewer";

interface PhotoGalleryProps {
  entityType: EntityType;
  entityId: number;
  canAdd?: boolean;
  canDelete?: boolean;
  maxPhotos?: number;
  /** Max photos to display in grid (rest hidden with "Kaikki" link) */
  displayLimit?: number;
  /** Callback to report total photo count to parent */
  onPhotoCountChange?: (count: number) => void;
}

export function PhotoGallery({
  entityType,
  entityId,
  canAdd = true,
  canDelete = true,
  maxPhotos = 20,
  displayLimit,
  onPhotoCountChange,
}: PhotoGalleryProps) {
  const {
    fetchEntityPhotos,
    addEntityPhoto,
    deleteEntityPhoto,
    getEntityPhotos,
    getThumbnailUrl,
    getPhotoUrl,
  } = usePhotoStore();

  const { photos, loading, error } = getEntityPhotos(entityType, entityId);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    fetchEntityPhotos(entityType, entityId);
  }, [entityType, entityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Report photo count to parent
  useEffect(() => {
    onPhotoCountChange?.(photos.length);
  }, [photos.length, onPhotoCountChange]);

  const handleAddPhoto = async () => {
    if (photos.length >= maxPhotos) {
      alert(`Voit lisätä enintään ${maxPhotos} kuvaa`);
      return;
    }
    await addEntityPhoto(entityType, entityId);
  };

  const handleDeletePhoto = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Haluatko varmasti poistaa tämän kuvan?")) {
      await deleteEntityPhoto(entityType, entityId, id);
    }
  };

  const handlePhotoClick = (index: number) => {
    setSelectedIndex(index);
    setViewerOpen(true);
  };

  const handleViewerNavigate = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    } else {
      setSelectedIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    }
  };

  const handleViewerDelete = async (photo: Photo) => {
    await deleteEntityPhoto(entityType, entityId, photo.id);
    if (photos.length <= 1) {
      setViewerOpen(false);
    } else if (selectedIndex >= photos.length - 1) {
      setSelectedIndex(photos.length - 2);
    }
  };

  if (error) {
    return (
      <div className="flex items-center overflow-hidden rounded-lg bg-elevated">
        <div className="w-1 self-stretch bg-[var(--accent)]" />
        <div className="px-3 py-2 text-body text-foreground">Virhe kuvien latauksessa: {error}</div>
      </div>
    );
  }

  // Show add button if under maxPhotos limit
  const canShowAddButton = canAdd && photos.length < maxPhotos;

  // Calculate how many photos to display
  // When displayLimit is set and add button is shown, show displayLimit-1 photos (to make room for button)
  // When displayLimit is set and add button is hidden, show displayLimit photos
  let photosToDisplay = photos;
  if (displayLimit) {
    const photoSlots = canShowAddButton ? displayLimit - 1 : displayLimit;
    photosToDisplay = photos.slice(0, photoSlots);
  }

  return (
    <div>
      {/* Photo grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Add button */}
        {canShowAddButton && (
          <button
            onClick={handleAddPhoto}
            disabled={loading}
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 size={24} className="text-muted-foreground animate-spin" />
            ) : (
              <>
                <Plus size={24} className="text-muted-foreground" />
                <span className="text-caption text-muted-foreground">Lisää kuva</span>
              </>
            )}
          </button>
        )}

        {/* Photos */}
        {photosToDisplay.map((photo, index) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => handlePhotoClick(index)}
            onMouseEnter={() => setHoveredId(photo.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <img
              src={getThumbnailUrl(photo)}
              alt={photo.originalName}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="eager"
            />

            {/* Hover overlay */}
            <div
              className={`absolute inset-0 bg-black/40 transition-opacity ${
                hoveredId === photo.id ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Delete button */}
            {canDelete && hoveredId === photo.id && (
              <button
                onClick={(e) => handleDeletePhoto(photo.id, e)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white/80 hover:text-white rounded-lg hover:bg-black/80 transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {photos.length === 0 && !canAdd && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <ImageIcon size={24} className="text-muted-foreground" />
          </div>
          <p className="text-body text-muted-foreground">Ei kuvia</p>
        </div>
      )}

      {/* Photo viewer modal */}
      {viewerOpen && photos.length > 0 && (
        <PhotoViewer
          photos={photos}
          currentIndex={selectedIndex}
          onClose={() => setViewerOpen(false)}
          onNavigate={handleViewerNavigate}
          onDelete={canDelete ? handleViewerDelete : undefined}
          getPhotoUrl={getPhotoUrl}
        />
      )}
    </div>
  );
}
