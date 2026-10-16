using Loikka.Core.Models;
using Loikka.Core.Rules;
using Loikka.Core.Data;
using Loikka_App.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace Loikka_App.Pages;

public sealed partial class CalendarPage : NativePage
{
    private ListView? list;
    public CalendarPage(AppSession session) : base(session, "Calendar", "Kalenteri")
    {
        Command("Lisää kilpailu", Symbol.Add, Add, "AddCompetition");
        Command("Poista valitut", Symbol.Delete, () => _ = Act(async () =>
        {
            var ids = list?.SelectedItems.OfType<DisplayRow>().Select(r => r.Id).ToArray() ?? [];
            if (ids.Length > 0 && await Session.Confirm("Poista kilpailut?", $"Poistetaan {ids.Length} kilpailua osallistujineen. Mitalit säilyvät historiassa."))
            {
                foreach (long id in ids)
                {
                    await Session.Run(db => db.DeleteCompetitionAsync(id));
                }

                await Refresh();
            }
        }));
        Command("Peruuta valinta", Symbol.Cancel, () => list?.SelectedItems.Clear());
    }

    public override void Add() => _ = Act(async () =>
    {
        await CompetitionEditor.Show(Session);
        await Refresh();
    });
    protected override async Task Load()
    {
        var competitions = await Session.Run(db => db.GetCompetitionsAsync());
        var participants = await Session.Run(db => db.GetParticipantsAsync());
        var athletes = await Session.Run(db => db.GetAthletesAsync());
        var disciplines = await Session.Run(db => db.GetDisciplinesAsync());
        if (!Active)
        {
            return;
        }

        Body.Children.Clear();
        var calendar = new CalendarView
        {
            Language = "fi-FI",
            FirstDayOfWeek = Windows.Globalization.DayOfWeek.Monday,
            SelectionMode = CalendarViewSelectionMode.Single,
            HorizontalAlignment = HorizontalAlignment.Left
        };
        calendar.CalendarViewDayItemChanging += (_, args) =>
        {
            string date = args.Item.Date.ToString("yyyy-MM-dd");
            int count = competitions.Count(c => string.CompareOrdinal(c.Date, date) <= 0 && string.CompareOrdinal(c.EndDate ?? c.Date, date) >= 0);
            args.Item.SetDensityColors(Enumerable.Repeat(Microsoft.UI.Colors.DodgerBlue, Math.Min(10, count)));
        };
        Body.Children.Add(calendar);
        var upcoming = Ui.Check(Body, "Näytä tulevat kilpailut", true);
        var host = new StackPanel
        {
            Spacing = 12
        };
        Body.Children.Add(host);
        void Draw()
        {
            string today = DateTime.Today.ToString("yyyy-MM-dd");
            string selectedDate = calendar.SelectedDates.FirstOrDefault(DateTimeOffset.Now).ToString("yyyy-MM-dd");
            var selected = competitions.Where(c => upcoming.IsChecked == true ? string.CompareOrdinal(c.Date, today) >= 0 : string.CompareOrdinal(c.Date, selectedDate) <= 0 && string.CompareOrdinal(c.EndDate ?? c.Date, selectedDate) >= 0).OrderBy(c => c.Date).ToList();
            host.Children.Clear();
            host.Children.Add(Ui.Text(upcoming.IsChecked == true ? "Tulevat kilpailut" : Ui.Date(selectedDate), 20));
            list = Ui.List(Rows(selected, participants, athletes, disciplines), "CompetitionRow", row => _ = Act(async () =>
            {
                await CompetitionEditor.Show(Session, (Competition)row.Data);
                await Refresh();
            }));
            if (selected.Count == 0)
            {
                host.Children.Add(Ui.Text("Ei kilpailuja valittuna päivänä tai ajanjaksona."));
            }

            host.Children.Add(list);
        }

        calendar.SelectedDatesChanged += (_, _) =>
        {
            upcoming.IsChecked = false;
            Draw();
        };
        upcoming.Checked += (_, _) => Draw();
        upcoming.Unchecked += (_, _) => Draw();
        Draw();
    }

