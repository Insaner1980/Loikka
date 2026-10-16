using Loikka.Core.Models;
using Loikka.Core.Rules;
using Microsoft.Data.Sqlite;

namespace Loikka.Infrastructure.Database;

public sealed partial class LocalDatabase
{
    public string RootPath { get; }
    public string DatabasePath => Path.Combine(RootPath, "loikka.db");

    private static readonly string[] sourceArray = new[]
    {
        "'crossCountry'",
        "'relays'",
        "'other'"
    };
    public LocalDatabase(string rootPath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(rootPath);
        if (!Path.IsPathFullyQualified(rootPath))
        {
            throw new ArgumentException("An absolute, explicit data root is required.", nameof(rootPath));
        }

        RootPath = Path.GetFullPath(rootPath);
    }

    public async Task InitializeAsync()
    {
        Directory.CreateDirectory(RootPath);
        var exists = File.Exists(DatabasePath);
        await using var c = await OpenAsync();
        if (exists)
        {
            await VerifySchemaAsync(c);
            return;
        }

#pragma warning disable S6966 // Microsoft.Data.Sqlite async transaction APIs execute synchronously (learn.microsoft.com/dotnet/standard/data/sqlite/async).
        using var tx = c.BeginTransaction();
#pragma warning restore S6966
        await ExecuteAsync(c, tx, DatabaseSchema.Sql);
#pragma warning disable S6966 // Microsoft.Data.Sqlite async transaction APIs execute synchronously (learn.microsoft.com/dotnet/standard/data/sqlite/async).
        tx.Commit();
#pragma warning restore S6966
    }

