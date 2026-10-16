using Loikka.Core.Models;
using Loikka.Core.Rules;
using Loikka.Core.Data;
using Loikka.Core.Formatting;
using Loikka_App.Services;
using Loikka_App.Controls;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using System.Text.Json;

namespace Loikka_App.Pages;

public sealed partial class ResultsPage : NativePage
{
    private ListView? list;
    public ResultsPage(AppSession session) : base(session, "Results", "Tulokset")
    {
        Command("Lisää tulos", Symbol.Add, Add, "AddResult");
        Command("Poista valitut", Symbol.Delete, () => _ = Act(async () =>
        {
            var selected = list?.SelectedItems.OfType<DisplayRow>().Select(r => r.Id).ToList() ?? [];
            if (selected.Count > 0 && await Session.Confirm("Poista tulokset?", $"Poistetaan {selected.Count} tulosta sekä mahdolliset moniottelun osatulokset. Mitalit säilyvät historiassa."))
            {
                foreach (long id in selected)
                {
                    await Session.Run(db => db.DeleteResultAsync(id));
                }

                await Refresh();
            }
        }), "DeleteSelectedResults");
        Command("Peruuta valinta", Symbol.Cancel, () => list?.SelectedItems.Clear());
    }

    public override void Add() => _ = Act(async () =>
    {
        await ResultEditor.Show(Session);
        await Refresh();
    });
    protected override async Task Load()
    {
        var results = await Session.Run(db => db.GetResultsAsync());
        var athletes = await Session.Run(db => db.GetAthletesAsync());
        var disciplines = await Session.Run(db => db.GetDisciplinesAsync());
        if (!Active)
        {
            return;
        }

        Body.Children.Clear();
        var filters = Ui.Form();
        var athlete = Ui.Select(filters, "Urheilija", new[] { new Choice("", "Kaikki urheilijat") }.Concat(athletes.Select(a => new Choice(a.Id.ToString(), $"{a.FirstName} {a.LastName}"))), "", "ResultAthleteFilter");
        var discipline = Ui.Select(filters, "Laji", new[] { new Choice("", "Kaikki lajit") }.Concat(disciplines.Select(d => new Choice(d.Id.ToString(), d.Name))), "", "ResultDisciplineFilter");
        var type = Ui.Select(filters, "Tyyppi", [new("", "Kaikki tulokset"), new("competition", "Kilpailu"), new("training", "Harjoitus")], "", "ResultTypeFilter");
        var season = Ui.Select(filters, "Kausi", new[] { new Choice("", "Kaikki kaudet") }.Concat(results.Select(r => r.Date[..4]).Distinct().OrderDescending().Select(y => new Choice(y, y))), "", "ResultSeasonFilter");
        var age = Ui.Select(filters, "Ikäsarja", new[] { new Choice("", "Kaikki ikäsarjat") }.Concat(athletes.Select(a => AgeRules.DisplayCategory(a.BirthYear, DateTime.Today.Year)).Distinct().Select(y => new Choice(y, y))), "", "ResultAgeFilter");
        filters.Children.Add(Ui.Button("Tyhjennä suodattimet", () =>
        {
            foreach (var box in new[]
            {
                athlete,
                discipline,
                type,
                season,
                age
            }

            )
            {
                box.SelectedIndex = 0;
            }
        }, "ClearResultFilters"));
        Body.Children.Add(filters);
        var host = new StackPanel();
        Body.Children.Add(host);
        void Draw()
        {
            var filtered = results.Where(r => (Ui.Id(athlete) == 0 || r.AthleteId == Ui.Id(athlete)) && (Ui.Id(discipline) == 0 || r.DisciplineId == Ui.Id(discipline)) && (Ui.Key(type) == "" || r.Type == Ui.Key(type)) && (Ui.Key(season) == "" || r.Date.StartsWith(Ui.Key(season))) && (Ui.Key(age) == "" || athletes.Any(a => a.Id == r.AthleteId && AgeRules.DisplayCategory(a.BirthYear, DateTime.Today.Year) == Ui.Key(age)))).ToList();
            host.Children.Clear();
            if (filtered.Count == 0)
            {
                host.Children.Add(Ui.Text("Ei tuloksia valituilla suodattimilla."));
            }

            list = Ui.List(Rows(filtered, athletes, disciplines), "ResultRow", row => _ = Act(async () =>
            {
                await ResultEditor.Show(Session, (Result)row.Data);
                await Refresh();
            }));
            host.Children.Add(list);
        }

        foreach (var box in new[]
        {
            athlete,
            discipline,
            type,
            season,
            age
        }

        )
        {
            box.SelectionChanged += (_, _) => Draw();
        }

        Draw();
        KeyDown += (_, args) =>
        {
            if (args.Key == Windows.System.VirtualKey.Escape)
            {
                list?.SelectedItems.Clear();
            }
        };
    }

