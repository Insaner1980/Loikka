using Loikka.Core.Models;
using System.Globalization;

namespace Loikka.Core.Formatting;

public static class SegmentedInput
{
    private const string SecondsKey = "seconds";
    private static bool IsUnscaled(Discipline discipline) => discipline.Id == 54 || discipline.Category == "combined";
    public static double ToStoredValue(int input, Discipline discipline) => IsUnscaled(discipline) ? input : input / 100.0;
    public static int FromStoredValue(double value, Discipline discipline) => checked((int)Math.Floor(value * (IsUnscaled(discipline) ? 1 : 100) + .5));
    public static double? ParseDecimal(string value) => double.TryParse(value.Replace(',', '.'), NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint | NumberStyles.AllowLeadingWhite | NumberStyles.AllowTrailingWhite, CultureInfo.InvariantCulture, out var number) && double.IsFinite(number) ? number : null;
    private static int? Part(string value)
    {
        if (value.Length == 0) return 0;
        return int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var number) ? number : null;
    }
    public static int? CombineTime(string minutes, string seconds, string hundredths, bool finalize = false)
    {
        if (minutes.Length + seconds.Length + hundredths.Length == 0)
        {
            return null;
        }

        var min = Part(minutes);
        var sec = Part(seconds);
        var fraction = Part(finalize ? hundredths.PadRight(2, '0')[..2] : hundredths);
        if (min is null || sec is null || fraction is null)
        {
            return null;
        }

        var value = ((long)min * 60 + sec) * 100 + fraction;
        return value <= int.MaxValue ? (int?)value : null;
    }

    public static int? CombineDistance(string meters, string centimeters)
    {
        if (meters.Length + centimeters.Length == 0)
        {
            return null;
        }

        var m = Part(meters);
        var cm = Part(centimeters.PadRight(2, '0')[..2]);
        if (m is null || cm is null)
        {
            return null;
        }

        var value = (long)m * 100 + cm;
        return value <= int.MaxValue ? (int?)value : null;
    }

    public static string SecondsText(string text, bool showMinutes)
    {
        var digits = new string(text.Where(c => c is >= '0' and <= '9').ToArray());
        if (showMinutes && (!long.TryParse(digits, out var value) && digits.Length > 0 || value > 59))
        {
            return "59";
        }

        return digits[..Math.Min(digits.Length, showMinutes ? 2 : 3)];
    }

    public static string? NavigateTime(string field, string key, string text, int caret, bool showMinutes)
    {
        if ((key == "Backspace" && text.Length == 0) || (key == "ArrowLeft" && caret == 0))
        {
            return field switch
            {
                "hundredths" => SecondsKey,
                SecondsKey when showMinutes => "minutes",
                _ => null
            };
        }

        if (key == "ArrowRight" && caret == text.Length)
        {
            return field switch
            {
                "minutes" when showMinutes => SecondsKey,
                SecondsKey => "hundredths",
                _ => null
            };
        }

        return null;
    }
}
