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

    if current_version < 15 {
        run_migration_v15(pool).await?;
    }

    if current_version < 16 {
        run_migration_v16(pool).await?;
    }

    if current_version < 17 {
        run_migration_v17(pool).await?;
    }

    if current_version < 18 {
        run_migration_v18(pool).await?;
    }

    if current_version < 19 {
        run_migration_v19(pool).await?;
    }

    if current_version < 20 {
        run_migration_v20(pool).await?;
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

async fn run_migration_v15(pool: &DbPool) -> Result<(), String> {
    // Add sub_results column to results table for combined events (3-, 4-, 5-, 7-ottelu)
    let has_sub_results: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('results') WHERE name = 'sub_results'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v15 failed checking sub_results column: {}", e))?;

    if !has_sub_results {
        sqlx::query("ALTER TABLE results ADD COLUMN sub_results TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v15 failed adding sub_results column: {}", e))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (15, 'add_sub_results_for_combined_events')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v15: {}", e))?;

    Ok(())
}

async fn run_migration_v16(pool: &DbPool) -> Result<(), String> {
    // Add combined_event_id column to results table
    // This links sub-results (e.g., 40m from 3-ottelu) to their parent combined event result
    let has_combined_event_id: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('results') WHERE name = 'combined_event_id'"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Migration v16 failed checking combined_event_id column: {}", e))?;

    if !has_combined_event_id {
        sqlx::query("ALTER TABLE results ADD COLUMN combined_event_id INTEGER REFERENCES results(id) ON DELETE CASCADE")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v16 failed adding combined_event_id column: {}", e))?;
    }

    // Create index for efficient lookup of sub-results by parent
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_results_combined_event ON results(combined_event_id)")
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v16 failed creating idx_results_combined_event: {}", e))?;

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (16, 'add_combined_event_id_for_moniottelu')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v16: {}", e))?;

    Ok(())
}

