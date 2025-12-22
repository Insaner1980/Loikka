use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tiny_http::{Response, Server};

const OAUTH_SCOPES: &str = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";
const REDIRECT_PORT: u16 = 18089; // Use higher port to avoid conflicts
const LOIKKA_FOLDER_NAME: &str = "Loikka Backups";

// Google OAuth credentials from JSON file
#[derive(Debug, Deserialize)]
struct GoogleCredentialsFile {
    installed: GoogleCredentials,
}

#[derive(Debug, Deserialize)]
struct GoogleCredentials {
    client_id: String,
    client_secret: String,
}

// Token storage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
    pub user_email: Option<String>,
}

// Google API responses
#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: i64,
}

#[derive(Debug, Deserialize)]
struct UserInfoResponse {
    email: String,
}

#[derive(Debug, Deserialize)]
struct DriveFile {
    id: String,
    #[serde(default)]
    name: String,
    #[serde(rename = "createdTime")]
    created_time: Option<String>,
    size: Option<String>,
    #[serde(rename = "mimeType")]
    mime_type: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DriveFileList {
    files: Vec<DriveFile>,
}

// Global state for OAuth callback
lazy_static::lazy_static! {
    static ref OAUTH_STATE: Mutex<Option<String>> = Mutex::new(None);
}

fn get_app_data_dir() -> Result<PathBuf, String> {
    dirs::data_dir()
        .map(|p| p.join("com.loikka.app"))
        .ok_or_else(|| "Could not find app data directory".to_string())
}

fn get_tokens_path() -> Result<PathBuf, String> {
    Ok(get_app_data_dir()?.join("google_tokens.json"))
}

fn get_credentials() -> Result<GoogleCredentials, String> {
    // Try to find credentials.json in various locations
    let possible_paths = vec![
        // Next to executable (production - bundled resources on Windows)
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join("google-credentials.json"))),
        // Tauri resources folder (Windows NSIS/MSI installer)
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join("resources/google-credentials.json"))),
        // Current working directory
        std::env::current_dir()
            .ok()
            .map(|p| p.join("google-credentials.json")),
        // Project root (development - from src-tauri)
        std::env::current_dir()
            .ok()
            .map(|p| p.join("../google-credentials.json")),
        // Hardcoded development path
        Some(PathBuf::from("C:/dev/Loikka/google-credentials.json")),
    ];

    for path_opt in possible_paths {
        if let Some(path) = path_opt {
            if path.exists() {
                let content = fs::read_to_string(&path)
                    .map_err(|e| format!("Failed to read credentials: {}", e))?;
                let creds: GoogleCredentialsFile = serde_json::from_str(&content)
                    .map_err(|e| format!("Failed to parse credentials: {}", e))?;
                return Ok(creds.installed);
            }
        }
    }

    Err("google-credentials.json not found. Please place it in the app directory.".to_string())
}

pub fn load_tokens() -> Option<StoredTokens> {
    let path = get_tokens_path().ok()?;
    let content = fs::read_to_string(&path).ok()?;
    serde_json::from_str(&content).ok()
}

fn save_tokens(tokens: &StoredTokens) -> Result<(), String> {
    let path = get_tokens_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    let content = serde_json::to_string_pretty(tokens)
        .map_err(|e| format!("Failed to serialize tokens: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write tokens: {}", e))?;
    Ok(())
}

fn delete_tokens() -> Result<(), String> {
    let path = get_tokens_path()?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete tokens: {}", e))?;
    }
    Ok(())
}

fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub fn is_token_expired(tokens: &StoredTokens) -> bool {
    current_timestamp() >= tokens.expires_at - 60 // 60 second buffer
}

pub async fn refresh_access_token(tokens: &StoredTokens) -> Result<StoredTokens, String> {
    let creds = get_credentials()?;
    let client = reqwest::Client::new();

    let params = [
        ("client_id", creds.client_id.as_str()),
        ("client_secret", creds.client_secret.as_str()),
        ("refresh_token", tokens.refresh_token.as_str()),
        ("grant_type", "refresh"),
    ];

    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Failed to refresh token: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Token refresh failed: {}", error_text));
    }

    let token_response: TokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    let new_tokens = StoredTokens {
        access_token: token_response.access_token,
        refresh_token: tokens.refresh_token.clone(),
        expires_at: current_timestamp() + token_response.expires_in,
        user_email: tokens.user_email.clone(),
    };

    save_tokens(&new_tokens)?;
    Ok(new_tokens)
}

pub async fn get_valid_token() -> Result<String, String> {
    let mut tokens = load_tokens().ok_or("Not authenticated")?;

    if is_token_expired(&tokens) {
        tokens = refresh_access_token(&tokens).await?;
    }

    Ok(tokens.access_token)
}

pub fn generate_auth_url() -> Result<String, String> {
    let creds = get_credentials()?;

    // Generate a random state for CSRF protection
    let state = uuid::Uuid::new_v4().to_string();
    *OAUTH_STATE.lock().unwrap() = Some(state.clone());

    let redirect_uri = format!("http://localhost:{}", REDIRECT_PORT);
    let encoded_redirect = urlencoding::encode(&redirect_uri);
    let encoded_scope = urlencoding::encode(OAUTH_SCOPES);

    let url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent&state={}",
        creds.client_id,
        encoded_redirect,
        encoded_scope,
        state
    );

    Ok(url)
}

