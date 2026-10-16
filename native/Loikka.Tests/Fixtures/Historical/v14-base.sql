-- Source: f1d3271 schema.sql, seed_disciplines.sql and migrations through 14.
-- Synthetic structural fixture; no production data and no replay of destructive historical steps.
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
    category TEXT NOT NULL CHECK (category IN ('sprints', 'middleDistance', 'longDistance', 'hurdles', 'jumps', 'throws', 'combined')),
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

-- Sprints (Pikajuoksut) - IDs 1-5
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (1, '40m', '40 metriä', 'sprints', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (2, '60m', '60 metriä', 'sprints', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (3, '100m', '100 metriä', 'sprints', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (4, '200m', '200 metriä', 'sprints', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (5, '400m', '400 metriä', 'sprints', 'time', 1, 'timer');

-- Middle distance (Keskimatkat) - IDs 6-8
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (6, '800m', '800 metriä', 'middleDistance', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (7, '1000m', '1000 metriä', 'middleDistance', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (8, '1500m', '1500 metriä', 'middleDistance', 'time', 1, 'timer');

-- Long distance (Pitkät matkat) - IDs 9-11
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (9, '3000m', '3000 metriä', 'longDistance', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (10, '5000m', '5000 metriä', 'longDistance', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (11, '10000m', '10000 metriä', 'longDistance', 'time', 1, 'timer');

-- Hurdles (Aidat) - IDs 12-16
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (12, '60m aj', '60 metriä aidat', 'hurdles', 'time', 1, 'fence');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (13, '80m aj', '80 metriä aidat', 'hurdles', 'time', 1, 'fence');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (14, '100m aj', '100 metriä aidat', 'hurdles', 'time', 1, 'fence');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (15, '300m aj', '300 metriä aidat', 'hurdles', 'time', 1, 'fence');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (16, '400m aj', '400 metriä aidat', 'hurdles', 'time', 1, 'fence');

-- Jumps (Hypyt) - IDs 17-20
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (17, 'Pituus', 'Pituushyppy', 'jumps', 'distance', 0, 'move-diagonal');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (18, 'Kolmiloikka', 'Kolmiloikka', 'jumps', 'distance', 0, 'footprints');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (19, 'Korkeus', 'Korkeushyppy', 'jumps', 'distance', 0, 'arrow-up');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (20, 'Seiväs', 'Seiväshyppy', 'jumps', 'distance', 0, 'git-branch');

-- Throws (Heitot) - IDs 21-25
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (21, 'Kuula', 'Kuulantyöntö', 'throws', 'distance', 0, 'circle');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (22, 'Kiekko', 'Kiekonheitto', 'throws', 'distance', 0, 'disc');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (23, 'Keihäs', 'Keihäänheitto', 'throws', 'distance', 0, 'spline');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (24, 'Moukari', 'Moukarinheitto', 'throws', 'distance', 0, 'hammer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (25, 'Pallo', 'Pallonheitto', 'throws', 'distance', 0, 'circle-dot');

-- Combined events (Moniottelu) - IDs 26-27
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (26, '5-ottelu', '5-ottelu', 'combined', 'distance', 0, 'trophy');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (27, '7-ottelu', '7-ottelu', 'combined', 'distance', 0, 'trophy');

CREATE TABLE notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                athlete_id INTEGER,
                pinned INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE SET NULL
            );
CREATE INDEX idx_photos_entity ON photos(entity_type,entity_id);
CREATE INDEX idx_notes_athlete ON notes(athlete_id);
CREATE INDEX idx_notes_pinned ON notes(pinned);
CREATE TABLE _migrations(version INTEGER PRIMARY KEY,description TEXT NOT NULL,applied_at TEXT NOT NULL DEFAULT(datetime('now')));
INSERT INTO _migrations(version,description,applied_at) VALUES(1,'create_initial_schema','2025-12-30 00:00:00');
INSERT INTO _migrations(version,description,applied_at) VALUES(2,'seed_disciplines','2025-12-30 00:00:00');
INSERT INTO _migrations(version,description,applied_at) VALUES(3,'recreate_photos_table','2025-12-30 00:00:00');
INSERT INTO _migrations(version,description,applied_at) VALUES(4,'add_competition_level','2025-12-30 00:00:00');
INSERT INTO _migrations(version,description,applied_at) VALUES(5,'add_result_competition_level','2025-12-30 00:00:00');
INSERT INTO _migrations(version,description,applied_at) VALUES(6,'add_result_details_wind_status_equipment','2025-12-30 00:00:00');
INSERT INTO _migrations(version,description,applied_at) VALUES(7,'add_athlete_gender','2025-12-30 00:00:00');
INSERT INTO _migrations(version,description,applied_at) VALUES(8,'add_photo_event_name','2025-12-30 00:00:00');
INSERT INTO _migrations(version,description,applied_at) VALUES(9,'add_result_national_record','2025-12-30 00:00:00');
INSERT INTO _migrations(version,description,applied_at) VALUES(10,'checkpoint_consolidated_schema','2025-12-30 00:00:00');
INSERT INTO _migrations(version,description,applied_at) VALUES(11,'seed_test_data_disabled','2025-12-30 00:00:00');
INSERT INTO _migrations(version,description,applied_at) VALUES(12,'add_custom_level_name','2025-12-30 00:00:00');
INSERT INTO _migrations(version,description,applied_at) VALUES(13,'fix_check_constraint_skipped_already_correct','2025-12-30 00:00:00');
INSERT INTO _migrations(version,description,applied_at) VALUES(14,'add_notes_table','2025-12-30 00:00:00');
