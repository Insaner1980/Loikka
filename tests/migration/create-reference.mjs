import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const fixtures = resolve(dirname(fileURLToPath(import.meta.url)), '../../native/Loikka.Tests/Fixtures/LegacyV20');
const stamp = '2026-10-15 12:00:00';
const levels = ['seurakisat', 'koululaiskisat', 'seuran_sisaiset', 'seuraottelut', 'piirikisat', 'pm', 'hallikisat', 'aluekisat', 'pohjola_seuracup', 'sm', 'muu'];

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function syntheticPng(color) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(16, 0);
  header.writeUInt32BE(10, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Array.from({ length: 10 }, () => Buffer.from([0, ...Array.from({ length: 16 }, () => color).flat()]));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
}

export function createReference(output, { empty = false, workload = false } = {}) {
  const root = resolve(output);
  // Never open or replace an existing installation, including a previous fixture.
  if (existsSync(join(root, 'loikka.db'))) throw new Error('Output already contains loikka.db; choose a new isolated directory.');
  mkdirSync(root, { recursive: true });
  const schemaSource = readFileSync(join(fixtures, 'schema.sql'), 'utf8');
  const notesSql = readFileSync(join(fixtures, 'notes.sql'), 'utf8');
  const reference = JSON.parse(readFileSync(join(fixtures, 'reference-data.json'), 'utf8'));
  const catalog = reference.disciplines;
  if (catalog.length !== 54) throw new Error(`Expected 54 fixture disciplines; found ${catalog.length}.`);
  const db = new DatabaseSync(join(root, 'loikka.db'));
  db.exec('PRAGMA foreign_keys=ON;');
  db.exec(schemaSource);
  db.exec(notesSql);
  db.exec(`ALTER TABLE results ADD COLUMN sub_results TEXT;
    ALTER TABLE results ADD COLUMN combined_event_id INTEGER REFERENCES results(id) ON DELETE CASCADE;
    CREATE INDEX idx_photos_entity ON photos(entity_type, entity_id);
    CREATE INDEX idx_notes_athlete ON notes(athlete_id);
    CREATE INDEX idx_notes_pinned ON notes(pinned);
    CREATE INDEX idx_results_combined_event ON results(combined_event_id);
    CREATE TABLE _migrations (version INTEGER PRIMARY KEY, description TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TRIGGER update_athlete_timestamp AFTER UPDATE ON athletes BEGIN
      UPDATE athletes SET updated_at = datetime('now') WHERE id = NEW.id;
    END;`);
  const insert = (table, row) => {
    const keys = Object.keys(row);
    db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...Object.values(row));
  };
  for (const { version, description } of reference.migrations) {
    insert('_migrations', { version, description, applied_at: stamp });
  }
  for (const discipline of catalog) insert('disciplines', discipline);
  const media = [];
  if (!empty) {
    for (const athlete of [
      { id: 1, first_name: 'Aino', last_name: 'Esimerkki', birth_year: 2013, gender: 'T', club_name: 'Synteettinen seura Ääkköset', photo_path: join(root, 'profile_photos/athlete_1_fixture.png') },
      { id: 2, first_name: 'Eeli', last_name: 'Testihenkilö', birth_year: 2012, gender: 'P', club_name: null, photo_path: null },
      { id: 3, first_name: 'Pitkä yhdysnimi', last_name: 'Esimerkkisukunimi jolla testataan rivitys', birth_year: 2018, gender: 'T', club_name: 'Synteettinen seura Ääkköset', photo_path: null },
      { id: 4, first_name: 'Nuori', last_name: 'Näyte', birth_year: 2021, gender: 'T', club_name: '', photo_path: null },
    ]) insert('athletes', { ...athlete, created_at: stamp, updated_at: stamp });
    for (let index = 0; index < levels.length; index++) insert('competitions', {
      id: index + 1, name: `Näytekisa ${index + 1}`, date: index === 0 ? '2026-12-31' : `2026-10-${String(16 + index).padStart(2, '0')}`,
      end_date: index === 0 ? '2027-01-02' : null, location: index === 2 ? null : 'Testikenttä', address: index === 2 ? null : 'Esimerkkitie 1',
      level: levels[index], custom_level_name: levels[index] === 'muu' ? 'Oma näytetaso' : null,
      notes: index === 0 ? 'Synteettinen monipäiväinen kilpailu\nEi oikeita henkilötietoja.' : null,
      reminder_enabled: index === 0 ? 1 : 0, reminder_days_before: index === 0 ? 3 : null, created_at: stamp,
    });
    insert('competitions', { id: 12, name: 'Karkauspäivä', date: '2024-02-29', end_date: null, location: null, address: null, level: null, custom_level_name: null, notes: '', reminder_enabled: 0, reminder_days_before: null, created_at: stamp });
    insert('competition_participants', { id: 1, competition_id: 1, athlete_id: 1, disciplines_planned: '[1,22,26]' });
    insert('competition_participants', { id: 2, competition_id: 1, athlete_id: 2, disciplines_planned: '[]' });
    const addResult = (id, fields) => insert('results', {
      id, athlete_id: 1, discipline_id: 3, date: '2026-06-15', value: 12.34, type: 'competition', competition_name: 'Näytekisa',
      competition_level: 'seurakisat', custom_level_name: null, location: 'Testikenttä', placement: null, notes: null,
      is_personal_best: 0, is_season_best: 0, is_national_record: 0, wind: null, status: 'valid', equipment_weight: null,
      hurdle_height: null, hurdle_spacing: null, created_at: stamp, sub_results: null, combined_event_id: null, ...fields,
    });
    for (let index = 0; index < catalog.length; index++) {
      const discipline = catalog[index];
      addResult(index + 1, { discipline_id: discipline.id, value: discipline.category === 'combined' ? 1200 : discipline.id === 54 ? 2500 : discipline.unit === 'time' ? 83.45 : 5.5, type: index % 2 ? 'training' : 'competition', placement: index === 2 ? 1 : null, status: index === 0 ? null : 'valid', is_personal_best: 1, is_season_best: 1 });
    }
    for (const [index, year] of [2020, 2022, 2023, 2025, 2026].entries()) {
      addResult(100 + index * 2, { date: `${year}-06-15`, value: 15 - index * 0.5, is_personal_best: index === 4 ? 1 : 0, is_season_best: 1 });
      addResult(101 + index * 2, { date: `${year}-06-15`, value: 15.1 - index * 0.5, wind: 2.01 });
    }
    for (const [index, status] of ['nm', 'dns', 'dnf', 'dq'].entries()) addResult(120 + index, { value: 0, status });
    addResult(130, { athlete_id: 2, date: '2026-06-15', value: 12.34, wind: 2.0, placement: 2, is_national_record: 1 });
    addResult(131, { athlete_id: 2, date: '2026-06-16', value: 12.33, wind: 2.01 });
    addResult(132, { discipline_id: 26, value: 8.25, equipment_weight: 2 });
    addResult(133, { discipline_id: 26, value: 8.25, equipment_weight: 3 });
    addResult(134, { discipline_id: 28, value: 22.34, equipment_weight: 400, wind: -1.0 });
    addResult(135, { discipline_id: 16, value: 10.25, hurdle_height: 60, hurdle_spacing: 7.5 });
    addResult(136, { discipline_id: 16, value: 10.2, hurdle_height: 68, hurdle_spacing: 7.5 });
    const subResults = [{ disciplineId: 1, value: 7.65, points: 200 }, { disciplineId: 22, value: 3.45, points: 300 }, { disciplineId: 26, value: 6.78, points: 400 }];
    addResult(200, { discipline_id: 31, value: 900, sub_results: JSON.stringify(subResults) });
    for (const [index, sub] of subResults.entries()) addResult(201 + index, { discipline_id: sub.disciplineId, value: sub.value, combined_event_id: 200 });
    if (workload) for (let index = 0; index < 5000; index++) addResult(1000 + index, { athlete_id: index % 2 + 1, discipline_id: index % 54 + 1, date: `202${index % 7}-06-15`, value: index % 3000 / 100 + 1, type: 'training' });
    for (const goal of [
      { id: 1, discipline_id: 3, target_value: 12, status: 'active', achieved_at: null },
      { id: 2, discipline_id: 22, target_value: 6, status: 'active', achieved_at: null },
      { id: 3, discipline_id: 3, target_value: 14, status: 'achieved', achieved_at: '2025-06-15' },
      { id: 4, discipline_id: 3, target_value: 10, status: 'abandoned', achieved_at: null },
      { id: 5, discipline_id: 22, target_value: 0, status: 'active', achieved_at: null },
    ]) insert('goals', { athlete_id: 1, target_date: '2026-12-31', created_at: stamp, ...goal });
    for (const [index, type] of ['gold', 'silver', 'bronze'].entries()) insert('medals', { id: index + 1, athlete_id: 1, result_id: index === 0 ? 3 : null, type, competition_name: 'Näytekisa', competition_id: index === 2 ? null : 1, location: 'Testikenttä', discipline_id: 3, discipline_name: '100 m', date: '2026-06-15', created_at: stamp });
    insert('notes', { id: 1, content: 'Synteettinen piilotettu muistiinpano: ääkköset ja\nrivinvaihto.', athlete_id: 1, pinned: 1, created_at: stamp, updated_at: stamp });
    insert('notes', { id: 2, content: 'Irrallinen muistiinpano', athlete_id: null, pinned: 0, created_at: stamp, updated_at: stamp });
    db.prepare("UPDATE sync_status SET state='pending', last_sync_at=?, google_drive_folder_id='fixture-folder', database_file_id='fixture-backup' WHERE id=1").run(stamp);
    const locations = ['photos/athletes/1/same.png', 'photos/results/3/same.png', 'photos/competitions/1/ääkkönen.png', 'photos/competitions/1/reassigned.png', 'photos/athletes/1/missing-original.png'];
    for (const [index, relative] of locations.entries()) {
      const bytes = syntheticPng([40 + index * 35, 100, 160, index === 2 ? 128 : 255]);
      const file = join(root, relative);
      const thumb = join(root, `photos/thumbnails/fixture-${index + 1}.png`);
      if (index !== 4) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, bytes); }
      if (index !== 1) { mkdirSync(dirname(thumb), { recursive: true }); writeFileSync(thumb, bytes); }
      insert('photos', { id: index + 1, entity_type: index === 1 ? 'results' : index === 2 ? 'competitions' : 'athletes', entity_id: index === 1 ? 3 : 1, file_path: file, thumbnail_path: thumb, original_name: relative.split('/').at(-1), width: 16, height: 10, size_bytes: bytes.length, event_name: index === 3 ? 'Vapaa näytenimi' : null, created_at: stamp });
      media.push({ id: index + 1, relative, sha256: createHash('sha256').update(bytes).digest('hex'), missingOriginal: index === 4, missingThumbnail: index === 1 });
    }
    const profile = join(root, 'profile_photos/athlete_1_fixture.png');
    mkdirSync(dirname(profile), { recursive: true });
    writeFileSync(profile, syntheticPng([120, 80, 200, 255]));
  }
  const tables = ['athletes', 'disciplines', 'results', 'competitions', 'competition_participants', 'goals', 'medals', 'photos', 'sync_status', 'notes', '_migrations'];
  const counts = Object.fromEntries(tables.map((table) => [table, db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count]));
  const camel = (row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), ['is_personal_best', 'is_season_best', 'is_national_record', 'reminder_enabled'].includes(key) ? Boolean(value) : value]));
  const json = { version: '1.0.0', exportedAt: '2026-10-15T12:00:00Z' };
  for (const table of ['athletes', 'results', 'competitions', 'goals', 'medals']) json[table] = db.prepare(`SELECT * FROM ${table} ORDER BY id`).all().map(camel);
  writeFileSync(join(root, 'legacy-export.json'), JSON.stringify(json, null, 2));
  writeFileSync(join(root, 'loikka-preferences.json'), JSON.stringify({ format: 'loikka-preferences', version: 1, values: { 'loikka-celebrated-goals': '[3]', 'loikka-backups-expanded': 'true', autoSyncEnabled: 'false' } }, null, 2));
  const integrity = db.prepare('PRAGMA integrity_check').all();
  const foreignKeys = db.prepare('PRAGMA foreign_key_check').all();
  db.close();
  const manifest = { format: 'loikka-synthetic-reference', version: 1, clock: '2026-10-15T12:00:00+03:00', provenance: 'Frozen source-derived v20 fixture; NOT a captured installation or historical migration replay. sourceSha256 identifies the original baseline sources.', counts, media, integrity, foreignKeys, sourceSha256: reference.sourceSha256 };
  writeFileSync(join(root, 'fixture-manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputIndex = process.argv.indexOf('--output');
  if (outputIndex < 0 || !process.argv[outputIndex + 1]) throw new Error('An explicit --output <new isolated directory> is required.');
  console.log(JSON.stringify(createReference(process.argv[outputIndex + 1], { empty: process.argv.includes('--empty'), workload: process.argv.includes('--workload') }), null, 2));
}
