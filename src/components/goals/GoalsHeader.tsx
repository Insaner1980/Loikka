import { Plus, Trash2, X } from "lucide-react";

interface GoalsHeaderProps {
  selectionMode: boolean;
  selectedCount: number;
  onAddClick: () => void;
  onDeleteClick: () => void;
  onCancelSelection: () => void;
}

export function GoalsHeader({
  selectionMode,
  selectedCount,
  onAddClick,
  onDeleteClick,
  onCancelSelection,
}: GoalsHeaderProps) {
  const hasSelection = selectedCount > 0;

  if (selectionMode) {
    return (
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-border-subtle">
        <h1 className="text-title font-medium text-foreground">
          {hasSelection ? `${selectedCount} valittu` : "Valitse tavoitteita"}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onDeleteClick}
            disabled={!hasSelection}
            className="btn-secondary btn-press"
          >
            <Trash2 size={16} />
            Poista
          </button>
          <button
            onClick={onCancelSelection}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Peruuta valinta"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-6 pb-5 border-b border-border-subtle">
      <h1 className="text-title font-medium text-foreground">Tavoitteet</h1>
      <button
        onClick={onAddClick}
        className="btn-primary btn-press"
      >
        <Plus size={18} />
        Lisää tavoite
      </button>
    </div>
  );
}
