import { ReactNode, useCallback } from "react";
import { Loader2 } from "lucide-react";
import type { PhotoWithDetails } from "../../stores/usePhotoStore";
import { formatDate } from "../../lib/formatters";
import { HoverCheckbox } from "../ui";

interface PhotoGridProps {
  photos: PhotoWithDetails[];
  loading?: boolean;
  onPhotoClick: (index: number, event: React.MouseEvent) => void;
  onCheckboxClick: (index: number, event: React.MouseEvent) => void;
  getThumbnailUrl: (photo: PhotoWithDetails) => string;
  emptyIcon?: ReactNode;
  emptyMessage?: string;
  emptySubMessage?: string;
  columns?: number;
  selectionMode?: boolean;
  selectedIds?: Set<number>;
}

export function PhotoGrid({
  photos,
  loading = false,
  onPhotoClick,
  onCheckboxClick,
  getThumbnailUrl,
  emptyIcon,
  emptyMessage = "Ei kuvia",
  emptySubMessage,
  columns = 5,
  selectionMode = false,
  selectedIds = new Set(),
}: PhotoGridProps) {
  if (loading && photos.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={32} className="text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        {emptyIcon && <div className="mb-4">{emptyIcon}</div>}
        <h2 className="text-sm font-medium text-muted-foreground mb-1.5">{emptyMessage}</h2>
        {emptySubMessage && (
          <p className="text-body text-tertiary">{emptySubMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {photos.map((photo, index) => (
        <PhotoThumbnail
          key={photo.id}
          photo={photo}
          thumbnailUrl={getThumbnailUrl(photo)}
          onClick={(e) => onPhotoClick(index, e)}
          onCheckboxClick={(e) => onCheckboxClick(index, e)}
          selectionMode={selectionMode}
          isSelected={selectedIds.has(photo.id)}
        />
      ))}
    </div>
  );
}

interface PhotoThumbnailProps {
  photo: PhotoWithDetails;
  thumbnailUrl: string;
  onClick: (event: React.MouseEvent) => void;
  onCheckboxClick: (event: React.MouseEvent) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
}

function PhotoThumbnail({
  photo,
  thumbnailUrl,
  onClick,
  onCheckboxClick,
  selectionMode = false,
  isSelected = false,
}: PhotoThumbnailProps) {
  // Prefer event name (custom competition name), then actual competition, then athlete
  const displayName = photo.eventName || photo.competitionName || photo.athleteName || "";
  const dateStr = formatDate(photo.createdAt);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckboxClick(e);
  }, [onCheckboxClick]);

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    // If Ctrl is held, treat as checkbox click
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation();
      onCheckboxClick(e);
      return;
    }
    onClick(e);
  }, [onClick, onCheckboxClick]);

  return (
    <div
      data-card
      className="group cursor-pointer"
      onClick={handleImageClick}
    >
      {/* Thumbnail container */}
      <div className={`relative aspect-square rounded-lg overflow-hidden bg-card ${
        isSelected ? "ring-2 ring-[var(--accent)]" : ""
      }`}>
        <img
          src={thumbnailUrl}
          alt={photo.originalName}
          width={300}
          height={300}
          className={`w-full h-full object-cover transition-all duration-150 ${
            selectionMode ? "" : "group-hover:scale-[1.02]"
          } ${isSelected ? "opacity-80" : ""}`}
          loading="eager"
        />

        {/* Hover checkbox - visible on hover or when selected - positioned at top right */}
        <div
          className={`absolute top-2 right-2 z-10 transition-all duration-200 ${
            isSelected
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto"
          }`}
        >
          <HoverCheckbox
            isSelected={isSelected}
            onClick={handleCheckboxClick}
            itemType="kuva"
            variant="image"
          />
        </div>

              </div>

      {/* Caption below */}
      <div className="mt-1.5 px-0.5">
        <p className="text-xs text-muted-foreground truncate">
          {dateStr}
          {displayName && ` · ${displayName}`}
        </p>
      </div>
    </div>
  );
}
