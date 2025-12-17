import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface SidebarIconProps {
  icon: LucideIcon;
  path: string;
}

export function SidebarIcon({ icon: Icon, path }: SidebarIconProps) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `relative flex items-center justify-center w-9 h-9 transition-colors duration-150
        ${
          isActive
            ? "text-[#10B981]"
            : "text-text-tertiary hover:text-text-secondary"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-[30px] bg-[#10B981] rounded-r" />
          )}
          <Icon size={30} strokeWidth={1.5} />
        </>
      )}
    </NavLink>
  );
}
