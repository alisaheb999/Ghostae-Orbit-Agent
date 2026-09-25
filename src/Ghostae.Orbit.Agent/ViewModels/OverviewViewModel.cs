using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows.Input;
using System.Windows.Threading;
using Ghostae.Orbit.Agent.Bridges;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;
using Ghostae.Orbit.Agent.Tools;

namespace Ghostae.Orbit.Agent.ViewModels
{
    public class OverviewViewModel : ViewModelBase
    {
        private readonly MainViewModel _mainVM;
        private readonly DispatcherTimer _refreshTimer;

        // Top Status Card
        private string _agentStatusTitle = "Agent Online";
        private string _serverStatusText = "Connected";
        private string _heartbeatText = "Just now";

        // System Card
        private string _windowsStatus = "Online";
        private string _cpuText = "0%";
        private string _ramText = "0 / 0 GB";
        private string _storageText = "0 GB Free";
        private string _windowsVersion = "Windows 11";

        // Adobe Card
        private bool _isAeRunning = false;
        private bool _isPrRunning = false;
        private string _aeStatusText = "Not Running";
        private string _prStatusText = "Not Running";
        private string _activeProject = "No active project";
        private string _adobeCurrentTask = "Idle";

        // Current Task Card
        private bool _hasActiveTask = false;
        private string _activeTaskName = "No Active Task";
        private string _activeTaskApp = "Windows";
        private int _activeTaskProgress = 0;
        private string _activeTaskStatus = "Idle";
        private string _activeTaskId = "";

        public ObservableCollection<TaskItem> RecentTasks { get; } = new();

        public string AgentStatusTitle { get => _agentStatusTitle; set => SetProperty(ref _agentStatusTitle, value); }
        public string ServerStatusText { get => _serverStatusText; set => SetProperty(ref _serverStatusText, value); }
        public string HeartbeatText { get => _heartbeatText; set => SetProperty(ref _heartbeatText, value); }

        private double _cpuPercentValue = 0;
        private double _ramPercentValue = 0;

        public double CpuPercentValue { get => _cpuPercentValue; set => SetProperty(ref _cpuPercentValue, value); }
        public double RamPercentValue { get => _ramPercentValue; set => SetProperty(ref _ramPercentValue, value); }

        public string WindowsStatus { get => _windowsStatus; set => SetProperty(ref _windowsStatus, value); }
        public string CpuText { get => _cpuText; set => SetProperty(ref _cpuText, value); }
        public string RamText { get => _ramText; set => SetProperty(ref _ramText, value); }
        public string StorageText { get => _storageText; set => SetProperty(ref _storageText, value); }
        public string WindowsVersion { get => _windowsVersion; set => SetProperty(ref _windowsVersion, value); }

        public bool IsAeRunning { get => _isAeRunning; set => SetProperty(ref _isAeRunning, value); }
        public bool IsPrRunning { get => _isPrRunning; set => SetProperty(ref _isPrRunning, value); }
        public string AeStatusText { get => _aeStatusText; set => SetProperty(ref _aeStatusText, value); }
        public string PrStatusText { get => _prStatusText; set => SetProperty(ref _prStatusText, value); }
        public string ActiveProject { get => _activeProject; set => SetProperty(ref _activeProject, value); }
        public string AdobeCurrentTask { get => _adobeCurrentTask; set => SetProperty(ref _adobeCurrentTask, value); }

        public bool HasActiveTask { get => _hasActiveTask; set => SetProperty(ref _hasActiveTask, value); }
        public string ActiveTaskName { get => _activeTaskName; set => SetProperty(ref _activeTaskName, value); }
        public string ActiveTaskApp { get => _activeTaskApp; set => SetProperty(ref _activeTaskApp, value); }
        public int ActiveTaskProgress { get => _activeTaskProgress; set => SetProperty(ref _activeTaskProgress, value); }
        public string ActiveTaskStatus { get => _activeTaskStatus; set => SetProperty(ref _activeTaskStatus, value); }

        public ICommand ViewDetailsCommand { get; }
        public ICommand ViewTaskCommand { get; }
        public ICommand CancelTaskCommand { get; }
        public ICommand OpenDiagnosticsCommand { get; }

        public OverviewViewModel(MainViewModel mainVM)
        {
            _mainVM = mainVM;

            ViewDetailsCommand = new RelayCommand(() => _mainVM.NavigateTo("Desktop"));
            ViewTaskCommand = new RelayCommand(() => _mainVM.NavigateTo("Tasks"));
            OpenDiagnosticsCommand = new RelayCommand(() => _mainVM.NavigateTo("Diagnostics"));
            CancelTaskCommand = new RelayCommand(() =>
            {
                if (!string.IsNullOrEmpty(_activeTaskId))
                {
                    TaskExecutionEngine.Instance.CancelTask(_activeTaskId);
                }
            });

            // Timer for lightweight telemetry updates (every 2.5s)
            _refreshTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(2.5) };
            _refreshTimer.Tick += async (s, e) =>
            {
                await Task.Run(() =>
                {
                    RefreshTelemetry();
                    AdobeBridgeManager.Instance.RefreshProcessStatus();
                });
            };
            _refreshTimer.Start();

