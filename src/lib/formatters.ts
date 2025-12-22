import { convertFileSrc } from "@tauri-apps/api/core";
import { WIND } from "./constants";

/**
 * Format seconds to a human-readable time string.
 * < 60 seconds: "12.34"
 * < 3600 seconds: "1:23.45"
 * >= 3600 seconds: "1:02:34.56"
 */
export function formatTime(seconds: number): string {
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
 * e.g., "4.56 m"
 */
export function formatDistance(meters: number): string {
  return `${meters.toFixed(2)} m`;
}

/**
 * Format a date string to Finnish locale.
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
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
 */
export function getAgeCategory(birthYear: number): string {
  const currentYear = new Date().getFullYear();
  const ageThisYear = currentYear - birthYear;

  // SUL uses odd-numbered age categories
  if (ageThisYear <= 7) return "T7";
  if (ageThisYear <= 9) return "T9";
  if (ageThisYear <= 11) return "T11";
  if (ageThisYear <= 13) return "T13";
  if (ageThisYear <= 15) return "T15";
  if (ageThisYear <= 17) return "T17";
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
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Calculate the number of days until a given date.
 */
export function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = date.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
