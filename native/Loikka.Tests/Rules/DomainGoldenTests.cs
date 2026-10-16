using System.Text.Json;
using Loikka.Core.Data;
using Loikka.Core.Formatting;
using Loikka.Core.Models;
using Loikka.Core.Rules;

namespace Loikka.Tests.Rules;

[TestClass]
public sealed class DomainGoldenTests
{
    [TestMethod]
    public void LegacyExportRetainsFieldsAndUnknownNestedData()
    {
        const string json = """
        {"version":"1.0.0","exportedAt":"2025-12-31T23:59:59Z","athletes":[{"id":9,"firstName":"A","lastName":"B","birthYear":2012,"gender":"P","futureField":42}],"results":[{"id":17,"athleteId":9,"disciplineId":31,"date":"2025-07-01","value":550,"type":"training","subResults":"[{\"points\":55}]","combinedEventId":8,"notes":"keep","hurdleSpacing":7.5,"status":null}],"competitions":[],"goals":[],"medals":[{"id":1,"athleteId":9,"type":"gold","competitionName":"Cup","date":"2025-07-01"}],"futureRoot":true}
        """;
        var data = JsonSerializer.Deserialize<ExportData>(json, LegacyJson.Options)!;
        var output = JsonSerializer.Serialize(data, LegacyJson.Options);
        using var document = JsonDocument.Parse(output);
        Assert.AreEqual("P", data.Athletes[0].Gender);
        Assert.AreEqual("training", data.Results[0].Type);
        Assert.AreEqual(8L, data.Results[0].CombinedEventId);
        Assert.AreEqual("[{\"points\":55}]", data.Results[0].SubResults);
        Assert.AreEqual("keep", data.Results[0].Notes);
        Assert.AreEqual("gold", data.Medals[0].Type);
        Assert.AreEqual(42, document.RootElement.GetProperty("athletes")[0].GetProperty("futureField").GetInt32());
        Assert.IsTrue(document.RootElement.GetProperty("futureRoot").GetBoolean());
    }

    [TestMethod]
    public void CatalogueKeepsStableMeaningAndAgeMembership()
    {
        Assert.HasCount(54, DisciplineCatalog.All);
        const string catalogue = "1:40 m|2:60 m|3:100 m|4:150 m|5:200 m|6:300 m|7:400 m|8:600 m|9:800 m|10:1000 m|11:1500 m|12:2000 m|13:3000 m|14:5000 m|15:10000 m|16:60 m aidat|17:80 m aidat|18:100 m aidat|19:200 m aidat|20:300 m aidat|21:400 m aidat|22:Pituus|23:Korkeus|24:Kolmiloikka|25:Seiväs|26:Kuula|27:Kiekko|28:Keihäs|29:Moukari|30:Pallo|31:3-ottelu|32:4-ottelu|33:5-ottelu|34:7-ottelu|35:600 m kävely|36:800 m kävely|41:1000 m kävely|37:2000 m kävely|38:3000 m kävely|39:5000 m kävely|40:10 km kävely|42:500 m maasto|43:1 km maasto|44:2 km maasto|45:4 km maasto|46:10 km maasto|47:8x40 m sukkulaviesti|48:4x50 m viesti|49:4x100 m viesti|50:4x200 m viesti|51:4x300 m viesti|52:4x400 m viesti|53:4x800 m viesti|54:Cooper";
        Assert.AreEqual(catalogue, string.Join('|', DisciplineCatalog.All.Select(x => $"{x.Id}:{x.Name}")));
        Assert.AreEqual("800 m kävely", DisciplineCatalog.Find(36)!.Name);
        Assert.AreEqual("Cooper", DisciplineCatalog.Find(54)!.Name);
        Assert.AreEqual("distance", DisciplineCatalog.Find(31)!.Unit);
        Assert.AreSequenceEqual(new long[] { 1, 22, 30 }, DisciplineCatalog.ForAgeCategory("T3").Select(x => x.Id).ToArray());
        Assert.Contains(x => x.Id == 46, DisciplineCatalog.ForAgeCategory("N22"));
        Assert.DoesNotContain(x => x.Id == 46, DisciplineCatalog.ForAgeCategory("T9"));
        Assert.IsTrue(DisciplineCatalog.NeedsMinutes(5));
        Assert.IsFalse(DisciplineCatalog.NeedsMinutes(4));
        Assert.IsTrue(DisciplineCatalog.UsesCentimeters(24));
    }

