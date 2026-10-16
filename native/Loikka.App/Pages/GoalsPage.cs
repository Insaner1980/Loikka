using Loikka.Core.Models;
using Loikka.Core.Rules;
using Loikka.Core.Formatting;
using Loikka_App.Services;
using Loikka_App.Controls;
using Microsoft.UI.Xaml.Controls;

namespace Loikka_App.Pages;

public sealed partial class GoalsPage : NativePage
{
    private const string ActiveKey = "active";
    private const string AchievedKey = "achieved";
    private ListView? active, achieved;
    public GoalsPage(AppSession session) : base(session, "Goals", "Tavoitteet")
    {
        Command("Lisää tavoite", Symbol.Add, Add, "AddGoal");
        Command("Poista valitut", Symbol.Delete, () => _ = Act(async () =>
        {
            var ids = (active?.SelectedItems.OfType<DisplayRow>() ?? []).Concat(achieved?.SelectedItems.OfType<DisplayRow>() ?? []).Select(r => r.Id).Distinct().ToList();
            if (ids.Count > 0 && await Session.Confirm("Poista tavoitteet?", $"Poistetaan {ids.Count} valittua tavoitetta."))
            {
                foreach (long id in ids)
                {
                    await Session.Run(db => db.DeleteGoalAsync(id));
                }

                await Refresh();
            }
        }));
        Command("Peruuta valinta", Symbol.Cancel, () =>
        {
            active?.SelectedItems.Clear();
            achieved?.SelectedItems.Clear();
        });
    }

    public override void Add() => _ = Act(async () =>
    {
        await GoalEditor.Show(Session);
        await Refresh();
    });
    protected override async Task Load()
    {
        var goals = await Session.Run(db => db.GetGoalsAsync());
        var results = await Session.Run(db => db.GetResultsAsync());
        var athletes = await Session.Run(db => db.GetAthletesAsync());
        var disciplines = await Session.Run(db => db.GetDisciplinesAsync());
        if (!Active)
        {
            return;
        }

        Body.Children.Clear();
        var filter = Ui.Select(Body, "Urheilija", new[] { new Choice("", "Kaikki urheilijat") }.Concat(athletes.Select(a => new Choice(a.Id.ToString(), $"{a.FirstName} {a.LastName}"))), "", "GoalAthleteFilter");
        var status = Ui.Select(Body, "Tila", new[] { new Choice(ActiveKey, "Aktiiviset"), new Choice(AchievedKey, "Saavutetut"), new Choice("all", "Kaikki") }, "all", "GoalStatusFilter");
        var host = new StackPanel
        {
            Spacing = 16
        };
        Body.Children.Add(host);
        void Draw()
        {
            var filtered = goals.Where(g => Ui.Id(filter) == 0 || g.AthleteId == Ui.Id(filter)).ToList();
            host.Children.Clear();
            active = achieved = null;
            if (Ui.Key(status) != AchievedKey)
            {
                host.Children.Add(Ui.Text("Aktiiviset tavoitteet", 20));
                active = Ui.List(Rows(filtered.Where(g => g.Status == ActiveKey), athletes, results, disciplines), "GoalRow");
                if (!filtered.Any(g => g.Status == ActiveKey))
                {
                    host.Children.Add(Ui.Text("Ei aktiivisia tavoitteita."));
                }

                host.Children.Add(active);
            }

            if (Ui.Key(status) != ActiveKey)
            {
                achieved = Ui.List(Rows(filtered.Where(g => g.Status == AchievedKey), athletes, results, disciplines), "AchievedGoal");
                AddAchievedGoals(host, achieved, filtered, Ui.Key(status));
            }
        }

        filter.SelectionChanged += (_, _) => Draw();
        status.SelectionChanged += (_, _) => Draw();
        Draw();
    }

