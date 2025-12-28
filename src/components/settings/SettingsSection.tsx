import { ReactNode } from "react";

interface SettingsSectionProps {
  title?: ReactNode;
  children: ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section className="bg-card border border-border rounded-xl p-6">
      {title && <h2 className="text-title font-semibold mb-4">{title}</h2>}
      <div className="space-y-4">{children}</div>
    </section>
  );
}
