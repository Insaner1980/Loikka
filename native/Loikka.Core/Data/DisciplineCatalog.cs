using Loikka.Core.Models;
using System.Text.Json;
namespace Loikka.Core.Data;

public static class DisciplineCatalog
{
    private sealed record CatalogData(List<Discipline> Disciplines, Dictionary<string, long[]> Ages);
    private static readonly CatalogData Data = ReadData();

    private static CatalogData ReadData()
    {
        using var stream = typeof(DisciplineCatalog).Assembly.GetManifestResourceStream("Loikka.Core.Data.DisciplineData.json")!;
        return JsonSerializer.Deserialize<CatalogData>(stream, LegacyJson.Options)!;
    }

    public static IReadOnlyList<Discipline> All => Data.Disciplines;
    public static Discipline? Find(long id) => All.FirstOrDefault(x => x.Id == id);
    public static IReadOnlyList<Discipline> ForAgeCategory(string category) =>
        Data.Ages.TryGetValue(category, out var ids) ? All.Where(x => ids.Contains(x.Id)).ToArray() : [];
    public static bool NeedsMinutes(long id) => id is >= 5 and <= 15 or >= 19 and <= 21 or >= 35 and <= 53;
    public static bool UsesCentimeters(long id) => id is >= 22 and <= 25;
}
