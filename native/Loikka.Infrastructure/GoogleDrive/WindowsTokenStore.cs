using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
namespace Loikka.Infrastructure.GoogleDrive;

public sealed class WindowsTokenStore : ITokenStore
{
    private readonly string path;
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("Loikka.Native.GoogleTokens.v1");
    public WindowsTokenStore(string path) => this.path = path;
    private void ValidatePath()
    {
        if (!Path.IsPathFullyQualified(path)) throw new ArgumentException("An absolute token path is required.");
    }
    public async Task<StoredTokens?> ReadAsync(CancellationToken token = default)
    {
        if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException("Windows-käyttäjäkohtainen suojaus vaatii Windowsin.");
        ValidatePath();
        if (!File.Exists(path)) return null;
        var encrypted = await File.ReadAllBytesAsync(path, token);
        var plain = ProtectedData.Unprotect(encrypted, Entropy, DataProtectionScope.CurrentUser);
        try { return JsonSerializer.Deserialize<StoredTokens>(plain) ?? throw new InvalidDataException("Suojattu kirjautumistieto on virheellinen."); }
        finally { CryptographicOperations.ZeroMemory(plain); }
    }
    public async Task WriteAsync(StoredTokens value, CancellationToken token = default)
    {
        if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException("Windows-käyttäjäkohtainen suojaus vaatii Windowsin.");
        ValidatePath();
        var plain = JsonSerializer.SerializeToUtf8Bytes(value);
        byte[] encrypted;
        try { encrypted = ProtectedData.Protect(plain, Entropy, DataProtectionScope.CurrentUser); }
        finally { CryptographicOperations.ZeroMemory(plain); }
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temporary = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try { await File.WriteAllBytesAsync(temporary, encrypted, token); token.ThrowIfCancellationRequested(); File.Move(temporary, path, true); }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
    public Task DeleteAsync(CancellationToken token = default)
    {
        ValidatePath(); token.ThrowIfCancellationRequested();
        if (File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
    }
}
