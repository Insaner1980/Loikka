using Loikka.Infrastructure.Database;
using Microsoft.Data.Sqlite;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Loikka.Infrastructure.Migration;

public sealed record MigrationReport
{
    public string SourceRoot { get; init; } = "";
    public string DestinationRoot { get; init; } = "";
    public string State { get; set; } = "staging";
    public Dictionary<string, long> TableCounts { get; init; } = [];
    public Dictionary<string, string> TableHashes { get; init; } = [];
    public Dictionary<string, string> MediaHashes { get; init; } = [];
    public Dictionary<string, string> PathMap { get; init; } = [];
    public List<string> Exceptions { get; init; } = [];
    public bool PreferencesAvailable { get; set; }
    public int SourceSchemaVersion { get; set; }
    public List<string> Transformations { get; init; } = [];
}

public static class LegacyMigrationService
{
    private const string DatabaseFileName = "loikka.db";
    private const string PhotosKey = "photos";
    private static readonly JsonSerializerOptions Json = new()
    {
        WriteIndented = true
    };
    public static async Task<MigrationReport> MigrateAsync(string sourceRoot, string destinationRoot)
    {
        (sourceRoot, destinationRoot) = ValidateRoots(sourceRoot, destinationRoot);
        var sourcePath = Path.Combine(sourceRoot, DatabaseFileName);
        if (!File.Exists(sourcePath))
        {
            throw new FileNotFoundException("Legacy database was not found.", sourcePath);
        }

        var stage = destinationRoot + ".migration-stage";
        var resumed = await ResumeMigrationAsync(sourceRoot, destinationRoot, stage);
        if (resumed is not null) return resumed;
        await using var source = Open(sourcePath, SqliteOpenMode.ReadOnly);
        await source.OpenAsync();
        await using var normalized = new SqliteConnection("Data Source=:memory:");
        await normalized.OpenAsync();
        source.BackupDatabase(normalized);
        var sourceSchemaVersion = await HistoricalSchemaNormalizer.NormalizeAsync(normalized);
        await RejectForeignKeyFailuresAsync(source);
        // An immediate writer reservation prevents concurrent legacy database writes for the snapshot/copy interval.
        // Read-only mode cannot reserve a writer lock. The source data_version detects concurrent commits instead.
        var version = await ScalarAsync(source, "PRAGMA data_version");
        var report = new MigrationReport
        {
            SourceRoot = sourceRoot,
            DestinationRoot = destinationRoot,
            SourceSchemaVersion = sourceSchemaVersion
        };
        if (sourceSchemaVersion < 20)
        {
            report.Transformations.Add("Preserved legacy history and original discipline rows; widened the verified category constraint, retained sequence/indexes/triggers, added missing canonical catalog IDs and a separate native schema20 marker.");
        }

        var initial = await FingerprintsAsync(source, null);
        SetFingerprints(report, initial);
        var media = EnumerateMedia(sourceRoot).ToArray();
        long bytes = new FileInfo(sourcePath).Length * 3 + media.Sum(x => new FileInfo(x).Length) * 2;
        var drive = new DriveInfo(Path.GetPathRoot(destinationRoot)!);
        if (drive.AvailableFreeSpace < bytes)
        {
            throw new IOException("Insufficient disk space for migration staging and retained snapshot.");
        }

        Directory.CreateDirectory(stage);
        Directory.CreateDirectory(Path.Combine(stage, "migration-snapshot"));
        var snapshotPath = Path.Combine(stage, "migration-snapshot", DatabaseFileName);
        await using (var snapshot = Open(snapshotPath, SqliteOpenMode.ReadWriteCreate))
        {
            await snapshot.OpenAsync();
            source.BackupDatabase(snapshot);
        }

        File.Copy(snapshotPath, Path.Combine(stage, DatabaseFileName));
        CopyMedia(sourceRoot, stage, media, report);
        await using (var native = Open(Path.Combine(stage, DatabaseFileName), SqliteOpenMode.ReadWrite))
        {
            await native.OpenAsync();
            await HistoricalSchemaNormalizer.NormalizeAsync(native);
            await LocalDatabase.VerifySchemaAsync(native);
#pragma warning disable S6966 // Microsoft.Data.Sqlite async transaction APIs execute synchronously (learn.microsoft.com/dotnet/standard/data/sqlite/async).
            using var tx = native.BeginTransaction();
#pragma warning restore S6966
            var athleteTriggers = new List<(string Name, string Sql)>();
            await using (var triggers = native.CreateCommand())
            {
                triggers.Transaction = tx;
                triggers.CommandText = "SELECT name,sql FROM sqlite_master WHERE type='trigger' AND tbl_name='athletes'";
                await using var r = await triggers.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    athleteTriggers.Add((r.GetString(0), r.GetString(1)));
                }
            }

            foreach (var trigger in athleteTriggers)
            {
                await using var cmd = native.CreateCommand();
                cmd.Transaction = tx;
#pragma warning disable S2077 // SQLite trigger names come from sqlite_master and are quoted with embedded quotes escaped.
                cmd.CommandText = "DROP TRIGGER " + Quote(trigger.Name);
#pragma warning restore S2077
                await cmd.ExecuteNonQueryAsync();
            }

            await RemapAsync(native, tx, "athletes", "photo_path", sourceRoot, report);
            foreach (var trigger in athleteTriggers)
            {
                await using var cmd = native.CreateCommand();
                cmd.Transaction = tx;
                cmd.CommandText = trigger.Sql;
                await cmd.ExecuteNonQueryAsync();
            }

            await RemapAsync(native, tx, PhotosKey, "file_path", sourceRoot, report);
            await RemapAsync(native, tx, PhotosKey, "thumbnail_path", sourceRoot, report);
#pragma warning disable S6966 // Microsoft.Data.Sqlite async transaction APIs execute synchronously (learn.microsoft.com/dotnet/standard/data/sqlite/async).
            tx.Commit();
#pragma warning restore S6966
            await RejectForeignKeyFailuresAsync(native);
            // Compare every row/column of every table, including sqlite_sequence and dormant/unknown tables.
            var expected = await FingerprintsAsync(normalized, report.PathMap, sourceRoot);
            var actual = await FingerprintsAsync(native, null);
            if (!expected.OrderBy(x => x.Key).SequenceEqual(actual.OrderBy(x => x.Key)))
            {
                throw new InvalidDataException("All-table row/hash validation failed; staged migration was not activated.");
            }

            SetFingerprints(report, actual);
        }

