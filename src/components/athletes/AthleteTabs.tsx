export type AthleteTab =
  | "records"
  | "results"
  | "medals"
  | "progress"
  | "goals";

interface AthleteTabsProps {
  activeTab: AthleteTab;
  onTabChange: (tab: AthleteTab) => void;
}

const tabs: { id: AthleteTab; label: string }[] = [
  { id: "records", label: "Ennätykset" },
  { id: "results", label: "Tulokset" },
  { id: "medals", label: "Mitalit" },
  { id: "progress", label: "Kehitys" },
  { id: "goals", label: "Tavoitteet" },
];

export function AthleteTabs({ activeTab, onTabChange }: AthleteTabsProps) {
  return (
    <div className="border-b border-border">
      <nav className="flex gap-1 -mb-px" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
