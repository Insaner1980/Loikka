// Modules
#[macro_use]
mod macros;
mod commands;
mod database;
mod db;
mod error;
mod google_drive;
mod types;

pub use error::{AppError, AppResult};

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
            commands::results::get_all_results,
            commands::results::get_results_by_athlete,
            commands::results::get_disciplines,
            commands::results::create_result,
            commands::results::update_result,
            commands::results::delete_result,
            commands::results::check_personal_best,
            commands::results::check_season_best,
            commands::results::get_athlete_medals,
            commands::results::create_medal,
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
            commands::list_cloud_photos,
            commands::list_local_photos,
            commands::sync_to_drive_with_options,
            commands::restore_from_drive_with_options,
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

#[cfg(test)]
mod tests {
    use ts_rs::TS;
    use crate::types::*;

    #[test]
    fn export_typescript_types() {
        // This test generates TypeScript type definitions from Rust types
        // Run with: cargo test export_typescript_types
        Athlete::export_all().expect("Failed to export Athlete");
        CreateAthlete::export_all().expect("Failed to export CreateAthlete");
        UpdateAthlete::export_all().expect("Failed to export UpdateAthlete");
        Discipline::export_all().expect("Failed to export Discipline");
        Result::export_all().expect("Failed to export Result");
        CreateResult::export_all().expect("Failed to export CreateResult");
        UpdateResult::export_all().expect("Failed to export UpdateResult");
        Competition::export_all().expect("Failed to export Competition");
        CreateCompetition::export_all().expect("Failed to export CreateCompetition");
        UpdateCompetition::export_all().expect("Failed to export UpdateCompetition");
        CompetitionParticipant::export_all().expect("Failed to export CompetitionParticipant");
        CreateCompetitionParticipant::export_all().expect("Failed to export CreateCompetitionParticipant");
        Goal::export_all().expect("Failed to export Goal");
        CreateGoal::export_all().expect("Failed to export CreateGoal");
        UpdateGoal::export_all().expect("Failed to export UpdateGoal");
        Medal::export_all().expect("Failed to export Medal");
        AthleteStats::export_all().expect("Failed to export AthleteStats");
        AthleteWithStats::export_all().expect("Failed to export AthleteWithStats");
        ExportData::export_all().expect("Failed to export ExportData");
        AuthStatus::export_all().expect("Failed to export AuthStatus");
        SyncResult::export_all().expect("Failed to export SyncResult");
        CloudBackup::export_all().expect("Failed to export CloudBackup");
        Photo::export_all().expect("Failed to export Photo");
        SyncOptions::export_all().expect("Failed to export SyncOptions");
        CloudPhoto::export_all().expect("Failed to export CloudPhoto");
        LocalPhoto::export_all().expect("Failed to export LocalPhoto");
    }
}
