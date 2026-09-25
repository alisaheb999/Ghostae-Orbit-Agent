using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Tools;

namespace Ghostae.Orbit.Agent.Services
{
    public class ToolDispatcher
    {
        private static readonly Lazy<ToolDispatcher> _instance = new(() => new ToolDispatcher());
        public static ToolDispatcher Instance => _instance.Value;

        private readonly Dictionary<string, IAgentTool> _tools = new(StringComparer.OrdinalIgnoreCase);

        public ToolDispatcher()
        {
            RegisterTool(new DesktopStatusTool());
            RegisterTool(new ScreenshotTool());
            RegisterTool(new ScreenRecordTool());
            RegisterTool(new FileManagerTool());
            RegisterTool(new AdobeStatusTool());
            RegisterTool(new AdobeProjectTool());
            RegisterTool(new RenderControlTool());
            RegisterTool(new PowerControlTool());
        }

        private void RegisterTool(IAgentTool tool)
        {
            _tools[tool.ToolName] = tool;
        }

        public async Task<CommandResponse> DispatchAsync(CommandRequest request, IProgress<CommandResponse> progress, CancellationToken cancellationToken)
        {
            // Step 1: Security Validation & Allowlist Check
            var validation = SecurityValidator.ValidateCommand(request);
            if (!validation.IsValid)
            {
                LoggingService.Instance.Warn(LogCategory.Errors, $"Command {request.TaskId} rejected: {validation.Reason}");
                return CommandResponse.Rejected(request.TaskId, validation.Reason ?? "Command rejected by security policy");
            }

            // Step 2: Locate Tool
            if (!_tools.TryGetValue(request.Tool, out var tool))
            {
                LoggingService.Instance.Warn(LogCategory.Errors, $"Unknown tool requested: {request.Tool}");
                return CommandResponse.Rejected(request.TaskId, $"Tool '{request.Tool}' is not recognized. REJECTED.");
            }

            // Step 3: Execute Tool
            try
            {
                LoggingService.Instance.Info(LogCategory.Tasks, $"Executing tool: {request.Tool} (Task: {request.TaskId})");
                var response = await tool.ExecuteAsync(request, progress, cancellationToken);
                return response;
            }
            catch (OperationCanceledException)
            {
                LoggingService.Instance.Warn(LogCategory.Tasks, $"Task {request.TaskId} was cancelled");
                return new CommandResponse
                {
                    TaskId = request.TaskId,
                    Status = "cancelled",
                    Event = "completed",
                    Error = "Task was cancelled"
                };
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Error(LogCategory.Tasks, $"Task {request.TaskId} uncaught exception: {ex.Message}");
                return CommandResponse.Failed(request.TaskId, $"Execution error: {ex.Message}");
            }
        }
    }
}
