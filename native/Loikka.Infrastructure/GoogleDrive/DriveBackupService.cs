using Loikka.Infrastructure.Database;
using Loikka.Infrastructure.Migration;
using Microsoft.Data.Sqlite;
using System.Security.Cryptography;
using System.Text.Json;

namespace Loikka.Infrastructure.GoogleDrive;

public sealed partial class DriveBackupService
{
    private const string PhotosKey = "photos";
    private const string DatabaseFileName = "loikka.db";
    private readonly DriveClient drive;
    private readonly LocalDatabase database;
    private readonly Func<Task>? releaseHandles;
    private readonly Func<Task>? reopenHandles;
    private readonly SemaphoreSlim transferGate = new(1, 1);
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };
    private static readonly string[] retainedLocalFiles = new[] { "native-preferences.json", "google-tokens.dpapi" };

    public DriveBackupService(DriveClient drive, LocalDatabase database, Func<Task>? releaseHandles = null, Func<Task>? reopenHandles = null)
    {
        this.drive = drive;
        this.database = database;
        this.releaseHandles = releaseHandles;
        this.reopenHandles = reopenHandles;
    }

    public IReadOnlyList<LocalPhoto> ListLocalPhotos()
    {
        var result = new List<LocalPhoto>();
        foreach (var category in new[]
        {
            PhotosKey,
            "profile_photos"
        }

        )
        {
            var folder = Path.Combine(database.RootPath, category);
            if (!Directory.Exists(folder))
            {
                continue;
            }

            foreach (var file in EnumerateSafe(folder))
            {
                var relative = Path.GetRelativePath(database.RootPath, file).Replace('\\', '/');
                DrivePaths.Resolve(database.RootPath, relative);
                result.Add(new(file, Path.GetFileName(file), category, relative, new FileInfo(file).Length));
            }
        }

        return result.OrderBy(x => x.RelativePath, StringComparer.Ordinal).ToArray();
    }

    private static IEnumerable<string> EnumerateSafe(string directory)
    {
        if ((File.GetAttributes(directory) & FileAttributes.ReparsePoint) != 0)
        {
            throw new InvalidDataException("Kuvakansion linkkipolku vaatii erillisen tarkistuksen.");
        }

        foreach (var entry in Directory.EnumerateFileSystemEntries(directory))
        {
            if ((File.GetAttributes(entry) & FileAttributes.ReparsePoint) != 0)
            {
                throw new InvalidDataException("Kuvan linkkipolku vaatii erillisen tarkistuksen.");
            }

            if (Directory.Exists(entry))
            {
                foreach (var file in EnumerateSafe(entry))
                {
                    yield return file;
                }
            }
            else
            {
                yield return Path.GetFullPath(entry);
            }
        }
    }

    private static bool CategorySelected(string category, DriveSelection selection) => category == PhotosKey ? selection.IncludeGalleryPhotos : selection.IncludeProfilePhotos;
    private static string Hash(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes));
    private static string Mime(string name) => Path.GetExtension(name).ToLowerInvariant() switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        _ => "application/octet-stream"
    };
    public async Task<IReadOnlyList<CloudPhoto>> ListRestorePhotosAsync(string? backupId, bool includeDatabase, CancellationToken token = default)
    {
        if (!includeDatabase && backupId is null)
        {
            return await drive.ListPhotosAsync(token);
        }

        var root = await drive.RootAsync(false, token) ?? throw new DriveException("missing", "Loikan Google Drive -kansiota ei löytynyt.");
        var (_, manifest) = await ResolveRestoreIdentityAsync(root, backupId, includeDatabase, token);
        var photos = await drive.ListPhotosAsync(token);
        if (manifest is null)
        {
            return photos;
        }

        var ids = manifest.Media.Select(x => x.Id).ToHashSet(StringComparer.Ordinal);
        return photos.Where(x => ids.Contains(x.Id)).ToArray();
    }

    private async Task<(DriveBackup? Backup, DriveManifest? Manifest)> ResolveRestoreIdentityAsync(string root, string? backupId, bool includeDatabase, CancellationToken token)
    {
        if (!includeDatabase && backupId is null)
        {
            return (null, null);
        }

        var backups = await drive.ListBackupsAsync(token);
        var backup = backups.FirstOrDefault(x => backupId is null || x.Id == backupId);
        if (backup is null)
        {
            throw new DriveException("missing", "Valittua varmuuskopiota ei löytynyt Loikan kansiosta.");
        }

        var manifests = (await drive.ChildrenAsync(root, token)).Where(x => x.Name == backup.Name + ".manifest.json").ToArray();
        if (manifests.Length > 1)
        {
            throw new InvalidDataException("Varmuuskopion manifesti on epäselvä.");
        }

        DriveManifest? manifest = null;
        if (manifests.Length == 1)
        {
            manifest = JsonSerializer.Deserialize<DriveManifest>(await drive.DownloadAsync(manifests[0].Id, token), Json) ?? throw new InvalidDataException("Varmuuskopion manifesti on tyhjä.");
            if (manifest.Format != "loikka-native-drive" || manifest.Version != 1 || manifest.DatabaseId != backup.Id)
            {
                throw new InvalidDataException("Varmuuskopion manifestiversiota tai tietokantalinkkiä ei tueta.");
            }

            if (manifest.Media is null)
            {
                throw new InvalidDataException("Varmuuskopion kuvaluettelo puuttuu.");
            }
        }
        else if (NativeBackupNameRegex().IsMatch(backup.Name))
        {
            throw new InvalidDataException("Natiivin varmuuskopion manifesti puuttuu. Keskeneräistä siirtoa ei palautettu.");
        }

        return (backup, manifest);
    }

    public async Task<DriveTransferReport> UploadAsync(DriveSelection selection, CancellationToken token = default)
    {
        await transferGate.WaitAsync(token);
        string? stage = null;
        var completed = 0;
        var currentItem = "Loikka Backups";
        try
        {
            var chosen = SelectUploadPhotos(selection);
            if (!selection.IncludeDatabase && chosen.Length == 0)
            {
                return new(0, null, []);
            }

            stage = database.RootPath + ".drive-upload-" + Guid.NewGuid().ToString("N");
            Directory.CreateDirectory(stage);
            var root = (await drive.RootAsync(true, token))!;
            var stamp = DateTimeOffset.UtcNow.ToString("yyyyMMdd_HHmmss") + "_" + Guid.NewGuid().ToString("N")[..8];
            var backupName = "loikka_backup_" + stamp + ".db";
            var entries = new List<DriveManifestEntry>();
            var warnings = new List<string>();
            string? backupId = null;
            string? databaseHash = null;
            if (selection.IncludeDatabase)
            {
                currentItem = backupName;
                await database.CreateSnapshotAsync(Path.Combine(stage, DatabaseFileName));
                var bytes = await File.ReadAllBytesAsync(Path.Combine(stage, DatabaseFileName), token);
                databaseHash = Hash(bytes);
                backupId = await drive.UploadAsync(root, backupName, bytes, "application/x-sqlite3", token);
                completed++;
            }

            var folders = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var photo in chosen)
            {
                currentItem = photo.RelativePath;
                token.ThrowIfCancellationRequested();
                var parts = photo.RelativePath.Split('/');
                var parent = await UploadFolderAsync(root, stamp, parts, folders, token);
                var bytes = await File.ReadAllBytesAsync(photo.Path, token);
                var id = await drive.UploadAsync(parent, parts[^1], bytes, Mime(photo.Name), token);
                entries.Add(new(id, photo.RelativePath, Hash(bytes), bytes.LongLength));
                completed++;
            }

            var manifest = new DriveManifest("loikka-native-drive", 1, backupId, databaseHash, entries);
            currentItem = backupId is null ? "loikka_media_" + stamp + ".manifest.json" : backupName + ".manifest.json";
            await drive.UploadAsync(root, currentItem, JsonSerializer.SerializeToUtf8Bytes(manifest, Json), "application/json", token);
            if (selection.IncludeDatabase && (!selection.IncludeGalleryPhotos || !selection.IncludeProfilePhotos || selection.SelectedPhotoIds is not null))
            {
                warnings.Add("Varmuuskopio sisältää vain valitut kuvat. Tietokannan muita kuvaliitteitä ei voi palauttaa tästä kopiosta.");
            }

            return new(entries.Count + (backupId is null ? 0 : 1), backupId, warnings);
        }
        catch (DriveException error)
        {
            throw new DriveTransferException(currentItem, completed, error.Kind, error.Message);
        }
        catch (IOException)
        {
            throw new DriveTransferException(currentItem, completed, "local", "Paikallisen tiedoston käsittely epäonnistui.");
        }
        finally
        {
            if (stage is not null && Directory.Exists(stage))
            {
                Directory.Delete(stage, true);
            }

            transferGate.Release();
        }
    }

    public async Task<DriveTransferReport> RestoreAsync(string? backupId, DriveSelection selection, CancellationToken token = default)
    {
        await transferGate.WaitAsync(token);
        string? stage = null;
        try
        {
            if (!selection.IncludeDatabase && (!selection.IncludeGalleryPhotos && !selection.IncludeProfilePhotos || selection.SelectedPhotoIds is { Count: 0 }))
            {
                return new(0, null, []);
            }

            var root = await drive.RootAsync(false, token) ?? throw new DriveException("missing", "Loikan Google Drive -kansiota ei löytynyt.");
            var (backup, manifest) = await ResolveRestoreIdentityAsync(root, backupId, selection.IncludeDatabase, token);
            var needPhotos = (selection.IncludeGalleryPhotos || selection.IncludeProfilePhotos) && selection.SelectedPhotoIds is not { Count: 0 };
            var cloud = needPhotos ? await drive.ListPhotosAsync(token) : [];
            var allowed = cloud.Where(x => CategorySelected(x.Folder, selection)).ToArray();
            var chosen = SelectRestorePhotos(manifest, allowed, needPhotos, selection);
            stage = database.RootPath + ".drive-restore-" + Guid.NewGuid().ToString("N");
            Directory.CreateDirectory(stage);
            await database.CreateSnapshotAsync(Path.Combine(stage, DatabaseFileName));
            CopyRetainedFiles(stage);
            var warnings = new List<string>();
            await DownloadDatabaseAsync(stage, selection, backup, manifest, token);
            await DownloadPhotosAsync(stage, chosen, token);
            if (manifest is null && selection.IncludeDatabase)
            {
                warnings.Add("Vanhan varmuuskopion kuvat ovat jaettuja. Kaikkia alkuperäisiä tai valitun päivän kuvaversioita ei välttämättä ole pilvessä.");
            }

            if (selection.IncludeDatabase)
            {
                await RemapReferencesAsync(stage, warnings, manifest is null, chosen.Where(x => x.Entry is null).Select(x => x.Relative).ToArray(), token);
            }

            token.ThrowIfCancellationRequested();
            var retained = await SnapshotRestoreService.RestoreSnapshotAsync(stage, database.RootPath, releaseHandles ?? (() => Task.CompletedTask), reopenHandles ?? (() => Task.CompletedTask), token);
            stage = null;
            return new(chosen.Count + (selection.IncludeDatabase ? 1 : 0), backup?.Id, warnings, retained);
        }
        finally
        {
            if (stage is not null && Directory.Exists(stage))
            {
                Directory.Delete(stage, true);
            }

            transferGate.Release();
        }
    }

    private static async Task RemapReferencesAsync(string stage, List<string> warnings, bool allowLegacyFallback, IReadOnlyList<string> downloadedLegacyPaths, CancellationToken token)
    {
        await using var c = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = Path.Combine(stage, DatabaseFileName), Mode = SqliteOpenMode.ReadWrite, Pooling = false, ForeignKeys = true }.ToString());
        await c.OpenAsync(token);
        await LocalDatabase.VerifySchemaAsync(c);
