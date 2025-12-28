-- Test data seed for Loikka application

-- Athletes
INSERT OR IGNORE INTO athletes (id, first_name, last_name, birth_year, gender, club_name) VALUES (1, 'Emma', 'Virtanen', 2014, 'T', 'Tampereen Pyrintö');
INSERT OR IGNORE INTO athletes (id, first_name, last_name, birth_year, gender, club_name) VALUES (2, 'Olivia', 'Virtanen', 2016, 'T', 'Tampereen Pyrintö');
INSERT OR IGNORE INTO athletes (id, first_name, last_name, birth_year, gender, club_name) VALUES (3, 'Aino', 'Korhonen', 2013, 'T', 'Tampereen Pyrintö');

-- Competitions
INSERT OR IGNORE INTO competitions (id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before) VALUES (1, 'Pirkanmaan mestaruuskisat', '2024-06-15', '2024-06-16', 'Tampere', 'Ratina Stadium', 'pm', 'Hyvät olosuhteet', 0, NULL);
INSERT OR IGNORE INTO competitions (id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before) VALUES (2, 'Seuran kesäkisat', '2024-07-20', NULL, 'Tampere', 'Tammelan stadion', 'seurakisat', NULL, 0, NULL);
INSERT OR IGNORE INTO competitions (id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before) VALUES (3, 'Koululaisten aluemestaruus', '2024-09-14', NULL, 'Nokia', 'Nokian keskusurheilukenttä', 'koululaiskisat', NULL, 0, NULL);
INSERT OR IGNORE INTO competitions (id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before) VALUES (4, 'Seuran syysottelut', '2024-10-05', NULL, 'Tampere', 'Tammelan stadion', 'seuraottelut', 'Kauden päätöskisat', 0, NULL);
INSERT OR IGNORE INTO competitions (id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before) VALUES (5, 'Talvikisat hallissa', '2025-01-18', NULL, 'Tampere', 'Pirkkahalli', 'hallikisat', NULL, 0, NULL);
INSERT OR IGNORE INTO competitions (id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before) VALUES (6, 'Kevään avaus', '2025-03-22', NULL, 'Tampere', 'Tammelan stadion', 'seurakisat', NULL, 0, NULL);
INSERT OR IGNORE INTO competitions (id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before) VALUES (7, 'Pirkanmaan hallimestaruudet', '2025-01-25', '2025-01-26', 'Tampere', 'Pirkkahalli', 'pm', 'Tärkeät kisat!', 1, 3);
INSERT OR IGNORE INTO competitions (id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before) VALUES (8, 'Tampereen Pyrintö Games', '2025-02-15', NULL, 'Tampere', 'Pirkkahalli', 'seurakisat', NULL, 1, 7);
INSERT OR IGNORE INTO competitions (id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before) VALUES (9, 'Kalevan kisat', '2025-07-25', '2025-07-27', 'Helsinki', 'Olympiastadion', 'sm', 'SM-kisat', 1, 14);
INSERT OR IGNORE INTO competitions (id, name, date, end_date, location, address, level, notes, reminder_enabled, reminder_days_before) VALUES (10, 'Kesäkauden avaus', '2025-05-10', NULL, 'Tampere', 'Ratina Stadium', 'seurakisat', NULL, 1, 3);

-- Competition participants
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (1, 1, 1, '60m, Pituus, Kuula');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (2, 1, 2, '60m, Pituus');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (3, 1, 3, '60m, 200m, Korkeus');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (4, 2, 1, '60m, 100m, Pituus');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (5, 2, 2, '60m, Pallo');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (6, 3, 1, '60m, Pituus');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (7, 4, 1, '60m, Pituus, Kuula');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (8, 4, 2, '60m, Pituus, Pallo');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (9, 4, 3, '100m, 200m');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (10, 5, 1, '60m, Pituus');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (11, 6, 1, '60m, Pituus');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (12, 7, 1, '60m, Pituus, Kuula');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (13, 7, 2, '60m, Pituus');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (14, 7, 3, '60m, 200m');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (15, 8, 1, '60m, Pituus');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (16, 8, 2, '60m, Pallo');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (17, 9, 1, '60m, Pituus');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (18, 10, 1, '100m, Pituus, Kuula');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (19, 10, 2, '60m, Pituus');
INSERT OR IGNORE INTO competition_participants (id, competition_id, athlete_id, disciplines_planned) VALUES (20, 10, 3, '100m, 200m, Korkeus');

