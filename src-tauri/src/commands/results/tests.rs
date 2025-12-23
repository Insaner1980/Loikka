use super::records::{
    check_personal_best_extended, check_personal_best_internal, check_season_best_extended,
    check_season_best_internal, is_wind_assisted,
};
use super::types::{RecordCheckParams, WIND_AFFECTED_DISCIPLINES, WIND_LIMIT, WIND_RULE_AGE_THRESHOLD};

// ==================== Test helpers ====================

async fn setup_test_db() -> sqlx::Pool<sqlx::Sqlite> {
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("Failed to create in-memory database");

    // Create schema
    sqlx::query(
        r#"
        CREATE TABLE athletes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            birth_year INTEGER NOT NULL,
            club_name TEXT,
            photo_path TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE disciplines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            full_name TEXT NOT NULL,
            category TEXT NOT NULL,
            unit TEXT NOT NULL,
            lower_is_better INTEGER NOT NULL DEFAULT 1,
            icon_name TEXT
        );

        CREATE TABLE results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            athlete_id INTEGER NOT NULL,
            discipline_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            value REAL NOT NULL,
            type TEXT NOT NULL,
            competition_name TEXT,
            competition_level TEXT,
            location TEXT,
            placement INTEGER,
            notes TEXT,
            is_personal_best INTEGER NOT NULL DEFAULT 0,
            is_season_best INTEGER NOT NULL DEFAULT 0,
            is_national_record INTEGER NOT NULL DEFAULT 0,
            wind REAL,
            status TEXT DEFAULT 'valid',
            equipment_weight REAL,
            hurdle_height INTEGER,
            hurdle_spacing REAL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        "#,
    )
    .execute(&pool)
    .await
    .expect("Failed to create schema");

    // Seed disciplines
    sqlx::query(
        r#"
        INSERT INTO disciplines (id, name, full_name, category, unit, lower_is_better) VALUES
            (1, '100m', '100 metriä', 'sprints', 'time', 1),
            (2, 'Pituus', 'Pituushyppy', 'jumps', 'distance', 0),
            (3, 'Kuula', 'Kuulantyöntö', 'throws', 'distance', 0),
            (4, '60m aj', '60 metriä aidat', 'hurdles', 'time', 1),
            (5, '800m', '800 metriä', 'middleDistance', 'time', 1);
        "#,
    )
    .execute(&pool)
    .await
    .expect("Failed to seed disciplines");

    pool
}

async fn create_test_athlete(pool: &sqlx::Pool<sqlx::Sqlite>, birth_year: i32) -> i64 {
    let result = sqlx::query(
        "INSERT INTO athletes (first_name, last_name, birth_year) VALUES ('Test', 'Athlete', ?)",
    )
    .bind(birth_year)
    .execute(pool)
    .await
    .expect("Failed to create athlete");

    result.last_insert_rowid()
}

#[allow(clippy::too_many_arguments)]
async fn insert_result(
    pool: &sqlx::Pool<sqlx::Sqlite>,
    athlete_id: i64,
    discipline_id: i64,
    date: &str,
    value: f64,
    wind: Option<f64>,
    equipment_weight: Option<f64>,
    hurdle_height: Option<i32>,
    status: &str,
) -> i64 {
    let result = sqlx::query(
        r#"INSERT INTO results
           (athlete_id, discipline_id, date, value, type, wind, equipment_weight, hurdle_height, status)
           VALUES (?, ?, ?, ?, 'competition', ?, ?, ?, ?)"#,
    )
    .bind(athlete_id)
    .bind(discipline_id)
    .bind(date)
    .bind(value)
    .bind(wind)
    .bind(equipment_weight)
    .bind(hurdle_height)
    .bind(status)
    .execute(pool)
    .await
    .expect("Failed to insert result");

    result.last_insert_rowid()
}

// ==================== is_wind_assisted tests ====================

