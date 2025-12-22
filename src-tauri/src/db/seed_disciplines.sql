-- Sprints (Pikajuoksut) - IDs 1-5
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (1, '40m', '40 metriä', 'sprints', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (2, '60m', '60 metriä', 'sprints', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (3, '100m', '100 metriä', 'sprints', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (4, '200m', '200 metriä', 'sprints', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (5, '400m', '400 metriä', 'sprints', 'time', 1, 'timer');

-- Middle distance (Keskimatkat) - IDs 6-8
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (6, '800m', '800 metriä', 'middleDistance', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (7, '1000m', '1000 metriä', 'middleDistance', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (8, '1500m', '1500 metriä', 'middleDistance', 'time', 1, 'timer');

-- Long distance (Pitkät matkat) - IDs 9-11
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (9, '3000m', '3000 metriä', 'longDistance', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (10, '5000m', '5000 metriä', 'longDistance', 'time', 1, 'timer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (11, '10000m', '10000 metriä', 'longDistance', 'time', 1, 'timer');

-- Hurdles (Aidat) - IDs 12-16
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (12, '60m aj', '60 metriä aidat', 'hurdles', 'time', 1, 'fence');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (13, '80m aj', '80 metriä aidat', 'hurdles', 'time', 1, 'fence');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (14, '100m aj', '100 metriä aidat', 'hurdles', 'time', 1, 'fence');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (15, '300m aj', '300 metriä aidat', 'hurdles', 'time', 1, 'fence');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (16, '400m aj', '400 metriä aidat', 'hurdles', 'time', 1, 'fence');

-- Jumps (Hypyt) - IDs 17-20
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (17, 'Pituus', 'Pituushyppy', 'jumps', 'distance', 0, 'move-diagonal');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (18, 'Kolmiloikka', 'Kolmiloikka', 'jumps', 'distance', 0, 'footprints');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (19, 'Korkeus', 'Korkeushyppy', 'jumps', 'distance', 0, 'arrow-up');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (20, 'Seiväs', 'Seiväshyppy', 'jumps', 'distance', 0, 'git-branch');

-- Throws (Heitot) - IDs 21-25
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (21, 'Kuula', 'Kuulantyöntö', 'throws', 'distance', 0, 'circle');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (22, 'Kiekko', 'Kiekonheitto', 'throws', 'distance', 0, 'disc');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (23, 'Keihäs', 'Keihäänheitto', 'throws', 'distance', 0, 'spline');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (24, 'Moukari', 'Moukarinheitto', 'throws', 'distance', 0, 'hammer');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (25, 'Pallo', 'Pallonheitto', 'throws', 'distance', 0, 'circle-dot');

-- Combined events (Moniottelu) - IDs 26-27
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (26, '5-ottelu', '5-ottelu', 'combined', 'distance', 0, 'trophy');
INSERT OR IGNORE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (27, '7-ottelu', '7-ottelu', 'combined', 'distance', 0, 'trophy');
