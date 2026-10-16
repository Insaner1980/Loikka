using Loikka.Core.Models;
using Loikka.Infrastructure.Migration;
using Loikka_App.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using System.Text.Json;
using Loikka.Infrastructure.GoogleDrive;
using System.Diagnostics;
namespace Loikka_App.Pages;

public sealed partial class SettingsPage : NativePage
{
    private readonly HttpClient http = new()
    {
        Timeout = TimeSpan.FromMinutes(5)
    };
    private readonly CancellationTokenSource cloudLifetime = new();
    private readonly CancellationToken cloudToken;
    private GoogleOAuthClient? oauth;
    private DriveClient? drive;
    private DriveBackupService? backups;
    private CancellationTokenSource? job;
    private readonly List<Button> cloudCommands = [];
    private TextBlock? cloudStatus;
    private ListView? backupList;
    public SettingsPage(AppSession session) : base(session, "Settings", "Asetukset")
    {
        cloudToken = cloudLifetime.Token;
        Unloaded += (_, _) =>
        {
            cloudLifetime.Cancel();
            cloudLifetime.Dispose();
            http.Dispose();
        };
    }
    protected override async Task Load()
    {
        Body.Children.Clear();
        Body.Children.Add(Ui.Text("Tiedot", 22));
        Body.Children.Add(Ui.Text("JSON-vienti sisältää urheilijat, tulokset, kilpailut, tavoitteet ja mitalit. Kuvat, osallistujat ja sovelluksen asetukset eivät sisälly tähän tiedostoon."));
        Body.Children.Add(Ui.Button("Vie tiedot JSON-tiedostoon", () => _ = Act(Export), "ExportJson"));
        Body.Children.Add(Ui.Button("Tuo JSON-tiedosto", () => _ = Act(Import), "ImportJson"));
        Body.Children.Add(Ui.Button("Siirrä vanhan Loikan tietohakemisto", () => _ = Act(Migrate), "MigrateLegacy"));
        Body.Children.Add(Ui.Text("Siirto tukee tarkistettuja versioita 17–20. Versioiden 14–16 lajien tunnisteristiriidat, keskeneräiset rakenteet ja tuntemattomat versiot pysäyttävät siirron muuttamatta lähdettä."));
        Body.Children.Add(Ui.Button("Käyttöohje", () => _ = Act(Help), "OpenHelp"));
        await DriveSection();
        Body.Children.Add(Ui.Text("Loikka · natiivi Windows-versio 1.0.0 (beta)", 18));
    }
    private void Success(string message)
    {
        Message.Severity = InfoBarSeverity.Success;
        Message.Message = message;
        Message.IsOpen = true;
    }
    private async Task Export()
    {
        var path = await new NativeFiles(Session).SaveJson("Loikka-" + DateTime.Today.ToString("yyyy-MM-dd"));
        if (path is null)
        {
            return;
        }
        await Session.Run(db => db.ExportFileAsync(path));
        Success("Tiedot viety onnistuneesti.");
    }
    private async Task Import()
    {
        var path = await new NativeFiles(Session).Pick(".json");
        if (path is null)
        {
            return;
        }
        var data = JsonSerializer.Deserialize<ExportData>(await File.ReadAllTextAsync(path, cloudToken), LegacyJson.Options) ?? throw new InvalidDataException("Tiedosto on tyhjä.");
        if (!await Session.Confirm("Tuo tiedot?", $"Urheilijoita {data.Athletes.Count}, tuloksia {data.Results.Count}, kilpailuja {data.Competitions.Count}, tavoitteita {data.Goals.Count}, mitaleita {data.Medals.Count}.\nSamojen tunnisteiden kentät päivitetään. Muut tiedot ja suhteet säilytetään. Ennen tuontia säilytetään palautuskopio."))
        {
            return;
        }
        await Session.Run(db => db.ImportFileAsync(path));
        await Session.ReloadPreferences();
        Success("Tiedot tuotu. Päivittyneet tiedot näkyvät kaikilla sivuilla.");
    }
    private async Task Migrate()
    {
        var source = await new NativeFiles(Session).Folder();
        if (source is null)
        {
            return;
        }
        if (!await Session.Confirm("Siirrä vanhat tiedot?", "Sulje vanha Loikka ennen jatkamista. Valitusta hakemistosta kopioidaan tietokanta ja kuvat. Nykyinen natiivin sovelluksen aineisto säilytetään palautuskopiona. Alkuperäiseen hakemistoon ei kirjoiteta."))
        {
            return;
        }
        var stage = Session.Database.RootPath + ".legacy-" + Guid.NewGuid().ToString("N");
        var report = await Session.Run(_ => LegacyMigrationService.MigrateAsync(source, stage));
        var counts = string.Join("\n", report.TableCounts.Select(p => $"{p.Key}: {p.Value}"));
        string exceptions = report.Exceptions.Count == 0 ? "Ei raportoituja poikkeuksia." : string.Join("\n", report.Exceptions);
        if (!await Session.Confirm("Tarkista siirron tulos", counts + "\n\n" + exceptions + "\n\nAktivoidaanko kopio?"))
        {
            return;
        }
        await Session.Run(_ => SnapshotRestoreService.RestoreSnapshotAsync(stage, Session.Database.RootPath, MainWindow.ReleaseDataHandles, MainWindow.ReopenDataHandles, cloudToken));
        await Session.ReloadPreferences();
        Success("Kopio aktivoitu. Vanha aineisto ja palautuskopio on säilytetty. Tarkista kuvat ja aiemmat tulokset.");
    }
    private sealed record HelpSection(string Id, string Title, string Description, List<HelpContent> Content, List<string> Keywords);
    private sealed record HelpContent(string Type, string? Text, List<string>? Items, List<HelpRow>? Rows, List<string>? Headers);
    private sealed record HelpRow(List<string> Cols);
    private async Task Help()
    {
        var sections = JsonSerializer.Deserialize<List<HelpSection>>(await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "Assets", "Help.json"), cloudToken), LegacyJson.Options) ?? [];
        var form = Ui.Form();
        var search = Ui.Field(form, "Hae ohjeista", "", "HelpSearch");
        var content = new StackPanel
        {
            Spacing = 12
        };
        form.Children.Add(Ui.Button("Takaisin aiheisiin", Draw));
        form.Children.Add(new ScrollViewer { Content = content, MaxHeight = 450 });
        void Draw()
        {
            content.Children.Clear();
            string query = search.Text.Trim();
            var matches = sections.Select(section => MatchHelpSection(section, query))
                .Where(match => query.Length == 0 || match.Score > 0).OrderByDescending(match => match.Score).ToList();
            if (matches.Count == 0)
            {
                content.Children.Add(Ui.Text("Ei hakutuloksia."));
            }
            foreach (var match in matches)
            {
                var section = match.Section;
                content.Children.Add(Ui.Button(section.Title, () => ShowHelpSection(content, section)));
                content.Children.Add(Ui.Text(match.Excerpt));
            }
        }
        search.TextChanged += (_, _) => Draw();
        Draw();
        await Session.ShowContent("Loikan käyttöohje", form);
    }
    private void ConnectServices()
    {
        if (oauth is not null)
        {
            return;
        }
        var configuration = OAuthClientConfiguration.LoadFromDeploymentDirectory(AppContext.BaseDirectory);
        oauth = new GoogleOAuthClient(http, configuration, new WindowsTokenStore(Path.Combine(Session.Database.RootPath, "google-tokens.dpapi")));
        drive = new DriveClient(http, oauth);
        backups = new DriveBackupService(drive, Session.Database, MainWindow.ReleaseDataHandles, MainWindow.ReopenDataHandles);
    }
    private async Task DriveSection()
    {
        cloudCommands.Clear();
        Body.Children.Add(Ui.Text("Google Drive", 22));
        cloudStatus = Ui.Text("Yhteyttä ei ole tarkistettu. Varmuuskopiointi käynnistyy omasta komennostasi.");
        Body.Children.Add(cloudStatus);
        void Button(string label, Func<CancellationToken, Task> action, string id)
        {
            var button = Ui.Button(label, () => _ = Act(() => CloudWork(action)), id);
            cloudCommands.Add(button);
            Body.Children.Add(button);
        }
        Button("Yhdistä Google Driveen", async ct =>
        {
            ConnectServices();
            await oauth!.ConnectAsync((uri, _) =>
            {
                Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
                return Task.CompletedTask;
            }, ct);
            var status = await oauth.GetStatusAsync(ct);
            cloudStatus.Text = status.IsAuthenticated ? $"Yhdistetty: {status.UserEmail}" : "Kirjautumista ei vahvistettu.";
            await ListBackups(ct);
        }, "ConnectDrive");
        Button("Tarkista yhteys ja varmuuskopiot", async ct =>
        {
            ConnectServices();
            var status = await oauth!.GetStatusAsync(ct);
            cloudStatus.Text = status.IsAuthenticated ? $"Yhdistetty: {status.UserEmail}" : "Google Driveen ei ole kirjauduttu.";
            if (status.IsAuthenticated)
            {
                await ListBackups(ct);
            }
        }, "RefreshDrive");
        Button("Katkaise yhteys", DisconnectDrive, "DisconnectDrive");
        Button("Varmuuskopioi Driveen", ct => Transfer(true, null, ct), "UploadDrive");
        Button("Palauta viimeisin varmuuskopio", ct => Transfer(false, null, ct), "RestoreLatestDrive");
        var panel = new StackPanel
        {
            Spacing = 12
        };
        backupList = Ui.List([], "DriveBackup");
        panel.Children.Add(backupList);
        panel.Children.Add(Ui.Button("Palauta valittu", () => _ = Act(() => CloudWork(ct => backupList.SelectedItem is DisplayRow row ? Transfer(false, ((DriveBackup)row.Data).Id, ct) : Task.CompletedTask))));
        panel.Children.Add(Ui.Button("Poista valittu varmuuskopio", () => _ = Act(() => CloudWork(DeleteSelectedBackup))));
        var preferences = await Session.ReadPreferences();
        bool expanded = preferences.TryGetValue("loikka-backups-expanded", out var value) && value.ValueKind == JsonValueKind.True;
        var expander = new Expander
        {
            Header = "Pilven varmuuskopiot",
            Content = panel,
            IsExpanded = expanded,
            HorizontalContentAlignment = HorizontalAlignment.Stretch
        };
        expander.Expanding += (_, _) => _ = Act(() => Session.SetPreference("loikka-backups-expanded", true));
        expander.Collapsed += (_, _) => _ = Act(() => Session.SetPreference("loikka-backups-expanded", false));
        Body.Children.Add(expander);
        Body.Children.Add(Ui.Button("Peruuta pilvisiirto", () => job?.Cancel(), "CancelDrive"));
    }
    private async Task CloudWork(Func<CancellationToken, Task> action)
    {
        if (job is not null)
        {
            return;
        }
        using var current = CancellationTokenSource.CreateLinkedTokenSource(cloudToken);
        job = current;
        foreach (var button in cloudCommands)
        {
            button.IsEnabled = false;
        }
        try
        {
            await action(current.Token);
        }
        catch (OperationCanceledException)
        {
            if (Active)
            {
                Success("Pilvitoiminto peruttu.");
            }
        }
        finally
        {
            job = null;
            foreach (var button in cloudCommands)
            {
                button.IsEnabled = true;
            }
        }
    }
    private async Task ListBackups(CancellationToken token)
    {
        var values = await drive!.ListBackupsAsync(token);
        if (!Active || backupList is null)
        {
            return;
        }
        backupList.ItemsSource = values.Select((b, i) => new DisplayRow(i + 1, b.Name, $"{b.CreatedAt} · {(b.SizeBytes.HasValue ? b.SizeBytes.Value.ToString("N0", Ui.Finnish) + " tavua" : "Koko ei tiedossa")}", b)).ToList();
    }
    private async Task Transfer(bool upload, string? backupId, CancellationToken token)
    {
        ConnectServices();
        var options = await SelectTransferOptions(upload, backupId, token);
        if (options is null)
        {
            return;
        }
        if (!upload && !await Session.Confirm("Vahvista palautus", "Valitut tiedot palautetaan vasta tarkistuksen jälkeen. Nykyinen aineisto säilytetään palautuskopiona."))
        {
            return;
        }
        cloudStatus!.Text = upload ? "Varmuuskopioidaan…" : "Ladataan ja tarkistetaan palautusta…";
        var report = await Session.Run(_ => upload ? backups!.UploadAsync(options, token) : backups!.RestoreAsync(backupId, options, token));
        if (!upload)
        {
            await Session.ReloadPreferences();
        }
        cloudStatus.Text = $"Siirretty {report.ItemsTransferred} kohdetta. {(report.Warnings.Count > 0 ? string.Join("\n", report.Warnings) : "Siirto valmis.")}";
        await ListBackups(token);
    }
    private static (HelpSection Section, int Score, string Excerpt) MatchHelpSection(HelpSection section, string query)
    {
        int score = 0;
        string excerpt = "";
        MatchHelpText(section.Title, query, 10, ref score, ref excerpt);
        MatchHelpText(section.Description, query, 5, ref score, ref excerpt);
        foreach (string keyword in section.Keywords) MatchHelpText(keyword, query, 3, ref score, ref excerpt);
        foreach (var part in section.Content)
        {
            MatchHelpText(part.Text, query, 2, ref score, ref excerpt, true);
            foreach (string item in part.Items ?? []) MatchHelpText(item, query, 1, ref score, ref excerpt);
            foreach (string cell in (part.Rows ?? []).SelectMany(row => row.Cols)) MatchHelpText(cell, query, 1, ref score, ref excerpt);
        }
        return (section, score, query.Length == 0 ? section.Description : excerpt);
    }
    private static void MatchHelpText(string? text, string query, int weight, ref int score, ref string excerpt, bool snippet = false)
    {
        if (text is null || query.Length == 0) return;
        int index = text.IndexOf(query, StringComparison.CurrentCultureIgnoreCase);
        if (index < 0) return;
        score += weight;
        if (excerpt.Length > 0) return;
        int start = snippet ? Math.Max(0, index - 20) : 0;
        int end = snippet ? Math.Min(text.Length, index + query.Length + 40) : text.Length;
        excerpt = (start > 0 ? "…" : "") + text[start..end] + (end < text.Length ? "…" : "");
    }
    private static void ShowHelpSection(StackPanel content, HelpSection section)
    {
        content.Children.Clear();
        content.Children.Add(Ui.Text(section.Title, 24));
        foreach (var part in section.Content)
        {
            if (part.Text is not null) content.Children.Add(Ui.Text(part.Text, part.Type == "heading" ? 20 : 16));
            foreach (var item in part.Items ?? []) content.Children.Add(Ui.Text("• " + item));
            if (part.Headers is not null) content.Children.Add(Ui.Text(string.Join(" · ", part.Headers)));
            foreach (var row in part.Rows ?? []) content.Children.Add(Ui.Text(string.Join(" · ", row.Cols)));
        }
    }

    private async Task DisconnectDrive(CancellationToken ct)
    {
        ConnectServices();
        if (await Session.Confirm("Katkaise yhteys?", "Kirjautuminen poistetaan tältä tietokoneelta. Pilven varmuuskopiot säilyvät."))
        {
            await oauth!.DisconnectAsync(ct);
            cloudStatus!.Text = "Yhteys katkaistu.";
            if (backupList is not null)
            {
                backupList.ItemsSource = null;
            }
        }
    }

    private async Task DeleteSelectedBackup(CancellationToken ct)
    {
        if (backupList?.SelectedItem is not DisplayRow row)
        {
            return;
        }
        ConnectServices();
        var backup = (DriveBackup)row.Data;
        if (await Session.Confirm("Poista varmuuskopio?", backup.Name))
        {
            await drive!.DeleteBackupAsync(backup.Id, ct);
            await ListBackups(ct);
        }
    }

    private async Task<List<Choice>> TransferChoices(bool upload, string? backupId, bool includeDatabase, CancellationToken token)
    {
        var choices = new List<Choice>();
        if (upload)
        {
            foreach (var photo in await Session.Run(_ => Task.FromResult(backups!.ListLocalPhotos())))
            {
                choices.Add(new(photo.Path, photo.RelativePath));
            }
        }
        else
        {
            foreach (var photo in await backups!.ListRestorePhotosAsync(backupId, includeDatabase, token))
            {
                choices.Add(new(photo.Id, photo.RelativePath + " · " + photo.CreatedAt));
            }
        }
        return choices;
    }

    private static void ApplyTransferChoices(ListView list, List<Choice> choices, HashSet<string> retained, InfoBar selectionError)
    {
        list.ItemsSource = choices;
        foreach (var choice in choices.Where(c => retained.Contains(c.Key)))
        {
            list.SelectedItems.Add(choice);
        }
        selectionError.IsOpen = false;
    }

    private async Task<DriveSelection?> SelectTransferOptions(bool upload, string? backupId, CancellationToken token)
    {
        var form = Ui.Form();
        var database = Ui.Check(form, "Tietokanta", true);
        var profiles = Ui.Check(form, "Profiilikuvat", true);
        var gallery = Ui.Check(form, "Gallerian kuvat", true);
        var individual = Ui.Check(form, "Valitse yksittäiset kuvat");
        var list = new ListView
        {
            DisplayMemberPath = "Label",
            SelectionMode = ListViewSelectionMode.Multiple,
            MaxHeight = 240
        };
        form.Children.Add(list);
        var selectionError = new InfoBar
        {
            Severity = InfoBarSeverity.Error,
            IsClosable = false
        };
        form.Children.Add(selectionError);
        using var optionLifetime = CancellationTokenSource.CreateLinkedTokenSource(token);
        int generation = 0;
        Task loading = Task.CompletedTask;
        async Task LoadChoices()
        {
            int request = ++generation;
            bool includeDatabase = database.IsChecked == true;
            list.IsEnabled = false;
            var retained = list.SelectedItems.OfType<Choice>().Select(c => c.Key).ToHashSet();
            try
            {
                var choices = await TransferChoices(upload, backupId, includeDatabase, optionLifetime.Token);
                if (request != generation || optionLifetime.IsCancellationRequested)
                {
                    return;
                }
                ApplyTransferChoices(list, choices, retained, selectionError);
            }
            finally
            {
                if (request == generation)
                {
                    list.IsEnabled = true;
                }
            }
        }
        async void ReloadChoices(object sender, RoutedEventArgs args)
        {
            loading = LoadChoices();
            try
            {
                await loading;
            }
            catch (OperationCanceledException)
            {
                // Closing the options dialog cancels its pending photo listing.
            }
            catch (Exception error)
            {
                selectionError.Message = error.Message;
                selectionError.IsOpen = true;
            }
        }
        await LoadChoices();
        if (!upload)
        {
            database.Checked += ReloadChoices;
            database.Unchecked += ReloadChoices;
        }
        form.Children.Add(Ui.Text("Yksittäisvalinnassa tyhjä valinta tarkoittaa, ettei kuvia siirretä. Tietokannan palautus korvaa nykyisen aineiston; sitä edeltävä aineisto säilytetään palautuskopiona."));
        DriveSelection? options = null;
        try
        {
            await Session.Edit(upload ? "Varmuuskopioi Driveen" : "Palauta Drivesta", form, async () =>
            {
                await loading;
                var selected = individual.IsChecked == true ? list.SelectedItems.OfType<Choice>().Select(c => c.Key).ToArray() : null;
                options = new DriveSelection(database.IsChecked == true, profiles.IsChecked == true, gallery.IsChecked == true, selected);
            });
        }
        finally
        {
            await optionLifetime.CancelAsync();
        }
        return options;
    }
}
