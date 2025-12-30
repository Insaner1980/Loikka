// Skill limits (taitorajat) for Finnish youth athletics
// Based on SUL (Suomen Urheiluliitto) official limits
// Source: https://www.alaharmankisa.fi/yleisurheilu/jaosto/4420/taitomerkkirajat-2014

export type SkillMark = "A" | "B" | "C" | null;

export type AgeCategory = "T8" | "T9" | "T11" | "T13" | "T15";

interface SkillLimit {
  A: number;
  B: number;
  C: number;
}

// Skill limits by age category and discipline
// Time values are in seconds, distances in meters/cm as stored in DB
type SkillLimitsData = {
  [ageCategory in AgeCategory]: {
    [disciplineKey: string]: SkillLimit;
  };
};

// 2014-2025 Skill limits (voimassa 31.12.2025 asti)
export const skillLimits2014: SkillLimitsData = {
  // T8: Added in February 2025 for "Tulevat Tähdet" competition
  // Same limits for boys and girls at this age
  T8: {
    // Running (times in seconds)
    "40m": { A: 7.20, B: 7.35, C: 7.80 },
    "1000m": { A: 247, B: 260, C: 280 }, // 4:07, 4:20, 4:40
    "600m_kavely": { A: 265, B: 305, C: 340 }, // 4:25, 5:05, 5:40
    // Jumps (in meters)
    "korkeus": { A: 1.00, B: 0.90, C: 0.80 },
    "seivas": { A: 1.30, B: 1.10, C: 0.90 },
    "pituus": { A: 3.30, B: 3.10, C: 2.85 },
    "3-loikka": { A: 7.30, B: 6.70, C: 6.00 },
    // Throws (in meters)
    "kuula_2kg": { A: 5.30, B: 4.70, C: 4.20 },
    "kiekko_600g": { A: 12.00, B: 9.00, C: 7.00 },
    "moukari_2.5kg": { A: 10.50, B: 8.50, C: 7.00 },
    "keihas_400g": { A: 13.50, B: 11.00, C: 8.50 },
    // Combined events (points)
    "3-ottelu": { A: 450, B: 370, C: 270 },
    "4-ottelu": { A: 490, B: 380, C: 290 },
  },
  T9: {
    // Running (times in seconds)
    "40m": { A: 6.95, B: 7.15, C: 7.45 },
    "1000m": { A: 242, B: 256, C: 274 }, // 4:02, 4:16, 4:34
    "600m_kavely": { A: 260, B: 270, C: 290 }, // 4:20, 4:30, 5:30 (approximate)
    // Jumps (in cm, stored as meters in DB so we convert)
    "korkeus": { A: 1.06, B: 1.00, C: 0.90 },
    "seivas": { A: 1.30, B: 1.10, C: 0.90 },
    "pituus": { A: 3.50, B: 3.30, C: 3.10 },
    "3-loikka": { A: 7.70, B: 7.10, C: 6.30 },
    // Throws (in meters)
    "kuula_2kg": { A: 5.80, B: 5.25, C: 4.75 },
    "kiekko_600g": { A: 14.00, B: 11.50, C: 8.50 },
    "moukari_2.5kg": { A: 14.00, B: 12.00, C: 8.50 },
    "keihas_400g": { A: 15.00, B: 13.00, C: 9.50 },
    // Combined events (points)
    "3-ottelu": { A: 550, B: 450, C: 350 },
    "4-ottelu": { A: 725, B: 600, C: 400 },
  },
  T11: {
    // Running
    "60m": { A: 9.10, B: 9.45, C: 9.75 },
    "1000m": { A: 218, B: 233, C: 250 }, // 3:38, 3:53, 4:10
    "60m_aj": { A: 11.10, B: 12.00, C: 13.20 },
    "1000m_kavely": { A: 405, B: 445, C: 490 }, // 6:45, 7:25, 8:10
    // Jumps
    "korkeus": { A: 1.28, B: 1.19, C: 1.13 },
    "seivas": { A: 1.60, B: 1.35, C: 1.10 },
    "pituus": { A: 4.20, B: 3.95, C: 3.70 },
    "3-loikka": { A: 8.60, B: 7.90, C: 7.10 },
    // Throws
    "kuula_2kg": { A: 8.40, B: 7.50, C: 6.75 },
    "kiekko_600g": { A: 19.00, B: 15.00, C: 10.00 },
    "moukari_2.5kg": { A: 19.00, B: 15.00, C: 10.00 },
    "keihas_400g": { A: 23.00, B: 18.00, C: 12.00 },
    // Combined events
    "3-ottelu": { A: 850, B: 700, C: 550 },
    "4-ottelu": { A: 1200, B: 1000, C: 725 },
  },
  T13: {
    // Running
    "60m": { A: 8.65, B: 8.95, C: 9.40 },
    "200m": { A: 29.00, B: 30.50, C: 33.00 },
    "1000m": { A: 206, B: 222, C: 250 }, // 3:26, 3:42, 4:10
    "60m_aj": { A: 10.60, B: 11.50, C: 13.30 },
    "200m_aj": { A: 34.00, B: 36.40, C: 40.00 },
    "2000m_kavely": { A: 780, B: 870, C: 990 }, // 13:00, 14:30, 16:30
    // Jumps
    "korkeus": { A: 1.43, B: 1.34, C: 1.19 },
    "seivas": { A: 2.05, B: 1.80, C: 1.45 },
    "pituus": { A: 4.55, B: 4.30, C: 3.80 },
    "3-loikka": { A: 9.40, B: 9.00, C: 7.80 },
    // Throws
    "kuula_3kg": { A: 9.80, B: 8.90, C: 7.50 },
    "kiekko_750g": { A: 27.00, B: 22.00, C: 16.00 },
    "moukari_3kg": { A: 27.00, B: 22.00, C: 16.00 },
    "keihas_500g": { A: 29.00, B: 24.00, C: 17.50 },
    // Combined events
    "4-ottelu": { A: 1350, B: 1100, C: 750 },
    "5-ottelu": { A: 1750, B: 1425, C: 1050 },
  },
  T15: {
    // Running
    "100m": { A: 13.40, B: 13.95, C: 14.80 },
    "300m": { A: 44.70, B: 46.80, C: 49.50 },
    "800m": { A: 153, B: 163, C: 173 }, // 2:33, 2:43, 2:53
    "2000m": { A: 460, B: 490, C: 540 }, // 7:40, 8:10, 9:00
    "1500m_ej": { A: 380, B: 405, C: 440 }, // 6:20, 6:45, 7:20 (estejuoksu)
    "80m_aj": { A: 13.10, B: 13.95, C: 14.90 },
    "300m_aj": { A: 49.50, B: 52.00, C: 54.50 },
    "3000m_kavely": { A: 1150, B: 1260, C: 1380 }, // 19:10, 21:00, 23:00
    // Jumps
    "korkeus": { A: 1.49, B: 1.39, C: 1.26 },
    "seivas": { A: 2.20, B: 1.95, C: 1.60 },
    "pituus": { A: 4.90, B: 4.50, C: 3.90 },
    "3-loikka": { A: 10.20, B: 9.50, C: 8.60 },
    // Throws
    "kuula_3kg": { A: 10.20, B: 9.40, C: 8.40 },
    "kiekko_1kg": { A: 28.00, B: 24.00, C: 19.00 },
    "moukari_3kg": { A: 32.00, B: 26.00, C: 21.00 },
    "keihas_500g": { A: 34.00, B: 29.00, C: 23.00 },
    // Combined events
    "5-ottelu": { A: 1900, B: 1550, C: 1100 },
  },
};

