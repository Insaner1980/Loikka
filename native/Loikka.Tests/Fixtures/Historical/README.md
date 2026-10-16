# Historical SQLite structural fixtures

These files contain only source-derived SQL and synthetic test data. They are not user databases, installed-release captures, or proof of every historical installation.

`v14-base.sql` uses the actual consolidated historical schema and original seed plus the source notes-table definition and source migration descriptions through 14. `v14-newinstall-base.sql` instead uses the initial schema and seed from the expanded schema baseline. Both are synthetic prefix fixtures, with fixed synthetic application timestamps.

`v15.sql` and `v16.sql` execute the real additive result-column/index operations. `v17.sql` executes the actual INSERT OR IGNORE then UPDATE catalog operations. `v18.sql` and `v19.sql` execute their real INSERT OR IGNORE operations. Each file appends its original migration-history row. Tests build prefixes by executing these files in order, rather than relabeling a schema20 database. In the seven-category family, later category inserts are ignored by the original CHECK constraint, matching the source behavior.

Catalog identity conflict is deliberate evidence: before migration17, IDs 21/22/23/26 mean Kuula/Kiekko/Keihäs/5-ottelu. Migration17 uses these IDs for 400 m aidat/Pituus/Korkeus/Kuula. The native migration refuses pre17 sources; it does not replay that semantic rewrite.

Supported prefixes17–19 retain the already-stored legacy meaning, every original row/column and flag, unknown tables, source history, sequences, indexes and triggers. Native normalization widens only the recognized category CHECK, adds missing canonical catalog IDs after identity checks, and records schema20 in a separate `_native_migrations` table. Source files remain untouched. Tests include a source discipline sequence900, an extra column/index/trigger, dormant BLOB data, notes, and historical record flags. Unsupported collisions and structural partial migrations are rejected before any destination staging is created.
