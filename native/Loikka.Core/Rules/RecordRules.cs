using Loikka.Core.Models;
using System.Globalization;
namespace Loikka.Core.Rules;

public static class RecordRules
{
    public static bool IsWindAssisted(double? wind, string disciplineName, int birthYear, int resultYear) =>
        resultYear - birthYear >= 14 && wind > 2 && disciplineName is
            "60m" or "100m" or "200m" or "60m aj" or "80m aj" or "100m aj" or "Pituus" or "Kolmiloikka" or
            "60 m" or "100 m" or "200 m" or "60 m aidat" or "80 m aidat" or "100 m aidat";

    public static bool IsValid(Result result) => result.Status is null or "valid";

    public static bool IsNewBest(double value, double? best, bool lowerIsBetter) =>
        best is null || (lowerIsBetter ? value < best : value > best);

    internal static int Year(Result result) =>
        DateOnly.TryParseExact(result.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) ? date.Year : 0;

    public static bool IsEligible(Result result, Athlete athlete, Discipline discipline) =>
        IsValid(result) && double.IsFinite(result.Value) && Year(result) != 0 &&
        !IsWindAssisted(result.Wind, discipline.Name, athlete.BirthYear, Year(result));

    public static IReadOnlyList<Result> Recalculate(IEnumerable<Result> results, IEnumerable<Athlete> athletes, IEnumerable<Discipline> disciplines)
    {
        var athleteById = athletes.ToDictionary(x => x.Id);
        var disciplineById = disciplines.ToDictionary(x => x.Id);
        var output = results.Select(x => x with { }).ToArray();
        // Unknown legacy relationships retain their existing flags for a separate migration report.
        var known = output.Where(x => athleteById.ContainsKey(x.AthleteId) && disciplineById.ContainsKey(x.DisciplineId));
        var groups = known.GroupBy(x => (x.AthleteId, x.DisciplineId,
            Weight: disciplineById[x.DisciplineId].Category == "throws" ? x.EquipmentWeight : null,
            Height: disciplineById[x.DisciplineId].Category == "hurdles" ? x.HurdleHeight : null));
        foreach (var group in groups)
        {
            var discipline = disciplineById[group.Key.DisciplineId];
            foreach (var result in group) { result.IsPersonalBest = false; result.IsSeasonBest = false; }
            var eligible = group.Where(x => IsEligible(x, athleteById[x.AthleteId], discipline));
            var ordered = eligible.OrderBy(x => discipline.LowerIsBetter ? x.Value : -x.Value)
                .ThenBy(x => x.Date, StringComparer.Ordinal).ThenBy(x => x.Id).ToArray();
            if (ordered.Length == 0) continue;
            ordered[0].IsPersonalBest = true;
            foreach (var season in ordered.GroupBy(Year)) season.First().IsSeasonBest = true;
        }
        return output;
    }
}