    [TestMethod]
    [DataRow("T3", "1,22,30")]
    [DataRow("T4", "1,22,30")]
    [DataRow("T5", "1,22,23,28,30,42")]
    [DataRow("T6", "1,22,23,28,30")]
    [DataRow("T7", "1,2,8,22,23,28,30,42,47,48")]
    [DataRow("T8", "1,2,8,9,22,23,26,28,30,47,48")]
    [DataRow("T9", "1,2,8,9,10,16,22,23,24,25,26,27,28,29,30,31,32,35,36,43,47,48,54")]
    [DataRow("T10", "2,4,8,9,10,16,22,23,24,25,26,27,28,29,30,31,32,41,43,48,49,54")]
    [DataRow("T11", "2,4,8,9,10,16,22,23,24,25,26,27,28,29,30,31,32,41,44,49,54")]
    [DataRow("T12", "2,3,5,9,10,11,16,19,22,23,24,25,26,27,28,29,32,33,37,44,49,54")]
    [DataRow("T13", "2,3,5,6,9,10,11,16,19,22,23,24,25,26,27,28,29,32,33,37,44,49,54")]
    [DataRow("T14", "3,5,6,7,9,11,12,17,20,22,23,24,25,26,27,28,29,33,38,45,49,53,54")]
    [DataRow("T15", "3,5,6,7,9,11,12,13,17,20,22,23,24,25,26,27,28,29,33,38,45,49,53,54")]
    [DataRow("N17", "3,5,7,9,11,12,13,14,18,20,21,22,23,24,25,26,27,28,29,33,34,38,45,49,51,53,54")]
    [DataRow("N19", "3,5,7,9,11,13,14,18,21,22,23,24,25,26,27,28,29,34,38,39,45,49,52,53,54")]
    [DataRow("N22", "3,5,7,9,11,13,14,15,18,21,22,23,24,25,26,27,28,29,34,38,39,40,45,46,49,52,53,54")]
    [DataRow("N", "3,5,7,9,11,13,14,15,18,21,22,23,24,25,26,27,28,29,34,38,39,40,45,46,49,52,53,54")]
    public void DisciplineMembershipKeepsEveryLegacyCategory(string category, string expected) => Assert.AreEqual(expected, string.Join(',', DisciplineCatalog.ForAgeCategory(category).Select(x => x.Id)));
    [TestMethod]
    [DataRow(2020, 2026, "6v", "T6", null)]
    [DataRow(2019, 2026, "T7", "T7", null)]
    [DataRow(2018, 2026, "T7", "T8", "T8")]
    [DataRow(2017, 2026, "T9", "T9", "T9")]
    [DataRow(2016, 2026, "T9", "T10", "T9")]
    [DataRow(2015, 2026, "T11", "T11", "T11")]
    [DataRow(2014, 2026, "T11", "T12", "T11")]
    [DataRow(2013, 2026, "T13", "T13", "T13")]
    [DataRow(2012, 2026, "T13", "T14", "T13")]
    [DataRow(2011, 2026, "T15", "T15", "T15")]
    [DataRow(2010, 2026, "T15", "N17", "T15")]
    [DataRow(2009, 2026, "T17", "N17", null)]
    [DataRow(2008, 2026, "T17", "N19", null)]
    [DataRow(2007, 2026, "N", "N19", null)]
    [DataRow(2006, 2026, "N", "N22", null)]
    [DataRow(2004, 2026, "N", "N22", null)]
    [DataRow(2003, 2026, "N", "N", null)]
    public void DistinctAgeContractsKeepTheirBoundaries(int birth, int year, string display, string available, string? skill)
    {
        Assert.AreEqual(display, AgeRules.DisplayCategory(birth, year));
        Assert.AreEqual(available, AgeRules.DisciplineCategory(birth, year));
        Assert.AreEqual(skill, AgeRules.SkillCategory(birth, year));
    }

