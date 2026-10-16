using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Loikka_App.Pages;
using Loikka_App.Services;
using Windows.System;

namespace Loikka_App;

public sealed partial class MainWindow : Window
{
    private readonly string? dataRoot;
    private AppSession? session;
    private FileStream? instanceLock;
    private double windowScale;
    public MainWindow(string? root)
    {
        dataRoot = root;
        InitializeComponent();
        ExtendsContentIntoTitleBar = true;
        SetTitleBar(AppTitleBar);
        AppWindow.SetIcon(Path.Combine(AppContext.BaseDirectory, "Assets", "AppIcon.ico"));
        WindowRoot.KeyDown += WindowKeyDown;
        Closed += (_, _) =>
        {
            session?.Dispose();
            instanceLock?.Dispose();
        };
    }

    private async void WindowLoaded(object sender, RoutedEventArgs e)
    {
        if (session is not null)
        {
            return;
        }

        ApplyWindowSize(true);
        WindowRoot.XamlRoot.Changed += (_, _) =>
        {
            if (Math.Abs(windowScale - WindowRoot.XamlRoot.RasterizationScale) > 0.001)
            {
                ApplyWindowSize(false);
            }
        };
        try
        {
            if (string.IsNullOrWhiteSpace(dataRoot) || !Path.IsPathFullyQualified(dataRoot))
            {
                throw new InvalidOperationException("Kehitysversio tarvitsee erillisen testihakemiston: --data-root C:\\polku\\testidata. Käyttäjän aiempia tietoja ei avata automaattisesti.");
            }

            var legacy = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "com.loikka.app");
            var resolved = Path.TrimEndingDirectorySeparator(Path.GetFullPath(dataRoot));
            if (resolved.Equals(legacy, StringComparison.OrdinalIgnoreCase) || resolved.StartsWith(legacy + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Vanhan Loikan tietohakemistoa saa käyttää vain siirron lähteenä.");
            }

            Directory.CreateDirectory(Path.GetDirectoryName(resolved)!);
            instanceLock = new FileStream(resolved + ".instance.lock", FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
            await Loikka.Infrastructure.Migration.SnapshotRestoreService.RecoverAsync(dataRoot, () => Task.CompletedTask, () => Task.CompletedTask);
            Directory.CreateDirectory(dataRoot);
            session = new AppSession(this, dataRoot);
            await session.Run(db => db.InitializeAsync());
            await session.Celebrations.Initialize();
            StartupPanel.Visibility = Visibility.Collapsed;
            Navigation.IsEnabled = true;
            Navigate("Dashboard");
        }
        catch (Exception error)
        {
            StartupProgress.IsActive = false;
            StartupMessage.Text = "Loikkaa ei voitu avata. Tarkista tietohakemiston käyttöoikeudet ja ettei sama aineisto ole jo avoinna.\n" + error.Message;
        }
    }

    private void ApplyWindowSize(bool initial)
    {
        windowScale = WindowRoot.XamlRoot.RasterizationScale;
        int Pixels(double value) => (int)Math.Ceiling(value * windowScale);
        var display = Microsoft.UI.Windowing.DisplayArea.GetFromWindowId(AppWindow.Id, Microsoft.UI.Windowing.DisplayAreaFallback.Nearest);
        if (display is null)
        {
            return;
        }

        var work = display.WorkArea;
        int frameWidth = AppWindow.Size.Width - AppWindow.ClientSize.Width;
        int frameHeight = AppWindow.Size.Height - AppWindow.ClientSize.Height;
        if (AppWindow.Presenter is Microsoft.UI.Windowing.OverlappedPresenter presenter)
        {
            presenter.PreferredMinimumWidth = Math.Min(Pixels(800) + frameWidth, work.Width);
            presenter.PreferredMinimumHeight = Math.Min(Pixels(600) + frameHeight, work.Height);
        }

        if (initial)
        {
            int width = Math.Min(Pixels(1200) + frameWidth, work.Width);
            int height = Math.Min(Pixels(800) + frameHeight, work.Height);
            int x = Math.Clamp(AppWindow.Position.X, work.X, work.X + work.Width - width);
            int y = Math.Clamp(AppWindow.Position.Y, work.Y, work.Y + work.Height - height);
            AppWindow.MoveAndResize(new Windows.Graphics.RectInt32(x, y, width, height));
        }
    }

    public void Navigate(string destination, long? athleteId = null, long? disciplineId = null)
    {
        if (session is null)
        {
            return;
        }

        if (athleteId.HasValue)
        {
            RootFrame.Content = new AthleteDetailPage(session, athleteId.Value, disciplineId);
            return;
        }

        var item = Navigation.MenuItems.OfType<NavigationViewItem>().First(i => (string)i.Tag == destination);
        if (!ReferenceEquals(Navigation.SelectedItem, item))
        {
            Navigation.SelectedItem = item;
            return;
        }

        RootFrame.Content = destination switch
        {
            "Athletes" => new AthletesPage(session),
            "Results" => new ResultsPage(session),
            "Calendar" => new CalendarPage(session),
            "Statistics" => new StatisticsPage(session),
            "Goals" => new GoalsPage(session),
            "Photos" => new PhotosPage(session),
            "Settings" => new SettingsPage(session),
            _ => new DashboardPage(session)
        };
    }

    private void NavigationChanged(NavigationView sender, NavigationViewSelectionChangedEventArgs args)
    {
        if (args.SelectedItem is NavigationViewItem item)
        {
            Navigate((string)item.Tag);
        }
    }

    private void NavigationInvoked(NavigationView sender, NavigationViewItemInvokedEventArgs args)
    {
        if (RootFrame.Content is AthleteDetailPage && args.InvokedItemContainer is NavigationViewItem item)
        {
            Navigate((string)item.Tag);
        }
    }

    public void ShowViewer(IReadOnlyList<Loikka.Core.Models.Photo> photos, int index, Action closed)
    {
        if (session is null || photos.Count == 0)
        {
            return;
        }

        var previous = FocusManager.GetFocusedElement(WindowRoot.XamlRoot) as UIElement;
        bool navigationEnabled = Navigation.IsEnabled, titleBarEnabled = AppTitleBar.IsEnabled;
        Navigation.IsEnabled = false;
        AppTitleBar.IsEnabled = false;
        Loikka_App.Controls.PhotoViewer? viewer = null;
        viewer = new(session, photos, index, () =>
        {
            WindowRoot.Children.Remove(viewer!);
            Navigation.IsEnabled = navigationEnabled;
            AppTitleBar.IsEnabled = titleBarEnabled;
            previous?.Focus(FocusState.Programmatic);
            closed();
        });
        Grid.SetRowSpan(viewer, 2);
        WindowRoot.Children.Add(viewer);
        viewer.Focus(FocusState.Programmatic);
    }

    // Connections are operation-scoped; the stable sibling lock remains held throughout a root swap.
    public static Task ReleaseDataHandles() => Task.CompletedTask;
    public static Task ReopenDataHandles() => Task.CompletedTask;
    private void WindowKeyDown(object sender, KeyRoutedEventArgs args)
    {
        if (session?.DialogOpen != false || WindowRoot.Children.OfType<Loikka_App.Controls.PhotoViewer>().Any())
        {
            return;
        }

        var focus = FocusManager.GetFocusedElement(WindowRoot.XamlRoot) as DependencyObject;
        for (var current = focus; current is not null; current = Microsoft.UI.Xaml.Media.VisualTreeHelper.GetParent(current))
        {
            if (current is TextBox or AutoSuggestBox or NumberBox or ComboBox or CalendarDatePicker or CalendarView or CalendarViewDayItem)
            {
                return;
            }
        }

        var control = Microsoft.UI.Input.InputKeyboardSource.GetKeyStateForCurrentThread(VirtualKey.Control).HasFlag(Windows.UI.Core.CoreVirtualKeyStates.Down);
        if (control && args.Key == VirtualKey.U && RootFrame.Content is NativePage page)
        {
            page.Add();
            args.Handled = true;
        }

        if (args.Key >= VirtualKey.Number1 && args.Key <= VirtualKey.Number8 && !control)
        {
            var index = (int)args.Key - (int)VirtualKey.Number1;
            Navigate((string)((NavigationViewItem)Navigation.MenuItems[index]).Tag);
            args.Handled = true;
        }
    }
}
