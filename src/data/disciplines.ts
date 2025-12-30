import type { Discipline, DisciplineCategory, AgeCategory } from "../types";

// Category labels in Finnish
export const categoryLabels: Record<DisciplineCategory, string> = {
  sprints: "Pikajuoksu",
  middleDistance: "Keskimatka",
  longDistance: "Kestävyys",
  crossCountry: "Maastojuoksu",
  relays: "Viestit",
  hurdles: "Aidat",
  jumps: "Hypyt",
  throws: "Heitot",
  combined: "Yhdistetyt",
  walking: "Kävely",
  other: "Muut",
};

// All disciplines with Finnish names
export const disciplines: Discipline[] = [
  // Sprints
  {
    id: 1,
    name: "40 m",
    fullName: "40 metriä",
    category: "sprints",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 2,
    name: "60 m",
    fullName: "60 metriä",
    category: "sprints",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 3,
    name: "100 m",
    fullName: "100 metriä",
    category: "sprints",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 4,
    name: "150 m",
    fullName: "150 metriä",
    category: "sprints",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 5,
    name: "200 m",
    fullName: "200 metriä",
    category: "sprints",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 6,
    name: "300 m",
    fullName: "300 metriä",
    category: "sprints",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 7,
    name: "400 m",
    fullName: "400 metriä",
    category: "sprints",
    unit: "time",
    lowerIsBetter: true,
  },

  // Middle Distance
  {
    id: 8,
    name: "600 m",
    fullName: "600 metriä",
    category: "middleDistance",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 9,
    name: "800 m",
    fullName: "800 metriä",
    category: "middleDistance",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 10,
    name: "1000 m",
    fullName: "1000 metriä",
    category: "middleDistance",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 11,
    name: "1500 m",
    fullName: "1500 metriä",
    category: "middleDistance",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 12,
    name: "2000 m",
    fullName: "2000 metriä",
    category: "middleDistance",
    unit: "time",
    lowerIsBetter: true,
  },

  // Long Distance
  {
    id: 13,
    name: "3000 m",
    fullName: "3000 metriä",
    category: "longDistance",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 14,
    name: "5000 m",
    fullName: "5000 metriä",
    category: "longDistance",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 15,
    name: "10000 m",
    fullName: "10000 metriä",
    category: "longDistance",
    unit: "time",
    lowerIsBetter: true,
  },

  // Hurdles
  {
    id: 16,
    name: "60 m aidat",
    fullName: "60 metriä aidat",
    category: "hurdles",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 17,
    name: "80 m aidat",
    fullName: "80 metriä aidat",
    category: "hurdles",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 18,
    name: "100 m aidat",
    fullName: "100 metriä aidat",
    category: "hurdles",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 19,
    name: "200 m aidat",
    fullName: "200 metriä aidat",
    category: "hurdles",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 20,
    name: "300 m aidat",
    fullName: "300 metriä aidat",
    category: "hurdles",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 21,
    name: "400 m aidat",
    fullName: "400 metriä aidat",
    category: "hurdles",
    unit: "time",
    lowerIsBetter: true,
  },

  // Jumps
  {
    id: 22,
    name: "Pituus",
    fullName: "Pituushyppy",
    category: "jumps",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 23,
    name: "Korkeus",
    fullName: "Korkeushyppy",
    category: "jumps",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 24,
    name: "Kolmiloikka",
    fullName: "Kolmiloikka",
    category: "jumps",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 25,
    name: "Seiväs",
    fullName: "Seiväshyppy",
    category: "jumps",
    unit: "distance",
    lowerIsBetter: false,
  },

  // Throws
  {
    id: 26,
    name: "Kuula",
    fullName: "Kuulantyöntö",
    category: "throws",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 27,
    name: "Kiekko",
    fullName: "Kiekonheitto",
    category: "throws",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 28,
    name: "Keihäs",
    fullName: "Keihäänheitto",
    category: "throws",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 29,
    name: "Moukari",
    fullName: "Moukarinheitto",
    category: "throws",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 30,
    name: "Pallo",
    fullName: "Pallonheitto",
    category: "throws",
    unit: "distance",
    lowerIsBetter: false,
  },

  // Combined
  {
    id: 31,
    name: "3-ottelu",
    fullName: "3-ottelu",
    category: "combined",
    unit: "distance", // Points, higher is better
    lowerIsBetter: false,
  },
  {
    id: 32,
    name: "4-ottelu",
    fullName: "4-ottelu",
    category: "combined",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 33,
    name: "5-ottelu",
    fullName: "5-ottelu",
    category: "combined",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 34,
    name: "7-ottelu",
    fullName: "7-ottelu",
    category: "combined",
    unit: "distance",
    lowerIsBetter: false,
  },

  // Walking
  {
    id: 35,
    name: "600 m kävely",
    fullName: "600 metriä kävely",
    category: "walking",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 36,
    name: "800 m kävely",
    fullName: "800 metriä kävely",
    category: "walking",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 41,
    name: "1000 m kävely",
    fullName: "1000 metriä kävely",
    category: "walking",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 37,
    name: "2000 m kävely",
    fullName: "2000 metriä kävely",
    category: "walking",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 38,
    name: "3000 m kävely",
    fullName: "3000 metriä kävely",
    category: "walking",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 39,
    name: "5000 m kävely",
    fullName: "5000 metriä kävely",
    category: "walking",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 40,
    name: "10 km kävely",
    fullName: "10 kilometriä kävely",
    category: "walking",
    unit: "time",
    lowerIsBetter: true,
  },

  // Cross Country (Maastojuoksu)
  {
    id: 42,
    name: "500 m maasto",
    fullName: "500 metriä maastojuoksu",
    category: "crossCountry",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 43,
    name: "1 km maasto",
    fullName: "1 kilometri maastojuoksu",
    category: "crossCountry",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 44,
    name: "2 km maasto",
    fullName: "2 kilometriä maastojuoksu",
    category: "crossCountry",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 45,
    name: "4 km maasto",
    fullName: "4 kilometriä maastojuoksu",
    category: "crossCountry",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 46,
    name: "10 km maasto",
    fullName: "10 kilometriä maastojuoksu",
    category: "crossCountry",
    unit: "time",
    lowerIsBetter: true,
  },

  // Relays (Viestit)
  {
    id: 47,
    name: "8x40 m sukkulaviesti",
    fullName: "8x40 metriä sukkulaviesti",
    category: "relays",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 48,
    name: "4x50 m viesti",
    fullName: "4x50 metriä viesti",
    category: "relays",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 49,
    name: "4x100 m viesti",
    fullName: "4x100 metriä viesti",
    category: "relays",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 50,
    name: "4x200 m viesti",
    fullName: "4x200 metriä viesti",
    category: "relays",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 51,
    name: "4x300 m viesti",
    fullName: "4x300 metriä viesti",
    category: "relays",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 52,
    name: "4x400 m viesti",
    fullName: "4x400 metriä viesti",
    category: "relays",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 53,
    name: "4x800 m viesti",
    fullName: "4x800 metriä viesti",
    category: "relays",
    unit: "time",
    lowerIsBetter: true,
  },

  // Other (Muut)
  {
    id: 54,
    name: "Cooper",
    fullName: "Cooper-testi (12 min)",
    category: "other",
    unit: "distance",
    lowerIsBetter: false,
  },
];

