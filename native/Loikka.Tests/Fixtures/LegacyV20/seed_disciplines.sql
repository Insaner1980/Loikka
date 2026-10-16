-- Sprints (Pikajuoksut) - IDs 1-7
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (1, '40 m', '40 metriä', 'sprints', 'time', 1, 'timer');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (2, '60 m', '60 metriä', 'sprints', 'time', 1, 'timer');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (3, '100 m', '100 metriä', 'sprints', 'time', 1, 'timer');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (4, '150 m', '150 metriä', 'sprints', 'time', 1, 'timer');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (5, '200 m', '200 metriä', 'sprints', 'time', 1, 'timer');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (6, '300 m', '300 metriä', 'sprints', 'time', 1, 'timer');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (7, '400 m', '400 metriä', 'sprints', 'time', 1, 'timer');

-- Middle distance (Keskimatkat) - IDs 8-12
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (8, '600 m', '600 metriä', 'middleDistance', 'time', 1, 'timer');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (9, '800 m', '800 metriä', 'middleDistance', 'time', 1, 'timer');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (10, '1000 m', '1000 metriä', 'middleDistance', 'time', 1, 'timer');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (11, '1500 m', '1500 metriä', 'middleDistance', 'time', 1, 'timer');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (12, '2000 m', '2000 metriä', 'middleDistance', 'time', 1, 'timer');

-- Long distance (Pitkät matkat) - IDs 13-15
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (13, '3000 m', '3000 metriä', 'longDistance', 'time', 1, 'timer');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (14, '5000 m', '5000 metriä', 'longDistance', 'time', 1, 'timer');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (15, '10000 m', '10000 metriä', 'longDistance', 'time', 1, 'timer');

-- Hurdles (Aidat) - IDs 16-21
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (16, '60 m aidat', '60 metriä aidat', 'hurdles', 'time', 1, 'fence');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (17, '80 m aidat', '80 metriä aidat', 'hurdles', 'time', 1, 'fence');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (18, '100 m aidat', '100 metriä aidat', 'hurdles', 'time', 1, 'fence');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (19, '200 m aidat', '200 metriä aidat', 'hurdles', 'time', 1, 'fence');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (20, '300 m aidat', '300 metriä aidat', 'hurdles', 'time', 1, 'fence');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (21, '400 m aidat', '400 metriä aidat', 'hurdles', 'time', 1, 'fence');

-- Jumps (Hypyt) - IDs 22-25
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (22, 'Pituus', 'Pituushyppy', 'jumps', 'distance', 0, 'move-diagonal');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (23, 'Korkeus', 'Korkeushyppy', 'jumps', 'distance', 0, 'arrow-up');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (24, 'Kolmiloikka', 'Kolmiloikka', 'jumps', 'distance', 0, 'footprints');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (25, 'Seiväs', 'Seiväshyppy', 'jumps', 'distance', 0, 'git-branch');

-- Throws (Heitot) - IDs 26-30
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (26, 'Kuula', 'Kuulantyöntö', 'throws', 'distance', 0, 'circle');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (27, 'Kiekko', 'Kiekonheitto', 'throws', 'distance', 0, 'disc');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (28, 'Keihäs', 'Keihäänheitto', 'throws', 'distance', 0, 'spline');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (29, 'Moukari', 'Moukarinheitto', 'throws', 'distance', 0, 'hammer');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (30, 'Pallo', 'Pallonheitto', 'throws', 'distance', 0, 'circle-dot');

-- Combined events (Moniottelu) - IDs 31-34
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (31, '3-ottelu', '3-ottelu', 'combined', 'distance', 0, 'trophy');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (32, '4-ottelu', '4-ottelu', 'combined', 'distance', 0, 'trophy');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (33, '5-ottelu', '5-ottelu', 'combined', 'distance', 0, 'trophy');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (34, '7-ottelu', '7-ottelu', 'combined', 'distance', 0, 'trophy');

-- Walking (Kävely) - IDs 35-41
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (35, '600 m kävely', '600 metriä kävely', 'walking', 'time', 1, 'footprints');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (36, '800 m kävely', '800 metriä kävely', 'walking', 'time', 1, 'footprints');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (37, '2000 m kävely', '2000 metriä kävely', 'walking', 'time', 1, 'footprints');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (38, '3000 m kävely', '3000 metriä kävely', 'walking', 'time', 1, 'footprints');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (39, '5000 m kävely', '5000 metriä kävely', 'walking', 'time', 1, 'footprints');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (40, '10 km kävely', '10 kilometriä kävely', 'walking', 'time', 1, 'footprints');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (41, '1000 m kävely', '1000 metriä kävely', 'walking', 'time', 1, 'footprints');

-- Cross Country (Maastojuoksu) - IDs 42-46
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (42, '500 m maasto', '500 metriä maastojuoksu', 'crossCountry', 'time', 1, 'trees');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (43, '1 km maasto', '1 kilometri maastojuoksu', 'crossCountry', 'time', 1, 'trees');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (44, '2 km maasto', '2 kilometriä maastojuoksu', 'crossCountry', 'time', 1, 'trees');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (45, '4 km maasto', '4 kilometriä maastojuoksu', 'crossCountry', 'time', 1, 'trees');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (46, '10 km maasto', '10 kilometriä maastojuoksu', 'crossCountry', 'time', 1, 'trees');

-- Relays (Viestit) - IDs 47-53
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (47, '8x40 m sukkulaviesti', '8x40 metriä sukkulaviesti', 'relays', 'time', 1, 'repeat');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (48, '4x50 m viesti', '4x50 metriä viesti', 'relays', 'time', 1, 'repeat');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (49, '4x100 m viesti', '4x100 metriä viesti', 'relays', 'time', 1, 'repeat');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (50, '4x200 m viesti', '4x200 metriä viesti', 'relays', 'time', 1, 'repeat');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (51, '4x300 m viesti', '4x300 metriä viesti', 'relays', 'time', 1, 'repeat');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (52, '4x400 m viesti', '4x400 metriä viesti', 'relays', 'time', 1, 'repeat');
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (53, '4x800 m viesti', '4x800 metriä viesti', 'relays', 'time', 1, 'repeat');

-- Other (Muut) - ID 54
INSERT OR REPLACE INTO disciplines (id, name, full_name, category, unit, lower_is_better, icon_name) VALUES
    (54, 'Cooper', 'Cooper-testi (12 min)', 'other', 'distance', 0, 'heart-pulse');
