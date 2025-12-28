import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { PhotoWithDetails } from "../../stores/usePhotoStore";
import { formatDate } from "../../lib/formatters";
import { Dialog } from "../ui/Dialog";

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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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

  const handleDeleteClick = () => {
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    setConfirmDeleteOpen(false);
    if (onDelete) {
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
  } else if (currentPhoto.eventName) {
    captionParts.push(currentPhoto.eventName);
  }
  captionParts.push(formatDate(currentPhoto.createdAt));

  const content = (
    <div
      className="photo-viewer-overlay"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10 cursor-pointer"
      >
        <X size={24} />
      </button>

      {/* Delete button */}
      {onDelete && (
        <button
          onClick={handleDeleteClick}
          className="absolute top-4 left-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10 cursor-pointer"
        >
          <Trash2 size={20} />
        </button>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Poista kuva"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-body text-muted-foreground">
            Haluatko varmasti poistaa tämän kuvan? Tätä toimintoa ei voi perua.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmDeleteOpen(false)}
              className="btn-secondary"
            >
              Peruuta
            </button>
            <button
              onClick={handleConfirmDelete}
              className="btn-primary"
            >
              Poista
            </button>
          </div>
        </div>
      </Dialog>

      {/* Main content with navigation */}
      <div className="photo-viewer-main" onClick={handleBackdropClick}>
        {/* Left navigation button */}
        <div className="photo-viewer-nav" onClick={handleBackdropClick}>
          {hasMultiple && (
            <button
              onClick={() => onNavigate("prev")}
              className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <ChevronLeft size={32} />
            </button>
          )}
        </div>

        {/* Image container */}
        <div className="photo-viewer-content">
          <img
            src={getPhotoUrl(currentPhoto)}
            alt={currentPhoto.originalName}
            className="photo-viewer-image rounded-lg shadow-2xl"
            loading="eager"
          />

          {/* Caption below photo */}
          <div className="mt-3 text-center">
            <p className="text-white/60 text-body">
              {captionParts.join(" · ")}
            </p>
          </div>
        </div>

        {/* Right navigation button */}
        <div className="photo-viewer-nav" onClick={handleBackdropClick}>
          {hasMultiple && (
            <button
              onClick={() => onNavigate("next")}
              className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <ChevronRight size={32} />
            </button>
          )}
        </div>
      </div>

      {/* Photo counter and dots */}
      {hasMultiple && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
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
          <span className="text-white/50 text-caption">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
