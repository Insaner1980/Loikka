using Loikka.Core.Data;
using Loikka.Core.Formatting;
using Loikka.Core.Models;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Windows.System;

namespace Loikka_App.Controls;

public sealed partial class ResultInput : UserControl
{
    private const string MinutesKey = "minutes";
    private const string HundredthsKey = "hundredths";
    private const string CentimetersKey = "centimeters";
    private readonly StackPanel panel = new() { Spacing = 8 };
    private readonly Dictionary<string, TextBox> fields = [];
    private Discipline discipline;

    public ResultInput(Discipline discipline, double? value = null)
    {
        this.discipline = discipline;
        Content = panel;
        Configure(discipline, value);
    }

    public void Configure(Discipline selected, double? value = null)
    {
        discipline = selected;
        panel.Children.Clear();
        fields.Clear();
        int? integer = value.HasValue ? SegmentedInput.FromStoredValue(value.Value, selected) : null;
        if (selected.Unit == "time") ConfigureTime(selected.Id, integer);
        else if (selected.Id == 54 || selected.Category == "combined" || DisciplineCatalog.UsesCentimeters(selected.Id))
        {
            var label = selected switch { { Category: "combined" } => "Pisteet", { Id: 54 } => "Metrit", _ => "Senttimetrit" };
            Add("whole", label, integer?.ToString() ?? "");
        }
        else
        {
            Add("meters", "Metrit", (integer / 100)?.ToString() ?? "");
            Add(CentimetersKey, "Senttimetrit", (integer % 100)?.ToString("00") ?? "");
        }
    }

    private void ConfigureTime(long disciplineId, int? integer)
    {
        bool minutes = DisciplineCatalog.NeedsMinutes(disciplineId);
        if (minutes) Add(MinutesKey, "Minuutit", integer is > 0 ? (integer.Value / 6000).ToString() : "");
        int? seconds = minutes ? integer / 100 % 60 : integer / 100;
        Add("seconds", "Sekunnit", seconds?.ToString() ?? "");
        Add(HundredthsKey, "Sadasosat", (integer % 100)?.ToString("00") ?? "");
    }

    private void Add(string key, string label, string value)
    {
        var box = new TextBox
        {
            Header = label,
            Text = value,
            InputScope = new InputScope { Names = { new InputScopeName(InputScopeNameValue.Number) } }
        };
        AutomationProperties.SetAutomationId(box, "ResultValue_" + key);
        fields[key] = box;
        panel.Children.Add(box);
        box.LostFocus += (_, _) =>
        {
            if (key is HundredthsKey or CentimetersKey && box.Text.Length == 1) box.Text += "0";
        };
        box.KeyDown += (_, args) => Navigate(key, box, args);
        box.TextChanged += (_, _) => NormalizeText(key, box);
    }

    private void Navigate(string key, TextBox box, KeyRoutedEventArgs args)
    {
        bool previous = args.Key == VirtualKey.Back && box.Text.Length == 0 || args.Key == VirtualKey.Left && box.SelectionStart == 0;
        bool next = args.Key == VirtualKey.Right && box.SelectionStart == box.Text.Length;
        if (!previous && !next) return;
        var order = fields.Keys.ToList();
        var index = order.IndexOf(key) + (next ? 1 : -1);
        if (index < 0 || index >= order.Count) return;
        fields[order[index]].Focus(FocusState.Keyboard);
        args.Handled = true;
    }

    private void NormalizeText(string key, TextBox box)
    {
        var digits = new string(box.Text.Where(char.IsDigit).ToArray());
        if (key == "seconds") digits = SegmentedInput.SecondsText(digits, fields.ContainsKey(MinutesKey));
        else if (key is MinutesKey or HundredthsKey or CentimetersKey) digits = digits[..Math.Min(2, digits.Length)];
        if (digits == box.Text) return;
        box.Text = digits;
        box.SelectionStart = digits.Length;
    }

    private string Part(string key) => fields.TryGetValue(key, out var box) ? box.Text : "";

    public double? Value
    {
        get
        {
            int? integer;
            if (discipline.Unit == "time") integer = SegmentedInput.CombineTime(Part(MinutesKey), Part("seconds"), Part(HundredthsKey), true);
            else if (fields.ContainsKey("whole")) integer = int.TryParse(Part("whole"), out var n) ? n : null;
            else integer = SegmentedInput.CombineDistance(Part("meters"), Part(CentimetersKey));
            return integer.HasValue ? SegmentedInput.ToStoredValue(integer.Value, discipline) : null;
        }
    }
}
