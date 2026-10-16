using Microsoft.UI.Xaml;
namespace Loikka_App;

public partial class App : Application
{
    private Window? window;
    public App()
    {
        Microsoft.Windows.Globalization.ApplicationLanguages.PrimaryLanguageOverride = "fi-FI";
        InitializeComponent();
    }
    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        var arguments = Environment.GetCommandLineArgs();
        var index = Array.IndexOf(arguments, "--data-root");
        string? root = index >= 0 && arguments.Length > index + 1 ? arguments[index + 1] : null;
#if !DEBUG
        root ??= Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Loikka.Native.Beta");
#endif
        window = new MainWindow(root);
        window.Activate();
    }
}
