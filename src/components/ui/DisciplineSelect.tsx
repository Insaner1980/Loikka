import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import type { Discipline } from "../../types";
import {
  categoryLabels,
  categoryOrder,
  getDisciplinesForAthlete,
  getDisciplinesByCategoryForAge,
  getDisciplinesByCategory,
  getAgeCategoryFromBirthYear,
  ageCategoryLabels,
} from "../../data/disciplines";
import { useDropdownPosition } from "../../hooks";

interface DisciplineSelectProps {
  value: number | "";
  onChange: (value: number | "") => void;
  birthYear?: number;
  date?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export function DisciplineSelect({
  value,
  onChange,
  birthYear,
  date,
  disabled = false,
  className = "",
}: DisciplineSelectProps) {
  const [showAll, setShowAll] = useState(false);
  const {
    isOpen,
    toggle,
    close,
    containerRef,
    dropdownRef,
    dropdownStyle,
  } = useDropdownPosition();

  // Get the age category label
  const ageCategoryLabel = useMemo(() => {
    if (!birthYear) return null;
    const category = getAgeCategoryFromBirthYear(birthYear, date);
    return ageCategoryLabels[category];
  }, [birthYear, date]);

  // Get disciplines grouped by category
  const groupedDisciplines = useMemo(() => {
    if (!birthYear || showAll) {
      return getDisciplinesByCategory();
    }
    return getDisciplinesByCategoryForAge(birthYear, date);
  }, [birthYear, date, showAll]);

  // Get available discipline IDs for highlighting
  const availableIds = useMemo(() => {
    if (!birthYear) return new Set<number>();
    const ageDisciplines = getDisciplinesForAthlete(birthYear, date);
    return new Set(ageDisciplines.map((d) => d.id));
  }, [birthYear, date]);

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
    if (!value) return "Valitse laji";
    for (const group of options) {
      const found = group.disciplines.find((d) => d.id === value);
      if (found) return found.name;
    }
    // If not found in current options, search all disciplines
    const allDisciplines = getDisciplinesByCategory();
    for (const disciplines of allDisciplines.values()) {
      const found = disciplines.find((d) => d.id === value);
      if (found) return found.name;
    }
    return "Valitse laji";
  }, [value, options]);

  const handleSelect = (disciplineId: number) => {
    onChange(disciplineId);
    close();
  };

  const handleShowAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setShowAll(e.target.checked);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Custom select button */}
      <button
        type="button"
        onClick={() => !disabled && toggle()}
        disabled={disabled}
        className={`w-full bg-card border border-border rounded-lg px-3 py-2 text-body text-left flex items-center justify-between focus:outline-none disabled:opacity-50 cursor-pointer transition-all duration-150 ${isOpen ? "border-accent shadow-[0_0_0_2px_var(--accent-muted)]" : ""} ${className}`}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {selectedName}
        </span>
        <ChevronDown
          size={16}
          className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown - rendered as portal to escape overflow:hidden */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="dropdown-menu"
        >
          {/* Show all checkbox */}
          {birthYear && (
            <div className="sticky top-0 z-10 bg-card border-b border-border-subtle px-3 py-2">
              <label className="flex items-center gap-2 cursor-pointer text-caption text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={handleShowAllChange}
                  className="w-3.5 h-3.5 rounded border-border-default bg-elevated accent-accent"
                />
                Näytä kaikki lajit
                {!showAll && ageCategoryLabel && (
                  <span className="ml-auto">{ageCategoryLabel}</span>
                )}
              </label>
            </div>
          )}

          {/* Options */}
          {options.map((group) => (
            <div key={group.categoryKey}>
              <div className="px-3 py-1.5 text-caption font-semibold text-muted-foreground bg-muted sticky top-0">
                {group.category}
              </div>
              {group.disciplines.map((discipline) => {
                const isAvailable = availableIds.has(discipline.id);
                return (
                  <button
                    key={discipline.id}
                    type="button"
                    onClick={() => handleSelect(discipline.id)}
                    className={`w-full px-3 py-1.5 text-left text-body hover:bg-card-hover transition-colors cursor-pointer ${
                      showAll && !isAvailable ? "text-muted-foreground" : ""
                    }`}
                  >
                    {discipline.name}
                    {showAll && !isAvailable && " *"}
                  </button>
                );
              })}
            </div>
          ))}

          {showAll && birthYear && (
            <div className="sticky bottom-0 bg-card border-t border-border-subtle px-3 py-1.5 text-caption text-muted-foreground">
              * = ei virallinen ikäluokalle
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
