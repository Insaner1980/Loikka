// Modules
mod commands;
mod database;
mod db;
mod types;

use database::{init_database, AppDatabase};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init());

    // MCP Bridge plugin - only in debug builds
    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    }

    builder
        .manage(AppDatabase::new())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match init_database(&handle).await {
                    Ok(pool) => {
                        let state = handle.state::<AppDatabase>();
                        *state.0.lock().await = Some(pool);
                        println!("Database initialized successfully");
                    }
                    Err(e) => {
                        eprintln!("Failed to initialize database: {}", e);
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Athletes
            commands::get_all_athletes,
            commands::get_athlete,
            commands::create_athlete,
            commands::update_athlete,
            commands::delete_athlete,
            // Results
            commands::get_all_results,
            commands::get_results_by_athlete,
            commands::get_disciplines,
            commands::create_result,
            commands::update_result,
            commands::delete_result,
            commands::check_personal_best,
            commands::check_season_best,
            commands::get_athlete_medals,
            // Competitions
            commands::get_all_competitions,
            commands::get_upcoming_competitions,
            commands::get_competition,
            commands::create_competition,
            commands::update_competition,
            commands::delete_competition,
            commands::get_competition_participants,
            commands::add_competition_participant,
            commands::remove_competition_participant,
            // Goals
            commands::get_all_goals,
            commands::get_goals_by_athlete,
            commands::get_active_goals,
            commands::create_goal,
            commands::update_goal,
            commands::mark_goal_achieved,
            commands::delete_goal,
            // Sync
            commands::export_data,
            commands::import_data,
            // Google Drive
            commands::check_auth_status,
            commands::start_auth_flow,
            commands::complete_auth,
            commands::disconnect_drive,
            commands::sync_to_drive,
            commands::sync_from_drive,
            commands::get_cloud_backups,
            commands::delete_cloud_backup,
            // Photos
            commands::save_photo,
            commands::get_photos,
            commands::get_photo_count,
            commands::delete_photo,
            commands::get_photo_url,
            commands::get_all_photos,
            commands::get_photo_years,
            commands::save_athlete_profile_photo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