    [TestMethod]
    [DataRow(12.34, "12.34")]
    [DataRow(83.45, "1:23.45")]
    [DataRow(3754.56, "1:02:34.56")]
    [DataRow(-1, "0.00")]
    public void TimeDisplayKeepsLegacyPrecision(double value, string expected) => Assert.AreEqual(expected, ResultFormatter.Time(value));
    [TestMethod]
    public void NumericBoundariesDoNotRescaleCooperOrPoints()
    {
        Assert.AreEqual(83.45, SegmentedInput.ToStoredValue(8345, DisciplineCatalog.Find(9)!), 0.000001);
        Assert.AreEqual(5.5, SegmentedInput.ToStoredValue(550, DisciplineCatalog.Find(22)!), 0.000001);
        Assert.AreEqual(2500.0, SegmentedInput.ToStoredValue(2500, DisciplineCatalog.Find(54)!));
        Assert.AreEqual(450.0, SegmentedInput.ToStoredValue(450, DisciplineCatalog.Find(31)!));
        Assert.AreEqual(8345, SegmentedInput.FromStoredValue(83.45, DisciplineCatalog.Find(9)!));
        Assert.AreEqual("550 cm", ResultFormatter.Distance(5.5, centimeters: true));
        Assert.AreEqual("2500 m", ResultFormatter.Value(2500, DisciplineCatalog.Find(54)!));
        Assert.AreEqual("450 p", ResultFormatter.Value(450, DisciplineCatalog.Find(31)!));
        Assert.AreEqual("DNS - Ei startannut", ResultFormatter.Result(new Result { Status = "dns" }, DisciplineCatalog.Find(1)!));
        Assert.AreEqual(5.5, SegmentedInput.ParseDecimal("5,50"));
        Assert.AreEqual(5.5, SegmentedInput.ParseDecimal("5.50"));
        Assert.IsNull(SegmentedInput.ParseDecimal("5,5.0"));
        Assert.AreEqual("1.7.2025", ResultFormatter.Date("2025-07-01"));
    }

    [TestMethod]
    public void SegmentsRetainTypingAndBlurDifferences()
    {
        Assert.IsNull(SegmentedInput.CombineTime("", "", ""));
        Assert.AreEqual(8304, SegmentedInput.CombineTime("1", "23", "4"));
        Assert.AreEqual(8340, SegmentedInput.CombineTime("1", "23", "4", finalize: true));
        Assert.AreEqual(540, SegmentedInput.CombineDistance("5", "4"));
        Assert.AreEqual("59", SegmentedInput.SecondsText("999", true));
        Assert.AreEqual("123", SegmentedInput.SecondsText("1234", false));
        Assert.AreEqual("minutes", SegmentedInput.NavigateTime("seconds", "Backspace", "", 0, true));
        Assert.AreEqual("seconds", SegmentedInput.NavigateTime("hundredths", "ArrowLeft", "45", 0, true));
        Assert.IsNull(SegmentedInput.NavigateTime("seconds", "Backspace", "1", 0, true));
        Assert.IsNull(SegmentedInput.NavigateTime("seconds", "ArrowLeft", "12", 0, false));
    }

    [TestMethod]
    public void WindUsesEventYearAndBothExistingEventNameSpellings()
    {
        Assert.IsFalse(RecordRules.IsWindAssisted(2.1, "100m", 2012, 2025));
        Assert.IsTrue(RecordRules.IsWindAssisted(2.1, "100m", 2012, 2026));
        Assert.IsTrue(RecordRules.IsWindAssisted(2.1, "100 m", 2012, 2026));
        Assert.IsTrue(RecordRules.IsWindAssisted(2.1, "60 m aidat", 2012, 2026));
        Assert.IsFalse(RecordRules.IsWindAssisted(2.0, "Pituus", 2012, 2026));
        Assert.IsFalse(RecordRules.IsWindAssisted(4, "400 m", 2012, 2026));
        Assert.IsFalse(RecordRules.IsWindAssisted(null, "Pituus", 2012, 2026));
    }

    [TestMethod]
    public void RecalculationUsesEligibleCandidatesAndDeterministicTies()
    {
        var athlete = new Athlete
        {
            Id = 1,
            BirthYear = 2012
        };
        Result[] input = [new()
        {
            Id = 3,
            AthleteId = 1,
            DisciplineId = 3,
            Date = "2026-06-01",
            Value = 12,
            Wind = 2.1
        }, new()
        {
            Id = 2,
            AthleteId = 1,
            DisciplineId = 3,
            Date = "2025-06-01",
            Value = 13,
            Wind = 3
        }, new()
        {
            Id = 1,
            AthleteId = 1,
            DisciplineId = 3,
            Date = "2025-06-01",
            Value = 13
        }, new()
        {
            Id = 4,
            AthleteId = 1,
            DisciplineId = 3,
            Date = "2026-07-01",
            Value = 10,
            Status = "dnf",
            IsPersonalBest = true
        }, new()
        {
            Id = 5,
            AthleteId = 1,
            DisciplineId = 3,
            Date = "2026-07-02",
            Value = 14,
            Type = "training"
        }

        ];
        var output = RecordRules.Recalculate(input, [athlete], [DisciplineCatalog.Find(3)!]);
        Assert.AreSequenceEqual(new long[] { 1 }, output.Where(x => x.IsPersonalBest).Select(x => x.Id).ToArray());
        Assert.AreSequenceEqual(new long[] { 1, 5 }, output.Where(x => x.IsSeasonBest).Select(x => x.Id).Order().ToArray());
        Assert.IsTrue(input[3].IsPersonalBest, "Pure rule must not mutate stored/source flags.");
        Assert.IsFalse(RecordRules.IsNewBest(13, 13, true));
    }

