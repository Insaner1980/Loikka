using Microsoft.UI;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Shapes;
using Loikka_App.Pages;

namespace Loikka_App.Controls;

public sealed record ChartPoint(string Label, double Value, string Description, string Flags = "");
public sealed partial class NativeChart : UserControl
{
    private readonly Canvas canvas = new()
    {
        Height = 260,
        MinWidth = 200
    };
    private readonly IReadOnlyList<ChartPoint> points;
    private readonly bool lowerIsBetter;
    private readonly bool bars;
    private readonly double? reference;
    public NativeChart(IReadOnlyList<ChartPoint> values, bool lower, bool bar = false, double? personalBest = null)
    {
        points = values;
        lowerIsBetter = lower;
        bars = bar;
        reference = personalBest;
        var panel = new StackPanel
        {
            Spacing = 8
        };
        panel.Children.Add(canvas);
        var details = new ListView
        {
            ItemsSource = values.Select(p => p.Description).ToList(),
            MaxHeight = 180,
            SelectionMode = ListViewSelectionMode.Single
        };
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(details, "Kaavion arvot aikajärjestyksessä");
        panel.Children.Add(Ui.Text("Kaavion arvot", 18));
        panel.Children.Add(details);
        Content = panel;
        canvas.SizeChanged += (_, args) =>
        {
            if (Math.Abs(args.NewSize.Width - args.PreviousSize.Width) > 0.001)
            {
                Draw();
            }
        };
        Loaded += (_, _) => Draw();
    }

    private void Draw()
    {
        canvas.Children.Clear();
        if (points.Count == 0)
        {
            canvas.Children.Add(Ui.Text("Ei tuloksia valitulla ajanjaksolla."));
            return;
        }

        var min = points.Min(p => p.Value);
        var max = points.Max(p => p.Value);
        if (reference.HasValue)
        {
            min = Math.Min(min, reference.Value);
            max = Math.Max(max, reference.Value);
        }

        var spread = max - min;
        if (spread == 0)
        {
            spread = Math.Max(1, Math.Abs(max) * .05);
        }

        min -= spread * .1;
        max += spread * .1;
        var ticks = new List<(double Value, TextBlock Text)>();
        for (int tick = 0; tick < 3; tick++)
        {
            double value = min + (max - min) * tick / 2;
            var text = Ui.Text(value.ToString("0.##", Ui.Finnish), 12);
            canvas.Children.Add(text);
            text.Measure(new Windows.Foundation.Size(double.PositiveInfinity, double.PositiveInfinity));
            ticks.Add((value, text));
        }

        double left = ticks.Max(t => t.Text.DesiredSize.Width) + 12;
        double top = ticks.Max(t => t.Text.DesiredSize.Height) / 2 + 8;
        double width = Math.Max(1, canvas.ActualWidth - left - 20), height = 190;
        double Y(double value) => top + (lowerIsBetter ? (value - min) : (max - value)) / (max - min) * height;
        var brush = (Brush)Application.Current.Resources["AccentFillColorDefaultBrush"];
        var foreground = (Brush)Application.Current.Resources["TextFillColorPrimaryBrush"];
        foreach (var tick in ticks)
        {
            Canvas.SetTop(tick.Text, Y(tick.Value) - tick.Text.DesiredSize.Height / 2);
            var line = new Line
            {
                X1 = left,
                X2 = left + width,
                Y1 = Y(tick.Value),
                Y2 = Y(tick.Value),
                Stroke = foreground,
                Opacity = .2
            };
            canvas.Children.Add(line);
        }

        if (reference.HasValue)
        {
            canvas.Children.Add(new Line { X1 = left, X2 = left + width, Y1 = Y(reference.Value), Y2 = Y(reference.Value), Stroke = foreground, StrokeDashArray = new DoubleCollection { 4, 4 } });
        }

        double labelHeight = DrawPoints(left, top, width, height, Y, brush);
        canvas.Height = Math.Max(260, top + height + 12 + labelHeight + 12);
    }

    private FrameworkElement Marker(double width, double top, double height, double y, Brush brush, double opacity)
    {
        if (bars) return new Rectangle
        {
            Width = Math.Max(4, width / points.Count * .6),
            Height = Math.Max(2, top + height - y),
            Fill = brush,
            Opacity = opacity
        };
        return new Ellipse
        {
            Width = 9,
            Height = 9,
            Fill = brush
        };
    }

    private double DrawPoints(double left, double top, double width, double height, Func<double, double> Y, Brush brush)
    {
        double? previousX = null, previousY = null;
        double lastLabelRight = double.NegativeInfinity, labelHeight = 0;
        for (int i = 0; i < points.Count; i++)
        {
            double x = left + width * (i + .5) / points.Count, y = Y(points[i].Value);
            if (!bars && previousX.HasValue)
            {
                canvas.Children.Add(new Line { X1 = previousX.Value, Y1 = previousY!.Value, X2 = x, Y2 = y, Stroke = brush, StrokeThickness = 2 });
            }

            var marker = Marker(width, top, height, y, brush, i == points.Count - 1 ? 1 : .55);
            Canvas.SetLeft(marker, x - (bars ? marker.Width / 2 : 4));
            Canvas.SetTop(marker, bars ? y : y - 4);
            ToolTipService.SetToolTip(marker, points[i].Description);
            canvas.Children.Add(marker);
            DrawFlags(points[i].Flags, x, y);
            var label = Ui.Text(points[i].Label, 12);
            canvas.Children.Add(label);
            label.Measure(new Windows.Foundation.Size(double.PositiveInfinity, double.PositiveInfinity));
            double labelLeft = Math.Max(0, Math.Min(x - label.DesiredSize.Width / 2, canvas.ActualWidth - label.DesiredSize.Width));
            if (labelLeft >= lastLabelRight + 12 && label.DesiredSize.Width <= canvas.ActualWidth)
            {
                Microsoft.UI.Xaml.Automation.AutomationProperties.SetAutomationId(label, "ChartXLabel" + i);
                Canvas.SetLeft(label, labelLeft);
                Canvas.SetTop(label, top + height + 12);
                lastLabelRight = labelLeft + label.DesiredSize.Width;
                labelHeight = Math.Max(labelHeight, label.DesiredSize.Height);
            }
            else
            {
                canvas.Children.Remove(label);
            }

            previousX = x;
            previousY = y;
        }
        return labelHeight;
    }

    private void DrawFlags(string text, double x, double y)
    {
        if (text.Length > 0)
        {
            var flags = Ui.Text(text, 12);
            canvas.Children.Add(flags);
            flags.Measure(new Windows.Foundation.Size(double.PositiveInfinity, double.PositiveInfinity));
            Canvas.SetLeft(flags, Math.Max(0, Math.Min(x + 6, canvas.ActualWidth - flags.DesiredSize.Width)));
            Canvas.SetTop(flags, Math.Max(0, y - flags.DesiredSize.Height));
        }
    }
}
