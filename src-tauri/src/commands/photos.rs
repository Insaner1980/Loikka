use crate::database::get_pool;
use crate::types::Photo;
use image::imageops::FilterType;
use image::GenericImageView;
use sqlx::Row;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

const THUMBNAIL_SIZE: u32 = 300;

/// Get the photos directory for a specific entity type and ID
fn get_photos_dir(app: &AppHandle, entity_type: &str, entity_id: i64) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let photos_dir = app_data
        .join("photos")
        .join(entity_type)
        .join(entity_id.to_string());

    // Create directories if they don't exist
    fs::create_dir_all(&photos_dir).map_err(|e| e.to_string())?;

    Ok(photos_dir)
}

/// Get the thumbnails directory
fn get_thumbnails_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let thumbnails_dir = app_data.join("photos").join("thumbnails");
    fs::create_dir_all(&thumbnails_dir).map_err(|e| e.to_string())?;

    Ok(thumbnails_dir)
}

/// Generate a thumbnail for an image
fn generate_thumbnail(source_path: &PathBuf, thumbnail_path: &PathBuf) -> Result<(), String> {
    let img = image::open(source_path).map_err(|e| format!("Failed to open image: {}", e))?;

    let thumbnail = img.resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, FilterType::Lanczos3);

    thumbnail
        .save(thumbnail_path)
        .map_err(|e| format!("Failed to save thumbnail: {}", e))?;

    Ok(())
}

/// Save a photo from a source path
#[tauri::command]
pub async fn save_photo(
    app: AppHandle,
    source_path: String,
    entity_type: String,
    entity_id: i64,
    event_name: Option<String>,
) -> Result<Photo, String> {
    let pool = get_pool(&app).await?;

    // Validate entity type
    if !["athletes", "results", "competitions"].contains(&entity_type.as_str()) {
        return Err("Invalid entity type".to_string());
    }

    // Get the source file info
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err("Source file does not exist".to_string());
    }

    let original_name = source
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("photo")
        .to_string();

    let extension = source
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg")
        .to_lowercase();

    // Validate file type
    if !["jpg", "jpeg", "png", "gif", "webp"].contains(&extension.as_str()) {
        return Err("Unsupported image format".to_string());
    }

    // Generate unique filename
    let unique_id = Uuid::new_v4();
    let new_filename = format!("{}.{}", unique_id, extension);
    let thumbnail_filename = format!("{}_thumb.{}", unique_id, extension);

    // Get destination paths
    let photos_dir = get_photos_dir(&app, &entity_type, entity_id)?;
    let thumbnails_dir = get_thumbnails_dir(&app)?;

    let dest_path = photos_dir.join(&new_filename);
    let thumbnail_path = thumbnails_dir.join(&thumbnail_filename);

    // Copy file to photos directory
    fs::copy(&source, &dest_path).map_err(|e| format!("Failed to copy file: {}", e))?;

    // Get file size
    let metadata = fs::metadata(&dest_path).map_err(|e| e.to_string())?;
    let size_bytes = metadata.len() as i64;

    // Get image dimensions
    let (width, height) = match image::open(&dest_path) {
        Ok(img) => {
            let dims = img.dimensions();
            (Some(dims.0 as i32), Some(dims.1 as i32))
        }
        Err(_) => (None, None),
    };

    // Generate thumbnail
    let thumbnail_path_str = match generate_thumbnail(&dest_path, &thumbnail_path) {
        Ok(_) => Some(thumbnail_path.to_string_lossy().to_string()),
        Err(e) => {
            eprintln!("Failed to generate thumbnail: {}", e);
            None
        }
    };

    let dest_path_str = dest_path.to_string_lossy().to_string();

    // Save to database
    let result = sqlx::query(
        r#"INSERT INTO photos (entity_type, entity_id, file_path, thumbnail_path, original_name, width, height, size_bytes, event_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"#
    )
    .bind(&entity_type)
    .bind(entity_id)
    .bind(&dest_path_str)
    .bind(&thumbnail_path_str)
    .bind(&original_name)
    .bind(width)
    .bind(height)
    .bind(size_bytes)
    .bind(&event_name)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let id = result.last_insert_rowid();

    // Fetch the created photo
    let row = sqlx::query(
        r#"SELECT id, entity_type, entity_id, file_path, thumbnail_path, original_name, width, height, size_bytes, event_name, created_at
           FROM photos WHERE id = ?"#
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(Photo {
        id: row.get("id"),
        entity_type: row.get("entity_type"),
        entity_id: row.get("entity_id"),
        file_path: row.get("file_path"),
        thumbnail_path: row.get("thumbnail_path"),
        original_name: row.get("original_name"),
        width: row.get("width"),
        height: row.get("height"),
        size_bytes: row.get("size_bytes"),
        event_name: row.get("event_name"),
        created_at: row.get("created_at"),
    })
}

