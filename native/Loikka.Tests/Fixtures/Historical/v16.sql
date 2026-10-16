-- Source: 26a89d8 run_migration_v16; exact successful SQL operations.
ALTER TABLE results ADD COLUMN combined_event_id INTEGER REFERENCES results(id) ON DELETE CASCADE;
CREATE INDEX idx_results_combined_event ON results(combined_event_id);
INSERT INTO _migrations(version,description,applied_at) VALUES(16,'add_combined_event_id_for_moniottelu','2025-12-30 00:00:00');
