interface ResultBadgeProps {
  type: "pb" | "sb";
}

export function ResultBadge({ type }: ResultBadgeProps) {
  if (type === "pb") {
    return <span className="badge-pb">SE</span>;
  }

  return <span className="badge-sb">KE</span>;
}
