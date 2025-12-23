use crate::database::get_pool;
use crate::types::{Competition, CompetitionParticipant, CreateCompetition, CreateCompetitionParticipant, UpdateCompetition};
use sqlx::Row;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_all_competitions(app: AppHandle) -> Result<Vec<Competition>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        r#"SELECT id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before, created_at
        FROM competitions ORDER BY date DESC"#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|row| Competition {
        id: row.get("id"),
        name: row.get("name"),
        date: row.get("date"),
        end_date: row.get("end_date"),
        location: row.get("location"),
        address: row.get("address"),
        level: row.get("level"),
        notes: row.get("notes"),
        reminder_enabled: row.get::<i32, _>("reminder_enabled") == 1,
        reminder_days_before: row.get("reminder_days_before"),
        created_at: row.get("created_at"),
    }).collect())
}

#[tauri::command]
pub async fn get_upcoming_competitions(app: AppHandle) -> Result<Vec<Competition>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        r#"SELECT id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before, created_at
        FROM competitions
        WHERE date >= date('now')
        ORDER BY date ASC"#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|row| Competition {
        id: row.get("id"),
        name: row.get("name"),
        date: row.get("date"),
        end_date: row.get("end_date"),
        location: row.get("location"),
        address: row.get("address"),
        level: row.get("level"),
        notes: row.get("notes"),
        reminder_enabled: row.get::<i32, _>("reminder_enabled") == 1,
        reminder_days_before: row.get("reminder_days_before"),
        created_at: row.get("created_at"),
    }).collect())
}

#[tauri::command]
pub async fn get_competition(app: AppHandle, id: i64) -> Result<Option<Competition>, String> {
    let pool = get_pool(&app).await?;

    let row = sqlx::query(
        r#"SELECT id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before, created_at
        FROM competitions WHERE id = ?"#
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(row.map(|row| Competition {
        id: row.get("id"),
        name: row.get("name"),
        date: row.get("date"),
        end_date: row.get("end_date"),
        location: row.get("location"),
        address: row.get("address"),
        level: row.get("level"),
        notes: row.get("notes"),
        reminder_enabled: row.get::<i32, _>("reminder_enabled") == 1,
        reminder_days_before: row.get("reminder_days_before"),
        created_at: row.get("created_at"),
    }))
}

#[tauri::command]
pub async fn create_competition(app: AppHandle, competition: CreateCompetition) -> Result<Competition, String> {
    let pool = get_pool(&app).await?;

    let result = sqlx::query(
        r#"INSERT INTO competitions (name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"#
    )
    .bind(&competition.name)
    .bind(&competition.date)
    .bind(&competition.end_date)
    .bind(&competition.location)
    .bind(&competition.address)
    .bind(&competition.level)
    .bind(&competition.notes)
    .bind(competition.reminder_enabled as i32)
    .bind(competition.reminder_days_before)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let id = result.last_insert_rowid();

    let row = sqlx::query(
        r#"SELECT id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before, created_at
        FROM competitions WHERE id = ?"#
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Competition {
        id: row.get("id"),
        name: row.get("name"),
        date: row.get("date"),
        end_date: row.get("end_date"),
        location: row.get("location"),
        address: row.get("address"),
        level: row.get("level"),
        notes: row.get("notes"),
        reminder_enabled: row.get::<i32, _>("reminder_enabled") == 1,
        reminder_days_before: row.get("reminder_days_before"),
        created_at: row.get("created_at"),
    })
}

#[tauri::command]
pub async fn update_competition(app: AppHandle, id: i64, competition: UpdateCompetition) -> Result<Competition, String> {
    let pool = get_pool(&app).await?;

    sqlx::query(
        r#"UPDATE competitions SET
            name = COALESCE(?, name),
            date = COALESCE(?, date),
            end_date = ?,
            location = ?,
            address = ?,
            level = ?,
            notes = ?,
            reminder_enabled = COALESCE(?, reminder_enabled),
            reminder_days_before = ?
        WHERE id = ?"#
    )
    .bind(&competition.name)
    .bind(&competition.date)
    .bind(&competition.end_date)
    .bind(&competition.location)
    .bind(&competition.address)
    .bind(&competition.level)
    .bind(&competition.notes)
    .bind(competition.reminder_enabled.map(|b| b as i32))
    .bind(competition.reminder_days_before)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let row = sqlx::query(
        r#"SELECT id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before, created_at
        FROM competitions WHERE id = ?"#
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Competition {
        id: row.get("id"),
        name: row.get("name"),
        date: row.get("date"),
        end_date: row.get("end_date"),
        location: row.get("location"),
        address: row.get("address"),
        level: row.get("level"),
        notes: row.get("notes"),
        reminder_enabled: row.get::<i32, _>("reminder_enabled") == 1,
        reminder_days_before: row.get("reminder_days_before"),
        created_at: row.get("created_at"),
    })
}

#[tauri::command]
pub async fn delete_competition(app: AppHandle, id: i64) -> Result<bool, String> {
    let pool = get_pool(&app).await?;

    let result = sqlx::query("DELETE FROM competitions WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}

#[tauri::command]
pub async fn get_competition_participants(app: AppHandle, competition_id: i64) -> Result<Vec<CompetitionParticipant>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        "SELECT id, competition_id, athlete_id, disciplines_planned FROM competition_participants WHERE competition_id = ?"
    )
    .bind(competition_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|row| {
        let disciplines_json: Option<String> = row.get("disciplines_planned");
        let disciplines_planned = disciplines_json
            .and_then(|json| serde_json::from_str(&json).ok());

        CompetitionParticipant {
            id: row.get("id"),
            competition_id: row.get("competition_id"),
            athlete_id: row.get("athlete_id"),
            disciplines_planned,
        }
    }).collect())
}

#[tauri::command]
pub async fn add_competition_participant(app: AppHandle, participant: CreateCompetitionParticipant) -> Result<CompetitionParticipant, String> {
    let pool = get_pool(&app).await?;

    let disciplines_json = match participant.disciplines_planned {
        Some(d) => Some(serde_json::to_string(&d).map_err(|e| format!("Failed to serialize disciplines: {}", e))?),
        None => None,
    };

    let result = sqlx::query(
        "INSERT OR REPLACE INTO competition_participants (competition_id, athlete_id, disciplines_planned) VALUES (?, ?, ?)"
    )
    .bind(participant.competition_id)
    .bind(participant.athlete_id)
    .bind(&disciplines_json)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let id = result.last_insert_rowid();

    let row = sqlx::query(
        "SELECT id, competition_id, athlete_id, disciplines_planned FROM competition_participants WHERE id = ?"
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let disciplines_json: Option<String> = row.get("disciplines_planned");
    let disciplines_planned = disciplines_json
        .and_then(|json| serde_json::from_str(&json).ok());

    Ok(CompetitionParticipant {
        id: row.get("id"),
        competition_id: row.get("competition_id"),
        athlete_id: row.get("athlete_id"),
        disciplines_planned,
    })
}

#[tauri::command]
pub async fn remove_competition_participant(app: AppHandle, competition_id: i64, athlete_id: i64) -> Result<bool, String> {
    let pool = get_pool(&app).await?;

    let result = sqlx::query(
        "DELETE FROM competition_participants WHERE competition_id = ? AND athlete_id = ?"
    )
    .bind(competition_id)
    .bind(athlete_id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}
