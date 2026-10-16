using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Xaml.Automation.Peers;
using Loikka_App.Services;
using System.Globalization;

namespace Loikka_App.Pages;

public abstract partial class NativePage : Page
{
    protected readonly AppSession Session;
    protected readonly StackPanel Body = new()
    {
        Spacing = 16
    };
    protected readonly InfoBar Message = new()
    {
        IsClosable = true
    };
    protected readonly CommandBar Commands = new()
    {
        DefaultLabelPosition = CommandBarDefaultLabelPosition.Right
    };
    private int generation;
    protected bool Active { get; private set; }

    protected NativePage(AppSession session, string key, string title)
    {
        Session = session;
        AutomationProperties.SetAutomationId(this, "Page" + key);
        var grid = new Grid
        {
            Padding = new Thickness(24, 12, 24, 24),
            RowSpacing = 12
        };
        grid.RowDefinitions.Add(new() { Height = GridLength.Auto });
        grid.RowDefinitions.Add(new() { Height = GridLength.Auto });
        grid.RowDefinitions.Add(new() { Height = new GridLength(1, GridUnitType.Star) });
        var heading = Ui.Text(title, 28);
        AutomationProperties.SetHeadingLevel(heading, AutomationHeadingLevel.Level1);
        AutomationProperties.SetAutomationId(heading, "Page" + key);
        var header = new StackPanel
        {
            Spacing = 8
        };
        header.Children.Add(heading);
        header.Children.Add(Commands);
        grid.Children.Add(header);
        Grid.SetRow(Message, 1);
        grid.Children.Add(Message);
        var scroll = new ScrollViewer
        {
            Content = Body,
            VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
            HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled
        };
        Grid.SetRow(scroll, 2);
        grid.Children.Add(scroll);
        Content = grid;
        Loaded += async (_, _) =>
        {
            Active = true;
            await Refresh();
        };
        Unloaded += (_, _) =>
        {
            Active = false;
            generation++;
        };
    }

    public virtual void Add()
    {
    }

    protected abstract Task Load();
    public async Task Refresh()
    {
        int request = ++generation;
        try
        {
            Message.IsOpen = false;
            await Load();
        }
        catch (Exception error)
        {
            if (Active && request == generation)
            {
                Error(error);
            }
        }
    }

    protected void Error(Exception error)
    {
        Message.Severity = InfoBarSeverity.Error;
        Message.Message = error.Message;
        Message.IsOpen = true;
    }

    protected async Task Act(Func<Task> action)
    {
        try
        {
            await action();
        }
        catch (Exception error)
        {
            if (Active)
            {
                Error(error);
            }
        }
    }

    protected AppBarButton Command(string text, Symbol symbol, Action action, string? id = null)
    {
        var button = new AppBarButton
        {
            Label = text,
            Icon = new SymbolIcon(symbol)
        };
        button.Click += (_, _) => action();
        if (id is not null)
        {
            AutomationProperties.SetAutomationId(button, id);
        }

        Commands.PrimaryCommands.Add(button);
        return button;
    }

    protected void Empty(string text) => Body.Children.Add(Ui.Text(text));
}

internal sealed record Choice(string Key, string Label)
{
    public override string ToString() => Label;
}

internal sealed record DisplayRow(long Id, string Title, string Subtitle, object Data, string? Image = null)
{
    public override string ToString() => Title + "\n" + Subtitle;
}

internal static class Ui
{
    public static readonly CultureInfo Finnish = CultureInfo.GetCultureInfo("fi-FI");
    public static TextBlock Text(string value, double size = 16) => new()
    {
        Text = value,
        FontSize = size,
        TextWrapping = TextWrapping.Wrap
    };
    public static string? Optional(string value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    public static string Date(string? value) => DateOnly.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var day) ? day.ToString("d.M.yyyy", Finnish) : value ?? "";
    public static string Iso(CalendarDatePicker picker, bool required = true)
    {
        if (!picker.Date.HasValue)
        {
            if (required)
            {
                throw new InvalidDataException("Valitse päivämäärä.");
            }

            return "";
        }

        return picker.Date.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }

