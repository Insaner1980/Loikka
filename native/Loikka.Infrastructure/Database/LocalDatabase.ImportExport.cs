using Loikka.Core.Models;
using Microsoft.Data.Sqlite;
using System.Text.Json;

namespace Loikka.Infrastructure.Database;

public sealed partial class LocalDatabase
{
    public Task<ExportData> ExportAsync() => TransactionAsync(async (c, tx) => new ExportData { Version = "1.0.0", ExportedAt = DateTime.UtcNow.ToString("O"), Athletes = await ReadAsync(c, tx, "SELECT * FROM athletes ORDER BY id", ReadAthlete), Results = await ReadAsync(c, tx, "SELECT * FROM results ORDER BY id", ReadResult), Competitions = await ReadAsync(c, tx, "SELECT * FROM competitions ORDER BY id", ReadCompetition), Goals = await ReadAsync(c, tx, "SELECT * FROM goals ORDER BY id", ReadGoal), Medals = await ReadAsync(c, tx, "SELECT * FROM medals ORDER BY id", ReadMedal) });
    public async Task ExportFileAsync(string path) => await File.WriteAllTextAsync(path, JsonSerializer.Serialize(await ExportAsync(), LegacyJson.Options));
    public async Task ImportFileAsync(string path)
    {
        var json = await File.ReadAllTextAsync(path);
        using var document = JsonDocument.Parse(json);
        foreach (var collection in new[]
        {
            "athletes",
            "results",
            "competitions",
            "goals",
            "medals"
        }

        )
        {
            if (!document.RootElement.TryGetProperty(collection, out var value) || value.ValueKind != JsonValueKind.Array)
            {
                throw new InvalidDataException($"Missing or invalid {collection} collection.");
            }
        }

        var data = JsonSerializer.Deserialize<ExportData>(json, LegacyJson.Options) ?? throw new InvalidDataException("Empty JSON export.");
        await ImportAsync(data);
    }

    public async Task ImportAsync(ExportData data)
    {
        ValidateImport(data);
        await ValidateImportReferencesAsync(data);
        await BackupBeforeImportAsync();
        await TransactionAsync(async (c, tx) =>
        {
            await ExecuteAsync(c, tx, "PRAGMA defer_foreign_keys=ON");
            foreach (var row in data.Athletes)
            {
                await WriteAthleteAsync(c, tx, row);
            }

            foreach (var row in data.Competitions)
            {
                await WriteCompetitionAsync(c, tx, row);
            }

            foreach (var row in data.Results)
            {
                await WriteResultAsync(c, tx, row);
            }

            foreach (var row in data.Goals)
            {
                await WriteGoalAsync(c, tx, row);
            }

            foreach (var row in data.Medals)
            {
                await WriteMedalAsync(c, tx, row);
            }

            foreach (var row in data.Results)
            {
                await ValidateParentAsync(c, tx, row);
            }

            await using var fk = Command(c, tx, "PRAGMA foreign_key_check");
            await using (var reader = await fk.ExecuteReaderAsync())
                if (await reader.ReadAsync())
                {
                    throw new InvalidDataException($"Import contains an unresolved relationship in {reader.GetString(0)} row {reader.GetValue(1)}.");
                }

            return true;
        });
    }

