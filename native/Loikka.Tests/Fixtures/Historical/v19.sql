-- Source: 26a89d8 run_migration_v19; exact successful SQL operations.
INSERT OR IGNORE INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(47,'8x40 m sukkulaviesti','8x40 metriä sukkulaviesti','relays','time',1,'repeat');
INSERT OR IGNORE INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(48,'4x50 m viesti','4x50 metriä viesti','relays','time',1,'repeat');
INSERT OR IGNORE INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(49,'4x100 m viesti','4x100 metriä viesti','relays','time',1,'repeat');
INSERT OR IGNORE INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(50,'4x200 m viesti','4x200 metriä viesti','relays','time',1,'repeat');
INSERT OR IGNORE INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(51,'4x300 m viesti','4x300 metriä viesti','relays','time',1,'repeat');
INSERT OR IGNORE INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(52,'4x400 m viesti','4x400 metriä viesti','relays','time',1,'repeat');
INSERT OR IGNORE INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(53,'4x800 m viesti','4x800 metriä viesti','relays','time',1,'repeat');
INSERT OR IGNORE INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(54,'Cooper','Cooper-testi (12 min)','other','distance',0,'heart-pulse');
INSERT INTO _migrations(version,description,applied_at) VALUES(19,'add_relay_and_cooper_disciplines','2025-12-30 00:00:00');