#[test]
fn test_wind_assisted_non_wind_discipline() {
    // Throws are not affected by wind
    assert!(!is_wind_assisted(Some(3.0), "Kuula", 2010, 2025));
    assert!(!is_wind_assisted(Some(5.0), "Kiekko", 2010, 2025));
    assert!(!is_wind_assisted(Some(10.0), "Keihäs", 2010, 2025));

    // Middle/long distance not affected
    assert!(!is_wind_assisted(Some(3.0), "800m", 2010, 2025));
    assert!(!is_wind_assisted(Some(3.0), "1500m", 2010, 2025));

    // High jump not affected
    assert!(!is_wind_assisted(Some(3.0), "Korkeus", 2010, 2025));
}

#[test]
fn test_wind_assisted_sprints() {
    // 60m sprint with wind > 2.0 for 14+ year old = wind assisted
    assert!(is_wind_assisted(Some(2.1), "60m", 2010, 2025)); // 15 years old
    assert!(is_wind_assisted(Some(2.5), "100m", 2010, 2025));
    assert!(is_wind_assisted(Some(3.0), "200m", 2010, 2025));

    // Wind exactly at limit (2.0) = NOT wind assisted
    assert!(!is_wind_assisted(Some(2.0), "100m", 2010, 2025));

    // Negative wind = NOT wind assisted
    assert!(!is_wind_assisted(Some(-1.0), "100m", 2010, 2025));

    // Wind under limit = NOT wind assisted
    assert!(!is_wind_assisted(Some(1.9), "100m", 2010, 2025));
}

#[test]
fn test_wind_assisted_hurdles() {
    // Hurdles with wind > 2.0 for 14+ = wind assisted
    assert!(is_wind_assisted(Some(2.1), "60m aj", 2010, 2025));
    assert!(is_wind_assisted(Some(2.5), "80m aj", 2010, 2025));
    assert!(is_wind_assisted(Some(3.0), "100m aj", 2010, 2025));

    // Wind at limit = NOT wind assisted
    assert!(!is_wind_assisted(Some(2.0), "100m aj", 2010, 2025));
}

#[test]
fn test_wind_assisted_jumps() {
    // Long jump and triple jump are wind-affected
    assert!(is_wind_assisted(Some(2.1), "Pituus", 2010, 2025));
    assert!(is_wind_assisted(Some(2.5), "Kolmiloikka", 2010, 2025));

    // Wind at limit = NOT wind assisted
    assert!(!is_wind_assisted(Some(2.0), "Pituus", 2010, 2025));
    assert!(!is_wind_assisted(Some(1.5), "Kolmiloikka", 2010, 2025));
}

#[test]
fn test_wind_assisted_under_14() {
    // Athletes under 14 are NOT affected by wind rules
    // Born 2015, result in 2025 = 10 years old
    assert!(!is_wind_assisted(Some(3.0), "100m", 2015, 2025));
    assert!(!is_wind_assisted(Some(5.0), "60m", 2015, 2025));
    assert!(!is_wind_assisted(Some(10.0), "Pituus", 2015, 2025));

    // Born 2012, result in 2025 = 13 years old (still under 14)
    assert!(!is_wind_assisted(Some(3.0), "100m", 2012, 2025));

    // Born 2011, result in 2025 = 14 years old (wind rules apply)
    assert!(is_wind_assisted(Some(2.1), "100m", 2011, 2025));
}

#[test]
fn test_wind_assisted_exactly_14() {
    // Born 2011, result in 2025 = exactly 14 years old
    // Wind rules SHOULD apply at 14
    assert!(is_wind_assisted(Some(2.1), "100m", 2011, 2025));
    assert!(is_wind_assisted(Some(2.5), "Pituus", 2011, 2025));
}

#[test]
fn test_wind_assisted_no_wind() {
    // No wind value = NOT wind assisted
    assert!(!is_wind_assisted(None, "100m", 2010, 2025));
    assert!(!is_wind_assisted(None, "Pituus", 2010, 2025));
}

