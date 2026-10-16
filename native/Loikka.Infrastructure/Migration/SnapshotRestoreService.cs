using Loikka.Infrastructure.Database;
using Microsoft.Data.Sqlite;
using System.Text.Json;

namespace Loikka.Infrastructure.Migration;

public sealed class SnapshotRestoreService
{
    private sealed record RestoreJournal(string ActiveRoot, string StagedRoot, string RetainedRoot, string State);
    public static async Task<string> RestoreSnapshotAsync(string stagedRoot, string activeRoot, Func<Task> releaseHandles, Func<Task> reopenHandles, CancellationToken cancellationToken = default)
    {
        ValidateRoots(stagedRoot, activeRoot);
        stagedRoot = Path.GetFullPath(stagedRoot);
        activeRoot = Path.GetFullPath(activeRoot);
        if (!Directory.Exists(activeRoot))
        {
            throw new DirectoryNotFoundException("The active data root is missing.");
        }

        var journalPath = activeRoot + ".restore-journal.json";
        if (File.Exists(journalPath))
        {
            throw new InvalidOperationException("A prior restore journal must be recovered before starting another restore.");
        }

        await ValidateStagedAsync(stagedRoot);
        cancellationToken.ThrowIfCancellationRequested();
        var retained = activeRoot + ".rollback-" + Guid.NewGuid().ToString("N");
        var journal = new RestoreJournal(activeRoot, stagedRoot, retained, "prepared");
        await WriteJournalAsync(journalPath, journal);
        await releaseHandles();
        try
        {
            Directory.Move(activeRoot, retained);
            await WriteJournalAsync(journalPath, journal with { State = "previous-retained" });
            try
            {
                Directory.Move(stagedRoot, activeRoot);
            }
            catch
            {
                Directory.Move(retained, activeRoot);
                File.Delete(journalPath);
                throw;
            }

            await WriteJournalAsync(journalPath, journal with { State = "activated" });
        }
        catch
        {
            if (!Directory.Exists(activeRoot) && Directory.Exists(retained))
            {
                Directory.Move(retained, activeRoot);
                File.Delete(journalPath);
            }

            throw;
        }
        finally
        {
            await reopenHandles();
        }

        File.Delete(journalPath);
        return retained;
    }

    public static async Task<string?> RecoverAsync(string activeRoot, Func<Task> releaseHandles, Func<Task> reopenHandles)
    {
        if (!Path.IsPathFullyQualified(activeRoot))
        {
            throw new ArgumentException("An absolute active data root is required.");
        }

        activeRoot = Path.GetFullPath(activeRoot);
        var journalPath = activeRoot + ".restore-journal.json";
        if (!File.Exists(journalPath))
        {
            return null;
        }

        var journal = JsonSerializer.Deserialize<RestoreJournal>(await File.ReadAllTextAsync(journalPath)) ?? throw new InvalidDataException("Invalid restore journal.");
        ValidateRoots(journal.StagedRoot, activeRoot);
        if (journal.ActiveRoot != activeRoot || !journal.RetainedRoot.StartsWith(activeRoot + ".rollback-", StringComparison.OrdinalIgnoreCase) || Path.GetDirectoryName(journal.RetainedRoot) != Path.GetDirectoryName(activeRoot))
        {
            throw new InvalidDataException("Restore journal paths do not match this data root.");
        }

        await releaseHandles();
        try
        {
            if (!Directory.Exists(activeRoot))
            {
                if (!Directory.Exists(journal.RetainedRoot))
                {
                    throw new InvalidDataException("Restore recovery cannot locate the previously active data root.");
                }

                Directory.Move(journal.RetainedRoot, activeRoot);
                File.Delete(journalPath);
                return null;
            }

            await ValidateStagedAsync(activeRoot);
            File.Delete(journalPath);
            return Directory.Exists(journal.RetainedRoot) ? journal.RetainedRoot : null;
        }
        finally
        {
            await reopenHandles();
        }
    }

    private static void ValidateRoots(string stage, string active)
    {
        if (!Path.IsPathFullyQualified(stage) || !Path.IsPathFullyQualified(active))
        {
            throw new ArgumentException("Explicit absolute staging and active roots are required.");
        }

        stage = Path.TrimEndingDirectorySeparator(Path.GetFullPath(stage));
        active = Path.TrimEndingDirectorySeparator(Path.GetFullPath(active));
        if (stage.Equals(active, StringComparison.OrdinalIgnoreCase) || stage.StartsWith(active + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) || active.StartsWith(stage + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) || !string.Equals(Path.GetPathRoot(stage), Path.GetPathRoot(active), StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Restore requires separate, non-nested data roots on the same volume.");
        }

        if (File.Exists(Path.Combine(stage, ".native.lock")))
        {
            throw new InvalidOperationException("Staging must not contain the active session lock.");
        }
    }

    private static async Task ValidateStagedAsync(string root)
    {
        var file = Path.Combine(root, "loikka.db");
        if (!File.Exists(file))
        {
            throw new InvalidDataException("Staging does not contain a database.");
        }

        await using var c = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = file, Mode = SqliteOpenMode.ReadOnly, Pooling = false, ForeignKeys = true }.ToString());
        await c.OpenAsync();
        await LocalDatabase.VerifySchemaAsync(c);
        await using var cmd = c.CreateCommand();
        cmd.CommandText = "PRAGMA foreign_key_check";
        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            throw new InvalidDataException($"Staged database has a foreign-key failure in {reader.GetString(0)} row {reader.GetValue(1)}.");
        }
    }

    private static async Task WriteJournalAsync(string path, RestoreJournal journal)
    {
        var temporary = path + ".tmp";
        await File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(journal));
        File.Move(temporary, path, true);
    }
}
