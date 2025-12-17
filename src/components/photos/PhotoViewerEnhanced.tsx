import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { PhotoWithDetails } from "../../stores/usePhotoStore";
import { formatDate } from "../../lib/formatters";

interface PhotoViewerEnhancedProps {
  photos: PhotoWithDetails[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  onDelete?: (photo: PhotoWithDetails) => void;
  getPhotoUrl: (photo: PhotoWithDetails) => string;
}

export function PhotoViewerEnhanced({
  photos,
  currentIndex,
  onClose,
  onNavigate,
  onDelete,
  getPhotoUrl,
}: PhotoViewerEnhancedProps) {
  const currentPhoto = photos[currentIndex];
  const hasMultiple = photos.length > 1;

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasMultiple) onNavigate("prev");
          break;
        case "ArrowRight":
          if (hasMultiple) onNavigate("next");
          break;
      }
    },
    [onClose, onNavigate, hasMultiple]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete && window.confirm("Haluatko varmasti poistaa tämän kuvan?")) {
      onDelete(currentPhoto);
    }
  };

  if (!currentPhoto) return null;

  // Build caption from photo details
  const captionParts: string[] = [];
  if (currentPhoto.athleteName) {
    captionParts.push(currentPhoto.athleteName);
  }
  if (currentPhoto.competitionName) {
    captionParts.push(currentPhoto.competitionName);
  }
  captionParts.push(formatDate(currentPhoto.createdAt));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.95)" }}
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-[#666666] hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
        title="Sulje (Esc)"
      >
        <X size={24} />
      </button>

      {/* Delete button */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-4 left-4 p-2 text-[#666666] hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors z-10"
          title="Poista kuva"
        >
          <Trash2 size={20} />
        </button>
      )}

      {/* Navigation buttons */}
      {hasMultiple && (
        <>
          <button
            onClick={() => onNavigate("prev")}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-[#666666] hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
            title="Edellinen (←)"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={() => onNavigate("next")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-[#666666] hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
            title="Seuraava (→)"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      {/* Main image */}
      <div className="flex flex-col items-center max-w-[90vw]">
        <img
          src={getPhotoUrl(currentPhoto)}
          alt={currentPhoto.originalName}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />

        {/* Caption below photo */}
        <div className="mt-4 text-center">
          <p className="text-[#888888] text-sm">
            {captionParts.join(" · ")}
          </p>
        </div>
      </div>

      {/* Photo counter and dots */}
      {hasMultiple && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="flex gap-1.5">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  const diff = index - currentIndex;
                  if (diff > 0) {
                    for (let i = 0; i < diff; i++) onNavigate("next");
                  } else if (diff < 0) {
                    for (let i = 0; i < Math.abs(diff); i++) onNavigate("prev");
                  }
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? "bg-white" : "bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
          <span className="text-white/50 text-xs">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>
      )}
    </div>
  );
}