// Disciplines available for each age category
// Based on Finnish Athletics Federation (SUL) rules and HIPPO/seurakilpailut
// Source: docs/DISCIPLINES_BY_AGE.md
const disciplineIdsByAgeCategory: Record<AgeCategory, number[]> = {
  // HIPPO-kisat, seurakilpailut (not in official statistics)
  T3: [1, 22, 30], // 40m, pituus, pallo
  T4: [1, 22, 30], // 40m, pituus, pallo
  T5: [1, 22, 23, 28, 30, 42], // 40m, pituus, korkeus, keihäs, pallo, 500m maasto
  T6: [1, 22, 23, 28, 30], // 40m, pituus, korkeus, keihäs, pallo
  T7: [1, 2, 8, 22, 23, 28, 30, 42, 47, 48], // 40m, 60m, 600m, pituus, korkeus, keihäs, pallo, 500m maasto, sukkulaviesti, 4x50m
  T8: [1, 2, 8, 9, 22, 23, 26, 28, 30, 47, 48], // 40m, 60m, 600m, 800m, pituus, korkeus, kuula, keihäs, pallo, sukkulaviesti, 4x50m

  // Official SUL statistics (T9+)
  T9: [
    1, 2, // 40m, 60m
    8, 9, 10, // 600m, 800m, 1000m
    16, // 60m aj
    22, 23, 24, 25, // pituus, korkeus, kolmiloikka, seiväs
    26, 27, 28, 29, 30, // kuula, kiekko, keihäs, moukari, pallo
    31, 32, // 3-ottelu, 4-ottelu
    35, 36, // 600m kävely, 800m kävely
    43, // 1km maasto
    47, 48, // sukkulaviesti, 4x50m
    54, // Cooper
  ],
  T10: [
    2, 4, // 60m, 150m
    8, 9, 10, // 600m, 800m, 1000m
    16, // 60m aj
    22, 23, 24, 25, // pituus, korkeus, kolmiloikka, seiväs
    26, 27, 28, 29, 30, // kuula, kiekko, keihäs, moukari, pallo
    31, 32, // 3-ottelu, 4-ottelu
    41, // 1000m kävely
    43, // 1km maasto
    48, 49, // 4x50m, 4x100m
    54, // Cooper
  ],
  T11: [
    2, 4, // 60m, 150m
    8, 9, 10, // 600m, 800m, 1000m
    16, // 60m aj
    22, 23, 24, 25, // pituus, korkeus, kolmiloikka, seiväs
    26, 27, 28, 29, 30, // kuula, kiekko, keihäs, moukari, pallo
    31, 32, // 3-ottelu, 4-ottelu
    41, // 1000m kävely
    44, // 2km maasto
    49, // 4x100m
    54, // Cooper
  ],
  T12: [
    2, 3, 5, // 60m, 100m, 200m
    9, 10, 11, // 800m, 1000m, 1500m
    16, 19, // 60m aj, 200m aj
    22, 23, 24, 25, // pituus, korkeus, kolmiloikka, seiväs
    26, 27, 28, 29, // kuula, kiekko, keihäs, moukari
    32, 33, // 4-ottelu, 5-ottelu
    37, // 2000m kävely
    44, // 2km maasto
    49, // 4x100m
    54, // Cooper
  ],
  T13: [
    2, 3, 5, 6, // 60m, 100m, 200m, 300m
    9, 10, 11, // 800m, 1000m, 1500m
    16, 19, // 60m aj, 200m aj
    22, 23, 24, 25, // pituus, korkeus, kolmiloikka, seiväs
    26, 27, 28, 29, // kuula, kiekko, keihäs, moukari
    32, 33, // 4-ottelu, 5-ottelu
    37, // 2000m kävely
    44, // 2km maasto
    49, // 4x100m
    54, // Cooper
  ],
  T14: [
    3, 5, 6, 7, // 100m, 200m, 300m, 400m
    9, 11, 12, // 800m, 1500m, 2000m
    17, 20, // 80m aj, 300m aj
    22, 23, 24, 25, // pituus, korkeus, kolmiloikka, seiväs
    26, 27, 28, 29, // kuula, kiekko, keihäs, moukari
    33, // 5-ottelu
    38, // 3000m kävely
    45, // 4km maasto
    49, 53, // 4x100m, 4x800m
    54, // Cooper
  ],
  T15: [
    3, 5, 6, 7, // 100m, 200m, 300m, 400m
    9, 11, 12, 13, // 800m, 1500m, 2000m, 3000m
    17, 20, // 80m aj, 300m aj
    22, 23, 24, 25, // pituus, korkeus, kolmiloikka, seiväs
    26, 27, 28, 29, // kuula, kiekko, keihäs, moukari
    33, // 5-ottelu
    38, // 3000m kävely
    45, // 4km maasto
    49, 53, // 4x100m, 4x800m
    54, // Cooper
  ],

  // Nuoret naiset (N17, N19, N22)
  N17: [
    3, 5, 7, // 100m, 200m, 400m
    9, 11, 12, 13, 14, // 800m, 1500m, 2000m, 3000m, 5000m
    18, 20, 21, // 100m aj, 300m aj, 400m aj
    22, 23, 24, 25, // pituus, korkeus, kolmiloikka, seiväs
    26, 27, 28, 29, // kuula, kiekko, keihäs, moukari
    33, 34, // 5-ottelu, 7-ottelu
    38, // 3000m kävely
    45, // 4km maasto
    49, 51, 53, // 4x100m, 4x300m, 4x800m
    54, // Cooper
  ],
  N19: [
    3, 5, 7, // 100m, 200m, 400m
    9, 11, 13, 14, // 800m, 1500m, 3000m, 5000m
    18, 21, // 100m aj, 400m aj
    22, 23, 24, 25, // pituus, korkeus, kolmiloikka, seiväs
    26, 27, 28, 29, // kuula, kiekko, keihäs, moukari
    34, // 7-ottelu
    38, 39, // 3000m kävely, 5000m kävely
    45, // 4km maasto
    49, 52, 53, // 4x100m, 4x400m, 4x800m
    54, // Cooper
  ],
  N22: [
    3, 5, 7, // 100m, 200m, 400m
    9, 11, 13, 14, 15, // 800m, 1500m, 3000m, 5000m, 10000m
    18, 21, // 100m aj, 400m aj
    22, 23, 24, 25, // pituus, korkeus, kolmiloikka, seiväs
    26, 27, 28, 29, // kuula, kiekko, keihäs, moukari
    34, // 7-ottelu
    38, 39, 40, // kävely
    45, 46, // 4km maasto, 10km maasto
    49, 52, 53, // 4x100m, 4x400m, 4x800m
    54, // Cooper
  ],

  // Aikuiset naiset
  N: [
    3, 5, 7, // 100m, 200m, 400m
    9, 11, 13, 14, 15, // 800m, 1500m, 3000m, 5000m, 10000m
    18, 21, // 100m aj, 400m aj
    22, 23, 24, 25, // pituus, korkeus, kolmiloikka, seiväs
    26, 27, 28, 29, // kuula, kiekko, keihäs, moukari
    34, // 7-ottelu
    38, 39, 40, // kävely
    45, 46, // 4km maasto, 10km maasto
    49, 52, 53, // 4x100m, 4x400m, 4x800m
    54, // Cooper
  ],
};