    [TestMethod]
    public void EquipmentGroupsKeepNullSeparateAndHurdleSpacingIsNotAKey()
    {
        var rows = new[]
        {
            new Result
            {
                Id = 1,
                AthleteId = 1,
                DisciplineId = 26,
                Date = "2025-01-01",
                Value = 8,
                EquipmentWeight = 2
            },
            new Result
            {
                Id = 2,
                AthleteId = 1,
                DisciplineId = 26,
                Date = "2025-01-01",
                Value = 7,
                EquipmentWeight = 3
            },
            new Result
            {
                Id = 3,
                AthleteId = 1,
                DisciplineId = 26,
                Date = "2025-01-01",
                Value = 9
            },
            new Result
            {
                Id = 4,
                AthleteId = 1,
                DisciplineId = 16,
                Date = "2025-01-01",
                Value = 15,
                HurdleHeight = 60,
                HurdleSpacing = 7
            },
            new Result
            {
                Id = 5,
                AthleteId = 1,
                DisciplineId = 16,
                Date = "2025-01-01",
                Value = 14,
                HurdleHeight = 60,
                HurdleSpacing = 8
            }
        };
        var output = RecordRules.Recalculate(rows, [new Athlete { Id = 1, BirthYear = 2015 }], DisciplineCatalog.All);
        Assert.AreSequenceEqual(new long[] { 1, 2, 3, 5 }, output.Where(x => x.IsPersonalBest).Select(x => x.Id).ToArray());
    }

    [TestMethod]
    public void GoalProgressPreservesFormulaButAchievementRejectsInvalidAndAbandonedGoals()
    {
        var goal = new Goal
        {
            AthleteId = 1,
            DisciplineId = 1,
            TargetValue = 10,
            Status = "active"
        };
        Assert.AreEqual(50.0, GoalRules.Progress(goal, 11), 0.000001);
        Assert.AreEqual(0.0, GoalRules.Progress(goal, 15));
        Assert.AreEqual(100.0, GoalRules.Progress(goal, 9));
        Assert.AreEqual(0.0, GoalRules.Progress(goal, null));
        Assert.AreEqual(100.0, GoalRules.Progress(goal with { TargetValue = 0 }, 0));
        Assert.AreEqual(0.0, GoalRules.Progress(goal with { TargetValue = 0 }, 1));
        Assert.AreEqual(75.0, GoalRules.Progress(goal with { DisciplineId = 22, TargetValue = 4 }, 3));
        var bad = new Result
        {
            AthleteId = 1,
            DisciplineId = 1,
            Value = 0,
            Status = "dns"
        };
        Assert.IsFalse(GoalRules.IsAchieved(goal, [bad]));
        Assert.IsTrue(GoalRules.IsAchieved(goal, [bad with { Value = 9, Status = null }]));
        Assert.IsFalse(GoalRules.IsAchieved(goal with { Status = "abandoned" }, [bad with { Value = 9, Status = null }]));
        Assert.AreEqual(1.0, GoalRules.Remaining(goal, 11));
    }

