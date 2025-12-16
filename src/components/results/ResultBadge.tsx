import { Star } from "lucide-react";

interface ResultBadgeProps {
  type: "pb" | "sb";
}

export function ResultBadge({ type }: ResultBadgeProps) {
  if (type === "pb") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gold text-black">
        SE
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-primary/20 text-primary">
      <Star size={12} className="fill-current" />
      KE
    </span>
  );
}
