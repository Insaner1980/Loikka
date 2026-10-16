using Microsoft.Windows.Storage.Pickers;
using Loikka.Core.Models;

namespace Loikka_App.Services;

public sealed class NativeFiles
{
    private readonly AppSession session;
    public NativeFiles(AppSession session) => this.session = session;
    public async Task<string?> Pick(params string[] extensions)
    {
        var picker = new FileOpenPicker(session.Window.AppWindow.Id)
        {
            CommitButtonText = "Valitse"
        };
        foreach (string extension in extensions)
        {
            picker.FileTypeFilter.Add(extension);
        }

        return (await picker.PickSingleFileAsync())?.Path;
    }

    public async Task<string?> SaveJson(string suggestedName)
    {
        var picker = new FileSavePicker(session.Window.AppWindow.Id)
        {
            SuggestedFileName = suggestedName
        };
        picker.FileTypeChoices.Add("JSON", new List<string> { ".json" });
        return (await picker.PickSaveFileAsync())?.Path;
    }

    public async Task<string?> Folder() => (await new FolderPicker(session.Window.AppWindow.Id).PickSingleFolderAsync())?.Path;
    public string Resolve(string path)
    {
        if (Path.IsPathFullyQualified(path))
        {
            return path;
        }

        var full = Path.GetFullPath(Path.Combine(session.Database.RootPath, path));
        if (!full.StartsWith(session.Database.RootPath.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidDataException("Kuvan polku ei kuulu tietohakemistoon.");
        }

        return full;
    }

    public string? ImageUri(string? path) => string.IsNullOrWhiteSpace(path) ? null : new Uri(Resolve(path)).AbsoluteUri;
    public async Task<Photo> AddPhoto(string source, string entity, long id, string? eventName)
    {
        var photo = await StagePhoto(source, entity, id, eventName);
        try
        {
            return await session.Run(db => db.SavePhotoAsync(photo));
        }
        catch
        {
            DeleteManaged(photo.FilePath);
            if (photo.ThumbnailPath is not null)
            {
                DeleteManaged(photo.ThumbnailPath);
            }

            throw;
        }
    }

    private async Task<Photo> StagePhoto(string source, string entity, long id, string? eventName)
    {
        if (entity is not ("athletes" or "results" or "competitions") || id <= 0)
        {
            throw new InvalidDataException("Valitse kuvan kohde.");
        }

        var ext = Path.GetExtension(source).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".gif" or ".webp"))
        {
            throw new InvalidDataException("Kuvatiedoston muotoa ei tueta.");
        }

        return await Task.Run(async () =>
        {
            var key = Guid.NewGuid().ToString("N");
            string relative = Path.Combine("photos", entity, id.ToString(), key + ext), thumb = Path.Combine("photos", "thumbnails", key + ".png");
            string target = Resolve(relative), thumbnail = Resolve(thumb);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            Directory.CreateDirectory(Path.GetDirectoryName(thumbnail)!);
            try
            {
                File.Copy(source, target);
                var info = await NativeImageCodec.CreateThumbnail(target, thumbnail);
                return new Photo
                {
                    EntityType = entity,
                    EntityId = id,
                    FilePath = relative,
                    ThumbnailPath = thumb,
                    OriginalName = Path.GetFileName(source),
                    Width = (int)info.Width,
                    Height = (int)info.Height,
                    SizeBytes = new FileInfo(target).Length,
                    EventName = eventName
                };
            }
            catch
            {
                if (File.Exists(target))
                {
                    File.Delete(target);
                }

                if (File.Exists(thumbnail))
                {
                    File.Delete(thumbnail);
                }

                throw new InvalidDataException("Kuvaa ei voitu avata. Tarkista tiedosto ja Windowsin kuvatuki.");
            }
        });
    }

    public async Task<string> StageProfile(string source, long athleteId)
    {
        var photo = await StagePhoto(source, "athletes", Math.Max(1, athleteId), null);
        string relative = Path.Combine("profile_photos", "athlete_" + athleteId + "_" + Path.GetFileName(photo.FilePath));
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(Resolve(relative))!);
            File.Move(Resolve(photo.FilePath), Resolve(relative));
            return relative;
        }
        finally
        {
            DeleteManaged(photo.FilePath);
            if (photo.ThumbnailPath is not null)
            {
                DeleteManaged(photo.ThumbnailPath);
            }
        }
    }

    public void DiscardProfile(string relative)
    {
        var root = Path.GetFullPath(Path.Combine(session.Database.RootPath, "profile_photos")) + Path.DirectorySeparatorChar;
        var full = Resolve(relative);
        if (full.StartsWith(root, StringComparison.OrdinalIgnoreCase) && File.Exists(full))
        {
            File.Delete(full);
        }
    }

    public async Task DeletePhoto(Photo photo)
    {
        await session.Run(async db =>
        {
            await db.DeletePhotoAsync(photo.Id);
            var photos = await db.GetPhotosAsync();
            var athletes = await db.GetAthletesAsync();
            var references = photos.SelectMany(p => new[] { p.FilePath, p.ThumbnailPath }).Concat(athletes.Select(a => a.PhotoPath));
            Loikka.Infrastructure.Photos.ManagedPhotoFiles.DeleteUnreferenced(db.RootPath, [photo.FilePath, photo.ThumbnailPath], references);
        });
    }

    private void DeleteManaged(string path)
    {
        var full = Resolve(path);
        var root = Path.GetFullPath(Path.Combine(session.Database.RootPath, "photos")) + Path.DirectorySeparatorChar;
        if (full.StartsWith(root, StringComparison.OrdinalIgnoreCase) && File.Exists(full))
        {
            File.Delete(full);
        }
    }
}
