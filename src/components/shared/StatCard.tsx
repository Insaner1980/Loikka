import { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  highlight?: boolean;
}

export function StatCard({ icon, value, label, highlight }: StatCardProps) {
  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border border-border
        ${highlight ? "bg-primary/10" : "bg-card"}`}
    >
      <div
        className={`flex items-center justify-center w-12 h-12 rounded-xl
          ${highlight ? "bg-primary text-secondary" : "bg-muted text-muted-foreground"}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
