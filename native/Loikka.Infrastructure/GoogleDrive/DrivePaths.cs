namespace Loikka.Infrastructure.GoogleDrive;

internal static class DrivePaths
{
    internal static void ValidateSegment(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value is "." or ".." || value.IndexOfAny(['/', '\\', ':', '<', '>', '"', '|', '?', '*']) >= 0 ||
            value.Any(char.IsControl) || value.EndsWith('.') || value.EndsWith(' ') ||
            new[] { "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9" }.Contains(value.Split('.')[0], StringComparer.OrdinalIgnoreCase))
            throw new InvalidDataException("Google Driven tiedostonimi ei ole turvallinen Windows-polku.");
    }
    internal static string Resolve(string root, string relative)
    {
        var parts = relative.Replace('\\', '/').Split('/');
        foreach (var part in parts) ValidateSegment(part);
        if (parts.Length < 2 || parts[0] is not ("photos" or "profile_photos")) throw new InvalidDataException("Tiedosto ei kuulu Loikan kuvakansioon.");
        var full = Path.GetFullPath(Path.Combine(root, Path.Combine(parts)));
        if (!full.StartsWith(Path.TrimEndingDirectorySeparator(Path.GetFullPath(root)) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Kuvapolku poistuu tietokansiosta.");
        return full;
    }
}
