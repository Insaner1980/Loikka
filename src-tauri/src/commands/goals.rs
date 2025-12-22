use crate::database::get_pool;
use crate::types::{CreateGoal, Goal, UpdateGoal};
use sqlx::Row;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_all_goals(app: AppHandle) -> Result<Vec<Goal>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, target_value, target_date, status, achieved_at, created_at
        FROM goals ORDER BY created_at DESC"#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|row| Goal {
        id: row.get("id"),
        athlete_id: row.get("athlete_id"),
        discipline_id: row.get("discipline_id"),
        target_value: row.get("target_value"),
        target_date: row.get("target_date"),
        status: row.get("status"),
        achieved_at: row.get("achieved_at"),
        created_at: row.get("created_at"),
    }).collect())
}

#[tauri::command]
pub async fn get_goals_by_athlete(app: AppHandle, athlete_id: i64) -> Result<Vec<Goal>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, target_value, target_date, status, achieved_at, created_at
        FROM goals WHERE athlete_id = ? ORDER BY created_at DESC"#
    )
    .bind(athlete_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|row| Goal {
        id: row.get("id"),
        athlete_id: row.get("athlete_id"),
        discipline_id: row.get("discipline_id"),
        target_value: row.get("target_value"),
        target_date: row.get("target_date"),
        status: row.get("status"),
        achieved_at: row.get("achieved_at"),
        created_at: row.get("created_at"),
    }).collect())
}

#[tauri::command]
pub async fn get_active_goals(app: AppHandle) -> Result<Vec<Goal>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, target_value, target_date, status, achieved_at, created_at
        FROM goals WHERE status = 'active' ORDER BY target_date IS NULL, target_date ASC"#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|row| Goal {
        id: row.get("id"),
        athlete_id: row.get("athlete_id"),
        discipline_id: row.get("discipline_id"),
        target_value: row.get("target_value"),
        target_date: row.get("target_date"),
        status: row.get("status"),
        achieved_at: row.get("achieved_at"),
        created_at: row.get("created_at"),
    }).collect())
}

#[tauri::command]
pub async fn create_goal(app: AppHandle, goal: CreateGoal) -> Result<Goal, String> {
    let pool = get_pool(&app).await?;

    let result = sqlx::query(
        "INSERT INTO goals (athlete_id, discipline_id, target_value, target_date) VALUES (?, ?, ?, ?)"
    )
    .bind(goal.athlete_id)
    .bind(goal.discipline_id)
    .bind(goal.target_value)
    .bind(&goal.target_date)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let id = result.last_insert_rowid();

    let row = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, target_value, target_date, status, achieved_at, created_at
        FROM goals WHERE id = ?"#
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Goal {
        id: row.get("id"),
        athlete_id: row.get("athlete_id"),
        discipline_id: row.get("discipline_id"),
        target_value: row.get("target_value"),
        target_date: row.get("target_date"),
        status: row.get("status"),
        achieved_at: row.get("achieved_at"),
        created_at: row.get("created_at"),
    })
}

#[tauri::command]
pub async fn update_goal(app: AppHandle, id: i64, goal: UpdateGoal) -> Result<Goal, String> {
    let pool = get_pool(&app).await?;

    sqlx::query(
        r#"UPDATE goals SET
            target_value = COALESCE(?, target_value),
            target_date = ?,
            status = COALESCE(?, status)
        WHERE id = ?"#
    )
    .bind(goal.target_value)
    .bind(&goal.target_date)
    .bind(&goal.status)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let row = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, target_value, target_date, status, achieved_at, created_at
        FROM goals WHERE id = ?"#
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Goal {
        id: row.get("id"),
        athlete_id: row.get("athlete_id"),
        discipline_id: row.get("discipline_id"),
        target_value: row.get("target_value"),
        target_date: row.get("target_date"),
        status: row.get("status"),
        achieved_at: row.get("achieved_at"),
        created_at: row.get("created_at"),
    })
}

#[tauri::command]
pub async fn mark_goal_achieved(app: AppHandle, id: i64) -> Result<Goal, String> {
    let pool = get_pool(&app).await?;

    sqlx::query(
        "UPDATE goals SET status = 'achieved', achieved_at = datetime('now') WHERE id = ?"
    )
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let row = sqlx::query(
        r#"SELECT id, athlete_id, discipline_id, target_value, target_date, status, achieved_at, created_at
        FROM goals WHERE id = ?"#
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Goal {
        id: row.get("id"),
        athlete_id: row.get("athlete_id"),
        discipline_id: row.get("discipline_id"),
        target_value: row.get("target_value"),
        target_date: row.get("target_date"),
        status: row.get("status"),
        achieved_at: row.get("achieved_at"),
        created_at: row.get("created_at"),
    })
}

#[tauri::command]
pub async fn delete_goal(app: AppHandle, id: i64) -> Result<bool, String> {
    let pool = get_pool(&app).await?;

    let result = sqlx::query("DELETE FROM goals WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.rows_affected() > 0)
}
