using System.Text.Json;
using System.Text.Json.Serialization;

namespace Ghostae.Orbit.Agent.Models
{
    public class CommandRequest
    {
        [JsonPropertyName("version")]
        public string Version { get; set; } = "1";

        [JsonPropertyName("task_id")]
        public string TaskId { get; set; } = string.Empty;

        [JsonPropertyName("tool")]
        public string Tool { get; set; } = string.Empty;

        [JsonPropertyName("input")]
        public JsonElement Input { get; set; }

        public T? GetInput<T>()
        {
            if (Input.ValueKind == JsonValueKind.Undefined || Input.ValueKind == JsonValueKind.Null)
            {
                return default;
            }
            return JsonSerializer.Deserialize<T>(Input.GetRawText(), JsonOptions.Default);
        }
    }

    public static class JsonOptions
    {
        public static readonly JsonSerializerOptions Default = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = false
        };

        public static readonly JsonSerializerOptions Pretty = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = true
        };
    }
}
