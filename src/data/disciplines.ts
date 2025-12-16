import type { Discipline, DisciplineCategory } from "../types";

// Category labels in Finnish
export const categoryLabels: Record<DisciplineCategory, string> = {
  sprints: "Pikajuoksut",
  middleDistance: "Keskimatkat",
  longDistance: "Kestävyys",
  hurdles: "Aidat",
  jumps: "Hypyt",
  throws: "Heitot",
  combined: "Yhdistetyt",
};

// All disciplines with Finnish names
export const disciplines: Discipline[] = [
  // Sprints
  {
    id: 1,
    name: "60m",
    fullName: "60 metriä",
    category: "sprints",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 2,
    name: "100m",
    fullName: "100 metriä",
    category: "sprints",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 3,
    name: "200m",
    fullName: "200 metriä",
    category: "sprints",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 4,
    name: "400m",
    fullName: "400 metriä",
    category: "sprints",
    unit: "time",
    lowerIsBetter: true,
  },

  // Middle Distance
  {
    id: 5,
    name: "800m",
    fullName: "800 metriä",
    category: "middleDistance",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 6,
    name: "1000m",
    fullName: "1000 metriä",
    category: "middleDistance",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 7,
    name: "1500m",
    fullName: "1500 metriä",
    category: "middleDistance",
    unit: "time",
    lowerIsBetter: true,
  },

  // Long Distance
  {
    id: 8,
    name: "3000m",
    fullName: "3000 metriä",
    category: "longDistance",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 9,
    name: "5000m",
    fullName: "5000 metriä",
    category: "longDistance",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 10,
    name: "10000m",
    fullName: "10000 metriä",
    category: "longDistance",
    unit: "time",
    lowerIsBetter: true,
  },

  // Hurdles
  {
    id: 11,
    name: "60m aj",
    fullName: "60 metriä aidat",
    category: "hurdles",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 12,
    name: "80m aj",
    fullName: "80 metriä aidat",
    category: "hurdles",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 13,
    name: "100m aj",
    fullName: "100 metriä aidat",
    category: "hurdles",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 14,
    name: "110m aj",
    fullName: "110 metriä aidat",
    category: "hurdles",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 15,
    name: "300m aj",
    fullName: "300 metriä aidat",
    category: "hurdles",
    unit: "time",
    lowerIsBetter: true,
  },
  {
    id: 16,
    name: "400m aj",
    fullName: "400 metriä aidat",
    category: "hurdles",
    unit: "time",
    lowerIsBetter: true,
  },

  // Jumps
  {
    id: 17,
    name: "Pituus",
    fullName: "Pituushyppy",
    category: "jumps",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 18,
    name: "Kolmiloikka",
    fullName: "Kolmiloikka",
    category: "jumps",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 19,
    name: "Korkeus",
    fullName: "Korkeushyppy",
    category: "jumps",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 20,
    name: "Seiväs",
    fullName: "Seiväshyppy",
    category: "jumps",
    unit: "distance",
    lowerIsBetter: false,
  },

  // Throws
  {
    id: 21,
    name: "Kuula",
    fullName: "Kuulantyöntö",
    category: "throws",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 22,
    name: "Kiekko",
    fullName: "Kiekonheitto",
    category: "throws",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 23,
    name: "Keihäs",
    fullName: "Keihäänheitto",
    category: "throws",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 24,
    name: "Moukari",
    fullName: "Moukarinheitto",
    category: "throws",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 25,
    name: "Pallo",
    fullName: "Pallonheitto",
    category: "throws",
    unit: "distance",
    lowerIsBetter: false,
  },

  // Combined
  {
    id: 26,
    name: "5-ottelu",
    fullName: "5-ottelu",
    category: "combined",
    unit: "distance", // Points, but treated as distance (higher is better)
    lowerIsBetter: false,
  },
  {
    id: 27,
    name: "7-ottelu",
    fullName: "7-ottelu",
    category: "combined",
    unit: "distance",
    lowerIsBetter: false,
  },
  {
    id: 28,
    name: "10-ottelu",
    fullName: "10-ottelu",
    category: "combined",
    unit: "distance",
    lowerIsBetter: false,
  },
];

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
  "hurdles",
  "jumps",
  "throws",
  "combined",
];
