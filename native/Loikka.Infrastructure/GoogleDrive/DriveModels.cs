using System.Text.Json;
namespace Loikka.Infrastructure.GoogleDrive;

public sealed record StoredTokens(string AccessToken, string RefreshToken, DateTimeOffset ExpiresAt, string? UserEmail)
{
    public override string ToString() => "StoredTokens (protected)";
}
public sealed record AuthStatus(bool IsAuthenticated, string? UserEmail, DateTimeOffset? ExpiresAt);
public sealed record OAuthClientConfiguration(string ClientId, string? ClientSecret)
{
    public static OAuthClientConfiguration LoadFromDeploymentDirectory(string appBase)
    {
        if (!Path.IsPathFullyQualified(appBase)) throw new ArgumentException("An absolute deployment directory is required.");
        var path = Path.Combine(appBase, "oauth-client.json");
        if (!File.Exists(path)) throw new FileNotFoundException("Google-kirjautumisen oauth-client.json puuttuu sovelluskansiosta.", path);
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        var installed = document.RootElement.GetProperty("installed");
        var id = installed.GetProperty("client_id").GetString();
        if (string.IsNullOrWhiteSpace(id)) throw new InvalidDataException("OAuth-asiakastunnus puuttuu.");
        return new(id, installed.TryGetProperty("client_secret", out var secret) ? secret.GetString() : null);
    }
}
public interface ITokenStore
{
    Task<StoredTokens?> ReadAsync(CancellationToken token = default);
    Task WriteAsync(StoredTokens value, CancellationToken token = default);
    Task DeleteAsync(CancellationToken token = default);
}
public sealed record DriveBackup(string Id, string Name, string? CreatedAt, long? SizeBytes);
public sealed record CloudPhoto(string Id, string Name, string Folder, string RelativePath, long? SizeBytes, string? CreatedAt, string? Sha256 = null);
public sealed record LocalPhoto(string Path, string Name, string Folder, string RelativePath, long SizeBytes);
public sealed record DriveSelection(bool IncludeDatabase, bool IncludeProfilePhotos, bool IncludeGalleryPhotos, IReadOnlyList<string>? SelectedPhotoIds = null);
public sealed record DriveTransferReport(int ItemsTransferred, string? BackupId, IReadOnlyList<string> Warnings, string? RetainedRoot = null);
public class DriveException : IOException
{
    public DriveException(string kind, string message) : base(message) => Kind = kind;
    public string Kind { get; }
}
public sealed class DriveTransferException : DriveException
{
    public DriveTransferException(string failedItem, int completedItems, string kind, string reason)
        : base(kind, $"Pilvisiirto keskeytyi kohteeseen {failedItem}. Valmiita kohteita: {completedItems}. {reason}")
    {
        FailedItem = failedItem;
        CompletedItems = completedItems;
    }
    public string FailedItem { get; }
    public int CompletedItems { get; }
}
internal sealed record DriveManifestEntry(string Id, string RelativePath, string Sha256, long SizeBytes);
internal sealed record DriveManifest(string Format, int Version, string? DatabaseId, string? DatabaseSha256, List<DriveManifestEntry> Media);
