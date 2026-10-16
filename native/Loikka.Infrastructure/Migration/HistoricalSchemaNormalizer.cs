using Loikka.Infrastructure.Database;
using Microsoft.Data.Sqlite;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Loikka.Infrastructure.Migration;

internal static partial class HistoricalSchemaNormalizer
{
    internal static async Task<int> NormalizeAsync(SqliteConnection c)
    {
        var version = Convert.ToInt32(await ScalarAsync(c, "SELECT MAX(version) FROM _migrations"));
        if (version == 20)
        {
            await LocalDatabase.VerifySchemaAsync(c);
            return version;
        }

        ValidateVersion(version);
        if (await ScalarAsync(c, "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('results_new','competitions_new','disciplines_new','photos_old','disciplines_native_upgrade')") is string partial)
        {
            throw new InvalidDataException($"Partial legacy migration table {partial} requires manual recovery.");
        }

        if (await ScalarAsync(c, "SELECT name FROM sqlite_master WHERE name='_native_migrations'") is not null)
        {
            await LocalDatabase.VerifySchemaAsync(c);
            return version;
        }

        if (Convert.ToInt32(await ScalarAsync(c, "SELECT COUNT(*) FROM _migrations")) != version || Convert.ToInt32(await ScalarAsync(c, "SELECT MIN(version) FROM _migrations")) != 1)
        {
            throw new InvalidDataException("Historical migration history is incomplete; version relabeling is not a supported fixture or migration.");
        }

        await using var baseline = new SqliteConnection("Data Source=:memory:");
        await baseline.OpenAsync();
        await ExecuteAsync(baseline, DatabaseSchema.Sql);
        var expected = await CatalogAsync(baseline);
        var original = await CatalogAsync(c);
        ValidateCatalog(original, expected);
        var sql = (string?)await ScalarAsync(c, "SELECT sql FROM sqlite_master WHERE type='table' AND name='disciplines'") ?? throw new InvalidDataException("Legacy disciplines table is missing.");
        var constraint = CategoryConstraintRegex().Match(sql);
        if (!constraint.Success)
        {
            throw new InvalidDataException("Legacy discipline category constraint is unrecognized.");
        }

        var categories = CategoryValueRegex().Matches(constraint.Groups[1].Value).Select(x => x.Groups[1].Value).ToHashSet();
        var oldCategories = new[]
        {
            "sprints",
            "middleDistance",
            "longDistance",
            "hurdles",
            "jumps",
            "throws",
            "combined"
        };
        var allCategories = oldCategories.Concat(["walking", "crossCountry", "relays", "other"]).ToArray();
        if (!categories.SetEquals(oldCategories) && !categories.SetEquals(allCategories))
        {
            throw new InvalidDataException("Legacy discipline category constraint is unrecognized.");
        }

        var oldRows = await OriginalRowsAsync(c, original.Keys);
        var oldSequence = Convert.ToInt64(await ScalarAsync(c, "SELECT COALESCE((SELECT seq FROM sqlite_sequence WHERE name='disciplines'),0)"));
        var objects = new List<string>();
        await using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "SELECT sql FROM sqlite_master WHERE tbl_name='disciplines' AND type IN ('index','trigger') AND sql IS NOT NULL ORDER BY name";
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
            {
                objects.Add(r.GetString(0));
            }
        }

        await ExecuteAsync(c, "PRAGMA foreign_keys=OFF");
#pragma warning disable S6966 // Microsoft.Data.Sqlite async transaction APIs execute synchronously (learn.microsoft.com/dotnet/standard/data/sqlite/async).
        using (var tx = c.BeginTransaction())
#pragma warning restore S6966
        {
            // Preserve the selected source database's DDL; dynamic columns are quoted and numbers are typed integers.
            // nosemgrep: csharp.lang.security.sqli.csharp-sqli.csharp-sqli
            async Task Run(string statement)
            {
                await using var cmd = c.CreateCommand();
                cmd.Transaction = tx;
                cmd.CommandText = statement;
                await cmd.ExecuteNonQueryAsync();
            }

            var widened = sql[..constraint.Index] + "CHECK (category IN (" + string.Join(',', allCategories.Select(x => "'" + x + "'")) + "))" + sql[(constraint.Index + constraint.Length)..];
            widened = TableDeclarationRegex().Replace(widened, "CREATE TABLE disciplines_native_upgrade");
            if (!widened.StartsWith("CREATE TABLE disciplines_native_upgrade", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidDataException("Legacy discipline table declaration is unrecognized.");
            }

            var columns = new List<string>();
            await using (var cmd = c.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = "PRAGMA table_info(disciplines)";
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    columns.Add(Quote(r.GetString(1)));
                }
            }

            var names = string.Join(',', columns);
            await Run(widened);
            await Run($"INSERT INTO disciplines_native_upgrade({names}) SELECT {names} FROM disciplines");
            await Run("DROP TABLE disciplines");
            await Run("ALTER TABLE disciplines_native_upgrade RENAME TO disciplines");
            foreach (var (id, fields) in expected.Where(x => !original.ContainsKey(x.Key)))
            {
                await using var cmd = c.CreateCommand();
                cmd.Transaction = tx;
                cmd.CommandText = "INSERT INTO disciplines(id,name,full_name,category,unit,lower_is_better,icon_name) VALUES($id,$name,$full,$category,$unit,$lower,$icon)";
                cmd.Parameters.AddWithValue("$id", id);
                cmd.Parameters.AddWithValue("$name", fields[0]!);
                cmd.Parameters.AddWithValue("$full", fields[1]!);
                cmd.Parameters.AddWithValue("$category", fields[2]!);
                cmd.Parameters.AddWithValue("$unit", fields[3]!);
                cmd.Parameters.AddWithValue("$lower", int.Parse(fields[4]!, System.Globalization.CultureInfo.InvariantCulture));
                cmd.Parameters.AddWithValue("$icon", fields[5] is null ? DBNull.Value : fields[5]);
                await cmd.ExecuteNonQueryAsync();
            }

            foreach (var statement in objects)
            {
                await Run(statement);
            }

            await Run($"UPDATE sqlite_sequence SET seq={oldSequence.ToString(System.Globalization.CultureInfo.InvariantCulture)} WHERE name='disciplines'");
            await Run("CREATE TABLE _native_migrations(id INTEGER PRIMARY KEY CHECK(id=1),schema_version INTEGER NOT NULL,legacy_version INTEGER NOT NULL,description TEXT NOT NULL)");
            await Run($"INSERT INTO _native_migrations VALUES(1,20,{version},'preserve_source_history_expand_catalog_constraint_and_add_missing_catalog_ids')");
#pragma warning disable S6966 // Microsoft.Data.Sqlite async transaction APIs execute synchronously (learn.microsoft.com/dotnet/standard/data/sqlite/async).
            tx.Commit();
#pragma warning restore S6966
        }