    internal static IEnumerable<DisplayRow> Rows(IEnumerable<Result> results, IReadOnlyList<Athlete> athletes, IReadOnlyList<Discipline> disciplines)
    {
        foreach (var r in results.OrderByDescending(r => r.Date).ThenByDescending(r => r.Id))
        {
            var a = athletes.FirstOrDefault(a => a.Id == r.AthleteId);
            var d = disciplines.FirstOrDefault(d => d.Id == r.DisciplineId);
            var flags = RecordFlags(r);
            string value = DisplayValue(r, d);
            string? mark = SkillMark(r, a, d);
            string wind = WindDescription(r, a, d);
            string medal = MedalDescription(r);
            string breakdown = ResultEditor.FormatSubResults(r.SubResults, disciplines);
            yield return new DisplayRow(r.Id, $"{d?.Name ?? r.DisciplineId.ToString()}: {value}{flags}{(mark is null ? "" : " · Taitomerkki " + mark)}", $"{Ui.Date(r.Date)} · {a?.FirstName} {a?.LastName} · {(r.Type == "training" ? "Harjoitus" : r.CompetitionName ?? "Kilpailu")}\n{Ui.Level(r.CompetitionLevel, r.CustomLevelName)} · {r.Location}{(r.Placement.HasValue ? " · Sija " + r.Placement : "")}{medal}{(r.CombinedEventId.HasValue ? " · Moniottelun osatulos #" + r.CombinedEventId : "")}{wind}\n{r.Notes}{(breakdown.Length == 0 ? "" : "\n" + breakdown)}", r);
        }
    }
    private static string RecordFlags(Result r) => $"{(r.IsPersonalBest ? " OE" : "")}{(r.IsSeasonBest ? " KE" : "")}{(r.IsNationalRecord ? " SE" : "")}";

    private static string DisplayValue(Result r, Discipline? d)
    {
        string value = d is null ? r.Value.ToString(Ui.Finnish) : ResultFormatter.Result(r, d);
        if (d is not null && RecordRules.IsValid(r) && DisciplineCatalog.UsesCentimeters(d.Id))
        {
            value = ResultFormatter.Distance(r.Value, centimeters: true);
        }
        return value;
    }

    private static string? SkillMark(Result r, Athlete? a, Discipline? d)
    {
        if (a is null || d is null || !RecordRules.IsValid(r) || !DateOnly.TryParse(r.Date, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var date)) return null;
        return SkillLimits.CalculateMark(r.Value, d.Id, a.BirthYear, date, d.LowerIsBetter);
    }
    private static string WindDescription(Result r, Athlete? a, Discipline? d)
    {
        if (!r.Wind.HasValue) return "";
        bool assisted = a is not null && d is not null && DateOnly.TryParse(r.Date, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var date) && RecordRules.IsWindAssisted(r.Wind, d.Name, a.BirthYear, date.Year);
        return " · Tuuli " + r.Wind.Value.ToString("+0.0;-0.0;0.0", Ui.Finnish) + (assisted ? "w" : "");
    }
    private static string MedalDescription(Result r)
    {
        if (r.Type != "competition" || !RecordRules.IsValid(r)) return "";
        return r.Placement switch { 1 => " · Kulta", 2 => " · Hopea", 3 => " · Pronssi", _ => "" };
    }

}

internal static class ResultEditor
{
    private const string ValidKey = "valid";
    internal static readonly string[] ResultStatuses = new[]
    {
        ValidKey,
        "nm",
        "dns",
        "dnf",
        "dq"
    };
    public static Task Show(AppSession session, Result? original = null, long? athleteId = null) => new ResultForm(session, original, athleteId).ShowAsync();
    private sealed record CombinedPart([property: System.Text.Json.Serialization.JsonRequired] long DisciplineId, [property: System.Text.Json.Serialization.JsonRequired] double Value, double? Points);
    internal static string FormatSubResults(string? json, IReadOnlyList<Discipline> disciplines)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return "";
        }

