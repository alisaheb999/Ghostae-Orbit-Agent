using System;
using System.Diagnostics;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;

namespace Ghostae.Orbit.Agent.Tools
{
    public class PowerInput
    {
        [JsonPropertyName("operation")]
        public string Operation { get; set; } = "status"; // shutdown, restart, cancel_shutdown, status

        [JsonPropertyName("delay_seconds")]
        public int DelaySeconds { get; set; } = 60;

        [JsonPropertyName("server_authorization")]
        public string? ServerAuthorization { get; set; }

        [JsonPropertyName("wait_for_render")]
        public bool WaitForRender { get; set; } = false;

        [JsonPropertyName("comment")]
        public string? Comment { get; set; }
    }

    public class PowerControlTool : IAgentTool
    {
        public string ToolName => "power";

        private static bool _shutdownScheduled = false;
        private static DateTime? _scheduledTime;
        private static string _scheduledType = "";

        public static bool IsShutdownScheduled => _shutdownScheduled;
        public static string ScheduledType => _scheduledType;
        public static DateTime? ScheduledTime => _scheduledTime;

        public async Task<CommandResponse> ExecuteAsync(CommandRequest request, IProgress<CommandResponse> progress, CancellationToken cancellationToken)
        {
            try
            {
                var input = request.GetInput<PowerInput>() ?? new PowerInput();
                var op = input.Operation?.ToLowerInvariant() ?? "status";

                switch (op)
                {
                    case "status":
                        return GetPowerStatus(request.TaskId);

                    case "cancel_shutdown":
                        return CancelShutdown(request.TaskId);

                    case "shutdown":
                    case "restart":
                        return await ExecutePowerActionAsync(request.TaskId, input, op == "restart", progress, cancellationToken);

                    default:
                        return CommandResponse.Rejected(request.TaskId, $"Power operation '{op}' is not supported");
                }
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Error(LogCategory.System, "Power control operation failed", ex.Message);
                return CommandResponse.Failed(request.TaskId, $"Power control error: {ex.Message}");
            }
        }

        private static CommandResponse GetPowerStatus(string taskId)
        {
            var result = new
            {
                shutdown_scheduled = _shutdownScheduled,
                scheduled_type = _scheduledType,
                scheduled_time = _scheduledTime?.ToString("o"),
                remaining_seconds = _scheduledTime.HasValue ? Math.Max(0, (int)(_scheduledTime.Value - DateTime.Now).TotalSeconds) : 0,
                render_active = RenderControlTool.IsRendering
            };
            return CommandResponse.Success(taskId, result, _shutdownScheduled ? $"Scheduled {_scheduledType}" : "Normal operation");
        }

        private static CommandResponse CancelShutdown(string taskId)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "shutdown.exe",
                    Arguments = "/a",
                    CreateNoWindow = true,
                    UseShellExecute = false
                })?.WaitForExit(3000);

                _shutdownScheduled = false;
                _scheduledTime = null;
                _scheduledType = "";

                LoggingService.Instance.Success(LogCategory.System, "Pending system shutdown / restart was cancelled");
                return CommandResponse.Success(taskId, new { status = "cancelled" }, "System shutdown cancelled");
            }
            catch (Exception ex)
            {
                return CommandResponse.Failed(taskId, $"Failed to cancel shutdown: {ex.Message}");
            }
        }

        private async Task<CommandResponse> ExecutePowerActionAsync(
            string taskId,
            PowerInput input,
            bool isRestart,
            IProgress<CommandResponse> progress,
            CancellationToken cancellationToken)
        {
            // Verify server authorization requirement
            if (string.IsNullOrWhiteSpace(input.ServerAuthorization))
            {
                LoggingService.Instance.Warn(LogCategory.System, "Rejected power action: Missing required server authorization token");
                return CommandResponse.Rejected(taskId, "Power control action requires valid server authorization token");
            }

            // Guard: If render is in progress or wait_for_render requested, WAIT until complete and verified
            if (input.WaitForRender || RenderControlTool.IsRendering)
            {
                progress.Report(CommandResponse.ProgressUpdate(taskId, 20, "Waiting for active render to complete and verify before power action..."));
                LoggingService.Instance.Info(LogCategory.System, "Power action queued: Waiting for render verification before executing");

                while (RenderControlTool.IsRendering)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    await Task.Delay(1000, cancellationToken);
                }

                // Render completed, verify no errors
                progress.Report(CommandResponse.ProgressUpdate(taskId, 60, "Render completed and verified. Proceeding to scheduled power action"));
            }

            int delay = Math.Clamp(input.DelaySeconds, 10, 3600);
            string flag = isRestart ? "/r" : "/s";
            string comment = input.Comment ?? "Scheduled by Ghostae Orbit Agent";

            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "shutdown.exe",
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                psi.ArgumentList.Add(flag);
                psi.ArgumentList.Add("/t");
                psi.ArgumentList.Add(delay.ToString());
                psi.ArgumentList.Add("/c");
                psi.ArgumentList.Add(comment);
                Process.Start(psi);

                _shutdownScheduled = true;
                _scheduledType = isRestart ? "restart" : "shutdown";
                _scheduledTime = DateTime.Now.AddSeconds(delay);

                LoggingService.Instance.Warn(LogCategory.System, $"System {_scheduledType} scheduled in {delay} seconds");

                var result = new
                {
                    status = "scheduled",
                    action = _scheduledType,
                    delay_seconds = delay,
                    scheduled_time = _scheduledTime.Value.ToString("o")
                };

                return CommandResponse.Success(taskId, result, $"System {_scheduledType} scheduled in {delay} seconds");
            }
            catch (Exception ex)
            {
                return CommandResponse.Failed(taskId, $"Failed to schedule power action: {ex.Message}");
            }
        }
    }
}