async fn run_migration_v17(pool: &DbPool) -> Result<(), String> {
    // Re-seed all disciplines to sync frontend and database
    // We use INSERT OR IGNORE for new disciplines, then UPDATE for existing ones
    // This avoids FK constraint violations from results table

    // Discipline data: (id, name, full_name, category, unit, lower_is_better, icon_name)
    let disciplines = [
        // Sprints (IDs 1-7)
        (1, "40 m", "40 metriä", "sprints", "time", 1, "timer"),
        (2, "60 m", "60 metriä", "sprints", "time", 1, "timer"),
        (3, "100 m", "100 metriä", "sprints", "time", 1, "timer"),
        (4, "150 m", "150 metriä", "sprints", "time", 1, "timer"),
        (5, "200 m", "200 metriä", "sprints", "time", 1, "timer"),
        (6, "300 m", "300 metriä", "sprints", "time", 1, "timer"),
        (7, "400 m", "400 metriä", "sprints", "time", 1, "timer"),
        // Middle distance (IDs 8-12)
        (8, "600 m", "600 metriä", "middleDistance", "time", 1, "timer"),
        (9, "800 m", "800 metriä", "middleDistance", "time", 1, "timer"),
        (10, "1000 m", "1000 metriä", "middleDistance", "time", 1, "timer"),
        (11, "1500 m", "1500 metriä", "middleDistance", "time", 1, "timer"),
        (12, "2000 m", "2000 metriä", "middleDistance", "time", 1, "timer"),
        // Long distance (IDs 13-15)
        (13, "3000 m", "3000 metriä", "longDistance", "time", 1, "timer"),
        (14, "5000 m", "5000 metriä", "longDistance", "time", 1, "timer"),
        (15, "10000 m", "10000 metriä", "longDistance", "time", 1, "timer"),
        // Hurdles (IDs 16-21)
        (16, "60 m aidat", "60 metriä aidat", "hurdles", "time", 1, "fence"),
        (17, "80 m aidat", "80 metriä aidat", "hurdles", "time", 1, "fence"),
        (18, "100 m aidat", "100 metriä aidat", "hurdles", "time", 1, "fence"),
        (19, "200 m aidat", "200 metriä aidat", "hurdles", "time", 1, "fence"),
        (20, "300 m aidat", "300 metriä aidat", "hurdles", "time", 1, "fence"),
        (21, "400 m aidat", "400 metriä aidat", "hurdles", "time", 1, "fence"),
        // Jumps (IDs 22-25)
        (22, "Pituus", "Pituushyppy", "jumps", "distance", 0, "move-diagonal"),
        (23, "Korkeus", "Korkeushyppy", "jumps", "distance", 0, "arrow-up"),
        (24, "Kolmiloikka", "Kolmiloikka", "jumps", "distance", 0, "footprints"),
        (25, "Seiväs", "Seiväshyppy", "jumps", "distance", 0, "git-branch"),
        // Throws (IDs 26-30)
        (26, "Kuula", "Kuulantyöntö", "throws", "distance", 0, "circle"),
        (27, "Kiekko", "Kiekonheitto", "throws", "distance", 0, "disc"),
        (28, "Keihäs", "Keihäänheitto", "throws", "distance", 0, "spline"),
        (29, "Moukari", "Moukarinheitto", "throws", "distance", 0, "hammer"),
        (30, "Pallo", "Pallonheitto", "throws", "distance", 0, "circle-dot"),
        // Combined events (IDs 31-34)
        (31, "3-ottelu", "3-ottelu", "combined", "distance", 0, "trophy"),
        (32, "4-ottelu", "4-ottelu", "combined", "distance", 0, "trophy"),
        (33, "5-ottelu", "5-ottelu", "combined", "distance", 0, "trophy"),
        (34, "7-ottelu", "7-ottelu", "combined", "distance", 0, "trophy"),
        // Walking (IDs 35-41)
        (35, "600 m kävely", "600 metriä kävely", "walking", "time", 1, "footprints"),
        (36, "800 m kävely", "800 metriä kävely", "walking", "time", 1, "footprints"),
        (37, "2000 m kävely", "2000 metriä kävely", "walking", "time", 1, "footprints"),
        (38, "3000 m kävely", "3000 metriä kävely", "walking", "time", 1, "footprints"),
        (39, "5000 m kävely", "5000 metriä kävely", "walking", "time", 1, "footprints"),
        (40, "10 km kävely", "10 kilometriä kävely", "walking", "time", 1, "footprints"),
        (41, "1000 m kävely", "1000 metriä kävely", "walking", "time", 1, "footprints"),
    ];

    for (id, name, full_name, category, unit, lower_is_better, icon_name) in disciplines {
        // First try to insert (will be ignored if ID already exists)
        sqlx::query(
            "INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(id)
        .bind(name)
        .bind(full_name)
        .bind(category)
        .bind(unit)
        .bind(lower_is_better)
        .bind(icon_name)
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v17 insert failed for {}: {}", name, e))?;

        // Then update to ensure correct values (handles mismatched data)
        sqlx::query(
            "UPDATE disciplines SET name = ?, full_name = ?, category = ?, unit = ?, lower_is_better = ?, icon_name = ? WHERE id = ?"
        )
        .bind(name)
        .bind(full_name)
        .bind(category)
        .bind(unit)
        .bind(lower_is_better)
        .bind(icon_name)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v17 update failed for {}: {}", name, e))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (17, 'reseed_disciplines_sync_frontend')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v17: {}", e))?;

    Ok(())
}

