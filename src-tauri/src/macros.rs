/// Macro to extract a field from a SQLite row with automatic type handling
/// Usage: row_get!(row, "field_name") or row_get!(row, "field_name", Type)
#[macro_export]
macro_rules! row_get {
    ($row:expr, $field:expr) => {
        $row.get($field)
    };
    ($row:expr, $field:expr, bool) => {
        $row.get::<i32, _>($field) == 1
    };
}

/// Macro to create an Athlete from a SQLite row
#[macro_export]
macro_rules! athlete_from_row {
    ($row:expr) => {
        $crate::types::Athlete {
            id: $row.get("id"),
            first_name: $row.get("first_name"),
            last_name: $row.get("last_name"),
            birth_year: $row.get("birth_year"),
            gender: $row.get("gender"),
            club_name: $row.get("club_name"),
            photo_path: $row.get("photo_path"),
            created_at: $row.get("created_at"),
            updated_at: $row.get("updated_at"),
        }
    };
}

/// Macro to create a Result from a SQLite row
#[macro_export]
macro_rules! result_from_row {
    ($row:expr) => {
        $crate::types::Result {
            id: $row.get("id"),
            athlete_id: $row.get("athlete_id"),
            discipline_id: $row.get("discipline_id"),
            date: $row.get("date"),
            value: $row.get("value"),
            result_type: $row.get("type"),
            competition_name: $row.get("competition_name"),
            competition_level: $row.get("competition_level"),
            location: $row.get("location"),
            placement: $row.get("placement"),
            notes: $row.get("notes"),
            is_personal_best: $row.get::<i32, _>("is_personal_best") == 1,
            is_season_best: $row.get::<i32, _>("is_season_best") == 1,
            is_national_record: $row.get::<i32, _>("is_national_record") == 1,
            wind: $row.get("wind"),
            status: $row.get("status"),
            equipment_weight: $row.get("equipment_weight"),
            hurdle_height: $row.get("hurdle_height"),
            hurdle_spacing: $row.get("hurdle_spacing"),
            created_at: $row.get("created_at"),
        }
    };
}

/// Macro to create a Discipline from a SQLite row
#[macro_export]
macro_rules! discipline_from_row {
    ($row:expr) => {
        $crate::types::Discipline {
            id: $row.get("id"),
            name: $row.get("name"),
            full_name: $row.get("full_name"),
            category: $row.get("category"),
            unit: $row.get("unit"),
            lower_is_better: $row.get::<i32, _>("lower_is_better") == 1,
            icon_name: $row.get("icon_name"),
        }
    };
}

/// Macro to create a Competition from a SQLite row
#[macro_export]
macro_rules! competition_from_row {
    ($row:expr) => {
        $crate::types::Competition {
            id: $row.get("id"),
            name: $row.get("name"),
            date: $row.get("date"),
            end_date: $row.get("end_date"),
            location: $row.get("location"),
            address: $row.get("address"),
            level: $row.get("level"),
            notes: $row.get("notes"),
            reminder_enabled: $row.get::<i32, _>("reminder_enabled") == 1,
            reminder_days_before: $row.get("reminder_days_before"),
            created_at: $row.get("created_at"),
        }
    };
}

/// Macro to create a Goal from a SQLite row
#[macro_export]
macro_rules! goal_from_row {
    ($row:expr) => {
        $crate::types::Goal {
            id: $row.get("id"),
            athlete_id: $row.get("athlete_id"),
            discipline_id: $row.get("discipline_id"),
            target_value: $row.get("target_value"),
            target_date: $row.get("target_date"),
            status: $row.get("status"),
            achieved_at: $row.get("achieved_at"),
            created_at: $row.get("created_at"),
        }
    };
}

/// Macro to create a Photo from a SQLite row
#[macro_export]
macro_rules! photo_from_row {
    ($row:expr) => {
        $crate::types::Photo {
            id: $row.get("id"),
            entity_type: $row.get("entity_type"),
            entity_id: $row.get("entity_id"),
            file_path: $row.get("file_path"),
            thumbnail_path: $row.get("thumbnail_path"),
            original_name: $row.get("original_name"),
            width: $row.get("width"),
            height: $row.get("height"),
            size_bytes: $row.get("size_bytes"),
            event_name: $row.get("event_name"),
            created_at: $row.get("created_at"),
        }
    };
}
