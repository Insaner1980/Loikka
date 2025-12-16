use crate::database::get_pool;
use crate::types::{Athlete, AthleteStats, AthleteWithStats, CreateAthlete, UpdateAthlete};
use sqlx::Row;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_all_athletes(app: AppHandle) -> Result<Vec<AthleteWithStats>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        r#"SELECT id, first_name, last_name, birth_year, club_name, photo_path, created_at, updated_at
        FROM athletes ORDER BY last_name, first_name"#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        let athlete = Athlete {
            id: row.get("id"),
            first_name: row.get("first_name"),
            last_name: row.get("last_name"),
            birth_year: row.get("birth_year"),
            club_name: row.get("club_name"),
            photo_path: row.get("photo_path"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        };
        let stats = get_athlete_stats_internal(&pool, athlete.id).await?;
        result.push(AthleteWithStats { athlete, stats });
    }

    Ok(result)
}

async fn get_athlete_stats_internal(pool: &sqlx::Pool<sqlx::Sqlite>, athlete_id: i64) -> Result<AthleteStats, String> {
    let discipline_count: i32 = sqlx::query_scalar(
        "SELECT COUNT(DISTINCT discipline_id) FROM results WHERE athlete_id = ?"
    )
    .bind(athlete_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let result_count: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM results WHERE athlete_id = ?"
    )
    .bind(athlete_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let pb_count: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM results WHERE athlete_id = ? AND is_personal_best = 1"
    )
    .bind(athlete_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let gold_medals: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM medals WHERE athlete_id = ? AND type = 'gold'"
    )
    .bind(athlete_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let silver_medals: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM medals WHERE athlete_id = ? AND type = 'silver'"
    )
    .bind(athlete_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let bronze_medals: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM medals WHERE athlete_id = ? AND type = 'bronze'"
    )
    .bind(athlete_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(AthleteStats {
        discipline_count,
        result_count,
        pb_count,
        gold_medals,
        silver_medals,
        bronze_medals,
    })
}

#[tauri::command]
pub async fn get_athlete(app: AppHandle, id: i64) -> Result<Option<AthleteWithStats>, String> {
    let pool = get_pool(&app).await?;

    let row = sqlx::query(
        r#"SELECT id, first_name, last_name, birth_year, club_name, photo_path, created_at, updated_at
        FROM athletes WHERE id = ?"#
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?;

    match row {
        Some(row) => {
            let athlete = Athlete {
                id: row.get("id"),
                first_name: row.get("first_name"),
                last_name: row.get("last_name"),
                birth_year: row.get("birth_year"),
                club_name: row.get("club_name"),
                photo_path: row.get("photo_path"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            };
            let stats = get_athlete_stats_internal(&pool, athlete.id).await?;
            Ok(Some(AthleteWithStats { athlete, stats }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn create_athlete(app: AppHandle, athlete: CreateAthlete) -> Result<Athlete, String> {
    let pool = get_pool(&app).await?;

    let result = sqlx::query(
        "INSERT INTO athletes (first_name, last_name, birth_year, club_name, photo_path) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&athlete.first_name)
    .bind(&athlete.last_name)
    .bind(athlete.birth_year)
    .bind(&athlete.club_name)
    .bind(&athlete.photo_path)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let id = result.last_insert_rowid();

    let row = sqlx::query(
        r#"SELECT id, first_name, last_name, birth_year, club_name, photo_path, created_at, updated_at
        FROM athletes WHERE id = ?"#
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Athlete {
        id: row.get("id"),
        first_name: row.get("first_name"),
        last_name: row.get("last_name"),
        birth_year: row.get("birth_year"),
        club_name: row.get("club_name"),
        photo_path: row.get("photo_path"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

#[tauri::command]
pub async fn update_athlete(app: AppHandle, id: i64, athlete: UpdateAthlete) -> Result<Athlete, String> {
    let pool = get_pool(&app).await?;

    // Always update all fields - let the frontend send current values for unchanged fields
    sqlx::query(
        "UPDATE athletes SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), birth_year = COALESCE(?, birth_year), club_name = ?, photo_path = ? WHERE id = ?"
    )
    .bind(&athlete.first_name)
    .bind(&athlete.last_name)
    .bind(athlete.birth_year)
    .bind(&athlete.club_name)
    .bind(&athlete.photo_path)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let row = sqlx::query(
        r#"SELECT id, first_name, last_name, birth_year, club_name, photo_path, created_at, updated_at
        FROM athletes WHERE id = ?"#
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Athlete {
        id: row.get("id"),
        first_name: row.get("first_name"),
        last_name: row.get("last_name"),
        birth_year: row.get("birth_year"),
        club_name: row.get("club_name"),
        photo_path: row.get("photo_path"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
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
