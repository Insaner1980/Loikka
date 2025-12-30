import { convertFileSrc } from "@tauri-apps/api/core";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { WIND } from "./constants";

/**
 * Format seconds to a human-readable time string.
 * < 60 seconds: "12.34"
 * < 3600 seconds: "1:23.45"
 * >= 3600 seconds: "1:02:34.56"
 */
export function formatTime(seconds: number): string {
  // Handle edge cases
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0.00";
  }

  if (seconds < 60) {
    return seconds.toFixed(2);
  }

  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, "0")}`;
  }

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = (seconds % 60).toFixed(2);
  return `${hours}:${mins.toString().padStart(2, "0")}:${secs.padStart(5, "0")}`;
}

/**
 * Format meters to a distance string.
 * e.g., "4.56 m" or "1500 m" (for Cooper) or "106 cm" (for vertical jumps)
 * @param meters - Distance in meters
 * @param wholeMeters - If true, show whole meters without decimals (for Cooper test)
 * @param useCentimeters - If true, show centimeters instead of meters (for vertical jumps)
 */
export function formatDistance(
  meters: number,
  wholeMeters: boolean = false,
  useCentimeters: boolean = false
): string {
  // Handle edge cases
  if (!Number.isFinite(meters) || meters < 0) {
    if (useCentimeters) return "0 cm";
    return wholeMeters ? "0 m" : "0.00 m";
  }
  // For vertical jumps (high jump, pole vault), show centimeters
  if (useCentimeters) {
    const cm = Math.round(meters * 100);
    return `${cm} cm`;
  }
  // For Cooper test and similar, show whole meters
  if (wholeMeters) {
    return `${Math.round(meters)} m`;
  }
  return `${meters.toFixed(2)} m`;
}

/**
 * Format a date string to Finnish locale.
 * e.g., "21.12.2025"
 */
export function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  // Check for invalid date
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date string to Finnish locale with time.
 * e.g., "21.12.2025 14:30"
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a date string to short Finnish format (day.month only).
 * Useful for chart labels.
 * e.g., "21.12"
 */
export function formatShortDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
  });
}

/**
 * Format a date string to ISO format (YYYY-MM-DD).
 */
export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get today's date in ISO format.
 */
export function getTodayISO(): string {
  return toISODate(new Date());
}

/**
 * Convert a local file path to a Tauri asset URL.
 * This allows loading local files in the webview.
 */
export function toAssetUrl(filePath: string | undefined | null): string {
  if (!filePath) return "";
  return convertFileSrc(filePath);
}

/**
 * Get Finnish youth athletics age category based on birth year.
 * Categories: T7, T9, T11, T13, T15, T17, N
 * T = Tytöt (girls), N = Naiset (women)
 *
 * Age category is determined by the age the athlete turns during the calendar year.
 * Example: Born 2016, in year 2025 turns 9 → T9
 *
 * SUL uses odd-numbered categories for children (7, 9, 11, 13, 15, 17).
 * Children under 7 show their actual age (e.g., "2v" for 2-year-old).
 */
export function getAgeCategory(birthYear: number): string {
  const currentYear = new Date().getFullYear();
  const ageThisYear = currentYear - birthYear;

  // Children too young for official categories - show actual age
  if (ageThisYear < 7) return `${ageThisYear}v`;

  // SUL uses odd-numbered age categories
  if (ageThisYear <= 8) return "T7";   // 7-8 year olds
  if (ageThisYear <= 10) return "T9";  // 9-10 year olds
  if (ageThisYear <= 12) return "T11"; // 11-12 year olds
  if (ageThisYear <= 14) return "T13"; // 13-14 year olds
  if (ageThisYear <= 16) return "T15"; // 15-16 year olds
  if (ageThisYear <= 18) return "T17"; // 17-18 year olds
  // Adults
  return "N";
}

/**
 * Format wind speed for display.
 * Adds + for tailwind, shows with one decimal.
 * If wind exceeds limit and athlete is 14+, adds "w" suffix.
 */
export function formatWind(
  wind: number | undefined | null,
  athleteBirthYear?: number,
  resultYear?: number
): string {
  if (wind === undefined || wind === null) return "";

  const prefix = wind >= 0 ? "+" : "";
  const formatted = `${prefix}${wind.toFixed(1)}`;

  // Check if wind-assisted (athlete 14+ and wind exceeds limit)
  if (athleteBirthYear && resultYear) {
    const age = resultYear - athleteBirthYear;
    if (age >= WIND.AGE_THRESHOLD && wind > WIND.LIMIT) {
      return `${formatted}w`;
    }
  }

  return formatted;
}

/**
 * Format result value with wind in parentheses.
 * e.g., "10.52 (+1.8)" or "10.52 (+2.3w)"
 */
export function formatResultWithWind(
  value: number,
  unit: "time" | "distance",
  wind?: number | null,
  athleteBirthYear?: number,
  resultYear?: number
): string {
  const formattedValue = unit === "time" ? formatTime(value) : formatDistance(value);

  if (wind === undefined || wind === null) {
    return formattedValue;
  }

  const formattedWind = formatWind(wind, athleteBirthYear, resultYear);
  return `${formattedValue} (${formattedWind})`;
}

/**
 * Get status label in Finnish.
 */
export function getStatusLabel(status: string | undefined | null): string {
  const labels: Record<string, string> = {
    valid: "Hyväksytty",
    nm: "NM - Ei tulosta",
    dns: "DNS - Ei startannut",
    dnf: "DNF - Keskeytti",
    dq: "DQ - Hylätty",
  };
  return status ? labels[status] || status.toUpperCase() : "";
}

/**
 * Get initials from first and last name.
 */
export function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0) || "";
  const last = lastName?.charAt(0) || "";
  return `${first}${last}`.toUpperCase();
}

/**
 * Calculate the number of days until a given date.
 * Uses date-fns for reliable timezone handling.
 */
export function getDaysUntil(dateStr: string): number {
  try {
    const targetDate = startOfDay(parseISO(dateStr));
    const today = startOfDay(new Date());
    return differenceInDays(targetDate, today);
  } catch {
    // Fallback for invalid date strings
    return 0;
  }
}

// Cooper test discipline ID (matches disciplines.ts)
const COOPER_DISCIPLINE_ID = 54;

/**
 * Format a result value based on discipline type.
 * Handles time, distance (field events), Cooper (whole meters), and combined events (points).
 */
export function formatResultValue(
  value: number,
  unit: "time" | "distance",
  disciplineId?: number,
  isCombinedEvent?: boolean
): string {
  // Combined events show points
  if (isCombinedEvent) {
    return `${Math.round(value)} p`;
  }
  // Time disciplines
  if (unit === "time") {
    return formatTime(value);
  }
  // Cooper shows whole meters
  if (disciplineId === COOPER_DISCIPLINE_ID) {
    return formatDistance(value, true);
  }
  // Other distance disciplines (field events)
  return formatDistance(value);
}
