using Loikka.Infrastructure.Database;
using Loikka.Infrastructure.Migration;
using Microsoft.Data.Sqlite;
using System.Security.Cryptography;

namespace Loikka.Tests.Migration;

[TestClass]
public sealed class HistoricalSchemaTests
{
    private string root = null!, source = null!, destination = null!;
    [TestInitialize]
    public void Setup()
    {
        root = Path.Combine(Path.GetTempPath(), "Loikka-historical-test-" + Guid.NewGuid());
        source = Path.Combine(root, "source");
        destination = Path.Combine(root, "native");
        Directory.CreateDirectory(source);
    }

    [TestCleanup]
    public void Cleanup()
    {
        if (Directory.Exists(root))
        {
            Directory.Delete(root, true);
        }
    }

    private async Task FixtureAsync(int version, bool newInstall = false)
    {
        var fixtures = Path.Combine(AppContext.BaseDirectory, "Fixtures", "Historical");
        await using var c = new SqliteConnection($"Data Source={Path.Combine(source, "loikka.db")};Pooling=False;Foreign Keys=True");
        await c.OpenAsync(TestContext.CancellationToken);
        await using var cmd = c.CreateCommand();
        cmd.CommandText = await File.ReadAllTextAsync(Path.Combine(fixtures, newInstall ? "v14-newinstall-base.sql" : "v14-base.sql"), TestContext.CancellationToken);
        await cmd.ExecuteNonQueryAsync(TestContext.CancellationToken);
        for (var step = 15; step <= version; step++)
        {
            cmd.CommandText = await File.ReadAllTextAsync(Path.Combine(fixtures, $"v{step}.sql"), TestContext.CancellationToken);
            await cmd.ExecuteNonQueryAsync(TestContext.CancellationToken);
        }

        cmd.CommandText = "ALTER TABLE disciplines ADD COLUMN custom_tag TEXT DEFAULT 'legacy';CREATE INDEX custom_discipline_tag ON disciplines(custom_tag);CREATE TABLE dormant_custom(id INTEGER PRIMARY KEY,payload BLOB);INSERT INTO dormant_custom VALUES(77,X'ABCD');INSERT INTO athletes(id,first_name,last_name,birth_year,gender)VALUES(1,'Synthetic','Fixture',2010,'P');INSERT INTO notes(id,content,athlete_id,pinned)VALUES(9,'retain note',1,1);INSERT INTO results(id,athlete_id,discipline_id,date,value,type,is_personal_best,is_season_best)VALUES(101,1,22,'2026-07-01',3.45,'competition',0,1);UPDATE sqlite_sequence SET seq=900 WHERE name='disciplines';CREATE TRIGGER custom_discipline_update AFTER UPDATE ON disciplines BEGIN UPDATE dormant_custom SET payload=X'FFFF' WHERE id=77;END;";
        await cmd.ExecuteNonQueryAsync(TestContext.CancellationToken);
    }