            // Task Engine Subscriptions
            TaskExecutionEngine.Instance.OnTaskUpdated += UpdateTaskInfo;
            TaskExecutionEngine.Instance.OnTaskCompleted += _ => RefreshRecentTasks();

            // Adobe Bridge Subscriptions
            AdobeBridgeManager.Instance.OnAdobeStateUpdated += RefreshAdobeInfo;

            Task.Run(() =>
            {
                AdobeBridgeManager.Instance.RefreshProcessStatus();
                RefreshTelemetry();
            });
            RefreshAdobeInfo();
            RefreshRecentTasks();
        }

        private void RefreshTelemetry()
        {
            try
            {
                var mem = DesktopStatusTool.GetMemoryStatus();
                var drives = DesktopStatusTool.GetDriveInfo();
                var cpu = DesktopStatusTool.GetCpuUsage();

                var client = OrbitWebSocketClient.Instance;
                var serverStatusText = client.State.ToString();
                var agentStatusTitle = client.State == ConnectionState.Connected ? "Agent Online" : "Agent Standby";
                var heartbeatText = client.LastHeartbeatTime.HasValue
                    ? $"{DateTime.Now.Subtract(client.LastHeartbeatTime.Value).TotalSeconds:F0}s ago"
                    : "Awaiting connection";
                var winVersion = System.Runtime.InteropServices.RuntimeInformation.OSDescription;

                var cpuText = $"{Math.Round(cpu)}%";
                var ramText = $"{mem.AvailBytes / (1024.0 * 1024 * 1024):F1} GB free";
                var storageText = drives.Count > 0 ? drives[0].FreeFormatted : "N/A";

                var cpuVal = Math.Clamp(cpu, 0, 100);
                var ramVal = mem.TotalBytes > 0 ? Math.Clamp(((mem.TotalBytes - mem.AvailBytes) * 100.0) / mem.TotalBytes, 0, 100) : 0;

                DispatcherHelper.RunOnUI(() =>
                {
                    CpuPercentValue = cpuVal;
                    RamPercentValue = ramVal;
                    CpuText = cpuText;
                    RamText = ramText;
                    StorageText = storageText;
                    WindowsVersion = winVersion;
                    ServerStatusText = serverStatusText;
                    AgentStatusTitle = agentStatusTitle;
                    HeartbeatText = heartbeatText;
                });
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Error(LogCategory.System, "Error in RefreshTelemetry", ex.Message);
            }
        }

        private void RefreshAdobeInfo()
        {
            try
            {
                var bridge = AdobeBridgeManager.Instance;
                IsAeRunning = bridge.AfterEffectsInfo.IsRunning;
                IsPrRunning = bridge.PremiereInfo.IsRunning;
                AeStatusText = IsAeRunning ? "Running" : "Not Running";
                PrStatusText = IsPrRunning ? "Running" : "Not Running";

                if (IsPrRunning && !string.IsNullOrEmpty(bridge.PremiereInfo.ActiveProject))
                    ActiveProject = bridge.PremiereInfo.ActiveProject;
                else if (IsAeRunning && !string.IsNullOrEmpty(bridge.AfterEffectsInfo.ActiveProject))
                    ActiveProject = bridge.AfterEffectsInfo.ActiveProject;
                else
                    ActiveProject = "No active project";

                AdobeCurrentTask = RenderControlTool.IsRendering ? "Rendering" : "Idle";
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Error(LogCategory.Adobe, "Error in RefreshAdobeInfo", ex.Message);
            }
        }

        private void UpdateTaskInfo(TaskItem item)
        {
            DispatcherHelper.SafeInvoke(() =>
            {
                if (item.State == TaskExecutionState.Running)
                {
                    HasActiveTask = true;
                    ActiveTaskName = item.DisplayName;
                    ActiveTaskApp = item.Application;
                    ActiveTaskProgress = item.Progress;
                    ActiveTaskStatus = item.StatusMessage;
                    _activeTaskId = item.TaskId;
                }
                else
                {
                    var current = TaskExecutionEngine.Instance.CurrentActiveTask;
                    if (current != null && current.State == TaskExecutionState.Running)
                    {
                        HasActiveTask = true;
                        ActiveTaskName = current.DisplayName;
                        ActiveTaskApp = current.Application;
                        ActiveTaskProgress = current.Progress;
                        ActiveTaskStatus = current.StatusMessage;
                        _activeTaskId = current.TaskId;
                    }
                    else
                    {
                        HasActiveTask = false;
                        ActiveTaskName = "No Active Task";
                        ActiveTaskProgress = 0;
                        ActiveTaskStatus = "Idle";
                        _activeTaskId = "";
                    }
                }
            });
        }

        private void RefreshRecentTasks()
        {
            DispatcherHelper.SafeInvoke(() =>
            {
                RecentTasks.Clear();
                foreach (var t in TaskExecutionEngine.Instance.History.Take(5))
                {
                    RecentTasks.Add(t);
                }
            });
        }
    }
}
