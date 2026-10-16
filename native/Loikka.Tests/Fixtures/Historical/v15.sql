-- Source: 26a89d8 run_migration_v15; exact successful SQL operations.
ALTER TABLE results ADD COLUMN sub_results TEXT;
INSERT INTO _migrations(version,description,applied_at) VALUES(15,'add_sub_results_for_combined_events','2025-12-30 00:00:00');
