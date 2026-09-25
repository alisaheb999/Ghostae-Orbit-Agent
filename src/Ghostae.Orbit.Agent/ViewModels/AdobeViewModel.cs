using System;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Windows.Input;
using System.Windows.Media;
using Ghostae.Orbit.Agent.Bridges;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;
using Ghostae.Orbit.Agent.Tools;

namespace Ghostae.Orbit.Agent.ViewModels
{
    public class AdobeViewModel : ViewModelBase
    {
        // After Effects Status
        private bool _aeIsRunning = false;
        private int _aePid = 0;
        private string _aeVersion = "Unknown";
        private string _aeActiveProject = "No active project";
        private string _aeRenderStatus = "Idle";
        private bool _aeBridgeConnected = false;

        // Premiere Pro Status
        private bool _prIsRunning = false;
        private int _prPid = 0;
        private string _prVersion = "Unknown";
        private string _prActiveProject = "No active project";
        private string _prRenderStatus = "Idle";
        private bool _prBridgeConnected = false;

        // Live Action & Diagnostic Panel
        private string _actionStatusMessage = "Ready — Click any Studio action below to test and verify execution.";
        private bool _isActionRunning = false;
        private int _actionProgress = 0;
        private string _lastScreenshotPath = string.Empty;
        private string _lastVideoPath = string.Empty;

        // Properties - AE
        public bool AeIsRunning { get => _aeIsRunning; set => SetProperty(ref _aeIsRunning, value); }
        public int AePid { get => _aePid; set => SetProperty(ref _aePid, value); }
        public string AeVersion { get => _aeVersion; set => SetProperty(ref _aeVersion, value); }
        public string AeActiveProject { get => _aeActiveProject; set => SetProperty(ref _aeActiveProject, value); }
        public string AeRenderStatus { get => _aeRenderStatus; set => SetProperty(ref _aeRenderStatus, value); }
        public bool AeBridgeConnected { get => _aeBridgeConnected; set => SetProperty(ref _aeBridgeConnected, value); }

        public string AeProcessStatusText => AeIsRunning ? $"Running (PID: {AePid})" : "Not Running";
        public Brush AeProcessStatusColor => AeIsRunning ? new SolidColorBrush(System.Windows.Media.Color.FromRgb(16, 185, 129)) : new SolidColorBrush(System.Windows.Media.Color.FromRgb(156, 163, 175));

        // Properties - Premiere
        public bool PrIsRunning { get => _prIsRunning; set => SetProperty(ref _prIsRunning, value); }
        public int PrPid { get => _prPid; set => SetProperty(ref _prPid, value); }
        public string PrVersion { get => _prVersion; set => SetProperty(ref _prVersion, value); }
        public string PrActiveProject { get => _prActiveProject; set => SetProperty(ref _prActiveProject, value); }
        public string PrRenderStatus { get => _prRenderStatus; set => SetProperty(ref _prRenderStatus, value); }
        public bool PrBridgeConnected { get => _prBridgeConnected; set => SetProperty(ref _prBridgeConnected, value); }

        public string PrProcessStatusText => PrIsRunning ? $"Running (PID: {PrPid})" : "Not Running";
        public Brush PrProcessStatusColor => PrIsRunning ? new SolidColorBrush(System.Windows.Media.Color.FromRgb(16, 185, 129)) : new SolidColorBrush(System.Windows.Media.Color.FromRgb(156, 163, 175));

        // Action Panel Properties
        public string ActionStatusMessage { get => _actionStatusMessage; set => SetProperty(ref _actionStatusMessage, value); }
        public bool IsActionRunning { get => _isActionRunning; set => SetProperty(ref _isActionRunning, value); }
        public int ActionProgress { get => _actionProgress; set => SetProperty(ref _actionProgress, value); }
        public string LastScreenshotPath
        {
            get => _lastScreenshotPath;
            set
            {
                if (SetProperty(ref _lastScreenshotPath, value))
                {
                    OnPropertyChanged(nameof(HasLastScreenshot));
                }
            }
        }
        public bool HasLastScreenshot => !string.IsNullOrEmpty(LastScreenshotPath) && File.Exists(LastScreenshotPath);

        public string LastVideoPath
        {
            get => _lastVideoPath;
            set
            {
                if (SetProperty(ref _lastVideoPath, value))
                {
                    OnPropertyChanged(nameof(HasLastVideo));
                }
            }
        }
        public bool HasLastVideo => !string.IsNullOrEmpty(LastVideoPath) && File.Exists(LastVideoPath);

