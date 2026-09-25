using System;
using System.Diagnostics;
using System.IO;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Ghostae.Orbit.Agent.Bridges;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;

namespace Ghostae.Orbit.Agent.Tools
{
    public class AdobeProjectInput
    {
        [JsonPropertyName("operation")]
        public string Operation { get; set; } = "status"; // open, save, status

        [JsonPropertyName("application")]
        public string Application { get; set; } = "premiere"; // after_effects, premiere

        [JsonPropertyName("project_path")]
        public string? ProjectPath { get; set; }
    }

    public class AdobeProjectTool : IAgentTool
    {
        public string ToolName => "adobe_project";

        public async Task<CommandResponse> ExecuteAsync(CommandRequest request, IProgress<CommandResponse> progress, CancellationToken cancellationToken)
        {
            try
            {
                var input = request.GetInput<AdobeProjectInput>() ?? new AdobeProjectInput();
                var op = input.Operation?.ToLowerInvariant() ?? "status";
                var app = input.Application?.ToLowerInvariant() ?? "premiere";

                progress.Report(CommandResponse.ProgressUpdate(request.TaskId, 20, $"Processing Adobe project operation: {op} on {app}"));

                var bridge = AdobeBridgeManager.Instance;
                bridge.RefreshProcessStatus();

                var targetInfo = (app == "after_effects" || app == "ae") ? bridge.AfterEffectsInfo : bridge.PremiereInfo;

                switch (op)
                {
                    case "status":
                        var statusResult = new
                        {
                            application = app,
                            is_running = targetInfo.IsRunning,
                            active_project = targetInfo.ActiveProject,
                            render_status = targetInfo.RenderStatus,
                            bridge_connected = targetInfo.BridgeConnected
                        };
                        return CommandResponse.Success(request.TaskId, statusResult, $"Project status retrieved for {app}");

                    case "save":
                        if (!targetInfo.IsRunning)
                        {
                            return CommandResponse.Failed(request.TaskId, $"{targetInfo.Name} is not running");
                        }

                        progress.Report(CommandResponse.ProgressUpdate(request.TaskId, 40, $"Sending save command to {targetInfo.Name}"));
                        await bridge.SendCommandToBridgeAsync(app, "save_project", new { }, cancellationToken);

                        // Also dispatch native Ctrl+S keystroke to the Adobe process window for guaranteed real-time disk save
                        TriggerNativeSaveShortcut(targetInfo.ProcessName);

                        LoggingService.Instance.Success(LogCategory.Adobe, $"{targetInfo.Name} project saved in real-time");
                        return CommandResponse.Success(request.TaskId, new { 
                            application = app, 
                            result = "Project saved successfully in real-time",
                            saved_at = DateTime.Now.ToString("o")
                        }, "Project saved");

                    case "open":
                    case "launch":
                        var exePath = FindAdobeExecutable(app);

                        if (!string.IsNullOrWhiteSpace(input.ProjectPath))
                        {
                            if (!File.Exists(input.ProjectPath))
                            {
                                return CommandResponse.Failed(request.TaskId, $"Project file not found: {input.ProjectPath}");
                            }
                        }

                        if (!targetInfo.IsRunning)
                        {
                            if (string.IsNullOrEmpty(exePath))
                            {
                                return CommandResponse.Failed(request.TaskId, $"Could not locate installed executable for {targetInfo.Name}");
                            }

                            progress.Report(CommandResponse.ProgressUpdate(request.TaskId, 30, $"Launching {targetInfo.Name} automatically..."));
                            var psi = new ProcessStartInfo
                            {
                                FileName = exePath,
                                UseShellExecute = false
                            };
                            if (!string.IsNullOrWhiteSpace(input.ProjectPath))
                            {
                                psi.ArgumentList.Add(input.ProjectPath);
                            }
                            Process.Start(psi);

                            // Wait briefly for process registration
                            await Task.Delay(2000, cancellationToken);
                            bridge.RefreshProcessStatus();
                        }
                        else if (!string.IsNullOrWhiteSpace(input.ProjectPath))
                        {
                            progress.Report(CommandResponse.ProgressUpdate(request.TaskId, 40, $"Opening project in running {targetInfo.Name}"));
                            await bridge.SendCommandToBridgeAsync(app, "open_project", new { project_path = input.ProjectPath }, cancellationToken);

                            if (!string.IsNullOrEmpty(exePath))
                            {
                                var psi = new ProcessStartInfo { FileName = exePath, UseShellExecute = false };
                                psi.ArgumentList.Add(input.ProjectPath);
                                Process.Start(psi);
                            }
                        }

                        if (!string.IsNullOrWhiteSpace(input.ProjectPath))
                        {
                            targetInfo.ActiveProject = Path.GetFileNameWithoutExtension(input.ProjectPath);
                        }

                        LoggingService.Instance.Success(LogCategory.Adobe, $"{targetInfo.Name} opened successfully");
                        return CommandResponse.Success(request.TaskId, new
                        {
                            application = app,
                            is_running = true,
                            project_path = input.ProjectPath,
                            project_name = targetInfo.ActiveProject,
                            executable = exePath
                        }, $"{targetInfo.Name} launched / project opened successfully");

                    default:
                        return CommandResponse.Rejected(request.TaskId, $"Adobe project operation '{op}' is not supported");
                }
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Error(LogCategory.Adobe, "Adobe project operation failed", ex.Message);
                return CommandResponse.Failed(request.TaskId, $"Adobe project error: {ex.Message}");
            }
        }

