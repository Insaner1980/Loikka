using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Loikka.Infrastructure.GoogleDrive;

public sealed class DriveClient
{
    private const string QuotaKey = "quota";
    private readonly HttpClient http;
    private readonly GoogleOAuthClient oauth;
    public DriveClient(HttpClient http, GoogleOAuthClient oauth)
    {
        this.http = http;
        this.oauth = oauth;
    }

    private const string Api = "https://www.googleapis.com/drive/v3/files";
    private const string FolderMime = "application/vnd.google-apps.folder";
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true
    };
    internal sealed record DriveFile(string Id, string Name, string? MimeType, string? CreatedTime, string? Size);
    private sealed record FilePage(List<DriveFile> Files, string? NextPageToken);
    private static string Q(string value) => value.Replace("\\", "\\\\").Replace("'", "\\'");
    private static string EscapeId(string id) => Uri.EscapeDataString(id);
    private async Task<HttpResponseMessage> SendAsync(Func<HttpRequestMessage> create, bool retrySafe, CancellationToken token)
    {
        var access = await oauth.GetAccessTokenAsync(token: token);
        var refreshed = false;
        int attempt = 0;
        while (attempt < 3)
        {
            token.ThrowIfCancellationRequested();
            using var request = create();
            request.Headers.Authorization = new("Bearer", access);
            HttpResponseMessage response;
            try
            {
                response = await http.SendAsync(request, token);
            }
            catch (HttpRequestException) when (CanRetry(retrySafe, true, attempt))
            {
                await Task.Delay(100 * (1 << attempt++), token);
                continue;
            }
            catch (HttpRequestException)
            {
                throw new DriveException("network", "Yhteys Google Driveen epäonnistui.");
            }

            if (response.StatusCode == HttpStatusCode.Unauthorized && !refreshed)
            {
                response.Dispose();
                access = await oauth.GetAccessTokenAsync(true, token);
                refreshed = true;
                continue;
            }

            if (response.IsSuccessStatusCode)
            {
                return response;
            }

            var kind = await ErrorKindAsync(response, token);
            var transient = kind == QuotaKey || response.StatusCode == HttpStatusCode.RequestTimeout || (int)response.StatusCode >= 500;
            response.Dispose();
            if (CanRetry(retrySafe, transient, attempt))
            {
                await Task.Delay(100 * (1 << attempt++), token);
                continue;
            }

            throw new DriveException(kind, kind switch
            {
                "authentication" => "Google-kirjautuminen vanheni. Kirjaudu uudelleen.",
                "permission" => "Google Drive ei sallinut toimintoa.",
                QuotaKey => "Google Driven käyttöraja täyttyi. Yritä myöhemmin.",
                "missing" => "Valittua Google Drive -tiedostoa ei löytynyt.",
                _ => "Google Drive -siirto epäonnistui."
            });
        }
        throw new DriveException("network", "Google Drive -siirto epäonnistui.");
    }

    private async Task<List<DriveFile>> ListAsync(string query, CancellationToken token)
    {
        var files = new List<DriveFile>();
        string? page = null;
        var pages = new HashSet<string>(StringComparer.Ordinal);
        do
        {
            var url = Api + "?q=" + Uri.EscapeDataString(query) + "&fields=nextPageToken,files(id,name,mimeType,createdTime,size)&pageSize=1000&spaces=drive";
            if (page is not null)
            {
                url += "&pageToken=" + Uri.EscapeDataString(page);
            }

            using var response = await SendAsync(() => new(HttpMethod.Get, url), true, token);
            var result = await response.Content.ReadFromJsonAsync<FilePage>(Json, token) ?? throw new InvalidDataException("Google Driven tiedostoluettelo on virheellinen.");
            files.AddRange(result.Files ?? []);
            page = result.NextPageToken;
            if (page is not null && !pages.Add(page))
            {
                throw new InvalidDataException("Google Driven sivutus toisti saman sivun.");
            }
        }
        while (!string.IsNullOrEmpty(page));
        return files.DistinctBy(x => x.Id).ToList();
    }

    internal Task<List<DriveFile>> ChildrenAsync(string parentId, CancellationToken token) => ListAsync($"'{Q(parentId)}' in parents and trashed=false", token);
    internal async Task<string?> RootAsync(bool create, CancellationToken token)
    {
        var roots = await ListAsync($"name='Loikka Backups' and mimeType='{FolderMime}' and trashed=false", token);
        if (roots.Count > 1)
        {
            throw new InvalidDataException("Google Drivessa on useita Loikka Backups -kansioita. Valinta vaatii tarkistuksen.");
        }

        if (roots.Count == 1)
        {
            return roots[0].Id;
        }

        return create ? await CreateFolderAsync(null, "Loikka Backups", token) : null;
    }

    internal async Task<string> FolderAsync(string parent, string name, CancellationToken token)
    {
        DrivePaths.ValidateSegment(name);
        var matches = await ListAsync($"'{Q(parent)}' in parents and name='{Q(name)}' and mimeType='{FolderMime}' and trashed=false", token);
        if (matches.Count > 1)
        {
            throw new InvalidDataException("Google Driven samannimiset kansiot ovat epäselviä.");
        }

        return matches.Count == 1 ? matches[0].Id : await CreateFolderAsync(parent, name, token);
    }

    private async Task<string> CreateFolderAsync(string? parent, string name, CancellationToken token)
    {
        var metadata = new Dictionary<string, object>
        {
            ["name"] = name,
            ["mimeType"] = FolderMime
        };
        if (parent is not null)
        {
            metadata["parents"] = new[]
            {
                parent
            };
        }

        // A failed create is not blindly retried: the server may have committed it.
        using var response = await SendAsync(() => new(HttpMethod.Post, Api) { Content = JsonContent.Create(metadata) }, false, token);
        return (await response.Content.ReadFromJsonAsync<DriveFile>(Json, token))?.Id ?? throw new InvalidDataException("Google ei palauttanut kansiotunnistetta.");
    }

    public async Task<IReadOnlyList<DriveBackup>> ListBackupsAsync(CancellationToken token = default)
    {
        var root = await RootAsync(false, token);
        if (root is null)
        {
            return [];
        }

        var files = await ListAsync($"'{Q(root)}' in parents and name contains 'loikka_backup_' and trashed=false", token);
        return files.Where(x => x.MimeType != FolderMime && x.Name.StartsWith("loikka_backup_", StringComparison.Ordinal) && x.Name.EndsWith(".db", StringComparison.OrdinalIgnoreCase)).OrderByDescending(x => x.CreatedTime, StringComparer.Ordinal).ThenByDescending(x => x.Name, StringComparer.Ordinal).Select(x => new DriveBackup(x.Id, x.Name, x.CreatedTime, long.TryParse(x.Size, out var size) ? size : null)).ToArray();
    }

    public async Task<IReadOnlyList<CloudPhoto>> ListPhotosAsync(CancellationToken token = default)
    {
        var root = await RootAsync(false, token);
        if (root is null)
        {
            return [];
        }

        var result = new List<CloudPhoto>();
        var visited = new HashSet<string>(StringComparer.Ordinal);
        var rootFiles = await ChildrenAsync(root, token);
        foreach (var folder in rootFiles.Where(x => x.MimeType == FolderMime && x.Name is "photos" or "profile_photos"))
        {
            await WalkAsync(folder.Id, folder.Name, folder.Name, visited, result, token);
        }

        var mapped = new Dictionary<string, DriveManifestEntry>(StringComparer.Ordinal);
        foreach (var file in rootFiles.Where(x => x.Name.StartsWith("loikka_", StringComparison.Ordinal) && x.Name.EndsWith(".manifest.json", StringComparison.Ordinal)))
        {
            var manifest = JsonSerializer.Deserialize<DriveManifest>(await DownloadAsync(file.Id, token), Json) ?? throw new InvalidDataException("Kuvamanifesti on tyhjä.");
            if (manifest.Format != "loikka-native-drive" || manifest.Version != 1 || manifest.Media is null)
            {
                throw new InvalidDataException("Kuvamanifestin versiota ei tueta.");
            }

            MapManifestPhotos(manifest, result, mapped);
        }

        for (var i = 0; i < result.Count; i++)
        {
            if (mapped.TryGetValue(result[i].Id, out var entry))
            {
                result[i] = result[i] with
                {
                    RelativePath = entry.RelativePath,
                    Sha256 = entry.Sha256,
                    SizeBytes = entry.SizeBytes
                };
            }
        }

        return result;
    }

    private async Task WalkAsync(string folderId, string category, string relative, HashSet<string> visited, List<CloudPhoto> output, CancellationToken token)
    {
        if (!visited.Add(folderId))
        {
            throw new InvalidDataException("Google Driven kansiorakenne on syklinen.");
        }

        foreach (var item in await ChildrenAsync(folderId, token))
        {
            DrivePaths.ValidateSegment(item.Name);
            var path = string.Join('/', relative, item.Name);
            if (item.MimeType == FolderMime)
            {
                await WalkAsync(item.Id, category, path, visited, output, token);
            }
            else
            {
                output.Add(new(item.Id, item.Name, category, path, long.TryParse(item.Size, out var size) ? size : null, item.CreatedTime));
            }
        }
    }

    public async Task DeleteBackupAsync(string backupId, CancellationToken token = default)
    {
        if (!(await ListBackupsAsync(token)).Any(x => x.Id == backupId))
        {
            throw new DriveException("missing", "Varmuuskopio ei kuulu Loikka-kansioon.");
        }

        using var response = await SendAsync(() => new(HttpMethod.Delete, Api + "/" + EscapeId(backupId)), true, token);
    }

    internal async Task<byte[]> DownloadAsync(string fileId, CancellationToken token)
    {
        using var response = await SendAsync(() => new(HttpMethod.Get, Api + "/" + EscapeId(fileId) + "?alt=media"), true, token);
        return await response.Content.ReadAsByteArrayAsync(token);
    }

    internal async Task<string> UploadAsync(string parentId, string name, byte[] content, string mime, CancellationToken token)
    {
        DrivePaths.ValidateSegment(name);
        var existing = await ListAsync($"'{Q(parentId)}' in parents and name='{Q(name)}' and trashed=false", token);
        if (existing.Count > 1 || existing.Any(x => x.MimeType == FolderMime))
        {
            throw new InvalidDataException("Google Driven samanniminen kohde on epäselvä.");
        }

        if (existing.Count == 1)
        {
            using var response = await SendAsync(() => new(HttpMethod.Patch, "https://www.googleapis.com/upload/drive/v3/files/" + EscapeId(existing[0].Id) + "?uploadType=media") { Content = new ByteArrayContent(content) { Headers = { ContentType = new(mime) } } }, true, token);
            return existing[0].Id;
        }

        using var created = await SendAsync(() =>
        {
            var body = new MultipartContent("related");
            body.Add(new StringContent(JsonSerializer.Serialize(new { name, parents = new[] { parentId } }), Encoding.UTF8, "application/json"));
            body.Add(new ByteArrayContent(content) { Headers = { ContentType = new(mime) } });
            return new(HttpMethod.Post, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
            {
                Content = body
            };
        }, false, token);
        return (await created.Content.ReadFromJsonAsync<DriveFile>(Json, token))?.Id ?? throw new InvalidDataException("Google ei palauttanut tiedostotunnistetta.");
    }

    private static async Task<string> ErrorKindAsync(HttpResponseMessage response, CancellationToken token)
    {
        var kind = response.StatusCode switch
        {
            HttpStatusCode.Unauthorized => "authentication",
            HttpStatusCode.Forbidden => "permission",
            HttpStatusCode.NotFound => "missing",
            HttpStatusCode.TooManyRequests => QuotaKey,
            _ => "network"
        };
        if (response.StatusCode == HttpStatusCode.Forbidden)
        {
            try
            {
                using var error = JsonDocument.Parse(await response.Content.ReadAsStringAsync(token));
                if (error.RootElement.GetProperty("error").GetProperty("errors").EnumerateArray().Any(x => x.GetProperty("reason").GetString() is "rateLimitExceeded" or "userRateLimitExceeded" or "dailyLimitExceeded" or "storageQuotaExceeded"))
                {
                    kind = QuotaKey;
                }
            }
            catch (Exception e) when (e is JsonException or KeyNotFoundException or InvalidOperationException)
            {
                // Keep the HTTP permission classification when the optional error body is malformed.
            }
        }
        return kind;
    }

    private static void MapManifestPhotos(DriveManifest manifest, List<CloudPhoto> result, Dictionary<string, DriveManifestEntry> mapped)
    {
        foreach (var entry in manifest.Media)
        {
            DrivePaths.Resolve(Path.GetTempPath(), entry.RelativePath);
            var photo = result.SingleOrDefault(x => x.Id == entry.Id);
            if (photo is null)
            {
                continue; // The owning restore reports missing manifest media.
            }

            var pieces = photo.RelativePath.Split('/');
            var expected = entry.RelativePath.Replace('\\', '/').Split('/');
            if (pieces.Length < 3 || !pieces[1].StartsWith("snapshot_", StringComparison.Ordinal) || pieces[0] != expected[0] || string.Join('/', pieces.Skip(2)) != string.Join('/', expected.Skip(1)))
            {
                throw new InvalidDataException("Kuvamanifesti ei vastaa Drive-kansiopolkua.");
            }

            if (!mapped.TryAdd(entry.Id, entry))
            {
                throw new InvalidDataException("Sama pilvikuva esiintyy useassa manifestissa.");
            }
        }
    }

    private static bool CanRetry(bool retrySafe, bool transient, int attempt) => retrySafe && transient && attempt < 2;
}