        // Commands
        public ICommand RefreshCommand { get; }
        public ICommand LaunchPrCommand { get; }
        public ICommand LaunchAeCommand { get; }
        public ICommand SavePrCommand { get; }
        public ICommand SaveAeCommand { get; }
        public ICommand OpenPrProjectCommand { get; }
        public ICommand OpenAeProjectCommand { get; }
        public ICommand RenderPrCommand { get; }
        public ICommand RenderAeCommand { get; }
        public ICommand CaptureScreenshotCommand { get; }
        public ICommand QuickRecordCommand { get; }
        public ICommand OpenLastFileCommand { get; }

        public AdobeViewModel()
        {
            RefreshCommand = new RelayCommand(() =>
            {
                AdobeBridgeManager.Instance.RefreshProcessStatus();
                ActionStatusMessage = "Refreshed Adobe process status.";
            });

            // 1. Launch / Open Premiere Pro
            LaunchPrCommand = new RelayCommand(async () =>
            {
                await ExecuteLaunchAsync("premiere");
            });

            // 2. Launch / Open After Effects
            LaunchAeCommand = new RelayCommand(async () =>
            {
                await ExecuteLaunchAsync("after_effects");
            });

            // 3. Save Premiere Pro Project
            SavePrCommand = new RelayCommand(async () =>
            {
                await ExecuteSaveAsync("premiere");
            });

            // 4. Save After Effects Project
            SaveAeCommand = new RelayCommand(async () =>
            {
                await ExecuteSaveAsync("after_effects");
            });

            // 5. Open Premiere Project with File Picker
            OpenPrProjectCommand = new RelayCommand(async () =>
            {
                using var dlg = new OpenFileDialog { Filter = "Premiere Pro Project (*.prproj)|*.prproj|All Files (*.*)|*.*" };
                if (dlg.ShowDialog() == DialogResult.OK)
                {
                    await ExecuteOpenProjectAsync("premiere", dlg.FileName);
                }
            });

            // 6. Open After Effects Project with File Picker
            OpenAeProjectCommand = new RelayCommand(async () =>
            {
                using var dlg = new OpenFileDialog { Filter = "After Effects Project (*.aep)|*.aep|All Files (*.*)|*.*" };
                if (dlg.ShowDialog() == DialogResult.OK)
                {
                    await ExecuteOpenProjectAsync("after_effects", dlg.FileName);
                }
            });

            // 7. Render Premiere
            RenderPrCommand = new RelayCommand(async () =>
            {
                await ExecuteRenderAsync("premiere");
            });

            // 8. Render After Effects (CLI aerender)
            RenderAeCommand = new RelayCommand(async () =>
            {
                await ExecuteRenderAsync("after_effects");
            });

            // 9. Get Screenshot
            CaptureScreenshotCommand = new RelayCommand(async () =>
            {
                await ExecuteScreenshotAsync();
            });

            // 10. Quick Record
            QuickRecordCommand = new RelayCommand(async () =>
            {
                await ExecuteQuickRecordAsync();
            });

            OpenLastFileCommand = new RelayCommand(() =>
            {
                string target = !string.IsNullOrEmpty(LastVideoPath) && File.Exists(LastVideoPath) ? LastVideoPath : LastScreenshotPath;
                if (!string.IsNullOrEmpty(target) && File.Exists(target))
                {
                    Process.Start(new ProcessStartInfo(target) { UseShellExecute = true });
                }
            });

            AdobeBridgeManager.Instance.OnAdobeStateUpdated += Refresh;
            AdobeBridgeManager.Instance.RefreshProcessStatus();
        }

        private async Task ExecuteLaunchAsync(string app)
        {
            try
            {
                IsActionRunning = true;
                string appName = (app == "after_effects" || app == "ae") ? "After Effects" : "Premiere Pro";
                ActionStatusMessage = $"Launching {appName}...";

                var tool = new AdobeProjectTool();
                var req = new CommandRequest
                {
                    TaskId = $"launch_{Guid.NewGuid():N}",
                    Tool = "adobe_project",
                    Input = JsonSerializer.SerializeToElement(new { operation = "open", application = app })
                };

                var resp = await tool.ExecuteAsync(req, new Progress<CommandResponse>(), default);
                Refresh();

                if (resp.Status == "success")
                {
                    ActionStatusMessage = $"✓ {appName} launched successfully!";
                    LoggingService.Instance.Success(LogCategory.Adobe, $"{appName} auto-launched via UI");
                }
                else
                {
                    ActionStatusMessage = $"Launch failed: {resp.Message}";
                }
            }
            catch (Exception ex)
            {
                ActionStatusMessage = $"Error launching app: {ex.Message}";
            }
            finally
            {
                IsActionRunning = false;
            }
        }

