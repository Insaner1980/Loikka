# Frozen SQLite v20 test reference

Independent SQLite and catalog inputs used by the WinUI migration tests and synthetic UI fixture generator.

- `schema.sql` and `seed_disciplines.sql` preserve the schema and discipline seed baseline.
- `notes.sql` preserves the notes-table definition for schema version 14.
- `reference-data.json` freezes 54 catalog rows, migration descriptions for versions 1–20, and baseline source hashes.

`LegacyMigrationTests` uses these SQL files to build an independent compatibility specimen. `tests/migration/create-reference.mjs` uses the schema, notes and frozen JSON to create synthetic UI and migration data. The JSON catalog intentionally has null icon names while the SQL seed retains its icon values.

Keep these expectations independent of the current production schema and catalog. They contain no personal data and are not captures of installed user databases.
