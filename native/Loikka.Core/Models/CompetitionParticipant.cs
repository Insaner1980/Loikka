using System.Text.Json;
using System.Text.Json.Serialization;

namespace Loikka.Core.Models;

public sealed record CompetitionParticipant
{
    public long Id { get; set; }
    public long CompetitionId { get; set; }
    public long AthleteId { get; set; }
    public List<long>? DisciplinesPlanned { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement>? AdditionalData { get; set; }
}
