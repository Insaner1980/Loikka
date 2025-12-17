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
  { icon: Home, path: "/" },
  { icon: Users, path: "/athletes" },
  { icon: ClipboardList, path: "/results" },
  { icon: Calendar, path: "/calendar" },
  { icon: TrendingUp, path: "/statistics" },
  { icon: Target, path: "/goals" },
  { icon: Image, path: "/photos" },
];

export function Sidebar() {
  return (
    <aside className="w-12 h-full flex flex-col py-4 pb-6">
      {/* Top spacer */}
      <div className="flex-1" />

      {/* Navigation items - centered */}
      <nav className="flex flex-col items-center gap-1 px-1.5">
        {navigationItems.map((item) => (
          <SidebarIcon
            key={item.path}
            icon={item.icon}
            path={item.path}
          />
        ))}
      </nav>

      {/* Separator */}
      <div className="my-3 mx-3 border-t border-white/[0.06]" />

      {/* Bottom spacer */}
      <div className="flex-1" />

      {/* Sync indicator and Settings at bottom */}
      <div className="flex flex-col items-center gap-1 px-1.5">
        <SyncIndicator />
        <SidebarIcon
          icon={Settings}
          path="/settings"
        />
      </div>
    </aside>
  );
}
