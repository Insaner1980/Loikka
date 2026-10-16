using Loikka.Core.Models;
using Loikka.Core.Rules;
using Loikka.Core.Data;
using Loikka.Core.Formatting;
using Loikka_App.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media.Imaging;

namespace Loikka_App.Pages;

public sealed partial class AthletesPage : NativePage
{
    public AthletesPage(AppSession session) : base(session, "Athletes", "Urheilijat")
    {
        Command("Lisää urheilija", Symbol.Add, Add, "AddAthlete");
    }

    public override void Add() => _ = Act(async () =>
    {
        await AthleteEditor.Show(Session);
        await Refresh();
    });
    protected override async Task Load()
    {
        var athletes = await Session.Run(db => db.GetAthletesAsync());
        var results = await Session.Run(db => db.GetResultsAsync());
        if (!Active)
        {
            return;
        }

        Body.Children.Clear();
        if (athletes.Count == 0)
        {
            Empty("Ei vielä urheilijoita. Lisää ensimmäinen urheilija.");
            return;
        }

        var files = new NativeFiles(Session);
        Body.Children.Add(Ui.List(athletes.Select(a => new DisplayRow(a.Id, $"{a.FirstName} {a.LastName}", $"{AgeRules.DisplayCategory(a.BirthYear, DateTime.Today.Year)} · {a.ClubName}\n{results.Count(r => r.AthleteId == a.Id)} tulosta", a, files.ImageUri(a.PhotoPath))), "AthleteRow", row => Session.Window.Navigate("Athletes", row.Id), portraits: true));
    }
}

internal static class AthleteEditor
{
    public static async Task Show(AppSession session, Athlete? original = null)
    {
        var form = Ui.Form();
        var files = new NativeFiles(session);
        var athletes = await session.Run(db => db.GetAthletesAsync());
        var first = Ui.Field(form, "Etunimi *", original?.FirstName, "AthleteFirstName");
        var last = Ui.Field(form, "Sukunimi *", original?.LastName, "AthleteLastName");
        var years = Enumerable.Range(2005, DateTime.Today.Year - 2004).Concat(original is null ? [] : new[] { original.BirthYear }).Distinct().OrderDescending();
        var year = Ui.Select(form, "Syntymävuosi *", years.Select(y => new Choice(y.ToString(), y.ToString())), (original?.BirthYear ?? DateTime.Today.Year - 10).ToString(), "AthleteBirthYear");
        var club = Ui.Suggest(form, "Seura", original?.ClubName, athletes.Select(a => a.ClubName).OfType<string>(), "AthleteClub");
        string? selected = null;
        bool remove = false;
        var preview = new Image
        {
            Height = 160,
            MaxWidth = 240,
            Stretch = Microsoft.UI.Xaml.Media.Stretch.Uniform
        };
        if (files.ImageUri(original?.PhotoPath) is { } current)
        {
            preview.Source = new BitmapImage(new Uri(current));
        }

        form.Children.Add(preview);
        form.Children.Add(Ui.Button("Valitse profiilikuva", () => Pick()));
        form.Children.Add(Ui.Button("Poista profiilikuva", () =>
        {
            selected = null;
            remove = true;
            preview.Source = null;
        }));
        async void Pick()
        {
            try
            {
                selected = await files.Pick(".jpg", ".jpeg", ".png", ".gif", ".webp");
                if (selected is not null)
                {
                    remove = false;
                    preview.Source = new BitmapImage(new Uri(selected));
                }
            }
            catch (Exception error)
            {
                form.Children.Add(Ui.Text(error.Message));
            }
        }

        await session.Edit(original is null ? "Lisää urheilija" : "Muokkaa urheilijaa", form, async () =>
        {
            if (string.IsNullOrWhiteSpace(first.Text) || string.IsNullOrWhiteSpace(last.Text))
            {
                throw new InvalidDataException("Etunimi ja sukunimi ovat pakollisia.");
            }

            var changed = original is null ? new Athlete
            {
                Gender = "T"
            }

            : original with
            {
            };
            changed.FirstName = first.Text.Trim();
            changed.LastName = last.Text.Trim();
            changed.BirthYear = (int)Ui.Id(year);
            changed.ClubName = Ui.Optional(club.Text);
            if (remove)
            {
                changed.PhotoPath = null;
            }

            await SaveProfileAsync(session, files, changed, selected);
        });
    }
    private static async Task SaveProfileAsync(AppSession session, NativeFiles files, Athlete changed, string? selected)
    {
        string? staged = selected is not null ? await files.StageProfile(selected, changed.Id) : null;
        if (staged is not null)
        {
            changed.PhotoPath = staged;
        }

        try
        {
            await session.Run(db => db.SaveAthleteAsync(changed));
        }
        catch
        {
            if (staged is not null)
            {
                files.DiscardProfile(staged);
            }

            throw;
        }
    }

}

