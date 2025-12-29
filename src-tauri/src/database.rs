use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::sync::Mutex;

pub type DbPool = Pool<Sqlite>;

pub struct AppDatabase(pub Arc<Mutex<Option<DbPool>>>);

impl AppDatabase {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(None)))
    }
}

pub async fn init_database(app: &AppHandle) -> Result<DbPool, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    // Ensure directory exists
    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    let db_path = app_dir.join("loikka.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // Run migrations
    run_migrations(&pool).await?;

    Ok(pool)
}

async fn run_migrations(pool: &DbPool) -> Result<(), String> {
    // Check if migrations table exists
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            description TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )"#
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create migrations table: {}", e))?;

    // Check current version
    let current_version: i32 = sqlx::query_scalar("SELECT COALESCE(MAX(version), 0) FROM _migrations")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to get migration version: {}", e))?;

    // Run pending migrations
    if current_version < 1 {
        run_migration_v1(pool).await?;
    }

    if current_version < 2 {
        run_migration_v2(pool).await?;
    }

    if current_version < 3 {
        run_migration_v3(pool).await?;
    }

    if current_version < 4 {
        run_migration_v4(pool).await?;
    }

    if current_version < 5 {
        run_migration_v5(pool).await?;
    }

    if current_version < 6 {
        run_migration_v6(pool).await?;
    }

    if current_version < 7 {
        run_migration_v7(pool).await?;
    }

    if current_version < 8 {
        run_migration_v8(pool).await?;
    }

    if current_version < 9 {
        run_migration_v9(pool).await?;
    }

    if current_version < 10 {
        run_migration_v10(pool).await?;
    }

    if current_version < 11 {
        run_migration_v11(pool).await?;
    }

    if current_version < 12 {
        run_migration_v12(pool).await?;
    }

    if current_version < 13 {
        run_migration_v13(pool).await?;
    }

    if current_version < 14 {
        run_migration_v14(pool).await?;
    }

    Ok(())
}

async fn run_migration_v1(pool: &DbPool) -> Result<(), String> {
    let schema = include_str!("db/schema.sql");

    // Split by semicolons and execute each statement
    for statement in schema.split(';') {
        let stmt = statement.trim();
        if !stmt.is_empty() {
            sqlx::query(stmt)
                .execute(pool)
                .await
                .map_err(|e| format!("Migration v1 failed: {} - SQL: {}", e, stmt))?;
        }
    }

    // Create trigger separately (can't be split by semicolons)
    sqlx::query(
        r#"CREATE TRIGGER IF NOT EXISTS update_athlete_timestamp
        AFTER UPDATE ON athletes
        BEGIN
            UPDATE athletes SET updated_at = datetime('now') WHERE id = NEW.id;
        END"#
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Migration v1 failed creating trigger: {}", e))?;

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (1, 'create_initial_schema')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v1: {}", e))?;

    Ok(())
}

async fn run_migration_v2(pool: &DbPool) -> Result<(), String> {
    let seed = include_str!("db/seed_disciplines.sql");

    for statement in seed.split(';') {
        let stmt = statement.trim();
        if !stmt.is_empty() {
            sqlx::query(stmt)
                .execute(pool)
                .await
                .map_err(|e| format!("Migration v2 failed: {} - SQL: {}", e, stmt))?;
        }
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (2, 'seed_disciplines')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v2: {}", e))?;

    Ok(())
}

async fn run_migration_v3(pool: &DbPool) -> Result<(), String> {
    // Check if photos table exists and has entity_type column
    let has_entity_type: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('photos') WHERE name = 'entity_type'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v3 failed checking entity_type column: {}", e))?;

    // If photos table already has entity_type, just ensure index exists
    if has_entity_type {
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_photos_entity ON photos(entity_type, entity_id)")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v3 failed creating index: {}", e))?;
    } else {
        // Check if photos table exists at all
        let table_exists: bool = sqlx::query_scalar(
            "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='photos'"
        )
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Migration v3 failed checking photos table: {}", e))?;

        if table_exists {
            // Rename old table and create new one
            let statements = [
                "DROP TABLE IF EXISTS photos_old",
                "ALTER TABLE photos RENAME TO photos_old",
            ];
            for stmt in statements {
                sqlx::query(stmt)
                    .execute(pool)
                    .await
                    .map_err(|e| format!("Migration v3 failed: {} - SQL: {}", e, stmt))?;
            }
        }

        // Create new photos table
        sqlx::query(r#"CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_type TEXT NOT NULL CHECK (entity_type IN ('athletes', 'results', 'competitions')),
            entity_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            thumbnail_path TEXT,
            original_name TEXT NOT NULL,
            width INTEGER,
            height INTEGER,
            size_bytes INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )"#)
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v3 failed creating photos table: {}", e))?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_photos_entity ON photos(entity_type, entity_id)")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v3 failed creating index: {}", e))?;

        sqlx::query("DROP TABLE IF EXISTS photos_old")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v3 failed dropping old table: {}", e))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (3, 'recreate_photos_table')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v3: {}", e))?;

    Ok(())
}

