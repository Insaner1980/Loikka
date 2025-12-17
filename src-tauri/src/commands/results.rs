use crate::database::get_pool;
use crate::types::{CreateResult, Discipline, Medal, Result as AthleteResult, UpdateResult};
use sqlx::Row;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_all_results(app: AppHandle) -> Result<Vec<AthleteResult>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, date, value, type, competition_name, location, placement, notes, is_personal_best, is_season_best, created_at
        FROM results ORDER BY date DESC"#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|row| AthleteResult {
        id: row.get("id"),
        athlete_id: row.get("athlete_id"),
        discipline_id: row.get("discipline_id"),
        date: row.get("date"),
        value: row.get("value"),
        result_type: row.get("type"),
        competition_name: row.get("competition_name"),
        location: row.get("location"),
        placement: row.get("placement"),
        notes: row.get("notes"),
        is_personal_best: row.get::<i32, _>("is_personal_best") == 1,
        is_season_best: row.get::<i32, _>("is_season_best") == 1,
        created_at: row.get("created_at"),
    }).collect())
}

#[tauri::command]
pub async fn get_results_by_athlete(app: AppHandle, athlete_id: i64) -> Result<Vec<AthleteResult>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, date, value, type, competition_name, location, placement, notes, is_personal_best, is_season_best, created_at
        FROM results WHERE athlete_id = ? ORDER BY date DESC"#
    )
    .bind(athlete_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|row| AthleteResult {
        id: row.get("id"),
        athlete_id: row.get("athlete_id"),
        discipline_id: row.get("discipline_id"),
        date: row.get("date"),
        value: row.get("value"),
        result_type: row.get("type"),
        competition_name: row.get("competition_name"),
        location: row.get("location"),
        placement: row.get("placement"),
        notes: row.get("notes"),
        is_personal_best: row.get::<i32, _>("is_personal_best") == 1,
        is_season_best: row.get::<i32, _>("is_season_best") == 1,
        created_at: row.get("created_at"),
    }).collect())
}

#[tauri::command]
pub async fn get_disciplines(app: AppHandle) -> Result<Vec<Discipline>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        "SELECT id, name, full_name, category, unit, lower_is_better, icon_name FROM disciplines ORDER BY id"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|row| Discipline {
        id: row.get("id"),
        name: row.get("name"),
        full_name: row.get("full_name"),
        category: row.get("category"),
        unit: row.get("unit"),
        lower_is_better: row.get::<i32, _>("lower_is_better") == 1,
        icon_name: row.get("icon_name"),
    }).collect())
}