/// Get photos for an entity
#[tauri::command]
pub async fn get_photos(
    app: AppHandle,
    entity_type: String,
    entity_id: i64,
) -> Result<Vec<Photo>, String> {
    let pool = get_pool(&app).await?;

    let rows = sqlx::query(
        r#"SELECT id, entity_type, entity_id, file_path, thumbnail_path, original_name, width, height, size_bytes, event_name, created_at
           FROM photos WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC"#
    )
    .bind(&entity_type)
    .bind(entity_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .iter()
        .map(|row| Photo {
            id: row.get("id"),
            entity_type: row.get("entity_type"),
            entity_id: row.get("entity_id"),
            file_path: row.get("file_path"),
            thumbnail_path: row.get("thumbnail_path"),
            original_name: row.get("original_name"),
            width: row.get("width"),
            height: row.get("height"),
            size_bytes: row.get("size_bytes"),
            event_name: row.get("event_name"),
            created_at: row.get("created_at"),
        })
        .collect())
}

/// Get photo count for an entity
#[tauri::command]
pub async fn get_photo_count(
    app: AppHandle,
    entity_type: String,
    entity_id: i64,
) -> Result<i32, String> {
    let pool = get_pool(&app).await?;

    let count: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) as count FROM photos WHERE entity_type = ? AND entity_id = ?"
    )
    .bind(&entity_type)
    .bind(entity_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(count)
}

