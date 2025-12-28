use crate::database::get_pool;
use crate::types::{CreateResult, Discipline, Result as AthleteResult, UpdateResult};
use sqlx::Row;
use tauri::AppHandle;

use super::records::{
    check_personal_best_extended, check_season_best_extended, recalculate_records,
};
use super::types::RecordCheckParams;

#[tauri::command]
pub async fn get_all_results(app: AppHandle) -> Result<Vec<AthleteResult>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, custom_level_name, location, placement, notes, is_personal_best, is_season_best, is_national_record, wind, status, equipment_weight, hurdle_height, hurdle_spacing, created_at
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
        competition_level: row.get("competition_level"),
        custom_level_name: row.get("custom_level_name"),
        location: row.get("location"),
        placement: row.get("placement"),
        notes: row.get("notes"),
        is_personal_best: row.get::<i32, _>("is_personal_best") == 1,
        is_season_best: row.get::<i32, _>("is_season_best") == 1,
        is_national_record: row.get::<i32, _>("is_national_record") == 1,
        wind: row.get("wind"),
        status: row.get("status"),
        equipment_weight: row.get("equipment_weight"),
        hurdle_height: row.get("hurdle_height"),
        hurdle_spacing: row.get("hurdle_spacing"),
        created_at: row.get("created_at"),
    }).collect())
}

