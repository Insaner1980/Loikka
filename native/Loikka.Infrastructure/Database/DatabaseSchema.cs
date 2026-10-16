namespace Loikka.Infrastructure.Database;

internal static class DatabaseSchema
{
    internal const string Sql = """
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

CREATE TABLE _migrations(version INTEGER PRIMARY KEY,description TEXT NOT NULL,applied_at TEXT NOT NULL DEFAULT(datetime('now')));
CREATE TABLE notes(id INTEGER PRIMARY KEY AUTOINCREMENT,content TEXT NOT NULL,athlete_id INTEGER,pinned INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT(datetime('now')),updated_at TEXT NOT NULL DEFAULT(datetime('now')),FOREIGN KEY(athlete_id) REFERENCES athletes(id) ON DELETE SET NULL);
CREATE INDEX idx_notes_athlete ON notes(athlete_id);
CREATE INDEX idx_notes_pinned ON notes(pinned);
CREATE INDEX idx_photos_entity ON photos(entity_type,entity_id);
ALTER TABLE results ADD COLUMN sub_results TEXT;
ALTER TABLE results ADD COLUMN combined_event_id INTEGER REFERENCES results(id) ON DELETE CASCADE;
CREATE INDEX idx_results_combined_event ON results(combined_event_id);
CREATE TRIGGER update_athlete_timestamp AFTER UPDATE ON athletes BEGIN UPDATE athletes SET updated_at=datetime('now') WHERE id=NEW.id; END;
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(1,'40 m','40 metriä','sprints','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(2,'60 m','60 metriä','sprints','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(3,'100 m','100 metriä','sprints','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(4,'150 m','150 metriä','sprints','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(5,'200 m','200 metriä','sprints','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(6,'300 m','300 metriä','sprints','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(7,'400 m','400 metriä','sprints','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(8,'600 m','600 metriä','middleDistance','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(9,'800 m','800 metriä','middleDistance','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(10,'1000 m','1000 metriä','middleDistance','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(11,'1500 m','1500 metriä','middleDistance','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(12,'2000 m','2000 metriä','middleDistance','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(13,'3000 m','3000 metriä','longDistance','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(14,'5000 m','5000 metriä','longDistance','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(15,'10000 m','10000 metriä','longDistance','time',1,'timer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(16,'60 m aidat','60 metriä aidat','hurdles','time',1,'fence');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(17,'80 m aidat','80 metriä aidat','hurdles','time',1,'fence');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(18,'100 m aidat','100 metriä aidat','hurdles','time',1,'fence');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(19,'200 m aidat','200 metriä aidat','hurdles','time',1,'fence');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(20,'300 m aidat','300 metriä aidat','hurdles','time',1,'fence');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(21,'400 m aidat','400 metriä aidat','hurdles','time',1,'fence');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(22,'Pituus','Pituushyppy','jumps','distance',0,'move-diagonal');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(23,'Korkeus','Korkeushyppy','jumps','distance',0,'arrow-up');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(24,'Kolmiloikka','Kolmiloikka','jumps','distance',0,'footprints');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(25,'Seiväs','Seiväshyppy','jumps','distance',0,'git-branch');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(26,'Kuula','Kuulantyöntö','throws','distance',0,'circle');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(27,'Kiekko','Kiekonheitto','throws','distance',0,'disc');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(28,'Keihäs','Keihäänheitto','throws','distance',0,'spline');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(29,'Moukari','Moukarinheitto','throws','distance',0,'hammer');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(30,'Pallo','Pallonheitto','throws','distance',0,'circle-dot');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(31,'3-ottelu','3-ottelu','combined','distance',0,'trophy');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(32,'4-ottelu','4-ottelu','combined','distance',0,'trophy');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(33,'5-ottelu','5-ottelu','combined','distance',0,'trophy');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(34,'7-ottelu','7-ottelu','combined','distance',0,'trophy');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(35,'600 m kävely','600 metriä kävely','walking','time',1,'footprints');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(36,'800 m kävely','800 metriä kävely','walking','time',1,'footprints');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(37,'2000 m kävely','2000 metriä kävely','walking','time',1,'footprints');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(38,'3000 m kävely','3000 metriä kävely','walking','time',1,'footprints');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(39,'5000 m kävely','5000 metriä kävely','walking','time',1,'footprints');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(40,'10 km kävely','10 kilometriä kävely','walking','time',1,'footprints');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(41,'1000 m kävely','1000 metriä kävely','walking','time',1,'footprints');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(42,'500 m maasto','500 metriä maastojuoksu','crossCountry','time',1,'trees');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(43,'1 km maasto','1 kilometri maastojuoksu','crossCountry','time',1,'trees');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(44,'2 km maasto','2 kilometriä maastojuoksu','crossCountry','time',1,'trees');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(45,'4 km maasto','4 kilometriä maastojuoksu','crossCountry','time',1,'trees');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(46,'10 km maasto','10 kilometriä maastojuoksu','crossCountry','time',1,'trees');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(47,'8x40 m sukkulaviesti','8x40 metriä sukkulaviesti','relays','time',1,'repeat');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(48,'4x50 m viesti','4x50 metriä viesti','relays','time',1,'repeat');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(49,'4x100 m viesti','4x100 metriä viesti','relays','time',1,'repeat');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(50,'4x200 m viesti','4x200 metriä viesti','relays','time',1,'repeat');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(51,'4x300 m viesti','4x300 metriä viesti','relays','time',1,'repeat');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(52,'4x400 m viesti','4x400 metriä viesti','relays','time',1,'repeat');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(53,'4x800 m viesti','4x800 metriä viesti','relays','time',1,'repeat');
INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(54,'Cooper','Cooper-testi (12 min)','other','distance',0,'heart-pulse');
INSERT INTO _migrations(version,description) VALUES(20,'native_schema20_baseline');
""";
}
