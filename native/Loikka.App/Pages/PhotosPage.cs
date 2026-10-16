using Loikka.Core.Models;
using Loikka_App.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media.Imaging;

namespace Loikka_App.Pages;

public sealed partial class PhotosPage : NativePage
{
    private const string CompetitionsKey = "competitions";
    private ListView? list;
    public PhotosPage(AppSession session) : base(session, "Photos", "Kuvat")
    {
        Command("Lisää kuva", Symbol.Add, Add, "AddPhoto");
        Command("Peruuta valinta", Symbol.Cancel, () => list?.SelectedItems.Clear());
        Command("Poista valitut", Symbol.Delete, () => _ = Act(async () =>
        {
            var photos = Selected();
            if (photos.Count == 0 || !await Session.Confirm("Poista kuvat?", $"Poistetaan {photos.Count} kuvaa Loikan omasta kuvakirjastosta. Alkuperäisiä ulkopuolisia lähdetiedostoja ei poisteta."))
            {
                return;
            }

            var files = new NativeFiles(Session);
            foreach (var photo in photos)
            {
                await files.DeletePhoto(photo);
            }

            await Refresh();
        }));
        Command("Liitä urheilijaan", Symbol.People, () => _ = Act(() => Reassign(false)));
        Command("Liitä kilpailuun", Symbol.Calendar, () => _ = Act(() => Reassign(true)));
    }

    private List<Photo> Selected() => list?.SelectedItems.OfType<DisplayRow>().Select(r => (Photo)r.Data).ToList() ?? [];
    public override void Add() => _ = Act(async () =>
    {
        await PhotoActions.Add(Session);
        await Refresh();
    });
    private async Task Reassign(bool competition)
    {
        var photos = Selected();
        if (photos.Count == 0)
        {
            return;
        }

        var form = Ui.Form();
        var choices = competition ? (await Session.Run(db => db.GetCompetitionsAsync())).Select(c => new Choice(c.Id.ToString(), c.Name)) : (await Session.Run(db => db.GetAthletesAsync())).Select(a => new Choice(a.Id.ToString(), $"{a.FirstName} {a.LastName}"));
        var target = Ui.Select(form, competition ? "Kilpailu" : "Urheilija", choices, null, "PhotoReassignTarget");
        await Session.Edit("Liitä valitut kuvat", form, async () =>
        {
            long targetId = Ui.Id(target);
            if (targetId == 0)
            {
                throw new InvalidDataException("Valitse kohde.");
            }

            foreach (var photo in photos)
            {
                await Session.Run(db => db.SavePhotoAsync(photo with { EntityType = competition ? CompetitionsKey : "athletes", EntityId = targetId }));
            }
        });
        await Refresh();
    }

