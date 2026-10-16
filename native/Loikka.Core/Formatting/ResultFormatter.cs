using Loikka.Core.Models;
using System.Globalization;
namespace Loikka.Core.Formatting;

public static class ResultFormatter
{
    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;
    public static string Time(double seconds)
    {
        if (!double.IsFinite(seconds) || seconds < 0) return "0.00";
        if (seconds < 60) return seconds.ToString("F2", Invariant);
        var remainder = (seconds % 60).ToString("F2", Invariant).PadLeft(5, '0');
        if (seconds < 3600) return $"{Math.Floor(seconds / 60)}:{remainder}";
        return $"{Math.Floor(seconds / 3600)}:{Math.Floor(seconds % 3600 / 60):00}:{remainder}";
    }

    public static string Distance(double meters, bool wholeMeters = false, bool centimeters = false)
    {
        if (!double.IsFinite(meters) || meters < 0) meters = 0;
        if (centimeters) return $"{Math.Floor(meters * 100 + .5).ToString(Invariant)} cm";
        if (wholeMeters) return $"{Math.Floor(meters + .5).ToString(Invariant)} m";
        return $"{meters.ToString("F2", Invariant)} m";
    }

    public static string Value(double value, Discipline discipline)
    {
        if (discipline.Category == "combined") return $"{Math.Floor(value + .5).ToString(Invariant)} p";
        return discipline.Unit == "time" ? Time(value) : Distance(value, discipline.Id == 54);
    }

    public static string Result(Result result, Discipline discipline) =>
        result.Status is not null and not "" and not "valid" ? Status(result.Status) : Value(result.Value, discipline);

    public static string Status(string? status) => status switch
    {
        null or "" => "",
        "valid" => "Hyväksytty",
        "nm" => "NM - Ei tulosta",
        "dns" => "DNS - Ei startannut",
        "dnf" => "DNF - Keskeytti",
        "dq" => "DQ - Hylätty",
        _ => status.ToUpperInvariant()
    };

    public static string Date(string value) =>
        DateOnly.TryParseExact(value, "yyyy-MM-dd", Invariant, DateTimeStyles.None, out var date)
            ? date.ToString("d.M.yyyy", Invariant) : "";
}
