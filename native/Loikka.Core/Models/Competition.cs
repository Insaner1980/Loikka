using System.Text.Json;
using System.Text.Json.Serialization;

namespace Loikka.Core.Models;

public sealed record Competition
{
    public long Id { get; set; }
    public string Name { get; set; } = "";
    public string Date { get; set; } = "";
    public string? EndDate { get; set; }
    public string? Location { get; set; }
    public string? Address { get; set; }
    public string? Level { get; set; }
    public string? CustomLevelName { get; set; }
    public string? Notes { get; set; }
    public bool ReminderEnabled { get; set; }
    public int? ReminderDaysBefore { get; set; }
    public string CreatedAt { get; set; } = "";

    [JsonExtensionData]
    public Dictionary<string, JsonElement>? AdditionalData { get; set; }
}
