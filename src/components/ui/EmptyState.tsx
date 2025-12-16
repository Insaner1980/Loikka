import { ReactNode } from "react";
import {
  Users,
  Trophy,
  Calendar,
  Target,
  BarChart3,
  ImageIcon,
  FileText,
  type LucideIcon,
} from "lucide-react";

type EmptyStateType =
  | "athletes"
  | "results"
  | "competitions"
  | "goals"
  | "statistics"
  | "photos"
  | "generic";

interface EmptyStateProps {
  type?: EmptyStateType;
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

const typeIcons: Record<EmptyStateType, LucideIcon> = {
  athletes: Users,
  results: Trophy,
  competitions: Calendar,
  goals: Target,
  statistics: BarChart3,
  photos: ImageIcon,
  generic: FileText,
};

const typeColors: Record<EmptyStateType, string> = {
  athletes: "bg-blue-500/10 text-blue-500",
  results: "bg-yellow-500/10 text-yellow-500",
  competitions: "bg-purple-500/10 text-purple-500",
  goals: "bg-green-500/10 text-green-500",
  statistics: "bg-orange-500/10 text-orange-500",
  photos: "bg-pink-500/10 text-pink-500",
  generic: "bg-muted text-muted-foreground",
};

export function EmptyState({
  type = "generic",
  icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  const Icon = icon || typeIcons[type];
  const colorClass = typeColors[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div
        className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${colorClass}`}
      >
        <Icon size={40} />
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-secondary font-medium rounded-xl hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
        >
          {action.label}
        </button>
      )}
      {children}
    </div>
  );
}