    public static CalendarDatePicker DateInput(StackPanel form, string label, string? value, string id)
    {
        var calendarStyle = new Style(typeof(CalendarView));
        calendarStyle.Setters.Add(new Setter(FrameworkElement.LanguageProperty, "fi-FI"));
        calendarStyle.Setters.Add(new Setter(CalendarView.FirstDayOfWeekProperty, Windows.Globalization.DayOfWeek.Monday));
        var input = new CalendarDatePicker
        {
            Header = label,
            PlaceholderText = "Valitse päivämäärä",
            HorizontalAlignment = HorizontalAlignment.Stretch,
            DateFormat = "day month year",
            Language = "fi-FI",
            FirstDayOfWeek = Windows.Globalization.DayOfWeek.Monday,
            CalendarViewStyle = calendarStyle
        };
        if (DateOnly.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var date))
        {
            input.Date = new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue));
        }

        AutomationProperties.SetAutomationId(input, id);
        form.Children.Add(input);
        return input;
    }

    public static TextBox Field(StackPanel form, string label, string? value, string id, bool multiline = false)
    {
        var input = new TextBox
        {
            Header = label,
            Text = value ?? "",
            AcceptsReturn = multiline,
            TextWrapping = multiline ? TextWrapping.Wrap : TextWrapping.NoWrap,
            MinHeight = multiline ? 96 : 0
        };
        AutomationProperties.SetAutomationId(input, id);
        form.Children.Add(input);
        return input;
    }

    public static AutoSuggestBox Suggest(StackPanel form, string label, string? value, IEnumerable<string> values, string id)
    {
        var options = values.Distinct().Order().ToList();
        var input = new AutoSuggestBox
        {
            Header = label,
            Text = value ?? ""
        };
        input.TextChanged += (_, args) =>
        {
            if (args.Reason == AutoSuggestionBoxTextChangeReason.UserInput)
            {
                input.ItemsSource = options.Where(s => s.Contains(input.Text, StringComparison.CurrentCultureIgnoreCase)).ToList();
            }
        };
        input.SuggestionChosen += (_, args) => input.Text = (string)args.SelectedItem;
        AutomationProperties.SetAutomationId(input, id);
        form.Children.Add(input);
        return input;
    }

    public static ComboBox Select(StackPanel form, string label, IEnumerable<Choice> choices, string? value, string id)
    {
        var options = choices.ToList();
        var input = new ComboBox
        {
            Header = label,
            ItemsSource = options,
            HorizontalAlignment = HorizontalAlignment.Stretch
        };
        input.SelectedItem = options.FirstOrDefault(x => x.Key == value) ?? options.FirstOrDefault();
        AutomationProperties.SetAutomationId(input, id);
        form.Children.Add(input);
        return input;
    }

    public static string Key(ComboBox input) => (input.SelectedItem as Choice)?.Key ?? "";
    public static long Id(ComboBox input) => long.TryParse(Key(input), out long id) ? id : 0;
    public static CheckBox Check(StackPanel panel, string label, bool value = false)
    {
        var input = new CheckBox
        {
            Content = label,
            IsChecked = value
        };
        panel.Children.Add(input);
        return input;
    }

    public static Button Button(string label, Action action, string? id = null)
    {
        var button = new Button
        {
            Content = label
        };
        button.Click += (_, _) => action();
        if (id is not null)
        {
            AutomationProperties.SetAutomationId(button, id);
        }

        return button;
    }

    public static StackPanel Form() => new()
    {
        Spacing = 12,
        MinWidth = 280,
        MaxWidth = 600
    };
    public static ListView List(IEnumerable<DisplayRow> rows, string prefix, Action<DisplayRow>? open = null, bool photos = false, bool portraits = false)
    {
        string template = "RowTemplate";
        if (portraits) template = "AthleteTemplate";
        else if (photos) template = "PhotoTemplate";
        var list = new ListView
        {
            ItemsSource = rows.ToList(),
            ItemTemplate = (DataTemplate)Application.Current.Resources[template],
            SelectionMode = ListViewSelectionMode.Extended,
            IsItemClickEnabled = open is not null,
            MaxHeight = 600
        };
        list.ContainerContentChanging += (_, args) =>
        {
            if (args.Item is DisplayRow row)
            {
                AutomationProperties.SetAutomationId(args.ItemContainer, prefix + row.Id);
                AutomationProperties.SetName(args.ItemContainer, row.Title + "\n" + row.Subtitle);
            }
        };
        list.ItemClick += (_, args) =>
        {
            var ctrl = Microsoft.UI.Input.InputKeyboardSource.GetKeyStateForCurrentThread(Windows.System.VirtualKey.Control).HasFlag(Windows.UI.Core.CoreVirtualKeyStates.Down);
            var shift = Microsoft.UI.Input.InputKeyboardSource.GetKeyStateForCurrentThread(Windows.System.VirtualKey.Shift).HasFlag(Windows.UI.Core.CoreVirtualKeyStates.Down);
            if (!ctrl && !shift && args.ClickedItem is DisplayRow row)
            {
                open?.Invoke(row);
            }
        };
        list.KeyDown += (_, args) =>
        {
            if (args.Key == Windows.System.VirtualKey.Escape)
            {
                list.SelectedItems.Clear();
                args.Handled = true;
            }
        };
        list.Tapped += (_, args) =>
        {
            var current = args.OriginalSource as DependencyObject;
            while (current is not null && current is not ListViewItem && !ReferenceEquals(current, list))
            {
                current = Microsoft.UI.Xaml.Media.VisualTreeHelper.GetParent(current);
            }

            if (current is not ListViewItem)
            {
                list.SelectedItems.Clear();
            }
        };
        return list;
    }

    public static readonly Choice[] Levels = [new("", "Ei valintaa"), new("seurakisat", "Seurakisat"), new("koululaiskisat", "Koululaiskisat"), new("seuran_sisaiset", "Seuran sisäiset kisat"), new("seuraottelut", "Seuraottelut"), new("piirikisat", "Piirikisat"), new("pm", "Piirinmestaruuskilpailut (PM)"), new("hallikisat", "Hallikisat"), new("aluekisat", "Aluekisat"), new("pohjola_seuracup", "Pohjola Seuracup"), new("sm", "SM-kilpailut"), new("muu", "Muu")];
    public static string Level(string? code, string? custom = null) => code == "muu" ? custom ?? "Muu" : Levels.FirstOrDefault(l => l.Key == code)?.Label ?? code ?? "";
}
