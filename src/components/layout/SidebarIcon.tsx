import { NavLink } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";

interface SidebarIconProps {
  icon: LucideIcon;
  label: string;
  path: string;
}

export function SidebarIcon({ icon: Icon, label, path }: SidebarIconProps) {
  return (
    <Tooltip content={label} side="right">
      <NavLink
        to={path}
        className={({ isActive }) =>
          `flex items-center justify-center w-11 h-11 rounded-xl transition-colors
          ${
            isActive
              ? "bg-primary text-secondary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`
        }
      >
        <Icon size={22} strokeWidth={2} />
      </NavLink>
    </Tooltip>
  );
}
