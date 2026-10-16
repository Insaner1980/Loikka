using Loikka.Core.Models;

namespace Loikka.Core.Rules;

public sealed record SeasonStatistics(double? BestResult, double? AverageResult, int CompetitionCount, double? ImprovementPercent);
public sealed record SeasonComparison(int Year, double? BestResult);
public sealed record ProgressStatistics(Result? AllTimeBest, Result? SeasonBest, double Improvement, double Average, int Count, IReadOnlyList<Result> ChartResults);
public static class StatisticsRules
{
    private static double Best(IEnumerable<Result> rows, bool lower) => lower ? rows.Min(x => x.Value) : rows.Max(x => x.Value);
    public static SeasonStatistics Season(IEnumerable<Result> results, long athleteId, Discipline discipline, int year)
    {
        var valid = results.Where(x => x.AthleteId == athleteId && x.DisciplineId == discipline.Id && RecordRules.IsValid(x)).ToArray();
        var season = valid.Where(x => RecordRules.Year(x) == year).ToArray();
        if (season.Length == 0)
        {
            return new(null, null, 0, null);
        }

        var best = Best(season, discipline.LowerIsBetter);
        var previous = valid.Where(x => RecordRules.Year(x) == year - 1).ToArray();
        double? improvement = null;
        if (previous.Length > 0)
        {
            var before = Best(previous, discipline.LowerIsBetter);
            improvement = (discipline.LowerIsBetter ? before - best : best - before) / before * 100;
        }

        return new(best, season.Average(x => x.Value), season.Count(x => x.Type == "competition"), improvement);
    }

    public static ProgressStatistics Progress(IEnumerable<Result> results, long athleteId, Discipline discipline, int? year = null)
    {
        var disciplineResults = results.Where(x => x.AthleteId == athleteId && x.DisciplineId == discipline.Id).ToArray();
        // Progress-tab eligibility includes empty legacy status, unlike the main statistics query.
        var valid = disciplineResults.Where(x => x.Value > 0 && x.Status is null or "" or "valid");
        var lower = discipline.Unit == "time";
        var allTimeBest = disciplineResults.Where(x => x.Value != 0 && x.Status is null or "" or "valid").OrderBy(x => lower ? x.Value : -x.Value).FirstOrDefault();
        var period = valid.Where(x => year is null || RecordRules.Year(x) == year).OrderBy(x => x.Date, StringComparer.Ordinal).ToArray();
        var best = period.OrderBy(x => lower ? x.Value : -x.Value).FirstOrDefault();
        double improvement = 0;
        if (period.Length >= 2)
            improvement = lower ? period[0].Value - period[^1].Value : period[^1].Value - period[0].Value;
        return new(allTimeBest, best, improvement, period.Length == 0 ? 0 : period.Average(x => x.Value), period.Length, period);
    }

    public static IReadOnlyList<SeasonComparison> Comparison(IEnumerable<Result> results, long athleteId, Discipline discipline) => results.Where(x => x.AthleteId == athleteId && x.DisciplineId == discipline.Id && RecordRules.IsValid(x)).GroupBy(RecordRules.Year).Where(x => x.Key != 0).OrderBy(x => x.Key).TakeLast(4).Select(x => new SeasonComparison(x.Key, Best(x, discipline.LowerIsBetter))).ToArray();
    public static IReadOnlyList<SeasonComparison> ProgressComparison(IEnumerable<Result> results, long athleteId, Discipline discipline) => results.Where(x => x.AthleteId == athleteId && x.DisciplineId == discipline.Id).GroupBy(RecordRules.Year).Where(x => x.Key != 0).OrderByDescending(x => x.Key).Take(4).Select(x => new { Year = x.Key, Rows = x.Where(r => r.Value > 0 && r.Status is null or "" or "valid").ToArray() }).Where(x => x.Rows.Length > 0).OrderBy(x => x.Year).Select(x => new SeasonComparison(x.Year, Best(x.Rows, discipline.Unit == "time"))).ToArray();
}
