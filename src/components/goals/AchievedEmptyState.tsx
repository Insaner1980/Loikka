import { Check } from "lucide-react";

export function AchievedEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
      <Check size={48} className="mb-4 text-tertiary" />
      <p className="text-body font-medium">
        Ei saavutettuja tavoitteita
      </p>
      <p className="text-body text-tertiary mt-1">
        Saavutetut tavoitteet näkyvät täällä
      </p>
    </div>
  );
}