// 2026+ Skill limits (voimassa 1.1.2026 alkaen)
export const skillLimits2026: SkillLimitsData = {
  // T8: New events for 2026 (150m, 800m, 60m aj, 800m kilpakävely)
  T8: {
    // Running (times in seconds)
    "40m": { A: 7.20, B: 7.35, C: 7.80 },
    "150m": { A: 27.30, B: 28.50, C: 30.50 },
    "800m": { A: 197, B: 207, C: 222 }, // 3:17, 3:27, 3:42
    "60m_aj": { A: 13.20, B: 14.00, C: 15.80 },
    "800m_kavely": { A: 380, B: 418, C: 485 }, // 6:20, 6:58, 8:05
    // Jumps (in meters)
    "korkeus": { A: 1.00, B: 0.90, C: 0.80 },
    "seivas": { A: 1.30, B: 1.10, C: 0.90 },
    "pituus": { A: 3.30, B: 3.10, C: 2.85 },
    "3-loikka": { A: 6.80, B: 6.00, C: 5.00 },
    // Throws (in meters)
    "kuula_2kg": { A: 4.70, B: 4.20, C: 3.80 },
    "kiekko_600g": { A: 10.00, B: 8.00, C: 6.00 },
    "moukari_2.5kg": { A: 9.00, B: 7.00, C: 5.00 },
    "keihas_400g": { A: 10.00, B: 8.00, C: 6.00 },
    // Combined events (points)
    "3-ottelu": { A: 400, B: 300, C: 250 },
    "4-ottelu": { A: 450, B: 350, C: 300 },
  },
  // TODO: Add other age categories when 2026 limits become available
  T9: {},
  T11: {},
  T13: {},
  T15: {},
};

