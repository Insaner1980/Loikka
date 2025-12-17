import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TitleBar } from "./TitleBar";
import { useReminders } from "../../hooks";

export function Layout() {
  // Initialize reminders system - checks for notifications on app startup
  useReminders();

  return (
    <div className="flex flex-col h-screen bg-background">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
