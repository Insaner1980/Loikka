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
          `relative flex items-center justify-center w-9 h-9 transition-colors duration-150
          ${
            isActive
              ? "text-foreground"
              : "text-text-tertiary hover:text-text-secondary"
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-foreground rounded-r" />
            )}
            <Icon size={20} strokeWidth={1.75} />
          </>
        )}
      </NavLink>
    </Tooltip>
  );
}