#[tauri::command]
pub async fn get_results_by_athlete(app: AppHandle, athlete_id: i64) -> Result<Vec<AthleteResult>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, custom_level_name, location, placement, notes, is_personal_best, is_season_best, is_national_record, wind, status, equipment_weight, hurdle_height, hurdle_spacing, created_at
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
        competition_level: row.get("competition_level"),
        custom_level_name: row.get("custom_level_name"),
        location: row.get("location"),
        placement: row.get("placement"),
        notes: row.get("notes"),
        is_personal_best: row.get::<i32, _>("is_personal_best") == 1,
        is_season_best: row.get::<i32, _>("is_season_best") == 1,
        is_national_record: row.get::<i32, _>("is_national_record") == 1,
        wind: row.get("wind"),
        status: row.get("status"),
        equipment_weight: row.get("equipment_weight"),
        hurdle_height: row.get("hurdle_height"),
        hurdle_spacing: row.get("hurdle_spacing"),
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

    // Get current year for fallback (if date parsing fails)
    let current_year = chrono::Utc::now().format("%Y").to_string().parse::<i32>().unwrap_or(2024);
    let year: i32 = result.date.split('-').next().and_then(|y| y.parse().ok()).unwrap_or(current_year);

    // Skip PB/SB checks if status is not valid
    let status = result.status.as_deref().unwrap_or("valid");
    let (is_pb, is_sb) = if status != "valid" {
        (false, false)
    } else {
        let params = RecordCheckParams {
            wind: result.wind,
            equipment_weight: result.equipment_weight,
            hurdle_height: result.hurdle_height,
        };

        // Check if this is a personal best (with wind and equipment consideration)
        let pb = check_personal_best_extended(
            &pool,
            result.athlete_id,
            result.discipline_id,
            result.value,
            &params,
        ).await?;

        // Check if this is a season best
        let sb = check_season_best_extended(
            &pool,
            result.athlete_id,
            result.discipline_id,
            result.value,
            year,
            &params,
        ).await?;

        (pb, sb)
    };

    // Start transaction for atomic UPDATE + INSERT
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // If this is a new PB, clear old PB flag for this athlete/discipline (respecting equipment)
    if is_pb {
        if let Some(weight) = result.equipment_weight {
            // For throws: only clear PB for same weight
            sqlx::query(
                "UPDATE results SET is_personal_best = 0 WHERE athlete_id = ? AND discipline_id = ? AND equipment_weight = ?"
            )
            .bind(result.athlete_id)
            .bind(result.discipline_id)
            .bind(weight)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        } else if let Some(height) = result.hurdle_height {
            // For hurdles: only clear PB for same height
            sqlx::query(
                "UPDATE results SET is_personal_best = 0 WHERE athlete_id = ? AND discipline_id = ? AND hurdle_height = ?"
            )
            .bind(result.athlete_id)
            .bind(result.discipline_id)
            .bind(height)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        } else {
            // Standard: clear all PBs for this discipline
            sqlx::query(
                "UPDATE results SET is_personal_best = 0 WHERE athlete_id = ? AND discipline_id = ?"
            )
            .bind(result.athlete_id)
            .bind(result.discipline_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }
    }

    // If this is a new SB, clear old SB flag for this athlete/discipline/year (respecting equipment)
    if is_sb {
        if let Some(weight) = result.equipment_weight {
            sqlx::query(
                "UPDATE results SET is_season_best = 0 WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ? AND equipment_weight = ?"
            )
            .bind(result.athlete_id)
            .bind(result.discipline_id)
            .bind(year.to_string())
            .bind(weight)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        } else if let Some(height) = result.hurdle_height {
            sqlx::query(
                "UPDATE results SET is_season_best = 0 WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ? AND hurdle_height = ?"
            )
            .bind(result.athlete_id)
            .bind(result.discipline_id)
            .bind(year.to_string())
            .bind(height)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        } else {
            sqlx::query(
                "UPDATE results SET is_season_best = 0 WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ?"
            )
            .bind(result.athlete_id)
            .bind(result.discipline_id)
            .bind(year.to_string())
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }
    }

    let query_result = sqlx::query(
        r#"INSERT INTO results (athlete_id, discipline_id, date, value, type, competition_name, competition_level, custom_level_name, location, placement, notes, is_personal_best, is_season_best, is_national_record, wind, status, equipment_weight, hurdle_height, hurdle_spacing)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#
    )
    .bind(result.athlete_id)
    .bind(result.discipline_id)
    .bind(&result.date)
    .bind(result.value)
    .bind(&result.result_type)
    .bind(&result.competition_name)
    .bind(&result.competition_level)
    .bind(&result.custom_level_name)
    .bind(&result.location)
    .bind(result.placement)
    .bind(&result.notes)
    .bind(is_pb as i32)
    .bind(is_sb as i32)
    .bind(result.is_national_record.unwrap_or(false) as i32)
    .bind(result.wind)
    .bind(&result.status)
    .bind(result.equipment_weight)
    .bind(result.hurdle_height)
    .bind(result.hurdle_spacing)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let id = query_result.last_insert_rowid();

    let row = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, custom_level_name, location, placement, notes, is_personal_best, is_season_best, is_national_record, wind, status, equipment_weight, hurdle_height, hurdle_spacing, created_at
        FROM results WHERE id = ?"#
    )
    .bind(id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Commit transaction
    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(AthleteResult {
        id: row.get("id"),
        athlete_id: row.get("athlete_id"),
        discipline_id: row.get("discipline_id"),
        date: row.get("date"),
        value: row.get("value"),
        result_type: row.get("type"),
        competition_name: row.get("competition_name"),
        competition_level: row.get("competition_level"),
        custom_level_name: row.get("custom_level_name"),
        location: row.get("location"),
        placement: row.get("placement"),
        notes: row.get("notes"),
        is_personal_best: row.get::<i32, _>("is_personal_best") == 1,
        is_season_best: row.get::<i32, _>("is_season_best") == 1,
        is_national_record: row.get::<i32, _>("is_national_record") == 1,
        wind: row.get("wind"),
        status: row.get("status"),
        equipment_weight: row.get("equipment_weight"),
        hurdle_height: row.get("hurdle_height"),
        hurdle_spacing: row.get("hurdle_spacing"),
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
            competition_level = ?,
            custom_level_name = ?,
            location = ?,
            placement = ?,
            notes = ?,
            wind = ?,
            status = COALESCE(?, status),
            equipment_weight = ?,
            hurdle_height = ?,
            hurdle_spacing = ?,
            is_national_record = COALESCE(?, is_national_record)
        WHERE id = ?"#
    )
    .bind(result.athlete_id)
    .bind(result.discipline_id)
    .bind(&result.date)
    .bind(result.value)
    .bind(&result.result_type)
    .bind(&result.competition_name)
    .bind(&result.competition_level)
    .bind(&result.custom_level_name)
    .bind(&result.location)
    .bind(result.placement)
    .bind(&result.notes)
    .bind(result.wind)
    .bind(&result.status)
    .bind(result.equipment_weight)
    .bind(result.hurdle_height)
    .bind(result.hurdle_spacing)
    .bind(result.is_national_record.map(|v| if v { 1i32 } else { 0i32 }))
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    // Get the updated result to extract athlete_id and discipline_id for recalculation
    let row = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, custom_level_name, location, placement, notes, is_personal_best, is_season_best, is_national_record, wind, status, equipment_weight, hurdle_height, hurdle_spacing, created_at
        FROM results WHERE id = ?"#
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let athlete_id: i64 = row.get("athlete_id");
    let discipline_id: i64 = row.get("discipline_id");
    let equipment_weight: Option<f64> = row.get("equipment_weight");
    let hurdle_height: Option<i32> = row.get("hurdle_height");

    // Recalculate PB/SB flags for this athlete/discipline combination
    recalculate_records(&pool, athlete_id, discipline_id, equipment_weight, hurdle_height).await?;

    // Re-fetch the result after recalculation to get updated PB/SB flags
    let row = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, custom_level_name, location, placement, notes, is_personal_best, is_season_best, is_national_record, wind, status, equipment_weight, hurdle_height, hurdle_spacing, created_at
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
        competition_level: row.get("competition_level"),
        custom_level_name: row.get("custom_level_name"),
        location: row.get("location"),
        placement: row.get("placement"),
        notes: row.get("notes"),
        is_personal_best: row.get::<i32, _>("is_personal_best") == 1,
        is_season_best: row.get::<i32, _>("is_season_best") == 1,
        is_national_record: row.get::<i32, _>("is_national_record") == 1,
        wind: row.get("wind"),
        status: row.get("status"),
        equipment_weight: row.get("equipment_weight"),
        hurdle_height: row.get("hurdle_height"),
        hurdle_spacing: row.get("hurdle_spacing"),
        created_at: row.get("created_at"),
    })
}

