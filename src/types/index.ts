// Discipline categories
export type DisciplineCategory =
  | "sprints"
  | "middleDistance"
  | "longDistance"
  | "hurdles"
  | "jumps"
  | "throws"
  | "combined";

// Measurement units
export type MeasurementUnit = "time" | "distance";

// Result types
export type ResultType = "competition" | "training";

// Goal status
export type GoalStatus = "active" | "achieved" | "abandoned";

// Medal types
export type MedalType = "gold" | "silver" | "bronze";

// Sync states
export type SyncState = "notConfigured" | "synced" | "pending" | "error";

// Athlete
export interface Athlete {
  id: number;
  firstName: string;
  lastName: string;
  birthYear: number;
  clubName?: string;
  photoPath?: string;
  createdAt: string;
  updatedAt: string;
}

// Discipline
export interface Discipline {
  id: number;
  name: string; // Short name like "100m"
  fullName: string; // Full name like "100 meters"
  category: DisciplineCategory;
  unit: MeasurementUnit;
  lowerIsBetter: boolean;
  iconName?: string;
}

// Result
export interface Result {
  id: number;
  athleteId: number;
  disciplineId: number;
  date: string;
  value: number; // Time in seconds or distance in meters
  type: ResultType;
  competitionName?: string;
  location?: string;
  placement?: number;
  notes?: string;
  isPersonalBest: boolean;
  isSeasonBest: boolean;
  createdAt: string;
}

// Competition
export interface Competition {
  id: number;
  name: string;
  date: string;
  endDate?: string;
  location?: string;
  address?: string;
  notes?: string;
  reminderEnabled: boolean;
  reminderDaysBefore?: number;
  createdAt: string;
}

// Competition Participant
export interface CompetitionParticipant {
  id: number;
  competitionId: number;
  athleteId: number;
  disciplinesPlanned?: number[]; // Array of discipline IDs
}

// Goal
export interface Goal {
  id: number;
  athleteId: number;
  disciplineId: number;
  targetValue: number;
  targetDate?: string;
  status: GoalStatus;
  achievedAt?: string;
  createdAt: string;
}

// Medal
export interface Medal {
  id: number;
  athleteId: number;
  resultId?: number;
  type: MedalType;
  competitionName: string;
  disciplineName?: string;
  date: string;
  createdAt: string;
}

// Photo
export interface Photo {
  id: number;
  fileName: string;
  filePath: string;
  cloudId?: string;
  cloudUrl?: string;
  athleteId?: number;
  resultId?: number;
  competitionId?: number;
  caption?: string;
  takenAt: string;
  createdAt: string;
}

// Sync Status
export interface SyncStatus {
  id: number;
  lastSyncAt?: string;
  googleDriveFolderId?: string;
  databaseFileId?: string;
  state: SyncState;
}

// Utility types for creating new records (without id and timestamps)
export type NewAthlete = Omit<Athlete, "id" | "createdAt" | "updatedAt">;
export type NewResult = Omit<Result, "id" | "createdAt">;
export type NewCompetition = Omit<Competition, "id" | "createdAt">;
export type NewGoal = Omit<Goal, "id" | "createdAt" | "achievedAt">;
export type NewMedal = Omit<Medal, "id" | "createdAt">;
export type NewPhoto = Omit<Photo, "id" | "createdAt">;

// Types with related data populated
export interface ResultWithDetails extends Result {
  athlete?: Athlete;
  discipline?: Discipline;
}

export interface GoalWithDetails extends Goal {
  athlete?: Athlete;
  discipline?: Discipline;
}

export interface MedalWithDetails extends Medal {
  athlete?: Athlete;
  result?: Result;
}

export interface CompetitionWithParticipants extends Competition {
  participants?: (CompetitionParticipant & { athlete?: Athlete })[];
}