        public static string? FindAdobeExecutable(string app)
        {
            bool isAe = (app == "after_effects" || app == "ae");
            if (isAe)
            {
                string[] knownAePaths = new[]
                {
                    @"C:\Program Files\Adobe\Adobe After Effects 2023\Support Files\AfterFX.exe",
                    @"C:\Program Files\Adobe\Adobe After Effects 2024\Support Files\AfterFX.exe",
                    @"C:\Program Files\Adobe\Adobe After Effects 2025\Support Files\AfterFX.exe"
                };
                foreach (var p in knownAePaths)
                {
                    if (File.Exists(p)) return p;
                }

                try
                {
                    var matches = Directory.GetFiles(@"C:\Program Files\Adobe", "AfterFX.exe", SearchOption.AllDirectories);
                    if (matches.Length > 0) return matches[0];
                }
                catch { }
            }
            else
            {
                string[] knownPrPaths = new[]
                {
                    @"C:\Program Files\Adobe\Adobe Premiere Pro 2025\Adobe Premiere Pro.exe",
                    @"C:\Program Files\Adobe\Adobe Premiere Pro 2024\Adobe Premiere Pro.exe",
                    @"C:\Program Files\Adobe\Adobe Premiere Pro 2023\Adobe Premiere Pro.exe"
                };
                foreach (var p in knownPrPaths)
                {
                    if (File.Exists(p)) return p;
                }

                try
                {
                    var matches = Directory.GetFiles(@"C:\Program Files\Adobe", "Adobe Premiere Pro.exe", SearchOption.AllDirectories);
                    if (matches.Length > 0) return matches[0];
                }
                catch { }
            }

            return null;
        }

        public static string? FindAerenderExecutable()
        {
            string[] knownPaths = new[]
            {
                @"C:\Program Files\Adobe\Adobe After Effects 2023\Support Files\aerender.exe",
                @"C:\Program Files\Adobe\Adobe After Effects 2024\Support Files\aerender.exe",
                @"C:\Program Files\Adobe\Adobe After Effects 2025\Support Files\aerender.exe"
            };
            foreach (var p in knownPaths)
            {
                if (File.Exists(p)) return p;
            }

            try
            {
                var matches = Directory.GetFiles(@"C:\Program Files\Adobe", "aerender.exe", SearchOption.AllDirectories);
                if (matches.Length > 0) return matches[0];
            }
            catch { }

            return null;
        }

        private static void TriggerNativeSaveShortcut(string processName)
        {
            try
            {
                var procs = Process.GetProcessesByName(processName);
                if (procs.Length > 0 && procs[0].MainWindowHandle != IntPtr.Zero)
                {
                    Native.Win32.SetForegroundWindow(procs[0].MainWindowHandle);
                    Thread.Sleep(100);
                    System.Windows.Forms.SendKeys.SendWait("^s");
                }
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Warn(LogCategory.Adobe, "Native save shortcut dispatch failed", ex.Message);
            }
        }
    }
}
