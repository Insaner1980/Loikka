// Discipline categories
export type DisciplineCategory =
  | "sprints"
  | "middleDistance"
  | "longDistance"
  | "hurdles"
  | "jumps"
  | "throws"
  | "combined"
  | "walking";

// Age categories for Finnish youth athletics
export type AgeCategory =
  | "T3" | "T4" | "T5" | "T6" | "T7" | "T8"
  | "T9" | "T10" | "T11" | "T12" | "T13" | "T14" | "T15"
  | "N17" | "N19" | "N22" | "N";

// Measurement units
export type MeasurementUnit = "time" | "distance";

// Result types
export type ResultType = "competition" | "training";

// Result status
export type ResultStatus = "valid" | "nm" | "dns" | "dnf" | "dq";

// Goal status
export type GoalStatus = "active" | "achieved" | "abandoned";

// Medal types
export type MedalType = "gold" | "silver" | "bronze";

// Competition level
export type CompetitionLevel =
  | "seurakisat"        // Seurakisat
  | "koululaiskisat"    // Koululaiskisat
  | "seuran_sisaiset"   // Seuran sisäiset kisat
  | "seuraottelut"      // Seuraottelut
  | "piirikisat"        // Piirikisat
  | "pm"                // Piirinmestaruuskilpailut (PM)
  | "hallikisat"        // Hallikisat
  | "aluekisat"         // Aluekisat
  | "pohjola_seuracup"  // Pohjola Seuracup
  | "sm"                // SM-kilpailut
  | "muu";              // Muu (custom level)

// Sync states (for Google Drive connection status in database)
export type SyncState = "notConfigured" | "synced" | "pending" | "error";

// Sync operation status (for UI state during sync operations)
export type SyncOperationStatus = "idle" | "syncing" | "success" | "error";

// Entity types for photos
export type PhotoEntityType = "athletes" | "results" | "competitions";

// Gender
export type Gender = "T" | "P"; // T = Tytöt (girls), P = Pojat (boys)

// Athlete
export interface Athlete {
  id: number;
  firstName: string;
  lastName: string;
  birthYear: number;
  gender: Gender;
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
  competitionLevel?: CompetitionLevel;
  customLevelName?: string; // Custom level name when competitionLevel is "muu"
  location?: string;
  placement?: number;
  notes?: string;
  isPersonalBest: boolean;
  isSeasonBest: boolean;
  isNationalRecord: boolean;
  wind?: number; // Wind speed in m/s (for sprints, hurdles, long jump, triple jump)
  status?: ResultStatus; // Result status (valid, nm, dns, dnf, dq)
  equipmentWeight?: number; // Equipment weight in kg (for throws)
  hurdleHeight?: number; // Hurdle height in cm (for hurdles)
  hurdleSpacing?: number; // Hurdle spacing in m (for hurdles)
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
  level?: CompetitionLevel;
  customLevelName?: string; // Custom level name when level is "muu"
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
  competitionId?: number;
  location?: string;
  disciplineId?: number;
  disciplineName?: string;
  date: string;
  createdAt: string;
}

// Photo
export interface Photo {
  id: number;
  entityType: PhotoEntityType;
  entityId: number;
  filePath: string;
  thumbnailPath: string | null;
  originalName: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  eventName?: string;
  createdAt: string;
}

// Photo with related entity details (from get_all_photos)
export interface PhotoWithDetails extends Photo {
  athleteName: string | null;
  competitionName: string | null;
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
export type UpdateResult = Partial<NewResult>;
export type NewCompetition = Omit<Competition, "id" | "createdAt">;
export type NewGoal = Omit<Goal, "id" | "createdAt" | "achievedAt">;
export type NewMedal = Omit<Medal, "id" | "createdAt">;
export type NewPhoto = Omit<Photo, "id" | "createdAt" | "thumbnailPath" | "width" | "height">;

// Competition with participants populated
export interface CompetitionWithParticipants extends Competition {
  participants?: (CompetitionParticipant & { athlete?: Athlete })[];
}

// Google Drive sync types
export interface SyncOptions {
  includeDatabase: boolean;
  includeProfilePhotos: boolean;
  includeResultPhotos: boolean;
  selectedPhotoIds?: string[];
}

export interface CloudPhoto {
  id: string;
  name: string;
  folder: string;
  sizeBytes: number;
  createdAt?: string;
}

export interface LocalPhoto {
  path: string;
  name: string;
  folder: string;
  sizeBytes: number;
}

// Athlete statistics (aggregated data)
export interface AthleteStats {
  disciplineCount: number;
  resultCount: number;
  pbCount: number;
  sbCount: number;
  nrCount: number;
  goldMedals: number;
  silverMedals: number;
  bronzeMedals: number;
}

// Athlete with statistics
export interface AthleteWithStats {
  athlete: Athlete;
  stats: AthleteStats;
}

// Result with discipline details
export interface ResultWithDiscipline extends Result {
  discipline: Discipline;
}

// Goal with progress calculation
export interface GoalWithProgress extends Goal {
  currentBest: number | null;
  progress: number;
  remaining: number | null;
}