#[test]
fn test_wind_assisted_zero_wind() {
    // Zero wind = NOT wind assisted
    assert!(!is_wind_assisted(Some(0.0), "100m", 2010, 2025));
    assert!(!is_wind_assisted(Some(0.0), "Pituus", 2010, 2025));
}

#[test]
fn test_wind_affected_disciplines_list() {
    // Verify the constant contains expected disciplines
    assert!(WIND_AFFECTED_DISCIPLINES.contains(&"60m"));
    assert!(WIND_AFFECTED_DISCIPLINES.contains(&"100m"));
    assert!(WIND_AFFECTED_DISCIPLINES.contains(&"200m"));
    assert!(WIND_AFFECTED_DISCIPLINES.contains(&"60m aj"));
    assert!(WIND_AFFECTED_DISCIPLINES.contains(&"80m aj"));
    assert!(WIND_AFFECTED_DISCIPLINES.contains(&"100m aj"));
    assert!(WIND_AFFECTED_DISCIPLINES.contains(&"Pituus"));
    assert!(WIND_AFFECTED_DISCIPLINES.contains(&"Kolmiloikka"));

    // 400m is NOT wind-affected (too long)
    assert!(!WIND_AFFECTED_DISCIPLINES.contains(&"400m"));
}

#[test]
fn test_wind_constants() {
    assert_eq!(WIND_LIMIT, 2.0);
    assert_eq!(WIND_RULE_AGE_THRESHOLD, 14);
}

// ==================== PB check integration tests ====================

#[tokio::test]
async fn test_pb_first_result_is_always_pb() {
    let pool = setup_test_db().await;
    let athlete_id = create_test_athlete(&pool, 2010).await;

    // First result should always be PB
    let is_pb = check_personal_best_internal(&pool, athlete_id, 1, 12.50)
        .await
        .unwrap();
    assert!(is_pb, "First result should be PB");
}

#[tokio::test]
async fn test_pb_lower_is_better_sprint() {
    let pool = setup_test_db().await;
    let athlete_id = create_test_athlete(&pool, 2010).await;

    // Insert initial result: 12.50s
    insert_result(
        &pool,
        athlete_id,
        1,
        "2025-01-01",
        12.50,
        None,
        None,
        None,
        "valid",
    )
    .await;

    // Slower time should NOT be PB
    let is_pb = check_personal_best_internal(&pool, athlete_id, 1, 12.60)
        .await
        .unwrap();
    assert!(!is_pb, "Slower time should not be PB");

    // Faster time SHOULD be PB
    let is_pb = check_personal_best_internal(&pool, athlete_id, 1, 12.40)
        .await
        .unwrap();
    assert!(is_pb, "Faster time should be PB");

    // Same time should NOT be PB
    let is_pb = check_personal_best_internal(&pool, athlete_id, 1, 12.50)
        .await
        .unwrap();
    assert!(!is_pb, "Same time should not be PB");
}

#[tokio::test]
async fn test_pb_higher_is_better_jump() {
    let pool = setup_test_db().await;
    let athlete_id = create_test_athlete(&pool, 2010).await;

    // Insert initial result: 4.50m (Pituus, id=2)
    insert_result(
        &pool,
        athlete_id,
        2,
        "2025-01-01",
        4.50,
        None,
        None,
        None,
        "valid",
    )
    .await;

    // Shorter jump should NOT be PB
    let is_pb = check_personal_best_internal(&pool, athlete_id, 2, 4.40)
        .await
        .unwrap();
    assert!(!is_pb, "Shorter jump should not be PB");

    // Longer jump SHOULD be PB
    let is_pb = check_personal_best_internal(&pool, athlete_id, 2, 4.60)
        .await
        .unwrap();
    assert!(is_pb, "Longer jump should be PB");
}