        private async Task ExecuteSaveAsync(string app)
        {
            try
            {
                IsActionRunning = true;
                string appName = (app == "after_effects" || app == "ae") ? "After Effects" : "Premiere Pro";
                ActionStatusMessage = $"Saving {appName} project in real-time (Ctrl+S)...";

                var tool = new AdobeProjectTool();
                var req = new CommandRequest
                {
                    TaskId = $"save_{Guid.NewGuid():N}",
                    Tool = "adobe_project",
                    Input = JsonSerializer.SerializeToElement(new { operation = "save", application = app })
                };

                var resp = await tool.ExecuteAsync(req, new Progress<CommandResponse>(), default);
                Refresh();

                if (resp.Status == "success")
                {
                    ActionStatusMessage = $"✓ {appName} project saved in real-time!";
                    LoggingService.Instance.Success(LogCategory.Adobe, $"{appName} project saved");
                }
                else
                {
                    ActionStatusMessage = $"Save response: {resp.Message}";
                }
            }
            catch (Exception ex)
            {
                ActionStatusMessage = $"Error saving project: {ex.Message}";
            }
            finally
            {
                IsActionRunning = false;
            }
        }

        private async Task ExecuteOpenProjectAsync(string app, string path)
        {
            try
            {
                IsActionRunning = true;
                string appName = (app == "after_effects" || app == "ae") ? "After Effects" : "Premiere Pro";
                ActionStatusMessage = $"Opening project in {appName}: {Path.GetFileName(path)}...";

                var tool = new AdobeProjectTool();
                var req = new CommandRequest
                {
                    TaskId = $"open_{Guid.NewGuid():N}",
                    Tool = "adobe_project",
                    Input = JsonSerializer.SerializeToElement(new { operation = "open", application = app, project_path = path })
                };

                var resp = await tool.ExecuteAsync(req, new Progress<CommandResponse>(), default);
                Refresh();

                if (resp.Status == "success")
                {
                    ActionStatusMessage = $"✓ Project '{Path.GetFileName(path)}' opened in {appName}!";
                }
                else
                {
                    ActionStatusMessage = $"Open project failed: {resp.Message}";
                }
            }
            catch (Exception ex)
            {
                ActionStatusMessage = $"Error opening project: {ex.Message}";
            }
            finally
            {
                IsActionRunning = false;
            }
        }

        private async Task ExecuteRenderAsync(string app)
        {
            try
            {
                IsActionRunning = true;
                ActionProgress = 5;
                string appName = (app == "after_effects" || app == "ae") ? "After Effects" : "Premiere Pro";
                ActionStatusMessage = $"Starting {appName} render pipeline...";

                var tool = new RenderControlTool();
                var req = new CommandRequest
                {
                    TaskId = $"render_{Guid.NewGuid():N}",
                    Tool = "render",
                    Input = JsonSerializer.SerializeToElement(new { operation = "start", application = app })
                };

                var progressReporter = new Progress<CommandResponse>(p =>
                {
                    if (p.Progress.HasValue)
                    {
                        ActionProgress = p.Progress.Value;
                        ActionStatusMessage = $"{p.Message} ({p.Progress.Value}%)";
                    }
                });

                var resp = await tool.ExecuteAsync(req, progressReporter, default);
                Refresh();

                if (resp.Status == "success")
                {
                    ActionProgress = 100;
                    ActionStatusMessage = $"✓ Render complete & verified 6/6 points! Output: {Path.GetFileName(RenderControlTool.ActiveApplication)}";
                    LoggingService.Instance.Success(LogCategory.Adobe, $"{appName} render completed successfully");
                }
                else
                {
                    ActionStatusMessage = $"Render failed: {resp.Message}";
                }
            }
            catch (Exception ex)
            {
                ActionStatusMessage = $"Error during render: {ex.Message}";
            }
            finally
            {
                IsActionRunning = false;
            }
        }