async fn run_migration_v4(pool: &DbPool) -> Result<(), String> {
    // Add level column to competitions table
    let has_level: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('competitions') WHERE name = 'level'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v4 failed checking level column: {}", e))?;

    if !has_level {
        sqlx::query("ALTER TABLE competitions ADD COLUMN level TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v4 failed adding level column: {}", e))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (4, 'add_competition_level')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v4: {}", e))?;

    Ok(())
}

async fn run_migration_v5(pool: &DbPool) -> Result<(), String> {
    // Add competition_level column to results table
    let has_level: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('results') WHERE name = 'competition_level'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v5 failed checking competition_level column: {}", e))?;

    if !has_level {
        sqlx::query("ALTER TABLE results ADD COLUMN competition_level TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v5 failed adding competition_level column: {}", e))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (5, 'add_result_competition_level')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v5: {}", e))?;

    Ok(())
}

async fn run_migration_v6(pool: &DbPool) -> Result<(), String> {
    // Add wind column to results table
    let has_wind: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('results') WHERE name = 'wind'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v6 failed checking wind column: {}", e))?;

    if !has_wind {
        sqlx::query("ALTER TABLE results ADD COLUMN wind REAL")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v6 failed adding wind column: {}", e))?;
    }

    // Add status column to results table
    let has_status: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('results') WHERE name = 'status'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v6 failed checking status column: {}", e))?;

    if !has_status {
        sqlx::query("ALTER TABLE results ADD COLUMN status TEXT DEFAULT 'valid'")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v6 failed adding status column: {}", e))?;
    }

    // Add equipment_weight column to results table (for throws)
    let has_weight: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('results') WHERE name = 'equipment_weight'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v6 failed checking equipment_weight column: {}", e))?;

    if !has_weight {
        sqlx::query("ALTER TABLE results ADD COLUMN equipment_weight REAL")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v6 failed adding equipment_weight column: {}", e))?;
    }

    // Add hurdle_height column to results table (for hurdles)
    let has_height: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('results') WHERE name = 'hurdle_height'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v6 failed checking hurdle_height column: {}", e))?;

    if !has_height {
        sqlx::query("ALTER TABLE results ADD COLUMN hurdle_height INTEGER")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v6 failed adding hurdle_height column: {}", e))?;
    }

    // Add hurdle_spacing column to results table (for hurdles)
    let has_spacing: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('results') WHERE name = 'hurdle_spacing'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v6 failed checking hurdle_spacing column: {}", e))?;

    if !has_spacing {
        sqlx::query("ALTER TABLE results ADD COLUMN hurdle_spacing REAL")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v6 failed adding hurdle_spacing column: {}", e))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (6, 'add_result_details_wind_status_equipment')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v6: {}", e))?;

    Ok(())
}

async fn run_migration_v7(pool: &DbPool) -> Result<(), String> {
    // Add gender column to athletes table
    let has_gender: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('athletes') WHERE name = 'gender'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v7 failed checking gender column: {}", e))?;

    if !has_gender {
        // Default to 'T' (tytöt/girls) for existing athletes
        sqlx::query("ALTER TABLE athletes ADD COLUMN gender TEXT NOT NULL DEFAULT 'T'")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v7 failed adding gender column: {}", e))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (7, 'add_athlete_gender')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v7: {}", e))?;

    Ok(())
}

async fn run_migration_v8(pool: &DbPool) -> Result<(), String> {
    // Add event_name column to photos table for free-text event/competition names
    let has_event_name: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('photos') WHERE name = 'event_name'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v8 failed checking event_name column: {}", e))?;

    if !has_event_name {
        sqlx::query("ALTER TABLE photos ADD COLUMN event_name TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v8 failed adding event_name column: {}", e))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (8, 'add_photo_event_name')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v8: {}", e))?;

    Ok(())
}

async fn run_migration_v9(pool: &DbPool) -> Result<(), String> {
    // Add is_national_record column to results table
    let has_national_record: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('results') WHERE name = 'is_national_record'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to check is_national_record column: {}", e))?;

    if !has_national_record {
        sqlx::query("ALTER TABLE results ADD COLUMN is_national_record INTEGER NOT NULL DEFAULT 0")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v9 failed adding is_national_record column: {}", e))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (9, 'add_result_national_record')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v9: {}", e))?;

    Ok(())
}