#pragma warning disable S6966 // Microsoft.Data.Sqlite async transaction APIs execute synchronously (learn.microsoft.com/dotnet/standard/data/sqlite/async).
        using var tx = c.BeginTransaction();
#pragma warning restore S6966
        var triggers = new List<(string Name, string Sql)>();
        await using (var cmd = c.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = "SELECT name,sql FROM sqlite_master WHERE type='trigger' AND tbl_name IN ('athletes','photos')";
            await using var r = await cmd.ExecuteReaderAsync(token);
            while (await r.ReadAsync(token))
            {
                triggers.Add((r.GetString(0), r.GetString(1)));
            }
        }

        foreach (var trigger in triggers)
        {
            await using var cmd = c.CreateCommand();
            cmd.Transaction = tx;
#pragma warning disable S2077 // SQLite trigger names come from sqlite_master and are quoted with embedded quotes escaped.
            cmd.CommandText = "DROP TRIGGER \"" + trigger.Name.Replace("\"", "\"\"") + "\"";
#pragma warning restore S2077
            await cmd.ExecuteNonQueryAsync(token);
        }

        foreach (var field in new[]
        {
            (Table: "athletes", Column: "photo_path", Category: "profile_photos"),
            (Table: PhotosKey, Column: "file_path", Category: PhotosKey),
            (Table: PhotosKey, Column: "thumbnail_path", Category: PhotosKey)
        }

        )
        {
            var rows = new List<(long Id, string Path)>();
            await using (var query = c.CreateCommand())
            {
                query.Transaction = tx;
#pragma warning disable S2077 // Table and column identifiers come only from the three fixed media field mappings; values are parameters.
                query.CommandText = $"SELECT id,{field.Column} FROM {field.Table} WHERE {field.Column} IS NOT NULL";
#pragma warning restore S2077
                await using var r = await query.ExecuteReaderAsync(token);
                while (await r.ReadAsync(token))
                {
                    rows.Add((r.GetInt64(0), r.GetString(1)));
                }
            }

            foreach (var row in rows)
            {
                var resolved = ResolveRestoredReference(stage, row.Path, field.Category, allowLegacyFallback, downloadedLegacyPaths);
                if (resolved is null)
                {
                    warnings.Add($"Puuttuva kuvaliite säilytettiin: {field.Table}.{field.Column} #{row.Id}.");
                    continue;
                }

                await using var update = c.CreateCommand();
                update.Transaction = tx;
#pragma warning disable S2077 // Table and column identifiers come only from the three fixed media field mappings; values are parameters.
                update.CommandText = $"UPDATE {field.Table} SET {field.Column}=$path WHERE id=$id";
#pragma warning restore S2077
                update.Parameters.AddWithValue("$path", resolved);
                update.Parameters.AddWithValue("$id", row.Id);
                await update.ExecuteNonQueryAsync(token);
            }
        }

        foreach (var trigger in triggers)
        {
            await using var cmd = c.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = trigger.Sql;
            await cmd.ExecuteNonQueryAsync(token);
        }

