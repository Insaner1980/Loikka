# Synthetic migration reference

The generator and tests contain no personal data or real photographs. They require Node 24's built-in `node:sqlite`; no npm dependencies are needed.

```powershell
node --test tests/migration/reference-fixture.test.mjs
node tests/migration/create-reference.mjs --output .native-artifacts/reference/my-ordinary
node tests/migration/create-reference.mjs --output .native-artifacts/reference/my-empty --empty
node tests/migration/create-reference.mjs --output .native-artifacts/reference/my-workload --workload
```

Every output must be a **new isolated directory**. The generator refuses an existing `loikka.db` and never searches application-data folders. It writes a complete SQLite database, five-collection legacy JSON, three-key preference bridge JSON, generated 16x10 RGBA PNG media and a manifest containing original source hashes, row counts and intentional missing-media exceptions. `--workload` adds 5000 result rows; it does not claim a measured performance run or generate a large media corpus.

Inputs are frozen in `native/Loikka.Tests/Fixtures/LegacyV20`: independent SQLite schema, notes table, migration descriptions and 54 discipline catalog rows. Generation does not read the current production schema. The `sourceSha256` values identify the frozen baseline inputs recorded in `reference-data.json`.

This is a **consolidated synthetic v20 model**, not a captured old installation or proof of historical migration replay. Included are all 11 tables, T/P genders, long Finnish strings, all 11 competition levels, multiday/year-boundary/leap-day events, participant planned events, ordinary/combined/child/invalid/historical results, equipment groups, goal statuses and a zero legacy target, linked/detached medals, pinned/detached notes, sync identifiers, all three photo owners, same basenames, non-ASCII paths, reassigned ownership, missing original/thumbnail cases and known preference keys. The separate historical SQL fixtures cover supported schema prefixes.

The PNGs are generated pixel grids. No installer or personal image in the repository root is an input. Codec, permission, failure, cloud and full acceptance coverage remains in its owning native test scope.
