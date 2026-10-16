-- Source: 26a89d8 run_migration_v18; exact successful SQL operations.
INSERT OR IGNORE INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(42,'500 m maasto','500 metriä maastojuoksu','crossCountry','time',1,'trees');
INSERT OR IGNORE INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(43,'1 km maasto','1 kilometri maastojuoksu','crossCountry','time',1,'trees');
INSERT OR IGNORE INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(44,'2 km maasto','2 kilometriä maastojuoksu','crossCountry','time',1,'trees');
INSERT OR IGNORE INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(45,'4 km maasto','4 kilometriä maastojuoksu','crossCountry','time',1,'trees');
INSERT OR IGNORE INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES(46,'10 km maasto','10 kilometriä maastojuoksu','crossCountry','time',1,'trees');
INSERT INTO _migrations(version,description,applied_at) VALUES(18,'add_cross_country_disciplines','2025-12-30 00:00:00');
