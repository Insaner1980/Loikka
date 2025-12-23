/**
 * Tauri API mocks for E2E testing in browser environment.
 * This script is injected into the page before the app loads.
 */

export const tauriMockScript = `
// Mock data
const mockAthletes = [
  {
    athlete: {
      id: 1,
      firstName: "Testi",
      lastName: "Urheilija",
      birthYear: 2015,
      gender: "T",
      clubName: "Testiseura",
      photoPath: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z"
    },
    stats: {
      disciplineCount: 3,
      resultCount: 10,
      pbCount: 3,
      sbCount: 2,
      nrCount: 0,
      goldMedals: 1,
      silverMedals: 2,
      bronzeMedals: 0
    }
  }
];

const mockResults = [
  {
    id: 1,
    athleteId: 1,
    disciplineId: 3, // 100m
    date: "2024-06-15",
    value: 14.52,
    type: "competition",
    competitionName: "Seurakisat",
    competitionLevel: "seura",
    location: "Helsinki",
    placement: 1,
    notes: null,
    isPersonalBest: true,
    isSeasonBest: true,
    isNationalRecord: false,
    wind: 1.2,
    status: "valid",
    equipmentWeight: null,
    hurdleHeight: null,
    hurdleSpacing: null,
    createdAt: "2024-06-15T12:00:00Z"
  }
];

const mockCompetitions = [
  {
    id: 1,
    name: "Testikisat",
    date: "2025-01-15",
    endDate: null,
    location: "Helsinki",
    address: "Olympiastadion",
    level: "seura",
    notes: null,
    reminderEnabled: true,
    reminderDaysBefore: 3,
    createdAt: "2024-01-01T00:00:00Z"
  }
];

const mockGoals = [
  {
    id: 1,
    athleteId: 1,
    disciplineId: 3,
    targetValue: 13.50,
    targetDate: "2025-08-01",
    status: "active",
    achievedAt: null,
    createdAt: "2024-01-01T00:00:00Z"
  }
];

const mockMedals = [
  {
    id: 1,
    athleteId: 1,
    resultId: 1,
    type: "gold",
    competitionName: "Seurakisat",
    competitionId: 1,
    location: "Helsinki",
    disciplineId: 3,
    disciplineName: "100m",
    date: "2024-06-15",
    createdAt: "2024-06-15T12:00:00Z"
  }
];

const mockPhotos = [];

// Command handlers
const commandHandlers = {
  // Athletes
  get_all_athletes: () => mockAthletes,
  create_athlete: (args) => ({ ...args.athlete, id: Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
  update_athlete: () => true,
  delete_athlete: () => true,
  get_results_by_athlete: () => mockResults,
  get_athlete_medals: () => mockMedals,
  get_goals_by_athlete: () => mockGoals,
  save_athlete_profile_photo: () => "/mock/photo/path.jpg",

  // Results
  get_all_results: () => mockResults,
  create_result: (args) => ({ ...args.result, id: Date.now(), isPersonalBest: false, isSeasonBest: false, isNationalRecord: false, createdAt: new Date().toISOString() }),
  update_result: (args) => ({ id: args.id, ...args.result }),
  delete_result: () => true,
  check_personal_best: () => false,
  check_season_best: () => false,

  // Competitions
  get_all_competitions: () => mockCompetitions,
  get_upcoming_competitions: () => mockCompetitions,
  create_competition: (args) => ({ ...args.competition, id: Date.now(), createdAt: new Date().toISOString() }),
  update_competition: () => true,
  delete_competition: () => true,
  get_competition_participants: () => [],
  add_competition_participant: (args) => ({ id: Date.now(), ...args }),
  remove_competition_participant: () => true,

  // Goals
  get_all_goals: () => mockGoals,
  create_goal: (args) => ({ ...args.goal, id: Date.now(), status: "active", achievedAt: null, createdAt: new Date().toISOString() }),
  update_goal: () => true,
  delete_goal: () => true,
  mark_goal_achieved: () => true,

  // Medals
  create_medal: (args) => ({ ...args.medal, id: Date.now(), createdAt: new Date().toISOString() }),

  // Photos
  get_photos: () => mockPhotos,
  get_all_photos: () => mockPhotos,
  get_photo_years: () => [2024, 2023],
  get_photo_count: () => 0,
  save_photo: (args) => ({ id: Date.now(), ...args, createdAt: new Date().toISOString() }),
  delete_photo: () => true,

  // Export/Import
  export_data: () => JSON.stringify({ version: "1.0", athletes: mockAthletes, results: mockResults, competitions: mockCompetitions, goals: mockGoals, medals: mockMedals }),
  import_data: () => true,

  // Google Drive (all return safe defaults)
  check_auth_status: () => ({ isAuthenticated: false, userEmail: null, expiresAt: null }),
  start_auth_flow: () => "https://mock-auth-url.com",
  complete_auth: () => true,
  disconnect_drive: () => true,
  sync_to_drive: () => ({ success: true, message: "Mock sync", syncedAt: new Date().toISOString(), itemsSynced: 0 }),
  sync_from_drive: () => ({ success: true, message: "Mock sync", syncedAt: new Date().toISOString(), itemsSynced: 0 }),
  get_cloud_backups: () => [],
  delete_cloud_backup: () => true,
  list_cloud_photos: () => [],
  list_local_photos: () => [],
  sync_to_drive_with_options: () => ({ success: true, message: "Mock sync", syncedAt: new Date().toISOString(), itemsSynced: 0 }),
  restore_from_drive_with_options: () => ({ success: true, message: "Mock sync", syncedAt: new Date().toISOString(), itemsSynced: 0 }),
};

// Mock invoke function
async function mockInvoke(command, args = {}) {
  console.log('[Tauri Mock] invoke:', command, args);

  const handler = commandHandlers[command];
  if (handler) {
    const result = handler(args);
    console.log('[Tauri Mock] result:', result);
    return result;
  }

  console.warn('[Tauri Mock] Unknown command:', command);
  return null;
}

// Mock convertFileSrc
function mockConvertFileSrc(path) {
  if (!path) return '';
  return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
}

// Set up Tauri internals
window.__TAURI_INTERNALS__ = {
  invoke: mockInvoke,
  convertFileSrc: mockConvertFileSrc,
  metadata: { currentWindow: { label: 'main' } },
  plugins: {}
};

window.__TAURI__ = {
  core: {
    invoke: mockInvoke,
    convertFileSrc: mockConvertFileSrc
  },
  window: {
    getCurrentWindow: () => ({
      label: 'main',
      close: () => Promise.resolve(),
      minimize: () => Promise.resolve(),
      maximize: () => Promise.resolve(),
      unmaximize: () => Promise.resolve(),
      toggleMaximize: () => Promise.resolve(),
      isMaximized: () => Promise.resolve(false),
      setTitle: () => Promise.resolve(),
      onCloseRequested: () => Promise.resolve(() => {}),
    }),
    Window: class {
      constructor() {}
    }
  },
  event: {
    listen: () => Promise.resolve(() => {}),
    emit: () => Promise.resolve(),
    once: () => Promise.resolve(() => {})
  },
  dialog: {
    open: () => Promise.resolve(null),
    save: () => Promise.resolve(null),
    message: () => Promise.resolve(),
    ask: () => Promise.resolve(true),
    confirm: () => Promise.resolve(true)
  },
  fs: {
    readFile: () => Promise.resolve(new Uint8Array()),
    writeFile: () => Promise.resolve(),
    readTextFile: () => Promise.resolve(''),
    writeTextFile: () => Promise.resolve(),
    exists: () => Promise.resolve(true),
    createDir: () => Promise.resolve(),
    removeDir: () => Promise.resolve(),
    removeFile: () => Promise.resolve(),
    copyFile: () => Promise.resolve(),
    renameFile: () => Promise.resolve()
  },
  notification: {
    isPermissionGranted: () => Promise.resolve(true),
    requestPermission: () => Promise.resolve('granted'),
    sendNotification: () => Promise.resolve()
  },
  path: {
    appDataDir: () => Promise.resolve('/mock/app/data'),
    appConfigDir: () => Promise.resolve('/mock/app/config'),
    join: (...parts) => Promise.resolve(parts.join('/'))
  }
};

// Also expose on window for direct access
window.__TAURI_INVOKE__ = mockInvoke;

console.log('[Tauri Mock] Tauri APIs mocked successfully');
`;
