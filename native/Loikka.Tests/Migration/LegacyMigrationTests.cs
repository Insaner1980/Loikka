using Loikka.Core.Models;
using Loikka.Infrastructure.Database;
using Loikka.Infrastructure.Migration;
using Microsoft.Data.Sqlite;
using System.Security.Cryptography;
using System.Text.Json;

namespace Loikka.Tests.Migration;

[TestClass]
public sealed class LegacyMigrationTests
{
    private string root = null!, source = null!, destination = null!;
    private LocalDatabase db = null!;
    [TestInitialize]
    public async Task Setup()
    {
        root = Path.Combine(Path.GetTempPath(), "Loikka-migration-test-" + Guid.NewGuid());
        source = Path.Combine(root, "source");
        destination = Path.Combine(root, "native");
        db = new(source);
        await db.InitializeAsync();
    }

    [TestCleanup]
    public void Cleanup()
    {
        if (Directory.Exists(root))
        {
            Directory.Delete(root, true);
        }
    }

    // Only literal fixture SQL reaches this helper, using the isolated synthetic source database.
    // nosemgrep: csharp.lang.security.sqli.csharp-sqli.csharp-sqli
    private async Task SqlAsync(string sql)
    {
        await using var c = new SqliteConnection($"Data Source={db.DatabasePath};Pooling=False");
        await c.OpenAsync(TestContext.CancellationToken);
        await using var cmd = c.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync(TestContext.CancellationToken);
    }