/// Delete a photo
#[tauri::command]
pub async fn delete_photo(app: AppHandle, id: i64) -> Result<bool, String> {
    let pool = get_pool(&app).await?;

    // Get the photo paths first
    let row = sqlx::query(
        "SELECT file_path, thumbnail_path FROM photos WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?;

    if let Some(row) = row {
        let file_path: String = row.get("file_path");
        let thumbnail_path: Option<String> = row.get("thumbnail_path");

        // Delete the files
        if let Err(e) = fs::remove_file(&file_path) {
            eprintln!("Failed to delete photo file: {}", e);
        }

        if let Some(thumb) = thumbnail_path {
            if let Err(e) = fs::remove_file(&thumb) {
                eprintln!("Failed to delete thumbnail: {}", e);
            }
        }

        // Delete from database
        sqlx::query("DELETE FROM photos WHERE id = ?")
            .bind(id)
            .execute(&pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(true)
    } else {
        Ok(false)
    }
}

/// Convert a file path to a Tauri asset URL
#[tauri::command]
pub fn get_photo_url(file_path: String) -> String {
    // Convert to asset protocol URL for Tauri
    format!("asset://localhost/{}", file_path.replace('\\', "/"))
}

/// Photo with related entity details
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhotoWithDetails {
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
    // Related entity info
    pub athlete_name: Option<String>,
    pub competition_name: Option<String>,
}

/// Get all photos with optional filters
#[tauri::command]
pub async fn get_all_photos(
    app: AppHandle,
    athlete_id: Option<i64>,
    competition_id: Option<i64>,
    year: Option<i32>,
) -> Result<Vec<PhotoWithDetails>, String> {
    let pool = get_pool(&app).await?;

    // Use parameterized queries to prevent SQL injection
    let rows = match (athlete_id, competition_id, year) {
        (Some(aid), None, None) => {
            sqlx::query(
                r#"SELECT p.id, p.entity_type, p.entity_id, p.file_path, p.thumbnail_path,
                          p.original_name, p.width, p.height, p.size_bytes, p.event_name, p.created_at,
                          a.first_name || ' ' || a.last_name as athlete_name,
                          c.name as competition_name
                   FROM photos p
                   LEFT JOIN athletes a ON p.entity_type = 'athletes' AND p.entity_id = a.id
                   LEFT JOIN competitions c ON p.entity_type = 'competitions' AND p.entity_id = c.id
                   WHERE (p.entity_type = 'athletes' AND p.entity_id = ?)
                      OR (p.entity_type = 'competitions' AND p.entity_id IN
                          (SELECT competition_id FROM competition_participants WHERE athlete_id = ?))
                   ORDER BY p.created_at DESC"#
            )
            .bind(aid)
            .bind(aid)
            .fetch_all(&pool)
            .await
        }
        (None, Some(cid), None) => {
            sqlx::query(
                r#"SELECT p.id, p.entity_type, p.entity_id, p.file_path, p.thumbnail_path,
                          p.original_name, p.width, p.height, p.size_bytes, p.event_name, p.created_at,
                          a.first_name || ' ' || a.last_name as athlete_name,
                          c.name as competition_name
                   FROM photos p
                   LEFT JOIN athletes a ON p.entity_type = 'athletes' AND p.entity_id = a.id
                   LEFT JOIN competitions c ON p.entity_type = 'competitions' AND p.entity_id = c.id
                   WHERE p.entity_type = 'competitions' AND p.entity_id = ?
                   ORDER BY p.created_at DESC"#
            )
            .bind(cid)
            .fetch_all(&pool)
            .await
        }
        (None, None, Some(y)) => {
            sqlx::query(
                r#"SELECT p.id, p.entity_type, p.entity_id, p.file_path, p.thumbnail_path,
                          p.original_name, p.width, p.height, p.size_bytes, p.event_name, p.created_at,
                          a.first_name || ' ' || a.last_name as athlete_name,
                          c.name as competition_name
                   FROM photos p
                   LEFT JOIN athletes a ON p.entity_type = 'athletes' AND p.entity_id = a.id
                   LEFT JOIN competitions c ON p.entity_type = 'competitions' AND p.entity_id = c.id
                   WHERE CAST(strftime('%Y', p.created_at) AS INTEGER) = ?
                   ORDER BY p.created_at DESC"#
            )
            .bind(y)
            .fetch_all(&pool)
            .await
        }
        (Some(aid), None, Some(y)) => {
            sqlx::query(
                r#"SELECT p.id, p.entity_type, p.entity_id, p.file_path, p.thumbnail_path,
                          p.original_name, p.width, p.height, p.size_bytes, p.event_name, p.created_at,
                          a.first_name || ' ' || a.last_name as athlete_name,
                          c.name as competition_name
                   FROM photos p
                   LEFT JOIN athletes a ON p.entity_type = 'athletes' AND p.entity_id = a.id
                   LEFT JOIN competitions c ON p.entity_type = 'competitions' AND p.entity_id = c.id
                   WHERE ((p.entity_type = 'athletes' AND p.entity_id = ?)
                      OR (p.entity_type = 'competitions' AND p.entity_id IN
                          (SELECT competition_id FROM competition_participants WHERE athlete_id = ?)))
                      AND CAST(strftime('%Y', p.created_at) AS INTEGER) = ?
                   ORDER BY p.created_at DESC"#
            )
            .bind(aid)
            .bind(aid)
            .bind(y)
            .fetch_all(&pool)
            .await
        }
        (None, Some(cid), Some(y)) => {
            sqlx::query(
                r#"SELECT p.id, p.entity_type, p.entity_id, p.file_path, p.thumbnail_path,
                          p.original_name, p.width, p.height, p.size_bytes, p.event_name, p.created_at,
                          a.first_name || ' ' || a.last_name as athlete_name,
                          c.name as competition_name
                   FROM photos p
                   LEFT JOIN athletes a ON p.entity_type = 'athletes' AND p.entity_id = a.id
                   LEFT JOIN competitions c ON p.entity_type = 'competitions' AND p.entity_id = c.id
                   WHERE p.entity_type = 'competitions' AND p.entity_id = ?
                      AND CAST(strftime('%Y', p.created_at) AS INTEGER) = ?
                   ORDER BY p.created_at DESC"#
            )
            .bind(cid)
            .bind(y)
            .fetch_all(&pool)
            .await
        }
        _ => {
            // No filters or unsupported combination - return all photos
            sqlx::query(
                r#"SELECT p.id, p.entity_type, p.entity_id, p.file_path, p.thumbnail_path,
                          p.original_name, p.width, p.height, p.size_bytes, p.event_name, p.created_at,
                          a.first_name || ' ' || a.last_name as athlete_name,
                          c.name as competition_name
                   FROM photos p
                   LEFT JOIN athletes a ON p.entity_type = 'athletes' AND p.entity_id = a.id
                   LEFT JOIN competitions c ON p.entity_type = 'competitions' AND p.entity_id = c.id
                   ORDER BY p.created_at DESC"#
            )
            .fetch_all(&pool)
            .await
        }
    }.map_err(|e| e.to_string())?;

    Ok(rows
        .iter()
        .map(|row| PhotoWithDetails {
            id: row.get("id"),
            entity_type: row.get("entity_type"),
            entity_id: row.get("entity_id"),
            file_path: row.get("file_path"),
            thumbnail_path: row.get("thumbnail_path"),
            original_name: row.get("original_name"),
            width: row.get("width"),
            height: row.get("height"),
            size_bytes: row.get("size_bytes"),
            event_name: row.get("event_name"),
            created_at: row.get("created_at"),
            athlete_name: row.get("athlete_name"),
            competition_name: row.get("competition_name"),
        })
        .collect())
}

/// Get distinct years that have photos
#[tauri::command]
pub async fn get_photo_years(app: AppHandle) -> Result<Vec<i32>, String> {
    let pool = get_pool(&app).await?;

    let rows: Vec<i32> = sqlx::query_scalar(
        "SELECT DISTINCT CAST(strftime('%Y', created_at) AS INTEGER) as year FROM photos ORDER BY year DESC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Save an athlete profile photo (separate from the photos gallery)
/// Returns the file path where the photo was saved
#[tauri::command]
pub fn save_athlete_profile_photo(
    app: AppHandle,
    source_path: String,
    athlete_id: i64,
) -> Result<String, String> {
    // Get the source file info
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err("Source file does not exist".to_string());
    }

    let extension = source
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg")
        .to_lowercase();

    // Validate file type
    if !["jpg", "jpeg", "png", "gif", "webp"].contains(&extension.as_str()) {
        return Err("Unsupported image format".to_string());
    }

    // Get destination directory for athlete profile photos
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let profile_photos_dir = app_data.join("profile_photos");
    fs::create_dir_all(&profile_photos_dir).map_err(|e| e.to_string())?;

    // Generate unique filename based on athlete ID
    let unique_id = Uuid::new_v4();
    let new_filename = format!("athlete_{}_{}.{}", athlete_id, unique_id, extension);
    let dest_path = profile_photos_dir.join(&new_filename);

    // Copy file
    fs::copy(&source, &dest_path).map_err(|e| format!("Failed to copy file: {}", e))?;

    // Generate thumbnail for faster loading
    let thumbnail_filename = format!("athlete_{}_{}_thumb.{}", athlete_id, unique_id, extension);
    let thumbnail_path = profile_photos_dir.join(&thumbnail_filename);

    if let Err(e) = generate_thumbnail(&dest_path, &thumbnail_path) {
        eprintln!("Failed to generate profile thumbnail: {}", e);
    }

    Ok(dest_path.to_string_lossy().to_string())
}