public sealed partial class AthleteDetailPage : NativePage
{
    private readonly long athleteId;
    private long? initialDiscipline;
    public AthleteDetailPage(AppSession session, long id, long? disciplineId) : base(session, "AthleteDetail", "Urheilija")
    {
        athleteId = id;
        initialDiscipline = disciplineId;
        Command("Takaisin", Symbol.Back, () => Session.Window.Navigate("Athletes"), "BackToAthletes");
        Command("Muokkaa", Symbol.Edit, () => _ = Act(async () =>
        {
            var athlete = (await Session.Run(db => db.GetAthletesAsync())).First(a => a.Id == id);
            await AthleteEditor.Show(Session, athlete);
            await Refresh();
        }), "EditAthlete");
        Command("Lisää tulos", Symbol.Add, Add, "AddAthleteResult");
        Command("Poista urheilija", Symbol.Delete, () => _ = Act(async () =>
        {
            if (await Session.Confirm("Poista urheilija?", "Urheilijan tulokset, tavoitteet, osallistujat ja mitalit poistetaan. Kuvien tiedostot säilyvät palautusta varten."))
            {
                await Session.Run(db => db.DeleteAthleteAsync(id));
                Session.Window.Navigate("Athletes");
            }
        }), "DeleteAthlete");
    }

    public override void Add() => _ = Act(async () =>
    {
        await ResultEditor.Show(Session, athleteId: athleteId);
        await Refresh();
    });
    protected override async Task Load()
    {
        var athlete = (await Session.Run(db => db.GetAthletesAsync())).FirstOrDefault(a => a.Id == athleteId);
        var results = (await Session.Run(db => db.GetResultsAsync())).Where(r => r.AthleteId == athleteId).ToList();
        var disciplines = await Session.Run(db => db.GetDisciplinesAsync());
        var medals = (await Session.Run(db => db.GetMedalsAsync())).Where(m => m.AthleteId == athleteId).ToList();
        var goals = (await Session.Run(db => db.GetGoalsAsync())).Where(g => g.AthleteId == athleteId).ToList();
        if (!Active)
        {
            return;
        }

        Body.Children.Clear();
        if (athlete is null)
        {
            Empty("Urheilijaa ei löydy.");
            return;
        }

        Body.Children.Add(Ui.Text($"{athlete.FirstName} {athlete.LastName}", 24));
        Body.Children.Add(Ui.Text($"{AgeRules.DisplayCategory(athlete.BirthYear, DateTime.Today.Year)} · {athlete.ClubName}\n{results.Select(r => r.DisciplineId).Distinct().Count()} lajia · {results.Count} tulosta · OE {results.Count(r => r.IsPersonalBest)} · KE {results.Count(r => r.IsSeasonBest)} · SE {results.Count(r => r.IsNationalRecord)}\nKulta {medals.Count(m => m.Type == "gold")} · Hopea {medals.Count(m => m.Type == "silver")} · Pronssi {medals.Count(m => m.Type == "bronze")}"));
        var files = new NativeFiles(Session);
        if (files.ImageUri(athlete.PhotoPath) is { } image)
        {
            var portrait = new Image
            {
                Source = new BitmapImage(new Uri(image)),
                Height = 160,
                HorizontalAlignment = HorizontalAlignment.Left
            };
            var photoButton = new Button
            {
                Content = portrait
            };
            Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(photoButton, "Näytä urheilijan profiilikuva");
            photoButton.Click += (_, _) => Session.Window.ShowViewer([new Photo { Id = 0, FilePath = athlete.PhotoPath!, OriginalName = athlete.FirstName + " " + athlete.LastName }], 0, () =>
            {
            });
            Body.Children.Add(photoButton);
        }

        var filters = Ui.Form();
        var eventFilter = Ui.Select(filters, "Laji", new[] { new Choice("", "Kaikki lajit") }.Concat(disciplines.Where(d => results.Any(r => r.DisciplineId == d.Id) || medals.Any(m => m.DisciplineId == d.Id)).Select(d => new Choice(d.Id.ToString(), d.Name))), initialDiscipline?.ToString(), "AthleteDiscipline");
        var year = Ui.Select(filters, "Kausi", new[] { new Choice("", "Kaikki kaudet") }.Concat(results.Select(r => r.Date[..4]).Concat(medals.Select(m => m.Date[..4])).Distinct().OrderDescending().Select(y => new Choice(y, y))), "", "AthleteSeason");
        var competitionFilter = Ui.Select(filters, "Kilpailu", new[] { new Choice("", "Kaikki kilpailut") }.Concat(medals.Select(m => m.CompetitionName).Distinct().Order().Select(n => new Choice(n, n))), "", "AthleteMedalCompetition");
        competitionFilter.Visibility = Visibility.Collapsed;
        Body.Children.Add(filters);
        var tabs = new Pivot();
        foreach (var name in new[]
        {
            "Ennätykset",
            "Tulokset",
            "Mitalit",
            "Kehitys",
            "Tavoitteet"
        }

        )
        {
            tabs.Items.Add(new PivotItem { Header = name });
        }

        tabs.SelectedIndex = initialDiscipline.HasValue ? 1 : 0;
        Body.Children.Add(tabs);
        void Draw()
        {
            if (tabs.SelectedItem is not PivotItem current)
            {
                return;
            }

            foreach (PivotItem tab in tabs.Items)
            {
                tab.Content = null;
            }

            var panel = new StackPanel
            {
                Spacing = 12
            };
            long selected = Ui.Id(eventFilter);
            string season = Ui.Key(year);
            var filtered = results.Where(r => MatchesPeriod(r, selected, season)).ToList();
            competitionFilter.Visibility = tabs.SelectedIndex == 2 ? Visibility.Visible : Visibility.Collapsed;
            switch (tabs.SelectedIndex)
            {
                case 0:
                    DrawRecords(panel, filtered, disciplines, eventFilter, tabs);
                    break;
                case 1:
                    panel.Children.Add(Ui.List(ResultsPage.Rows(filtered, [athlete], disciplines), "DetailResult", row => _ = Act(async () =>
                    {
                        await ResultEditor.Show(Session, (Result)row.Data);
                        await Refresh();
                    })));
                    break;
                case 2:
                    DrawMedals(panel, medals, selected, season, competitionFilter, eventFilter, tabs);
                    break;
                case 3:
                    DrawProgress(panel, selected, season, filtered, results, disciplines);
                    break;
                case 4:
                    panel.Children.Add(Ui.Button("Lisää tavoite", () => _ = Act(async () =>
                    {
                        await GoalEditor.Show(Session, athleteId);
                        await Refresh();
                    })));
                    panel.Children.Add(Ui.List(GoalsPage.Rows(goals, [athlete], results, disciplines), "DetailGoal"));
                    break;
            }

            current.Content = panel;
        }

        tabs.SelectionChanged += (_, _) => Draw();
        eventFilter.SelectionChanged += (_, _) =>
        {
            UpdateSeasons(year, eventFilter, results, medals);
            Draw();
        };
        year.SelectionChanged += (_, _) => Draw();
        competitionFilter.SelectionChanged += (_, _) => Draw();
        Draw();
        initialDiscipline = null;
    }