    private async Task BackupBeforeImportAsync()
    {
        var directory = Path.Combine(RootPath, "backups");
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, $"pre-import-{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.db");
        await CreateSnapshotAsync(path);
    }

    public async Task CreateSnapshotAsync(string destinationPath)
    {
        if (!Path.IsPathFullyQualified(destinationPath))
        {
            throw new ArgumentException("An absolute snapshot destination is required.");
        }

        if (File.Exists(destinationPath))
        {
            throw new IOException("Snapshot destination already exists.");
        }

        Directory.CreateDirectory(Path.GetDirectoryName(destinationPath)!);
        await using var source = await OpenAsync();
        await using var backup = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = destinationPath, Pooling = false }.ToString());
        await backup.OpenAsync();
        source.BackupDatabase(backup);
    }

    private async Task ValidateImportReferencesAsync(ExportData data)
    {
        await using var c = await OpenAsync();
        var athletes = (await ReadAsync(c, null, "SELECT * FROM athletes", ReadAthlete)).Select(x => x.Id).Concat(data.Athletes.Select(x => x.Id)).ToHashSet();
        var disciplines = (await ReadAsync(c, null, "SELECT * FROM disciplines", ReadDiscipline)).Select(x => x.Id).ToHashSet();
        var competitions = (await ReadAsync(c, null, "SELECT * FROM competitions", ReadCompetition)).Select(x => x.Id).Concat(data.Competitions.Select(x => x.Id)).ToHashSet();
        var results = (await ReadAsync(c, null, "SELECT * FROM results", ReadResult)).ToDictionary(x => x.Id);
        foreach (var r in data.Results)
        {
            results[r.Id] = r;
        }

        ValidateResultReferences(results, athletes, disciplines);
        if (data.Goals.FirstOrDefault(g => !athletes.Contains(g.AthleteId) || !disciplines.Contains(g.DisciplineId)) is { } g)
        {
            throw new InvalidDataException($"Goal {g.Id} has an unknown athlete or discipline.");
        }

        foreach (var m in data.Medals)
        {
            if (!athletes.Contains(m.AthleteId) || m.ResultId is long r && !results.ContainsKey(r) || m.CompetitionId is long k && !competitions.Contains(k) || m.DisciplineId is long d && !disciplines.Contains(d))
            {
                throw new InvalidDataException($"Medal {m.Id} has an unresolved reference.");
            }
        }
    }

    private static void ValidateImport(ExportData data)
    {
        if (data.Version != "1.0.0")
        {
            throw new InvalidDataException("Only legacy JSON version 1.0.0 is supported.");
        }

        if (data.Athletes is null || data.Results is null || data.Competitions is null || data.Goals is null || data.Medals is null)
        {
            throw new InvalidDataException("All five entity collections are required.");
        }

        if (data.AdditionalData?.Count > 0)
        {
            throw new InvalidDataException("Unknown export metadata cannot be persisted losslessly.");
        }

        static void Ids<T>(IEnumerable<T> rows, Func<T, long> key)
        {
            var ids = rows.Select(key).ToArray();
            if (ids.Any(x => x <= 0) || ids.Distinct().Count() != ids.Length)
            {
                throw new InvalidDataException("Imported IDs must be positive and unique within each collection.");
            }
        }







        Ids(data.Athletes, x => x.Id);
        Ids(data.Results, x => x.Id);
        Ids(data.Competitions, x => x.Id);
        Ids(data.Goals, x => x.Id);
        Ids(data.Medals, x => x.Id);
        ValidateImportedAthletes(data);
        ValidateImportedResults(data);
        ValidateImportedCompetitions(data);
        ValidateImportedGoals(data);
        ValidateImportedMedals(data);
        var results = data.Results.ToDictionary(x => x.Id);
        foreach (var r in data.Results)
        {
            var seen = new HashSet<long>
            {
                r.Id
            };
            var item = r;
            while (item.CombinedEventId is long parent && results.TryGetValue(parent, out item!))
            {
                if (!seen.Add(parent))
                {
                    throw new InvalidDataException("Combined results contain a cycle.");
                }
            }
        }
    }

    private static void ValidateResultReferences(Dictionary<long, Result> results, HashSet<long> athletes, HashSet<long> disciplines)
    {
        foreach (var r in results.Values)
        {
            if (!athletes.Contains(r.AthleteId) || !disciplines.Contains(r.DisciplineId))
            {
                throw new InvalidDataException($"Result {r.Id} refers to an unknown athlete or discipline.");
            }

            var seen = new HashSet<long>
            {
                r.Id
            };
            var current = r;
            while (current.CombinedEventId is long parent)
            {
                if (!results.TryGetValue(parent, out current!))
                {
                    throw new InvalidDataException($"Result {r.Id} has a missing combined parent.");
                }

                if (!seen.Add(parent) || current.AthleteId != r.AthleteId)
                {
                    throw new InvalidDataException($"Result {r.Id} has cyclic or cross-athlete combined relationships.");
                }
            }
        }
    }

    private static void ValidateImportedAthletes(ExportData data)
    {
        foreach (var a in data.Athletes)
        {
            if (string.IsNullOrWhiteSpace(a.FirstName) || string.IsNullOrWhiteSpace(a.LastName) || a.BirthYear < 1900 || a.BirthYear > 2100 || a.Gender is not ("T" or "P"))
            {
                throw new InvalidDataException("Invalid athlete.");
            }

            ValidateImportMetadata(a.AdditionalData);
        }
    }

    private static void ValidateImportedResults(ExportData data)
    {
        foreach (var r in data.Results)
        {
            ValidateResult(r);
            ValidateImportMetadata(r.AdditionalData);
            ValidateImportLevel(r.CompetitionLevel);
            if (r.Type is not ("competition" or "training") || r.Status is not (null or "valid" or "nm" or "dns" or "dnf" or "dq"))
            {
                throw new InvalidDataException("Invalid result type/status.");
            }
        }
    }

    private static void ValidateImportedCompetitions(ExportData data)
    {
        foreach (var c in data.Competitions)
        {
            ValidateImportDate(c.Date);
            ValidateImportDate(c.EndDate, true);
            ValidateImportLevel(c.Level);
            ValidateImportMetadata(c.AdditionalData);
            if (string.IsNullOrWhiteSpace(c.Name))
            {
                throw new InvalidDataException("Competition name is required.");
            }
        }
    }

    private static void ValidateImportedGoals(ExportData data)
    {
        foreach (var g in data.Goals)
        {
            ValidateImportDate(g.TargetDate, true);
            ValidateImportMetadata(g.AdditionalData);
            if (!double.IsFinite(g.TargetValue) || g.TargetValue < 0 || g.Status is not ("active" or "achieved" or "abandoned"))
            {
                throw new InvalidDataException("Invalid goal.");
            }
        }
    }

    private static void ValidateImportedMedals(ExportData data)
    {
        foreach (var m in data.Medals)
        {
            ValidateImportDate(m.Date);
            ValidateImportMetadata(m.AdditionalData);
            if (m.Type is not ("gold" or "silver" or "bronze"))
            {
                throw new InvalidDataException("Invalid medal.");
            }
        }
    }

    private static void ValidateImportDate(string? date, bool optional = false)
    {
        if (date is null && optional)
        {
            return;
        }

        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _))
        {
            throw new InvalidDataException("Invalid ISO date.");
        }
    }

    private static void ValidateImportLevel(string? value)
    {
        if (value is not (null or "seurakisat" or "koululaiskisat" or "seuran_sisaiset" or "seuraottelut" or "piirikisat" or "pm" or "hallikisat" or "aluekisat" or "pohjola_seuracup" or "sm" or "muu"))
        {
            throw new InvalidDataException("Invalid competition level.");
        }
    }

    private static void ValidateImportMetadata(Dictionary<string, JsonElement>? values)
    {
        if (values?.Count > 0)
        {
            throw new InvalidDataException("Unknown optional entity metadata cannot be persisted losslessly.");
        }
    }
}
