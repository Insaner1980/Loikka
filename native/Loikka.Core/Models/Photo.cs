using System.Text.Json;
using System.Text.Json.Serialization;

namespace Loikka.Core.Models;

public sealed record Photo
{
    public long Id { get; set; }
    public string EntityType { get; set; } = "";
    public long EntityId { get; set; }
    public string FilePath { get; set; } = "";
    public string? ThumbnailPath { get; set; }
    public string OriginalName { get; set; } = "";
    public int? Width { get; set; }
    public int? Height { get; set; }
    public long SizeBytes { get; set; }
    public string? EventName { get; set; }
    public string CreatedAt { get; set; } = "";

    [JsonExtensionData]
    public Dictionary<string, JsonElement>? AdditionalData { get; set; }
}
