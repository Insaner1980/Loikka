// Wind-affected disciplines (sprints, hurdles, long jump, triple jump)
// Uses short names (name field from disciplines table)
pub const WIND_AFFECTED_DISCIPLINES: &[&str] = &[
    "60m", "100m", "200m",
    "60m aj", "80m aj", "100m aj",
    "Pituus", "Kolmiloikka"
];

// Wind limit for official records (m/s)
pub const WIND_LIMIT: f64 = 2.0;

// Age threshold for wind rules (under this age, wind rules don't apply)
pub const WIND_RULE_AGE_THRESHOLD: i32 = 14;

/// Parameters for checking PB/SB with equipment considerations
#[derive(Default)]
pub struct RecordCheckParams {
    pub wind: Option<f64>,
    pub equipment_weight: Option<f64>,
    pub hurdle_height: Option<i32>,
}
