import { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
