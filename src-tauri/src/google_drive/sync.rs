use serde::Deserialize;
use std::fs;

use crate::google_drive::api::{
    download_file, get_or_create_loikka_folder, get_or_create_subfolder, get_subfolder_id,
    upload_file_to_drive,
};
use crate::google_drive::tokens::get_app_data_dir;
use crate::google_drive::types::DriveFileList;

pub async fn sync_database_to_drive(access_token: &str) -> Result<i32, String> {
    let folder_id = get_or_create_loikka_folder(access_token).await?;
    let app_data_dir = get_app_data_dir()?;

    let db_path = app_data_dir.join("loikka.db");
    if !db_path.exists() {
        return Err("Database not found".to_string());
    }

    // Create backup with timestamp
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let backup_name = format!("loikka_backup_{}.db", timestamp);

    let db_content = fs::read(&db_path).map_err(|e| format!("Failed to read database: {}", e))?;

    upload_file_to_drive(
        access_token,
        &folder_id,
        &backup_name,
        db_content,
        "application/x-sqlite3",
    )
    .await?;

    // Also upload photos
    let photos_dir = app_data_dir.join("photos");
    let profile_photos_dir = app_data_dir.join("profile_photos");

    let mut photos_synced = 0;

    for dir in [photos_dir, profile_photos_dir] {
        if dir.exists() {
            let subfolder_name = dir.file_name().unwrap().to_string_lossy().to_string();
            let photos_folder_id = get_or_create_subfolder(access_token, &folder_id, &subfolder_name).await?;

            if let Ok(entries) = fs::read_dir(&dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        if let Some(file_name) = path.file_name() {
                            let content = fs::read(&path).map_err(|e| format!("Failed to read photo: {}", e))?;
                            let mime_type = get_mime_type(&path);

                            upload_file_to_drive(
                                access_token,
                                &photos_folder_id,
                                &file_name.to_string_lossy(),
                                content,
                                mime_type,
                            )
                            .await?;
                            photos_synced += 1;
                        }
                    }
                }
            }
        }
    }

    Ok(photos_synced + 1) // +1 for database
}

pub async fn restore_from_drive(access_token: &str, backup_id: Option<String>) -> Result<i32, String> {
    let folder_id = get_or_create_loikka_folder(access_token).await?;
    let app_data_dir = get_app_data_dir()?;

    // Get the backup file ID
    let file_id = if let Some(id) = backup_id {
        id
    } else {
        // Get the latest backup
        let backups = crate::google_drive::api::list_backups(access_token).await?;
        backups
            .first()
            .ok_or("No backups found")?
            .id
            .clone()
    };

    // Download and restore database
    let db_content = download_file(access_token, &file_id).await?;
    let db_path = app_data_dir.join("loikka.db");

    // Create backup of current database
    if db_path.exists() {
        let backup_path = app_data_dir.join("loikka.db.backup");
        fs::copy(&db_path, &backup_path).map_err(|e| format!("Failed to backup current database: {}", e))?;
    }

    fs::write(&db_path, db_content).map_err(|e| format!("Failed to write database: {}", e))?;

    // Restore photos
    let mut photos_restored = 0;

    for subfolder_name in ["photos", "profile_photos"] {
        let photos_folder_id = match get_subfolder_id(access_token, &folder_id, subfolder_name).await {
            Ok(id) => id,
            Err(_) => continue, // Folder doesn't exist, skip
        };

        let local_dir = app_data_dir.join(subfolder_name);
        fs::create_dir_all(&local_dir).map_err(|e| format!("Failed to create photos dir: {}", e))?;

        // List files in the photos folder
        let client = reqwest::Client::new();
        let query = format!("'{}' in parents and trashed=false", photos_folder_id);
        let encoded_query = urlencoding::encode(&query);

        let response = client
            .get(format!(
                "https://www.googleapis.com/drive/v3/files?q={}&fields=files(id,name)",
                encoded_query
            ))
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| format!("Failed to list photos: {}", e))?;

        // Check for API errors
        let status = response.status();
        let response_text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

        if !status.is_success() {
            return Err(format!("Drive API error: {} - {}", status, response_text));
        }

        let file_list: DriveFileList = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse photos list: {} - Response: {}", e, response_text))?;

        for file in file_list.files {
            let content = download_file(access_token, &file.id).await?;
            let file_path = local_dir.join(&file.name);
            fs::write(&file_path, content).map_err(|e| format!("Failed to write photo: {}", e))?;
            photos_restored += 1;
        }
    }

    Ok(photos_restored + 1) // +1 for database
}

