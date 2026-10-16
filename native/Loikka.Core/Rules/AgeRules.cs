namespace Loikka.Core.Rules;

public static class AgeRules
{
    public static string DisplayCategory(int birthYear, int year)
    {
        var age = year - birthYear;
        return age switch
        {
            < 7 => $"{age}v",
            <= 8 => "T7",
            <= 10 => "T9",
            <= 12 => "T11",
            <= 14 => "T13",
            <= 16 => "T15",
            <= 18 => "T17",
            _ => "N"
        };
    }

    public static string DisciplineCategory(int birthYear, int year)
    {
        var age = year - birthYear;
        return age switch
        {
            <= 3 => "T3",
            <= 15 => $"T{age}",
            <= 17 => "N17",
            <= 19 => "N19",
            <= 22 => "N22",
            _ => "N"
        };
    }

    public static string? SkillCategory(int birthYear, int year) => (year - birthYear) switch
    {
        8 => "T8",
        9 or 10 => "T9",
        11 or 12 => "T11",
        13 or 14 => "T13",
        15 or 16 => "T15",
        _ => null
    };
}
