import { useEffect, useState } from "react";
import { Plus, Trash2, ImageIcon, Loader2 } from "lucide-react";
import { usePhotos, type EntityType, type Photo } from "../../hooks";
import { PhotoViewer } from "./PhotoViewer";

interface PhotoGalleryProps {
  entityType: EntityType;
  entityId: number;
  canAdd?: boolean;
  canDelete?: boolean;
  maxPhotos?: number;
}

export function PhotoGallery({
  entityType,
  entityId,
  canAdd = true,
  canDelete = true,
  maxPhotos = 20,
}: PhotoGalleryProps) {
  const {
    photos,
    loading,
    error,
    fetchPhotos,
    addPhoto,
    deletePhoto,
    getThumbnailUrl,
    getPhotoUrl,
  } = usePhotos(entityType, entityId);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleAddPhoto = async () => {
    if (photos.length >= maxPhotos) {
      alert(`Voit lisätä enintään ${maxPhotos} kuvaa`);
      return;
    }
    await addPhoto();
  };

  const handleDeletePhoto = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Haluatko varmasti poistaa tämän kuvan?")) {
      await deletePhoto(id);
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
    await deletePhoto(photo.id);
    if (photos.length <= 1) {
      setViewerOpen(false);
    } else if (selectedIndex >= photos.length - 1) {
      setSelectedIndex(photos.length - 2);
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
        Virhe kuvien latauksessa: {error}
      </div>
    );
  }

  return (
    <div>
      {/* Photo grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Add button */}
        {canAdd && photos.length < maxPhotos && (
          <button
            onClick={handleAddPhoto}
            disabled={loading}
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={24} className="text-muted-foreground animate-spin" />
            ) : (
              <>
                <Plus size={24} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Lisää kuva</span>
              </>
            )}
          </button>
        )}

        {/* Photos */}
        {photos.map((photo, index) => (
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
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                title="Poista kuva"
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
          <p className="text-sm text-muted-foreground">Ei kuvia</p>
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