// Get disciplines grouped by category
export function getDisciplinesByCategory(): Map<DisciplineCategory, Discipline[]> {
  const grouped = new Map<DisciplineCategory, Discipline[]>();

  for (const discipline of disciplines) {
    const existing = grouped.get(discipline.category) || [];
    existing.push(discipline);
    grouped.set(discipline.category, existing);
  }

  return grouped;
}

// Get discipline by ID
export function getDisciplineById(id: number): Discipline | undefined {
  return disciplines.find((d) => d.id === id);
}

// Category order for display
export const categoryOrder: DisciplineCategory[] = [
  "sprints",
  "middleDistance",
  "longDistance",
  "crossCountry",
  "relays",
  "hurdles",
  "jumps",
  "throws",
  "combined",
  "walking",
  "other",
];

// Disciplines 200m+ that need minutes field in time input
const DISCIPLINES_WITH_MINUTES = new Set([
  // Sprints 200m+
  5,  // 200m
  6,  // 300m
  7,  // 400m
  // Middle distance
  8,  // 600m
  9,  // 800m
  10, // 1000m
  11, // 1500m
  12, // 2000m
  // Long distance
  13, // 3000m
  14, // 5000m
  15, // 10000m
  // Hurdles 200m+
  19, // 200m aj
  20, // 300m aj
  21, // 400m aj
  // Walking
  35, // 600m kävely
  36, // 800m kävely
  37, // 2000m kävely
  38, // 3000m kävely
  39, // 5000m kävely
  40, // 10km kävely
  41, // 1000m kävely
  // Cross-country (all)
  42, // 500m maasto
  43, // 1km maasto
  44, // 2km maasto
  45, // 4km maasto
  46, // 10km maasto
  // Relays (all)
  47, // 8x40m sukkulaviesti (320m)
  48, // 4x50m viesti (200m)
  49, // 4x100m viesti (400m)
  50, // 4x200m viesti (800m)
  51, // 4x300m viesti (1200m)
  52, // 4x400m viesti (1600m)
  53, // 4x800m viesti (3200m)
]);

