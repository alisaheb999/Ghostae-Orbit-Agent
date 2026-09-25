using System;
using System.Text.Json.Serialization;

namespace Ghostae.Orbit.Agent.Models
{
    public class CommandResponse
    {
        [JsonPropertyName("version")]
        public string Version { get; set; } = "1";

        [JsonPropertyName("task_id")]
        public string TaskId { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty; // "success", "failed", "rejected", "running", "cancelled"

        [JsonPropertyName("event")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Event { get; set; } // "acknowledged", "progress", "completed"

        [JsonPropertyName("progress")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? Progress { get; set; }

        [JsonPropertyName("message")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Message { get; set; }

        [JsonPropertyName("result")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public object? Result { get; set; }

        [JsonPropertyName("error")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Error { get; set; }

        [JsonPropertyName("timestamp")]
        public string Timestamp { get; set; } = DateTime.UtcNow.ToString("o");

        public static CommandResponse Acknowledged(string taskId, string message = "Task accepted and queued") =>
            new CommandResponse
            {
                TaskId = taskId,
                Status = "pending",
                Event = "acknowledged",
                Message = message
            };

        public static CommandResponse ProgressUpdate(string taskId, int progress, string message, string status = "running") =>
            new CommandResponse
            {
                TaskId = taskId,
                Status = status,
                Event = "progress",
                Progress = progress,
                Message = message
            };

        public static CommandResponse Success(string taskId, object result, string message = "Task completed successfully") =>
            new CommandResponse
            {
                TaskId = taskId,
                Status = "success",
                Event = "completed",
                Progress = 100,
                Result = result,
                Message = message
            };

        public static CommandResponse Failed(string taskId, string error) =>
            new CommandResponse
            {
                TaskId = taskId,
                Status = "failed",
                Event = "completed",
                Error = error
            };

        public static CommandResponse Rejected(string taskId, string reason) =>
            new CommandResponse
            {
                TaskId = taskId,
                Status = "rejected",
                Event = "completed",
                Error = reason
            };
    }
}
