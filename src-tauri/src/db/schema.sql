-- Athletes table
CREATE TABLE IF NOT EXISTS athletes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_year INTEGER NOT NULL,
    gender TEXT NOT NULL DEFAULT 'T' CHECK (gender IN ('T', 'P')),
    club_name TEXT,
    photo_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Disciplines table (seeded with standard athletics disciplines)
CREATE TABLE IF NOT EXISTS disciplines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('sprints', 'middleDistance', 'longDistance', 'hurdles', 'jumps', 'throws', 'combined', 'walking', 'crossCountry', 'relays', 'other')),
    unit TEXT NOT NULL CHECK (unit IN ('time', 'distance')),
    lower_is_better INTEGER NOT NULL DEFAULT 1,
    icon_name TEXT
);

-- Results table
CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    athlete_id INTEGER NOT NULL,
    discipline_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    value REAL NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('competition', 'training')),
    competition_name TEXT,
    competition_level TEXT CHECK (competition_level IS NULL OR competition_level IN ('seurakisat', 'koululaiskisat', 'seuran_sisaiset', 'seuraottelut', 'piirikisat', 'pm', 'hallikisat', 'aluekisat', 'pohjola_seuracup', 'sm', 'muu')),
    custom_level_name TEXT,
    location TEXT,
    placement INTEGER,
    notes TEXT,
    is_personal_best INTEGER NOT NULL DEFAULT 0,
    is_season_best INTEGER NOT NULL DEFAULT 0,
    is_national_record INTEGER NOT NULL DEFAULT 0,
    wind REAL,
    status TEXT CHECK (status IS NULL OR status IN ('valid', 'nm', 'dns', 'dnf', 'dq')),
    equipment_weight REAL,
    hurdle_height INTEGER,
    hurdle_spacing REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
    FOREIGN KEY (discipline_id) REFERENCES disciplines(id) ON DELETE RESTRICT
);

-- Competitions table
CREATE TABLE IF NOT EXISTS competitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    end_date TEXT,
    location TEXT,
    address TEXT,
    level TEXT CHECK (level IS NULL OR level IN ('seurakisat', 'koululaiskisat', 'seuran_sisaiset', 'seuraottelut', 'piirikisat', 'pm', 'hallikisat', 'aluekisat', 'pohjola_seuracup', 'sm', 'muu')),
    custom_level_name TEXT,
    notes TEXT,
    reminder_enabled INTEGER NOT NULL DEFAULT 0,
    reminder_days_before INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Competition participants junction table
CREATE TABLE IF NOT EXISTS competition_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    athlete_id INTEGER NOT NULL,
    disciplines_planned TEXT,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
    FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
    UNIQUE(competition_id, athlete_id)
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    athlete_id INTEGER NOT NULL,
    discipline_id INTEGER NOT NULL,
    target_value REAL NOT NULL,
    target_date TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'abandoned')),
    achieved_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
    FOREIGN KEY (discipline_id) REFERENCES disciplines(id) ON DELETE RESTRICT
);

-- Medals table
CREATE TABLE IF NOT EXISTS medals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    athlete_id INTEGER NOT NULL,
    result_id INTEGER,
    type TEXT NOT NULL CHECK (type IN ('gold', 'silver', 'bronze')),
    competition_name TEXT NOT NULL,
    competition_id INTEGER,
    location TEXT,
    discipline_id INTEGER,
    discipline_name TEXT,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
    FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE SET NULL,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE SET NULL,
    FOREIGN KEY (discipline_id) REFERENCES disciplines(id) ON DELETE SET NULL
);

-- Photos table (entity-based storage for athletes, results, competitions)
CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('athletes', 'results', 'competitions')),
    entity_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT,
    original_name TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    event_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sync status table (single row)
CREATE TABLE IF NOT EXISTS sync_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync_at TEXT,
    google_drive_folder_id TEXT,
    database_file_id TEXT,
    state TEXT NOT NULL DEFAULT 'notConfigured' CHECK (state IN ('notConfigured', 'synced', 'pending', 'error'))
);

-- Insert default sync status row
INSERT OR IGNORE INTO sync_status (id, state) VALUES (1, 'notConfigured');

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_results_athlete ON results(athlete_id);
CREATE INDEX IF NOT EXISTS idx_results_discipline ON results(discipline_id);
CREATE INDEX IF NOT EXISTS idx_results_date ON results(date);
CREATE INDEX IF NOT EXISTS idx_results_athlete_discipline ON results(athlete_id, discipline_id);
CREATE INDEX IF NOT EXISTS idx_results_personal_best ON results(athlete_id, discipline_id, is_personal_best);

CREATE INDEX IF NOT EXISTS idx_goals_athlete ON goals(athlete_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

CREATE INDEX IF NOT EXISTS idx_medals_athlete ON medals(athlete_id);

CREATE INDEX IF NOT EXISTS idx_competitions_date ON competitions(date);

CREATE INDEX IF NOT EXISTS idx_competition_participants_competition ON competition_participants(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_participants_athlete ON competition_participants(athlete_id);