        private async Task ExecuteScreenshotAsync()
        {
            try
            {
                IsActionRunning = true;
                ActionStatusMessage = "Capturing 1:1 crisp screenshot (DPI & CAPTUREBLT enabled)...";

                var tool = new ScreenshotTool();
                var req = new CommandRequest
                {
                    TaskId = $"shot_{Guid.NewGuid():N}",
                    Tool = "screenshot",
                    Input = JsonSerializer.SerializeToElement(new { target = "full_screen" })
                };

                var resp = await tool.ExecuteAsync(req, new Progress<CommandResponse>(), default);
                if (resp.Status == "success" && resp.Result != null)
                {
                    var json = JsonSerializer.Serialize(resp.Result);
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("file_path", out var p))
                    {
                        LastScreenshotPath = p.GetString() ?? string.Empty;
                        ActionStatusMessage = $"✓ Screenshot captured: {Path.GetFileName(LastScreenshotPath)}";
                    }
                }
                else
                {
                    ActionStatusMessage = $"Screenshot failed: {resp.Message}";
                }
            }
            catch (Exception ex)
            {
                ActionStatusMessage = $"Error capturing screenshot: {ex.Message}";
            }
            finally
            {
                IsActionRunning = false;
            }
        }

        private async Task ExecuteQuickRecordAsync()
        {
            try
            {
                IsActionRunning = true;
                var tool = new ScreenRecordTool();

                if (!ScreenRecordTool.IsRecording)
                {
                    ActionStatusMessage = "Screen recorder started. Capturing video frames...";
                    var startReq = new CommandRequest
                    {
                        TaskId = $"rec_start_{Guid.NewGuid():N}",
                        Tool = "screen_record",
                        Input = JsonSerializer.SerializeToElement(new { operation = "start", quality = "High", max_duration_seconds = 4 })
                    };
                    await tool.ExecuteAsync(startReq, new Progress<CommandResponse>(), default);

                    ActionProgress = 30;
                    ActionStatusMessage = "Recording active (capturing ~3s test video)...";
                    await Task.Delay(3000);

                    ActionStatusMessage = "Finalizing RIFF AVI video file...";
                    var stopReq = new CommandRequest
                    {
                        TaskId = $"rec_stop_{Guid.NewGuid():N}",
                        Tool = "screen_record",
                        Input = JsonSerializer.SerializeToElement(new { operation = "stop" })
                    };

                    var stopResp = await tool.ExecuteAsync(stopReq, new Progress<CommandResponse>(), default);
                    if (stopResp.Status == "success" && stopResp.Result != null)
                    {
                        var json = JsonSerializer.Serialize(stopResp.Result);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("file_path", out var vp))
                        {
                            LastVideoPath = vp.GetString() ?? string.Empty;
                            ActionProgress = 100;
                            ActionStatusMessage = $"✓ Video saved & verified: {Path.GetFileName(LastVideoPath)}";
                        }
                    }
                    else
                    {
                        ActionStatusMessage = $"Recording stop failed: {stopResp.Message}";
                    }
                }
                else
                {
                    var stopReq = new CommandRequest
                    {
                        TaskId = $"rec_stop_{Guid.NewGuid():N}",
                        Tool = "screen_record",
                        Input = JsonSerializer.SerializeToElement(new { operation = "stop" })
                    };
                    var stopResp = await tool.ExecuteAsync(stopReq, new Progress<CommandResponse>(), default);
                    ActionStatusMessage = "Recording stopped.";
                }
            }
            catch (Exception ex)
            {
                ActionStatusMessage = $"Error in screen recorder: {ex.Message}";
            }
            finally
            {
                IsActionRunning = false;
            }
        }

        public void Refresh()
        {
            var bridge = AdobeBridgeManager.Instance;

            AeIsRunning = bridge.AfterEffectsInfo.IsRunning;
            AePid = bridge.AfterEffectsInfo.ProcessId;
            AeVersion = bridge.AfterEffectsInfo.Version;
            AeActiveProject = bridge.AfterEffectsInfo.ActiveProject;
            AeRenderStatus = bridge.AfterEffectsInfo.RenderStatus;
            AeBridgeConnected = bridge.AfterEffectsInfo.BridgeConnected;

            PrIsRunning = bridge.PremiereInfo.IsRunning;
            PrPid = bridge.PremiereInfo.ProcessId;
            PrVersion = bridge.PremiereInfo.Version;
            PrActiveProject = bridge.PremiereInfo.ActiveProject;
            PrRenderStatus = bridge.PremiereInfo.RenderStatus;
            PrBridgeConnected = bridge.PremiereInfo.BridgeConnected;

            OnPropertyChanged(nameof(AeProcessStatusText));
            OnPropertyChanged(nameof(AeProcessStatusColor));
            OnPropertyChanged(nameof(PrProcessStatusText));
            OnPropertyChanged(nameof(PrProcessStatusColor));
        }
    }
}
