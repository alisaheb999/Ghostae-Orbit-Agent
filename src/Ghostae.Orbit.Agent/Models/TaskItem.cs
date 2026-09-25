using System;

namespace Ghostae.Orbit.Agent.Models
{
    public enum TaskExecutionState
    {
        Pending,
        Running,
        Success,
        Failed,
        Cancelled
    }

    public class TaskItem
    {
        public string TaskId { get; set; } = Guid.NewGuid().ToString("N");
        public string ToolName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Application { get; set; } = "Windows";
        public TaskExecutionState State { get; set; } = TaskExecutionState.Pending;
        public int Progress { get; set; } = 0;
        public string StatusMessage { get; set; } = "Queued";
        public DateTime StartTime { get; set; } = DateTime.Now;
        public DateTime? EndTime { get; set; }
        public string? ResultJson { get; set; }
        public string? ErrorMessage { get; set; }

        public string StateText => State switch
        {
            TaskExecutionState.Pending => "Pending",
            TaskExecutionState.Running => "Running",
            TaskExecutionState.Success => "Completed",
            TaskExecutionState.Failed => "Failed",
            TaskExecutionState.Cancelled => "Cancelled",
            _ => "Unknown"
        };

        public string TimeDisplay => StartTime.ToString("HH:mm:ss");
    }
}