        if (await ScalarAsync(source, "PRAGMA data_version") != version || !media.OrderBy(x => x).SequenceEqual(EnumerateMedia(sourceRoot).OrderBy(x => x)))
        {
            throw new IOException("Legacy data changed during migration. Close the old application and retry with a fresh staging root.");
        }

        var finalSource = await FingerprintsAsync(source, null);
        if (!initial.OrderBy(x => x.Key).SequenceEqual(finalSource.OrderBy(x => x.Key)))
        {
            throw new IOException("Legacy database changed during migration.");
        }

        foreach (var file in media)
        {
            if (Hash(file) != report.MediaHashes[Path.GetRelativePath(sourceRoot, file)])
            {
                throw new IOException("Legacy media changed before activation.");
            }
        }

        await ImportPreferencesAsync(sourceRoot, stage, report);
        report.State = "validated";
        await File.WriteAllTextAsync(Path.Combine(stage, "migration-report.json"), JsonSerializer.Serialize(report, Json));
        await source.CloseAsync();
        Directory.Move(stage, destinationRoot);
        return report;
    }

    public static string ResolveManagedPath(string root, string relative)
    {
        if (Path.IsPathRooted(relative))
        {
            throw new InvalidDataException("A managed media reference must be relative.");
        }

        var path = Path.GetFullPath(Path.Combine(root, relative));
        if (!IsInside(root, path))
        {
            throw new InvalidDataException("Media path escapes the data root.");
        }

        return path;
    }

    private static bool IsInside(string root, string path) => Path.GetFullPath(path).StartsWith(Path.TrimEndingDirectorySeparator(Path.GetFullPath(root)) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase);
    private static SqliteConnection Open(string path, SqliteOpenMode mode) => new(new SqliteConnectionStringBuilder { DataSource = path, Mode = mode, Pooling = false, ForeignKeys = true }.ToString());
    // Both callers pass the literal PRAGMA data_version statement.
    // nosemgrep: csharp.lang.security.sqli.csharp-sqli.csharp-sqli
    private static async Task<long> ScalarAsync(SqliteConnection c, string sql)
    {
        await using var cmd = c.CreateCommand();
        cmd.CommandText = sql;
        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    private static string Quote(string name) => "\"" + name.Replace("\"", "\"\"") + "\"";
    private static string Hash(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream));
    }

    private static IEnumerable<string> EnumerateMedia(string root)
    {
        foreach (var folder in new[]
        {
            PhotosKey,
            "profile_photos"
        }

        )
        {
            var path = Path.Combine(root, folder);
            if (!Directory.Exists(path))
            {
                continue;
            }

            foreach (var entry in Directory.EnumerateFileSystemEntries(path, "*", SearchOption.AllDirectories).Prepend(path))
            {
                if ((File.GetAttributes(entry) & FileAttributes.ReparsePoint) != 0)
                {
                    throw new InvalidDataException("Media symbolic links/reparse points require explicit recovery.");
                }

                if (File.Exists(entry))
                {
                    yield return entry;
                }
            }
        }
    }

    private static async Task RejectForeignKeyFailuresAsync(SqliteConnection c)
    {
        await using var cmd = c.CreateCommand();
        cmd.CommandText = "PRAGMA foreign_key_check";
        await using var r = await cmd.ExecuteReaderAsync();
        if (await r.ReadAsync())
        {
            throw new InvalidDataException($"Pre-existing foreign-key failure: {r.GetString(0)} row {r.GetValue(1)}; migration was not activated.");
        }
    }

    private static async Task<Dictionary<string, (long Count, string Hash)>> FingerprintsAsync(SqliteConnection c, Dictionary<string, string>? paths, string? sourceRoot = null)
    {
        var tables = new List<string>();
        await using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                tables.Add(r.GetString(0));
            }
        }

        var result = new Dictionary<string, (long, string)>();
        foreach (var table in tables)
        {
            var rows = new List<string>();
            await using var cmd = c.CreateCommand();
#pragma warning disable S2077 // Enumerated SQLite table names are double-quoted and embedded quotes are escaped by Quote.
            cmd.CommandText = $"SELECT * FROM {Quote(table)}";
#pragma warning restore S2077
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                var row = new List<object?>();
                for (var i = 0; i < r.FieldCount; i++)
                {
                    var value = FingerprintValue(r, i, table, paths, sourceRoot ?? Path.GetDirectoryName(c.DataSource)!);
                    row.Add(value);
                }

                rows.Add(JsonSerializer.Serialize(row));
            }

            rows.Sort(StringComparer.Ordinal);
            result[table] = (rows.Count, Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(string.Join('\n', rows)))));
        }

        return result;
    }

    private static void SetFingerprints(MigrationReport report, Dictionary<string, (long Count, string Hash)> values)
    {
        foreach (var (name, value) in values)
        {
            report.TableCounts[name] = value.Count;
            report.TableHashes[name] = value.Hash;
        }
    }

    private static async Task RemapAsync(SqliteConnection c, SqliteTransaction tx, string table, string column, string sourceRoot, MigrationReport report)
    {
        var rows = new List<(long, string)>();
        await using (var query = c.CreateCommand())
        // The three private call sites pass literal table and column names.
        // nosemgrep: csharp.lang.security.sqli.csharp-sqli.csharp-sqli
        {
            query.Transaction = tx;
#pragma warning disable S2077 // Table and column identifiers come only from the three fixed media field mappings; values are parameters.
            query.CommandText = $"SELECT id,{column} FROM {table} WHERE {column} IS NOT NULL";
#pragma warning restore S2077
            await using var r = await query.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                rows.Add((r.GetInt64(0), r.GetString(1)));
            }
        }

        foreach (var (id, path) in rows)
        {
            var key = Path.GetFullPath(Path.IsPathRooted(path) ? path : Path.Combine(sourceRoot, path));
            if (report.PathMap.TryGetValue(key, out var relative))
            // Table/column names are code literals; path and id values are bound parameters.
            // nosemgrep: csharp.lang.security.sqli.csharp-sqli.csharp-sqli
            {
                await using var cmd = c.CreateCommand();
                cmd.Transaction = tx;
#pragma warning disable S2077 // Table and column identifiers come only from the three fixed media field mappings; values are parameters.
                cmd.CommandText = $"UPDATE {table} SET {column}=$path WHERE id=$id";
#pragma warning restore S2077
                cmd.Parameters.AddWithValue("$path", relative);
                cmd.Parameters.AddWithValue("$id", id);
                await cmd.ExecuteNonQueryAsync();
            }
            else
            {
                report.Exceptions.Add($"Unresolved media reference retained: {table}.{column} row {id}: {path}");
            }
        }
    }

    private static async Task<MigrationReport?> ReadReportAsync(string root)
    {
        var path = Path.Combine(root, "migration-report.json");
        return File.Exists(path) ? JsonSerializer.Deserialize<MigrationReport>(await File.ReadAllTextAsync(path), Json) : null;
    }

    private static async Task VerifyActivatedAsync(string root, MigrationReport report)
    {
        await using var c = Open(Path.Combine(root, DatabaseFileName), SqliteOpenMode.ReadOnly);
        await c.OpenAsync();
        await LocalDatabase.VerifySchemaAsync(c);
        // Recovery of a validated stage requires exact fingerprints. Completed native roots may contain subsequent user edits.
        if (root.EndsWith(".migration-stage", StringComparison.OrdinalIgnoreCase))
        {
            var actual = await FingerprintsAsync(c, null);
            if (actual.Any(x => !report.TableHashes.TryGetValue(x.Key, out var hash) || hash != x.Value.Hash) || actual.Count != report.TableHashes.Count)
            {
                throw new InvalidDataException("Validated staging database changed before activation.");
            }

            foreach (var pair in report.MediaHashes)
            {
                if (Hash(ResolveManagedPath(root, pair.Key)) != pair.Value)
                {
                    throw new InvalidDataException("Validated staged media changed before activation.");
                }
            }
        }
    }

    private static async Task ImportPreferencesAsync(string source, string stage, MigrationReport report)
    {
        var file = Path.Combine(source, "loikka-preferences.json");
        if (!File.Exists(file))
        {
            report.Exceptions.Add("Legacy preferences bridge is unavailable; preference preservation is unverified.");
            return;
        }

        using var doc = JsonDocument.Parse(await File.ReadAllTextAsync(file));
        var root = doc.RootElement;
        if (root.GetProperty("format").GetString() != "loikka-preferences" || root.GetProperty("version").GetInt32() != 1)
        {
            throw new InvalidDataException("Unsupported legacy preferences bridge.");
        }

        var values = root.GetProperty("values");
        var imported = new Dictionary<string, JsonElement>();
        foreach (var key in new[]
        {
            "loikka-celebrated-goals",
            "loikka-backups-expanded",
            "autoSyncEnabled"
        }

        )
        {
            if (!values.TryGetProperty(key, out var item) || item.ValueKind == JsonValueKind.Null)
            {
                continue;
            }

            try
            {
                imported[key] = ParsePreference(key, item);
            }
            catch (Exception e) when (e is JsonException or InvalidDataException or InvalidOperationException)
            {
                report.Exceptions.Add($"Malformed legacy preference retained in snapshot: {key}.");
            }
        }

        File.Copy(file, Path.Combine(stage, "migration-snapshot", "loikka-preferences.json"));
        await File.WriteAllTextAsync(Path.Combine(stage, "native-preferences.json"), JsonSerializer.Serialize(imported, Json));
        report.PreferencesAvailable = true;
    }

    private static async Task<MigrationReport?> ResumeMigrationAsync(string sourceRoot, string destinationRoot, string stage)
    {
        if (Directory.Exists(destinationRoot))
        {
            var completed = await ReadReportAsync(destinationRoot);
            if (completed?.State == "validated" && completed.SourceRoot == sourceRoot)
            {
                await VerifyActivatedAsync(destinationRoot, completed);
                return completed;
            }

            throw new InvalidOperationException("Native destination already exists; automatic migration never merges or replaces it.");
        }

        if (Directory.Exists(stage))
        {
            var pending = await ReadReportAsync(stage);
            if (pending?.State == "validated" && pending.SourceRoot == sourceRoot && pending.DestinationRoot == destinationRoot)
            {
                await VerifyActivatedAsync(stage, pending);
                Directory.Move(stage, destinationRoot);
                return pending;
            }

            throw new InvalidOperationException("An interrupted unvalidated migration stage exists. Preserve it for inspection; destination and source were not modified.");
        }
        return null;
    }

    private static void CopyMedia(string sourceRoot, string stage, string[] media, MigrationReport report)
    {
        foreach (var file in media)
        {
            var relative = Path.GetRelativePath(sourceRoot, file);
            var target = Path.Combine(stage, relative);
            var before = Hash(file);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.Copy(file, target);
            if (before != Hash(target) || before != Hash(file))
            {
                throw new IOException($"Media changed while copying: {relative}.");
            }

            report.MediaHashes[relative] = before;
            report.PathMap[Path.GetFullPath(file)] = relative;
        }
    }

    private static object? FingerprintValue(SqliteDataReader reader, int index, string table, Dictionary<string, string>? paths, string sourceRoot)
    {
        var value = reader.GetValue(index);
        if (value is DBNull) return null;
        if (paths is null || value is not string text) return value;
        bool media = table == "athletes" && reader.GetName(index) == "photo_path" || table == PhotosKey && reader.GetName(index) is "file_path" or "thumbnail_path";
        if (!media) return value;
        var key = Path.GetFullPath(Path.IsPathRooted(text) ? text : Path.Combine(sourceRoot, text));
        return paths.TryGetValue(key, out var relative) ? relative : value;
    }

    private static JsonElement ParsePreference(string key, JsonElement item)
    {
        using var parsed = JsonDocument.Parse(item.GetString()!);
        var value = parsed.RootElement;
        if (key == "loikka-celebrated-goals")
        {
            if (value.ValueKind != JsonValueKind.Array || value.EnumerateArray().Any(x => !x.TryGetInt64(out var id) || id <= 0))
            {
                throw new InvalidDataException();
            }
        }
        else if (value.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
        {
            throw new InvalidDataException();
        }

        return value.Clone();
    }

    private static (string Source, string Destination) ValidateRoots(string sourceRoot, string destinationRoot)
    {
        if (!Path.IsPathFullyQualified(sourceRoot) || !Path.IsPathFullyQualified(destinationRoot))
        {
            throw new ArgumentException("Explicit absolute source and destination roots are required.");
        }

        sourceRoot = Path.GetFullPath(sourceRoot);
        destinationRoot = Path.GetFullPath(destinationRoot);
        if (IsInside(sourceRoot, destinationRoot) || IsInside(destinationRoot, sourceRoot) || sourceRoot.Equals(destinationRoot, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Legacy and native roots must be separate and non-nested.");
        }
        return (sourceRoot, destinationRoot);
    }
}
