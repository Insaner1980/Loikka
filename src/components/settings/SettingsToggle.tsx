interface SettingsToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
}: SettingsToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <span className="text-body font-medium text-foreground">{label}</span>
        {description && (
          <p className="text-body text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-150 cursor-pointer ${
          checked ? "bg-[var(--accent)]" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-150 ${
            checked ? "translate-x-[18px]" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
