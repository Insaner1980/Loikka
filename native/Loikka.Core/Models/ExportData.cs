using System.Text.Json;
using System.Text.Json.Serialization;

namespace Loikka.Core.Models;

public sealed record ExportData
{
    public string Version { get; set; } = "";
    public string ExportedAt { get; set; } = "";
    public List<Athlete> Athletes { get; set; } = [];
    public List<Result> Results { get; set; } = [];
    public List<Competition> Competitions { get; set; } = [];
    public List<Goal> Goals { get; set; } = [];
    public List<Medal> Medals { get; set; } = [];

    [JsonExtensionData]
    public Dictionary<string, JsonElement>? AdditionalData { get; set; }
}
