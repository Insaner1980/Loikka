use crate::database::get_pool;
use crate::types::Medal;
use sqlx::Row;
use tauri::AppHandle;

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