#[tauri::command]
pub async fn create_result(app: AppHandle, result: CreateResult) -> Result<AthleteResult, String> {
    let pool = get_pool(&app).await?;

    // Check if this is a personal best
    let is_pb = check_personal_best_internal(&pool, result.athlete_id, result.discipline_id, result.value).await?;

    // Check if this is a season best
    let year: i32 = result.date.split('-').next().and_then(|y| y.parse().ok()).unwrap_or(2024);
    let is_sb = check_season_best_internal(&pool, result.athlete_id, result.discipline_id, result.value, year).await?;

    // If this is a new PB, clear old PB flag for this athlete/discipline
    if is_pb {
        sqlx::query(
            "UPDATE results SET is_personal_best = 0 WHERE athlete_id = ? AND discipline_id = ?"
        )
        .bind(result.athlete_id)
        .bind(result.discipline_id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    // If this is a new SB, clear old SB flag for this athlete/discipline/year
    if is_sb {
        sqlx::query(
            "UPDATE results SET is_season_best = 0 WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ?"
        )
        .bind(result.athlete_id)
        .bind(result.discipline_id)
        .bind(year.to_string())
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    let query_result = sqlx::query(
        r#"INSERT INTO results (athlete_id, discipline_id, date, value, type, competition_name, location, placement, notes, is_personal_best, is_season_best)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#
    )
    .bind(result.athlete_id)
    .bind(result.discipline_id)
    .bind(&result.date)
    .bind(result.value)
    .bind(&result.result_type)
    .bind(&result.competition_name)
    .bind(&result.location)
    .bind(result.placement)
    .bind(&result.notes)
    .bind(is_pb as i32)
    .bind(is_sb as i32)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let id = query_result.last_insert_rowid();

    let row = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, date, value, type, competition_name, location, placement, notes, is_personal_best, is_season_best, created_at
        FROM results WHERE id = ?"#
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(AthleteResult {
        id: row.get("id"),
        athlete_id: row.get("athlete_id"),
        discipline_id: row.get("discipline_id"),
        date: row.get("date"),
        value: row.get("value"),
        result_type: row.get("type"),
        competition_name: row.get("competition_name"),
        location: row.get("location"),
        placement: row.get("placement"),
        notes: row.get("notes"),
        is_personal_best: row.get::<i32, _>("is_personal_best") == 1,
        is_season_best: row.get::<i32, _>("is_season_best") == 1,
        created_at: row.get("created_at"),
    })
}

#[tauri::command]
pub async fn update_result(app: AppHandle, id: i64, result: UpdateResult) -> Result<AthleteResult, String> {
    let pool = get_pool(&app).await?;

    sqlx::query(
        r#"UPDATE results SET
            athlete_id = COALESCE(?, athlete_id),
            discipline_id = COALESCE(?, discipline_id),
            date = COALESCE(?, date),
            value = COALESCE(?, value),
            type = COALESCE(?, type),
            competition_name = ?,
            location = ?,
            placement = ?,
            notes = ?
        WHERE id = ?"#
    )
    .bind(result.athlete_id)
    .bind(result.discipline_id)
    .bind(&result.date)
    .bind(result.value)
    .bind(&result.result_type)
    .bind(&result.competition_name)
    .bind(&result.location)
    .bind(result.placement)
    .bind(&result.notes)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let row = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, date, value, type, competition_name, location, placement, notes, is_personal_best, is_season_best, created_at
        FROM results WHERE id = ?"#
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(AthleteResult {
        id: row.get("id"),
        athlete_id: row.get("athlete_id"),
        discipline_id: row.get("discipline_id"),
        date: row.get("date"),
        value: row.get("value"),
        result_type: row.get("type"),
        competition_name: row.get("competition_name"),
        location: row.get("location"),
        placement: row.get("placement"),
        notes: row.get("notes"),
        is_personal_best: row.get::<i32, _>("is_personal_best") == 1,
        is_season_best: row.get::<i32, _>("is_season_best") == 1,
        created_at: row.get("created_at"),
    })
}

#[tauri::command]
pub async fn delete_result(app: AppHandle, id: i64) -> Result<bool, String> {
    let pool = get_pool(&app).await?;

    let result = sqlx::query("DELETE FROM results WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}

async fn check_personal_best_internal(
    pool: &sqlx::Pool<sqlx::Sqlite>,
    athlete_id: i64,
    discipline_id: i64,
    value: f64,
) -> Result<bool, String> {
    // Get discipline to check if lower is better
    let lower_is_better: i32 = sqlx::query_scalar(
        "SELECT lower_is_better FROM disciplines WHERE id = ?"
    )
    .bind(discipline_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Get current best
    let current_best: Option<f64> = if lower_is_better == 1 {
        sqlx::query_scalar(
            "SELECT MIN(value) FROM results WHERE athlete_id = ? AND discipline_id = ?"
        )
        .bind(athlete_id)
        .bind(discipline_id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?
    } else {
        sqlx::query_scalar(
            "SELECT MAX(value) FROM results WHERE athlete_id = ? AND discipline_id = ?"
        )
        .bind(athlete_id)
        .bind(discipline_id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?
    };

    match current_best {
        Some(best) => {
            if lower_is_better == 1 {
                Ok(value < best)
            } else {
                Ok(value > best)
            }
        }
        None => Ok(true), // First result is always PB
    }
}

async fn check_season_best_internal(
    pool: &sqlx::Pool<sqlx::Sqlite>,
    athlete_id: i64,
    discipline_id: i64,
    value: f64,
    year: i32,
) -> Result<bool, String> {
    let lower_is_better: i32 = sqlx::query_scalar(
        "SELECT lower_is_better FROM disciplines WHERE id = ?"
    )
    .bind(discipline_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let current_best: Option<f64> = if lower_is_better == 1 {
        sqlx::query_scalar(
            "SELECT MIN(value) FROM results WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ?"
        )
        .bind(athlete_id)
        .bind(discipline_id)
        .bind(year.to_string())
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?
    } else {
        sqlx::query_scalar(
            "SELECT MAX(value) FROM results WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ?"
        )
        .bind(athlete_id)
        .bind(discipline_id)
        .bind(year.to_string())
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?
    };

    match current_best {
        Some(best) => {
            if lower_is_better == 1 {
                Ok(value < best)
            } else {
                Ok(value > best)
            }
        }
        None => Ok(true),
    }
}

#[tauri::command]
pub async fn check_personal_best(
    app: AppHandle,
    athlete_id: i64,
    discipline_id: i64,
    value: f64,
) -> Result<bool, String> {
    let pool = get_pool(&app).await?;
    check_personal_best_internal(&pool, athlete_id, discipline_id, value).await
}

#[tauri::command]
pub async fn check_season_best(
    app: AppHandle,
    athlete_id: i64,
    discipline_id: i64,
    value: f64,
    year: i32,
) -> Result<bool, String> {
    let pool = get_pool(&app).await?;
    check_season_best_internal(&pool, athlete_id, discipline_id, value, year).await
}

#[tauri::command]
pub async fn get_athlete_medals(app: AppHandle, athlete_id: i64) -> Result<Vec<Medal>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        r#"SELECT m.id, m.athlete_id, m.result_id, m.type, m.competition_name,
                  d.full_name as discipline_name, m.date, m.created_at
           FROM medals m
           LEFT JOIN results r ON m.result_id = r.id
           LEFT JOIN disciplines d ON r.discipline_id = d.id
           WHERE m.athlete_id = ?
           ORDER BY m.date DESC"#
    )
    .bind(athlete_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|row| Medal {
        id: row.get("id"),
        athlete_id: row.get("athlete_id"),
        result_id: row.get("result_id"),
        medal_type: row.get("type"),
        competition_name: row.get("competition_name"),
        discipline_name: row.get("discipline_name"),
        date: row.get("date"),
        created_at: row.get("created_at"),
    }).collect())
}

#[tauri::command]
pub async fn create_medal(
    app: AppHandle,
    athlete_id: i64,
    result_id: Option<i64>,
    medal_type: String,
    competition_name: String,
    date: String,
) -> Result<Medal, String> {
    let pool = get_pool(&app).await?;

    let result = sqlx::query(
        r#"INSERT INTO medals (athlete_id, result_id, type, competition_name, date)
           VALUES (?, ?, ?, ?, ?)
           RETURNING id, athlete_id, result_id, type, competition_name, date, created_at"#
    )
    .bind(athlete_id)
    .bind(result_id)
    .bind(&medal_type)
    .bind(&competition_name)
    .bind(&date)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Medal {
        id: result.get("id"),
        athlete_id: result.get("athlete_id"),
        result_id: result.get("result_id"),
        medal_type: result.get("type"),
        competition_name: result.get("competition_name"),
        discipline_name: None,
        date: result.get("date"),
        created_at: result.get("created_at"),
    })
}