    private static string MedalName(string type) => type switch
    {
        "gold" => "Kulta",
        "silver" => "Hopea",
        _ => "Pronssi"
    };

    private static void DrawRecords(StackPanel panel, List<Result> filtered, List<Discipline> disciplines, ComboBox eventFilter, Pivot tabs)
    {
        foreach (var best in filtered.Where(r => r.IsPersonalBest).OrderBy(r => r.DisciplineId).ThenBy(r => r.EquipmentWeight).ThenBy(r => r.HurdleHeight))
        {
            var d = disciplines.FirstOrDefault(d => d.Id == best.DisciplineId);
            if (d is null)
            {
                continue;
            }

            string unit = d.Name == "Keihäs" ? "g" : "kg";
            string equipment = best.EquipmentWeight.HasValue ? $" · Väline {best.EquipmentWeight.Value.ToString(Ui.Finnish)} {unit}" : "";
            string hurdles = best.HurdleHeight.HasValue ? $" · Aidat {best.HurdleHeight} cm" : "";
            panel.Children.Add(Ui.Button($"{d.Name}: {ResultFormatter.Result(best, d)} · {Ui.Date(best.Date)}{equipment}{hurdles}", () =>
            {
                eventFilter.SelectedItem = ((IEnumerable<Choice>)eventFilter.ItemsSource).First(x => x.Key == d.Id.ToString());
                tabs.SelectedIndex = 1;
            }));
        }

        if (panel.Children.Count == 0)
        {
            panel.Children.Add(Ui.Text("Ei ennätyksiä tällä kaudella."));
        }
    }

