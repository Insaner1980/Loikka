using Loikka.Core.Models;
using Loikka.Core.Rules;
using Loikka_App.Services;
using Microsoft.UI.Xaml.Controls;

namespace Loikka_App.Pages;

public sealed partial class DashboardPage : NativePage
{
    public DashboardPage(AppSession session) : base(session, "Dashboard", "Lähtöviiva")
    {
    }

    protected override async Task Load()
    {
        var athletes = await Session.Run(db => db.GetAthletesAsync());
        var results = await Session.Run(db => db.GetResultsAsync());
        var competitions = await Session.Run(db => db.GetCompetitionsAsync());
        var participants = await Session.Run(db => db.GetParticipantsAsync());
        var disciplines = await Session.Run(db => db.GetDisciplinesAsync());
        if (!Active)
        {
            return;
        }

        Body.Children.Clear();
        Body.Children.Add(Ui.Text($"{athletes.Count} urheilijaa · {results.Count} tulosta · {results.Count(r => r.IsPersonalBest)} omaa ennätystä", 20));
        Body.Children.Add(Ui.Text("Tulevat kilpailut", 22));
        var upcoming = competitions.Where(c => string.CompareOrdinal(c.Date, DateTime.Today.ToString("yyyy-MM-dd")) >= 0).OrderBy(c => c.Date).Take(4).ToList();
        if (upcoming.Count == 0)
        {
            Empty("Ei tulevia kilpailuja.");
        }

        Body.Children.Add(Ui.List(CalendarPage.Rows(upcoming, participants, athletes, disciplines), "DashboardCompetition", row => _ = Act(async () =>
        {
            await CompetitionEditor.Show(Session, (Competition)row.Data);
            await Refresh();
        })));
        Body.Children.Add(Ui.Button("Kaikki kilpailut", () => Session.Window.Navigate("Calendar")));
        Body.Children.Add(Ui.Text("Urheilijat", 22));
        var files = new NativeFiles(Session);
        Body.Children.Add(Ui.List(athletes.Take(3).Select(a => new DisplayRow(a.Id, $"{a.FirstName} {a.LastName}", $"{AgeRules.DisplayCategory(a.BirthYear, DateTime.Today.Year)} · {a.ClubName}", a, files.ImageUri(a.PhotoPath))), "DashboardAthlete", row => Session.Window.Navigate("Athletes", row.Id), portraits: true));
        Body.Children.Add(Ui.Button("Kaikki urheilijat", () => Session.Window.Navigate("Athletes")));
        Body.Children.Add(Ui.Text("Viimeisimmät tulokset", 22));
        Body.Children.Add(Ui.List(ResultsPage.Rows(results.OrderByDescending(r => r.Date).ThenByDescending(r => r.Id).Take(3), athletes, disciplines), "DashboardResult", row =>
        {
            var r = (Result)row.Data;
            Session.Window.Navigate("Athletes", r.AthleteId, r.DisciplineId);
        }));
        Body.Children.Add(Ui.Button("Kaikki tulokset", () => Session.Window.Navigate("Results")));
    }
}