    internal async Task<SqliteConnection> OpenAsync()
    {
        var c = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = DatabasePath, ForeignKeys = true, Pooling = false }.ToString());
        await c.OpenAsync();
        return c;
    }

    public static async Task VerifySchemaAsync(SqliteConnection c)
    {
        await using var version = c.CreateCommand();
        version.CommandText = "SELECT MAX(version) FROM _migrations";
        var legacyVersion = Convert.ToInt32(await version.ExecuteScalarAsync());
        if (legacyVersion != 20)
        {
            await using var exists = c.CreateCommand();
            exists.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='_native_migrations'";
            if (legacyVersion is < 17 or > 19 || Convert.ToInt32(await exists.ExecuteScalarAsync()) != 1)
            {
                throw new InvalidDataException("A verified schema 20 database or normalized legacy version 17–19 is required.");
            }

            await using var native = c.CreateCommand();
            native.CommandText = "SELECT COUNT(*) FROM _native_migrations WHERE id=1 AND schema_version=20 AND legacy_version=$legacy";
            native.Parameters.AddWithValue("$legacy", legacyVersion);
            if (Convert.ToInt32(await native.ExecuteScalarAsync()) != 1)
            {
                throw new InvalidDataException("Native schema normalization marker does not match the preserved legacy history.");
            }
        }

        await using var baseline = new SqliteConnection("Data Source=:memory:");
        await baseline.OpenAsync();
        await ExecuteAsync(baseline, null, DatabaseSchema.Sql);
        foreach (var table in new[]
        {
            "athletes",
            "disciplines",
            "results",
            "competitions",
            "competition_participants",
            "goals",
            "medals",
            "photos",
            "notes",
            "sync_status"
        }

        )
        {
            await VerifyTableAsync(c, baseline, table);
        }

        await using var integrity = c.CreateCommand();
        integrity.CommandText = "PRAGMA integrity_check";
        if ((string?)await integrity.ExecuteScalarAsync() != "ok")
        {
            throw new InvalidDataException("SQLite integrity_check failed.");
        }

        await using var partialSchema = c.CreateCommand();
        partialSchema.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('results_new','competitions_new','disciplines_new','photos_old')";
        if (await partialSchema.ExecuteScalarAsync() is string name)
        {
            throw new InvalidDataException($"Partial legacy migration table {name} requires manual recovery; source is unchanged.");
        }
    }

    private static async Task<Dictionary<string, string>> ColumnSignaturesAsync(SqliteConnection c, string table)
    {
        // The only caller uses the fixed table names in VerifySchemaAsync.
        // nosemgrep: csharp.lang.security.sqli.csharp-sqli.csharp-sqli
        await using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT * FROM pragma_table_info($table)";
        cmd.Parameters.AddWithValue("$table", table);
        await using var reader = await cmd.ExecuteReaderAsync();
        var values = new Dictionary<string, string>();
        while (await reader.ReadAsync())
        {
            values[reader.GetString(1)] = $"{reader.GetString(2).ToUpperInvariant()}|{reader.GetInt32(3)}|{reader.GetInt32(5)}";
        }

        return values;
    }

    private static async Task<List<string>> ForeignKeySignaturesAsync(SqliteConnection c, string table)
    {
        // The only caller uses the fixed table names in VerifySchemaAsync.
        // nosemgrep: csharp.lang.security.sqli.csharp-sqli.csharp-sqli
        await using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT * FROM pragma_foreign_key_list($table)";
        cmd.Parameters.AddWithValue("$table", table);
        await using var reader = await cmd.ExecuteReaderAsync();
        var values = new List<string>();
        while (await reader.ReadAsync())
        {
            values.Add(string.Join('|', Enumerable.Range(2, 6).Select(i => reader.GetString(i))));
        }

        values.Sort(StringComparer.Ordinal);
        return values;
    }

    private async Task<List<T>> QueryAsync<T>(string sql, Func<SqliteDataReader, T> read, params (string, object?)[] args)
    {
        await using var c = await OpenAsync();
        return await ReadAsync(c, null, sql, read, args);
    }

    private static async Task<List<T>> ReadAsync<T>(SqliteConnection c, SqliteTransaction? tx, string sql, Func<SqliteDataReader, T> read, params (string, object?)[] args)
    {
        await using var cmd = Command(c, tx, sql, args);
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<T>();
        while (await reader.ReadAsync())
        {
            list.Add(read(reader));
        }

        return list;
    }

    private static SqliteCommand Command(SqliteConnection c, SqliteTransaction? tx, string sql, params (string, object?)[] args)
    // Private callers use code-defined SQL/identifiers; record values are bound below.
    // nosemgrep: csharp.lang.security.sqli.csharp-sqli.csharp-sqli
    {
        var cmd = c.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = sql;
        foreach (var (key, value) in args)
        {
            cmd.Parameters.AddWithValue(key, value ?? DBNull.Value);
        }

        return cmd;
    }

    private static async Task<int> ExecuteAsync(SqliteConnection c, SqliteTransaction? tx, string sql, params (string, object?)[] args)
    {
        await using var cmd = Command(c, tx, sql, args);
        return await cmd.ExecuteNonQueryAsync();
    }

    private async Task<T> TransactionAsync<T>(Func<SqliteConnection, SqliteTransaction, Task<T>> action)
    {
        await using var c = await OpenAsync();
#pragma warning disable S6966 // Microsoft.Data.Sqlite async transaction APIs execute synchronously (learn.microsoft.com/dotnet/standard/data/sqlite/async).
        using var tx = c.BeginTransaction();
#pragma warning restore S6966
        var value = await action(c, tx);
#pragma warning disable S6966 // Microsoft.Data.Sqlite async transaction APIs execute synchronously (learn.microsoft.com/dotnet/standard/data/sqlite/async).
        tx.Commit();
#pragma warning restore S6966
        return value;
    }

    private static async Task<long> UpsertAsync(SqliteConnection c, SqliteTransaction tx, string table, long id, string[] columns, object?[] values)
    {
        var names = new List<string>(columns);
        var args = values.Select((v, i) => ($"$p{i}", v)).ToList();
        if (id > 0)
        {
            names.Insert(0, "id");
            args.Insert(0, ("$id", id));
        }

        var conflict = id > 0 ? " ON CONFLICT(id) DO UPDATE SET " + string.Join(",", columns.Where(x => x != "created_at").Select(x => $"{x}=excluded.{x}")) : "";
        await using var cmd = Command(c, tx, $"INSERT INTO {table} ({string.Join(',', names)}) VALUES ({string.Join(',', args.Select(x => x.Item1))}){conflict} RETURNING id", args.ToArray());
        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    private async Task DeleteSimpleAsync(string table, long id) => await TransactionAsync((c, tx) => ExecuteAsync(c, tx, $"DELETE FROM {table} WHERE id=$id", ("$id", id)));
    public Task<Result> SaveResultAsync(Result value) => TransactionAsync(async (c, tx) =>
    {
        var affected = await ReadAsync(c, tx, "SELECT * FROM results WHERE id=$id", ReadResult, ("$id", value.Id));
        ValidateResult(value);
        await ValidateParentAsync(c, tx, value);
        await WriteResultAsync(c, tx, value);
        affected.Add(value);
        await UpdateResultMedalAsync(c, tx, value);
        await RecalculateAsync(c, tx, affected);
        return (await ReadAsync(c, tx, "SELECT * FROM results WHERE id=$id", ReadResult, ("$id", value.Id))).Single();
    });
    public Task<Result> SaveCombinedResultAsync(Result parent, IReadOnlyList<Result> children) => TransactionAsync(async (c, tx) =>
    {
        if (parent.CombinedEventId is not null)
        {
            throw new InvalidDataException("A combined parent cannot itself be a child.");
        }

        var affected = await ReadAsync(c, tx, "SELECT * FROM results WHERE id=$id", ReadResult, ("$id", parent.Id));
        ValidateResult(parent);
        await WriteResultAsync(c, tx, parent);
        affected.Add(parent);
        var existing = await ReadAsync(c, tx, "SELECT * FROM results WHERE combined_event_id=$id", ReadResult, ("$id", parent.Id));
        affected.AddRange(existing);
        foreach (var old in existing.Where(x => children.All(y => y.Id != x.Id)))
        {
            await DeleteResultRowsAsync(c, tx, old.Id);
        }

        foreach (var child in children)
        {
            if (child.Id == parent.Id || (child.Id > 0 && existing.All(x => x.Id != child.Id)))
            {
                throw new InvalidDataException("Combined child ID does not belong to the parent.");
            }

            if (child.AthleteId != parent.AthleteId)
            {
                throw new InvalidDataException("Combined children must belong to the parent athlete.");
            }

            child.CombinedEventId = parent.Id;
            ValidateResult(child);
            await WriteResultAsync(c, tx, child);
            affected.Add(child);
            await UpdateResultMedalAsync(c, tx, child);
        }

        await UpdateResultMedalAsync(c, tx, parent);
        await RecalculateAsync(c, tx, affected);
        return parent;
    });
    public Task<Competition> SaveCompetitionAsync(Competition value, IReadOnlyList<CompetitionParticipant>? participants = null) => TransactionAsync(async (c, tx) =>
    {
        await WriteCompetitionAsync(c, tx, value);
        if (participants is not null)
        {
            await ExecuteAsync(c, tx, "DELETE FROM competition_participants WHERE competition_id=$id", ("$id", value.Id));
            foreach (var participant in participants)
            {
                participant.CompetitionId = value.Id;
                participant.Id = 0;
                await WriteCompetitionParticipantAsync(c, tx, participant);
            }
        }

        return value;
    });
    public Task<Photo> SavePhotoAsync(Photo value) => TransactionAsync(async (c, tx) =>
    {
        var table = value.EntityType switch
        {
            "athletes" => "athletes",
            "results" => "results",
            "competitions" => "competitions",
            _ => throw new InvalidDataException("Unknown photo owner type.")
        };
        await using var exists = Command(c, tx, $"SELECT COUNT(*) FROM {table} WHERE id=$id", ("$id", value.EntityId));
        if (Convert.ToInt64(await exists.ExecuteScalarAsync()) != 1)
        {
            throw new InvalidDataException("The photo owner does not exist.");
        }

        return await WritePhotoAsync(c, tx, value);
    });
    public Task DeleteResultAsync(long id) => TransactionAsync(async (c, tx) =>
    {
        var affected = await ReadAsync(c, tx, "WITH RECURSIVE owned(id) AS (SELECT id FROM results WHERE id=$id UNION SELECT r.id FROM results r JOIN owned o ON r.combined_event_id=o.id) SELECT * FROM results WHERE id IN (SELECT id FROM owned)", ReadResult, ("$id", id));
        await DeleteResultRowsAsync(c, tx, id);
        await RecalculateAsync(c, tx, affected);
        return true;
    });
    private static async Task DeleteResultRowsAsync(SqliteConnection c, SqliteTransaction tx, long id)
    {
        await ExecuteAsync(c, tx, "WITH RECURSIVE owned(id) AS (SELECT id FROM results WHERE id=$id UNION ALL SELECT r.id FROM results r JOIN owned o ON r.combined_event_id=o.id) DELETE FROM photos WHERE entity_type='results' AND entity_id IN (SELECT id FROM owned)", ("$id", id));
        await ExecuteAsync(c, tx, "DELETE FROM results WHERE id=$id", ("$id", id));
        // Linked medals become standalone historical medals through ON DELETE SET NULL.
    }

    public Task DeleteAthleteAsync(long id) => TransactionAsync(async (c, tx) =>
    {
        await ExecuteAsync(c, tx, "DELETE FROM photos WHERE (entity_type='athletes' AND entity_id=$id) OR (entity_type='results' AND entity_id IN (SELECT id FROM results WHERE athlete_id=$id))", ("$id", id));
        await ExecuteAsync(c, tx, "DELETE FROM athletes WHERE id=$id", ("$id", id));
        return true;
    });
    public Task DeleteCompetitionAsync(long id) => TransactionAsync(async (c, tx) =>
    {
        await ExecuteAsync(c, tx, "DELETE FROM photos WHERE entity_type='competitions' AND entity_id=$id", ("$id", id));
        await ExecuteAsync(c, tx, "DELETE FROM competitions WHERE id=$id", ("$id", id));
        return true;
    });
    public Task DeletePhotoAsync(long id) => DeleteSimpleAsync("photos", id);
    private static void ValidateResult(Result value)
    {
        if (!DateOnly.TryParseExact(value.Date, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _) || !double.IsFinite(value.Value) || value.Value < 0 || value.Wind is double w && !double.IsFinite(w) || value.EquipmentWeight is double e && !double.IsFinite(e) || value.HurdleSpacing is double s && !double.IsFinite(s))
        {
            throw new InvalidDataException("Result date/numeric fields are invalid.");
        }

        if (value.Id > 0 && value.CombinedEventId == value.Id)
        {
            throw new InvalidDataException("A result cannot be its own combined parent.");
        }
    }

    private static async Task ValidateParentAsync(SqliteConnection c, SqliteTransaction tx, Result r)
    {
        if (r.Id > 0)
        {
            await using var children = Command(c, tx, "SELECT COUNT(*) FROM results WHERE combined_event_id=$id AND athlete_id<>$athlete", ("$id", r.Id), ("$athlete", r.AthleteId));
            if (Convert.ToInt64(await children.ExecuteScalarAsync()) > 0)
            {
                throw new InvalidDataException("Changing the combined parent athlete would leave children owned by another athlete.");
            }
        }

        if (r.CombinedEventId is not long parent)
        {
            return;
        }

        var ancestors = await ReadAsync(c, tx, "WITH RECURSIVE ancestors(id,combined_event_id,athlete_id) AS (SELECT id,combined_event_id,athlete_id FROM results WHERE id=$parent UNION SELECT r.id,r.combined_event_id,r.athlete_id FROM results r JOIN ancestors a ON r.id=a.combined_event_id) SELECT id,athlete_id FROM ancestors", reader => (Id: reader.GetInt64(0), Athlete: reader.GetInt64(1)), ("$parent", parent));
        if (ancestors.Count == 0 || ancestors.Any(x => x.Id == r.Id || x.Athlete != r.AthleteId))
        {
            throw new InvalidDataException("Combined parent is missing, belongs to another athlete, or creates a cycle.");
        }
    }

    private static async Task UpdateResultMedalAsync(SqliteConnection c, SqliteTransaction tx, Result r)
    {
        if (r.Type != "competition" || r.Status is not (null or "valid") || r.Placement is not (1 or 2 or 3))
        {
            await ExecuteAsync(c, tx, "UPDATE medals SET result_id=NULL WHERE result_id=$id", ("$id", r.Id));
            return;
        }

        var existing = await ReadAsync(c, tx, "SELECT * FROM medals WHERE result_id=$id", ReadMedal, ("$id", r.Id));
        if (existing.Count == 0)
        {
            existing.Add(new Medal());
        }

        foreach (var medal in existing)
        {
            medal.AthleteId = r.AthleteId;
            medal.ResultId = r.Id;
            medal.Type = r.Placement switch { 1 => "gold", 2 => "silver", _ => "bronze" };
            medal.CompetitionName = r.CompetitionName ?? "";
            medal.Location = r.Location;
            medal.DisciplineId = r.DisciplineId;
            medal.Date = r.Date;
            await WriteMedalAsync(c, tx, medal);
        }
    }

    private static async Task RecalculateAsync(SqliteConnection c, SqliteTransaction tx, List<Result> affected)
    {
        if (affected.Count == 0)
        {
            return;
        }

        var allResults = await ReadAsync(c, tx, "SELECT * FROM results", ReadResult);
        var athletes = await ReadAsync(c, tx, "SELECT * FROM athletes", ReadAthlete);
        var disciplines = await ReadAsync(c, tx, "SELECT * FROM disciplines", ReadDiscipline);
        (long Athlete, long Discipline, double? Weight, int? Height) Group(Result r)
        {
            var d = disciplines.FirstOrDefault(x => x.Id == r.DisciplineId);
            return (r.AthleteId, r.DisciplineId, d?.Category == "throws" ? r.EquipmentWeight : null, d?.Category == "hurdles" ? r.HurdleHeight : null);
        }

        var groups = affected.Select(Group).ToHashSet();
        var results = allResults.Where(r => groups.Contains(Group(r))).ToList();
        foreach (var r in RecordRules.Recalculate(results, athletes, disciplines))
        {
            await ExecuteAsync(c, tx, "UPDATE results SET is_personal_best=$pb,is_season_best=$sb WHERE id=$id", ("$pb", r.IsPersonalBest), ("$sb", r.IsSeasonBest), ("$id", r.Id));
        }

        var goalGroups = affected.Select(r => (r.AthleteId, r.DisciplineId)).ToHashSet();
        foreach (var goal in (await ReadAsync(c, tx, "SELECT * FROM goals WHERE status='active'", ReadGoal)).Where(g => goalGroups.Contains((g.AthleteId, g.DisciplineId))))
        {
            var d = disciplines.Single(x => x.Id == goal.DisciplineId);
            var achieved = allResults.Where(r => r.AthleteId == goal.AthleteId && r.DisciplineId == goal.DisciplineId && (r.Status is null or "valid") && (d.LowerIsBetter ? r.Value <= goal.TargetValue : r.Value >= goal.TargetValue)).OrderBy(r => r.Date).FirstOrDefault();
            if (achieved is not null)
            {
                await ExecuteAsync(c, tx, "UPDATE goals SET status='achieved',achieved_at=$date WHERE id=$id", ("$date", achieved.Date), ("$id", goal.Id));
            }
        }
    }

    private static async Task VerifyTableAsync(SqliteConnection c, SqliteConnection baseline, string table)
    {
        await using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT sql FROM sqlite_master WHERE type='table' AND name=$name";
        cmd.Parameters.AddWithValue("$name", table);
        var sql = (string?)await cmd.ExecuteScalarAsync() ?? throw new InvalidDataException($"Version 20 is incomplete: missing table {table}.");
        var columns = await ColumnSignaturesAsync(c, table);
        var expectedColumns = await ColumnSignaturesAsync(baseline, table);
        foreach (var (columnName, signature) in expectedColumns)
        {
            if (!columns.TryGetValue(columnName, out var actual) || actual != signature)
            {
                throw new InvalidDataException($"Version 20 has missing or incompatible column {table}.{columnName}.");
            }
        }

        var keys = await ForeignKeySignaturesAsync(c, table);
        var expectedKeys = await ForeignKeySignaturesAsync(baseline, table);
        if (!keys.SequenceEqual(expectedKeys))
        {
            throw new InvalidDataException($"Version 20 has missing or incompatible foreign keys on {table}.");
        }

        if (table == "disciplines" && sourceArray.Any(s => !sql.Contains(s)))
        {
            throw new InvalidDataException("Version 20 disciplines CHECK constraint is incomplete.");
        }
    }
}
