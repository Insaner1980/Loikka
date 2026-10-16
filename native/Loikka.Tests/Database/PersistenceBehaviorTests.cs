using Loikka.Core.Models;
using Loikka.Infrastructure.Database;
using Microsoft.Data.Sqlite;

namespace Loikka.Tests.Database;

[TestClass]
public sealed class PersistenceBehaviorTests
{
    private string root = null!;
    private LocalDatabase db = null!;
    [TestInitialize]
    public async Task Setup()
    {
        root = Path.Combine(Path.GetTempPath(), "Loikka-db-test-" + Guid.NewGuid());
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

    private Task<Athlete> AthleteAsync(string first = "Test") => db.SaveAthleteAsync(new() { FirstName = first, LastName = "Fixture", BirthYear = 2010, Gender = "P" });
    private static Result Result(long athlete, double value = 12) => new()
    {
        AthleteId = athlete,
        DisciplineId = 3,
        Date = "2026-07-01",
        Value = value,
        Type = "competition",
        Status = "valid",
        CompetitionName = "Fixture",
        Placement = 1
    };
    [TestMethod]
    public async Task FinnishCultureCreatesSqliteCompatibleUtcTimestamps()
    {
        var previous = System.Globalization.CultureInfo.CurrentCulture;
        try
        {
            System.Globalization.CultureInfo.CurrentCulture = System.Globalization.CultureInfo.GetCultureInfo("fi-FI");
            var athlete = await AthleteAsync();
            await db.SaveResultAsync(Result(athlete.Id));
            await using var c = new SqliteConnection($"Data Source={db.DatabasePath};Pooling=False");
            await c.OpenAsync(TestContext.CancellationToken);
            await using var cmd = c.CreateCommand();
            cmd.CommandText = "SELECT datetime(created_at),datetime(updated_at) FROM athletes UNION ALL SELECT datetime(created_at),datetime(created_at) FROM results";
            await using var reader = await cmd.ExecuteReaderAsync(TestContext.CancellationToken);
            var rows = 0;
            while (await reader.ReadAsync(TestContext.CancellationToken))
            {
                Assert.IsFalse(reader.IsDBNull(0));
                Assert.IsFalse(reader.IsDBNull(1));
                rows++;
            }

            Assert.AreEqual(2, rows);
        }
        finally
        {
            System.Globalization.CultureInfo.CurrentCulture = previous;
        }
    }

    [TestMethod]
    public async Task UpsertAthletePreservesChildrenAndOptionalFieldCanBeCleared()
    {
        var a = await AthleteAsync();
        a.ClubName = "Club";
        await db.SaveAthleteAsync(a);
        var r = await db.SaveResultAsync(Result(a.Id));
        a.ClubName = null;
        a.FirstName = "Changed";
        await db.SaveAthleteAsync(a);
        Assert.IsNull((await db.GetAthletesAsync()).Single().ClubName);
        Assert.AreEqual(r.Id, (await db.GetResultsAsync()).Single().Id);
    }

    [TestMethod]
    public async Task ResultChangeRecalculatesBothOldAndNewAthleteGroups()
    {
        var a = await AthleteAsync();
        var b = await AthleteAsync("Other");
        var fast = await db.SaveResultAsync(Result(a.Id, 11));
        var slow = await db.SaveResultAsync(Result(a.Id, 12));
        fast.AthleteId = b.Id;
        await db.SaveResultAsync(fast);
        Assert.IsTrue((await db.GetResultsAsync(a.Id)).Single().IsPersonalBest);
        Assert.IsTrue((await db.GetResultsAsync(b.Id)).Single().IsPersonalBest);
    }

    [TestMethod]
    public async Task ResultMedalUpdatePreservesMedalIdentity()
    {
        var a = await AthleteAsync();
        var r = await db.SaveResultAsync(Result(a.Id));
        var medal = (await db.GetMedalsAsync()).Single();
        r.Placement = 2;
        await db.SaveResultAsync(r);
        var updated = (await db.GetMedalsAsync()).Single();
        Assert.AreEqual(medal.Id, updated.Id);
        Assert.AreEqual("silver", updated.Type);
    }

    [TestMethod]
    public async Task ResultDeletionPreservesStandaloneMedalHistoryAndClearsOwnedPhotos()
    {
        var a = await AthleteAsync();
        var r = await db.SaveResultAsync(Result(a.Id));
        await db.SavePhotoAsync(new() { EntityType = "results", EntityId = r.Id, FilePath = "photos/a.jpg", OriginalName = "a.jpg" });
        await db.DeleteResultAsync(r.Id);
        Assert.IsEmpty(await db.GetPhotosAsync());
        Assert.IsNull((await db.GetMedalsAsync()).Single().ResultId);
    }

    [TestMethod]
    public async Task CompetitionParticipantBatchRollsBackWhenOneParticipantIsInvalid()
    {
        var a = await AthleteAsync();
        var c = await db.SaveCompetitionAsync(new() { Name = "Original", Date = "2026-07-01" }, [new() { AthleteId = a.Id }]);
        c.Name = "Changed";
        try
        {
            await db.SaveCompetitionAsync(c, [new() { AthleteId = 999999 }]);
            Assert.Fail("Invalid athlete should fail.");
        }
        catch (SqliteException)
        {
        }

        Assert.AreEqual("Original", (await db.GetCompetitionsAsync()).Single().Name);
        Assert.AreEqual(a.Id, (await db.GetParticipantsAsync(c.Id)).Single().AthleteId);
    }

    [TestMethod]
    public async Task CombinedSaveRollsBackAllWritesOnInvalidChild()
    {
        var a = await AthleteAsync();
        var parent = Result(a.Id);
        parent.DisciplineId = 31;
        try
        {
            await db.SaveCombinedResultAsync(parent, [Result(999999)]);
            Assert.Fail("Invalid child should fail.");
        }
        catch (InvalidDataException)
        {
        }

        Assert.IsEmpty(await db.GetResultsAsync());
        Assert.IsEmpty(await db.GetMedalsAsync());
    }

    [TestMethod]
    public async Task CombinedParentCycleIsRejected()
    {
        var a = await AthleteAsync();
        var parent = await db.SaveResultAsync(Result(a.Id));
        var child = Result(a.Id);
        child.CombinedEventId = parent.Id;
        await db.SaveResultAsync(child);
        parent.CombinedEventId = child.Id;
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() => db.SaveResultAsync(parent));
        Assert.IsNull((await db.GetResultsAsync()).Single(r => r.Id == parent.Id).CombinedEventId);
    }

