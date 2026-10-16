# Domain compatibility decisions

The pure Core layer defines the WinUI application's domain rules. It does not
read an installation or recalculate flags during initial data migration.

* Compatibility DTOs retain persisted entity fields and date/timestamp
  text. `LegacyJson.Options` uses camelCase. Unknown JSON properties survive
  round trips at the export root and in its entities. `Result.SubResults` remains
  a JSON **string**, independent of child `CombinedEventId` rows. Stored gender
  and national-record flags are retained.
* Three age APIs remain separate. Callers supply the applicable year; Core does
  not read the system clock. Discipline membership and both skill datasets use self-contained embedded JSON.
  The 2026 selector retains the empty T9/T11/T13/T15 categories.
* `RecordRules.Recalculate` is an explicit write-operation calculation, returning
  copies in input order. It applies event-year wind age to every candidate,
  separates nullable equipment/height groups, ignores hurdle spacing as a key,
  chooses the earliest date then lowest ID on equal values, and leaves unknown
  athlete/discipline relationships untouched. Initial migration must preserve
  stored flags instead of calling this API.
* Stored eight-event wind data can spell running events `100m` and `60m aj`,
  whereas the seeded catalog spells them `100 m` and `60 m aidat`. The native
  wind rule accepts both spellings of those same eight events. Before: a seeded
  `100 m` result at age 14 with +2.1 wind could retain record eligibility through
  the name mismatch. After: it is excluded. At age 13 the same wind remains
  eligible. Exactly +2.0 remains eligible. No new event is wind-filtered.
* Strict new-record comparison rejects equal values. Recalculation still assigns
  one deterministic owner for a tie. This intentionally resolves creation versus
  recalculation discrepancies rather than depending on the present calendar year
  or SQLite's unspecified ordering. Infrastructure owns recalculation of both old
  and new groups in one transaction after edits/deletions.
* Goal progress accepts the supplied best value, preserving the legacy formula
  (including zero-target protection). New achievement evaluation considers only
  active goals and valid/null-status matching results. It never resets an already
  achieved goal or discards its stored achievement date. A discarded result with
  status DNS cannot achieve a running goal merely because its value is zero.
* Main statistics accept valid/null status, include zero values as the baseline
  does, compare with the immediately preceding calendar year, and select the
  latest four years that contain results. Athlete progress separately requires
  positive values, accepts empty status for stored-data compatibility, uses unit-based
  direction, and calculates first-to-last improvement within the selected period.
  It has the same eligibility for chart points as its period statistics.
  Its all-time badge retains the source's nonzero (rather than positive) value
  filter; its comparison takes four years before discarding invalid-only seasons.
* `SegmentedInput` handles integer hundredths/centimeters, typing-versus-blur
  fractional semantics, field limits and navigation. Cooper/combined values are
  not divided by 100. `ResultFormatter.Value` retains the generic legacy result
  formatter; contexts that display jump centimeters use `Distance` with
  `centimeters: DisciplineCatalog.UsesCentimeters(id)`.

These are domain fixtures, not native UI automation or a release acceptance
certificate. UI field focus, live typing and accessibility still require tests
against the actual WinUI controls.
