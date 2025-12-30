use serde::{Deserialize, Serialize};
use ts_rs::TS;

// Athlete types
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct Athlete {
    pub id: i64,
    pub first_name: String,
    pub last_name: String,
    pub birth_year: i32,
    pub gender: String, // "T" = Tytöt (girls), "P" = Pojat (boys)
    pub club_name: Option<String>,
    pub photo_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct CreateAthlete {
    pub first_name: String,
    pub last_name: String,
    pub birth_year: i32,
    pub gender: String,
    pub club_name: Option<String>,
    pub photo_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct UpdateAthlete {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub birth_year: Option<i32>,
    pub gender: Option<String>,
    pub club_name: Option<String>,
    pub photo_path: Option<String>,
}

// Discipline types
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct Discipline {
    pub id: i64,
    pub name: String,
    pub full_name: String,
    pub category: String,
    pub unit: String,
    pub lower_is_better: bool,
    pub icon_name: Option<String>,
}

// Result types
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct Result {
    pub id: i64,
    pub athlete_id: i64,
    pub discipline_id: i64,
    pub date: String,
    pub value: f64,
    #[serde(rename = "type")]
    pub result_type: String,
    pub competition_name: Option<String>,
    pub competition_level: Option<String>,
    pub custom_level_name: Option<String>,
    pub location: Option<String>,
    pub placement: Option<i32>,
    pub notes: Option<String>,
    pub is_personal_best: bool,
    pub is_season_best: bool,
    pub is_national_record: bool,
    pub wind: Option<f64>,
    pub status: Option<String>,
    pub equipment_weight: Option<f64>,
    pub hurdle_height: Option<i32>,
    pub hurdle_spacing: Option<f64>,
    pub sub_results: Option<String>, // JSON string for combined events (moniottelu) - legacy, will be removed
    pub combined_event_id: Option<i64>, // ID of parent combined event result (for sub-results)
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct CreateResult {
    pub athlete_id: i64,
    pub discipline_id: i64,
    pub date: String,
    pub value: f64,
    #[serde(rename = "type")]
    pub result_type: String,
    pub competition_name: Option<String>,
    pub competition_level: Option<String>,
    pub custom_level_name: Option<String>,
    pub location: Option<String>,
    pub placement: Option<i32>,
    pub notes: Option<String>,
    pub wind: Option<f64>,
    pub status: Option<String>,
    pub equipment_weight: Option<f64>,
    pub hurdle_height: Option<i32>,
    pub hurdle_spacing: Option<f64>,
    pub is_national_record: Option<bool>,
    pub sub_results: Option<String>, // JSON string for combined events (moniottelu) - legacy
    pub combined_event_id: Option<i64>, // ID of parent combined event result (for sub-results)
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct UpdateResult {
    pub athlete_id: Option<i64>,
    pub discipline_id: Option<i64>,
    pub date: Option<String>,
    pub value: Option<f64>,
    #[serde(rename = "type")]
    pub result_type: Option<String>,
    pub competition_name: Option<String>,
    pub competition_level: Option<String>,
    pub custom_level_name: Option<String>,
    pub location: Option<String>,
    pub placement: Option<i32>,
    pub notes: Option<String>,
    pub wind: Option<f64>,
    pub status: Option<String>,
    pub equipment_weight: Option<f64>,
    pub hurdle_height: Option<i32>,
    pub hurdle_spacing: Option<f64>,
    pub is_national_record: Option<bool>,
    pub sub_results: Option<String>, // JSON string for combined events (moniottelu) - legacy
    pub combined_event_id: Option<i64>, // ID of parent combined event result (for sub-results)
}

// Competition types
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct Competition {
    pub id: i64,
    pub name: String,
    pub date: String,
    pub end_date: Option<String>,
    pub location: Option<String>,
    pub address: Option<String>,
    pub level: Option<String>,
    pub custom_level_name: Option<String>,
    pub notes: Option<String>,
    pub reminder_enabled: bool,
    pub reminder_days_before: Option<i32>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct CreateCompetition {
    pub name: String,
    pub date: String,
    pub end_date: Option<String>,
    pub location: Option<String>,
    pub address: Option<String>,
    pub level: Option<String>,
    pub custom_level_name: Option<String>,
    pub notes: Option<String>,
    pub reminder_enabled: bool,
    pub reminder_days_before: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct UpdateCompetition {
    pub name: Option<String>,
    pub date: Option<String>,
    pub end_date: Option<String>,
    pub location: Option<String>,
    pub address: Option<String>,
    pub level: Option<String>,
    pub custom_level_name: Option<String>,
    pub notes: Option<String>,
    pub reminder_enabled: Option<bool>,
    pub reminder_days_before: Option<i32>,
}

// Competition participant types
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct CompetitionParticipant {
    pub id: i64,
    pub competition_id: i64,
    pub athlete_id: i64,
    pub disciplines_planned: Option<Vec<i64>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct CreateCompetitionParticipant {
    pub competition_id: i64,
    pub athlete_id: i64,
    pub disciplines_planned: Option<Vec<i64>>,
}

// Goal types
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: i64,
    pub athlete_id: i64,
    pub discipline_id: i64,
    pub target_value: f64,
    pub target_date: Option<String>,
    pub status: String,
    pub achieved_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct CreateGoal {
    pub athlete_id: i64,
    pub discipline_id: i64,
    pub target_value: f64,
    pub target_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct UpdateGoal {
    pub target_value: Option<f64>,
    pub target_date: Option<String>,
    pub status: Option<String>,
}

// Medal types
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct Medal {
    pub id: i64,
    pub athlete_id: i64,
    pub result_id: Option<i64>,
    #[serde(rename = "type")]
    pub medal_type: String,
    pub competition_name: String,
    pub competition_id: Option<i64>,
    pub location: Option<String>,
    pub discipline_id: Option<i64>,
    pub discipline_name: Option<String>,
    pub date: String,
    pub created_at: String,
}

// Athlete stats
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct AthleteStats {
    pub discipline_count: i32,
    pub result_count: i32,
    pub pb_count: i32,
    pub sb_count: i32,
    pub nr_count: i32,
    pub gold_medals: i32,
    pub silver_medals: i32,
    pub bronze_medals: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct AthleteWithStats {
    pub athlete: Athlete,
    pub stats: AthleteStats,
}

// Export data structure
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct ExportData {
    pub version: String,
    pub exported_at: String,
    pub athletes: Vec<Athlete>,
    pub results: Vec<Result>,
    pub competitions: Vec<Competition>,
    pub goals: Vec<Goal>,
    pub medals: Vec<Medal>,
}

// Google Drive sync types
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct AuthStatus {
    pub is_authenticated: bool,
    pub user_email: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    pub success: bool,
    pub message: String,
    pub synced_at: Option<String>,
    pub items_synced: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct CloudBackup {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub size_bytes: i64,
}

// Photo types
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct Photo {
    pub id: i64,
    pub entity_type: String,
    pub entity_id: i64,
    pub file_path: String,
    pub thumbnail_path: Option<String>,
    pub original_name: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub size_bytes: i64,
    pub event_name: Option<String>,
    pub created_at: String,
}

// Sync options types
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct SyncOptions {
    pub include_database: bool,
    pub include_profile_photos: bool,
    pub include_result_photos: bool,
    pub selected_photo_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct CloudPhoto {
    pub id: String,
    pub name: String,
    pub folder: String,
    pub size_bytes: i64,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
#[serde(rename_all = "camelCase")]
pub struct LocalPhoto {
    pub path: String,
    pub name: String,
    pub folder: String,
    pub size_bytes: i64,
}