#[tauri::command]
pub async fn delete_result(app: AppHandle, id: i64) -> Result<bool, String> {
    let pool = get_pool(&app).await?;

    // First, get the result info so we can recalculate PB/SB after deletion
    let row = sqlx::query(
        "SELECT athlete_id, discipline_id, equipment_weight, hurdle_height FROM results WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let result = sqlx::query("DELETE FROM results WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    // If we deleted a result, recalculate PB/SB for that athlete/discipline
    if result.rows_affected() > 0 {
        if let Some(row) = row {
            let athlete_id: i64 = row.get("athlete_id");
            let discipline_id: i64 = row.get("discipline_id");
            let equipment_weight: Option<f64> = row.get("equipment_weight");
            let hurdle_height: Option<i32> = row.get("hurdle_height");

            recalculate_records(&pool, athlete_id, discipline_id, equipment_weight, hurdle_height).await?;
        }
    }

    Ok(result.rows_affected() > 0)
}

// Public command wrappers for record checking
#[tauri::command]
pub async fn check_personal_best(
    app: AppHandle,
    athlete_id: i64,
    discipline_id: i64,
    value: f64,
) -> Result<bool, String> {
    let pool = get_pool(&app).await?;
    super::records::check_personal_best_internal(&pool, athlete_id, discipline_id, value).await
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
    super::records::check_season_best_internal(&pool, athlete_id, discipline_id, value, year).await
}