    internal static IEnumerable<DisplayRow> Rows(IEnumerable<Goal> goals, IReadOnlyList<Athlete> athletes, IReadOnlyList<Result> results, IReadOnlyList<Discipline> disciplines)
    {
        var rows = new List<(double Progress, DisplayRow Row)>();
        foreach (var g in goals)
        {
            var a = athletes.FirstOrDefault(a => a.Id == g.AthleteId);
            var d = disciplines.FirstOrDefault(d => d.Id == g.DisciplineId);
            if (d is null)
            {
                continue;
            }

            var eligible = results.Where(r => r.AthleteId == g.AthleteId && r.DisciplineId == g.DisciplineId && RecordRules.IsValid(r)).ToList();
            double? best = null;
            if (eligible.Count > 0) best = d.LowerIsBetter ? eligible.Min(r => r.Value) : eligible.Max(r => r.Value);
            double progress = GoalRules.Progress(g, best);
            double? remaining = GoalRules.Remaining(g, best);
            var row = new DisplayRow(g.Id, $"{a?.FirstName} {a?.LastName} · {d.Name}: {ResultFormatter.Value(g.TargetValue, d)}", $"{(g.Status == AchievedKey ? "Saavutettu " + Ui.Date(g.AchievedAt) : progress.ToString("0", Ui.Finnish) + " %")} · Tavoitepäivä {Ui.Date(g.TargetDate)}\nParas {(best.HasValue ? ResultFormatter.Value(best.Value, d) : "Ei tuloksia")} · Jäljellä {(remaining.HasValue ? ResultFormatter.Value(remaining.Value, d) : "–")}", g);
            rows.Add((progress, row));
        }

        return rows.OrderByDescending(r => r.Progress).Select(r => r.Row);
    }
    private static void AddAchievedGoals(StackPanel host, ListView achieved, List<Goal> filtered, string status)
    {
        if (status == AchievedKey)
        {
            host.Children.Add(Ui.Text("Saavutetut tavoitteet", 20));
            if (!filtered.Any(g => g.Status == AchievedKey))
            {
                host.Children.Add(Ui.Text("Ei saavutettuja tavoitteita."));
            }

            host.Children.Add(achieved);
        }
        else
        {
            host.Children.Add(new Expander { Header = $"Saavutetut tavoitteet ({filtered.Count(g => g.Status == AchievedKey)})", Content = achieved, HorizontalContentAlignment = Microsoft.UI.Xaml.HorizontalAlignment.Stretch });
        }
    }

}

internal static class GoalEditor
{
    private const string ActiveKey = "active";
    public static async Task Show(AppSession session, long? athleteId = null)
    {
        var athletes = await session.Run(db => db.GetAthletesAsync());
        var disciplines = await session.Run(db => db.GetDisciplinesAsync());
        if (athletes.Count == 0)
        {
            throw new InvalidDataException("Lisää ensin urheilija.");
        }

        var form = Ui.Form();
        var athlete = Ui.Select(form, "Urheilija *", athletes.Select(a => new Choice(a.Id.ToString(), $"{a.FirstName} {a.LastName}")), athleteId?.ToString(), "GoalAthlete");
        var discipline = Ui.Select(form, "Laji *", disciplines.Select(d => new Choice(d.Id.ToString(), d.Name)), null, "GoalDiscipline");
        var input = new ResultInput(disciplines.First(d => d.Id == Ui.Id(discipline)));
        form.Children.Add(input);
        discipline.SelectionChanged += (_, _) => input.Configure(disciplines.First(d => d.Id == Ui.Id(discipline)));
        var deadline = Ui.DateInput(form, "Tavoitepäivä (valinnainen)", null, "GoalDeadline");
        form.Children.Add(Ui.Button("Tyhjennä tavoitepäivä", () => deadline.Date = null));
        await session.Edit("Lisää tavoite", form, async () =>
        {
            double value = input.Value ?? 0;
            if (value <= 0)
            {
                throw new InvalidDataException("Anna positiivinen tavoite.");
            }

            var goal = new Goal
            {
                AthleteId = Ui.Id(athlete),
                DisciplineId = Ui.Id(discipline),
                TargetValue = value,
                TargetDate = Ui.Optional(Ui.Iso(deadline, false)),
                Status = ActiveKey
            };
            await session.Run(db => db.SaveGoalAsync(goal));
        });
    }
}