    private static string Hash(string file) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(file)));
    private async Task AddMediaAsync()
    {
        var relative = Path.Combine("photos", "athletes", "1", "ä original.png");
        var file = Path.Combine(source, relative);
        Directory.CreateDirectory(Path.GetDirectoryName(file)!);
        await File.WriteAllBytesAsync(file, [1, 2, 3, 4], TestContext.CancellationToken);
        var a = await db.SaveAthleteAsync(new() { Id = 1, FirstName = "Fixture", LastName = "Only", BirthYear = 2010, Gender = "P", PhotoPath = file });
        await db.SavePhotoAsync(new() { EntityType = "athletes", EntityId = a.Id, FilePath = file, OriginalName = "ä original.png", ThumbnailPath = "photos/missing-thumb.jpg", SizeBytes = 4 });
    }

    [TestMethod]
    public async Task CopiesFullSchemaUnknownRowsMediaAndSequenceWithoutChangingSource()
    {
        await AddMediaAsync();
        await SqlAsync("CREATE TABLE dormant_custom(id INTEGER PRIMARY KEY AUTOINCREMENT,payload BLOB); INSERT INTO dormant_custom(id,payload) VALUES(99,X'0102'); INSERT INTO notes(content,pinned) VALUES('fixture note',1)");
        var before = Hash(db.DatabasePath);
        var report = await LegacyMigrationService.MigrateAsync(source, destination);
        Assert.AreEqual(before, Hash(db.DatabasePath));
        Assert.AreEqual(1L, report.TableCounts["dormant_custom"]);
        Assert.AreEqual(1L, report.TableCounts["notes"]);
        Assert.IsTrue(File.Exists(Path.Combine(destination, "migration-snapshot", "loikka.db")));
        var target = new LocalDatabase(destination);
        var athlete = (await target.GetAthletesAsync()).Single();
        Assert.IsFalse(Path.IsPathRooted(athlete.PhotoPath!));
        Assert.AreEqual(4L, new FileInfo(LegacyMigrationService.ResolveManagedPath(destination, athlete.PhotoPath!)).Length);
        Assert.ContainsSingle(x => x.Contains("missing-thumb"), report.Exceptions);
    }

    [TestMethod]
    public async Task SourceDerivedConsolidatedVersion20FixtureMigratesWithoutReplayingOldSchemas()
    {
        var fixtures = Path.Combine(AppContext.BaseDirectory, "Fixtures", "LegacyV20");
        var schema = await File.ReadAllTextAsync(Path.Combine(fixtures, "schema.sql"), TestContext.CancellationToken);
        var seed = await File.ReadAllTextAsync(Path.Combine(fixtures, "seed_disciplines.sql"), TestContext.CancellationToken);
        var notes = await File.ReadAllTextAsync(Path.Combine(fixtures, "notes.sql"), TestContext.CancellationToken);
        var independent = Path.Combine(root, "source-derived");
        Directory.CreateDirectory(independent);
        await using (var c = new SqliteConnection($"Data Source={Path.Combine(independent, "loikka.db")};Pooling=False"))
        {
            await c.OpenAsync(TestContext.CancellationToken);
            await using var cmd = c.CreateCommand();
            cmd.CommandText = schema + ";" + seed + ";" + notes + ";ALTER TABLE results ADD COLUMN sub_results TEXT;ALTER TABLE results ADD COLUMN combined_event_id INTEGER REFERENCES results(id) ON DELETE CASCADE;CREATE TABLE _migrations(version INTEGER PRIMARY KEY,description TEXT NOT NULL,applied_at TEXT NOT NULL DEFAULT(datetime('now')));INSERT INTO _migrations(version,description) VALUES(20,'synthetic_source_consolidated_v20');INSERT INTO notes(content,pinned)VALUES('source fixture',1);";
            await cmd.ExecuteNonQueryAsync(TestContext.CancellationToken);
        }

        var report = await LegacyMigrationService.MigrateAsync(independent, destination);
        Assert.AreEqual(54L, report.TableCounts["disciplines"]);
        Assert.AreEqual(1L, report.TableCounts["notes"]);
    }

    [TestMethod]
    public async Task FutureVersionRejectsWithoutDestinationOrSourceChanges()
    {
        await SqlAsync("INSERT INTO _migrations(version,description) VALUES(21,'future fixture')");
        var before = Hash(db.DatabasePath);
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() => LegacyMigrationService.MigrateAsync(source, destination));
        Assert.AreEqual(before, Hash(db.DatabasePath));
        Assert.IsFalse(Directory.Exists(destination));
        Assert.IsFalse(Directory.Exists(destination + ".migration-stage"));
    }

    [TestMethod]
    public async Task OldVersionRejectsWithoutPretendingHistoricalSupport()
    {
        await SqlAsync("UPDATE _migrations SET version=19");
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() => LegacyMigrationService.MigrateAsync(source, destination));
        Assert.IsFalse(Directory.Exists(destination));
    }

    [TestMethod]
    public async Task PartialVersion20RejectsBeforeCreatingStage()
    {
        await SqlAsync("CREATE TABLE results_new(id INTEGER PRIMARY KEY)");
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() => LegacyMigrationService.MigrateAsync(source, destination));
        Assert.IsFalse(Directory.Exists(destination + ".migration-stage"));
    }

    [TestMethod]
    public async Task MislabelledVersion20MissingColumnsRejectsBeforeCreatingStage()
    {
        await SqlAsync("ALTER TABLE photos DROP COLUMN event_name");
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() => LegacyMigrationService.MigrateAsync(source, destination));
        Assert.IsFalse(Directory.Exists(destination + ".migration-stage"));
    }

    [TestMethod]
    public async Task MislabelledVersion20MissingForeignKeysRejectsBeforeStage()
    {
        await SqlAsync("ALTER TABLE goals RENAME TO old_goals;CREATE TABLE goals AS SELECT * FROM old_goals;DROP TABLE old_goals");
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() => LegacyMigrationService.MigrateAsync(source, destination));
        Assert.IsFalse(Directory.Exists(destination + ".migration-stage"));
    }

    [TestMethod]
    public async Task ValidatedInterruptedActivationRecoversAndRepeatedRunDoesNotDuplicate()
    {
        await AddMediaAsync();
        await LegacyMigrationService.MigrateAsync(source, destination);
        Directory.Move(destination, destination + ".migration-stage");
        await LegacyMigrationService.MigrateAsync(source, destination);
        await LegacyMigrationService.MigrateAsync(source, destination);
        Assert.HasCount(1, await new LocalDatabase(destination).GetAthletesAsync());
        Assert.IsFalse(Directory.Exists(destination + ".migration-stage"));
    }

    [TestMethod]
    public async Task UnvalidatedStageAndExistingDestinationAreNeverOverwritten()
    {
        Directory.CreateDirectory(destination + ".migration-stage");
        await File.WriteAllTextAsync(Path.Combine(destination + ".migration-stage", "retained.txt"), "fixture", TestContext.CancellationToken);
        await Assert.ThrowsExactlyAsync<InvalidOperationException>(() => LegacyMigrationService.MigrateAsync(source, destination));
        Assert.IsTrue(File.Exists(Path.Combine(destination + ".migration-stage", "retained.txt")));
    }

    [TestMethod]
    public async Task ImportsOnlyThreeSettingsAndExcludesCredentialFile()
    {
        await File.WriteAllTextAsync(Path.Combine(source, "google_tokens.json"), "synthetic forbidden marker", TestContext.CancellationToken);
        await File.WriteAllTextAsync(Path.Combine(source, "loikka-preferences.json"), """{"format":"loikka-preferences","version":1,"values":{"loikka-celebrated-goals":"[3,7]","loikka-backups-expanded":"bad","autoSyncEnabled":"false"}}""", TestContext.CancellationToken);
        var report = await LegacyMigrationService.MigrateAsync(source, destination);
        Assert.IsTrue(report.PreferencesAvailable);
        Assert.Contains(x => x.Contains("loikka-backups-expanded"), report.Exceptions);
        Assert.IsEmpty(Directory.EnumerateFiles(destination, "google_tokens.json", SearchOption.AllDirectories));
        using var settings = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(destination, "native-preferences.json"), TestContext.CancellationToken));
        Assert.HasCount(2, settings.RootElement.EnumerateObject());
        Assert.IsFalse(settings.RootElement.GetProperty("autoSyncEnabled").GetBoolean());
    }

    [TestMethod]
    public void RejectsRelativeRootAndEscapingManagedPath()
    {
        Assert.ThrowsExactly<ArgumentException>(() => new LocalDatabase("relative"));
        Assert.ThrowsExactly<InvalidDataException>(() => LegacyMigrationService.ResolveManagedPath(source, "../outside.png"));
    }

    public TestContext TestContext { get; set; }
}
