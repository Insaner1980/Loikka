use crate::database::get_pool;
use crate::types::{Athlete, AthleteStats, AthleteWithStats, CreateAthlete, UpdateAthlete};
use sqlx::Row;
use tauri::AppHandle;

/// SQL query for fetching athlete with stats using subqueries (avoids N+1)
const ATHLETE_WITH_STATS_QUERY: &str = r#"
    SELECT
        a.id, a.first_name, a.last_name, a.birth_year, a.gender, a.club_name, a.photo_path, a.created_at, a.updated_at,
        COALESCE((SELECT COUNT(DISTINCT discipline_id) FROM results WHERE athlete_id = a.id), 0) as discipline_count,
        COALESCE((SELECT COUNT(*) FROM results WHERE athlete_id = a.id), 0) as result_count,
        COALESCE((SELECT COUNT(*) FROM results WHERE athlete_id = a.id AND is_personal_best = 1), 0) as pb_count,
        COALESCE((SELECT COUNT(*) FROM results WHERE athlete_id = a.id AND is_season_best = 1), 0) as sb_count,
        COALESCE((SELECT COUNT(*) FROM results WHERE athlete_id = a.id AND is_national_record = 1), 0) as nr_count,
        COALESCE((SELECT COUNT(*) FROM medals WHERE athlete_id = a.id AND type = 'gold'), 0) as gold_medals,
        COALESCE((SELECT COUNT(*) FROM medals WHERE athlete_id = a.id AND type = 'silver'), 0) as silver_medals,
        COALESCE((SELECT COUNT(*) FROM medals WHERE athlete_id = a.id AND type = 'bronze'), 0) as bronze_medals
    FROM athletes a
"#;

/// Helper to convert a row with stats to AthleteWithStats
fn athlete_with_stats_from_row(row: &sqlx::sqlite::SqliteRow) -> AthleteWithStats {
    AthleteWithStats {
        athlete: athlete_from_row!(row),
        stats: AthleteStats {
            discipline_count: row.get("discipline_count"),
            result_count: row.get("result_count"),
            pb_count: row.get("pb_count"),
            sb_count: row.get("sb_count"),
            nr_count: row.get("nr_count"),
            gold_medals: row.get("gold_medals"),
            silver_medals: row.get("silver_medals"),
            bronze_medals: row.get("bronze_medals"),
        },
    }
}

#[tauri::command]
pub async fn get_all_athletes(app: AppHandle) -> Result<Vec<AthleteWithStats>, String> {
    let pool = get_pool(&app).await?;

    let query = format!("{} ORDER BY a.last_name, a.first_name", ATHLETE_WITH_STATS_QUERY);
    let rows = sqlx::query(&query)
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(athlete_with_stats_from_row).collect())
}

#[tauri::command]
pub async fn get_athlete(app: AppHandle, id: i64) -> Result<Option<AthleteWithStats>, String> {
    let pool = get_pool(&app).await?;

    // Use the same optimized query with subqueries
    let query = format!("{} WHERE a.id = ?", ATHLETE_WITH_STATS_QUERY);
    let row = sqlx::query(&query)
        .bind(id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(row.as_ref().map(athlete_with_stats_from_row))
}

const ATHLETE_SELECT: &str = "SELECT id, first_name, last_name, birth_year, gender, club_name, photo_path, created_at, updated_at FROM athletes";

#[tauri::command]
pub async fn create_athlete(app: AppHandle, athlete: CreateAthlete) -> Result<Athlete, String> {
    let pool = get_pool(&app).await?;

    let result = sqlx::query(
        "INSERT INTO athletes (first_name, last_name, birth_year, gender, club_name, photo_path) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&athlete.first_name)
    .bind(&athlete.last_name)
    .bind(athlete.birth_year)
    .bind(&athlete.gender)
    .bind(&athlete.club_name)
    .bind(&athlete.photo_path)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let id = result.last_insert_rowid();

    let query = format!("{} WHERE id = ?", ATHLETE_SELECT);
    let row = sqlx::query(&query)
        .bind(id)
        .fetch_one(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(athlete_from_row!(row))
}

#[tauri::command]
pub async fn update_athlete(app: AppHandle, id: i64, athlete: UpdateAthlete) -> Result<Athlete, String> {
    let pool = get_pool(&app).await?;

    sqlx::query(
        "UPDATE athletes SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), birth_year = COALESCE(?, birth_year), gender = COALESCE(?, gender), club_name = ?, photo_path = ? WHERE id = ?"
    )
    .bind(&athlete.first_name)
    .bind(&athlete.last_name)
    .bind(athlete.birth_year)
    .bind(&athlete.gender)
    .bind(&athlete.club_name)
    .bind(&athlete.photo_path)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let query = format!("{} WHERE id = ?", ATHLETE_SELECT);
    let row = sqlx::query(&query)
        .bind(id)
        .fetch_one(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(athlete_from_row!(row))
}

#[tauri::command]
pub async fn delete_athlete(app: AppHandle, id: i64) -> Result<bool, String> {
    let pool = get_pool(&app).await?;

    let result = sqlx::query("DELETE FROM athletes WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}
