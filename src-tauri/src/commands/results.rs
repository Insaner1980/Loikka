use crate::database::get_pool;
use crate::types::{CreateResult, Discipline, Medal, Result as AthleteResult, UpdateResult};
use sqlx::Row;
use tauri::AppHandle;

// Wind-affected disciplines (sprints, hurdles, long jump, triple jump)
// Uses short names (name field from disciplines table)
const WIND_AFFECTED_DISCIPLINES: &[&str] = &[
    "60m", "100m", "200m",
    "60m aj", "80m aj", "100m aj",
    "Pituus", "Kolmiloikka"
];

// Wind limit for official records (m/s)
const WIND_LIMIT: f64 = 2.0;

// Age threshold for wind rules (under this age, wind rules don't apply)
const WIND_RULE_AGE_THRESHOLD: i32 = 14;

/// Parameters for checking PB/SB with equipment considerations
#[derive(Default)]
struct RecordCheckParams {
    wind: Option<f64>,
    equipment_weight: Option<f64>,
    hurdle_height: Option<i32>,
}

#[tauri::command]
pub async fn get_all_results(app: AppHandle) -> Result<Vec<AthleteResult>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, notes, is_personal_best, is_season_best, is_national_record, wind, status, equipment_weight, hurdle_height, hurdle_spacing, created_at
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
        r#"SELECT id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, notes, is_personal_best, is_season_best, is_national_record, wind, status, equipment_weight, hurdle_height, hurdle_spacing, created_at
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
            .execute(&pool)
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
            .execute(&pool)
            .await
            .map_err(|e| e.to_string())?;
        } else {
            // Standard: clear all PBs for this discipline
            sqlx::query(
                "UPDATE results SET is_personal_best = 0 WHERE athlete_id = ? AND discipline_id = ?"
            )
            .bind(result.athlete_id)
            .bind(result.discipline_id)
            .execute(&pool)
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
            .execute(&pool)
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
            .execute(&pool)
            .await
            .map_err(|e| e.to_string())?;
        } else {
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
    }

    let query_result = sqlx::query(
        r#"INSERT INTO results (athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, notes, is_personal_best, is_season_best, is_national_record, wind, status, equipment_weight, hurdle_height, hurdle_spacing)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#
    )
    .bind(result.athlete_id)
    .bind(result.discipline_id)
    .bind(&result.date)
    .bind(result.value)
    .bind(&result.result_type)
    .bind(&result.competition_name)
    .bind(&result.competition_level)
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
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let id = query_result.last_insert_rowid();

    let row = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, notes, is_personal_best, is_season_best, is_national_record, wind, status, equipment_weight, hurdle_height, hurdle_spacing, created_at
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
        r#"SELECT id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, notes, is_personal_best, is_season_best, is_national_record, wind, status, equipment_weight, hurdle_height, hurdle_spacing, created_at
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
        r#"SELECT id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, notes, is_personal_best, is_season_best, is_national_record, wind, status, equipment_weight, hurdle_height, hurdle_spacing, created_at
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

// Check if wind makes the result ineligible for records
fn is_wind_assisted(
    wind: Option<f64>,
    discipline_name: &str,
    athlete_birth_year: i32,
    result_year: i32,
) -> bool {
    // Check if discipline is wind-affected
    if !WIND_AFFECTED_DISCIPLINES.contains(&discipline_name) {
        return false;
    }

    // Check athlete age at time of result
    let athlete_age = result_year - athlete_birth_year;
    if athlete_age < WIND_RULE_AGE_THRESHOLD {
        // Wind rules don't apply to younger athletes
        return false;
    }

    // Check wind value
    matches!(wind, Some(w) if w > WIND_LIMIT)
}

