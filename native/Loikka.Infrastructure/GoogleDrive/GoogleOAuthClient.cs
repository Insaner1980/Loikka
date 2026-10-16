using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Loikka.Infrastructure.GoogleDrive;

public sealed class GoogleOAuthClient
{
    private const string AuthenticationKey = "authentication";
    private readonly HttpClient http;
    private readonly OAuthClientConfiguration configuration;
    private readonly ITokenStore tokens;
    private const string AuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    private const string UserInfoEndpoint = "https://www.googleapis.com/oauth2/v2/userinfo";
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";
    public const string Scopes = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";
    private readonly SemaphoreSlim refreshGate = new(1, 1);
    private readonly SemaphoreSlim connectGate = new(1, 1);
    public GoogleOAuthClient(HttpClient http, OAuthClientConfiguration configuration, ITokenStore tokens)
    {
        this.http = http;
        this.configuration = configuration;
        this.tokens = tokens;
    }

    private static string Base64(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    private static string Form(IEnumerable<KeyValuePair<string, string>> values) => string.Join('&', values.Select(x => Uri.EscapeDataString(x.Key) + "=" + Uri.EscapeDataString(x.Value)));
    public async Task ConnectAsync(Func<Uri, CancellationToken, Task> openBrowser, CancellationToken token = default)
    {
        await connectGate.WaitAsync(token);
        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(token);
            timeout.CancelAfter(TimeSpan.FromMinutes(5));
            using var listener = Bind();
            var port = ((IPEndPoint)listener.LocalEndpoint).Port;
            var redirect = new Uri($"http://127.0.0.1:{port}/");
            var state = Base64(RandomNumberGenerator.GetBytes(32));
            var verifier = Base64(RandomNumberGenerator.GetBytes(32));
            var query = new Dictionary<string, string>
            {
                ["client_id"] = configuration.ClientId,
                ["redirect_uri"] = redirect.ToString(),
                ["response_type"] = "code",
                ["scope"] = Scopes,
                ["access_type"] = "offline",
                ["prompt"] = "consent",
                ["state"] = state,
                ["code_challenge"] = Base64(SHA256.HashData(Encoding.ASCII.GetBytes(verifier))),
                ["code_challenge_method"] = "S256"
            };
            var callback = ReadCallbackAsync(listener, redirect, state, timeout.Token);
            string code;
            try
            {
                await openBrowser(new Uri(AuthorizationEndpoint + "?" + Form(query)), timeout.Token).WaitAsync(timeout.Token);
                code = await callback;
            }
            catch
            {
                await timeout.CancelAsync();
                listener.Stop();
                try
                {
                    await callback;
                }
                catch
                {
                    // Observe callback cancellation without replacing the original browser or callback failure.
                }

                throw;
            }

            var fields = new Dictionary<string, string>
            {
                ["client_id"] = configuration.ClientId,
                ["code"] = code,
                ["redirect_uri"] = redirect.ToString(),
                ["grant_type"] = "authorization_code",
                ["code_verifier"] = verifier
            };
            if (!string.IsNullOrEmpty(configuration.ClientSecret))
            {
                fields["client_secret"] = configuration.ClientSecret;
            }

            var result = await ExchangeAsync(fields, timeout.Token);
            if (string.IsNullOrEmpty(result.RefreshToken))
            {
                throw new DriveException(AuthenticationKey, "Google ei palauttanut uudistustunnistetta. Kirjaudu uudelleen.");
            }

            string? email = null;
            using var infoRequest = new HttpRequestMessage(HttpMethod.Get, UserInfoEndpoint);
            infoRequest.Headers.Authorization = new("Bearer", result.AccessToken);
            using var info = await http.SendAsync(infoRequest, timeout.Token);
            if (info.IsSuccessStatusCode)
            {
                using var document = JsonDocument.Parse(await info.Content.ReadAsStringAsync(timeout.Token));
                email = document.RootElement.TryGetProperty("email", out var value) ? value.GetString() : null;
            }

            await tokens.WriteAsync(new(result.AccessToken, result.RefreshToken, result.ExpiresAt, email), timeout.Token);
        }
        finally
        {
            connectGate.Release();
        }
    }

    private static TcpListener Bind()
    {
        for (var port = 18089; port <= 18093; port++)
        {
            var listener = new TcpListener(IPAddress.Loopback, port);
            try
            {
                listener.Start(1);
                return listener;
            }
            catch (SocketException)
            {
                listener.Stop();
            }
        }

        throw new DriveException("port", "Google-kirjautumisen portit 18089–18093 ovat varattuja.");
    }

