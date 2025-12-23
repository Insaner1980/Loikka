// Re-export everything for generate_handler! macro to access __cmd__ items
pub mod crud;
pub mod medals;
pub(crate) mod records;
pub(crate) mod types;

// Re-export all public commands for use with generate_handler!
pub use crud::*;
pub use medals::*;

#[cfg(test)]
mod tests;
