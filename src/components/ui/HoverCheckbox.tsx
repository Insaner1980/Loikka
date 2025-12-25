import { Check } from "lucide-react";

type ItemType = "kuva" | "tulos" | "tavoite" | "kilpailu";

interface HoverCheckboxProps {
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  itemType: ItemType;
  variant?: "card" | "image";
}

const ariaLabels: Record<ItemType, { select: string; deselect: string }> = {
  kuva: { select: "Valitse kuva", deselect: "Poista valinta" },
  tulos: { select: "Valitse tulos", deselect: "Poista valinta" },
  tavoite: { select: "Valitse tavoite", deselect: "Poista valinta" },
  kilpailu: { select: "Valitse kilpailu", deselect: "Poista valinta" },
};

export function HoverCheckbox({
  isSelected,
  onClick,
  itemType,
  variant = "card",
}: HoverCheckboxProps) {
  const labels = ariaLabels[itemType];

  // Different background styles for card (light bg) vs image (dark bg for visibility)
  const unselectedStyle =
    variant === "image"
      ? "bg-black/40 border-2 border-white/70 hover:border-white hover:bg-black/60"
      : "bg-background/80 border-2 border-border-hover hover:border-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer ${
        isSelected
          ? "bg-[var(--accent)] border-2 border-[var(--accent)] shadow-md"
          : unselectedStyle
      }`}
      aria-label={isSelected ? labels.deselect : labels.select}
    >
      {isSelected && (
        <Check size={14} className="text-[var(--btn-primary-text)]" strokeWidth={3} />
      )}
    </button>
  );
}
