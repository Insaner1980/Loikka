using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Loikka.Core.Models;
using Loikka.Infrastructure.Database;
using Loikka.Infrastructure.GoogleDrive;
using Microsoft.Data.Sqlite;

namespace Loikka.Tests.GoogleDrive;

[TestClass]
public sealed partial class DriveTransferTests
{
    private sealed class Tokens : ITokenStore
    {
        public Task<StoredTokens?> ReadAsync(CancellationToken token = default) => Task.FromResult<StoredTokens?>(new("synthetic", "refresh", DateTimeOffset.UtcNow.AddHours(1), null));
        public Task WriteAsync(StoredTokens value, CancellationToken token = default) => Task.CompletedTask;
        public Task DeleteAsync(CancellationToken token = default) => Task.CompletedTask;
    }

    private sealed record FileItem(string Id, string Name, string? Parent, string Mime, byte[] Bytes, string CreatedTime = "2026-10-15T12:00:00Z");
    private sealed partial class Cloud : HttpMessageHandler
    {
        internal readonly List<FileItem> Files = [];
        internal readonly List<string> Downloads = [];
        internal int Calls;
        internal string? RejectUploadName;
        internal string Add(string name, string? parent, string mime, byte[]? bytes = null)
        {
            var id = "id" + (Files.Count + 1);
            Files.Add(new(id, name, parent, mime, bytes ?? []));
            return id;
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            Calls++;
            var uri = request.RequestUri!;
            var query = DriveTests.Query(uri.Query);
            if (request.Method == HttpMethod.Get && query.GetValueOrDefault("alt") == "media")
            {
                var id = uri.Segments[^1];
                Downloads.Add(id);
                return new(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(Files.Single(x => x.Id == id).Bytes)
                };
            }

            if (request.Method == HttpMethod.Get)
            {
                var q = query["q"];
                var parent = ParentQueryRegex().Match(q);
                var name = NameQueryRegex().Match(q);
                var values = Files.Where(x => (!parent.Success || x.Parent == parent.Groups[1].Value) && (!name.Success || x.Name == name.Groups[1].Value));
                if (q.Contains("mimeType='application/vnd.google-apps.folder'"))
                {
                    values = values.Where(x => x.Mime == "application/vnd.google-apps.folder");
                }

                if (q.Contains("name contains 'loikka_backup_'"))
                {
                    values = values.Where(x => x.Name.StartsWith("loikka_backup_"));
                }

                return new(HttpStatusCode.OK)
                {
                    Content = JsonContent.Create(new { files = values.Select(x => new { id = x.Id, name = x.Name, mimeType = x.Mime, size = x.Bytes.Length.ToString(), createdTime = x.CreatedTime }) })
                };
            }

            if (request.Method == HttpMethod.Post)
            {
                JsonDocument metadata;
                byte[] bytes = [];
                if (request.Content is MultipartContent multipart)
                {
                    Assert.AreEqual("multipart/related", multipart.Headers.ContentType!.MediaType);
                    var parts = multipart.ToArray();
                    metadata = JsonDocument.Parse(await parts[0].ReadAsStringAsync(token));
                    bytes = await parts[1].ReadAsByteArrayAsync(token);
                }
                else
                {
                    metadata = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(token));
                }

                using (metadata)
                {
                    var root = metadata.RootElement;
                    if (root.GetProperty("name").GetString() == RejectUploadName)
                    {
                        return new(HttpStatusCode.ServiceUnavailable)
                        {
                            Content = new StringContent("private remote error")
                        };
                    }

                    var parent = root.TryGetProperty("parents", out var parents) ? parents[0].GetString() : null;
                    var mime = root.TryGetProperty("mimeType", out var mimeValue) ? mimeValue.GetString()! : "application/octet-stream";
                    var id = Add(root.GetProperty("name").GetString()!, parent, mime, bytes);
                    return new(HttpStatusCode.OK)
                    {
                        Content = JsonContent.Create(new { id })
                    };
                }
            }

            if (request.Method == HttpMethod.Patch)
            {
                var index = Files.FindIndex(x => x.Id == uri.Segments[^1]);
                Files[index] = Files[index] with
                {
                    Bytes = await request.Content!.ReadAsByteArrayAsync(token)
                };
                return new(HttpStatusCode.OK)
                {
                    Content = JsonContent.Create(new { id = Files[index].Id })
                };
            }

