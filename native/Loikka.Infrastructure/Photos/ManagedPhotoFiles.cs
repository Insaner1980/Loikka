namespace Loikka.Infrastructure.Photos;

public static class ManagedPhotoFiles
{
    private static readonly string[] sourceArray = new[]
    {
        "photos",
        "profile_photos"
    };
    public static void DeleteUnreferenced(string root, IEnumerable<string?> candidates, IEnumerable<string?> references)
    {
        root = Path.TrimEndingDirectorySeparator(Path.GetFullPath(root));
        string Resolve(string path) => Path.GetFullPath(Path.IsPathFullyQualified(path) ? path : Path.Combine(root, path));
        var retained = references.Where(p => !string.IsNullOrWhiteSpace(p)).Select(p => Resolve(p!)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var candidate in candidates.Where(p => !string.IsNullOrWhiteSpace(p)).Select(p => Resolve(p!)).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            bool managed = sourceArray.Any(category => candidate.StartsWith(Path.Combine(root, category) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase));
            if (!managed || retained.Contains(candidate) || !File.Exists(candidate))
            {
                continue;
            }

            bool linked = IsLinked(root, candidate);
            if (!linked)
            {
                File.Delete(candidate);
            }
        }
    }

    private static bool IsLinked(string root, string candidate)
    {
        bool linked = false;
        for (string? current = candidate; current is not null && (current.Equals(root, StringComparison.OrdinalIgnoreCase) || current.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)); current = Path.GetDirectoryName(current))
        {
            if ((File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0)
            {
                linked = true;
                break;
            }

            if (current.Equals(root, StringComparison.OrdinalIgnoreCase))
            {
                break;
            }
        }
        return linked;
    }
}
