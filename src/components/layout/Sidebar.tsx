import {
  Home,
  Users,
  ClipboardList,
  Calendar,
  TrendingUp,
  Target,
  Settings,
} from "lucide-react";
import { SidebarIcon } from "./SidebarIcon";
import { SyncIndicator } from "./SyncIndicator";

const navigationItems = [
  { icon: Home, label: "Etusivu", path: "/" },
  { icon: Users, label: "Urheilijat", path: "/athletes" },
  { icon: ClipboardList, label: "Tulokset", path: "/results" },
  { icon: Calendar, label: "Kalenteri", path: "/calendar" },
  { icon: TrendingUp, label: "Tilastot", path: "/statistics" },
  { icon: Target, label: "Tavoitteet", path: "/goals" },
];

export function Sidebar() {
  return (
    <aside className="w-16 h-screen bg-sidebar border-r border-border flex flex-col">
      {/* Navigation items */}
      <nav className="flex-1 flex flex-col items-center gap-2 pt-4 px-2">
        {navigationItems.map((item) => (
          <SidebarIcon
            key={item.path}
            icon={item.icon}
            label={item.label}
            path={item.path}
          />
        ))}
      </nav>

      {/* Sync indicator and Settings at bottom */}
      <div className="flex flex-col items-center gap-2 pb-4 px-2">
        <SyncIndicator />
        <SidebarIcon
          icon={Settings}
          label="Asetukset"
          path="/settings"
        />
      </div>
    </aside>
  );
}
