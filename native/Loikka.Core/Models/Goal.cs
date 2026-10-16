using System.Text.Json;
using System.Text.Json.Serialization;

namespace Loikka.Core.Models;

public sealed record Goal
{
    public long Id { get; set; }
    public long AthleteId { get; set; }
    public long DisciplineId { get; set; }
    public double TargetValue { get; set; }
    public string? TargetDate { get; set; }
    public string Status { get; set; } = "";
    public string? AchievedAt { get; set; }
    public string CreatedAt { get; set; } = "";

    [JsonExtensionData]
    public Dictionary<string, JsonElement>? AdditionalData { get; set; }
}