#[tokio::test]
async fn test_pb_invalid_status_ignored() {
    let pool = setup_test_db().await;
    let athlete_id = create_test_athlete(&pool, 2010).await;

    // Insert invalid result (NM)
    insert_result(
        &pool,
        athlete_id,
        1,
        "2025-01-01",
        12.00,
        None,
        None,
        None,
        "nm",
    )
    .await;

    // New result should be PB since invalid results are ignored
    let is_pb = check_personal_best_internal(&pool, athlete_id, 1, 12.50)
        .await
        .unwrap();
    assert!(is_pb, "First valid result should be PB (invalid ignored)");
}

#[tokio::test]
async fn test_pb_wind_assisted_not_eligible() {
    let pool = setup_test_db().await;
    // Athlete born 2010 = 15 years old in 2025 (wind rules apply)
    let athlete_id = create_test_athlete(&pool, 2010).await;

    // Insert valid result: 12.50s
    insert_result(
        &pool,
        athlete_id,
        1,
        "2025-01-01",
        12.50,
        Some(1.5),
        None,
        None,
        "valid",
    )
    .await;

    // Wind-assisted result (wind > 2.0) should NOT be PB even if faster
    let params = RecordCheckParams {
        wind: Some(2.5),
        equipment_weight: None,
        hurdle_height: None,
    };
    let is_pb = check_personal_best_extended(&pool, athlete_id, 1, 12.00, &params)
        .await
        .unwrap();
    assert!(!is_pb, "Wind-assisted result should not be PB");
}

#[tokio::test]
async fn test_pb_wind_ok_for_young_athlete() {
    let pool = setup_test_db().await;
    // Athlete born 2015 = 10 years old in 2025 (wind rules don't apply)
    let athlete_id = create_test_athlete(&pool, 2015).await;

    // Insert result: 12.50s
    insert_result(
        &pool,
        athlete_id,
        1,
        "2025-01-01",
        12.50,
        Some(1.5),
        None,
        None,
        "valid",
    )
    .await;

    // Wind > 2.0 should still be eligible for PB for young athlete
    let params = RecordCheckParams {
        wind: Some(2.5),
        equipment_weight: None,
        hurdle_height: None,
    };
    let is_pb = check_personal_best_extended(&pool, athlete_id, 1, 12.00, &params)
        .await
        .unwrap();
    assert!(
        is_pb,
        "Wind should not affect young athlete's PB eligibility"
    );
}

#[tokio::test]
async fn test_pb_equipment_weight_separate() {
    let pool = setup_test_db().await;
    let athlete_id = create_test_athlete(&pool, 2010).await;

    // Insert result with 3kg shot put: 8.00m (Kuula, id=3)
    insert_result(
        &pool,
        athlete_id,
        3,
        "2025-01-01",
        8.00,
        None,
        Some(3.0),
        None,
        "valid",
    )
    .await;

    // Better throw with 4kg should be PB (different weight class)
    let params = RecordCheckParams {
        wind: None,
        equipment_weight: Some(4.0),
        hurdle_height: None,
    };
    let is_pb = check_personal_best_extended(&pool, athlete_id, 3, 7.50, &params)
        .await
        .unwrap();
    assert!(is_pb, "First result with different weight should be PB");

    // Insert 4kg result
    insert_result(
        &pool,
        athlete_id,
        3,
        "2025-01-02",
        7.50,
        None,
        Some(4.0),
        None,
        "valid",
    )
    .await;

    // Worse throw with 4kg should NOT be PB
    let is_pb = check_personal_best_extended(&pool, athlete_id, 3, 7.00, &params)
        .await
        .unwrap();
    assert!(!is_pb, "Worse throw with same weight should not be PB");
}

