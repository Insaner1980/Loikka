using System.Text.Json;
using System.Text.Json.Serialization;

namespace Loikka.Core.Models;

public sealed record Discipline
{
    public long Id { get; set; }
    public string Name { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Category { get; set; } = "";
    public string Unit { get; set; } = "";
    public bool LowerIsBetter { get; set; }
    public string? IconName { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement>? AdditionalData { get; set; }
}
