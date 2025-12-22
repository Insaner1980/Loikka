use crate::google_drive;
use crate::types::{AuthStatus, CloudBackup, CloudPhoto, LocalPhoto, SyncOptions, SyncResult};
use tauri::async_runtime;

/// Check the current Google Drive authentication status
#[tauri::command]
pub async fn check_auth_status() -> Result<AuthStatus, String> {
    match google_drive::load_tokens() {
        Some(tokens) => {
            // Check if token is expired and try to refresh
            if google_drive::is_token_expired(&tokens) {
                match google_drive::refresh_access_token(&tokens).await {
                    Ok(new_tokens) => Ok(AuthStatus {
                        is_authenticated: true,
                        user_email: new_tokens.user_email,
                        expires_at: Some(
                            chrono::DateTime::from_timestamp(new_tokens.expires_at, 0)
                                .map(|dt| dt.to_rfc3339())
                                .unwrap_or_default(),
                        ),
                    }),
                    Err(_) => {
                        // Token refresh failed, user needs to re-authenticate
                        Ok(AuthStatus {
                            is_authenticated: false,
                            user_email: None,
                            expires_at: None,
                        })
                    }
                }
            } else {
                Ok(AuthStatus {
                    is_authenticated: true,
                    user_email: tokens.user_email,
                    expires_at: Some(
                        chrono::DateTime::from_timestamp(tokens.expires_at, 0)
                            .map(|dt| dt.to_rfc3339())
                            .unwrap_or_default(),
                    ),
                })
            }
        }
        None => Ok(AuthStatus {
            is_authenticated: false,
            user_email: None,
            expires_at: None,
        }),
    }
}

/// Start the OAuth2 authentication flow
/// Returns the authorization URL to open in browser
#[tauri::command]
pub async fn start_auth_flow() -> Result<String, String> {
    let auth_url = google_drive::generate_auth_url()?;

    // Start a background task to wait for the callback
    async_runtime::spawn(async {
        match google_drive::wait_for_oauth_callback().await {
            Ok(code) => {
                if let Err(e) = google_drive::exchange_code_for_tokens(&code).await {
                    eprintln!("Failed to exchange code for tokens: {}", e);
                }
            }
            Err(e) => {
                eprintln!("OAuth callback failed: {}", e);
            }
        }
    });

    Ok(auth_url)
}

/// Complete the OAuth2 flow with the authorization code
/// This is called manually if automatic callback doesn't work
#[tauri::command]
pub async fn complete_auth(code: String) -> Result<bool, String> {
    match google_drive::exchange_code_for_tokens(&code).await {
        Ok(_) => Ok(true),
        Err(e) => Err(e),
    }
}

/// Disconnect from Google Drive (revoke tokens)
#[tauri::command]
pub async fn disconnect_drive() -> Result<bool, String> {
    google_drive::disconnect()?;
    Ok(true)
}

/// Sync local data to Google Drive
#[tauri::command]
pub async fn sync_to_drive() -> Result<SyncResult, String> {
    let access_token = google_drive::get_valid_token().await?;

    match google_drive::sync_database_to_drive(&access_token).await {
        Ok(items_synced) => Ok(SyncResult {
            success: true,
            message: format!("Synkronoitu {} kohdetta", items_synced),
            synced_at: Some(chrono::Utc::now().to_rfc3339()),
            items_synced: Some(items_synced),
        }),
        Err(e) => Ok(SyncResult {
            success: false,
            message: format!("Synkronointi epäonnistui: {}", e),
            synced_at: None,
            items_synced: None,
        }),
    }
}

/// Sync data from Google Drive to local
#[tauri::command]
pub async fn sync_from_drive(backup_id: Option<String>) -> Result<SyncResult, String> {
    let access_token = google_drive::get_valid_token().await?;

    match google_drive::restore_from_drive(&access_token, backup_id).await {
        Ok(items_restored) => Ok(SyncResult {
            success: true,
            message: format!("Palautettu {} kohdetta", items_restored),
            synced_at: Some(chrono::Utc::now().to_rfc3339()),
            items_synced: Some(items_restored),
        }),
        Err(e) => Ok(SyncResult {
            success: false,
            message: format!("Palautus epäonnistui: {}", e),
            synced_at: None,
            items_synced: None,
        }),
    }
}

/// Get list of available backups from Google Drive
#[tauri::command]
pub async fn get_cloud_backups() -> Result<Vec<CloudBackup>, String> {
    let access_token = google_drive::get_valid_token().await?;
    google_drive::list_backups(&access_token).await
}

/// Delete a backup from Google Drive
#[tauri::command]
pub async fn delete_cloud_backup(backup_id: String) -> Result<bool, String> {
    let access_token = google_drive::get_valid_token().await?;
    google_drive::delete_file(&access_token, &backup_id).await?;
    Ok(true)
}

/// List all photos stored in Google Drive
#[tauri::command]
pub async fn list_cloud_photos() -> Result<Vec<CloudPhoto>, String> {
    let access_token = google_drive::get_valid_token().await?;
    google_drive::list_cloud_photos(&access_token).await
}

/// List all local photos
#[tauri::command]
pub fn list_local_photos() -> Result<Vec<LocalPhoto>, String> {
    google_drive::list_local_photos()
}

/// Sync to drive with options (selective sync)
#[tauri::command]
pub async fn sync_to_drive_with_options(options: SyncOptions) -> Result<SyncResult, String> {
    let access_token = google_drive::get_valid_token().await?;

    match google_drive::sync_with_options(&access_token, &options).await {
        Ok(items_synced) => Ok(SyncResult {
            success: true,
            message: format!("Synkronoitu {} kohdetta", items_synced),
            synced_at: Some(chrono::Utc::now().to_rfc3339()),
            items_synced: Some(items_synced),
        }),
        Err(e) => Ok(SyncResult {
            success: false,
            message: format!("Synkronointi epäonnistui: {}", e),
            synced_at: None,
            items_synced: None,
        }),
    }
}

/// Restore from drive with options (selective restore)
#[tauri::command]
pub async fn restore_from_drive_with_options(
    backup_id: Option<String>,
    options: SyncOptions,
) -> Result<SyncResult, String> {
    let access_token = google_drive::get_valid_token().await?;

    match google_drive::restore_with_options(&access_token, backup_id, &options).await {
        Ok(items_restored) => Ok(SyncResult {
            success: true,
            message: format!("Palautettu {} kohdetta", items_restored),
            synced_at: Some(chrono::Utc::now().to_rfc3339()),
            items_synced: Some(items_restored),
        }),
        Err(e) => Ok(SyncResult {
            success: false,
            message: format!("Palautus epäonnistui: {}", e),
            synced_at: None,
            items_synced: None,
        }),
    }
}
