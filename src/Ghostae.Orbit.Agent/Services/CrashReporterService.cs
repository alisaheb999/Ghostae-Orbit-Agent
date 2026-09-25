using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Threading.Tasks;
using Ghostae.Orbit.Agent.Models;

namespace Ghostae.Orbit.Agent.Services
{
    public class CrashReport
    {
        public string MachineName { get; set; } = Environment.MachineName;
        public string OsVersion { get; set; } = RuntimeInformation.OSDescription;
        public string Architecture { get; set; } = RuntimeInformation.OSArchitecture.ToString();
        public string AgentVersion { get; set; } = "1.0.0";
        public DateTime Timestamp { get; set; } = DateTime.Now;
        public string ExceptionType { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string StackTrace { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
    }

    public class CrashReporterService
    {
        private static readonly Lazy<CrashReporterService> _instance = new(() => new CrashReporterService());
        public static CrashReporterService Instance => _instance.Value;

        private readonly string _crashDumpDir;

        public CrashReporterService()
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            _crashDumpDir = Path.Combine(appData, "GhostaeOrbit", "crashes");
            Directory.CreateDirectory(_crashDumpDir);
        }

        public void HandleException(Exception ex, string source)
        {
            try
            {
                var report = new CrashReport
                {
                    ExceptionType = ex.GetType().FullName ?? ex.GetType().Name,
                    Message = ex.Message,
                    StackTrace = ex.StackTrace ?? "",
                    Source = source
                };

                LoggingService.Instance.Error(LogCategory.Errors, $"CRASH CAPTURED [{source}]: {ex.Message}", ex.StackTrace);

                var fileName = $"crash_{DateTime.Now:yyyyMMdd_HHmmss}_{Guid.NewGuid().ToString("N")[..6]}.json";
                var filePath = Path.Combine(_crashDumpDir, fileName);

                var json = JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(filePath, json);

                _ = DispatchCrashReportToServerAsync(report);
            }
            catch
            {
                // Guarantee error handler never crashes application
            }
        }

        private async Task DispatchCrashReportToServerAsync(CrashReport report)
        {
            try
            {
                if (OrbitWebSocketClient.Instance.State == ConnectionState.Connected)
                {
                    var msg = new
                    {
                        type = "crash_report",
                        payload = report
                    };
                    var json = JsonSerializer.Serialize(msg);
                    await OrbitWebSocketClient.Instance.SendRawMessageAsync(json);
                }
            }
            catch
            {
                // Silent fallback
            }
        }
    }
}