    private static void DrawMedals(StackPanel panel, List<Medal> medals, long selected, string season, ComboBox competitionFilter, ComboBox eventFilter, Pivot tabs)
    {
        panel.Children.Add(Ui.List(medals.Where(m => (selected == 0 || m.DisciplineId == selected) && (season == "" || m.Date.StartsWith(season)) && (Ui.Key(competitionFilter) == "" || m.CompetitionName == Ui.Key(competitionFilter))).Select(m => new DisplayRow(m.Id, $"{MedalName(m.Type)} · {m.DisciplineName}", $"{m.CompetitionName} · {Ui.Date(m.Date)} · {m.Location}", m)), "Medal", row =>
        {
            var medal = (Medal)row.Data;
            if (medal.DisciplineId.HasValue)
            {
                eventFilter.SelectedItem = ((IEnumerable<Choice>)eventFilter.ItemsSource).FirstOrDefault(x => x.Key == medal.DisciplineId.Value.ToString());
                tabs.SelectedIndex = 1;
            }
        }));
    }

    private void DrawProgress(StackPanel panel, long selected, string season, List<Result> filtered, List<Result> results, List<Discipline> disciplines)
    {
        if (selected == 0)
        {
            panel.Children.Add(Ui.Text("Valitse laji nähdäksesi kehityksen."));
            return;
        }

        foreach (var discipline in disciplines.Where(d => (selected == 0 || d.Id == selected) && filtered.Any(r => r.DisciplineId == d.Id)))
        {
            DrawDisciplineProgress(panel, season, results, discipline);
        }
    }

    private static void UpdateSeasons(ComboBox year, ComboBox eventFilter, List<Result> results, List<Medal> medals)
    {
        string retained = Ui.Key(year);
        long selected = Ui.Id(eventFilter);
        var years = new[]
        {
            new Choice("", "Kaikki kaudet")
        }.Concat(results.Where(r => selected == 0 || r.DisciplineId == selected).Select(r => r.Date[..4]).Concat(medals.Where(m => selected == 0 || m.DisciplineId == selected).Select(m => m.Date[..4])).Distinct().OrderDescending().Select(y => new Choice(y, y))).ToList();
        year.ItemsSource = years;
        year.SelectedItem = years.FirstOrDefault(y => y.Key == retained) ?? years[0];
    }

    private static string FormatChange(Discipline discipline, double change)
    {
        if (discipline.Unit == "time") return Math.Abs(change).ToString("F2", System.Globalization.CultureInfo.InvariantCulture) + " s";
        if (discipline.Category == "combined") return Math.Round(Math.Abs(change)).ToString(Ui.Finnish) + " p";
        return Math.Round(Math.Abs(change) * 100).ToString(Ui.Finnish) + " cm";
    }

    private static bool MatchesPeriod(Result result, long disciplineId, string season) => (disciplineId == 0 || result.DisciplineId == disciplineId) && (season == "" || result.Date.StartsWith(season));

    private void DrawDisciplineProgress(StackPanel panel, string season, List<Result> results, Discipline discipline)
    {
        var stats = StatisticsRules.Progress(results, athleteId, discipline, int.TryParse(season, out int y) ? y : null);
        double change = discipline.Unit == "time" ? -stats.Improvement : stats.Improvement;
        string changeValue = FormatChange(discipline, change);
        string direction = stats.Improvement switch { > 0 => "parantunut", < 0 => "heikentynyt", _ => "ei muutosta" };
        string sign = change switch { > 0 => "+", < 0 => "-", _ => "" };
        string improvement = stats.Count < 2 ? "–" : $"{sign}{changeValue} ({direction})";
        panel.Children.Add(Ui.Text(discipline.Name, 20));
        panel.Children.Add(Ui.Text($"Tuloksia {stats.Count} · Keskiarvo {ResultFormatter.Value(stats.Average, discipline)} · Kehitys {improvement}"));
        panel.Children.Add(Ui.Text($"Kaikkien aikojen paras: {(stats.AllTimeBest is null ? "–" : ResultFormatter.Value(stats.AllTimeBest.Value, discipline))} · Kauden paras: {(stats.SeasonBest is null ? "–" : ResultFormatter.Value(stats.SeasonBest.Value, discipline))}"));
        panel.Children.Add(StatisticsPage.ProgressChart(stats.ChartResults, discipline));
        var comparison = StatisticsRules.ProgressComparison(results, athleteId, discipline);
        if (comparison.Count > 1)
        {
            panel.Children.Add(Ui.Text("Kausien vertailu", 20));
            panel.Children.Add(new Loikka_App.Controls.NativeChart(comparison.Select(c => new Loikka_App.Controls.ChartPoint(c.Year.ToString(), c.BestResult!.Value, $"{c.Year}: {ResultFormatter.Value(c.BestResult.Value, discipline)}")).ToList(), discipline.Unit == "time", bar: true));
        }
    }
}
