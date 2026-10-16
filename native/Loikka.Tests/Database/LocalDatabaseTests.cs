using Loikka.Infrastructure.Database;

namespace Loikka.Tests.Database;

[TestClass]
public sealed class LocalDatabaseTests
{
    [TestMethod]
    public async Task CleanInstallContainsCatalogAndNoAthletes()
    {
        var root = Path.Combine(Path.GetTempPath(), "Loikka-test-" + Guid.NewGuid());
        try
        {
            var database = new LocalDatabase(root);
            await database.InitializeAsync();
            Assert.HasCount(54, await database.GetDisciplinesAsync());
            Assert.IsEmpty(await database.GetAthletesAsync());
        }
        finally
        {
            if (Directory.Exists(root))
            {
                Directory.Delete(root, true);
            }
        }
    }
}
