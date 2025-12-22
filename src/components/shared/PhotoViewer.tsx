import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { Photo } from "../../hooks";

interface PhotoViewerProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  onDelete?: (photo: Photo) => void;
  getPhotoUrl: (photo: Photo) => string;
}

export function PhotoViewer({
  photos,
  currentIndex,
  onClose,
  onNavigate,
  onDelete,
  getPhotoUrl,
}: PhotoViewerProps) {
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
    // Prevent body scroll when viewer is open
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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10 cursor-pointer"
      >
        <X size={24} />
      </button>

      {/* Action buttons */}
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        {onDelete && (
          <button
            onClick={handleDelete}
            className="p-2 text-white/70 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Navigation buttons */}
      {hasMultiple && (
        <>
          <button
            onClick={() => onNavigate("prev")}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10 cursor-pointer"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={() => onNavigate("next")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10 cursor-pointer"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      {/* Main image */}
      <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center">
        <img
          src={getPhotoUrl(currentPhoto)}
          alt={currentPhoto.originalName}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />
      </div>

      {/* Photo info and counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        {hasMultiple && (
          <div className="flex gap-1.5">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  const direction = index > currentIndex ? "next" : "prev";
                  const steps = Math.abs(index - currentIndex);
                  for (let i = 0; i < steps; i++) {
                    onNavigate(direction);
                  }
                }}
                className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${
                  index === currentIndex ? "bg-white" : "bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
        <div className="px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg">
          <span className="text-white/80 text-sm">
            {currentPhoto.originalName}
            {hasMultiple && (
              <span className="text-white/50 ml-2">
                ({currentIndex + 1} / {photos.length})
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