// Check if a discipline needs minutes field in time input
export function disciplineNeedsMinutes(disciplineId: number): boolean {
  return DISCIPLINES_WITH_MINUTES.has(disciplineId);
}

// Cooper test discipline ID
const COOPER_DISCIPLINE_ID = 54;

// Check if a discipline is Cooper (uses meters only, not m.cm format)
export function isCooperDiscipline(disciplineId: number): boolean {
  return disciplineId === COOPER_DISCIPLINE_ID;
}

// Get age category from birth year and optional date
// If date is provided, calculates the age at that date
export function getAgeCategoryFromBirthYear(
  birthYear: number,
  date?: string
): AgeCategory {
  const targetYear = date ? new Date(date).getFullYear() : new Date().getFullYear();
  const ageThisYear = targetYear - birthYear;

  // Children too young for official categories
  if (ageThisYear <= 3) return "T3";
  if (ageThisYear <= 4) return "T4";
  if (ageThisYear <= 5) return "T5";
  if (ageThisYear <= 6) return "T6";
  if (ageThisYear <= 7) return "T7";
  if (ageThisYear <= 8) return "T8";
  if (ageThisYear <= 9) return "T9";
  if (ageThisYear <= 10) return "T10";
  if (ageThisYear <= 11) return "T11";
  if (ageThisYear <= 12) return "T12";
  if (ageThisYear <= 13) return "T13";
  if (ageThisYear <= 14) return "T14";
  if (ageThisYear <= 15) return "T15";
  if (ageThisYear <= 17) return "N17";
  if (ageThisYear <= 19) return "N19";
  if (ageThisYear <= 22) return "N22";
  return "N";
}