pub async fn wait_for_oauth_callback() -> Result<String, String> {
    let addr = format!("127.0.0.1:{}", REDIRECT_PORT);
    let server = Server::http(&addr).map_err(|e| format!("Failed to start OAuth server: {}", e))?;

    // Wait for the callback with a timeout
    let timeout = Duration::from_secs(300); // 5 minutes
    let request = server
        .recv_timeout(timeout)
        .map_err(|e| format!("Failed to receive OAuth callback: {}", e))?
        .ok_or("OAuth callback timed out")?;

    let url = request.url().to_string();

    // Parse the code and state from the URL
    let mut code: Option<String> = None;
    let mut state: Option<String> = None;

    if let Some(query_start) = url.find('?') {
        let query = &url[query_start + 1..];
        for param in query.split('&') {
            if let Some((key, value)) = param.split_once('=') {
                match key {
                    "code" => code = Some(urlencoding::decode(value).unwrap_or_default().to_string()),
                    "state" => state = Some(value.to_string()),
                    _ => {}
                }
            }
        }
    }

    // Send a response to the browser
    let html = r#"
        <!DOCTYPE html>
        <html>
        <head>
            <title>Loikka - Kirjautuminen onnistui</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                       display: flex; justify-content: center; align-items: center; height: 100vh;
                       margin: 0; background: #0A0A0A; color: #E8E8E8; }
                .container { text-align: center; }
                h1 { color: #60A5FA; }
                p { color: #888888; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Kirjautuminen onnistui!</h1>
                <p>Voit sulkea tämän ikkunan ja palata Loikka-sovellukseen.</p>
            </div>
        </body>
        </html>
    "#;

    let response = Response::from_string(html).with_header(
        tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap(),
    );
    let _ = request.respond(response);

    // Verify state
    let expected_state = OAUTH_STATE.lock().unwrap().take();
    if state != expected_state {
        return Err("Invalid OAuth state - possible CSRF attack".to_string());
    }

    code.ok_or_else(|| "No authorization code received".to_string())
}

pub async fn exchange_code_for_tokens(code: &str) -> Result<StoredTokens, String> {
    let creds = get_credentials()?;
    let client = reqwest::Client::new();

    let redirect_uri = format!("http://localhost:{}", REDIRECT_PORT);

    let params = [
        ("client_id", creds.client_id.as_str()),
        ("client_secret", creds.client_secret.as_str()),
        ("code", code),
        ("redirect_uri", redirect_uri.as_str()),
        ("grant_type", "authorization_code"),
    ];

    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Failed to exchange code: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Token exchange failed: {}", error_text));
    }

    let token_response: TokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    let refresh_token = token_response
        .refresh_token
        .ok_or("No refresh token received")?;

    // Get user email
    let user_email = get_user_email(&token_response.access_token).await.ok();

    let tokens = StoredTokens {
        access_token: token_response.access_token,
        refresh_token,
        expires_at: current_timestamp() + token_response.expires_in,
        user_email,
    };

    save_tokens(&tokens)?;
    Ok(tokens)
}

async fn get_user_email(access_token: &str) -> Result<String, String> {
    let client = reqwest::Client::new();

    let response = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to get user info: {}", e))?;

    let user_info: UserInfoResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse user info: {}", e))?;

    Ok(user_info.email)
}

pub fn disconnect() -> Result<(), String> {
    delete_tokens()
}

// Drive API functions

async fn get_or_create_loikka_folder(access_token: &str) -> Result<String, String> {
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
                            let mime_type = match path.extension().and_then(|e| e.to_str()) {
                                Some("jpg") | Some("jpeg") => "image/jpeg",
                                Some("png") => "image/png",
                                Some("gif") => "image/gif",
                                Some("webp") => "image/webp",
                                _ => "application/octet-stream",
                            };

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

async fn get_or_create_subfolder(access_token: &str, parent_id: &str, name: &str) -> Result<String, String> {
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

pub async fn restore_from_drive(access_token: &str, backup_id: Option<String>) -> Result<i32, String> {
    let folder_id = get_or_create_loikka_folder(access_token).await?;
    let app_data_dir = get_app_data_dir()?;

    // Get the backup file ID
    let file_id = if let Some(id) = backup_id {
        id
    } else {
        // Get the latest backup
        let backups = list_backups(access_token).await?;
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

async fn get_subfolder_id(access_token: &str, parent_id: &str, name: &str) -> Result<String, String> {
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

// New functions for selective sync

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
                    let mime_type = match path.extension().and_then(|e| e.to_str()) {
                        Some("jpg") | Some("jpeg") => "image/jpeg",
                        Some("png") => "image/png",
                        Some("gif") => "image/gif",
                        Some("webp") => "image/webp",
                        _ => "application/octet-stream",
                    };

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
                            let mime_type = match path.extension().and_then(|e| e.to_str()) {
                                Some("jpg") | Some("jpeg") => "image/jpeg",
                                Some("png") => "image/png",
                                Some("gif") => "image/gif",
                                Some("webp") => "image/webp",
                                _ => "application/octet-stream",
                            };

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
            let backups = list_backups(access_token).await?;
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