async fn run_migration_v18(pool: &DbPool) -> Result<(), String> {
    // Add cross-country (maastojuoksu) disciplines
    let cross_country_disciplines = [
        (42, "500 m maasto", "500 metriä maastojuoksu", "crossCountry", "time", 1, "trees"),
        (43, "1 km maasto", "1 kilometri maastojuoksu", "crossCountry", "time", 1, "trees"),
        (44, "2 km maasto", "2 kilometriä maastojuoksu", "crossCountry", "time", 1, "trees"),
        (45, "4 km maasto", "4 kilometriä maastojuoksu", "crossCountry", "time", 1, "trees"),
        (46, "10 km maasto", "10 kilometriä maastojuoksu", "crossCountry", "time", 1, "trees"),
    ];

    for (id, name, full_name, category, unit, lower_is_better, icon_name) in cross_country_disciplines {
        sqlx::query(
            "INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(id)
        .bind(name)
        .bind(full_name)
        .bind(category)
        .bind(unit)
        .bind(lower_is_better)
        .bind(icon_name)
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v18 insert failed for {}: {}", name, e))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (18, 'add_cross_country_disciplines')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v18: {}", e))?;

    Ok(())
}

async fn run_migration_v19(pool: &DbPool) -> Result<(), String> {
    // Add relay and other disciplines
    let new_disciplines = [
        // Relays (IDs 47-53)
        (47, "8x40 m sukkulaviesti", "8x40 metriä sukkulaviesti", "relays", "time", 1, "repeat"),
        (48, "4x50 m viesti", "4x50 metriä viesti", "relays", "time", 1, "repeat"),
        (49, "4x100 m viesti", "4x100 metriä viesti", "relays", "time", 1, "repeat"),
        (50, "4x200 m viesti", "4x200 metriä viesti", "relays", "time", 1, "repeat"),
        (51, "4x300 m viesti", "4x300 metriä viesti", "relays", "time", 1, "repeat"),
        (52, "4x400 m viesti", "4x400 metriä viesti", "relays", "time", 1, "repeat"),
        (53, "4x800 m viesti", "4x800 metriä viesti", "relays", "time", 1, "repeat"),
        // Other (ID 54)
        (54, "Cooper", "Cooper-testi (12 min)", "other", "distance", 0, "heart-pulse"),
    ];

    for (id, name, full_name, category, unit, lower_is_better, icon_name) in new_disciplines {
        sqlx::query(
            "INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(id)
        .bind(name)
        .bind(full_name)
        .bind(category)
        .bind(unit)
        .bind(lower_is_better)
        .bind(icon_name)
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v19 insert failed for {}: {}", name, e))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (19, 'add_relay_and_cooper_disciplines')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v19: {}", e))?;

    Ok(())
}

