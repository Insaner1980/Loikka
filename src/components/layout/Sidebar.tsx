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
import logoIcon from "../../assets/icon-transparent.svg";

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
    <aside className="w-14 h-full flex flex-col py-4 pb-6 pl-1 relative">
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
      <div className="my-3 mx-3 border-t border-border" />

      {/* Bottom spacer */}
      <div className="flex-1" />

      {/* Settings - above bottom logo */}
      <div className="flex flex-col items-center gap-1 px-1.5 mb-2">
        <SidebarIcon
          icon={Settings}
          path="/settings"
        />
      </div>

      {/* Bottom logo - flipped vertically */}
      <div className="absolute bottom-0 left-0">
        <img
          src={logoIcon}
          alt=""
          className="w-12 h-12 -scale-y-100"
          loading="eager"
        />
      </div>
    </aside>
  );
}