    [TestMethod]
    public async Task MovingCombinedParentToAnotherAthleteRejectsWithoutChangingRows()
    {
        var a = await AthleteAsync();
        var b = await AthleteAsync("Other");
        var parent = await db.SaveResultAsync(Result(a.Id) with { DisciplineId = 31 });
        var child = await db.SaveResultAsync(Result(a.Id) with { CombinedEventId = parent.Id });
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() => db.SaveResultAsync(parent with { AthleteId = b.Id }));
        var rows = await db.GetResultsAsync();
        Assert.AreEqual(a.Id, rows.Single(r => r.Id == parent.Id).AthleteId);
        Assert.AreEqual(a.Id, rows.Single(r => r.Id == child.Id).AthleteId);
        Assert.AreEqual(parent.Id, rows.Single(r => r.Id == child.Id).CombinedEventId);
        await db.DeleteAthleteAsync(b.Id);
        Assert.HasCount(2, await db.GetResultsAsync(a.Id));
    }

    [TestMethod]
    public async Task ImportRollsBackEarlierUpsertsOnUnresolvedDiscipline()
    {
        var a = await AthleteAsync();
        var data = await db.ExportAsync();
        data.Athletes[0].FirstName = "Changed";
        data.Results.Add(Result(a.Id) with { Id = 88, DisciplineId = 999999 });
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() => db.ImportAsync(data));
        Assert.AreEqual("Test", (await db.GetAthletesAsync()).Single().FirstName);
        Assert.IsEmpty(await db.GetResultsAsync());
    }

    [TestMethod]
    public async Task UnrelatedHistoricalFlagsRemainUnchangedWhenSavingAnotherGroup()
    {
        var a = await AthleteAsync();
        var b = await AthleteAsync("Other");
        var old = await db.SaveResultAsync(Result(a.Id));
        await using (var c = new SqliteConnection($"Data Source={db.DatabasePath};Pooling=False"))
        {
            await c.OpenAsync(TestContext.CancellationToken);
            await using var cmd = c.CreateCommand();
            cmd.CommandText = $"UPDATE results SET is_personal_best=0,is_season_best=0 WHERE id={old.Id}";
            await cmd.ExecuteNonQueryAsync(TestContext.CancellationToken);
        }

        await db.SaveResultAsync(Result(b.Id));
        var historical = (await db.GetResultsAsync(a.Id)).Single();
        Assert.IsFalse(historical.IsPersonalBest);
        Assert.IsFalse(historical.IsSeasonBest);
    }

    [TestMethod]
    public async Task GoalDeadlineDoesNotPreventQualifyingSavedResultAchievement()
    {
        var a = await AthleteAsync();
        var goal = await db.SaveGoalAsync(new() { AthleteId = a.Id, DisciplineId = 3, TargetValue = 12, TargetDate = "2025-01-01", Status = "active" });
        await db.SaveResultAsync(Result(a.Id, 11));
        Assert.AreEqual("achieved", (await db.GetGoalsAsync()).Single().Status);
    }

    [TestMethod]
    public async Task LosingMedalEligibilityDetachesAndPreservesHistory()
    {
        var a = await AthleteAsync();
        var r = await db.SaveResultAsync(Result(a.Id));
        var medal = (await db.GetMedalsAsync()).Single();
        r.Placement = 4;
        await db.SaveResultAsync(r);
        var retained = (await db.GetMedalsAsync()).Single();
        Assert.AreEqual(medal.Id, retained.Id);
        Assert.IsNull(retained.ResultId);
        Assert.AreEqual("gold", retained.Type);
    }

    [TestMethod]
    public async Task JsonExportRoundTripsAllFiveCollectionsAndStableIds()
    {
        var a = await AthleteAsync();
        await db.SaveResultAsync(Result(a.Id));
        await db.SaveCompetitionAsync(new() { Name = "Fixture", Date = "2026-07-01" });
        await db.SaveGoalAsync(new() { AthleteId = a.Id, DisciplineId = 3, TargetValue = 10, Status = "active" });
        var data = await db.ExportAsync();
        await db.ImportAsync(data);
        Assert.HasCount(1, await db.GetAthletesAsync());
        Assert.HasCount(1, await db.GetResultsAsync());
        Assert.HasCount(1, await db.GetGoalsAsync());
        Assert.HasCount(1, await db.GetMedalsAsync());
    }

    public TestContext TestContext { get; set; }
}
