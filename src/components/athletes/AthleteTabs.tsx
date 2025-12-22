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
    <div className="border-b border-border-subtle">
      <nav className="flex gap-1 -mb-px" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2.5 text-body font-medium border-b transition-colors duration-150 cursor-pointer ${
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-tertiary hover:text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