    [TestMethod]
    public void StatisticsContractsKeepSeasonPercentAndPeriodDifferenceDistinct()
    {
        var rows = new[]
        {
            new Result
            {
                Id = 1,
                AthleteId = 1,
                DisciplineId = 1,
                Date = "2024-06-01",
                Value = 20,
                Type = "competition"
            },
            new Result
            {
                Id = 2,
                AthleteId = 1,
                DisciplineId = 1,
                Date = "2025-06-01",
                Value = 18,
                Type = "competition"
            },
            new Result
            {
                Id = 3,
                AthleteId = 1,
                DisciplineId = 1,
                Date = "2025-08-01",
                Value = 16,
                Type = "training"
            },
            new Result
            {
                Id = 4,
                AthleteId = 1,
                DisciplineId = 1,
                Date = "2025-09-01",
                Value = 0,
                Status = "dns"
            }
        };
        var season = StatisticsRules.Season(rows, 1, DisciplineCatalog.Find(1)!, 2025);
        Assert.AreEqual(16.0, season.BestResult);
        Assert.AreEqual(17.0, season.AverageResult);
        Assert.AreEqual(1, season.CompetitionCount);
        Assert.AreEqual(20.0, season.ImprovementPercent);
        var progress = StatisticsRules.Progress(rows, 1, DisciplineCatalog.Find(1)!, 2025);
        Assert.AreEqual(2.0, progress.Improvement);
        Assert.AreEqual(2, progress.Count);
        Assert.HasCount(2, progress.ChartResults);
        Assert.IsNull(StatisticsRules.Season(rows, 1, DisciplineCatalog.Find(1)!, 2027).ImprovementPercent);
        Assert.AreEqual(0.0, StatisticsRules.Season([rows[3] with { Status = null }], 1, DisciplineCatalog.Find(1)!, 2025).BestResult);
        Assert.AreEqual(0, StatisticsRules.Progress([rows[3] with { Status = null }], 1, DisciplineCatalog.Find(1)!, 2025).Count);
    }

    private static readonly int[] seasonYears = new[]
    {
        2010,
        2015,
        2020,
        2024,
        2026
    };
    [TestMethod]
    public void ComparisonSelectsLatestFourYearsWithResults()
    {
        var rows = seasonYears.Select(y => new Result { AthleteId = 1, DisciplineId = 1, Date = $"{y}-06-01", Value = 12 });
        Assert.AreSequenceEqual(expectedComparisonYears, StatisticsRules.Comparison(rows, 1, DisciplineCatalog.Find(1)!).Select(x => x.Year).ToArray());
    }

    [TestMethod]
    public void ProgressAllTimeBadgeAndPeriodStatisticsRetainDifferentLegacyValueEligibility()
    {
        Result[] rows = [new()
        {
            Id = 1,
            AthleteId = 1,
            DisciplineId = 1,
            Date = "2025-06-01",
            Value = -1
        }, new()
        {
            Id = 2,
            AthleteId = 1,
            DisciplineId = 1,
            Date = "2025-07-01",
            Value = 12
        }, ];
        var progress = StatisticsRules.Progress(rows, 1, DisciplineCatalog.Find(1)!, 2025);
        Assert.AreEqual(1L, progress.AllTimeBest!.Id);
        Assert.AreEqual(2L, progress.SeasonBest!.Id);
        Assert.AreEqual(1, progress.Count);
    }

    private static readonly int[] comparisonYears = new[]
    {
        2010,
        2015,
        2020,
        2024
    };
    private static readonly int[] expectedComparisonYears = new[] { 2015, 2020, 2024, 2026 };

    private static readonly int[] expectedProgressYears = [2015, 2020, 2024];

    [TestMethod]
    public void ProgressComparisonLimitsYearsBeforeDiscardingInvalidOnlySeasons()
    {
        var rows = comparisonYears.Select(y => new Result { AthleteId = 1, DisciplineId = 1, Date = $"{y}-06-01", Value = 12 }).ToList();
        rows.Add(new Result { AthleteId = 1, DisciplineId = 1, Date = "2026-06-01", Value = 0, Status = "dns" });
        Assert.AreSequenceEqual(comparisonYears, StatisticsRules.Comparison(rows, 1, DisciplineCatalog.Find(1)!).Select(x => x.Year).ToArray());
        Assert.AreSequenceEqual(expectedProgressYears, StatisticsRules.ProgressComparison(rows, 1, DisciplineCatalog.Find(1)!).Select(x => x.Year).ToArray());
    }

    [TestMethod]
    public void SkillCutoffUsesNewDatasetGloballyAndKeepsEmptyCategories()
    {
        Assert.AreEqual("A", SkillLimits.CalculateMark(6.95, 1, 2016, new DateOnly(2025, 12, 31), true));
        Assert.IsNull(SkillLimits.CalculateMark(6.95, 1, 2017, new DateOnly(2026, 1, 1), true));
        Assert.AreEqual("A", SkillLimits.CalculateMark(27.3, 4, 2018, new DateOnly(2026, 1, 1), true));
        Assert.IsNull(SkillLimits.CalculateMark(27.3, 4, 2017, new DateOnly(2025, 12, 31), true));
        Assert.AreEqual("B", SkillLimits.CalculateMark(4.2, 26, 2018, new DateOnly(2026, 1, 1), false));
        Assert.AreEqual(4.7, SkillLimits.ForDiscipline(26, 2018, 2026)!.A);
    }
}
