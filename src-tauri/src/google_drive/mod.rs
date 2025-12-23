pub mod api;
pub mod oauth;
pub mod sync;
pub mod tokens;
pub mod types;

// Re-export main public API for convenience
pub use oauth::{disconnect, exchange_code_for_tokens, generate_auth_url, wait_for_oauth_callback};
pub use tokens::{get_valid_token, is_token_expired, load_tokens, refresh_access_token};

pub use api::{delete_file, list_backups};
pub use sync::{
    list_cloud_photos, list_local_photos, restore_from_drive, restore_with_options,
    sync_database_to_drive, sync_with_options,
};