#pragma warning disable S6966 // Microsoft.Data.Sqlite async transaction APIs execute synchronously (learn.microsoft.com/dotnet/standard/data/sqlite/async).
        tx.Commit();
#pragma warning restore S6966
    }

    [System.Text.RegularExpressions.GeneratedRegex(@"^loikka_backup_\d{8}_\d{6}_[0-9a-f]{8}\.db$")]
    private static partial System.Text.RegularExpressions.Regex NativeBackupNameRegex();

    private async Task<string> UploadFolderAsync(string root, string stamp, string[] parts, Dictionary<string, string> folders, CancellationToken token)
    {
        var parent = root;
        var path = new System.Text.StringBuilder();
        foreach (var part in new[]
        {
            parts[0],
            "snapshot_" + stamp
        }.Concat(parts.Skip(1).SkipLast(1)))
        {
            path.Append('/').Append(part);
            var key = path.ToString();
            if (!folders.TryGetValue(key, out var folder))
            {
                folders[key] = folder = await drive.FolderAsync(parent, part, token);
            }

            parent = folder;
        }
        return parent;
    }

    private List<(CloudPhoto Photo, string Relative, DriveManifestEntry? Entry)> SelectRestorePhotos(DriveManifest? manifest, CloudPhoto[] allowed, bool needPhotos, DriveSelection selection)
    {
        List<(CloudPhoto Photo, string Relative, DriveManifestEntry? Entry)> chosen;
        if (manifest is not null)
        {
            chosen = [];
            foreach (var entry in manifest.Media)
            {
                var category = entry.RelativePath.Replace('\\', '/').Split('/')[0];
                DrivePaths.Resolve(database.RootPath, entry.RelativePath);
                if (!RestorePhotoSelected(needPhotos, category, selection, entry.Id))
                {
                    continue;
                }

                var photo = allowed.SingleOrDefault(x => x.Id == entry.Id) ?? throw new InvalidDataException("Manifestin kuva puuttuu Loikan odotetusta kuvakansiosta.");
                if (photo.Folder != category)
                {
                    throw new InvalidDataException("Manifestin kuvaluokka ei vastaa Drive-kansiota.");
                }

                chosen.Add((photo, entry.RelativePath, entry));
            }
        }
        else
        {
            chosen = allowed.Where(x => selection.SelectedPhotoIds is null || selection.SelectedPhotoIds.Contains(x.Id)).Select(x => (x, x.RelativePath, x.Sha256 is null ? null : new DriveManifestEntry(x.Id, x.RelativePath, x.Sha256, x.SizeBytes ?? -1))).ToList();
        }

        ValidateRestoreSelection(chosen, selection);
        return chosen;
    }

    private void CopyRetainedFiles(string stage)
    {
        // Keep unselected existing media and local-only preferences/protected tokens.
        foreach (var photo in ListLocalPhotos())
        {
            var target = DrivePaths.Resolve(stage, photo.RelativePath);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.Copy(photo.Path, target);
        }

        foreach (var name in retainedLocalFiles.Where(name => File.Exists(Path.Combine(database.RootPath, name))))
        {
            File.Copy(Path.Combine(database.RootPath, name), Path.Combine(stage, name));
        }
    }

    private static string? ResolveRestoredReference(string stage, string originalPath, string category, bool allowLegacyFallback, IReadOnlyList<string> downloadedLegacyPaths)
    {
        var path = originalPath.Replace('\\', '/');
        var anchor = path.LastIndexOf("/" + category + "/", StringComparison.OrdinalIgnoreCase);
        var relative = anchor >= 0 ? path[(anchor + 1)..] : path;
        string? resolved = null;
        try
        {
            var full = DrivePaths.Resolve(stage, relative);
            if (File.Exists(full))
            {
                resolved = relative;
            }
        }
        catch (InvalidDataException)
        {
            // An invalid reference remains unresolved; the legacy fallback and warning below handle it.
        }

        if (resolved is null && allowLegacyFallback)
        {
            // Only a downloaded flat legacy object may repair a flattened legacy reference.
            var candidates = downloadedLegacyPaths.Where(x =>
            {
                var parts = x.Replace('\\', '/').Split('/');
                return parts.Length == 2 && parts[0] == category && string.Equals(parts[1], Path.GetFileName(path), StringComparison.OrdinalIgnoreCase);
            }).Take(2).ToArray();
            if (candidates.Length == 1)
            {
                resolved = candidates[0];
            }
        }
        return resolved;
    }

    private LocalPhoto[] SelectUploadPhotos(DriveSelection selection)
    {
        var available = ListLocalPhotos();
        var chosen = available.Where(x => CategorySelected(x.Folder, selection) && (selection.SelectedPhotoIds is null || selection.SelectedPhotoIds.Contains(x.Path, StringComparer.OrdinalIgnoreCase))).ToArray();
        if (selection.SelectedPhotoIds is not null && selection.SelectedPhotoIds.Any(x => !chosen.Any(y => string.Equals(x, y.Path, StringComparison.OrdinalIgnoreCase))))
        {
            throw new InvalidDataException("Valittu kuva ei kuulu sallittuun paikalliseen kuvakansioon tai valittuun luokkaan.");
        }
        return chosen;
    }

    private async Task DownloadPhotosAsync(string stage, List<(CloudPhoto Photo, string Relative, DriveManifestEntry? Entry)> chosen, CancellationToken token)
    {
        foreach (var item in chosen)
        {
            var bytes = await drive.DownloadAsync(item.Photo.Id, token);
            if (item.Entry is not null && (Hash(bytes) != item.Entry.Sha256 || bytes.LongLength != item.Entry.SizeBytes))
            {
                throw new InvalidDataException("Kuvan tarkistussumma ei vastaa varmuuskopiota.");
            }

            var target = DrivePaths.Resolve(stage, item.Relative);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            await File.WriteAllBytesAsync(target, bytes, token);
        }
    }

    private static void ValidateRestoreSelection(List<(CloudPhoto Photo, string Relative, DriveManifestEntry? Entry)> chosen, DriveSelection selection)
    {
        if (selection.SelectedPhotoIds is not null && selection.SelectedPhotoIds.Any(x => chosen.All(y => y.Photo.Id != x)))
        {
            throw new InvalidDataException("Valittu pilvikuva ei kuulu varmuuskopioon tai sallittuun kuvaluokkaan.");
        }

        if (chosen.Select(x => x.Relative).Distinct(StringComparer.OrdinalIgnoreCase).Count() != chosen.Count)
        {
            throw new InvalidDataException("Palautettavilla kuvilla on sama kohdepolku.");
        }
    }

    private async Task DownloadDatabaseAsync(string stage, DriveSelection selection, DriveBackup? backup, DriveManifest? manifest, CancellationToken token)
    {
        if (selection.IncludeDatabase)
        {
            var bytes = await drive.DownloadAsync(backup!.Id, token);
            if (manifest is not null && Hash(bytes) != manifest.DatabaseSha256)
            {
                throw new InvalidDataException("Tietokannan tarkistussumma ei vastaa manifestia.");
            }

            await File.WriteAllBytesAsync(Path.Combine(stage, DatabaseFileName), bytes, token);
        }
    }

    private static bool RestorePhotoSelected(bool needPhotos, string category, DriveSelection selection, string id) => needPhotos && CategorySelected(category, selection) && (selection.SelectedPhotoIds is null || selection.SelectedPhotoIds.Contains(id));
}
