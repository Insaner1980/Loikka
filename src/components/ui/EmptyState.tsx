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

export function EmptyState({
  type = "generic",
  icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  const Icon = icon || typeIcons[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <Icon size={48} className="text-[#444444] mb-5" />
      <h2 className="text-sm font-medium text-[#666666] mb-1.5">{title}</h2>
      <p className="text-[13px] text-[#555555] mb-6 max-w-md">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary btn-press"
        >
          {action.label}
        </button>
      )}
      {children}
    </div>
  );
}
