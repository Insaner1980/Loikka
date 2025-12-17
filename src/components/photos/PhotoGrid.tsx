import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { PhotoWithDetails } from "../../stores/usePhotoStore";
import { formatDate } from "../../lib/formatters";

interface PhotoGridProps {
  photos: PhotoWithDetails[];
  loading?: boolean;
  onPhotoClick: (index: number) => void;
  getThumbnailUrl: (photo: PhotoWithDetails) => string;
  emptyIcon?: ReactNode;
  emptyMessage?: string;
  emptySubMessage?: string;
  columns?: number;
}

export function PhotoGrid({
  photos,
  loading = false,
  onPhotoClick,
  getThumbnailUrl,
  emptyIcon,
  emptyMessage = "Ei kuvia",
  emptySubMessage,
  columns = 5,
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
        <h2 className="text-sm font-medium text-[#666666] mb-1.5">{emptyMessage}</h2>
        {emptySubMessage && (
          <p className="text-[13px] text-[#555555]">{emptySubMessage}</p>
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
          onClick={() => onPhotoClick(index)}
        />
      ))}
    </div>
  );
}

interface PhotoThumbnailProps {
  photo: PhotoWithDetails;
  thumbnailUrl: string;
  onClick: () => void;
}

function PhotoThumbnail({ photo, thumbnailUrl, onClick }: PhotoThumbnailProps) {
  const displayName = photo.athleteName || photo.competitionName || "";
  const dateStr = formatDate(photo.createdAt);

  return (
    <div className="group cursor-pointer" onClick={onClick}>
      {/* Thumbnail container */}
      <div className="relative aspect-square rounded-lg overflow-hidden bg-[#141414]">
        <img
          src={thumbnailUrl}
          alt={photo.originalName}
          className="w-full h-full object-cover transition-transform duration-150 group-hover:scale-[1.02]"
          loading="lazy"
        />

        {/* Hover overlay with date */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-end justify-center pb-2">
          <span className="text-xs text-white/90">{dateStr}</span>
        </div>
      </div>

      {/* Caption below */}
      <div className="mt-1.5 px-0.5">
        <p className="text-xs text-[#666666] truncate">
          {dateStr}
          {displayName && ` · ${displayName}`}
        </p>
      </div>
    </div>
  );
}
