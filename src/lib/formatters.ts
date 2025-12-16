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
 * Parse a time string to seconds.
 * Supports formats: "12.34", "1:23.45", "1:02:34.56"
 */
export function parseTime(input: string): number {
  const trimmed = input.trim();

  // Count colons to determine format
  const colonCount = (trimmed.match(/:/g) || []).length;

  if (colonCount === 0) {
    // Just seconds: "12.34"
    const seconds = parseFloat(trimmed);
    if (isNaN(seconds) || seconds < 0) {
      throw new Error("Invalid time format");
    }
    return seconds;
  }

  if (colonCount === 1) {
    // Minutes:seconds: "1:23.45"
    const [minsStr, secsStr] = trimmed.split(":");
    const mins = parseInt(minsStr, 10);
    const secs = parseFloat(secsStr);

    if (isNaN(mins) || isNaN(secs) || mins < 0 || secs < 0 || secs >= 60) {
      throw new Error("Invalid time format");
    }

    return mins * 60 + secs;
  }

  if (colonCount === 2) {
    // Hours:minutes:seconds: "1:02:34.56"
    const [hoursStr, minsStr, secsStr] = trimmed.split(":");
    const hours = parseInt(hoursStr, 10);
    const mins = parseInt(minsStr, 10);
    const secs = parseFloat(secsStr);

    if (
      isNaN(hours) ||
      isNaN(mins) ||
      isNaN(secs) ||
      hours < 0 ||
      mins < 0 ||
      mins >= 60 ||
      secs < 0 ||
      secs >= 60
    ) {
      throw new Error("Invalid time format");
    }

    return hours * 3600 + mins * 60 + secs;
  }

  throw new Error("Invalid time format");
}

/**
 * Format meters to a distance string.
 * e.g., "4.56 m"
 */
export function formatDistance(meters: number): string {
  return `${meters.toFixed(2)} m`;
}

/**
 * Parse a distance string to meters.
 * Supports formats: "4.56", "4.56m", "4.56 m"
 */
export function parseDistance(input: string): number {
  const trimmed = input.trim().replace(/\s*m$/i, "");
  const meters = parseFloat(trimmed);

  if (isNaN(meters) || meters < 0) {
    throw new Error("Invalid distance format");
  }

  return meters;
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
