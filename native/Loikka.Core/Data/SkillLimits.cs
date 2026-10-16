using System.Text.Json;
using Loikka.Core.Models;
using Loikka.Core.Rules;
namespace Loikka.Core.Data;

public sealed record SkillLimit(double A, double B, double C);
public static class SkillLimits
{
    private sealed record LimitData(
        Dictionary<string, Dictionary<string, SkillLimit>> Legacy,
        Dictionary<string, Dictionary<string, SkillLimit>> Current,
        Dictionary<long, Dictionary<string, string?>> Mapping);
    private static readonly LimitData Data = ReadData();
    private static LimitData ReadData()
    {
        using var stream = typeof(SkillLimits).Assembly.GetManifestResourceStream("Loikka.Core.Data.SkillData.json")!;
        return JsonSerializer.Deserialize<LimitData>(stream, LegacyJson.Options)!;
    }

    public static string? CalculateMark(double value, long disciplineId, int birthYear, DateOnly date, bool lowerIsBetter)
    {
        var limit = ForDiscipline(disciplineId, birthYear, date.Year);
        if (limit is null) return null;
        if (lowerIsBetter ? value <= limit.A : value >= limit.A) return "A";
        if (lowerIsBetter ? value <= limit.B : value >= limit.B) return "B";
        if (lowerIsBetter ? value <= limit.C : value >= limit.C) return "C";
        return null;
    }

    public static SkillLimit? ForDiscipline(long disciplineId, int birthYear, int resultYear)
    {
        var category = AgeRules.SkillCategory(birthYear, resultYear);
        if (category is null || !Data.Mapping.TryGetValue(disciplineId, out var mapping) ||
            !mapping.TryGetValue(category, out var key) || key is null) return null;
        // The legacy selector chooses the whole 2026 dataset, including empty categories.
        var limits = resultYear >= 2026 ? Data.Current : Data.Legacy;
        return limits[category].GetValueOrDefault(key);
    }
}
