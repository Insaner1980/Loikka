using System.Text.Json;
using System.Text.Json.Serialization;

namespace Loikka.Core.Models;

public sealed record Result
{
    public long Id { get; set; }
    public long AthleteId { get; set; }
    public long DisciplineId { get; set; }
    public string Date { get; set; } = "";
    public double Value { get; set; }
    public string Type { get; set; } = "";
    public string? CompetitionName { get; set; }
    public string? CompetitionLevel { get; set; }
    public string? CustomLevelName { get; set; }
    public string? Location { get; set; }
    public int? Placement { get; set; }
    public string? Notes { get; set; }
    public bool IsPersonalBest { get; set; }
    public bool IsSeasonBest { get; set; }
    public bool IsNationalRecord { get; set; }
    public double? Wind { get; set; }
    public string? Status { get; set; }
    public double? EquipmentWeight { get; set; }
    public int? HurdleHeight { get; set; }
    public double? HurdleSpacing { get; set; }
    public string? SubResults { get; set; }
    public long? CombinedEventId { get; set; }
    public string CreatedAt { get; set; } = "";

    [JsonExtensionData]
    public Dictionary<string, JsonElement>? AdditionalData { get; set; }
}
