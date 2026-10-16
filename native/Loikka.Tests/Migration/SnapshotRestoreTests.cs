using Loikka.Infrastructure.Database;
using Loikka.Infrastructure.Migration;
using System.Text.Json;

namespace Loikka.Tests.Migration;

[TestClass]
public sealed class SnapshotRestoreTests
{
    private string root = null!, active = null!, stage = null!;
    [TestInitialize]
    public async Task Setup()
    {
        root = Path.Combine(Path.GetTempPath(), "Loikka-restore-test-" + Guid.NewGuid());
        active = Path.Combine(root, "active");
        stage = Path.Combine(root, "staged");
        var a = new LocalDatabase(active);
        await a.InitializeAsync();
        await a.SaveAthleteAsync(new() { FirstName = "Original", LastName = "Fixture", BirthYear = 2010, Gender = "P" });
        var b = new LocalDatabase(stage);
        await b.InitializeAsync();
        await b.SaveAthleteAsync(new() { FirstName = "Restored", LastName = "Fixture", BirthYear = 2010, Gender = "P" });
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
    public async Task ActivationReleasesSessionLockAndRetainsPreviousRoot()
    {
        FileStream? session = File.Open(Path.Combine(active, ".native.lock"), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
        var releases = 0;
        var reopens = 0;
        try
        {
            var retained = await SnapshotRestoreService.RestoreSnapshotAsync(stage, active, () =>
            {
                session.Dispose();
                session = null;
                releases++;
                return Task.CompletedTask;
            }, () =>
            {
                session = File.Open(Path.Combine(active, ".native.lock"), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
                reopens++;
                return Task.CompletedTask;
            }, TestContext.CancellationToken);
            Assert.AreEqual("Restored", (await new LocalDatabase(active).GetAthletesAsync()).Single().FirstName);
            Assert.AreEqual("Original", (await new LocalDatabase(retained).GetAthletesAsync()).Single().FirstName);
            Assert.AreEqual(1, releases);
            Assert.AreEqual(1, reopens);
            Assert.IsFalse(File.Exists(active + ".restore-journal.json"));
        }
        finally
        {
            session?.Dispose();
        }
    }

    [TestMethod]
    public async Task InvalidStageNeverReleasesActiveSession()
    {
        File.Delete(Path.Combine(stage, "loikka.db"));
        var called = false;
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() => SnapshotRestoreService.RestoreSnapshotAsync(stage, active, () =>
        {
            called = true;
            return Task.CompletedTask;
        }, () => Task.CompletedTask, TestContext.CancellationToken));
        Assert.IsFalse(called);
        Assert.AreEqual("Original", (await new LocalDatabase(active).GetAthletesAsync()).Single().FirstName);
    }

    [TestMethod]
    public async Task InterruptedMoveRecoversPreviousRootAndKeepsUnactivatedStage()
    {
        var retained = active + ".rollback-" + Guid.NewGuid().ToString("N");
        Directory.Move(active, retained);
        await File.WriteAllTextAsync(active + ".restore-journal.json", JsonSerializer.Serialize(new { ActiveRoot = active, StagedRoot = stage, RetainedRoot = retained, State = "previous-retained" }), TestContext.CancellationToken);
        await SnapshotRestoreService.RecoverAsync(active, () => Task.CompletedTask, () => Task.CompletedTask);
        Assert.AreEqual("Original", (await new LocalDatabase(active).GetAthletesAsync()).Single().FirstName);
        Assert.IsTrue(Directory.Exists(stage));
        Assert.IsFalse(File.Exists(active + ".restore-journal.json"));
    }

    [TestMethod]
    public async Task JournalWriteFailureAfterRetainingOldRootRestoresItBeforeReopen()
    {
        var reopened = false;
        try
        {
            await SnapshotRestoreService.RestoreSnapshotAsync(stage, active, () =>
            {
                Directory.CreateDirectory(active + ".restore-journal.json.tmp");
                return Task.CompletedTask;
            }, () =>
            {
                reopened = Directory.Exists(active);
                return Task.CompletedTask;
            }, TestContext.CancellationToken);
            Assert.Fail("The injected journal I/O failure should stop activation.");
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
        }

        Assert.IsTrue(reopened);
        Assert.AreEqual("Original", (await new LocalDatabase(active).GetAthletesAsync()).Single().FirstName);
        Assert.IsTrue(Directory.Exists(stage));
    }

    [TestMethod]
    public async Task CancellationBeforeActivationLeavesBothRootsUntouched()
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        await Assert.ThrowsExactlyAsync<OperationCanceledException>(() => SnapshotRestoreService.RestoreSnapshotAsync(stage, active, () => Task.CompletedTask, () => Task.CompletedTask, cancellation.Token));
        Assert.AreEqual("Original", (await new LocalDatabase(active).GetAthletesAsync()).Single().FirstName);
        Assert.IsTrue(Directory.Exists(stage));
    }

    public TestContext TestContext { get; set; }
}
