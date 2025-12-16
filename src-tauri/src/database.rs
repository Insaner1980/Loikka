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
    // Recreate photos table with new schema for entity-based photos
    let statements = [
        "DROP TABLE IF EXISTS photos_old",
        "ALTER TABLE photos RENAME TO photos_old",
        r#"CREATE TABLE photos (
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
        )"#,
        "CREATE INDEX IF NOT EXISTS idx_photos_entity ON photos(entity_type, entity_id)",
        "DROP TABLE IF EXISTS photos_old",
    ];

    for stmt in statements {
        sqlx::query(stmt)
            .execute(pool)
            .await
            .map_err(|e| format!("Migration v3 failed: {} - SQL: {}", e, stmt))?;
    }

    sqlx::query("INSERT INTO _migrations (version, description) VALUES (3, 'recreate_photos_table')")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to record migration v3: {}", e))?;

    Ok(())
}

pub async fn get_pool(app: &AppHandle) -> Result<DbPool, String> {
    let state = app.state::<AppDatabase>();
    let guard = state.0.lock().await;
    guard.clone().ok_or_else(|| "Database not initialized".to_string())
}
