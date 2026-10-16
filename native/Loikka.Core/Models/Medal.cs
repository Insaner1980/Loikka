using System.Text.Json;
using System.Text.Json.Serialization;

namespace Loikka.Core.Models;

public sealed record Medal
{
    public long Id { get; set; }
    public long AthleteId { get; set; }
    public long? ResultId { get; set; }
    public string Type { get; set; } = "";
    public string CompetitionName { get; set; } = "";
    public long? CompetitionId { get; set; }
    public string? Location { get; set; }
    public long? DisciplineId { get; set; }
    public string? DisciplineName { get; set; }
    public string Date { get; set; } = "";
    public string CreatedAt { get; set; } = "";

    [JsonExtensionData]
    public Dictionary<string, JsonElement>? AdditionalData { get; set; }
}