    internal static IEnumerable<DisplayRow> Rows(IEnumerable<Competition> competitions, IReadOnlyList<CompetitionParticipant> participants, IReadOnlyList<Athlete> athletes, IReadOnlyList<Discipline> disciplines)
    {
        foreach (var c in competitions)
        {
            int days = DateOnly.TryParse(c.Date, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var day) ? day.DayNumber - DateOnly.FromDateTime(DateTime.Today).DayNumber : 0;
            string urgency = days switch { < 0 => "Mennyt kilpailu", 0 => "Tänään", _ => $"{days} päivää jäljellä" };
            var names = participants.Where(p => p.CompetitionId == c.Id).Select(p =>
            {
                var a = athletes.FirstOrDefault(a => a.Id == p.AthleteId);
                return $"{a?.FirstName} {a?.LastName}: {string.Join(", ", (p.DisciplinesPlanned ?? []).Select(id => disciplines.FirstOrDefault(d => d.Id == id)?.Name ?? id.ToString()))}";
            });
            yield return new DisplayRow(c.Id, c.Name, $"{Ui.Date(c.Date)}{(c.EndDate is null ? "" : " – " + Ui.Date(c.EndDate))} · {c.Location}\n{Ui.Level(c.Level, c.CustomLevelName)} · {urgency}\n{string.Join("\n", names)}\n{c.Address}\n{c.Notes}", c);
        }
    }
}