// Map discipline IDs to skill limit keys
// This maps our database discipline IDs to the skill limit keys above
// Based on disciplines.ts IDs
const disciplineToSkillKey: Record<number, Record<AgeCategory, string | null>> = {
  // Sprints
  // T8 2014: 40m, 1000m | T8 2026: 40m, 150m, 800m
  1: { T8: "40m", T9: "40m", T11: null, T13: null, T15: null }, // 40m (T8, T9)
  2: { T8: null, T9: null, T11: "60m", T13: "60m", T15: null }, // 60m
  3: { T8: null, T9: null, T11: null, T13: null, T15: "100m" }, // 100m
  4: { T8: "150m", T9: null, T11: null, T13: null, T15: null }, // 150m (T8 2026 only)
  5: { T8: null, T9: null, T11: null, T13: "200m", T15: null }, // 200m
  6: { T8: null, T9: null, T11: null, T13: null, T15: "300m" }, // 300m

  // Middle distance
  9: { T8: "800m", T9: null, T11: null, T13: null, T15: "800m" }, // 800m (T8 2026, T15)
  10: { T8: "1000m", T9: "1000m", T11: "1000m", T13: "1000m", T15: null }, // 1000m
  12: { T8: null, T9: null, T11: null, T13: null, T15: "2000m" }, // 2000m

  // Hurdles
  16: { T8: "60m_aj", T9: null, T11: "60m_aj", T13: "60m_aj", T15: null }, // 60m aidat (T8 2026, T11, T13)
  17: { T8: null, T9: null, T11: null, T13: null, T15: "80m_aj" }, // 80m aidat
  19: { T8: null, T9: null, T11: null, T13: "200m_aj", T15: null }, // 200m aidat
  20: { T8: null, T9: null, T11: null, T13: null, T15: "300m_aj" }, // 300m aidat

  // Jumps
  22: { T8: "pituus", T9: "pituus", T11: "pituus", T13: "pituus", T15: "pituus" }, // Pituus
  23: { T8: "korkeus", T9: "korkeus", T11: "korkeus", T13: "korkeus", T15: "korkeus" }, // Korkeus
  24: { T8: "3-loikka", T9: "3-loikka", T11: "3-loikka", T13: "3-loikka", T15: "3-loikka" }, // Kolmiloikka
  25: { T8: "seivas", T9: "seivas", T11: "seivas", T13: "seivas", T15: "seivas" }, // Seiväs

  // Throws - equipment weight varies by age
  26: { T8: "kuula_2kg", T9: "kuula_2kg", T11: "kuula_2kg", T13: "kuula_3kg", T15: "kuula_3kg" }, // Kuula
  27: { T8: "kiekko_600g", T9: "kiekko_600g", T11: "kiekko_600g", T13: "kiekko_750g", T15: "kiekko_1kg" }, // Kiekko
  28: { T8: "keihas_400g", T9: "keihas_400g", T11: "keihas_400g", T13: "keihas_500g", T15: "keihas_500g" }, // Keihäs
  29: { T8: "moukari_2.5kg", T9: "moukari_2.5kg", T11: "moukari_2.5kg", T13: "moukari_3kg", T15: "moukari_3kg" }, // Moukari

  // Combined events
  31: { T8: "3-ottelu", T9: "3-ottelu", T11: "3-ottelu", T13: null, T15: null }, // 3-ottelu
  32: { T8: "4-ottelu", T9: "4-ottelu", T11: "4-ottelu", T13: "4-ottelu", T15: null }, // 4-ottelu
  33: { T8: null, T9: null, T11: null, T13: "5-ottelu", T15: "5-ottelu" }, // 5-ottelu

  // Walking
  // T8 2014: 600m kävely | T8 2026: 800m kilpakävely
  35: { T8: "600m_kavely", T9: "600m_kavely", T11: null, T13: null, T15: null }, // 600m kävely (T8 2014, T9)
  36: { T8: "800m_kavely", T9: null, T11: null, T13: null, T15: null }, // 800m kävely (T8 2026 only)
  41: { T8: null, T9: null, T11: "1000m_kavely", T13: null, T15: null }, // 1000m kävely
  37: { T8: null, T9: null, T11: null, T13: "2000m_kavely", T15: null }, // 2000m kävely
  38: { T8: null, T9: null, T11: null, T13: null, T15: "3000m_kavely" }, // 3000m kävely
};

