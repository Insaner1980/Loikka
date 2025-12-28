/**
 * Application-wide constants
 */

// Dashboard display limits
export const DASHBOARD = {
  MAX_COMPETITIONS: 5,
  MAX_RESULTS: 3,
  MAX_ATHLETES: 2,
} as const;

// Days until competition thresholds (for color coding)
export const COMPETITION_URGENCY = {
  IMMINENT: 3,   // Green - happening very soon
  SOON: 7,       // Yellow - happening this week
  UPCOMING: 14,  // Orange - happening in 2 weeks
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  RESULTS_PER_PAGE: 10,
} as const;

// Year filter range for dropdowns
export const YEAR_RANGE = {
  START_YEAR: 2021,       // First year in selection
  YEARS_AHEAD: 1,         // How many years ahead to include
} as const;

// Athlete birth year validation
export const ATHLETE_BIRTH_YEAR = {
  MIN: 2005,                        // Oldest allowed birth year
  MAX: new Date().getFullYear(),    // Youngest allowed birth year (current year)
} as const;

// Toast notification settings
export const TOAST = {
  DURATION_MS: 4000,      // Default display duration
  EXIT_ANIMATION_MS: 200, // Fade out animation duration
} as const;

// Wind rules
export const WIND = {
  LIMIT: 2.0,             // Maximum allowed tailwind for records (m/s)
  AGE_THRESHOLD: 14,      // Age at which wind rules apply
} as const;

// Wind-affected disciplines (for showing wind field in form)
// Uses short names (name field from disciplines)
export const WIND_AFFECTED_DISCIPLINES = [
  "60m", "100m", "200m",
  "60m aj", "80m aj", "100m aj",
  "Pituus", "Kolmiloikka"
] as const;

// Equipment weights by discipline (in kg, except javelin in g)
export const EQUIPMENT_WEIGHTS = {
  kuula: [2, 2.5, 3, 4, 5, 6, 7.26],           // Shot put weights
  kiekko: [0.75, 1, 1.5, 1.75, 2],             // Discus weights
  keihäs: [400, 500, 600, 700, 800],           // Javelin weights (grams)
  moukari: [3, 4, 5, 6, 7.26],                 // Hammer weights
} as const;

// Hurdle heights (in cm)
export const HURDLE_HEIGHTS = [
  50,   // Youngest
  60,   // T/P 10-11
  68,   // T 12-13
  76,   // T 14-15, P 12-13
  84,   // T 16-17, P 14-15
  91,   // N, P 16-17
  100,  // M 18-19
  106,  // M
] as const;

// Result status options
export const RESULT_STATUSES = [
  { value: "valid", label: "Hyväksytty" },
  { value: "nm", label: "NM - Ei tulosta" },
  { value: "dns", label: "DNS - Ei startannut" },
  { value: "dnf", label: "DNF - Keskeytti" },
  { value: "dq", label: "DQ - Hylätty" },
] as const;

// Discipline name to equipment type mapping
// Uses short names (name field from disciplines)
export const DISCIPLINE_EQUIPMENT_MAP: Record<string, keyof typeof EQUIPMENT_WEIGHTS | null> = {
  "Kuula": "kuula",
  "Kiekko": "kiekko",
  "Keihäs": "keihäs",
  "Moukari": "moukari",
} as const;

// Competition level options for dropdowns
export const COMPETITION_LEVEL_OPTIONS = [
  { value: "seurakisat", label: "Seurakisat" },
  { value: "koululaiskisat", label: "Koululaiskisat" },
  { value: "seuran_sisaiset", label: "Seuran sisäiset kisat" },
  { value: "seuraottelut", label: "Seuraottelut" },
  { value: "piirikisat", label: "Piirikisat" },
  { value: "pm", label: "Piirinmestaruuskilpailut (PM)" },
  { value: "hallikisat", label: "Hallikisat" },
  { value: "aluekisat", label: "Aluekisat" },
  { value: "pohjola_seuracup", label: "Pohjola Seuracup" },
  { value: "sm", label: "SM-kilpailut" },
  { value: "muu", label: "Muu" },
] as const;
