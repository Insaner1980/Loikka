import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  parse,
  isValid,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isBefore,
  isAfter,
} from "date-fns";
import { fi } from "date-fns/locale";

interface DatePickerProps {
  id?: string;
  value: string; // ISO format: YYYY-MM-DD
  onChange: (date: string) => void;
  min?: string; // Minimum date (ISO format)
  max?: string; // Maximum date (ISO format)
  error?: boolean;
  placeholder?: string;
}

const weekDays = ["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"];

export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  error,
  placeholder = "pp.kk.vvvv",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const date = new Date(value);
      if (isValid(date)) return date;
    }
    return new Date();
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Parse min/max dates
  const minDate = useMemo(() => (min ? new Date(min) : undefined), [min]);
  const maxDate = useMemo(() => (max ? new Date(max) : undefined), [max]);

  // Sync input value with prop value
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (isValid(date)) {
        setInputValue(format(date, "dd.MM.yyyy"));
      }
    } else {
      setInputValue("");
    }
  }, [value]);

  // Update current month when value changes
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (isValid(date)) {
        setCurrentMonth(date);
      }
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);

      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownWidth = 280;
      const dropdownHeight = 295; // approximate height (without Today button)

      // Find the dialog container to constrain within
      const dialog = containerRef.current.closest('[role="dialog"]');
      const dialogRect = dialog?.getBoundingClientRect();

      // Use dialog bounds if available, otherwise window bounds
      const rightBound = dialogRect ? dialogRect.right - 20 : window.innerWidth - 16;
      const leftBound = dialogRect ? dialogRect.left + 20 : 16;

      // Calculate horizontal position - align to left edge of input
      let left = rect.left;

      // If dropdown would overflow right bound, align to right edge of input
      if (left + dropdownWidth > rightBound) {
        left = rect.right - dropdownWidth;
      }

      // Ensure it doesn't go past left bound
      if (left < leftBound) {
        left = leftBound;
      }

      // Calculate vertical position
      let top = rect.bottom + 4;
      if (top + dropdownHeight > window.innerHeight - 16) {
        // Not enough space below, position above
        top = rect.top - dropdownHeight - 4;
      }

      setDropdownStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${dropdownWidth}px`,
      });
    }
  }, [isOpen]);

  // Get calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Check if a date is disabled (outside min/max range)
  const isDateDisabled = (date: Date): boolean => {
    if (minDate && isBefore(date, minDate)) return true;
    if (maxDate && isAfter(date, maxDate)) return true;
    return false;
  };

  // Handle input change (manual typing)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Try to parse the date in Finnish format (dd.MM.yyyy)
    if (newValue.length === 10) {
      const parsed = parse(newValue, "dd.MM.yyyy", new Date());
      if (isValid(parsed) && !isDateDisabled(parsed)) {
        onChange(format(parsed, "yyyy-MM-dd"));
        setCurrentMonth(parsed);
      }
    }

    // Also try ISO format (yyyy-MM-dd)
    if (newValue.length === 10 && newValue.includes("-")) {
      const parsed = new Date(newValue);
      if (isValid(parsed) && !isDateDisabled(parsed)) {
        onChange(format(parsed, "yyyy-MM-dd"));
        setCurrentMonth(parsed);
      }
    }
  };

  // Handle input blur - validate and format
  const handleInputBlur = () => {
    if (!inputValue.trim()) {
      onChange("");
      return;
    }

    // Try to parse Finnish format
    let parsed = parse(inputValue, "dd.MM.yyyy", new Date());

    // Try ISO format
    if (!isValid(parsed)) {
      parsed = new Date(inputValue);
    }

    // Try without leading zeros (d.M.yyyy)
    if (!isValid(parsed)) {
      parsed = parse(inputValue, "d.M.yyyy", new Date());
    }

    if (isValid(parsed) && !isDateDisabled(parsed)) {
      onChange(format(parsed, "yyyy-MM-dd"));
      setInputValue(format(parsed, "dd.MM.yyyy"));
    } else if (value) {
      // Reset to previous valid value
      const date = new Date(value);
      if (isValid(date)) {
        setInputValue(format(date, "dd.MM.yyyy"));
      }
    } else {
      setInputValue("");
    }
  };

  // Handle day selection
  const handleDayClick = (date: Date) => {
    if (isDateDisabled(date)) return;

    onChange(format(date, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  // Month navigation
  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  // Selected date for highlighting
  const selectedDate = value ? new Date(value) : undefined;

  // Month/year label
  const monthYearLabel = format(currentMonth, "LLLL yyyy", { locale: fi });
  const capitalizedLabel =
    monthYearLabel.charAt(0).toUpperCase() + monthYearLabel.slice(1);

  return (
    <div ref={containerRef} className="relative">
      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={id}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="one-time-code"
          className={`w-full pl-3 pr-10 py-2 bg-card border rounded-lg input-focus ${
            error ? "border-error" : "border-border"
          }`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          tabIndex={-1}
          aria-label="Avaa kalenteri"
        >
          <Calendar size={18} />
        </button>
      </div>

      {/* Calendar dropdown - rendered as portal to escape overflow:hidden */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="z-[10001] bg-card border border-border rounded-lg shadow-lg p-3 animate-fade-in"
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Edellinen kuukausi"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium">{capitalizedLabel}</span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Seuraava kuukausi"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-caption font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const isDisabled = isDateDisabled(day);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  disabled={isDisabled}
                  className={`
                    relative aspect-square flex items-center justify-center
                    rounded-md text-body transition-colors cursor-pointer
                    ${isDisabled ? "text-[var(--text-initials)] cursor-not-allowed" : ""}
                    ${isSelected ? "bg-[var(--accent)] text-[var(--btn-primary-text)] font-medium" : ""}
                    ${!isSelected && !isDisabled ? "text-foreground hover:bg-muted" : ""}
                    ${isTodayDate && !isSelected ? "ring-1 ring-[var(--accent)] ring-inset" : ""}
                  `}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

        </div>,
        document.body
      )}
    </div>
  );
}
