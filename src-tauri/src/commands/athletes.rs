use crate::database::get_pool;
use crate::types::{Athlete, AthleteStats, AthleteWithStats, CreateAthlete, UpdateAthlete};
use sqlx::Row;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_all_athletes(app: AppHandle) -> Result<Vec<AthleteWithStats>, String> {
    let pool = get_pool(&app).await?;

    // Use a single query with subqueries to avoid N+1 problem
    let rows = sqlx::query(
        r#"SELECT
            a.id, a.first_name, a.last_name, a.birth_year, a.gender, a.club_name, a.photo_path, a.created_at, a.updated_at,
            COALESCE((SELECT COUNT(DISTINCT discipline_id) FROM results WHERE athlete_id = a.id), 0) as discipline_count,
            COALESCE((SELECT COUNT(*) FROM results WHERE athlete_id = a.id), 0) as result_count,
            COALESCE((SELECT COUNT(*) FROM results WHERE athlete_id = a.id AND is_personal_best = 1), 0) as pb_count,
            COALESCE((SELECT COUNT(*) FROM medals WHERE athlete_id = a.id AND type = 'gold'), 0) as gold_medals,
            COALESCE((SELECT COUNT(*) FROM medals WHERE athlete_id = a.id AND type = 'silver'), 0) as silver_medals,
            COALESCE((SELECT COUNT(*) FROM medals WHERE athlete_id = a.id AND type = 'bronze'), 0) as bronze_medals
        FROM athletes a
        ORDER BY a.last_name, a.first_name"#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|row| AthleteWithStats {
        athlete: Athlete {
            id: row.get("id"),
            first_name: row.get("first_name"),
            last_name: row.get("last_name"),
            birth_year: row.get("birth_year"),
            gender: row.get("gender"),
            club_name: row.get("club_name"),
            photo_path: row.get("photo_path"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        },
        stats: AthleteStats {
            discipline_count: row.get("discipline_count"),
            result_count: row.get("result_count"),
            pb_count: row.get("pb_count"),
            gold_medals: row.get("gold_medals"),
            silver_medals: row.get("silver_medals"),
            bronze_medals: row.get("bronze_medals"),
        },
    }).collect())
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
        r#"SELECT id, first_name, last_name, birth_year, gender, club_name, photo_path, created_at, updated_at
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
                gender: row.get("gender"),
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

    let row = sqlx::query(
        r#"SELECT id, first_name, last_name, birth_year, gender, club_name, photo_path, created_at, updated_at
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
        gender: row.get("gender"),
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

    let row = sqlx::query(
        r#"SELECT id, first_name, last_name, birth_year, gender, club_name, photo_path, created_at, updated_at
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
        gender: row.get("gender"),
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