    private static string Hash(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)));
    [TestMethod]
    [DataRow(17, false)]
    [DataRow(18, false)]
    [DataRow(19, false)]
    [DataRow(17, true)]
    [DataRow(18, true)]
    [DataRow(19, true)]
    public async Task ReplayedSupportedPrefixNormalizesWithoutChangingHistoryRowsFlagsOrUnknownData(int version, bool newInstall)
    {
        await FixtureAsync(version, newInstall);
        var before = Hash(Path.Combine(source, "loikka.db"));
        await LegacyMigrationService.MigrateAsync(source, destination);
        Assert.AreEqual(before, Hash(Path.Combine(source, "loikka.db")));
        var db = new LocalDatabase(destination);
        await db.InitializeAsync();
        Assert.HasCount(54, await db.GetDisciplinesAsync());
        var result = (await db.GetResultsAsync()).Single();
        Assert.AreEqual(101L, result.Id);
        Assert.IsFalse(result.IsPersonalBest);
        Assert.IsTrue(result.IsSeasonBest);
        Assert.AreEqual(22L, result.DisciplineId);
        await using var c = new SqliteConnection($"Data Source={db.DatabasePath};Pooling=False");
        await c.OpenAsync(TestContext.CancellationToken);
        await using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT MAX(version) FROM _migrations";
        Assert.AreEqual((long)version, await cmd.ExecuteScalarAsync(TestContext.CancellationToken));
        cmd.CommandText = "SELECT COUNT(*) FROM _migrations";
        Assert.AreEqual((long)version, await cmd.ExecuteScalarAsync(TestContext.CancellationToken));
        cmd.CommandText = "SELECT custom_tag FROM disciplines WHERE id=22";
        Assert.AreEqual("legacy", await cmd.ExecuteScalarAsync(TestContext.CancellationToken));
        cmd.CommandText = "SELECT hex(payload) FROM dormant_custom WHERE id=77";
        Assert.AreEqual("ABCD", await cmd.ExecuteScalarAsync(TestContext.CancellationToken));
        cmd.CommandText = "SELECT content FROM notes WHERE id=9";
        Assert.AreEqual("retain note", await cmd.ExecuteScalarAsync(TestContext.CancellationToken));
        cmd.CommandText = "SELECT seq FROM sqlite_sequence WHERE name='disciplines'";
        Assert.AreEqual(900L, await cmd.ExecuteScalarAsync(TestContext.CancellationToken));
        cmd.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE name IN ('custom_discipline_tag','custom_discipline_update')";
        Assert.AreEqual(2L, await cmd.ExecuteScalarAsync(TestContext.CancellationToken));
    }

    [TestMethod]
    [DataRow(14)]
    [DataRow(15)]
    [DataRow(16)]
    public async Task PreReseedCatalogIdentityConflictsRejectWithoutModifyingSourceOrDestination(int version)
    {
        await FixtureAsync(version);
        var before = Hash(Path.Combine(source, "loikka.db"));
        var error = await Assert.ThrowsExactlyAsync<InvalidDataException>(() => LegacyMigrationService.MigrateAsync(source, destination));
        Assert.Contains("catalog", error.Message);
        Assert.AreEqual(before, Hash(Path.Combine(source, "loikka.db")));
        Assert.IsFalse(Directory.Exists(destination));
        Assert.IsFalse(Directory.Exists(destination + ".migration-stage"));
    }

    [TestMethod]
    public async Task SupportedVersionWithConflictingCanonicalIdRejectsBeforeStaging()
    {
        await FixtureAsync(17);
        await using (var c = new SqliteConnection($"Data Source={Path.Combine(source, "loikka.db")};Pooling=False"))
        {
            await c.OpenAsync(TestContext.CancellationToken);
            await using var cmd = c.CreateCommand();
            cmd.CommandText = "UPDATE disciplines SET name='Custom collision' WHERE id=22";
            await cmd.ExecuteNonQueryAsync(TestContext.CancellationToken);
        }

        var before = Hash(Path.Combine(source, "loikka.db"));
        var error = await Assert.ThrowsExactlyAsync<InvalidDataException>(() => LegacyMigrationService.MigrateAsync(source, destination));
        Assert.Contains("collision", error.Message);
        Assert.AreEqual(before, Hash(Path.Combine(source, "loikka.db")));
        Assert.IsFalse(Directory.Exists(destination + ".migration-stage"));
    }

    [TestMethod]
    public async Task SupportedVersionWithStructuralPartialTableRejectsBeforeStaging()
    {
        await FixtureAsync(19);
        await using (var c = new SqliteConnection($"Data Source={Path.Combine(source, "loikka.db")};Pooling=False"))
        {
            await c.OpenAsync(TestContext.CancellationToken);
            await using var cmd = c.CreateCommand();
            cmd.CommandText = "ALTER TABLE results RENAME TO results_new";
            await cmd.ExecuteNonQueryAsync(TestContext.CancellationToken);
        }

        var before = Hash(Path.Combine(source, "loikka.db"));
        var error = await Assert.ThrowsExactlyAsync<InvalidDataException>(() => LegacyMigrationService.MigrateAsync(source, destination));
        Assert.Contains("Partial", error.Message);
        Assert.AreEqual(before, Hash(Path.Combine(source, "loikka.db")));
        Assert.IsFalse(Directory.Exists(destination + ".migration-stage"));
    }

    public TestContext TestContext { get; set; }
}
