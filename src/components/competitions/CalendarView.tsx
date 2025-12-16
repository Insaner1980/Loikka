import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { fi } from "date-fns/locale";
import type { Competition } from "../../types";

interface CalendarViewProps {
  competitions: Competition[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
  selectedDate?: Date;
}

const weekDays = ["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"];

export function CalendarView({
  competitions,
  currentMonth,
  onMonthChange,
  onDayClick,
  selectedDate,
}: CalendarViewProps) {
  // Get all days to display in the calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Create a map of dates with competitions for quick lookup
  const competitionDates = useMemo(() => {
    const dates = new Set<string>();
    for (const comp of competitions) {
      dates.add(comp.date);
      // If multi-day event, add all days
      if (comp.endDate) {
        const start = new Date(comp.date);
        const end = new Date(comp.endDate);
        const days = eachDayOfInterval({ start, end });
        for (const day of days) {
          dates.add(format(day, "yyyy-MM-dd"));
        }
      }
    }
    return dates;
  }, [competitions]);

  const goToPreviousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  const monthYearLabel = format(currentMonth, "LLLL yyyy", { locale: fi });
  // Capitalize first letter
  const capitalizedLabel =
    monthYearLabel.charAt(0).toUpperCase() + monthYearLabel.slice(1);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      {/* Month navigation header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Edellinen kuukausi"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold">{capitalizedLabel}</h2>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Seuraava kuukausi"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const hasCompetition = competitionDates.has(dateStr);
          const isTodayDate = isToday(day);

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(day)}
              className={`
                relative aspect-square flex flex-col items-center justify-center
                rounded-lg text-sm transition-colors
                ${isCurrentMonth ? "text-foreground" : "text-muted-foreground/50"}
                ${isSelected ? "bg-primary text-black font-semibold" : "hover:bg-muted"}
                ${isTodayDate && !isSelected ? "ring-2 ring-primary ring-inset" : ""}
              `}
            >
              <span>{format(day, "d")}</span>
              {/* Competition indicator dot */}
              {hasCompetition && (
                <span
                  className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-black" : "bg-primary"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