async fn run_migration_v10(pool: &DbPool) -> Result<(), String> {
    // Migration v10: Checkpoint
    // This migration marks a consolidation point where:
    // - schema.sql contains the complete database schema (all columns from v1-v9)
    // - seed_disciplines.sql contains the discipline seed data
    // - All previous migrations (v1-v9) are now considered legacy
    //
    // For new installations, v1 runs schema.sql which already has all columns,
    // so migrations v3-v9 (which add columns) are no-ops.
    // This checkpoint documents that the schema is now consolidated.

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (10, 'checkpoint_consolidated_schema')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v10: {}", e))?;

    Ok(())
}

async fn run_migration_v11(pool: &DbPool) -> Result<(), String> {
    // Migration v11: Test data seed - DISABLED
    // Test data seeding is now handled separately in development.
    // This migration is kept as a no-op for version compatibility.
    sqlx::query("INSERT INTO _migrations (version, description) VALUES (11, 'seed_test_data_disabled')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v11: {}", e))?;

    Ok(())
}

async fn run_migration_v12(pool: &DbPool) -> Result<(), String> {
    // Add custom_level_name column to results table
    let has_results_custom_level: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('results') WHERE name = 'custom_level_name'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v12 failed checking custom_level_name column in results: {}", e))?;

    if !has_results_custom_level {
        sqlx::query("ALTER TABLE results ADD COLUMN custom_level_name TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v12 failed adding custom_level_name column to results: {}", e))?;
    }

    // Add custom_level_name column to competitions table
    let has_competitions_custom_level: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('competitions') WHERE name = 'custom_level_name'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v12 failed checking custom_level_name column in competitions: {}", e))?;

    if !has_competitions_custom_level {
        sqlx::query("ALTER TABLE competitions ADD COLUMN custom_level_name TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v12 failed adding custom_level_name column to competitions: {}", e))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (12, 'add_custom_level_name')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v12: {}", e))?;

    Ok(())
}

