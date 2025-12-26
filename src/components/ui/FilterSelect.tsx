import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { useDropdownPosition } from "../../hooks";

export interface FilterOption {
  value: string | number;
  label: string;
}

interface FilterSelectProps {
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  options: FilterOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder = "Valitse",
  className = "",
  disabled = false,
}: FilterSelectProps) {
  const {
    isOpen,
    toggle,
    close,
    containerRef,
    dropdownRef,
    dropdownStyle,
  } = useDropdownPosition();

  // Get selected option label
  const selectedLabel = value !== null
    ? options.find((o) => o.value === value)?.label ?? placeholder
    : placeholder;

  const handleSelect = (optionValue: string | number | null) => {
    onChange(optionValue);
    close();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Custom select button */}
      <button
        type="button"
        onClick={() => !disabled && toggle()}
        disabled={disabled}
        className={`bg-card border border-border rounded-md px-3 py-2 text-body text-left flex items-center justify-between gap-2 focus:outline-none transition-all duration-150 ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${isOpen ? "border-accent shadow-[0_0_0_2px_var(--accent-muted)]" : ""} ${className}`}
      >
        <span className="text-foreground">
          {selectedLabel}
        </span>
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown - rendered as portal */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="dropdown-menu"
        >
          {/* Options */}
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full px-3 py-1.5 text-left text-body hover:bg-card-hover transition-colors cursor-pointer ${
                  isSelected ? "bg-accent-muted text-accent" : ""
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
