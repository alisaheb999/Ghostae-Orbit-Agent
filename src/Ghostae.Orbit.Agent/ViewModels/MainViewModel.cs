using System;
using System.Windows.Input;
using System.Windows.Media;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;

namespace Ghostae.Orbit.Agent.ViewModels
{
    public class MainViewModel : ViewModelBase
    {
        private object? _currentView;
        private string _activePageName = "Overview";
        private string _connectionStatusText = "Disconnected";
        private Brush _connectionColorBrush = new SolidColorBrush(Color.FromRgb(235, 0, 41)); // Red
        private string _agentStatusText = "Agent Online";
        private bool _isTaskActive = false;
        private string _activeTaskTitle = "No Active Task";
        private int _activeTaskProgress = 0;

        public OverviewViewModel OverviewVM { get; }
        public TasksViewModel TasksVM { get; }
        public DesktopViewModel DesktopVM { get; }
        public AdobeViewModel AdobeVM { get; }
        public RecordingViewModel RecordingVM { get; }
        public ScreenshotViewModel ScreenshotVM { get; }
        public FilesViewModel FilesVM { get; }
        public SettingsViewModel SettingsVM { get; }
        public LogsViewModel LogsVM { get; }
        public TestDiagnosticsViewModel TestDiagnosticsVM { get; }

        public object? CurrentView
        {
            get => _currentView;
            set => SetProperty(ref _currentView, value);
        }

        public string ActivePageName
        {
            get => _activePageName;
            set => SetProperty(ref _activePageName, value);
        }

        public string ConnectionStatusText
        {
            get => _connectionStatusText;
            set => SetProperty(ref _connectionStatusText, value);
        }

        public Brush ConnectionColorBrush
        {
            get => _connectionColorBrush;
            set => SetProperty(ref _connectionColorBrush, value);
        }

        public string AgentStatusText
        {
            get => _agentStatusText;
            set => SetProperty(ref _agentStatusText, value);
        }

        public string Version => "v1.0.0";

        public bool IsTaskActive
        {
            get => _isTaskActive;
            set => SetProperty(ref _isTaskActive, value);
        }

        public string ActiveTaskTitle
        {
            get => _activeTaskTitle;
            set => SetProperty(ref _activeTaskTitle, value);
        }

        public int ActiveTaskProgress
        {
            get => _activeTaskProgress;
            set => SetProperty(ref _activeTaskProgress, value);
        }

        public ICommand NavigateCommand { get; }

        public MainViewModel()
        {
            OverviewVM = new OverviewViewModel(this);
            TasksVM = new TasksViewModel(this);
            DesktopVM = new DesktopViewModel();
            AdobeVM = new AdobeViewModel();
            RecordingVM = new RecordingViewModel();
            ScreenshotVM = new ScreenshotViewModel();
            FilesVM = new FilesViewModel();
            SettingsVM = new SettingsViewModel();
            LogsVM = new LogsViewModel();
            TestDiagnosticsVM = new TestDiagnosticsViewModel(this);

            CurrentView = OverviewVM;

            NavigateCommand = new RelayCommand(p =>
            {
                if (p is string page) NavigateTo(page);
            });

            // Subscribe to connection updates
            OrbitWebSocketClient.Instance.OnConnectionStateChanged += UpdateConnectionState;
            UpdateConnectionState(OrbitWebSocketClient.Instance.State);

            // Subscribe to task updates
            TaskExecutionEngine.Instance.OnTaskUpdated += item =>
            {
                DispatcherHelper.SafeInvoke(() =>
                {
                    if (item.State == TaskExecutionState.Running)
                    {
                        IsTaskActive = true;
                        ActiveTaskTitle = item.DisplayName;
                        ActiveTaskProgress = item.Progress;
                    }
                    else
                    {
                        var current = TaskExecutionEngine.Instance.CurrentActiveTask;
                        if (current != null && current.State == TaskExecutionState.Running)
                        {
                            IsTaskActive = true;
                            ActiveTaskTitle = current.DisplayName;
                            ActiveTaskProgress = current.Progress;
                        }
                        else
                        {
                            IsTaskActive = false;
                            ActiveTaskTitle = "No Active Task";
                            ActiveTaskProgress = 0;
                        }
                    }
                });
            };
        }

        public void NavigateTo(string pageName)
        {
            ActivePageName = pageName;
            CurrentView = pageName switch
            {
                "Overview" => OverviewVM,
                "Tasks" => TasksVM,
                "Desktop" => DesktopVM,
                "Adobe" => AdobeVM,
                "Recording" => RecordingVM,
                "Screenshot" => ScreenshotVM,
                "Files" => FilesVM,
                "Settings" => SettingsVM,
                "Logs" => LogsVM,
                "Diagnostics" or "SelfTest" or "Test" => TestDiagnosticsVM,
                _ => OverviewVM
            };
        }

        private void UpdateConnectionState(ConnectionState state)
        {
            DispatcherHelper.SafeInvoke(() =>
            {
                switch (state)
                {
                    case ConnectionState.Connected:
                        ConnectionStatusText = "Connected";
                        ConnectionColorBrush = new SolidColorBrush(Color.FromRgb(16, 185, 129)); // Green
                        AgentStatusText = "Agent Online";
                        break;
                    case ConnectionState.Connecting:
                        ConnectionStatusText = "Connecting...";
                        ConnectionColorBrush = new SolidColorBrush(Color.FromRgb(245, 158, 11)); // Amber
                        AgentStatusText = "Agent Connecting";
                        break;
                    case ConnectionState.Disconnected:
                        ConnectionStatusText = "Disconnected";
                        ConnectionColorBrush = new SolidColorBrush(Color.FromRgb(235, 0, 41)); // Red
                        AgentStatusText = "Agent Offline";
                        break;
                    case ConnectionState.Error:
                        ConnectionStatusText = "Connection Error";
                        ConnectionColorBrush = new SolidColorBrush(Color.FromRgb(235, 0, 41)); // Red
                        AgentStatusText = "Connection Error";
                        break;
                }
            });
        }
    }
}