async fn run_migration_v20(pool: &DbPool) -> Result<(), String> {
    // Migration v20: Fix disciplines table CHECK constraint
    // The original CHECK constraint only allowed 7 categories, but we now have 11:
    // Original: 'sprints', 'middleDistance', 'longDistance', 'hurdles', 'jumps', 'throws', 'combined'
    // Added: 'walking', 'crossCountry', 'relays', 'other'
    //
    // This caused migrations v18/v19 to silently fail (INSERT OR IGNORE)

    // Check if disciplines table already has correct CHECK constraint
    let table_sql: Option<String> = sqlx::query_scalar(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='disciplines'"
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Migration v20 failed getting disciplines schema: {}", e))?;

    let needs_migration = if let Some(sql) = &table_sql {
        // Check if all new categories are present
        !sql.contains("'crossCountry'") || !sql.contains("'relays'") || !sql.contains("'other'")
    } else {
        false // Table doesn't exist, nothing to migrate
    };

    if !needs_migration {
        // Schema already correct - this is a fresh install from updated schema.sql
        // Just ensure all disciplines are inserted
        let all_new_disciplines = [
            // Walking (IDs 35-41)
            (35, "600 m kävely", "600 metriä kävely", "walking", "time", 1, "footprints"),
            (36, "800 m kävely", "800 metriä kävely", "walking", "time", 1, "footprints"),
            (37, "2000 m kävely", "2000 metriä kävely", "walking", "time", 1, "footprints"),
            (38, "3000 m kävely", "3000 metriä kävely", "walking", "time", 1, "footprints"),
            (39, "5000 m kävely", "5000 metriä kävely", "walking", "time", 1, "footprints"),
            (40, "10 km kävely", "10 kilometriä kävely", "walking", "time", 1, "footprints"),
            (41, "1000 m kävely", "1000 metriä kävely", "walking", "time", 1, "footprints"),
            // Cross-country (IDs 42-46)
            (42, "500 m maasto", "500 metriä maastojuoksu", "crossCountry", "time", 1, "trees"),
            (43, "1 km maasto", "1 kilometri maastojuoksu", "crossCountry", "time", 1, "trees"),
            (44, "2 km maasto", "2 kilometriä maastojuoksu", "crossCountry", "time", 1, "trees"),
            (45, "4 km maasto", "4 kilometriä maastojuoksu", "crossCountry", "time", 1, "trees"),
            (46, "10 km maasto", "10 kilometriä maastojuoksu", "crossCountry", "time", 1, "trees"),
            // Relays (IDs 47-53)
            (47, "8x40 m sukkulaviesti", "8x40 metriä sukkulaviesti", "relays", "time", 1, "repeat"),
            (48, "4x50 m viesti", "4x50 metriä viesti", "relays", "time", 1, "repeat"),
            (49, "4x100 m viesti", "4x100 metriä viesti", "relays", "time", 1, "repeat"),
            (50, "4x200 m viesti", "4x200 metriä viesti", "relays", "time", 1, "repeat"),
            (51, "4x300 m viesti", "4x300 metriä viesti", "relays", "time", 1, "repeat"),
            (52, "4x400 m viesti", "4x400 metriä viesti", "relays", "time", 1, "repeat"),
            (53, "4x800 m viesti", "4x800 metriä viesti", "relays", "time", 1, "repeat"),
            // Other (ID 54)
            (54, "Cooper", "Cooper-testi (12 min)", "other", "distance", 0, "heart-pulse"),
        ];

        for (id, name, full_name, category, unit, lower_is_better, icon_name) in all_new_disciplines {
            sqlx::query(
                "INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(id)
            .bind(name)
            .bind(full_name)
            .bind(category)
            .bind(unit)
            .bind(lower_is_better)
            .bind(icon_name)
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v20 insert (schema correct) failed for {}: {}", name, e))?;
        }

        sqlx::query("INSERT INTO _migrations (version, description) VALUES (20, 'fix_disciplines_check_constraint_skipped_already_correct')")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to record migration v20: {}", e))?;
        return Ok(());
    }

    // Clean up any leftover temporary table from partial migrations
    sqlx::query("DROP TABLE IF EXISTS disciplines_new")
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v20 failed dropping disciplines_new: {}", e))?;

    // Execute each statement separately but acquire a dedicated connection
    // SQLite requires all operations to be on the same connection for PRAGMA foreign_keys
    let mut conn = pool.acquire().await.map_err(|e| format!("Migration v20 failed acquiring connection: {}", e))?;

    sqlx::query("PRAGMA foreign_keys = OFF")
        .execute(&mut *conn)
        .await
        .map_err(|e| format!("Migration v20 failed disabling FK: {}", e))?;

    sqlx::query(r#"
        CREATE TABLE disciplines_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            full_name TEXT NOT NULL,
            category TEXT NOT NULL CHECK (category IN ('sprints', 'middleDistance', 'longDistance', 'hurdles', 'jumps', 'throws', 'combined', 'walking', 'crossCountry', 'relays', 'other')),
            unit TEXT NOT NULL CHECK (unit IN ('time', 'distance')),
            lower_is_better INTEGER NOT NULL DEFAULT 1,
            icon_name TEXT
        )
    "#)
    .execute(&mut *conn)
    .await
    .map_err(|e| format!("Migration v20 failed creating disciplines_new: {}", e))?;

    sqlx::query(r#"
        INSERT INTO disciplines_new (id, name, full_name, category, unit, lower_is_better, icon_name)
        SELECT id, name, full_name, category, unit, lower_is_better, icon_name
        FROM disciplines
    "#)
    .execute(&mut *conn)
    .await
    .map_err(|e| format!("Migration v20 failed copying disciplines data: {}", e))?;

    sqlx::query("DROP TABLE disciplines")
        .execute(&mut *conn)
        .await
        .map_err(|e| format!("Migration v20 failed dropping old disciplines: {}", e))?;

    sqlx::query("ALTER TABLE disciplines_new RENAME TO disciplines")
        .execute(&mut *conn)
        .await
        .map_err(|e| format!("Migration v20 failed renaming disciplines_new: {}", e))?;

    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&mut *conn)
        .await
        .map_err(|e| format!("Migration v20 failed re-enabling FK: {}", e))?;

    // Drop the dedicated connection before inserting new disciplines
    drop(conn);

    // Step 5: Now insert all missing disciplines (walking 35-41, crossCountry 42-46, relays 47-53, other 54)
    let all_new_disciplines = [
        // Walking (IDs 35-41)
        (35, "600 m kävely", "600 metriä kävely", "walking", "time", 1, "footprints"),
        (36, "800 m kävely", "800 metriä kävely", "walking", "time", 1, "footprints"),
        (37, "2000 m kävely", "2000 metriä kävely", "walking", "time", 1, "footprints"),
        (38, "3000 m kävely", "3000 metriä kävely", "walking", "time", 1, "footprints"),
        (39, "5000 m kävely", "5000 metriä kävely", "walking", "time", 1, "footprints"),
        (40, "10 km kävely", "10 kilometriä kävely", "walking", "time", 1, "footprints"),
        (41, "1000 m kävely", "1000 metriä kävely", "walking", "time", 1, "footprints"),
        // Cross-country (IDs 42-46)
        (42, "500 m maasto", "500 metriä maastojuoksu", "crossCountry", "time", 1, "trees"),
        (43, "1 km maasto", "1 kilometri maastojuoksu", "crossCountry", "time", 1, "trees"),
        (44, "2 km maasto", "2 kilometriä maastojuoksu", "crossCountry", "time", 1, "trees"),
        (45, "4 km maasto", "4 kilometriä maastojuoksu", "crossCountry", "time", 1, "trees"),
        (46, "10 km maasto", "10 kilometriä maastojuoksu", "crossCountry", "time", 1, "trees"),
        // Relays (IDs 47-53)
        (47, "8x40 m sukkulaviesti", "8x40 metriä sukkulaviesti", "relays", "time", 1, "repeat"),
        (48, "4x50 m viesti", "4x50 metriä viesti", "relays", "time", 1, "repeat"),
        (49, "4x100 m viesti", "4x100 metriä viesti", "relays", "time", 1, "repeat"),
        (50, "4x200 m viesti", "4x200 metriä viesti", "relays", "time", 1, "repeat"),
        (51, "4x300 m viesti", "4x300 metriä viesti", "relays", "time", 1, "repeat"),
        (52, "4x400 m viesti", "4x400 metriä viesti", "relays", "time", 1, "repeat"),
        (53, "4x800 m viesti", "4x800 metriä viesti", "relays", "time", 1, "repeat"),
        // Other (ID 54)
        (54, "Cooper", "Cooper-testi (12 min)", "other", "distance", 0, "heart-pulse"),
    ];

    for (id, name, full_name, category, unit, lower_is_better, icon_name) in all_new_disciplines {
        sqlx::query(
            "INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(id)
        .bind(name)
        .bind(full_name)
        .bind(category)
        .bind(unit)
        .bind(lower_is_better)
        .bind(icon_name)
        .execute(pool)
        .await
        .map_err(|e| format!("Migration v20 insert failed for {}: {}", name, e))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (20, 'fix_disciplines_check_constraint_add_new_categories')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v20: {}", e))?;

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