            throw new AssertFailedException("Unexpected request: " + request.Method + " " + uri.AbsolutePath);
        }

        [GeneratedRegex("'([^']+)' in parents")]
        private static partial Regex ParentQueryRegex();
        [GeneratedRegex("name='([^']+)'")]
        private static partial Regex NameQueryRegex();
    }

    private static DriveClient Client(HttpClient http) => new(http, new GoogleOAuthClient(http, new("synthetic", ""), new Tokens()));
    private static string Root() => Path.Combine(Path.GetTempPath(), "loikka-transfer-" + Guid.NewGuid().ToString("N"));
    private static void Cleanup(string root)
    {
        foreach (var path in Directory.GetDirectories(Path.GetDirectoryName(root)!, Path.GetFileName(root) + "*"))
        {
            Directory.Delete(path, true);
        }
    }

    [TestMethod]
    public async Task EmptyIndividualSelectionNeverUploadsAllPhotos()
    {
        var root = Root();
        Directory.CreateDirectory(Path.Combine(root, "photos", "results", "1"));
        await File.WriteAllBytesAsync(Path.Combine(root, "photos", "results", "1", "nested.jpg"), [1, 2, 3], TestContext.CancellationToken);
        try
        {
            using var cloud = new Cloud();
            using var http = new HttpClient(cloud);
            var service = new DriveBackupService(Client(http), new LocalDatabase(root));
            Assert.HasCount(1, service.ListLocalPhotos());
            var report = await service.UploadAsync(new(false, false, true, []), TestContext.CancellationToken);
            Assert.AreEqual(0, report.ItemsTransferred);
            Assert.AreEqual(0, cloud.Calls);
            report = await service.UploadAsync(new(false, false, true), TestContext.CancellationToken);
            Assert.AreEqual(1, report.ItemsTransferred);
            Assert.ContainsSingle(x => x.Name == "nested.jpg", cloud.Files);
            Assert.AreEqual(0, cloud.Files.Count(x => x.Name.EndsWith(".db")));
        }
        finally
        {
            Cleanup(root);
        }
    }

    [TestMethod]
    public async Task NativeManifestRestoresNestedMediaAndRetainsPriorDatabaseRoot()
    {
        var root = Root();
        var local = new LocalDatabase(root);
        await local.InitializeAsync();
        var athlete = await local.SaveAthleteAsync(new Athlete { FirstName = "Before", LastName = "Backup", BirthYear = 2016, Gender = "P" });
        var relative = "photos/athletes/1/original.jpg";
        var photoPath = Path.Combine(root, relative);
        Directory.CreateDirectory(Path.GetDirectoryName(photoPath)!);
        await File.WriteAllBytesAsync(photoPath, [1, 2, 3], TestContext.CancellationToken);
        try
        {
            using var cloud = new Cloud();
            using var http = new HttpClient(cloud);
            var service = new DriveBackupService(Client(http), local);
            var uploaded = await service.UploadAsync(new(true, true, true), TestContext.CancellationToken);
            Assert.AreEqual(2, uploaded.ItemsTransferred);
            Assert.IsNotNull(uploaded.BackupId);
            athlete.FirstName = "After";
            await local.SaveAthleteAsync(athlete);
            await File.WriteAllBytesAsync(photoPath, [9], TestContext.CancellationToken);
            var restored = await service.RestoreAsync(uploaded.BackupId, new(true, true, true), TestContext.CancellationToken);
            Assert.AreEqual("Before", (await local.GetAthletesAsync()).Single().FirstName);
            Assert.AreSequenceEqual(new byte[] { 1, 2, 3 }, await File.ReadAllBytesAsync(photoPath, TestContext.CancellationToken));
            Assert.IsNotNull(restored.RetainedRoot);
            Assert.AreEqual("After", (await new LocalDatabase(restored.RetainedRoot).GetAthletesAsync()).Single().FirstName);
        }
        finally
        {
            Cleanup(root);
        }
    }

    [TestMethod]
    public async Task PhotoOnlyLegacyRestoreDoesNotReplaceDatabaseAndRejectsUntrustedId()
    {
        var root = Root();
        var local = new LocalDatabase(root);
        await local.InitializeAsync();
        await local.SaveAthleteAsync(new Athlete { FirstName = "Keep", LastName = "Local", BirthYear = 2016, Gender = "P" });
        try
        {
            using var cloud = new Cloud();
            var folder = cloud.Add("Loikka Backups", null, "application/vnd.google-apps.folder");
            var gallery = cloud.Add("photos", folder, "application/vnd.google-apps.folder");
            var id = cloud.Add("legacy.jpg", gallery, "image/jpeg", [4, 5]);
            cloud.Add("unrelated.jpg", "foreign", "image/jpeg", [7]);
            using var http = new HttpClient(cloud);
            var service = new DriveBackupService(Client(http), local);
            await Assert.ThrowsAsync<InvalidDataException>(() => service.RestoreAsync(null, new(false, false, true, ["unrelated-id"]), TestContext.CancellationToken));
            Assert.IsEmpty(cloud.Downloads);
            var report = await service.RestoreAsync(null, new(false, false, true, [id]), TestContext.CancellationToken);
            Assert.AreEqual(1, report.ItemsTransferred);
            Assert.AreEqual("Keep", (await local.GetAthletesAsync()).Single().FirstName);
            Assert.AreSequenceEqual(new byte[] { 4, 5 }, await File.ReadAllBytesAsync(Path.Combine(root, "photos", "legacy.jpg"), TestContext.CancellationToken));
        }
        finally
        {
            Cleanup(root);
        }
    }

    [TestMethod]
    public async Task UnsafeCloudFilenameAndCorruptDatabaseNeverActivate()
    {
        var root = Root();
        var local = new LocalDatabase(root);
        await local.InitializeAsync();
        await local.SaveAthleteAsync(new Athlete { FirstName = "Safe", LastName = "Local", BirthYear = 2016, Gender = "P" });
        try
        {
            using var cloud = new Cloud();
            var folder = cloud.Add("Loikka Backups", null, "application/vnd.google-apps.folder");
            var gallery = cloud.Add("photos", folder, "application/vnd.google-apps.folder");
            cloud.Add("../escape.jpg", gallery, "image/jpeg", [1]);
            using var http = new HttpClient(cloud);
            var client = Client(http);
            var service = new DriveBackupService(client, local);
            await Assert.ThrowsAsync<InvalidDataException>(() => client.ListPhotosAsync(TestContext.CancellationToken));
            var backupId = cloud.Add("loikka_backup_20261015_120000.db", folder, "application/x-sqlite3", [1, 2, 3]);
            await Assert.ThrowsAsync<SqliteException>(() => service.RestoreAsync(backupId, new(true, false, false, []), TestContext.CancellationToken));
            Assert.AreEqual("Safe", (await local.GetAthletesAsync()).Single().FirstName);
            Assert.IsEmpty(Directory.GetDirectories(Path.GetDirectoryName(root)!, Path.GetFileName(root) + ".rollback-*"));
        }
        finally
        {
            Cleanup(root);
        }
    }

    [TestMethod]
    public async Task MediaOnlyNativeManifestRestoresOriginalRelativePathAndRejectsChangedBytes()
    {
        var root = Root();
        var local = new LocalDatabase(root);
        await local.InitializeAsync();
        var path = Path.Combine(root, "profile_photos", "synthetic.jpg");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllBytesAsync(path, [3, 4], TestContext.CancellationToken);
        try
        {
            using var cloud = new Cloud();
            using var http = new HttpClient(cloud);
            var client = Client(http);
            var service = new DriveBackupService(client, local);
            await service.UploadAsync(new(false, true, false), TestContext.CancellationToken);
            var photo = (await client.ListPhotosAsync(TestContext.CancellationToken)).Single();
            Assert.AreEqual("profile_photos/synthetic.jpg", photo.RelativePath);
            Assert.IsNotNull(photo.Sha256);
            await File.WriteAllBytesAsync(path, [9], TestContext.CancellationToken);
            await service.RestoreAsync(null, new(false, true, false, [photo.Id]), TestContext.CancellationToken);
            Assert.AreSequenceEqual(new byte[] { 3, 4 }, await File.ReadAllBytesAsync(path, TestContext.CancellationToken));
            var index = cloud.Files.FindIndex(x => x.Id == photo.Id);
            cloud.Files[index] = cloud.Files[index] with
            {
                Bytes = [7]
            };
            await Assert.ThrowsAsync<InvalidDataException>(() => service.RestoreAsync(null, new(false, true, false, [photo.Id]), TestContext.CancellationToken));
            Assert.AreSequenceEqual(new byte[] { 3, 4 }, await File.ReadAllBytesAsync(path, TestContext.CancellationToken));
        }
        finally
        {
            Cleanup(root);
        }
    }

    [TestMethod]
    public async Task NativeBackupWithoutFinalManifestNeverRestoresAsLegacy()
    {
        var root = Root();
        var local = new LocalDatabase(root);
        await local.InitializeAsync();
        try
        {
            using var cloud = new Cloud();
            var folder = cloud.Add("Loikka Backups", null, "application/vnd.google-apps.folder");
            var id = cloud.Add("loikka_backup_20261015_120000_1234abcd.db", folder, "application/x-sqlite3", [1, 2, 3]);
            using var http = new HttpClient(cloud);
            var service = new DriveBackupService(Client(http), local);
            await Assert.ThrowsAsync<InvalidDataException>(() => service.ListRestorePhotosAsync(id, true, TestContext.CancellationToken));
            await Assert.ThrowsAsync<InvalidDataException>(() => service.RestoreAsync(id, new(true, false, false, []), TestContext.CancellationToken));
            Assert.IsEmpty(cloud.Downloads);
        }
        finally
        {
            Cleanup(root);
        }
    }

    [TestMethod]
    public async Task UploadRejectsOutsideOrDisabledCategorySelectionBeforeHttp()
    {
        var root = Root();
        Directory.CreateDirectory(Path.Combine(root, "profile_photos"));
        var profile = Path.Combine(root, "profile_photos", "profile.jpg");
        await File.WriteAllBytesAsync(profile, [1], TestContext.CancellationToken);
        try
        {
            using var cloud = new Cloud();
            using var http = new HttpClient(cloud);
            var service = new DriveBackupService(Client(http), new LocalDatabase(root));
            await Assert.ThrowsAsync<InvalidDataException>(() => service.UploadAsync(new(false, false, true, [profile]), TestContext.CancellationToken));
            await Assert.ThrowsAsync<InvalidDataException>(() => service.UploadAsync(new(false, true, true, [Path.Combine(root, "outside.jpg")]), TestContext.CancellationToken));
            Assert.AreEqual(0, cloud.Calls);
        }
        finally
        {
            Cleanup(root);
        }
    }

    [TestMethod]
    public async Task PartialUploadReportsCompletedCountAndFailedRelativeFile()
    {
        var root = Root();
        Directory.CreateDirectory(Path.Combine(root, "photos"));
        await File.WriteAllBytesAsync(Path.Combine(root, "photos", "a.jpg"), [1], TestContext.CancellationToken);
        await File.WriteAllBytesAsync(Path.Combine(root, "photos", "b.jpg"), [2], TestContext.CancellationToken);
        try
        {
            using var cloud = new Cloud
            {
                RejectUploadName = "b.jpg"
            };
            using var http = new HttpClient(cloud);
            var service = new DriveBackupService(Client(http), new LocalDatabase(root));
            var error = await Assert.ThrowsAsync<DriveTransferException>(() => service.UploadAsync(new(false, false, true), TestContext.CancellationToken));
            Assert.AreEqual(1, error.CompletedItems);
            Assert.AreEqual("photos/b.jpg", error.FailedItem);
            Assert.DoesNotContain("private", error.Message);
            Assert.ContainsSingle(x => x.Name == "a.jpg", cloud.Files);
            Assert.AreEqual(0, cloud.Files.Count(x => x.Name.EndsWith(".manifest.json")));
        }
        finally
        {
            Cleanup(root);
        }
    }

    [TestMethod]
    [DataRow(false)]
    [DataRow(true)]
    public async Task NativeRestoreNeverRelinksMissingReferenceByUnrelatedBasename(bool downloadPhotos)
    {
        var root = Root();
        var local = new LocalDatabase(root);
        await local.InitializeAsync();
        var athlete = await local.SaveAthleteAsync(new Athlete { FirstName = "Original", LastName = "Owner", BirthYear = 2016, Gender = "P" });
        const string missing = "photos/athletes/1/original.jpg";
        var photo = await local.SavePhotoAsync(new Photo { EntityType = "athletes", EntityId = athlete.Id, FilePath = missing, OriginalName = "original.jpg" });
        var unrelated = Path.Combine(root, "photos", "athletes", "2", "original.jpg");
        Directory.CreateDirectory(Path.GetDirectoryName(unrelated)!);
        await File.WriteAllBytesAsync(unrelated, [9], TestContext.CancellationToken);
        try
        {
            using var cloud = new Cloud();
            using var http = new HttpClient(cloud);
            var service = new DriveBackupService(Client(http), local);
            var uploaded = await service.UploadAsync(new(true, false, true), TestContext.CancellationToken);
            var restored = await service.RestoreAsync(uploaded.BackupId, new(true, false, downloadPhotos, downloadPhotos ? null : []), TestContext.CancellationToken);
            Assert.AreEqual(missing, (await local.GetPhotosAsync()).Single(x => x.Id == photo.Id).FilePath);
            Assert.Contains(x => x.Contains($"photos.file_path #{photo.Id}"), restored.Warnings, "A missing reference must be reported rather than silently linked to a different image.");
            Assert.IsFalse(File.Exists(Path.Combine(root, missing)));
            Assert.AreSequenceEqual(new byte[] { 9 }, await File.ReadAllBytesAsync(unrelated, TestContext.CancellationToken));
            if (downloadPhotos)
            {
                athlete.FirstName = "Keep after failed restore";
                await local.SaveAthleteAsync(athlete);
                var index = cloud.Files.FindIndex(x => x.Name == "original.jpg");
                cloud.Files[index] = cloud.Files[index] with
                {
                    Bytes = [7]
                };
                await Assert.ThrowsAsync<InvalidDataException>(() => service.RestoreAsync(uploaded.BackupId, new(true, false, true), TestContext.CancellationToken));
                Assert.AreEqual("Keep after failed restore", (await local.GetAthletesAsync()).Single().FirstName);
                Assert.AreEqual(missing, (await local.GetPhotosAsync()).Single(x => x.Id == photo.Id).FilePath);
                Assert.AreSequenceEqual(new byte[] { 9 }, await File.ReadAllBytesAsync(unrelated, TestContext.CancellationToken));
            }
        }
        finally
        {
            Cleanup(root);
        }
    }

    [TestMethod]
    [DataRow(false)]
    [DataRow(true)]
    public async Task LegacyBasenameFallbackUsesOnlyActuallyDownloadedCorrectCategoryFiles(bool downloadPhoto)
    {
        var root = Root();
        var local = new LocalDatabase(root);
        await local.InitializeAsync();
        var athlete = await local.SaveAthleteAsync(new Athlete { FirstName = "Legacy", LastName = "Owner", BirthYear = 2016, Gender = "P" });
        const string original = "C:/Users/Legacy/AppData/Roaming/com.loikka.app/photos/athletes/1/original.jpg";
        var photo = await local.SavePhotoAsync(new Photo { EntityType = "athletes", EntityId = athlete.Id, FilePath = original, OriginalName = "original.jpg" });
        var unrelated = Path.Combine(root, "photos", "athletes", "2", "original.jpg");
        Directory.CreateDirectory(Path.GetDirectoryName(unrelated)!);
        await File.WriteAllBytesAsync(unrelated, [9], TestContext.CancellationToken);
        var fixture = Path.Combine(root, "fixture.db");
        await local.CreateSnapshotAsync(fixture);
        try
        {
            using var cloud = new Cloud();
            var folder = cloud.Add("Loikka Backups", null, "application/vnd.google-apps.folder");
            var gallery = cloud.Add("photos", folder, "application/vnd.google-apps.folder");
            var legacyPhoto = cloud.Add("original.jpg", gallery, "image/jpeg", [4, 5]);
            var backupId = cloud.Add("loikka_backup_20261015_120000.db", folder, "application/x-sqlite3", await File.ReadAllBytesAsync(fixture, TestContext.CancellationToken));
            using var http = new HttpClient(cloud);
            var service = new DriveBackupService(Client(http), local);
            Assert.AreSequenceEqual(new[] { legacyPhoto }, (await service.ListRestorePhotosAsync(backupId, true, TestContext.CancellationToken)).Select(x => x.Id).ToArray());
            var report = await service.RestoreAsync(backupId, new(true, false, downloadPhoto, downloadPhoto ? null : []), TestContext.CancellationToken);
            Assert.AreEqual(downloadPhoto ? "photos/original.jpg" : original, (await local.GetPhotosAsync()).Single(x => x.Id == photo.Id).FilePath);
            Assert.AreEqual(!downloadPhoto, report.Warnings.Any(x => x.Contains($"photos.file_path #{photo.Id}")));
            Assert.AreSequenceEqual(new byte[] { 9 }, await File.ReadAllBytesAsync(unrelated, TestContext.CancellationToken));
            if (downloadPhoto)
            {
                Assert.AreSequenceEqual(new byte[] { 4, 5 }, await File.ReadAllBytesAsync(Path.Combine(root, "photos", "original.jpg"), TestContext.CancellationToken));
            }
        }
        finally
        {
            Cleanup(root);
        }
    }

    [TestMethod]
    public async Task RestorePhotoChoicesUseSelectedOrLatestNativeManifestAndPhotoOnlyUsesLibrary()
    {
        var root = Root();
        var local = new LocalDatabase(root);
        await local.InitializeAsync();
        var athlete = await local.SaveAthleteAsync(new Athlete { FirstName = "Keep latest local", LastName = "Owner", BirthYear = 2016, Gender = "P" });
        var path = Path.Combine(root, "photos", "same.jpg");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllBytesAsync(path, [1], TestContext.CancellationToken);
        try
        {
            using var cloud = new Cloud();
            using var http = new HttpClient(cloud);
            var service = new DriveBackupService(Client(http), local);
            var first = await service.UploadAsync(new(true, false, true), TestContext.CancellationToken);
            var firstPhoto = cloud.Files.Single(x => x.Name == "same.jpg").Id;
            await File.WriteAllBytesAsync(path, [2], TestContext.CancellationToken);
            var second = await service.UploadAsync(new(true, false, true), TestContext.CancellationToken);
            var secondPhoto = cloud.Files.Last(x => x.Name == "same.jpg").Id;
            var firstIndex = cloud.Files.FindIndex(x => x.Id == first.BackupId);
            cloud.Files[firstIndex] = cloud.Files[firstIndex] with
            {
                CreatedTime = "2026-10-15T12:00:00Z"
            };
            var secondIndex = cloud.Files.FindIndex(x => x.Id == second.BackupId);
            cloud.Files[secondIndex] = cloud.Files[secondIndex] with
            {
                CreatedTime = "2026-10-16T12:00:00Z"
            };
            Assert.AreSequenceEqual(new[] { firstPhoto }, (await service.ListRestorePhotosAsync(first.BackupId, true, TestContext.CancellationToken)).Select(x => x.Id).ToArray());
            Assert.AreSequenceEqual(new[] { secondPhoto }, (await service.ListRestorePhotosAsync(null, true, TestContext.CancellationToken)).Select(x => x.Id).ToArray());
            Assert.AreSequenceEqual(new[] { firstPhoto }, (await service.ListRestorePhotosAsync(first.BackupId, false, TestContext.CancellationToken)).Select(x => x.Id).ToArray());
            Assert.AreSequenceEqual(new[] { firstPhoto, secondPhoto }, (await service.ListRestorePhotosAsync(null, false, TestContext.CancellationToken)).Select(x => x.Id).ToArray(), Microsoft.VisualStudio.TestTools.UnitTesting.SequenceOrder.InAnyOrder);
            await File.WriteAllBytesAsync(path, [9], TestContext.CancellationToken);
            await service.RestoreAsync(null, new(false, false, true, [secondPhoto]), TestContext.CancellationToken);
            Assert.AreSequenceEqual(new byte[] { 2 }, await File.ReadAllBytesAsync(path, TestContext.CancellationToken));
            Assert.AreEqual("Keep latest local", (await local.GetAthletesAsync()).Single(x => x.Id == athlete.Id).FirstName);
        }
        finally
        {
            Cleanup(root);
        }
    }

    public TestContext TestContext { get; set; }
}