        try
        {
            var parts = JsonSerializer.Deserialize<List<CombinedPart?>>(json, LegacyJson.Options) ?? [];
            return string.Join("\n", parts.OfType<CombinedPart>().Select(part =>
            {
                var d = disciplines.FirstOrDefault(d => d.Id == part.DisciplineId);
                string value = part.Value.ToString(System.Globalization.CultureInfo.InvariantCulture);
                if (d is not null) value = DisciplineCatalog.UsesCentimeters(d.Id) ? ResultFormatter.Distance(part.Value, centimeters: true) : ResultFormatter.Value(part.Value, d);
                return $"{d?.Name ?? "Tuntematon laji #" + part.DisciplineId}: {value}{(part.Points.HasValue ? " · " + part.Points.Value.ToString(Ui.Finnish) + " p" : "")}";
            }));
        }
        catch (JsonException)
        {
            return "Osatulosten erittelyä ei voitu lukea.";
        }
    }

    internal static int? OptionalInteger(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        return int.TryParse(value, out int n) && n > 0 ? n : throw new InvalidDataException("Anna positiivinen kokonaisluku.");
    }

    internal static double? OptionalDecimal(string value) => string.IsNullOrWhiteSpace(value) ? null : SegmentedInput.ParseDecimal(value) ?? throw new InvalidDataException("Anna kelvollinen luku.");
    private sealed class ResultForm
    {
        private List<Athlete> athletes = default!;
        private List<Discipline> disciplines = default!;
        private List<Result> history = default!;
        private ComboBox athlete = default!;
        private ComboBox eventBox = default!;
        private ComboBox status = default!;
        private ComboBox type = default!;
        private ComboBox level = default!;
        private CalendarDatePicker date = default!;
        private CheckBox showAll = default!;
        private CheckBox national = default!;
        private Discipline selectedDiscipline = default!;
        private ResultInput input = default!;
        private AutoSuggestBox name = default!;
        private AutoSuggestBox location = default!;
        private TextBox custom = default!;
        private TextBox placement = default!;
        private TextBox wind = default!;
        private TextBox weight = default!;
        private TextBox height = default!;
        private TextBox spacing = default!;
        private TextBox notes = default!;
        private string appliedStatus = default!;
        private string? pendingStatus = default!;
        private bool applyingStatus = default!;
        private StackPanel statusPrompt = default!;
        private StackPanel subPanel = default!;
        private List<(ComboBox Event, ResultInput Input, TextBox Points)> subEntries = default!;
        private TextBlock preview = default!;
        private long configuredDisciplineId = default!;
        private Result edited = default!;
        private readonly AppSession session;
        private readonly Result? original;
        private readonly long? athleteId;
        public ResultForm(AppSession session, Result? original, long? athleteId)
        {
            this.session = session;
            this.original = original;
            this.athleteId = athleteId;
        }

        public async Task ShowAsync()
        {
            athletes = await session.Run(db => db.GetAthletesAsync());
            disciplines = await session.Run(db => db.GetDisciplinesAsync());
            history = await session.Run(db => db.GetResultsAsync());
            var competitions = await session.Run(db => db.GetCompetitionsAsync());
            if (athletes.Count == 0)
            {
                throw new InvalidDataException("Lisää ensin urheilija.");
            }

            var form = Ui.Form();
            athlete = Ui.Select(form, "Urheilija *", athletes.Select(a => new Choice(a.Id.ToString(), $"{a.FirstName} {a.LastName}")), (original?.AthleteId ?? athleteId)?.ToString(), "ResultAthlete");
            date = Ui.DateInput(form, "Päivämäärä *", original?.Date ?? DateTime.Today.ToString("yyyy-MM-dd"), "ResultDate");
            eventBox = Ui.Select(form, "Laji *", disciplines.Select(d => new Choice(d.Id.ToString(), d.Name)), original?.DisciplineId.ToString(), "ResultDiscipline");
            showAll = Ui.Check(form, "Näytä kaikki lajit");
            selectedDiscipline = disciplines.First(d => d.Id == Ui.Id(eventBox));
            input = new ResultInput(selectedDiscipline, original?.Value);
            form.Children.Add(input);
            if (original?.SubResults is not null)
            {
                var breakdown = Ui.Text(FormatSubResults(original.SubResults, disciplines));
                Microsoft.UI.Xaml.Automation.AutomationProperties.SetAutomationId(breakdown, "CombinedBreakdown");
                form.Children.Add(breakdown);
            }

            status = Ui.Select(form, "Tuloksen tila", ResultStatuses.Select(s => new Choice(s, ResultFormatter.Status(s))), original?.Status ?? ValidKey, "ResultStatus");
            type = Ui.Select(form, "Tyyppi", [new("competition", "Kilpailu"), new("training", "Harjoitus")], original?.Type ?? "competition", "ResultType");
            name = Ui.Suggest(form, "Kilpailun nimi", original?.CompetitionName, history.Select(r => r.CompetitionName).OfType<string>().Concat(competitions.Select(c => c.Name)), "ResultCompetition");
            level = Ui.Select(form, "Kilpailun taso", Ui.Levels, original?.CompetitionLevel, "ResultLevel");
            custom = Ui.Field(form, "Muun kilpailutason nimi", original?.CustomLevelName, "ResultCustomLevel");
            location = Ui.Suggest(form, "Paikka", original?.Location, history.Select(r => r.Location).OfType<string>().Concat(competitions.Select(c => c.Location).OfType<string>()), "ResultLocation");
            placement = Ui.Field(form, "Sijoitus", original?.Placement?.ToString(), "ResultPlacement");
            wind = Ui.Field(form, "Tuuli (m/s)", original?.Wind?.ToString(Ui.Finnish), "ResultWind");
            weight = Ui.Field(form, "Välineen paino (keihäs g, muut kg)", original?.EquipmentWeight?.ToString(Ui.Finnish), "ResultWeight");
            height = Ui.Field(form, "Aitakorkeus (cm)", original?.HurdleHeight?.ToString(), "ResultHurdleHeight");
            spacing = Ui.Field(form, "Aitaväli (m)", original?.HurdleSpacing?.ToString(Ui.Finnish), "ResultHurdleSpacing");
            national = Ui.Check(form, "Suomen ennätys (SE)", original?.IsNationalRecord == true);
            notes = Ui.Field(form, "Muistiinpanot", original?.Notes, "ResultNotes", true);
            appliedStatus = Ui.Key(status);
            pendingStatus = null;
            applyingStatus = false;
            statusPrompt = new StackPanel
            {
                Spacing = 8,
                Visibility = Visibility.Collapsed
            };
            statusPrompt.Children.Add(new InfoBar { IsOpen = true, IsClosable = false, Severity = InfoBarSeverity.Warning, Message = "Tilan muuttaminen tyhjentää numeerisen tuloksen ja sijoituksen. Vahvista muutos tai peruuta se." });
            statusPrompt.Children.Add(Ui.Button("Vahvista tyhjennys", () =>
            {
                if (pendingStatus is not null)
                {
                    ApplyStatus(pendingStatus);
                }
            }, "StatusChangeConfirm"));
            statusPrompt.Children.Add(Ui.Button("Peruuta muutos", () =>
            {
                pendingStatus = null;
                statusPrompt.Visibility = Visibility.Collapsed;
            }, "StatusChangeCancel"));
            form.Children.Insert(form.Children.IndexOf(status) + 1, statusPrompt);
            status.SelectionChanged += StatusChanged;
            subPanel = new StackPanel
            {
                Spacing = 12
            };
            form.Children.Add(subPanel);
            subEntries = new List<(ComboBox Event, ResultInput Input, TextBox Points)>();
            preview = Ui.Text("");
            form.Children.Add(preview);
            configuredDisciplineId = -1;
            eventBox.SelectionChanged += (_, _) =>
            {
                if (Ui.Id(eventBox) > 0)
                {
                    Reconfigure();
                }
            };
            showAll.Checked += (_, _) => AgeFilter();
            showAll.Unchecked += (_, _) => AgeFilter();
            athlete.SelectionChanged += (_, _) => AgeFilter();
            date.DateChanged += (_, _) => AgeFilter();
            AgeFilter();
            if (original is not null)
            {
                input.Configure(disciplines.First(d => d.Id == original.DisciplineId), original.Value);
            }

            form.LostFocus += PreviewResult;
            edited = original is null ? new Result() : original with
            {
            };
            bool deleteRequested = false;
            await session.Edit(original is null ? "Lisää tulos" : "Muokkaa tulosta", form, Save, original is null ? null : "Poista", () => deleteRequested = true);
            if (deleteRequested && await session.Confirm("Poista tulos?", "Myös moniottelun osatulokset poistetaan. Mitalihistoria säilytetään."))
            {
                await session.Run(db => db.DeleteResultAsync(original!.Id));
            }

            await session.Celebrations.ShowNew();
        }

        private void StatusChanged(object sender, SelectionChangedEventArgs args)
        {
            if (applyingStatus)
            {
                return;
            }

            string selected = Ui.Key(status);
            if (original is not null && appliedStatus == ValidKey && selected != ValidKey && input.Value.HasValue)
            {
                pendingStatus = selected;
                applyingStatus = true;
                status.SelectedItem = ((IEnumerable<Choice>)status.ItemsSource).First(c => c.Key == appliedStatus);
                applyingStatus = false;
                statusPrompt.Visibility = Visibility.Visible;
            }
            else
            {
                ApplyStatus(selected);
            }
        }

        private void PreviewResult(object sender, RoutedEventArgs args)
        {
            if (input.Value is not double value)
            {
                return;
            }

            var candidate = new Result
            {
                Id = original?.Id ?? long.MaxValue,
                AthleteId = Ui.Id(athlete),
                DisciplineId = Ui.Id(eventBox),
                Date = Ui.Iso(date, false),
                Value = value,
                Status = Ui.Key(status),
                Wind = SegmentedInput.ParseDecimal(wind.Text),
                EquipmentWeight = SegmentedInput.ParseDecimal(weight.Text),
                HurdleHeight = int.TryParse(height.Text, out int h) ? h : null
            };
            var calculated = RecordRules.Recalculate(history.Where(r => r.Id != candidate.Id).Append(candidate), athletes, disciplines).First(r => r.Id == candidate.Id);
            var selectedAthlete = athletes.First(a => a.Id == candidate.AthleteId);
            string? mark = DateOnly.TryParse(candidate.Date, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var resultDate) && candidate.Status == ValidKey ? SkillLimits.CalculateMark(value, selectedDiscipline.Id, selectedAthlete.BirthYear, resultDate, selectedDiscipline.LowerIsBetter) : null;
            preview.Text = $"{(calculated.IsPersonalBest ? "OE – oma ennätys" : "")}{(calculated.IsSeasonBest ? " · KE – kauden ennätys" : "")}{(mark is null ? "" : " · Taitomerkki " + mark)}";
        }

        private async Task Save()
        {
            if (pendingStatus is not null)
            {
                throw new InvalidDataException("Vahvista tai peruuta tuloksen tilan muutos.");
            }

            edited.AthleteId = Ui.Id(athlete);
            edited.DisciplineId = Ui.Id(eventBox);
            edited.Date = Ui.Iso(date);
            edited.Type = Ui.Key(type);
            edited.Status = Ui.Key(status);
            edited.Value = edited.Status == ValidKey ? input.Value ?? throw new InvalidDataException("Anna tulos.") : 0;
            if (edited.Status == ValidKey && edited.Value <= 0 && selectedDiscipline.Category != "combined")
            {
                throw new InvalidDataException("Tuloksen on oltava positiivinen.");
            }

            edited.CompetitionName = Ui.Optional(name.Text);
            edited.CompetitionLevel = Ui.Optional(Ui.Key(level));
            edited.CustomLevelName = Ui.Optional(custom.Text);
            edited.Location = Ui.Optional(location.Text);
            edited.Placement = edited.Status == ValidKey ? OptionalInteger(placement.Text) : null;
            edited.Wind = OptionalDecimal(wind.Text);
            edited.EquipmentWeight = OptionalDecimal(weight.Text);
            edited.HurdleHeight = OptionalInteger(height.Text);
            edited.HurdleSpacing = OptionalDecimal(spacing.Text);
            edited.IsNationalRecord = national.IsChecked == true;
            edited.Notes = Ui.Optional(notes.Text);
            if (subEntries.Count > 0)
            {
                var children = new List<Result>();
                var json = new List<object>();
                double total = 0;
                foreach (var entry in subEntries)
                {
                    var value = entry.Input.Value;
                    if (!value.HasValue)
                    {
                        continue;
                    }

                    int points = OptionalInteger(entry.Points.Text) ?? 0;
                    total += points;
                    json.Add(new { disciplineId = Ui.Id(entry.Event), value = value.Value, points });
                    children.Add(edited with { Id = 0, DisciplineId = Ui.Id(entry.Event), Value = value.Value, Placement = null, SubResults = null, IsNationalRecord = false });
                }

                edited.Value = total;
                edited.SubResults = JsonSerializer.Serialize(json, LegacyJson.Options);
                await session.Run(db => db.SaveCombinedResultAsync(edited, children));
            }
            else
            {
                await session.Run(db => db.SaveResultAsync(edited));
            }
        }

        private void ApplyStatus(string selected)
        {
            applyingStatus = true;
            appliedStatus = selected;
            pendingStatus = null;
            status.SelectedItem = ((IEnumerable<Choice>)status.ItemsSource).First(c => c.Key == selected);
            if (selected != ValidKey)
            {
                input.Configure(selectedDiscipline);
                placement.Text = "";
            }

            input.IsEnabled = placement.IsEnabled = selected == ValidKey;
            statusPrompt.Visibility = Visibility.Collapsed;
            applyingStatus = false;
        }

        private void Reconfigure()
        {
            if (configuredDisciplineId == Ui.Id(eventBox))
            {
                return;
            }

            configuredDisciplineId = Ui.Id(eventBox);
            selectedDiscipline = disciplines.First(d => d.Id == Ui.Id(eventBox));
            input.Configure(selectedDiscipline);
            wind.Visibility = new long[]
            {
                2,
                3,
                5,
                16,
                17,
                18,
                22,
                24
            }.Contains(selectedDiscipline.Id) ? Visibility.Visible : Visibility.Collapsed;
            weight.Visibility = selectedDiscipline.Category == "throws" ? Visibility.Visible : Visibility.Collapsed;
            height.Visibility = spacing.Visibility = selectedDiscipline.Category == "hurdles" ? Visibility.Visible : Visibility.Collapsed;
            subPanel.Children.Clear();
            subEntries.Clear();
            if (original is null && selectedDiscipline.Category == "combined")
            {
                int count = int.TryParse(selectedDiscipline.Name.Split('-')[0], out int n) ? n : 0;
                for (int i = 0; i < count; i++)
                {
                    var eventInput = Ui.Select(subPanel, $"Osalaji {i + 1}", disciplines.Where(d => d.Category != "combined").Select(d => new Choice(d.Id.ToString(), d.Name)), null, "SubEvent" + i);
                    var sub = new ResultInput(disciplines.First(d => d.Id == Ui.Id(eventInput)));
                    subPanel.Children.Add(sub);
                    var points = Ui.Field(subPanel, "Osalajin pisteet", "", "SubPoints" + i);
                    eventInput.SelectionChanged += (_, _) => sub.Configure(disciplines.First(d => d.Id == Ui.Id(eventInput)));
                    subEntries.Add((eventInput, sub, points));
                }
            }
        }

        private void AgeFilter()
        {
            long retained = Ui.Id(eventBox);
            var a = athletes.First(x => x.Id == Ui.Id(athlete));
            var allowed = DisciplineCatalog.ForAgeCategory(AgeRules.DisciplineCategory(a.BirthYear, date.Date?.Year ?? DateTime.Today.Year)).Select(d => d.Id).ToHashSet();
            var options = disciplines.Where(d => showAll.IsChecked == true || d.Id == retained || allowed.Contains(d.Id)).Select(d => new Choice(d.Id.ToString(), d.Name)).ToList();
            eventBox.ItemsSource = options;
            eventBox.SelectedItem = options.FirstOrDefault(x => x.Key == retained.ToString()) ?? options.FirstOrDefault();
        }
    }
}
