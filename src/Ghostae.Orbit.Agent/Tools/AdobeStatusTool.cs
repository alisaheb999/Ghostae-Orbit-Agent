using System;
using System.Threading;
using System.Threading.Tasks;
using Ghostae.Orbit.Agent.Bridges;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;

namespace Ghostae.Orbit.Agent.Tools
{
    public class AdobeStatusTool : IAgentTool
    {
        public string ToolName => "adobe_status";

        public Task<CommandResponse> ExecuteAsync(CommandRequest request, IProgress<CommandResponse> progress, CancellationToken cancellationToken)
        {
            progress.Report(CommandResponse.ProgressUpdate(request.TaskId, 30, "Checking Adobe environment"));

            var bridge = AdobeBridgeManager.Instance;
            bridge.RefreshProcessStatus();

            var result = new
            {
                after_effects = new
                {
                    is_running = bridge.AfterEffectsInfo.IsRunning,
                    pid = bridge.AfterEffectsInfo.ProcessId,
                    version = bridge.AfterEffectsInfo.Version,
                    active_project = bridge.AfterEffectsInfo.ActiveProject,
                    render_status = bridge.AfterEffectsInfo.RenderStatus,
                    bridge_connected = bridge.AfterEffectsInfo.BridgeConnected
                },
                premiere_pro = new
                {
                    is_running = bridge.PremiereInfo.IsRunning,
                    pid = bridge.PremiereInfo.ProcessId,
                    version = bridge.PremiereInfo.Version,
                    active_project = bridge.PremiereInfo.ActiveProject,
                    render_status = bridge.PremiereInfo.RenderStatus,
                    bridge_connected = bridge.PremiereInfo.BridgeConnected
                }
            };

            LoggingService.Instance.Info(LogCategory.Adobe, $"Adobe status queried: AE {(bridge.AfterEffectsInfo.IsRunning ? "Online" : "Offline")}, PR {(bridge.PremiereInfo.IsRunning ? "Online" : "Offline")}");
            return Task.FromResult(CommandResponse.Success(request.TaskId, result, "Adobe status retrieved"));
        }
    }
}
