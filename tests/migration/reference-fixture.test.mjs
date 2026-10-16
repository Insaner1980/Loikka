import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createReference } from './create-reference.mjs';

test('synthetic reference contains every table, all ownership types and exact JSON scope', () => {
  const root = mkdtempSync(join(tmpdir(), 'loikka-reference-'));
  try {
    const manifest = createReference(root);
    assert.equal(manifest.counts.disciplines, 54);
    assert.equal(manifest.counts._migrations, 20);
    assert.deepEqual(manifest.foreignKeys, []);
    assert.equal(manifest.integrity[0].integrity_check, 'ok');
    const db = new DatabaseSync(join(root, 'loikka.db'), { readOnly: true });
    assert.deepEqual(db.prepare('SELECT DISTINCT entity_type FROM photos ORDER BY entity_type').all().map(row => row.entity_type), ['athletes', 'competitions', 'results']);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM athletes WHERE gender='P'").get().count, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM results WHERE combined_event_id=200').get().count, 3);
    assert.equal(db.prepare('SELECT pinned FROM notes WHERE id=1').get().pinned, 1);
    assert.equal(db.prepare('SELECT reminder_enabled FROM competitions WHERE id=1').get().reminder_enabled, 1);
    assert.equal(db.prepare('SELECT COUNT(DISTINCT level) AS count FROM competitions').get().count, 11);
    db.close();
    for (const item of manifest.media.filter(item => !item.missingOriginal)) assert.equal(createHash('sha256').update(readFileSync(join(root, item.relative))).digest('hex'), item.sha256);
    const json = JSON.parse(readFileSync(join(root, 'legacy-export.json'), 'utf8'));
    assert.deepEqual(Object.keys(json), ['version', 'exportedAt', 'athletes', 'results', 'competitions', 'goals', 'medals']);
    assert.equal(json.version, '1.0.0');
    assert.equal(json.results.find(row => row.id === 200).subResults, '[{"disciplineId":1,"value":7.65,"points":200},{"disciplineId":22,"value":3.45,"points":300},{"disciplineId":26,"value":6.78,"points":400}]');
    assert.equal(typeof json.results[0].isPersonalBest, 'boolean');
    assert.throws(() => createReference(root), /already contains/);
  } finally {
    assert.equal(resolve(root).startsWith(resolve(tmpdir())), true);
    rmSync(root, { recursive: true, force: true });
  }
});

test('empty reference initializes catalog without demo athletes or results', () => {
  const root = mkdtempSync(join(tmpdir(), 'loikka-reference-'));
  try {
    const manifest = createReference(root, { empty: true });
    assert.equal(manifest.counts.athletes, 0);
    assert.equal(manifest.counts.results, 0);
    assert.equal(manifest.counts.disciplines, 54);
    assert.equal(manifest.counts.notes, 0);
  } finally {
    assert.equal(resolve(root).startsWith(resolve(tmpdir())), true);
    rmSync(root, { recursive: true, force: true });
  }
});