-- Results for Emma (athlete_id=1)
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (1, 1, 2, '2024-06-15', 9.45, 'competition', 'Pirkanmaan mestaruuskisat', 'pm', 'Tampere', 3, 0.5, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (2, 1, 2, '2024-07-20', 9.32, 'competition', 'Seuran kesäkisat', 'seurakisat', 'Tampere', 1, 1.2, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (3, 1, 2, '2024-09-14', 9.28, 'competition', 'Koululaisten aluemestaruus', 'koululaiskisat', 'Nokia', 2, -0.3, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (4, 1, 2, '2024-10-05', 9.21, 'competition', 'Seuran syysottelut', 'seuraottelut', 'Tampere', 1, 0.8, 'valid', 0, 1);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (5, 1, 2, '2025-01-18', 9.18, 'competition', 'Talvikisat hallissa', 'hallikisat', 'Tampere', 1, NULL, 'valid', 1, 1);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (6, 1, 3, '2024-07-20', 15.42, 'competition', 'Seuran kesäkisat', 'seurakisat', 'Tampere', 2, 1.8, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (7, 1, 3, '2024-08-10', 15.28, 'training', NULL, NULL, 'Tampere', NULL, 0.5, 'valid', 1, 1);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (8, 1, 17, '2024-06-15', 3.85, 'competition', 'Pirkanmaan mestaruuskisat', 'pm', 'Tampere', 2, 1.0, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (9, 1, 17, '2024-07-20', 3.92, 'competition', 'Seuran kesäkisat', 'seurakisat', 'Tampere', 1, 0.8, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (10, 1, 17, '2024-09-14', 4.05, 'competition', 'Koululaisten aluemestaruus', 'koululaiskisat', 'Nokia', 1, 1.5, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (11, 1, 17, '2024-10-05', 4.12, 'competition', 'Seuran syysottelut', 'seuraottelut', 'Tampere', 1, 0.3, 'valid', 0, 1);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (12, 1, 17, '2025-01-18', 4.18, 'competition', 'Talvikisat hallissa', 'hallikisat', 'Tampere', 1, NULL, 'valid', 1, 1);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, status, equipment_weight, is_personal_best, is_season_best) VALUES (13, 1, 21, '2024-06-15', 6.45, 'competition', 'Pirkanmaan mestaruuskisat', 'pm', 'Tampere', 4, 'valid', 2.0, 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, status, equipment_weight, is_personal_best, is_season_best) VALUES (14, 1, 21, '2024-10-05', 6.82, 'competition', 'Seuran syysottelut', 'seuraottelut', 'Tampere', 2, 'valid', 2.0, 0, 1);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, status, equipment_weight, is_personal_best, is_season_best) VALUES (15, 1, 21, '2025-01-18', 7.15, 'competition', 'Talvikisat hallissa', 'hallikisat', 'Tampere', 1, 'valid', 2.0, 1, 1);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, status, hurdle_height, is_personal_best, is_season_best) VALUES (16, 1, 12, '2024-06-15', 11.85, 'competition', 'Pirkanmaan mestaruuskisat', 'pm', 'Tampere', 3, 'valid', 68, 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, status, hurdle_height, is_personal_best, is_season_best) VALUES (17, 1, 12, '2024-10-05', 11.52, 'competition', 'Seuran syysottelut', 'seuraottelut', 'Tampere', 2, 'valid', 68, 1, 1);

-- Results for Olivia (athlete_id=2)
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (18, 2, 2, '2024-06-15', 10.85, 'competition', 'Pirkanmaan mestaruuskisat', 'pm', 'Tampere', 5, 0.5, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (19, 2, 2, '2024-07-20', 10.62, 'competition', 'Seuran kesäkisat', 'seurakisat', 'Tampere', 3, 1.2, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (20, 2, 2, '2024-10-05', 10.45, 'competition', 'Seuran syysottelut', 'seuraottelut', 'Tampere', 2, 0.8, 'valid', 1, 1);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (21, 2, 1, '2024-06-15', 7.28, 'competition', 'Pirkanmaan mestaruuskisat', 'pm', 'Tampere', 3, 0.5, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (22, 2, 1, '2024-07-20', 7.15, 'competition', 'Seuran kesäkisat', 'seurakisat', 'Tampere', 2, 1.2, 'valid', 1, 1);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (23, 2, 17, '2024-06-15', 2.85, 'competition', 'Pirkanmaan mestaruuskisat', 'pm', 'Tampere', 4, 1.0, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (24, 2, 17, '2024-07-20', 2.98, 'competition', 'Seuran kesäkisat', 'seurakisat', 'Tampere', 2, 0.8, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (25, 2, 17, '2024-10-05', 3.12, 'competition', 'Seuran syysottelut', 'seuraottelut', 'Tampere', 2, 0.3, 'valid', 1, 1);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, status, is_personal_best, is_season_best) VALUES (26, 2, 25, '2024-07-20', 18.45, 'competition', 'Seuran kesäkisat', 'seurakisat', 'Tampere', 2, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, status, is_personal_best, is_season_best) VALUES (27, 2, 25, '2024-10-05', 19.85, 'competition', 'Seuran syysottelut', 'seuraottelut', 'Tampere', 1, 'valid', 1, 1);

-- Results for Aino (athlete_id=3)
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (28, 3, 2, '2024-06-15', 8.92, 'competition', 'Pirkanmaan mestaruuskisat', 'pm', 'Tampere', 2, 0.5, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (29, 3, 2, '2024-10-05', 8.78, 'competition', 'Seuran syysottelut', 'seuraottelut', 'Tampere', 1, 0.8, 'valid', 1, 1);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (30, 3, 4, '2024-06-15', 29.85, 'competition', 'Pirkanmaan mestaruuskisat', 'pm', 'Tampere', 2, 0.8, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (31, 3, 4, '2024-10-05', 29.42, 'competition', 'Seuran syysottelut', 'seuraottelut', 'Tampere', 1, 0.5, 'valid', 1, 1);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (32, 3, 3, '2024-06-15', 14.52, 'competition', 'Pirkanmaan mestaruuskisat', 'pm', 'Tampere', 2, 1.2, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, wind, status, is_personal_best, is_season_best) VALUES (33, 3, 3, '2024-10-05', 14.28, 'competition', 'Seuran syysottelut', 'seuraottelut', 'Tampere', 1, 0.8, 'valid', 1, 1);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, status, is_personal_best, is_season_best) VALUES (34, 3, 19, '2024-06-15', 1.32, 'competition', 'Pirkanmaan mestaruuskisat', 'pm', 'Tampere', 3, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, competition_name, competition_level, location, placement, status, is_personal_best, is_season_best) VALUES (35, 3, 19, '2024-10-05', 1.38, 'competition', 'Seuran syysottelut', 'seuraottelut', 'Tampere', 2, 'valid', 1, 1);

-- Training results
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, location, status, is_personal_best, is_season_best) VALUES (36, 1, 2, '2024-08-15', 9.35, 'training', 'Tampere', 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, location, wind, status, is_personal_best, is_season_best) VALUES (37, 1, 17, '2024-08-20', 3.95, 'training', 'Tampere', 0.5, 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, location, status, is_personal_best, is_season_best) VALUES (38, 2, 2, '2024-08-15', 10.55, 'training', 'Tampere', 'valid', 0, 0);
INSERT OR IGNORE INTO results (id, athlete_id, discipline_id, date, value, type, location, status, is_personal_best, is_season_best) VALUES (39, 3, 4, '2024-08-18', 29.65, 'training', 'Tampere', 'valid', 0, 0);

-- Goals
INSERT OR IGNORE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status) VALUES (1, 1, 2, 9.00, '2025-08-31', 'active');
INSERT OR IGNORE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status) VALUES (2, 1, 17, 4.50, '2025-08-31', 'active');
INSERT OR IGNORE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status) VALUES (3, 1, 21, 8.00, '2025-08-31', 'active');
INSERT OR IGNORE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status) VALUES (4, 1, 3, 15.00, '2025-08-31', 'active');
INSERT OR IGNORE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status, achieved_at) VALUES (5, 1, 2, 9.50, '2024-12-31', 'achieved', '2024-06-15');
INSERT OR IGNORE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status, achieved_at) VALUES (6, 1, 17, 4.00, '2024-12-31', 'achieved', '2024-09-14');
INSERT OR IGNORE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status) VALUES (7, 2, 2, 10.00, '2025-08-31', 'active');
INSERT OR IGNORE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status) VALUES (8, 2, 17, 3.50, '2025-08-31', 'active');
INSERT OR IGNORE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status) VALUES (9, 2, 25, 22.00, '2025-08-31', 'active');
INSERT OR IGNORE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status, achieved_at) VALUES (10, 2, 1, 7.20, '2024-12-31', 'achieved', '2024-07-20');
INSERT OR IGNORE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status) VALUES (11, 3, 2, 8.50, '2025-08-31', 'active');
INSERT OR IGNORE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status) VALUES (12, 3, 4, 28.50, '2025-08-31', 'active');
INSERT OR IGNORE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status) VALUES (13, 3, 19, 1.45, '2025-08-31', 'active');
INSERT OR IGNORE INTO goals (id, athlete_id, discipline_id, target_value, target_date, status, achieved_at) VALUES (14, 3, 3, 14.50, '2024-12-31', 'achieved', '2024-10-05');