        await ExecuteAsync(c, "PRAGMA foreign_keys=ON");
        if (!oldRows.SequenceEqual(await OriginalRowsAsync(c, original.Keys)))
        {
            throw new InvalidDataException("Historical normalization altered original discipline rows.");
        }

        await LocalDatabase.VerifySchemaAsync(c);
        return version;
    }

    private static async Task<Dictionary<long, string?[]>> CatalogAsync(SqliteConnection c)
    {
        await using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT id,name,full_name,category,unit,lower_is_better,icon_name FROM disciplines ORDER BY id";
        await using var r = await cmd.ExecuteReaderAsync();
        var values = new Dictionary<long, string?[]>();
        while (await r.ReadAsync())
        {
            values[r.GetInt64(0)] = [r.GetString(1), r.GetString(2), r.GetString(3), r.GetString(4), r.GetInt64(5).ToString(System.Globalization.CultureInfo.InvariantCulture), r.IsDBNull(6) ? null : r.GetString(6)];
        }

        return values;
    }

    private static async Task<List<string>> OriginalRowsAsync(SqliteConnection c, IEnumerable<long> originalIds)
    {
        var ids = originalIds.ToHashSet();
        await using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT * FROM disciplines ORDER BY id";
        await using var r = await cmd.ExecuteReaderAsync();
        var rows = new List<string>();
        while (await r.ReadAsync())
        {
            if (ids.Contains(r.GetInt64(r.GetOrdinal("id"))))
            {
                var fields = new object[r.FieldCount];
                r.GetValues(fields);
                rows.Add(JsonSerializer.Serialize(fields.Select(x => x is DBNull ? null : x)));
            }
        }

        return rows;
    }

    private static string Quote(string name) => "\"" + name.Replace("\"", "\"\"") + "\"";
    // Every caller supplies a constant SELECT statement.
    // nosemgrep: csharp.lang.security.sqli.csharp-sqli.csharp-sqli
    private static async Task<object?> ScalarAsync(SqliteConnection c, string sql)
    {
        await using var cmd = c.CreateCommand();
        cmd.CommandText = sql;
        var result = await cmd.ExecuteScalarAsync();
        return result is DBNull ? null : result;
    }

    // Callers supply constant PRAGMAs or the embedded DatabaseSchema.Sql.
    // nosemgrep: csharp.lang.security.sqli.csharp-sqli.csharp-sqli
    private static async Task ExecuteAsync(SqliteConnection c, string sql)
    {
        await using var cmd = c.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync();
    }

    [GeneratedRegex(@"CHECK\s*\(\s*category\s+IN\s*\(([^)]*)\)\s*\)", RegexOptions.IgnoreCase, 1000, "fi-FI")]
    private static partial Regex CategoryConstraintRegex();

    private static void ValidateCatalog(Dictionary<long, string?[]> original, Dictionary<long, string?[]> expected)
    {
        foreach (var (id, fields) in original)
        {
            if (expected.TryGetValue(id, out var current) && !fields.Take(5).SequenceEqual(current.Take(5)))
            {
                throw new InvalidDataException($"Legacy catalog identity collision at ID {id}: {fields[0]} differs from {current[0]}; source is unchanged.");
            }
        }

        foreach (var (id, fields) in expected)
        {
            if (!original.ContainsKey(id) && original.Any(x => x.Value[0] == fields[0]))
            {
                throw new InvalidDataException($"Legacy catalog name {fields[0]} already uses a different ID; source is unchanged.");
            }
        }
    }

    [GeneratedRegex("'([^']+)'", RegexOptions.None, 1000)]
    private static partial Regex CategoryValueRegex();
    [GeneratedRegex(@"^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:""disciplines""|\[disciplines\]|`disciplines`|disciplines)", RegexOptions.IgnoreCase, 1000)]
    private static partial Regex TableDeclarationRegex();

    private static void ValidateVersion(int version)
    {
        if (version < 17)
        {
            throw new InvalidDataException($"Legacy version {version} has an unsupported pre-v17 catalog: ID 21 meant Kuula and ID 22 meant Kiekko; native IDs mean 400 m aidat and Pituus. No lossless ID mapping is implemented; source is unchanged.");
        }

        if (version > 19)
        {
            throw new InvalidDataException($"Unknown legacy schema version {version}; source is unchanged.");
        }
    }
}
