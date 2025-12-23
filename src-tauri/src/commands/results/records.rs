use sqlx::Row;

use super::types::{RecordCheckParams, WIND_AFFECTED_DISCIPLINES, WIND_LIMIT, WIND_RULE_AGE_THRESHOLD};

/// Check if wind makes the result ineligible for records
pub fn is_wind_assisted(
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

/// Extended PB check that considers wind and equipment
pub async fn check_personal_best_extended(
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

pub async fn check_personal_best_internal(
    pool: &sqlx::Pool<sqlx::Sqlite>,
    athlete_id: i64,
    discipline_id: i64,
    value: f64,
) -> Result<bool, String> {
    // Legacy function - calls extended version with no equipment info
    check_personal_best_extended(pool, athlete_id, discipline_id, value, &RecordCheckParams::default()).await
}

/// Extended SB check that considers wind and equipment
pub async fn check_season_best_extended(
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

pub async fn check_season_best_internal(
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
pub async fn recalculate_records(
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