-- Medals
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (1, 1, 2, 'gold', 'Seuran kesäkisat', 2, 'Tampere', 2, '60m', '2024-07-20');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (2, 1, 9, 'gold', 'Seuran kesäkisat', 2, 'Tampere', 17, 'Pituus', '2024-07-20');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (3, 1, 10, 'gold', 'Koululaisten aluemestaruus', 3, 'Nokia', 17, 'Pituus', '2024-09-14');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (4, 1, 3, 'silver', 'Koululaisten aluemestaruus', 3, 'Nokia', 2, '60m', '2024-09-14');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (5, 1, 1, 'bronze', 'Pirkanmaan mestaruuskisat', 1, 'Tampere', 2, '60m', '2024-06-15');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (6, 1, 8, 'silver', 'Pirkanmaan mestaruuskisat', 1, 'Tampere', 17, 'Pituus', '2024-06-15');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (7, 1, 4, 'gold', 'Seuran syysottelut', 4, 'Tampere', 2, '60m', '2024-10-05');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (8, 1, 11, 'gold', 'Seuran syysottelut', 4, 'Tampere', 17, 'Pituus', '2024-10-05');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (9, 1, 5, 'gold', 'Talvikisat hallissa', 5, 'Tampere', 2, '60m', '2025-01-18');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (10, 1, 12, 'gold', 'Talvikisat hallissa', 5, 'Tampere', 17, 'Pituus', '2025-01-18');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (11, 1, 15, 'gold', 'Talvikisat hallissa', 5, 'Tampere', 21, 'Kuula', '2025-01-18');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (12, 2, 22, 'silver', 'Seuran kesäkisat', 2, 'Tampere', 1, '40m', '2024-07-20');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (13, 2, 24, 'silver', 'Seuran kesäkisat', 2, 'Tampere', 17, 'Pituus', '2024-07-20');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (14, 2, 26, 'silver', 'Seuran kesäkisat', 2, 'Tampere', 25, 'Pallo', '2024-07-20');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (15, 2, 20, 'silver', 'Seuran syysottelut', 4, 'Tampere', 2, '60m', '2024-10-05');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (16, 2, 25, 'silver', 'Seuran syysottelut', 4, 'Tampere', 17, 'Pituus', '2024-10-05');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (17, 2, 27, 'gold', 'Seuran syysottelut', 4, 'Tampere', 25, 'Pallo', '2024-10-05');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (18, 3, 28, 'silver', 'Pirkanmaan mestaruuskisat', 1, 'Tampere', 2, '60m', '2024-06-15');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (19, 3, 30, 'silver', 'Pirkanmaan mestaruuskisat', 1, 'Tampere', 4, '200m', '2024-06-15');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (20, 3, 32, 'silver', 'Pirkanmaan mestaruuskisat', 1, 'Tampere', 3, '100m', '2024-06-15');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (21, 3, 34, 'bronze', 'Pirkanmaan mestaruuskisat', 1, 'Tampere', 19, 'Korkeus', '2024-06-15');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (22, 3, 29, 'gold', 'Seuran syysottelut', 4, 'Tampere', 2, '60m', '2024-10-05');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (23, 3, 31, 'gold', 'Seuran syysottelut', 4, 'Tampere', 4, '200m', '2024-10-05');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (24, 3, 33, 'gold', 'Seuran syysottelut', 4, 'Tampere', 3, '100m', '2024-10-05');
INSERT OR IGNORE INTO medals (id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date) VALUES (25, 3, 35, 'silver', 'Seuran syysottelut', 4, 'Tampere', 19, 'Korkeus', '2024-10-05');