internal static class CompetitionEditor
{
    public static async Task Show(AppSession session, Competition? original = null)
    {
        var athletes = await session.Run(db => db.GetAthletesAsync());
        var disciplines = await session.Run(db => db.GetDisciplinesAsync());
        var participants = original is null ? [] : await session.Run(db => db.GetParticipantsAsync(original.Id));
        var form = Ui.Form();
        var name = Ui.Field(form, "Kilpailun nimi *", original?.Name, "CompetitionName");
        var start = Ui.DateInput(form, "Alkupäivä *", original?.Date ?? DateTime.Today.ToString("yyyy-MM-dd"), "CompetitionDate");
        var end = Ui.DateInput(form, "Loppupäivä (valinnainen)", original?.EndDate, "CompetitionEndDate");
        form.Children.Add(Ui.Button("Tyhjennä loppupäivä", () => end.Date = null));
        var location = Ui.Field(form, "Paikkakunta", original?.Location, "CompetitionLocation");
        var address = Ui.Field(form, "Osoite", original?.Address, "CompetitionAddress");
        var level = Ui.Select(form, "Taso", Ui.Levels, original?.Level, "CompetitionLevel");
        var custom = Ui.Field(form, "Muun kilpailutason nimi", original?.CustomLevelName, "CompetitionCustomLevel");
        var notes = Ui.Field(form, "Muistiinpanot", original?.Notes, "CompetitionNotes", true);
        form.Children.Add(Ui.Text("Osallistujat ja suunnitellut lajit", 20));
        var rows = new List<(Athlete Athlete, CheckBox Included, ListView Events)>();
        foreach (var athlete in athletes)
        {
            var existing = participants.FirstOrDefault(p => p.AthleteId == athlete.Id);
            var included = Ui.Check(form, $"{athlete.FirstName} {athlete.LastName}", existing is not null);
            var showAll = Ui.Check(form, "Näytä kaikki lajit");
            var events = new ListView
            {
                SelectionMode = ListViewSelectionMode.Multiple,
                MaxHeight = 180,
                DisplayMemberPath = "Label"
            };
            Microsoft.UI.Xaml.Automation.AutomationProperties.SetAutomationId(included, "CompetitionParticipant" + athlete.Id);
            Microsoft.UI.Xaml.Automation.AutomationProperties.SetAutomationId(showAll, "CompetitionShowAll" + athlete.Id);
            Microsoft.UI.Xaml.Automation.AutomationProperties.SetAutomationId(events, "CompetitionEvents" + athlete.Id);
            bool firstFill = true;
            showAll.Checked += (_, _) => FillParticipantEvents(events, existing, showAll, start, athlete, disciplines, ref firstFill);
            showAll.Unchecked += (_, _) => FillParticipantEvents(events, existing, showAll, start, athlete, disciplines, ref firstFill);
            start.DateChanged += (_, _) => FillParticipantEvents(events, existing, showAll, start, athlete, disciplines, ref firstFill);
            FillParticipantEvents(events, existing, showAll, start, athlete, disciplines, ref firstFill);
            form.Children.Add(events);
            rows.Add((athlete, included, events));
        }

        bool deleteRequested = false;
        await session.Edit(original is null ? "Lisää kilpailu" : "Muokkaa kilpailua", form, async () =>
        {
            if (string.IsNullOrWhiteSpace(name.Text))
            {
                throw new InvalidDataException("Anna kilpailun nimi.");
            }

            string date = Ui.Iso(start);
            string? endDate = Ui.Optional(Ui.Iso(end, false));
            if (endDate is not null && string.CompareOrdinal(endDate, date) < 0)
            {
                throw new InvalidDataException("Loppupäivä ei voi olla ennen alkupäivää.");
            }

            var changed = original is null ? new Competition() : original with
            {
            };
            changed.Name = name.Text.Trim();
            changed.Date = date;
            changed.EndDate = endDate;
            changed.Location = Ui.Optional(location.Text);
            changed.Address = Ui.Optional(address.Text);
            changed.Level = Ui.Optional(Ui.Key(level));
            changed.CustomLevelName = Ui.Optional(custom.Text);
            changed.Notes = Ui.Optional(notes.Text);
            var selected = rows.Where(r => r.Included.IsChecked == true).Select(r => new CompetitionParticipant { AthleteId = r.Athlete.Id, DisciplinesPlanned = r.Events.SelectedItems.OfType<Choice>().Select(c => long.Parse(c.Key)).ToList() }).ToList();
            await session.Run(db => db.SaveCompetitionAsync(changed, selected));
        }, original is null ? null : "Poista", () => deleteRequested = true);
        if (deleteRequested && await session.Confirm("Poista kilpailu?", "Kilpailu ja sen osallistujat poistetaan. Mitalihistoria säilytetään."))
        {
            await session.Run(db => db.DeleteCompetitionAsync(original!.Id));
        }
    }

    private static void FillParticipantEvents(ListView events, CompetitionParticipant? existing, CheckBox showAll, CalendarDatePicker start, Athlete athlete, List<Discipline> disciplines, ref bool firstFill)
    {
        var retained = events.SelectedItems.OfType<Choice>().Select(c => long.Parse(c.Key)).ToHashSet();
        if (firstFill)
        {
            retained.UnionWith(existing?.DisciplinesPlanned ?? []);
            firstFill = false;
        }

        int year = start.Date?.Year ?? DateTime.Today.Year;
        var allowed = DisciplineCatalog.ForAgeCategory(AgeRules.DisciplineCategory(athlete.BirthYear, year)).Select(d => d.Id).ToHashSet();
        var choices = disciplines.Where(d => showAll.IsChecked == true || allowed.Contains(d.Id) || retained.Contains(d.Id)).Select(d => new Choice(d.Id.ToString(), d.Name)).Concat(retained.Where(id => disciplines.All(d => d.Id != id)).Select(id => new Choice(id.ToString(), "Tuntematon laji #" + id))).ToList();
        events.ItemsSource = choices;
        foreach (var choice in choices.Where(c => retained.Contains(long.Parse(c.Key))))
        {
            events.SelectedItems.Add(choice);
        }
    }
}