pub async fn list_cloud_photos(access_token: &str) -> Result<Vec<crate::types::CloudPhoto>, String> {
    let folder_id = get_or_create_loikka_folder(access_token).await?;
    let mut all_photos = Vec::new();

    for subfolder_name in ["photos", "profile_photos"] {
        let photos_folder_id = match get_subfolder_id(access_token, &folder_id, subfolder_name).await {
            Ok(id) => id,
            Err(_) => continue,
        };

        let client = reqwest::Client::new();
        let query = format!("'{}' in parents and trashed=false", photos_folder_id);
        let encoded_query = urlencoding::encode(&query);

        let response = client
            .get(format!(
                "https://www.googleapis.com/drive/v3/files?q={}&fields=files(id,name,size,createdTime)",
                encoded_query
            ))
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| format!("Failed to list cloud photos: {}", e))?;

        let status = response.status();
        let response_text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

        if !status.is_success() {
            return Err(format!("Drive API error: {} - {}", status, response_text));
        }

        let file_list: DriveFileList = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse cloud photos: {} - Response: {}", e, response_text))?;

        for file in file_list.files {
            all_photos.push(crate::types::CloudPhoto {
                id: file.id,
                name: file.name,
                folder: subfolder_name.to_string(),
                size_bytes: file.size.and_then(|s| s.parse().ok()).unwrap_or(0),
                created_at: file.created_time,
            });
        }
    }

    Ok(all_photos)
}

pub fn list_local_photos() -> Result<Vec<crate::types::LocalPhoto>, String> {
    let app_data_dir = get_app_data_dir()?;
    let mut all_photos = Vec::new();

    for subfolder_name in ["photos", "profile_photos"] {
        let dir = app_data_dir.join(subfolder_name);
        if !dir.exists() {
            continue;
        }

        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Some(file_name) = path.file_name() {
                        let metadata = fs::metadata(&path).ok();
                        let size_bytes = metadata.map(|m| m.len() as i64).unwrap_or(0);

                        all_photos.push(crate::types::LocalPhoto {
                            path: path.to_string_lossy().to_string(),
                            name: file_name.to_string_lossy().to_string(),
                            folder: subfolder_name.to_string(),
                            size_bytes,
                        });
                    }
                }
            }
        }
    }

    Ok(all_photos)
}

pub async fn sync_with_options(
    access_token: &str,
    options: &crate::types::SyncOptions,
) -> Result<i32, String> {
    let folder_id = get_or_create_loikka_folder(access_token).await?;
    let app_data_dir = get_app_data_dir()?;
    let mut items_synced = 0;

    // Sync database if selected
    if options.include_database {
        let db_path = app_data_dir.join("loikka.db");
        if db_path.exists() {
            let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
            let backup_name = format!("loikka_backup_{}.db", timestamp);
            let db_content = fs::read(&db_path).map_err(|e| format!("Failed to read database: {}", e))?;

            upload_file_to_drive(
                access_token,
                &folder_id,
                &backup_name,
                db_content,
                "application/x-sqlite3",
            )
            .await?;
            items_synced += 1;
        }
    }

    // Sync photos based on options
    let folders_to_sync: Vec<&str> = {
        let mut folders = Vec::new();
        if options.include_profile_photos {
            folders.push("profile_photos");
        }
        if options.include_result_photos {
            folders.push("photos");
        }
        folders
    };

    // If specific photos are selected, only sync those
    if let Some(ref selected_ids) = options.selected_photo_ids {
        for photo_path in selected_ids {
            let path = std::path::Path::new(photo_path);
            if path.exists() && path.is_file() {
                // Determine folder from path
                let folder_name = path
                    .parent()
                    .and_then(|p| p.file_name())
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "photos".to_string());

                if let Some(file_name) = path.file_name() {
                    let photos_folder_id = get_or_create_subfolder(access_token, &folder_id, &folder_name).await?;
                    let content = fs::read(path).map_err(|e| format!("Failed to read photo: {}", e))?;
                    let mime_type = get_mime_type(path);

                    upload_file_to_drive(
                        access_token,
                        &photos_folder_id,
                        &file_name.to_string_lossy(),
                        content,
                        mime_type,
                    )
                    .await?;
                    items_synced += 1;
                }
            }
        }
    } else {
        // Sync all photos in selected folders
        for subfolder_name in folders_to_sync {
            let dir = app_data_dir.join(subfolder_name);
            if !dir.exists() {
                continue;
            }

            let photos_folder_id = get_or_create_subfolder(access_token, &folder_id, subfolder_name).await?;

            if let Ok(entries) = fs::read_dir(&dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        if let Some(file_name) = path.file_name() {
                            let content = fs::read(&path).map_err(|e| format!("Failed to read photo: {}", e))?;
                            let mime_type = get_mime_type(&path);

                            upload_file_to_drive(
                                access_token,
                                &photos_folder_id,
                                &file_name.to_string_lossy(),
                                content,
                                mime_type,
                            )
                            .await?;
                            items_synced += 1;
                        }
                    }
                }
            }
        }
    }

    Ok(items_synced)
}