async fn run_migration_v13(pool: &DbPool) -> Result<(), String> {
    // Recreate results table with updated CHECK constraint that includes 'muu'
    // SQLite doesn't support ALTER TABLE to modify CHECK constraints
    //
    // IMPORTANT: If schema.sql was used (fresh install), the CHECK constraint
    // already includes 'muu', so we skip this migration to avoid breaking it.

    // Check if the results table schema already contains 'muu' in CHECK constraint
    let table_sql: Option<String> = sqlx::query_scalar(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='results'"
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Migration v13 failed getting results schema: {}", e))?;

    if let Some(sql) = &table_sql {
        if sql.contains("'muu'") {
            // Schema already has 'muu' - this is a fresh install from updated schema.sql
            // Skip migration entirely
            sqlx::query("INSERT INTO _migrations (version, description) VALUES (13, 'fix_check_constraint_skipped_already_correct')")
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to record migration v13: {}", e))?;
            return Ok(());
        }
    }

    // Check if results table exists (it might have been dropped in a partial migration)
    let results_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='results'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v13 failed checking if results exists: {}", e))?;

    // Check if results_new already exists (from a partial migration)
    let results_new_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='results_new'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v13 failed checking if results_new exists: {}", e))?;

    // Handle partial migration state: results_new exists but results doesn't
    if results_new_exists && !results_exists {
        // Just rename results_new to results
        sqlx::query("ALTER TABLE results_new RENAME TO results")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v13 failed renaming results_new (recovery): {}", e))?;
    } else if results_exists {
        // Normal case: results exists, need to migrate

        // Drop results_new if it exists from a failed attempt
        if results_new_exists {
            sqlx::query("DROP TABLE results_new")
                .execute(pool)
                .await
                .map_err(|e| format!("Migration v13 failed dropping old results_new: {}", e))?;
        }

        // Step 1: Create new results table with correct CHECK constraint
        sqlx::query(r#"
            CREATE TABLE results_new (
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
            )
        "#)
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v13 failed creating results_new table: {}", e))?;

        // Step 2: Copy data from old table to new table
        sqlx::query(r#"
            INSERT INTO results_new (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, custom_level_name, location, placement, notes, is_personal_best, is_season_best, is_national_record, wind, status, equipment_weight, hurdle_height, hurdle_spacing, created_at)
            SELECT id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, custom_level_name, location, placement, notes, is_personal_best, is_season_best, is_national_record, wind, status, equipment_weight, hurdle_height, hurdle_spacing, created_at
            FROM results
        "#)
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v13 failed copying results data: {}", e))?;

        // Step 3: Drop old table
        sqlx::query("DROP TABLE results")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v13 failed dropping old results table: {}", e))?;

        // Step 4: Rename new table
        sqlx::query("ALTER TABLE results_new RENAME TO results")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v13 failed renaming results_new: {}", e))?;
    }

    // Recreate indexes (always do this to ensure they exist)
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_results_athlete ON results(athlete_id)")
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v13 failed creating idx_results_athlete: {}", e))?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_results_discipline ON results(discipline_id)")
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v13 failed creating idx_results_discipline: {}", e))?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_results_date ON results(date)")
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v13 failed creating idx_results_date: {}", e))?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_results_athlete_discipline ON results(athlete_id, discipline_id)")
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v13 failed creating idx_results_athlete_discipline: {}", e))?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_results_personal_best ON results(athlete_id, discipline_id, is_personal_best)")
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v13 failed creating idx_results_personal_best: {}", e))?;

    // Now do the same for competitions table
    // First check if competitions table already has correct CHECK constraint
    let competitions_sql: Option<String> = sqlx::query_scalar(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='competitions'"
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Migration v13 failed getting competitions schema: {}", e))?;

    let competitions_needs_migration = if let Some(sql) = &competitions_sql {
        !sql.contains("'muu'")  // Only migrate if 'muu' is NOT in the schema
    } else {
        false  // Table doesn't exist, nothing to migrate
    };

    if !competitions_needs_migration {
        // Schema already correct or table doesn't exist, skip competitions migration
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_competitions_date ON competitions(date)")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v13 failed creating idx_competitions_date: {}", e))?;

        sqlx::query("INSERT INTO _migrations (version, description) VALUES (13, 'fix_check_constraint_add_muu')")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to record migration v13: {}", e))?;

        return Ok(());
    }

    let competitions_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='competitions'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v13 failed checking if competitions exists: {}", e))?;

    let competitions_new_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='competitions_new'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v13 failed checking if competitions_new exists: {}", e))?;

    if competitions_new_exists && !competitions_exists {
        sqlx::query("ALTER TABLE competitions_new RENAME TO competitions")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v13 failed renaming competitions_new (recovery): {}", e))?;
    } else if competitions_exists {
        if competitions_new_exists {
            sqlx::query("DROP TABLE competitions_new")
                .execute(pool)
                .await
                .map_err(|e| format!("Migration v13 failed dropping old competitions_new: {}", e))?;
        }

        sqlx::query(r#"
            CREATE TABLE competitions_new (
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
            )
        "#)
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v13 failed creating competitions_new table: {}", e))?;

        sqlx::query(r#"
            INSERT INTO competitions_new (id, name, date, end_date, location, address, level, custom_level_name, notes, reminder_enabled, reminder_days_before, created_at)
            SELECT id, name, date, end_date, location, address, level, custom_level_name, notes, reminder_enabled, reminder_days_before, created_at
            FROM competitions
        "#)
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v13 failed copying competitions data: {}", e))?;

        sqlx::query("DROP TABLE competitions")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v13 failed dropping old competitions table: {}", e))?;

        sqlx::query("ALTER TABLE competitions_new RENAME TO competitions")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v13 failed renaming competitions_new: {}", e))?;
    }

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_competitions_date ON competitions(date)")
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v13 failed creating idx_competitions_date: {}", e))?;

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (13, 'fix_check_constraint_add_muu')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v13: {}", e))?;

    Ok(())
}

async fn run_migration_v14(pool: &DbPool) -> Result<(), String> {
    // Create notes table
    let has_notes: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='notes'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v14 failed checking notes table: {}", e))?;

    if !has_notes {
        sqlx::query(r#"
            CREATE TABLE notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                athlete_id INTEGER,
                pinned INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE SET NULL
            )
        "#)
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v14 failed creating notes table: {}", e))?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_notes_athlete ON notes(athlete_id)")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v14 failed creating idx_notes_athlete: {}", e))?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned)")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v14 failed creating idx_notes_pinned: {}", e))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (14, 'add_notes_table')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v14: {}", e))?;

    Ok(())
}

pub async fn get_pool(app: &AppHandle) -> Result<DbPool, String> {
    let state = app.state::<AppDatabase>();

    // Retry up to 50 times (5 seconds total) waiting for database initialization
    for _ in 0..50 {
        let guard = state.0.lock().await;
        if let Some(pool) = guard.clone() {
            return Ok(pool);
        }
        drop(guard); // Release lock before sleeping
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

    Err("Database not initialized after timeout".to_string())
}
