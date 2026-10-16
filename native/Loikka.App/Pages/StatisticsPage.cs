using Loikka.Core.Models;
using Loikka.Core.Rules;
using Loikka.Core.Formatting;
using Loikka_App.Services;
using Loikka_App.Controls;
using Microsoft.UI.Xaml.Controls;

namespace Loikka_App.Pages;

public sealed partial class StatisticsPage : NativePage
{
    public StatisticsPage(AppSession session) : base(session, "Statistics", "Tilastot")
    {
    }

    protected override async Task Load()
    {
        var athletes = await Session.Run(db => db.GetAthletesAsync());
        var results = await Session.Run(db => db.GetResultsAsync());
        var disciplines = await Session.Run(db => db.GetDisciplinesAsync());
        if (!Active)
        {
            return;
        }

        Body.Children.Clear();
        if (athletes.Count == 0)
        {
            Empty("Lisää urheilija ja tuloksia nähdäksesi tilastot.");
            return;
        }

        var athlete = Ui.Select(Body, "Urheilija", athletes.Select(a => new Choice(a.Id.ToString(), $"{a.FirstName} {a.LastName}")), null, "StatsAthlete");
        var discipline = Ui.Select(Body, "Laji", [], null, "StatsDiscipline");
        var season = Ui.Select(Body, "Kausi", [], null, "StatsSeason");
        var host = new StackPanel
        {
            Spacing = 16
        };
        Body.Children.Add(host);
        var eligible = results.Where(RecordRules.IsValid).ToList();
        bool updating = false;
        void Seasons()
        {
            updating = true;
            var choices = eligible.Where(r => r.AthleteId == Ui.Id(athlete) && r.DisciplineId == Ui.Id(discipline)).Select(r => r.Date[..4]).Distinct().OrderDescending().Select(y => new Choice(y, y)).ToList();
            season.ItemsSource = choices;
            season.SelectedItem = choices.FirstOrDefault();
            updating = false;
            Draw();
        }

        void Events()
        {
            updating = true;
            var choices = disciplines.Where(d => eligible.Any(r => r.AthleteId == Ui.Id(athlete) && r.DisciplineId == d.Id)).Select(d => new Choice(d.Id.ToString(), d.Name)).ToList();
            discipline.ItemsSource = choices;
            discipline.SelectedItem = choices.FirstOrDefault();
            updating = false;
            Seasons();
        }

        void Draw()
        {
            if (updating)
            {
                return;
            }

            DrawStatistics(host, results, disciplines, Ui.Id(athlete), Ui.Id(discipline), Ui.Key(season));
        }

        athlete.SelectionChanged += (_, _) => Events();
        discipline.SelectionChanged += (_, _) =>
        {
            if (!updating)
            {
                Seasons();
            }
        };
        season.SelectionChanged += (_, _) => Draw();
        Events();
    }

    internal static NativeChart ProgressChart(IEnumerable<Result> results, Discipline discipline, double? personalBest = null) => new(results.OrderBy(r => r.Date).ThenBy(r => r.Id).Select(r => new ChartPoint(Ui.Date(r.Date), r.Value, $"{Ui.Date(r.Date)}: {ResultFormatter.Result(r, discipline)}{(r.IsPersonalBest ? " OE" : "")}{(r.IsSeasonBest ? " KE" : "")}{(r.IsNationalRecord ? " SE" : "")}", $"{(r.IsPersonalBest ? "OE " : "")}{(r.IsSeasonBest ? "KE " : "")}{(r.IsNationalRecord ? "SE" : "")}")).ToList(), discipline.LowerIsBetter, personalBest: personalBest);

    private static void DrawStatistics(StackPanel host, List<Result> results, List<Discipline> disciplines, long athleteId, long disciplineId, string season)
    {
        host.Children.Clear();
        var d = disciplines.FirstOrDefault(d => d.Id == disciplineId);
        if (d is null || !int.TryParse(season, out int year))
        {
            host.Children.Add(Ui.Text("Ei tuloksia valitulle urheilijalle."));
            return;
        }

        var stats = StatisticsRules.Season(results, athleteId, d, year);
        string Format(double? value) => value.HasValue ? ResultFormatter.Value(value.Value, d) : "–";
        host.Children.Add(Ui.Text($"Paras {Format(stats.BestResult)} · Keskiarvo {Format(stats.AverageResult)} · Kilpailuja {stats.CompetitionCount}", 20));
        if (stats.ImprovementPercent.HasValue && stats.BestResult.HasValue)
        {
            host.Children.Add(Ui.Text($"Kehitys edelliseen kalenterikauteen: {stats.ImprovementPercent.Value.ToString("0.0", Ui.Finnish)} % (noin {Format(Math.Abs(stats.BestResult.Value * stats.ImprovementPercent.Value / 100))})"));
        }

        var points = results.Where(r => r.AthleteId == athleteId && r.DisciplineId == d.Id && r.Date.StartsWith(year.ToString()) && RecordRules.IsValid(r)).OrderBy(r => r.Date).ThenBy(r => r.Id).ToList();
        var all = results.Where(r => r.AthleteId == athleteId && r.DisciplineId == d.Id && RecordRules.IsValid(r)).ToList();
        double? pb = null;
        if (all.Count > 0) pb = d.LowerIsBetter ? all.Min(r => r.Value) : all.Max(r => r.Value);
        host.Children.Add(ProgressChart(points, d, pb));
        host.Children.Add(Ui.Text("Kausivertailu", 20));
        var comparison = StatisticsRules.Comparison(results, athleteId, d).Where(x => x.BestResult.HasValue).Select(x => new ChartPoint(x.Year.ToString(), x.BestResult!.Value, $"{x.Year}: {ResultFormatter.Value(x.BestResult.Value, d)}")).ToList();
        host.Children.Add(new NativeChart(comparison, d.LowerIsBetter, bar: true));
    }
}