pub async fn restore_with_options(
    access_token: &str,
    backup_id: Option<String>,
    options: &crate::types::SyncOptions,
) -> Result<i32, String> {
    let folder_id = get_or_create_loikka_folder(access_token).await?;
    let app_data_dir = get_app_data_dir()?;
    let mut items_restored = 0;

    // Restore database if selected
    if options.include_database {
        let file_id = if let Some(ref id) = backup_id {
            id.clone()
        } else {
            let backups = crate::google_drive::api::list_backups(access_token).await?;
            backups
                .first()
                .ok_or("No backups found")?
                .id
                .clone()
        };

        let db_content = download_file(access_token, &file_id).await?;
        let db_path = app_data_dir.join("loikka.db");

        if db_path.exists() {
            let backup_path = app_data_dir.join("loikka.db.backup");
            fs::copy(&db_path, &backup_path).map_err(|e| format!("Failed to backup current database: {}", e))?;
        }

        fs::write(&db_path, db_content).map_err(|e| format!("Failed to write database: {}", e))?;
        items_restored += 1;
    }

    // Restore photos based on options
    let folders_to_restore: Vec<&str> = {
        let mut folders = Vec::new();
        if options.include_profile_photos {
            folders.push("profile_photos");
        }
        if options.include_result_photos {
            folders.push("photos");
        }
        folders
    };

    // If specific photos are selected, only restore those
    if let Some(ref selected_ids) = options.selected_photo_ids {
        for photo_id in selected_ids {
            let content = download_file(access_token, photo_id).await?;

            // Get file metadata to determine folder and name
            let client = reqwest::Client::new();
            let response = client
                .get(format!(
                    "https://www.googleapis.com/drive/v3/files/{}?fields=id,name",
                    photo_id
                ))
                .bearer_auth(access_token)
                .send()
                .await
                .map_err(|e| format!("Failed to get file info: {}", e))?;

            #[derive(Deserialize)]
            struct FileInfo {
                #[serde(default)]
                name: String,
            }

            let file_info: FileInfo = response
                .json()
                .await
                .map_err(|e| format!("Failed to parse file info: {}", e))?;

            // Determine folder from parent - default to photos
            let folder_name = "photos";
            let local_dir = app_data_dir.join(folder_name);
            fs::create_dir_all(&local_dir).map_err(|e| format!("Failed to create photos dir: {}", e))?;

            let file_path = local_dir.join(&file_info.name);
            fs::write(&file_path, content).map_err(|e| format!("Failed to write photo: {}", e))?;
            items_restored += 1;
        }
    } else {
        // Restore all photos from selected folders
        for subfolder_name in folders_to_restore {
            let photos_folder_id = match get_subfolder_id(access_token, &folder_id, subfolder_name).await {
                Ok(id) => id,
                Err(_) => continue,
            };

            let local_dir = app_data_dir.join(subfolder_name);
            fs::create_dir_all(&local_dir).map_err(|e| format!("Failed to create photos dir: {}", e))?;

            let client = reqwest::Client::new();
            let query = format!("'{}' in parents and trashed=false", photos_folder_id);
            let encoded_query = urlencoding::encode(&query);

            let response = client
                .get(format!(
                    "https://www.googleapis.com/drive/v3/files?q={}&fields=files(id,name)",
                    encoded_query
                ))
                .bearer_auth(access_token)
                .send()
                .await
                .map_err(|e| format!("Failed to list photos: {}", e))?;

            let status = response.status();
            let response_text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

            if !status.is_success() {
                return Err(format!("Drive API error: {} - {}", status, response_text));
            }

            let file_list: DriveFileList = serde_json::from_str(&response_text)
                .map_err(|e| format!("Failed to parse photos list: {} - Response: {}", e, response_text))?;

            for file in file_list.files {
                let content = download_file(access_token, &file.id).await?;
                let file_path = local_dir.join(&file.name);
                fs::write(&file_path, content).map_err(|e| format!("Failed to write photo: {}", e))?;
                items_restored += 1;
            }
        }
    }

    Ok(items_restored)
}

fn get_mime_type(path: &std::path::Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        _ => "application/octet-stream",
    }
}