// Extended PB check that considers wind and equipment
async fn check_personal_best_extended(
    pool: &sqlx::Pool<sqlx::Sqlite>,
    athlete_id: i64,
    discipline_id: i64,
    value: f64,
    params: &RecordCheckParams,
) -> Result<bool, String> {
    // Get discipline info
    let row = sqlx::query(
        "SELECT d.name, d.lower_is_better, d.category, a.birth_year
         FROM disciplines d, athletes a
         WHERE d.id = ? AND a.id = ?"
    )
    .bind(discipline_id)
    .bind(athlete_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let discipline_name: String = row.get("name");
    let lower_is_better: i32 = row.get("lower_is_better");
    let category: String = row.get("category");
    let birth_year: i32 = row.get("birth_year");

    // Get current year from result date isn't available here, use current year
    let current_year = chrono::Utc::now().format("%Y").to_string().parse::<i32>().unwrap_or(2024);

    // Check if wind-assisted (ineligible for record)
    if is_wind_assisted(params.wind, &discipline_name, birth_year, current_year) {
        return Ok(false);
    }

    // For throws and hurdles, compare only with same equipment
    let current_best: Option<f64> = if category == "throws" && params.equipment_weight.is_some() {
        // Compare with results using same weight
        if lower_is_better == 1 {
            sqlx::query_scalar(
                "SELECT MIN(value) FROM results WHERE athlete_id = ? AND discipline_id = ? AND equipment_weight = ? AND (status IS NULL OR status = 'valid')"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .bind(params.equipment_weight)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?
        } else {
            sqlx::query_scalar(
                "SELECT MAX(value) FROM results WHERE athlete_id = ? AND discipline_id = ? AND equipment_weight = ? AND (status IS NULL OR status = 'valid')"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .bind(params.equipment_weight)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?
        }
    } else if category == "hurdles" && params.hurdle_height.is_some() {
        // Compare with results using same hurdle height
        if lower_is_better == 1 {
            sqlx::query_scalar(
                "SELECT MIN(value) FROM results WHERE athlete_id = ? AND discipline_id = ? AND hurdle_height = ? AND (status IS NULL OR status = 'valid')"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .bind(params.hurdle_height)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?
        } else {
            sqlx::query_scalar(
                "SELECT MAX(value) FROM results WHERE athlete_id = ? AND discipline_id = ? AND hurdle_height = ? AND (status IS NULL OR status = 'valid')"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .bind(params.hurdle_height)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?
        }
    } else {
        // Standard comparison (no equipment consideration)
        if lower_is_better == 1 {
            sqlx::query_scalar(
                "SELECT MIN(value) FROM results WHERE athlete_id = ? AND discipline_id = ? AND (status IS NULL OR status = 'valid')"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?
        } else {
            sqlx::query_scalar(
                "SELECT MAX(value) FROM results WHERE athlete_id = ? AND discipline_id = ? AND (status IS NULL OR status = 'valid')"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?
        }
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

async fn check_personal_best_internal(
    pool: &sqlx::Pool<sqlx::Sqlite>,
    athlete_id: i64,
    discipline_id: i64,
    value: f64,
) -> Result<bool, String> {
    // Legacy function - calls extended version with no equipment info
    check_personal_best_extended(pool, athlete_id, discipline_id, value, &RecordCheckParams::default()).await
}

// Extended SB check that considers wind and equipment
async fn check_season_best_extended(
    pool: &sqlx::Pool<sqlx::Sqlite>,
    athlete_id: i64,
    discipline_id: i64,
    value: f64,
    year: i32,
    params: &RecordCheckParams,
) -> Result<bool, String> {
    // Get discipline info
    let row = sqlx::query(
        "SELECT d.name, d.lower_is_better, d.category, a.birth_year
         FROM disciplines d, athletes a
         WHERE d.id = ? AND a.id = ?"
    )
    .bind(discipline_id)
    .bind(athlete_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let discipline_name: String = row.get("name");
    let lower_is_better: i32 = row.get("lower_is_better");
    let category: String = row.get("category");
    let birth_year: i32 = row.get("birth_year");

    // Check if wind-assisted (ineligible for record)
    if is_wind_assisted(params.wind, &discipline_name, birth_year, year) {
        return Ok(false);
    }

    // For throws and hurdles, compare only with same equipment
    let current_best: Option<f64> = if category == "throws" && params.equipment_weight.is_some() {
        if lower_is_better == 1 {
            sqlx::query_scalar(
                "SELECT MIN(value) FROM results WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ? AND equipment_weight = ? AND (status IS NULL OR status = 'valid')"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .bind(year.to_string())
            .bind(params.equipment_weight)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?
        } else {
            sqlx::query_scalar(
                "SELECT MAX(value) FROM results WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ? AND equipment_weight = ? AND (status IS NULL OR status = 'valid')"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .bind(year.to_string())
            .bind(params.equipment_weight)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?
        }
    } else if category == "hurdles" && params.hurdle_height.is_some() {
        if lower_is_better == 1 {
            sqlx::query_scalar(
                "SELECT MIN(value) FROM results WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ? AND hurdle_height = ? AND (status IS NULL OR status = 'valid')"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .bind(year.to_string())
            .bind(params.hurdle_height)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?
        } else {
            sqlx::query_scalar(
                "SELECT MAX(value) FROM results WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ? AND hurdle_height = ? AND (status IS NULL OR status = 'valid')"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .bind(year.to_string())
            .bind(params.hurdle_height)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?
        }
    } else if lower_is_better == 1 {
        sqlx::query_scalar(
            "SELECT MIN(value) FROM results WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ? AND (status IS NULL OR status = 'valid')"
        )
        .bind(athlete_id)
        .bind(discipline_id)
        .bind(year.to_string())
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?
    } else {
        sqlx::query_scalar(
            "SELECT MAX(value) FROM results WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ? AND (status IS NULL OR status = 'valid')"
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

async fn check_season_best_internal(
    pool: &sqlx::Pool<sqlx::Sqlite>,
    athlete_id: i64,
    discipline_id: i64,
    value: f64,
    year: i32,
) -> Result<bool, String> {
    // Legacy function - calls extended version with no equipment info
    check_season_best_extended(pool, athlete_id, discipline_id, value, year, &RecordCheckParams::default()).await
}

/// Recalculate PB and SB flags for all results of an athlete in a discipline.
/// This should be called after updating or deleting a result.
async fn recalculate_records(
    pool: &sqlx::Pool<sqlx::Sqlite>,
    athlete_id: i64,
    discipline_id: i64,
    equipment_weight: Option<f64>,
    hurdle_height: Option<i32>,
) -> Result<(), String> {
    // Get discipline info
    let row = sqlx::query(
        "SELECT d.name, d.lower_is_better, d.category, a.birth_year
         FROM disciplines d, athletes a
         WHERE d.id = ? AND a.id = ?"
    )
    .bind(discipline_id)
    .bind(athlete_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let discipline_name: String = row.get("name");
    let lower_is_better: i32 = row.get("lower_is_better");
    let category: String = row.get("category");
    let birth_year: i32 = row.get("birth_year");
    let current_year = chrono::Utc::now().format("%Y").to_string().parse::<i32>().unwrap_or(2024);

    // First, clear all PB/SB flags for this athlete/discipline (respecting equipment)
    if category == "throws" && equipment_weight.is_some() {
        sqlx::query(
            "UPDATE results SET is_personal_best = 0, is_season_best = 0 WHERE athlete_id = ? AND discipline_id = ? AND equipment_weight = ?"
        )
        .bind(athlete_id)
        .bind(discipline_id)
        .bind(equipment_weight)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    } else if category == "hurdles" && hurdle_height.is_some() {
        sqlx::query(
            "UPDATE results SET is_personal_best = 0, is_season_best = 0 WHERE athlete_id = ? AND discipline_id = ? AND hurdle_height = ?"
        )
        .bind(athlete_id)
        .bind(discipline_id)
        .bind(hurdle_height)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    } else {
        sqlx::query(
            "UPDATE results SET is_personal_best = 0, is_season_best = 0 WHERE athlete_id = ? AND discipline_id = ?"
        )
        .bind(athlete_id)
        .bind(discipline_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Find and set the new PB (best valid result)
    let pb_query = if category == "throws" && equipment_weight.is_some() {
        if lower_is_better == 1 {
            sqlx::query(
                "SELECT id, value, wind, date FROM results WHERE athlete_id = ? AND discipline_id = ? AND equipment_weight = ? AND (status IS NULL OR status = 'valid') ORDER BY value ASC"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .bind(equipment_weight)
        } else {
            sqlx::query(
                "SELECT id, value, wind, date FROM results WHERE athlete_id = ? AND discipline_id = ? AND equipment_weight = ? AND (status IS NULL OR status = 'valid') ORDER BY value DESC"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .bind(equipment_weight)
        }
    } else if category == "hurdles" && hurdle_height.is_some() {
        if lower_is_better == 1 {
            sqlx::query(
                "SELECT id, value, wind, date FROM results WHERE athlete_id = ? AND discipline_id = ? AND hurdle_height = ? AND (status IS NULL OR status = 'valid') ORDER BY value ASC"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .bind(hurdle_height)
        } else {
            sqlx::query(
                "SELECT id, value, wind, date FROM results WHERE athlete_id = ? AND discipline_id = ? AND hurdle_height = ? AND (status IS NULL OR status = 'valid') ORDER BY value DESC"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .bind(hurdle_height)
        }
    } else if lower_is_better == 1 {
        sqlx::query(
            "SELECT id, value, wind, date FROM results WHERE athlete_id = ? AND discipline_id = ? AND (status IS NULL OR status = 'valid') ORDER BY value ASC"
        )
        .bind(athlete_id)
        .bind(discipline_id)
    } else {
        sqlx::query(
            "SELECT id, value, wind, date FROM results WHERE athlete_id = ? AND discipline_id = ? AND (status IS NULL OR status = 'valid') ORDER BY value DESC"
        )
        .bind(athlete_id)
        .bind(discipline_id)
    };

    let results = pb_query.fetch_all(pool).await.map_err(|e| e.to_string())?;

    // Find the best result that isn't wind-assisted
    for row in &results {
        let result_id: i64 = row.get("id");
        let wind: Option<f64> = row.get("wind");
        let date: String = row.get("date");
        let current_year = chrono::Utc::now().format("%Y").to_string().parse::<i32>().unwrap_or(2024);
        let result_year: i32 = date.split('-').next().and_then(|y| y.parse().ok()).unwrap_or(current_year);

        if !is_wind_assisted(wind, &discipline_name, birth_year, result_year) {
            // This is the new PB
            sqlx::query("UPDATE results SET is_personal_best = 1 WHERE id = ?")
                .bind(result_id)
                .execute(pool)
                .await
                .map_err(|e| e.to_string())?;
            break;
        }
    }

    // Find and set SB for each year
    let years_query = if category == "throws" && equipment_weight.is_some() {
        sqlx::query(
            "SELECT DISTINCT strftime('%Y', date) as year FROM results WHERE athlete_id = ? AND discipline_id = ? AND equipment_weight = ? AND (status IS NULL OR status = 'valid')"
        )
        .bind(athlete_id)
        .bind(discipline_id)
        .bind(equipment_weight)
    } else if category == "hurdles" && hurdle_height.is_some() {
        sqlx::query(
            "SELECT DISTINCT strftime('%Y', date) as year FROM results WHERE athlete_id = ? AND discipline_id = ? AND hurdle_height = ? AND (status IS NULL OR status = 'valid')"
        )
        .bind(athlete_id)
        .bind(discipline_id)
        .bind(hurdle_height)
    } else {
        sqlx::query(
            "SELECT DISTINCT strftime('%Y', date) as year FROM results WHERE athlete_id = ? AND discipline_id = ? AND (status IS NULL OR status = 'valid')"
        )
        .bind(athlete_id)
        .bind(discipline_id)
    };

    let years: Vec<String> = years_query
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?
        .iter()
        .filter_map(|r| r.get::<Option<String>, _>("year"))
        .collect();

    for year in years {
        // Get all results for this year, ordered by value
        let sb_query = if category == "throws" && equipment_weight.is_some() {
            if lower_is_better == 1 {
                sqlx::query(
                    "SELECT id, wind FROM results WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ? AND equipment_weight = ? AND (status IS NULL OR status = 'valid') ORDER BY value ASC"
                )
                .bind(athlete_id)
                .bind(discipline_id)
                .bind(&year)
                .bind(equipment_weight)
            } else {
                sqlx::query(
                    "SELECT id, wind FROM results WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ? AND equipment_weight = ? AND (status IS NULL OR status = 'valid') ORDER BY value DESC"
                )
                .bind(athlete_id)
                .bind(discipline_id)
                .bind(&year)
                .bind(equipment_weight)
            }
        } else if category == "hurdles" && hurdle_height.is_some() {
            if lower_is_better == 1 {
                sqlx::query(
                    "SELECT id, wind FROM results WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ? AND hurdle_height = ? AND (status IS NULL OR status = 'valid') ORDER BY value ASC"
                )
                .bind(athlete_id)
                .bind(discipline_id)
                .bind(&year)
                .bind(hurdle_height)
            } else {
                sqlx::query(
                    "SELECT id, wind FROM results WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ? AND hurdle_height = ? AND (status IS NULL OR status = 'valid') ORDER BY value DESC"
                )
                .bind(athlete_id)
                .bind(discipline_id)
                .bind(&year)
                .bind(hurdle_height)
            }
        } else if lower_is_better == 1 {
            sqlx::query(
                "SELECT id, wind FROM results WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ? AND (status IS NULL OR status = 'valid') ORDER BY value ASC"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .bind(&year)
        } else {
            sqlx::query(
                "SELECT id, wind FROM results WHERE athlete_id = ? AND discipline_id = ? AND strftime('%Y', date) = ? AND (status IS NULL OR status = 'valid') ORDER BY value DESC"
            )
            .bind(athlete_id)
            .bind(discipline_id)
            .bind(&year)
        };

        let year_results = sb_query.fetch_all(pool).await.map_err(|e| e.to_string())?;
        let year_int: i32 = year.parse().unwrap_or(current_year);

        // Find the best result that isn't wind-assisted
        for row in &year_results {
            let result_id: i64 = row.get("id");
            let wind: Option<f64> = row.get("wind");

            if !is_wind_assisted(wind, &discipline_name, birth_year, year_int) {
                // This is the SB for this year
                sqlx::query("UPDATE results SET is_season_best = 1 WHERE id = ?")
                    .bind(result_id)
                    .execute(pool)
                    .await
                    .map_err(|e| e.to_string())?;
                break;
            }
        }
    }

    Ok(())
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
                  r.location, r.discipline_id, d.full_name as discipline_name, m.date, m.created_at
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
        competition_id: None,
        location: row.get("location"),
        discipline_id: row.get("discipline_id"),
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
        competition_id: None,
        location: None,
        discipline_id: None,
        discipline_name: None,
        date: result.get("date"),
        created_at: result.get("created_at"),
    })
}
