using Loikka.Infrastructure.Database;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Automation;
using System.Text.Json;

namespace Loikka_App.Services;

public sealed partial class AppSession : IDisposable
{
    private readonly MainWindow window;
    private readonly SemaphoreSlim operations = new(1, 1);
    private readonly SemaphoreSlim modals = new(1, 1);
    private readonly CancellationTokenSource lifetime = new();
    private readonly CancellationToken lifetimeToken;
    public LocalDatabase Database { get; }

    public AppSession(MainWindow window, string root)
    {
        this.window = window;
        lifetimeToken = lifetime.Token;
        Database = new(root);
    }

    public MainWindow Window => window;

    private GoalCelebrations? celebrations;
    public GoalCelebrations Celebrations => celebrations ??= new(this);

    public async Task ReloadPreferences()
    {
        celebrations = new(this);
        await celebrations.Initialize();
    }

    public Task<Dictionary<string, JsonElement>> ReadPreferences() => Run(_ => ReadPreferencesFile());
    private async Task<Dictionary<string, JsonElement>> ReadPreferencesFile()
    {
        var path = Path.Combine(Database.RootPath, "native-preferences.json");
        return File.Exists(path) ? JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(await File.ReadAllTextAsync(path, lifetimeToken)) ?? [] : [];
    }

    public Task SetPreference<T>(string key, T value) => Run(async _ =>
    {
        var preferences = await ReadPreferencesFile();
        preferences[key] = JsonSerializer.SerializeToElement(value);
        var path = Path.Combine(Database.RootPath, "native-preferences.json");
        var temporary = path + ".tmp";
        await File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(preferences), lifetimeToken);
        File.Move(temporary, path, true);
    });
    public bool DialogOpen { get; private set; }

    public async Task<T> Run<T>(Func<LocalDatabase, Task<T>> action)
    {
        await operations.WaitAsync(lifetimeToken);
        try
        {
            return await Task.Run(() => action(Database), lifetimeToken);
        }
        finally
        {
            operations.Release();
        }
    }

    public async Task Run(Func<LocalDatabase, Task> action) => await Run(async db =>
    {
        await action(db);
        return true;
    });
    public async Task<bool> Edit(string title, FrameworkElement content, Func<Task> save, string? deleteLabel = null, Action? delete = null)
    {
        await modals.WaitAsync(lifetimeToken);
        var failure = new InfoBar
        {
            Severity = InfoBarSeverity.Error,
            IsClosable = false
        };
        var panel = new StackPanel
        {
            Spacing = 12
        };
        panel.Children.Add(failure);
        panel.Children.Add(content);
        var dialog = new ContentDialog
        {
            XamlRoot = window.Content.XamlRoot,
            Title = title,
            Content = new ScrollViewer
            {
                Content = panel,
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto
            },
            PrimaryButtonText = "Tallenna",
            CloseButtonText = "Peruuta",
            SecondaryButtonText = deleteLabel ?? "",
            DefaultButton = ContentDialogButton.Primary
        };
        bool saved = false;
        dialog.Opened += (_, _) =>
        {
            var button = FindButton(dialog, "PrimaryButton");
            if (button is not null)
            {
                AutomationProperties.SetAutomationId(button, "DialogSave");
            }

            if (FindButton(dialog, "CloseButton") is { } cancel)
            {
                AutomationProperties.SetAutomationId(cancel, "DialogCancel");
            }

            if (FindButton(dialog, "SecondaryButton") is { } secondary)
            {
                AutomationProperties.SetAutomationId(secondary, "DialogDelete");
            }
        };
        dialog.PrimaryButtonClick += async (_, args) =>
        {
            var deferral = args.GetDeferral();
            try
            {
                dialog.IsPrimaryButtonEnabled = false;
                await save();
                saved = true;
            }
            catch (Exception error)
            {
                args.Cancel = true;
                failure.Message = error.Message;
                failure.IsOpen = true;
            }
            finally
            {
                dialog.IsPrimaryButtonEnabled = true;
                deferral.Complete();
            }
        };
        DialogOpen = true;
        ContentDialogResult result;
        try
        {
            result = await dialog.ShowAsync();
        }
        finally
        {
            DialogOpen = false;
            modals.Release();
        }

        if (result == ContentDialogResult.Secondary)
        {
            delete?.Invoke();
        }

        return saved;
    }

    public async Task<bool> Confirm(string title, string message)
    {
        await modals.WaitAsync(lifetimeToken);
        DialogOpen = true;
        try
        {
            var dialog = new ContentDialog
            {
                XamlRoot = window.Content.XamlRoot,
                Title = title,
                Content = new TextBlock
                {
                    Text = message,
                    TextWrapping = TextWrapping.Wrap
                },
                PrimaryButtonText = "Vahvista",
                CloseButtonText = "Peruuta",
                DefaultButton = ContentDialogButton.Close
            };
            dialog.Opened += (_, _) =>
            {
                if (FindButton(dialog, "PrimaryButton") is { } accept)
                {
                    AutomationProperties.SetAutomationId(accept, "ConfirmAccept");
                }

                if (FindButton(dialog, "CloseButton") is { } cancel)
                {
                    AutomationProperties.SetAutomationId(cancel, "ConfirmCancel");
                }
            };
            return await dialog.ShowAsync() == ContentDialogResult.Primary;
        }
        finally
        {
            DialogOpen = false;
            modals.Release();
        }
    }

    public async Task Notify(string title, string message)
    {
        await modals.WaitAsync(lifetimeToken);
        DialogOpen = true;
        try
        {
            await new ContentDialog
            {
                XamlRoot = window.Content.XamlRoot,
                Title = title,
                Content = new TextBlock
                {
                    Text = message,
                    TextWrapping = TextWrapping.Wrap
                },
                CloseButtonText = "Sulje"
            }.ShowAsync();
        }
        finally
        {
            DialogOpen = false;
            modals.Release();
        }
    }

    public async Task ShowContent(string title, FrameworkElement content)
    {
        await modals.WaitAsync(lifetimeToken);
        DialogOpen = true;
        try
        {
            await new ContentDialog
            {
                XamlRoot = window.Content.XamlRoot,
                Title = title,
                Content = content,
                CloseButtonText = "Sulje"
            }.ShowAsync();
        }
        finally
        {
            DialogOpen = false;
            modals.Release();
        }
    }

    private static Button? FindButton(DependencyObject parent, string name)
    {
        for (int i = 0; i < Microsoft.UI.Xaml.Media.VisualTreeHelper.GetChildrenCount(parent); i++)
        {
            var child = Microsoft.UI.Xaml.Media.VisualTreeHelper.GetChild(parent, i);
            if (child is Button button && button.Name == name)
            {
                return button;
            }

            if (FindButton(child, name) is { } match)
            {
                return match;
            }
        }

        return null;
    }

    public void Dispose()
    {
        lifetime.Cancel();
        lifetime.Dispose();
    }
}