/**
 * Get the age category based on birth year and result year
 * Uses the age the athlete turns during the calendar year
 */
export function getAgeCategoryForSkill(birthYear: number, resultYear: number): AgeCategory | null {
  const age = resultYear - birthYear;

  // SUL age categories for skill limits
  // T8 was added in February 2025
  if (age === 8) return "T8";
  if (age >= 9 && age <= 10) return "T9";
  if (age >= 11 && age <= 12) return "T11";
  if (age >= 13 && age <= 14) return "T13";
  if (age >= 15 && age <= 16) return "T15";

  // Outside skill limit age range (too young or adult)
  return null;
}

/**
 * Get skill limits data based on result date
 * Uses 2014 limits until 31.12.2025, then 2026 limits
 */
function getSkillLimitsForDate(resultDate: Date): SkillLimitsData {
  const cutoffDate = new Date("2026-01-01");
  if (resultDate >= cutoffDate) {
    // Check if 2026 limits are available
    const has2026Limits = Object.values(skillLimits2026).some(
      category => Object.keys(category).length > 0
    );
    if (has2026Limits) {
      return skillLimits2026;
    }
  }
  return skillLimits2014;
}

/**
 * Calculate skill mark for a result
 * Returns A, B, C, or null if no skill limit applies
 */
export function calculateSkillMark(
  value: number,
  disciplineId: number,
  birthYear: number,
  resultDate: string | Date,
  lowerIsBetter: boolean
): SkillMark {
  // Parse result date
  const date = typeof resultDate === "string" ? new Date(resultDate) : resultDate;
  const resultYear = date.getFullYear();

  // Get age category
  const ageCategory = getAgeCategoryForSkill(birthYear, resultYear);
  if (!ageCategory) return null;

  // Get skill key for this discipline and age category
  const disciplineMapping = disciplineToSkillKey[disciplineId];
  if (!disciplineMapping) return null;

  const skillKey = disciplineMapping[ageCategory];
  if (!skillKey) return null;

  // Get skill limits for the result date
  const limits = getSkillLimitsForDate(date);
  const categoryLimits = limits[ageCategory];
  if (!categoryLimits) return null;

  const skillLimit = categoryLimits[skillKey];
  if (!skillLimit) return null;

  // Compare value with limits
  // For time events (lowerIsBetter), lower value is better
  // For distance/points events, higher value is better
  if (lowerIsBetter) {
    // Time events: A is fastest (lowest), C is slowest (highest)
    if (value <= skillLimit.A) return "A";
    if (value <= skillLimit.B) return "B";
    if (value <= skillLimit.C) return "C";
  } else {
    // Distance/points events: A is best (highest), C is lowest
    if (value >= skillLimit.A) return "A";
    if (value >= skillLimit.B) return "B";
    if (value >= skillLimit.C) return "C";
  }

  return null;
}

/**
 * Get all skill limits for a specific discipline and age category
 * Useful for showing target values in the UI
 */
export function getSkillLimitsForDiscipline(
  disciplineId: number,
  birthYear: number,
  resultYear: number
): SkillLimit | null {
  const ageCategory = getAgeCategoryForSkill(birthYear, resultYear);
  if (!ageCategory) return null;

  const disciplineMapping = disciplineToSkillKey[disciplineId];
  if (!disciplineMapping) return null;

  const skillKey = disciplineMapping[ageCategory];
  if (!skillKey) return null;

  const limits = getSkillLimitsForDate(new Date(resultYear, 0, 1));
  return limits[ageCategory]?.[skillKey] || null;
}
