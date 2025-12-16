use crate::database::get_pool;
use crate::types::{Athlete, Competition, ExportData, Goal, Medal, Result as AthleteResult};
use sqlx::Row;
use tauri::AppHandle;

#[tauri::command]
pub async fn export_data(app: AppHandle) -> Result<String, String> {
    let pool = get_pool(&app).await?;

    // Fetch all athletes
    let athlete_rows = sqlx::query(
        "SELECT id, first_name, last_name, birth_year, club_name, photo_path, created_at, updated_at FROM athletes"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let athletes: Vec<Athlete> = athlete_rows.iter().map(|row| Athlete {
        id: row.get("id"),
        first_name: row.get("first_name"),
        last_name: row.get("last_name"),
        birth_year: row.get("birth_year"),
        club_name: row.get("club_name"),
        photo_path: row.get("photo_path"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }).collect();

    // Fetch all results
    let result_rows = sqlx::query(
        "SELECT id, athlete_id, discipline_id, date, value, type, competition_name, location, placement, notes, is_personal_best, is_season_best, created_at FROM results"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let results: Vec<AthleteResult> = result_rows.iter().map(|row| AthleteResult {
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
    }).collect();

    // Fetch all competitions
    let competition_rows = sqlx::query(
        "SELECT id, name, date, end_date, location, address, notes, reminder_enabled, reminder_days_before, created_at FROM competitions"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let competitions: Vec<Competition> = competition_rows.iter().map(|row| Competition {
        id: row.get("id"),
        name: row.get("name"),
        date: row.get("date"),
        end_date: row.get("end_date"),
        location: row.get("location"),
        address: row.get("address"),
        notes: row.get("notes"),
        reminder_enabled: row.get::<i32, _>("reminder_enabled") == 1,
        reminder_days_before: row.get("reminder_days_before"),
        created_at: row.get("created_at"),
    }).collect();

    // Fetch all goals
    let goal_rows = sqlx::query(
        "SELECT id, athlete_id, discipline_id, target_value, target_date, status, achieved_at, created_at FROM goals"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let goals: Vec<Goal> = goal_rows.iter().map(|row| Goal {
        id: row.get("id"),
        athlete_id: row.get("athlete_id"),
        discipline_id: row.get("discipline_id"),
        target_value: row.get("target_value"),
        target_date: row.get("target_date"),
        status: row.get("status"),
        achieved_at: row.get("achieved_at"),
        created_at: row.get("created_at"),
    }).collect();

    // Fetch all medals
    let medal_rows = sqlx::query(
        "SELECT id, athlete_id, result_id, type, competition_name, discipline_name, date, created_at FROM medals"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let medals: Vec<Medal> = medal_rows.iter().map(|row| Medal {
        id: row.get("id"),
        athlete_id: row.get("athlete_id"),
        result_id: row.get("result_id"),
        medal_type: row.get("type"),
        competition_name: row.get("competition_name"),
        discipline_name: row.get("discipline_name"),
        date: row.get("date"),
        created_at: row.get("created_at"),
    }).collect();

    let export = ExportData {
        version: "1.0.0".to_string(),
        exported_at: chrono::Utc::now().to_rfc3339(),
        athletes,
        results,
        competitions,
        goals,
        medals,
    };

    serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_data(app: AppHandle, json: String) -> Result<bool, String> {
    let pool = get_pool(&app).await?;

    let data: ExportData = serde_json::from_str(&json).map_err(|e| format!("Invalid JSON: {}", e))?;

    // Import athletes
    for athlete in data.athletes {
        sqlx::query(
            "INSERT OR REPLACE INTO athletes (id, first_name, last_name, birth_year, club_name, photo_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(athlete.id)
        .bind(&athlete.first_name)
        .bind(&athlete.last_name)
        .bind(athlete.birth_year)
        .bind(&athlete.club_name)
        .bind(&athlete.photo_path)
        .bind(&athlete.created_at)
        .bind(&athlete.updated_at)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Import results
    for result in data.results {
        sqlx::query(
            "INSERT OR REPLACE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, location, placement, notes, is_personal_best, is_season_best, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(result.id)
        .bind(result.athlete_id)
        .bind(result.discipline_id)
        .bind(&result.date)
        .bind(result.value)
        .bind(&result.result_type)
        .bind(&result.competition_name)
        .bind(&result.location)
        .bind(result.placement)
        .bind(&result.notes)
        .bind(result.is_personal_best as i32)
        .bind(result.is_season_best as i32)
        .bind(&result.created_at)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Import competitions
    for competition in data.competitions {
        sqlx::query(
            "INSERT OR REPLACE INTO competitions (id, name, date, end_date, location, address, notes, reminder_enabled, reminder_days_before, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(competition.id)
        .bind(&competition.name)
        .bind(&competition.date)
        .bind(&competition.end_date)
        .bind(&competition.location)
        .bind(&competition.address)
        .bind(&competition.notes)
        .bind(competition.reminder_enabled as i32)
        .bind(competition.reminder_days_before)
        .bind(&competition.created_at)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Import goals
    for goal in data.goals {
        sqlx::query(
            "INSERT OR REPLACE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status, achieved_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(goal.id)
        .bind(goal.athlete_id)
        .bind(goal.discipline_id)
        .bind(goal.target_value)
        .bind(&goal.target_date)
        .bind(&goal.status)
        .bind(&goal.achieved_at)
        .bind(&goal.created_at)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Import medals
    for medal in data.medals {
        sqlx::query(
            "INSERT OR REPLACE INTO medals (id, athlete_id, result_id, type, competition_name, discipline_name, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(medal.id)
        .bind(medal.athlete_id)
        .bind(medal.result_id)
        .bind(&medal.medal_type)
        .bind(&medal.competition_name)
        .bind(&medal.discipline_name)
        .bind(&medal.date)
        .bind(&medal.created_at)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    Ok(true)
}