// Get disciplines for a specific age category
export function getDisciplinesForAgeCategory(category: AgeCategory): Discipline[] {
  const ids = disciplineIdsByAgeCategory[category] || [];
  return disciplines.filter((d) => ids.includes(d.id));
}

// Get disciplines for an athlete at a specific date
export function getDisciplinesForAthlete(
  birthYear: number,
  date?: string
): Discipline[] {
  const category = getAgeCategoryFromBirthYear(birthYear, date);
  return getDisciplinesForAgeCategory(category);
}

// Get disciplines grouped by category for a specific age category
export function getDisciplinesByCategoryForAge(
  birthYear: number,
  date?: string
): Map<DisciplineCategory, Discipline[]> {
  const ageDisciplines = getDisciplinesForAthlete(birthYear, date);
  const grouped = new Map<DisciplineCategory, Discipline[]>();

  for (const discipline of ageDisciplines) {
    const existing = grouped.get(discipline.category) || [];
    existing.push(discipline);
    grouped.set(discipline.category, existing);
  }

  return grouped;
}

// Check if a discipline is available for an age category
export function isDisciplineAvailableForAge(
  disciplineId: number,
  birthYear: number,
  date?: string
): boolean {
  const category = getAgeCategoryFromBirthYear(birthYear, date);
  const ids = disciplineIdsByAgeCategory[category] || [];
  return ids.includes(disciplineId);
}

// Age category labels in Finnish
export const ageCategoryLabels: Record<AgeCategory, string> = {
  T3: "T3 (3-vuotiaat)",
  T4: "T4 (4-vuotiaat)",
  T5: "T5 (5-vuotiaat)",
  T6: "T6 (6-vuotiaat)",
  T7: "T7 (7-vuotiaat)",
  T8: "T8 (8-vuotiaat)",
  T9: "T9 (9-vuotiaat)",
  T10: "T10 (10-vuotiaat)",
  T11: "T11 (11-vuotiaat)",
  T12: "T12 (12-vuotiaat)",
  T13: "T13 (13-vuotiaat)",
  T14: "T14 (14-vuotiaat)",
  T15: "T15 (15-vuotiaat)",
  N17: "N17 (16-17-vuotiaat)",
  N19: "N19 (18-19-vuotiaat)",
  N22: "N22 (20-22-vuotiaat)",
  N: "N (aikuiset)",
};

// Age category order (youngest to oldest) for sorting
export const ageCategoryOrder: AgeCategory[] = [
  "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10",
  "T11", "T12", "T13", "T14", "T15", "N17", "N19", "N22", "N",
];

// Sort age categories from youngest to oldest
export function sortAgeCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const indexA = ageCategoryOrder.indexOf(a as AgeCategory);
    const indexB = ageCategoryOrder.indexOf(b as AgeCategory);
    // If not found in order, put at end
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}
