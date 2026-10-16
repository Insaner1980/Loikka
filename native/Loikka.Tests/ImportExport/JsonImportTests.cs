using Loikka.Core.Models;
using Loikka.Infrastructure.Database;
using Microsoft.Data.Sqlite;

namespace Loikka.Tests.ImportExport;

[TestClass]
public sealed class JsonImportTests
{
    private string root = null!;
    private LocalDatabase db = null!;
    [TestInitialize]
    public async Task Setup()
    {
        root = Path.Combine(Path.GetTempPath(), "Loikka-import-test-" + Guid.NewGuid());
        db = new(root);
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

    [TestMethod]
    public async Task ZeroTargetHistoricalGoalIsPreserved()
    {
        var data = new ExportData
        {
            Version = "1.0.0",
            Athletes = [new()
            {
                Id = 7,
                FirstName = "Fixture",
                LastName = "Only",
                Gender = "P",
                BirthYear = 2010
            }

            ],
            Goals = [new()
            {
                Id = 8,
                AthleteId = 7,
                DisciplineId = 3,
                TargetValue = 0,
                Status = "active"
            }

            ]
        };
        await db.ImportAsync(data);
        Assert.AreEqual(0d, (await db.GetGoalsAsync()).Single().TargetValue);
    }

    [TestMethod]
    public async Task SuccessfulImportKeepsConsistentPreImportSnapshot()
    {
        await db.SaveAthleteAsync(new() { Id = 7, FirstName = "Original", LastName = "Fixture", Gender = "P", BirthYear = 2010 });
        var data = await db.ExportAsync();
        data.Athletes[0].FirstName = "Changed";
        await db.ImportAsync(data);
        var backup = Directory.GetFiles(Path.Combine(root, "backups"), "pre-import-*.db").Single();
        await using var c = new SqliteConnection($"Data Source={backup};Mode=ReadOnly;Pooling=False");
        await c.OpenAsync(TestContext.CancellationToken);
        await using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT first_name FROM athletes WHERE id=7";
        Assert.AreEqual("Original", await cmd.ExecuteScalarAsync(TestContext.CancellationToken));
    }

    [TestMethod]
    public async Task ImportingMovedCombinedParentRejectsAgainstExistingUnimportedChild()
    {
        var a = await db.SaveAthleteAsync(new() { FirstName = "Original", LastName = "Fixture", BirthYear = 2010, Gender = "P" });
        var b = await db.SaveAthleteAsync(new() { FirstName = "Other", LastName = "Fixture", BirthYear = 2010, Gender = "P" });
        var parent = await db.SaveResultAsync(new() { AthleteId = a.Id, DisciplineId = 31, Date = "2026-07-01", Value = 100, Type = "competition", Status = "valid" });
        var child = await db.SaveResultAsync(new() { AthleteId = a.Id, DisciplineId = 3, Date = "2026-07-01", Value = 12, Type = "competition", Status = "valid", CombinedEventId = parent.Id });
        var data = new ExportData
        {
            Version = "1.0.0",
            Results = [parent with
            {
                AthleteId = b.Id
            }

            ]
        };
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() => db.ImportAsync(data));
        var rows = await db.GetResultsAsync();
        Assert.AreEqual(a.Id, rows.Single(r => r.Id == parent.Id).AthleteId);
        Assert.AreEqual(a.Id, rows.Single(r => r.Id == child.Id).AthleteId);
        Assert.AreEqual(parent.Id, rows.Single(r => r.Id == child.Id).CombinedEventId);
        await db.DeleteAthleteAsync(b.Id);
        Assert.HasCount(2, await db.GetResultsAsync(a.Id));
    }

    [TestMethod]
    public async Task MissingCollectionIsRejectedBeforeWrites()
    {
        var file = Path.Combine(root, "invalid.json");
        await File.WriteAllTextAsync(file, """{"version":"1.0.0","athletes":[],"results":[],"competitions":[],"goals":[]}""", TestContext.CancellationToken);
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() => db.ImportFileAsync(file));
        Assert.IsEmpty(await db.GetAthletesAsync());
    }

    public TestContext TestContext { get; set; }
}
