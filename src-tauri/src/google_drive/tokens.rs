use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::google_drive::types::{GoogleCredentials, GoogleCredentialsFile, StoredTokens, TokenResponse};

pub fn get_app_data_dir() -> Result<PathBuf, String> {
    dirs::data_dir()
        .map(|p| p.join("com.loikka.app"))
        .ok_or_else(|| "Could not find app data directory".to_string())
}

pub fn get_tokens_path() -> Result<PathBuf, String> {
    Ok(get_app_data_dir()?.join("google_tokens.json"))
}

pub fn get_credentials() -> Result<GoogleCredentials, String> {
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

    for path in possible_paths.into_iter().flatten() {
        if path.exists() {
            let content = fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read credentials: {}", e))?;
            let creds: GoogleCredentialsFile = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse credentials: {}", e))?;
            return Ok(creds.installed);
        }
    }

    Err("google-credentials.json not found. Please place it in the app directory.".to_string())
}

pub fn load_tokens() -> Option<StoredTokens> {
    let path = get_tokens_path().ok()?;
    let content = fs::read_to_string(&path).ok()?;
    serde_json::from_str(&content).ok()
}

pub fn save_tokens(tokens: &StoredTokens) -> Result<(), String> {
    let path = get_tokens_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    let content = serde_json::to_string_pretty(tokens)
        .map_err(|e| format!("Failed to serialize tokens: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write tokens: {}", e))?;
    Ok(())
}

pub fn delete_tokens() -> Result<(), String> {
    let path = get_tokens_path()?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete tokens: {}", e))?;
    }
    Ok(())
}

pub fn current_timestamp() -> i64 {
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
