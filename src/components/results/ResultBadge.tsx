interface ResultBadgeProps {
  type: "pb" | "sb" | "nr";
}

export function ResultBadge({ type }: ResultBadgeProps) {
  if (type === "pb") {
    return <span className="badge-pb">OE</span>;
  }

  if (type === "sb") {
    return <span className="badge-sb">KE</span>;
  }

  return <span className="badge-nr">SE</span>;
}