    protected override async Task Load()
    {
        var photos = await Session.Run(db => db.GetPhotosAsync());
        var athletes = await Session.Run(db => db.GetAthletesAsync());
        var competitions = await Session.Run(db => db.GetCompetitionsAsync());
        var participants = await Session.Run(db => db.GetParticipantsAsync());
        if (!Active)
        {
            return;
        }

        Body.Children.Clear();
        var files = new NativeFiles(Session);
        var athlete = Ui.Select(Body, "Urheilija", new[] { new Choice("", "Kaikki urheilijat") }.Concat(athletes.Select(a => new Choice(a.Id.ToString(), $"{a.FirstName} {a.LastName}"))), "", "PhotoAthleteFilter");
        var competition = Ui.Select(Body, "Kilpailu", new[] { new Choice("", "Kaikki kilpailut") }.Concat(competitions.Select(c => new Choice(c.Id.ToString(), c.Name))), "", "PhotoCompetitionFilter");
        var year = Ui.Select(Body, "Vuosi", new[] { new Choice("", "Kaikki vuodet") }.Concat(photos.Where(p => p.CreatedAt.Length >= 4).Select(p => p.CreatedAt[..4]).Distinct().OrderDescending().Select(y => new Choice(y, y))), "", "PhotoYearFilter");
        var count = Ui.Text("");
        Body.Children.Add(count);
        var host = new StackPanel();
        Body.Children.Add(host);
        void Draw()
        {
            var selectedIds = Selected().Select(p => p.Id).ToHashSet();
            var filtered = photos.Where(p => MatchesPhoto(p, Ui.Id(athlete), Ui.Id(competition), Ui.Key(year), participants)).OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id).ToList();
            var rows = filtered.Select(p => new DisplayRow(p.Id, p.EventName ?? competitions.FirstOrDefault(c => p.EntityType == CompetitionsKey && c.Id == p.EntityId)?.Name ?? p.OriginalName, $"{athletes.FirstOrDefault(a => p.EntityType == "athletes" && a.Id == p.EntityId)?.FirstName} · {Ui.Date(p.CreatedAt.Split(' ')[0])}", p, files.ImageUri(p.ThumbnailPath is not null && File.Exists(files.Resolve(p.ThumbnailPath)) ? p.ThumbnailPath : p.FilePath))).ToList();
            host.Children.Clear();
            list = Ui.List(rows, "PhotoRow", row => Session.Window.ShowViewer(filtered, filtered.FindIndex(p => p.Id == row.Id), () => _ = Act(Refresh)), true);
            list.SelectionChanged += (_, _) => count.Text = $"{filtered.Count} kuvaa · {list.SelectedItems.Count} valittuna";
            foreach (var row in rows.Where(r => selectedIds.Contains(r.Id)))
            {
                list.SelectedItems.Add(row);
            }

            if (filtered.Count == 0)
            {
                host.Children.Add(Ui.Text("Ei kuvia valituilla suodattimilla."));
            }

            host.Children.Add(list);
            count.Text = $"{filtered.Count} kuvaa · {list.SelectedItems.Count} valittuna";
        }

        athlete.SelectionChanged += (_, _) => Draw();
        competition.SelectionChanged += (_, _) => Draw();
        year.SelectionChanged += (_, _) => Draw();
        Draw();
    }
    private static bool MatchesPhoto(Photo p, long athleteId, long competitionId, string year, List<CompetitionParticipant> participants) => (athleteId == 0 || p.EntityType == "athletes" && p.EntityId == athleteId || p.EntityType == CompetitionsKey && participants.Any(x => x.CompetitionId == p.EntityId && x.AthleteId == athleteId)) && (competitionId == 0 || p.EntityType == CompetitionsKey && p.EntityId == competitionId) && (year == "" || p.CreatedAt.StartsWith(year));

}

internal static class PhotoActions
{
    private const string CompetitionsKey = "competitions";
    public static async Task Add(AppSession session)
    {
        var files = new NativeFiles(session);
        string? selected = await files.Pick(".jpg", ".jpeg", ".png", ".gif", ".webp");
        if (selected is null)
        {
            return;
        }

        var athletes = await session.Run(db => db.GetAthletesAsync());
        var competitions = await session.Run(db => db.GetCompetitionsAsync());
        var form = Ui.Form();
        form.Children.Add(new Image { Source = new BitmapImage(new Uri(selected)), Height = 200, Stretch = Microsoft.UI.Xaml.Media.Stretch.Uniform });
        var athlete = Ui.Select(form, "Urheilija", athletes.Select(a => new Choice(a.Id.ToString(), $"{a.FirstName} {a.LastName}")), null, "PhotoAthlete");
        var competition = Ui.Select(form, "Kilpailu", new[] { new Choice("", "Muu tapahtuma / urheilijan kuva") }.Concat(competitions.Select(c => new Choice(c.Id.ToString(), c.Name))), "", "PhotoCompetition");
        var caption = Ui.Field(form, "Tapahtuman nimi", null, "PhotoCaption");
        await session.Edit("Lisää kuva", form, async () =>
        {
            string entity = Ui.Id(competition) > 0 ? CompetitionsKey : "athletes";
            long id = Ui.Id(competition) > 0 ? Ui.Id(competition) : Ui.Id(athlete);
            await files.AddPhoto(selected, entity, id, Ui.Optional(caption.Text));
        });
    }
}