#[tokio::test]
async fn test_pb_hurdle_height_separate() {
    let pool = setup_test_db().await;
    let athlete_id = create_test_athlete(&pool, 2010).await;

    // Insert result with 76cm hurdles: 10.50s (60m aj, id=4)
    insert_result(
        &pool,
        athlete_id,
        4,
        "2025-01-01",
        10.50,
        None,
        None,
        Some(76),
        "valid",
    )
    .await;

    // Slower time with 84cm should be PB (different height class)
    let params = RecordCheckParams {
        wind: None,
        equipment_weight: None,
        hurdle_height: Some(84),
    };
    let is_pb = check_personal_best_extended(&pool, athlete_id, 4, 11.00, &params)
        .await
        .unwrap();
    assert!(
        is_pb,
        "First result with different hurdle height should be PB"
    );
}

// ==================== SB check integration tests ====================

#[tokio::test]
async fn test_sb_first_result_of_year_is_sb() {
    let pool = setup_test_db().await;
    let athlete_id = create_test_athlete(&pool, 2010).await;

    // First result of year should be SB
    let is_sb = check_season_best_internal(&pool, athlete_id, 1, 12.50, 2025)
        .await
        .unwrap();
    assert!(is_sb, "First result of year should be SB");
}

#[tokio::test]
async fn test_sb_better_result_same_year() {
    let pool = setup_test_db().await;
    let athlete_id = create_test_athlete(&pool, 2010).await;

    // Insert result in 2025
    insert_result(
        &pool,
        athlete_id,
        1,
        "2025-01-01",
        12.50,
        None,
        None,
        None,
        "valid",
    )
    .await;

    // Slower should NOT be SB
    let is_sb = check_season_best_internal(&pool, athlete_id, 1, 12.60, 2025)
        .await
        .unwrap();
    assert!(!is_sb, "Slower time should not be SB");

    // Faster SHOULD be SB
    let is_sb = check_season_best_internal(&pool, athlete_id, 1, 12.40, 2025)
        .await
        .unwrap();
    assert!(is_sb, "Faster time should be SB");
}

#[tokio::test]
async fn test_sb_different_years_separate() {
    let pool = setup_test_db().await;
    let athlete_id = create_test_athlete(&pool, 2010).await;

    // Insert result in 2024
    insert_result(
        &pool,
        athlete_id,
        1,
        "2024-06-01",
        12.00,
        None,
        None,
        None,
        "valid",
    )
    .await;

    // Slower time in 2025 should still be SB (different year)
    let is_sb = check_season_best_internal(&pool, athlete_id, 1, 12.50, 2025)
        .await
        .unwrap();
    assert!(
        is_sb,
        "First result of new year should be SB regardless of previous year"
    );
}

#[tokio::test]
async fn test_sb_wind_assisted_not_eligible() {
    let pool = setup_test_db().await;
    let athlete_id = create_test_athlete(&pool, 2010).await;

    // Insert result in 2025
    insert_result(
        &pool,
        athlete_id,
        1,
        "2025-01-01",
        12.50,
        Some(1.5),
        None,
        None,
        "valid",
    )
    .await;

    // Wind-assisted should NOT be SB
    let params = RecordCheckParams {
        wind: Some(2.5),
        equipment_weight: None,
        hurdle_height: None,
    };
    let is_sb = check_season_best_extended(&pool, athlete_id, 1, 12.00, 2025, &params)
        .await
        .unwrap();
    assert!(!is_sb, "Wind-assisted result should not be SB");
}

#[tokio::test]
async fn test_sb_non_wind_affected_discipline() {
    let pool = setup_test_db().await;
    let athlete_id = create_test_athlete(&pool, 2010).await;

    // Insert 800m result (not wind-affected)
    insert_result(
        &pool,
        athlete_id,
        5,
        "2025-01-01",
        150.0,
        None,
        None,
        None,
        "valid",
    )
    .await;

    // Even with high wind, should be SB (800m not wind-affected)
    let params = RecordCheckParams {
        wind: Some(5.0),
        equipment_weight: None,
        hurdle_height: None,
    };
    let is_sb = check_season_best_extended(&pool, athlete_id, 5, 145.0, 2025, &params)
        .await
        .unwrap();
    assert!(is_sb, "Wind should not affect 800m SB eligibility");
}