    private static async Task<string> ReadCallbackAsync(TcpListener listener, Uri redirect, string state, CancellationToken token)
    {
        using var client = await listener.AcceptTcpClientAsync(token);
        using var requestTimeout = CancellationTokenSource.CreateLinkedTokenSource(token);
        requestTimeout.CancelAfter(TimeSpan.FromSeconds(10));
        await using var stream = client.GetStream();
        var bytes = new byte[8192];
        var count = 0;
        while (count < bytes.Length)
        {
            var read = await stream.ReadAsync(bytes.AsMemory(count, 1), requestTimeout.Token);
            if (read == 0)
            {
                throw new InvalidDataException("OAuth-paluuviesti keskeytyi.");
            }

            count += read;
            if (count >= 4 && bytes[count - 4] == 13 && bytes[count - 3] == 10 && bytes[count - 2] == 13 && bytes[count - 1] == 10)
            {
                break;
            }
        }

        string? code = null;
        Exception? failure = null;
        try
        {
            if (count == bytes.Length)
            {
                throw new InvalidDataException("OAuth-paluuviesti on liian pitkä.");
            }

            code = ParseCallback(bytes, count, redirect, state);
        }
        catch (Exception error) when (error is InvalidDataException or DriveException or UriFormatException)
        {
            failure = error;
        }

        var body = Encoding.UTF8.GetBytes(failure is null ? "Kirjautumisen paluu vastaanotettu. Palaa Loikka-sovellukseen." : "Kirjautuminen epäonnistui. Palaa Loikka-sovellukseen.");
        var headers = Encoding.ASCII.GetBytes($"HTTP/1.1 {(failure is null ? "200 OK" : "400 Bad Request")}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: {body.Length}\r\nConnection: close\r\n\r\n");
        await stream.WriteAsync(headers, requestTimeout.Token);
        await stream.WriteAsync(body, requestTimeout.Token);
        if (failure is not null)
        {
            throw failure;
        }

        return code!;
    }

    private async Task<StoredTokens> ExchangeAsync(Dictionary<string, string> fields, CancellationToken token)
    {
        using var response = await http.PostAsync(TokenEndpoint, new FormUrlEncodedContent(fields), token);
        if (!response.IsSuccessStatusCode)
        {
            throw new DriveException(AuthenticationKey, "Google-kirjautumisen tunnisteen vaihto epäonnistui. Kirjaudu uudelleen.");
        }

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(token));
        var root = document.RootElement;
        var access = root.GetProperty("access_token").GetString();
        if (string.IsNullOrEmpty(access) || !root.GetProperty("expires_in").TryGetInt64(out var seconds) || seconds <= 0)
        {
            throw new DriveException(AuthenticationKey, "Google palautti virheellisen kirjautumistunnisteen.");
        }

        return new(access, root.TryGetProperty("refresh_token", out var refresh) ? refresh.GetString() ?? "" : "", DateTimeOffset.UtcNow.AddSeconds(seconds), null);
    }

    public async Task<AuthStatus> GetStatusAsync(CancellationToken token = default)
    {
        var value = await tokens.ReadAsync(token);
        return new(value is not null, value?.UserEmail, value?.ExpiresAt);
    }

    public Task DisconnectAsync(CancellationToken token = default) => tokens.DeleteAsync(token);
    public async Task<string> GetAccessTokenAsync(bool forceRefresh = false, CancellationToken token = default)
    {
        await refreshGate.WaitAsync(token);
        try
        {
            var value = await tokens.ReadAsync(token) ?? throw new DriveException(AuthenticationKey, "Kirjaudu ensin Google Driveen.");
            if (!forceRefresh && value.ExpiresAt > DateTimeOffset.UtcNow.AddSeconds(60))
            {
                return value.AccessToken;
            }

            var fields = new Dictionary<string, string>
            {
                ["client_id"] = configuration.ClientId,
                ["refresh_token"] = value.RefreshToken,
                ["grant_type"] = "refresh_token"
            };
            if (!string.IsNullOrEmpty(configuration.ClientSecret))
            {
                fields["client_secret"] = configuration.ClientSecret;
            }

            var result = await ExchangeAsync(fields, token);
            result = result with
            {
                RefreshToken = string.IsNullOrEmpty(result.RefreshToken) ? value.RefreshToken : result.RefreshToken,
                UserEmail = value.UserEmail
            };
            await tokens.WriteAsync(result, token);
            return result.AccessToken;
        }
        finally
        {
            refreshGate.Release();
        }
    }

    private static string ParseCallback(byte[] bytes, int count, Uri redirect, string state)
    {
        var lines = Encoding.ASCII.GetString(bytes, 0, count).Split("\r\n");
        var first = lines[0].Split(' ');
        var host = lines.FirstOrDefault(x => x.StartsWith("Host:", StringComparison.OrdinalIgnoreCase))?[5..].Trim();
        if (first.Length != 3 || first[0] != "GET" || host != redirect.Authority || !first[1].StartsWith("/?", StringComparison.Ordinal))
        {
            throw new InvalidDataException("OAuth-paluuosoite ei vastaa käynnistettyä kirjautumista.");
        }

        var callback = new Uri(redirect, first[1]);
        if (callback.GetLeftPart(UriPartial.Path) != redirect.GetLeftPart(UriPartial.Path))
        {
            throw new InvalidDataException("Virheellinen OAuth-paluuosoite.");
        }

        var fields = new Dictionary<string, string>();
        foreach (var part in callback.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var pair = part.Split('=', 2);
            if (pair.Length != 2 || !fields.TryAdd(Uri.UnescapeDataString(pair[0]), Uri.UnescapeDataString(pair[1].Replace('+', ' '))))
            {
                throw new InvalidDataException("Virheellinen OAuth-paluuviesti.");
            }
        }

        if (!fields.TryGetValue("state", out var actual) || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(state), Encoding.UTF8.GetBytes(actual)))
        {
            throw new InvalidDataException("Google-kirjautumisen tila ei vastaa pyyntöä.");
        }

        if (fields.ContainsKey("error"))
        {
            throw new DriveException("denied", "Google-kirjautuminen peruttiin tai estettiin.");
        }

        if (!fields.TryGetValue("code", out var code) || string.IsNullOrEmpty(code) || code.Length > 4096)
        {
            throw new InvalidDataException("Google ei palauttanut kelvollista kirjautumiskoodia.");
        }
        return code;
    }
}
