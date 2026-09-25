using System;
using System.Collections.Generic;

namespace Ghostae.Orbit.Agent.Models
{
    public enum ConnectionState
    {
        Disconnected,
        Connecting,
        Connected,
        Error
    }

    public class AdobeAppInfo
    {
        public string Name { get; set; } = string.Empty; // "After Effects", "Premiere Pro"
        public string ProcessName { get; set; } = string.Empty;
        public bool IsRunning { get; set; }
        public int ProcessId { get; set; }
        public string Version { get; set; } = "Unknown";
        public string ActiveProject { get; set; } = "No active project";
        public string RenderStatus { get; set; } = "Idle";
        public bool BridgeConnected { get; set; }
        public DateTime? LastChecked { get; set; }
    }

    public class AdobeEnvironmentStatus
    {
        public AdobeAppInfo AfterEffects { get; set; } = new AdobeAppInfo
        {
            Name = "After Effects",
            ProcessName = "AfterFX"
        };

        public AdobeAppInfo PremierePro { get; set; } = new AdobeAppInfo
        {
            Name = "Premiere Pro",
            ProcessName = "Adobe Premiere Pro"
        };
    }

    public class DriveMetric
    {
        public string Name { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public long TotalBytes { get; set; }
        public long FreeBytes { get; set; }
        public double FreePercentage => TotalBytes > 0 ? (double)FreeBytes / TotalBytes * 100.0 : 0;
        public string TotalFormatted => $"{TotalBytes / (1024.0 * 1024 * 1024):F1} GB";
        public string FreeFormatted => $"{FreeBytes / (1024.0 * 1024 * 1024):F1} GB free";
    }

    public class SystemMetrics
    {
        public double CpuUsagePercent { get; set; }
        public long TotalRamBytes { get; set; }
        public long AvailableRamBytes { get; set; }
        public double RamUsagePercent => TotalRamBytes > 0 ? ((double)(TotalRamBytes - AvailableRamBytes) / TotalRamBytes) * 100.0 : 0;
        public string RamFormatted => $"{((TotalRamBytes - AvailableRamBytes) / (1024.0 * 1024 * 1024)):F1} / {(TotalRamBytes / (1024.0 * 1024 * 1024)):F1} GB";
        public string WindowsVersion { get; set; } = "Windows";
        public string MachineName { get; set; } = Environment.MachineName;
        public TimeSpan Uptime { get; set; }
        public List<DriveMetric> Drives { get; set; } = new List<DriveMetric>();
    }

    public enum LogCategory
    {
        Connection,
        Tasks,
        Adobe,
        Files,
        Recording,
        System,
        Errors
    }

    public class LogEntry
    {
        public DateTime Timestamp { get; set; } = DateTime.Now;
        public LogCategory Category { get; set; } = LogCategory.System;
        public string Level { get; set; } = "INFO"; // INFO, WARN, ERROR, SUCCESS
        public string Message { get; set; } = string.Empty;
        public string? Details { get; set; }

        public string TimeFormatted => Timestamp.ToString("HH:mm:ss");
    }
}
