using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Loikka.Infrastructure.GoogleDrive;

namespace Loikka.Tests.GoogleDrive;

[TestClass]
public sealed class DriveTests
{
    private sealed class MemoryTokens : ITokenStore
    {
        public StoredTokens? Value = new("access", "refresh", DateTimeOffset.UtcNow.AddHours(1), "test@example.invalid");
        public Task<StoredTokens?> ReadAsync(CancellationToken token = default) => Task.FromResult(Value);
        public Task WriteAsync(StoredTokens value, CancellationToken token = default)
        {
            Value = value;
            return Task.CompletedTask;
        }

        public Task DeleteAsync(CancellationToken token = default)
        {
            Value = null;
            return Task.CompletedTask;
        }
    }

    private sealed class Handler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> action;
        public Handler(Func<HttpRequestMessage, Task<HttpResponseMessage>> action) => this.action = action;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => action(request);
    }

    private static HttpResponseMessage Json(string body, HttpStatusCode code = HttpStatusCode.OK) => new(code)
    {
        Content = new StringContent(body, Encoding.UTF8, "application/json")
    };
    private static DriveClient Client(HttpClient http, MemoryTokens? tokens = null) => new(http, new GoogleOAuthClient(http, new OAuthClientConfiguration("synthetic-client", "synthetic-secret"), tokens ?? new()));
    [TestMethod]
    public async Task BackupsFollowPaginationAndNeverCreateFolderOnRead()
    {
        var requests = new List<string>();
        using var http = new HttpClient(new Handler(request =>
        {
            Assert.AreEqual(HttpMethod.Get, request.Method);
            Assert.AreEqual("Bearer access", request.Headers.Authorization!.ToString());
            requests.Add(request.RequestUri!.ToString());
            return Task.FromResult(Json(requests.Count switch
            {
                1 => "{\"files\":[{\"id\":\"root\",\"name\":\"Loikka Backups\",\"mimeType\":\"application/vnd.google-apps.folder\"}]}",
                2 => "{\"files\":[{\"id\":\"a\",\"name\":\"loikka_backup_20251001_120000.db\",\"createdTime\":\"2025-10-01T12:00:00Z\",\"size\":\"42\"}],\"nextPageToken\":\"page2\"}",
                _ => "{\"files\":[{\"id\":\"b\",\"name\":\"loikka_backup_20261001_120000.db\",\"createdTime\":\"2026-10-01T12:00:00Z\"}]}"
            }));
        }));
        var backups = await Client(http).ListBackupsAsync(TestContext.CancellationToken);
        Assert.AreSequenceEqual(expected, backups.Select(x => x.Id).ToArray());
        Assert.AreEqual(42L, backups[1].SizeBytes);
        Assert.IsNull(backups[0].SizeBytes);
        Assert.Contains("pageToken=page2", requests[2]);
        Assert.Contains("nextPageToken", requests[1]);
    }

    [TestMethod]
    public async Task UnauthorizedRequestRefreshesOnceAndPreservesRefreshToken()
    {
        var tokens = new MemoryTokens();
        var refreshes = 0;
        using var http = new HttpClient(new Handler(async request =>
        {
            if (request.RequestUri!.AbsolutePath == "/token")
            {
                refreshes++;
                var form = await request.Content!.ReadAsStringAsync(TestContext.CancellationToken);
                Assert.Contains("grant_type=refresh_token", form);
                Assert.Contains("refresh_token=refresh", form);
                return Json("{\"access_token\":\"new-access\",\"expires_in\":3600}");
            }

            return request.Headers.Authorization!.Parameter == "access" ? Json("do not expose this body", HttpStatusCode.Unauthorized) : Json("{\"files\":[]}");
        }));
        Assert.IsEmpty(await Client(http, tokens).ListBackupsAsync(TestContext.CancellationToken));
        Assert.AreEqual(1, refreshes);
        Assert.AreEqual("refresh", tokens.Value!.RefreshToken);
        Assert.AreEqual("new-access", tokens.Value.AccessToken);
    }

    [TestMethod]
    public async Task TransientGetRetriesAreBoundedAndPermissionBodiesRemainPrivate()
    {
        var calls = 0;
        using var http = new HttpClient(new Handler(_ =>
        {
            calls++;
            return Task.FromResult(Json("private bearer payload", HttpStatusCode.ServiceUnavailable));
        }));
        var error = await Assert.ThrowsAsync<DriveException>(() => Client(http).ListBackupsAsync(TestContext.CancellationToken));
        Assert.AreEqual(3, calls);
        Assert.AreEqual("network", error.Kind);
        Assert.DoesNotContain("private", error.Message);
        using var forbidden = new HttpClient(new Handler(_ => Task.FromResult(Json("token secret", HttpStatusCode.Forbidden))));
        Assert.AreEqual("permission", (await Assert.ThrowsAsync<DriveException>(() => Client(forbidden).ListBackupsAsync(TestContext.CancellationToken))).Kind);
    }

    [TestMethod]
    public async Task OAuthBindsBeforeBrowserUsesPkceAndValidatesExactCallback()
    {
        var tokens = new MemoryTokens
        {
            Value = null
        };
        string? verifier = null;
        string? challenge = null;
        Uri? redirect = null;
        using var http = new HttpClient(new Handler(async request =>
        {
            if (request.RequestUri!.AbsolutePath == "/token")
            {
                var form = Query(await request.Content!.ReadAsStringAsync(TestContext.CancellationToken));
                verifier = form["code_verifier"];
                Assert.AreEqual("synthetic-code", form["code"]);
                Assert.AreEqual(redirect!.ToString(), form["redirect_uri"]);
                return Json("{\"access_token\":\"fresh-access\",\"refresh_token\":\"fresh-refresh\",\"expires_in\":3600}");
            }

            return Json("{\"email\":\"test@example.invalid\"}");
        }));
        var oauth = new GoogleOAuthClient(http, new("synthetic-client", "synthetic-secret"), tokens);
        await oauth.ConnectAsync(async (uri, ct) =>
        {
            var query = Query(uri.Query);
            redirect = new Uri(query["redirect_uri"]);
            challenge = query["code_challenge"];
            Assert.AreEqual("S256", query["code_challenge_method"]);
            Assert.AreEqual("https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email", query["scope"]);
            Assert.IsTrue(redirect.Port is >= 18089 and <= 18093);
            using var callbackClient = new HttpClient();
            using var response = await callbackClient.GetAsync(redirect + "?state=" + Uri.EscapeDataString(query["state"]) + "&code=synthetic-code", ct);
            Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        }, TestContext.CancellationToken);
        Assert.AreEqual(Base64(SHA256.HashData(Encoding.ASCII.GetBytes(verifier!))), challenge);
        Assert.AreEqual("fresh-refresh", tokens.Value!.RefreshToken);
        Assert.IsTrue((await oauth.GetStatusAsync(TestContext.CancellationToken)).IsAuthenticated);
        await oauth.DisconnectAsync(TestContext.CancellationToken);
        Assert.IsFalse((await oauth.GetStatusAsync(TestContext.CancellationToken)).IsAuthenticated);
    }

    [TestMethod]
    public async Task OAuthRejectsWrongStateAndDoesNotExchangeCode()
    {
        using var http = new HttpClient(new Handler(_ => throw new AssertFailedException("Wrong-state callback must not exchange a token.")));
        var tokens = new MemoryTokens
        {
            Value = null
        };
        var oauth = new GoogleOAuthClient(http, new("synthetic-client", ""), tokens);
        await Assert.ThrowsAsync<InvalidDataException>(() => oauth.ConnectAsync(async (uri, ct) =>
        {
            using var callback = new HttpClient();
            await callback.GetAsync(Query(uri.Query)["redirect_uri"] + "?state=wrong&code=do-not-exchange", ct);
        }, TestContext.CancellationToken));
        Assert.IsNull(tokens.Value);
    }

    [TestMethod]
    public async Task OAuthDenialAndBrowserFailureDoNotLeaveCallbackListenerRunning()
    {
        using var http = new HttpClient(new Handler(_ => throw new AssertFailedException("No token request expected.")));
        var tokens = new MemoryTokens
        {
            Value = null
        };
        var oauth = new GoogleOAuthClient(http, new("synthetic", ""), tokens);
        await Assert.ThrowsAsync<IOException>(() => oauth.ConnectAsync((uri, ct) => throw new IOException("Synthetic browser refusal."), TestContext.CancellationToken));
        var error = await Assert.ThrowsAsync<DriveException>(() => oauth.ConnectAsync(async (uri, ct) =>
        {
            var query = Query(uri.Query);
            using var callback = new HttpClient();
            await callback.GetAsync(query["redirect_uri"] + "?state=" + query["state"] + "&error=access_denied", ct);
        }, TestContext.CancellationToken));
        Assert.AreEqual("denied", error.Kind);
        Assert.IsNull(tokens.Value);
        using var cancellation = new CancellationTokenSource(TimeSpan.FromMilliseconds(50));
        await Assert.ThrowsAsync<OperationCanceledException>(() => oauth.ConnectAsync((uri, ct) => Task.CompletedTask, cancellation.Token));
    }

    [TestMethod]
    public async Task RepeatedPageTokenFailsInsteadOfLoopingForever()
    {
        var requests = 0;
        using var http = new HttpClient(new Handler(_ => Task.FromResult(Json(++requests == 1 ? "{\"files\":[{\"id\":\"root\",\"name\":\"Loikka Backups\"}]}" : "{\"files\":[],\"nextPageToken\":\"same\"}"))));
        await Assert.ThrowsAsync<InvalidDataException>(() => Client(http).ListBackupsAsync(TestContext.CancellationToken));
        Assert.AreEqual(3, requests);
    }

    [TestMethod]
    public void ConfigurationUsesOnlyDeterministicDeploymentFilename()
    {
        var folder = Path.Combine(Path.GetTempPath(), "loikka-oauth-config-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(folder);
        try
        {
            File.WriteAllText(Path.Combine(folder, "google-credentials.json"), "{\"installed\":{\"client_id\":\"ignored\"}}");
            Assert.Throws<FileNotFoundException>(() => OAuthClientConfiguration.LoadFromDeploymentDirectory(folder));
            File.WriteAllText(Path.Combine(folder, "oauth-client.json"), "{\"installed\":{\"client_id\":\"synthetic\"}}");
            Assert.AreEqual("synthetic", OAuthClientConfiguration.LoadFromDeploymentDirectory(folder).ClientId);
        }
        finally
        {
            Directory.Delete(folder, true);
        }
    }

    [TestMethod]
    [OSCondition(OperatingSystems.Windows)]
    public async Task ProtectedTokenStoreNeverWritesPlaintextAndRoundTripsSyntheticTokens()
    {
        var folder = Path.Combine(Path.GetTempPath(), "loikka-drive-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(folder);
        try
        {
            var path = Path.Combine(folder, "synthetic.dpapi");
            var store = new WindowsTokenStore(path);
            await store.WriteAsync(new("synthetic-access", "synthetic-refresh", DateTimeOffset.UtcNow.AddHours(1), null), TestContext.CancellationToken);
            Assert.DoesNotContain("synthetic-access", Encoding.UTF8.GetString(await File.ReadAllBytesAsync(path, TestContext.CancellationToken)));
            Assert.AreEqual("synthetic-refresh", (await store.ReadAsync(TestContext.CancellationToken))!.RefreshToken);
            await store.DeleteAsync(TestContext.CancellationToken);
            Assert.IsNull(await store.ReadAsync(TestContext.CancellationToken));
        }
        finally
        {
            Directory.Delete(folder, true);
        }
    }

    internal static Dictionary<string, string> Query(string query) => query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries).Select(x => x.Split('=', 2)).ToDictionary(x => Uri.UnescapeDataString(x[0]), x => Uri.UnescapeDataString(x[1].Replace('+', ' ')));
    private static string Base64(byte[] value) => Convert.ToBase64String(value).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    public TestContext TestContext { get; set; }

    private static readonly string[] expected = new[]
    {
        "b",
        "a"
    };
}
