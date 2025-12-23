use reqwest::multipart::{Form, Part};

use crate::google_drive::types::{DriveFile, DriveFileList};

pub const LOIKKA_FOLDER_NAME: &str = "Loikka Backups";

pub async fn get_or_create_loikka_folder(access_token: &str) -> Result<String, String> {
    let client = reqwest::Client::new();

    // Search for existing folder
    let query = format!("name='{}' and mimeType='application/vnd.google-apps.folder' and trashed=false", LOIKKA_FOLDER_NAME);
    let encoded_query = urlencoding::encode(&query);

    let response = client
        .get(format!(
            "https://www.googleapis.com/drive/v3/files?q={}&fields=files(id,name)",
            encoded_query
        ))
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to search for folder: {}", e))?;

    // Check for API errors
    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("Drive API error: {} - {}", status, response_text));
    }

    let file_list: DriveFileList = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse folder search: {} - Response: {}", e, response_text))?;

    if let Some(folder) = file_list.files.first() {
        return Ok(folder.id.clone());
    }

    // Create new folder
    let metadata = serde_json::json!({
        "name": LOIKKA_FOLDER_NAME,
        "mimeType": "application/vnd.google-apps.folder"
    });

    let response = client
        .post("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(access_token)
        .json(&metadata)
        .send()
        .await
        .map_err(|e| format!("Failed to create folder: {}", e))?;

    let folder: DriveFile = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse created folder: {}", e))?;

    Ok(folder.id)
}

pub async fn get_or_create_subfolder(access_token: &str, parent_id: &str, name: &str) -> Result<String, String> {
    let client = reqwest::Client::new();

    let query = format!("name='{}' and '{}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false", name, parent_id);
    let encoded_query = urlencoding::encode(&query);

    let response = client
        .get(format!(
            "https://www.googleapis.com/drive/v3/files?q={}&fields=files(id)",
            encoded_query
        ))
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to search for subfolder: {}", e))?;

    // Check for API errors
    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("Drive API error: {} - {}", status, response_text));
    }

    let file_list: DriveFileList = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse subfolder search: {} - Response: {}", e, response_text))?;

    if let Some(folder) = file_list.files.first() {
        return Ok(folder.id.clone());
    }

    // Create new subfolder
    let metadata = serde_json::json!({
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id]
    });

    let response = client
        .post("https://www.googleapis.com/drive/v3/files")
        .bearer_auth(access_token)
        .json(&metadata)
        .send()
        .await
        .map_err(|e| format!("Failed to create subfolder: {}", e))?;

    let folder: DriveFile = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse created subfolder: {}", e))?;

    Ok(folder.id)
}

pub async fn get_subfolder_id(access_token: &str, parent_id: &str, name: &str) -> Result<String, String> {
    let client = reqwest::Client::new();

    let query = format!("name='{}' and '{}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false", name, parent_id);
    let encoded_query = urlencoding::encode(&query);

    let response = client
        .get(format!(
            "https://www.googleapis.com/drive/v3/files?q={}&fields=files(id)",
            encoded_query
        ))
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to search for subfolder: {}", e))?;

    // Check for API errors
    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("Drive API error: {} - {}", status, response_text));
    }

    let file_list: DriveFileList = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse subfolder search: {} - Response: {}", e, response_text))?;

    file_list
        .files
        .first()
        .map(|f| f.id.clone())
        .ok_or_else(|| format!("Subfolder '{}' not found", name))
}

pub async fn upload_file_to_drive(
    access_token: &str,
    folder_id: &str,
    file_name: &str,
    content: Vec<u8>,
    mime_type: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    // Check if file already exists
    let query = format!("name='{}' and '{}' in parents and trashed=false", file_name, folder_id);
    let encoded_query = urlencoding::encode(&query);

    let response = client
        .get(format!(
            "https://www.googleapis.com/drive/v3/files?q={}&fields=files(id)",
            encoded_query
        ))
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to check existing file: {}", e))?;

    // Check for API errors
    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("Drive API error: {} - {}", status, response_text));
    }

    let file_list: DriveFileList = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse file list: {} - Response: {}", e, response_text))?;

    if let Some(existing_file) = file_list.files.first() {
        // Update existing file
        let url = format!(
            "https://www.googleapis.com/upload/drive/v3/files/{}?uploadType=media",
            existing_file.id
        );

        client
            .patch(&url)
            .bearer_auth(access_token)
            .header("Content-Type", mime_type)
            .body(content)
            .send()
            .await
            .map_err(|e| format!("Failed to update file: {}", e))?;

        return Ok(existing_file.id.clone());
    }

    // Create new file with multipart upload
    let metadata = serde_json::json!({
        "name": file_name,
        "parents": [folder_id]
    });

    let metadata_part = Part::text(metadata.to_string())
        .mime_str("application/json")
        .map_err(|e| format!("Failed to create metadata part: {}", e))?;

    let file_part = Part::bytes(content)
        .mime_str(mime_type)
        .map_err(|e| format!("Failed to create file part: {}", e))?;

    let form = Form::new()
        .part("metadata", metadata_part)
        .part("file", file_part);

    let response = client
        .post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
        .bearer_auth(access_token)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Failed to upload file: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Upload failed: {}", error_text));
    }

    let file: DriveFile = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse upload response: {}", e))?;

    Ok(file.id)
}

pub async fn list_backups(access_token: &str) -> Result<Vec<crate::types::CloudBackup>, String> {
    let folder_id = get_or_create_loikka_folder(access_token).await?;
    let client = reqwest::Client::new();

    let query = format!("'{}' in parents and name contains 'loikka_backup_' and trashed=false", folder_id);
    let encoded_query = urlencoding::encode(&query);

    let response = client
        .get(format!(
            "https://www.googleapis.com/drive/v3/files?q={}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc",
            encoded_query
        ))
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to list backups: {}", e))?;

    // Check for API errors
    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("Drive API error: {} - {}", status, response_text));
    }

    let file_list: DriveFileList = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse backup list: {} - Response: {}", e, response_text))?;

    let backups: Vec<crate::types::CloudBackup> = file_list
        .files
        .into_iter()
        .map(|f| crate::types::CloudBackup {
            id: f.id,
            name: f.name,
            created_at: f.created_time.unwrap_or_default(),
            size_bytes: f.size.and_then(|s| s.parse().ok()).unwrap_or(0),
        })
        .collect();

    Ok(backups)
}

pub async fn download_file(access_token: &str, file_id: &str) -> Result<Vec<u8>, String> {
    let client = reqwest::Client::new();

    let response = client
        .get(format!(
            "https://www.googleapis.com/drive/v3/files/{}?alt=media",
            file_id
        ))
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to download file: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read file content: {}", e))?;

    Ok(bytes.to_vec())
}

pub async fn delete_file(access_token: &str, file_id: &str) -> Result<(), String> {
    let client = reqwest::Client::new();

    let response = client
        .delete(format!(
            "https://www.googleapis.com/drive/v3/files/{}",
            file_id
        ))
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to delete file: {}", e))?;

    if !response.status().is_success() && response.status() != reqwest::StatusCode::NO_CONTENT {
        return Err(format!("Delete failed with status: {}", response.status()));
    }

    Ok(())
}
