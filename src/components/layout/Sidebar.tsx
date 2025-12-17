import {
  Home,
  Users,
  ClipboardList,
  Calendar,
  TrendingUp,
  Target,
  Image,
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
  { icon: Image, label: "Kuvat", path: "/photos" },
];

export function Sidebar() {
  return (
    <aside className="w-12 h-screen flex flex-col py-4">
      {/* Navigation items */}
      <nav className="flex-1 flex flex-col items-center gap-1 px-1.5">
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
      <div className="flex flex-col items-center gap-1 px-1.5">
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
