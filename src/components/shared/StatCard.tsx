import { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
}

export function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="p-5 rounded-xl bg-card border border-border-subtle hover:border-border-hover transition-colors duration-150">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-success">
          {icon}
        </div>
      </div>
      <div className="text-hero-stat font-medium text-foreground mb-1">
        {value}
      </div>
      <div className="text-body text-muted-foreground">{label}</div>
    </div>
  );
}
