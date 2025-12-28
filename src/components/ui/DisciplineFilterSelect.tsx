import { useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import type { Discipline } from "../../types";
import { categoryLabels, categoryOrder } from "../../data/disciplines";
import { useDropdownPosition } from "../../hooks";

interface DisciplineFilterSelectProps {
  value: number | null;
  onChange: (value: number | null) => void;
  disciplines: Discipline[];
  placeholder?: string;
  showPlaceholderOption?: boolean;
  className?: string;
  /** Minimum dropdown width in pixels */
  minWidth?: number;
}

export function DisciplineFilterSelect({
  value,
  onChange,
  disciplines,
  placeholder = "Kaikki lajit",
  showPlaceholderOption = true,
  className = "",
  minWidth,
}: DisciplineFilterSelectProps) {
  const {
    isOpen,
    toggle,
    close,
    containerRef,
    dropdownRef,
    dropdownStyle,
  } = useDropdownPosition(minWidth !== undefined ? { minWidth } : undefined);

  // Group disciplines by category
  const groupedDisciplines = useMemo(() => {
    const byCategory = new Map<string, Discipline[]>();
    for (const discipline of disciplines) {
      const existing = byCategory.get(discipline.category) || [];
      existing.push(discipline);
      byCategory.set(discipline.category, existing);
    }
    // Sort within each category by ID
    for (const [category, list] of byCategory) {
      byCategory.set(category, list.sort((a, b) => a.id - b.id));
    }
    return byCategory;
  }, [disciplines]);

  // Build options sorted by category order
  const options = useMemo(() => {
    const result: { category: string; categoryKey: string; disciplines: Discipline[] }[] = [];

    for (const category of categoryOrder) {
      const categoryDisciplines = groupedDisciplines.get(category);
      if (categoryDisciplines && categoryDisciplines.length > 0) {
        result.push({
          category: categoryLabels[category],
          categoryKey: category,
          disciplines: categoryDisciplines,
        });
      }
    }

    return result;
  }, [groupedDisciplines]);

  // Get selected discipline name
  const selectedName = useMemo(() => {
    if (!value) return placeholder;
    for (const group of options) {
      const found = group.disciplines.find((d) => d.id === value);
      if (found) return found.name;
    }
    return placeholder;
  }, [value, options, placeholder]);

  const handleSelect = (disciplineId: number | null) => {
    onChange(disciplineId);
    close();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Custom select button */}
      <button
        type="button"
        onClick={toggle}
        className={`bg-card border border-border rounded-md px-3 py-2 text-body text-left flex items-center justify-between gap-2 focus:outline-none cursor-pointer transition-all duration-150 ${isOpen ? "border-accent shadow-[0_0_0_2px_var(--accent-muted)]" : ""} ${className}`}
      >
        <span className="text-foreground">
          {selectedName}
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
          {/* All option (placeholder) */}
          {showPlaceholderOption && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full px-3 py-1.5 text-left text-body hover:bg-card-hover transition-colors cursor-pointer"
            >
              {placeholder}
            </button>
          )}

          {/* Options grouped by category */}
          {options.map((group) => (
            <div key={group.categoryKey}>
              <div className="px-3 py-1.5 text-caption font-semibold text-muted-foreground bg-muted sticky top-0">
                {group.category}
              </div>
              {group.disciplines.map((discipline) => (
                <button
                  key={discipline.id}
                  type="button"
                  onClick={() => handleSelect(discipline.id)}
                  className="w-full px-3 py-1.5 text-left text-body hover:bg-card-hover transition-colors cursor-pointer"
                >
                  {discipline.name}
                </button>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
