use serde::{Deserialize, Serialize};

// Google OAuth credentials from JSON file
#[derive(Debug, Deserialize)]
pub struct GoogleCredentialsFile {
    pub installed: GoogleCredentials,
}

#[derive(Debug, Deserialize)]
pub struct GoogleCredentials {
    pub client_id: String,
    pub client_secret: String,
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
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: i64,
}

#[derive(Debug, Deserialize)]
pub struct UserInfoResponse {
    pub email: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct DriveFile {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(rename = "createdTime")]
    pub created_time: Option<String>,
    pub size: Option<String>,
    #[serde(rename = "mimeType")]
    pub mime_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DriveFileList {
    pub files: Vec<DriveFile>,
}
