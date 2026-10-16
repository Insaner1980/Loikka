using System.Text.Json;
using Loikka.Core.Models;
using Loikka.Core.Formatting;
using Microsoft.UI.Xaml.Controls;

namespace Loikka_App.Services;

public sealed class GoalCelebrations
{
    private readonly AppSession session;
    private readonly HashSet<long> celebrated = [];
    public GoalCelebrations(AppSession session) => this.session = session;
    public async Task Initialize()
    {
        celebrated.Clear();
        var preferences = await session.ReadPreferences();
        if (preferences.TryGetValue("loikka-celebrated-goals", out var value))
        {
            foreach (var id in value.EnumerateArray()) celebrated.Add(id.GetInt64());
        }
        else
        {
            foreach (var goal in await session.Run(db => db.GetGoalsAsync())) if (goal.Status == "achieved") celebrated.Add(goal.Id);
            await Save();
        }
    }
    private Task Save() => session.SetPreference("loikka-celebrated-goals", celebrated.Order().ToArray());
    public async Task ShowNew()
    {
        var goals = await session.Run(db => db.GetGoalsAsync());
        var achieved = goals.Where(g => g.Status == "achieved" && !celebrated.Contains(g.Id)).ToList();
        if (achieved.Count == 0) return;
        var athletes = await session.Run(db => db.GetAthletesAsync()); var disciplines = await session.Run(db => db.GetDisciplinesAsync());
        var text = string.Join("\n\n", achieved.Select(g =>
        {
            var athlete = athletes.FirstOrDefault(a => a.Id == g.AthleteId); var discipline = disciplines.FirstOrDefault(d => d.Id == g.DisciplineId);
            return $"{athlete?.FirstName} {athlete?.LastName}: {discipline?.Name} {(discipline is null ? g.TargetValue.ToString() : ResultFormatter.Value(g.TargetValue, discipline))}";
        }));
        foreach (var goal in achieved) celebrated.Add(goal.Id);
        await Save();
        await session.Notify("Tavoite saavutettu!", text);
    }
}
