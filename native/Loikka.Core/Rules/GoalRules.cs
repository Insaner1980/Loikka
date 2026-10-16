using Loikka.Core.Models;
using Loikka.Core.Data;

namespace Loikka.Core.Rules;

public static class GoalRules
{
    public static double Progress(Goal goal, double? currentBest)
    {
        var discipline = DisciplineCatalog.Find(goal.DisciplineId);
        if (currentBest is null || discipline is null)
        {
            return 0;
        }

        if (goal.TargetValue == 0)
        {
            return currentBest == 0 ? 100 : 0;
        }

        if (!discipline.LowerIsBetter)
        {
            return currentBest >= goal.TargetValue ? 100 : Math.Clamp(currentBest.Value / goal.TargetValue * 100, 0, 100);
        }

        if (currentBest <= goal.TargetValue)
        {
            return 100;
        }

        var estimatedStart = goal.TargetValue * 1.2;
        var range = estimatedStart - goal.TargetValue;
        return range == 0 ? 0 : Math.Clamp((estimatedStart - currentBest.Value) / range * 100, 0, 100);
    }

    public static double? Remaining(Goal goal, double? currentBest)
    {
        var discipline = DisciplineCatalog.Find(goal.DisciplineId);
        if (currentBest is null || discipline is null) return null;
        return Math.Max(0, discipline.LowerIsBetter ? currentBest.Value - goal.TargetValue : goal.TargetValue - currentBest.Value);
    }

    public static bool IsAchieved(Goal goal, IEnumerable<Result> results)
    {
        var discipline = DisciplineCatalog.Find(goal.DisciplineId);
        if (goal.Status != "active" || discipline is null)
        {
            return false;
        }

        return results.Any(x => x.AthleteId == goal.AthleteId && x.DisciplineId == goal.DisciplineId && RecordRules.IsValid(x) && double.IsFinite(x.Value) && (discipline.LowerIsBetter ? x.Value <= goal.TargetValue : x.Value >= goal.TargetValue));
    }
}
