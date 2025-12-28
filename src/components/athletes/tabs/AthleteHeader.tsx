import { Link } from "react-router-dom";
import { ArrowLeft, Edit, ChevronRight, Trash2 } from "lucide-react";
import { toAssetUrl, getAgeCategory, getInitials } from "../../../lib/formatters";
import type { Athlete } from "../../../types";

interface AthleteHeaderProps {
  athlete: Athlete;
  resultsCount: number;
  personalBestsCount: number;
  medalsCount: number;
  goldMedals?: number;
  silverMedals?: number;
  bronzeMedals?: number;
  sbCount?: number;
  nrCount?: number;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPhotoClick: () => void;
}

export function AthleteHeader({
  athlete,
  resultsCount,
  personalBestsCount,
  goldMedals = 0,
  silverMedals = 0,
  bronzeMedals = 0,
  sbCount = 0,
  nrCount = 0,
  onBack,
  onEdit,
  onDelete,
  onPhotoClick,
}: AthleteHeaderProps) {
  const hasMedals = goldMedals > 0 || silverMedals > 0 || bronzeMedals > 0;
  const hasRecords = personalBestsCount > 0 || sbCount > 0 || nrCount > 0;

  return (
    <div className="flex items-start gap-4 mb-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-tertiary hover:text-foreground transition-colors duration-150 shrink-0 mt-1"
        aria-label="Takaisin"
      >
        <ArrowLeft size={20} />
      </button>

      {/* Profile photo */}
      {athlete.photoPath ? (
        <button
          onClick={onPhotoClick}
          className="w-20 h-20 rounded-full overflow-hidden shrink-0 hover:ring-2 hover:ring-[var(--accent)] transition-all duration-150 cursor-pointer"
        >
          <img
            src={toAssetUrl(athlete.photoPath)}
            alt={`${athlete.firstName} ${athlete.lastName}`}
            className="w-full h-full object-cover"
            loading="eager"
          />
        </button>
      ) : (
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-initials shrink-0">
          <span className="text-stat font-medium">
            {getInitials(athlete.firstName, athlete.lastName)}
          </span>
        </div>
      )}

      {/* Medals - vertical stack next to avatar */}
      {hasMedals && (
        <div className="flex flex-col gap-1 shrink-0 mt-3">
          {goldMedals > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-gold" />
              <span className="text-default font-medium text-foreground">{goldMedals}</span>
            </span>
          )}
          {silverMedals > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-silver" />
              <span className="text-default font-medium text-foreground">{silverMedals}</span>
            </span>
          )}
          {bronzeMedals > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-bronze" />
              <span className="text-default font-medium text-foreground">{bronzeMedals}</span>
            </span>
          )}
        </div>
      )}

      {/* Name and details */}
      <div className="flex-1 min-w-0">
        <h1 className="text-title font-semibold text-foreground truncate">
          {athlete.firstName} {athlete.lastName}
        </h1>
        <div className="text-body text-muted-foreground mt-0.5">
          {getAgeCategory(athlete.birthYear)}
        </div>
        {athlete.clubName && (
          <div className="text-body text-muted-foreground">
            {athlete.clubName}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-body text-muted-foreground">
            {resultsCount} tulosta
          </span>
          {hasRecords && (
            <div className="flex items-center gap-1.5">
              {personalBestsCount > 0 && (
                <span className="badge-pb">{personalBestsCount} OE</span>
              )}
              {sbCount > 0 && (
                <span className="badge-sb">{sbCount} KE</span>
              )}
              {nrCount > 0 && (
                <span className="badge-nr">{nrCount} SE</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to={`/photos?athlete=${athlete.id}`}
          className="text-body text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center gap-0.5 transition-colors duration-150 cursor-pointer"
        >
          Kuvat <ChevronRight size={14} />
        </Link>
        <button
          onClick={onEdit}
          className="btn-secondary btn-press"
        >
          <Edit size={16} />
          Muokkaa
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
