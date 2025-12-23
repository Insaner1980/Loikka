use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("File system error: {0}")]
    FileSystem(String),

    #[error("Image processing error: {0}")]
    ImageProcessing(String),

    #[error("Google Drive error: {0}")]
    GoogleDrive(String),

    #[error("Migration error: {0}")]
    Migration(String),
}

// Implement Serialize for Tauri command error handling
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("AppError", 2)?;

        let (error_type, message) = match self {
            AppError::Database(msg) => ("database", msg.as_str()),
            AppError::NotFound(msg) => ("not_found", msg.as_str()),
            AppError::Validation(msg) => ("validation", msg.as_str()),
            AppError::FileSystem(msg) => ("file_system", msg.as_str()),
            AppError::ImageProcessing(msg) => ("image_processing", msg.as_str()),
            AppError::GoogleDrive(msg) => ("google_drive", msg.as_str()),
            AppError::Migration(msg) => ("migration", msg.as_str()),
        };

        state.serialize_field("type", error_type)?;
        state.serialize_field("message", message)?;
        state.end()
    }
}

// Convenient conversion from sqlx errors
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::Database(err.to_string())
    }
}

// Convenient conversion from std::io errors
impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::FileSystem(err.to_string())
    }
}

// Convenient conversion from image errors
impl From<image::ImageError> for AppError {
    fn from(err: image::ImageError) -> Self {
        AppError::ImageProcessing(err.to_string())
    }
}

// Type alias for Result with AppError
pub type AppResult<T> = Result<T, AppError>;
