import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TitleBar } from "./TitleBar";
import { useAthleteStore } from "../../stores/useAthleteStore";
import { useResultStore } from "../../stores/useResultStore";
import { useCompetitionStore } from "../../stores/useCompetitionStore";
import { useGoalStore } from "../../stores/useGoalStore";
import { useNavigationShortcuts } from "../../hooks";

export function Layout() {
  const fetchAthletes = useAthleteStore((s) => s.fetchAthletes);
  const fetchResults = useResultStore((s) => s.fetchResults);
  const fetchCompetitions = useCompetitionStore((s) => s.fetchCompetitions);
  const fetchGoals = useGoalStore((s) => s.fetchGoals);

  // Global keyboard shortcuts for navigation (1-8)
  useNavigationShortcuts();

  // Fetch all data on app start (stores skip if already loaded)
  useEffect(() => {
    fetchAthletes();
    fetchResults();
    fetchCompetitions();
    fetchGoals();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
