interface ResultBadgeProps {
  type: "pb" | "sb" | "nr" | "skill-a" | "skill-b" | "skill-c";
}

export function ResultBadge({ type }: ResultBadgeProps) {
  if (type === "pb") {
    return <span className="badge-pb">OE</span>;
  }

  if (type === "sb") {
    return <span className="badge-sb">KE</span>;
  }

  if (type === "nr") {
    return <span className="badge-nr">SE</span>;
  }

  // Skill marks (A, B, C)
  if (type === "skill-a") {
    return <span className="badge-skill">A</span>;
  }

  if (type === "skill-b") {
    return <span className="badge-skill">B</span>;
  }

  if (type === "skill-c") {
    return <span className="badge-skill">C</span>;
  }

  return null;
}
