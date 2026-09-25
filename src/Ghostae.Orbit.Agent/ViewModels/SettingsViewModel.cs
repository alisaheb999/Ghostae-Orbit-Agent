using System;
using System.IO;
using System.Linq;
using System.Windows.Forms;
using System.Windows.Input;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;

namespace Ghostae.Orbit.Agent.ViewModels
{
    public class SettingsViewModel : ViewModelBase
    {
        private bool _startWithWindows;
        private bool _minimizeToTray;
        private string _serverUrl = "";
        private string _deviceId = "";
        private string _authToken = "";
        private bool _allowScreenshots;
        private bool _allowRecording;
        private bool _allowFileOperations;
        private bool _allowAdobeControl;
        private bool _allowPowerControl;
        private string _recordingOutputDir = "";
        private string _screenshotOutputDir = "";
        private string _storageSummary = "0 MB";

        public bool StartWithWindows
        {
            get => _startWithWindows;
            set
            {
                if (SetProperty(ref _startWithWindows, value))
                {
                    ConfigService.Instance.UpdateAutoStart(value);
                }
            }
        }

        public bool MinimizeToTray
        {
            get => _minimizeToTray;
            set
            {
                if (SetProperty(ref _minimizeToTray, value))
                {
                    ConfigService.Instance.Current.MinimizeToTray = value;
                    ConfigService.Instance.Save();
                }
            }
        }

        public string ServerUrl
        {
            get => _serverUrl;
            set
            {
                if (SetProperty(ref _serverUrl, value))
                {
                    ConfigService.Instance.Current.ServerUrl = value;
                    ConfigService.Instance.Save();
                }
            }
        }

        public string DeviceId => _deviceId;

        public string AuthToken
        {
            get => _authToken;
            set
            {
                if (SetProperty(ref _authToken, value))
                {
                    ConfigService.Instance.SetAuthToken(value);
                }
            }
        }

        public bool AllowScreenshots
        {
            get => _allowScreenshots;
            set
            {
                if (SetProperty(ref _allowScreenshots, value))
                {
                    ConfigService.Instance.Current.AllowScreenshots = value;
                    ConfigService.Instance.Save();
                }
            }
        }

        public bool AllowRecording
        {
            get => _allowRecording;
            set
            {
                if (SetProperty(ref _allowRecording, value))
                {
                    ConfigService.Instance.Current.AllowRecording = value;
                    ConfigService.Instance.Save();
                }
            }
        }

        public bool AllowFileOperations
        {
            get => _allowFileOperations;
            set
            {
                if (SetProperty(ref _allowFileOperations, value))
                {
                    ConfigService.Instance.Current.AllowFileOperations = value;
                    ConfigService.Instance.Save();
                }
            }
        }

        public bool AllowAdobeControl
        {
            get => _allowAdobeControl;
            set
            {
                if (SetProperty(ref _allowAdobeControl, value))
                {
                    ConfigService.Instance.Current.AllowAdobeControl = value;
                    ConfigService.Instance.Save();
                }
            }
        }

        public bool AllowPowerControl
        {
            get => _allowPowerControl;
            set
            {
                if (SetProperty(ref _allowPowerControl, value))
                {
                    ConfigService.Instance.Current.AllowPowerControl = value;
                    ConfigService.Instance.Save();
                }
            }
        }

        public string RecordingOutputDir
        {
            get => _recordingOutputDir;
            set
            {
                if (SetProperty(ref _recordingOutputDir, value))
                {
                    ConfigService.Instance.Current.RecordingOutputDir = value;
                    ConfigService.Instance.Save();
                }
            }
        }

        public string ScreenshotOutputDir
        {
            get => _screenshotOutputDir;
            set
            {
                if (SetProperty(ref _screenshotOutputDir, value))
                {
                    ConfigService.Instance.Current.ScreenshotOutputDir = value;
                    ConfigService.Instance.Save();
                }
            }
        }

        public string StorageSummary
        {
            get => _storageSummary;
            set => SetProperty(ref _storageSummary, value);
        }

        public ICommand ReconnectCommand { get; }
        public ICommand BrowseRecordingDirCommand { get; }
        public ICommand BrowseScreenshotDirCommand { get; }
        public ICommand ClearCacheCommand { get; }

        public SettingsViewModel()
        {
            var cfg = ConfigService.Instance.Current;
            _startWithWindows = cfg.StartWithWindows;
            _minimizeToTray = cfg.MinimizeToTray;
            _serverUrl = cfg.ServerUrl;
            _deviceId = cfg.DeviceId;
            _authToken = ConfigService.Instance.GetAuthToken();

            _allowScreenshots = cfg.AllowScreenshots;
            _allowRecording = cfg.AllowRecording;
            _allowFileOperations = cfg.AllowFileOperations;
            _allowAdobeControl = cfg.AllowAdobeControl;
            _allowPowerControl = cfg.AllowPowerControl;

            _recordingOutputDir = cfg.RecordingOutputDir;
            _screenshotOutputDir = cfg.ScreenshotOutputDir;

            ReconnectCommand = new RelayCommand(() =>
            {
                OrbitWebSocketClient.Instance.Reconnect();
                LoggingService.Instance.Info(LogCategory.Connection, "Manual reconnect triggered from settings");
            });

            BrowseRecordingDirCommand = new RelayCommand(() =>
            {
                using var fbd = new FolderBrowserDialog { SelectedPath = RecordingOutputDir };
                if (fbd.ShowDialog() == DialogResult.OK)
                {
                    RecordingOutputDir = fbd.SelectedPath;
                }
            });

            BrowseScreenshotDirCommand = new RelayCommand(() =>
            {
                using var fbd = new FolderBrowserDialog { SelectedPath = ScreenshotOutputDir };
                if (fbd.ShowDialog() == DialogResult.OK)
                {
                    ScreenshotOutputDir = fbd.SelectedPath;
                }
            });

            ClearCacheCommand = new RelayCommand(() =>
            {
                try
                {
                    var cacheDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GhostaeOrbit", "cache");
                    if (Directory.Exists(cacheDir))
                    {
                        Directory.Delete(cacheDir, true);
                        Directory.CreateDirectory(cacheDir);
                    }
                    LoggingService.Instance.Success(LogCategory.System, "Local cache cleaned");
                    CalculateStorage();
                }
                catch { }
            });

            CalculateStorage();
        }

        private void CalculateStorage()
        {
            long bytes = 0;
            try
            {
                if (Directory.Exists(RecordingOutputDir))
                    bytes += new DirectoryInfo(RecordingOutputDir).EnumerateFiles().Sum(f => f.Length);
                if (Directory.Exists(ScreenshotOutputDir))
                    bytes += new DirectoryInfo(ScreenshotOutputDir).EnumerateFiles().Sum(f => f.Length);
            }
            catch { }

            StorageSummary = $"{bytes / (1024.0 * 1024):F1} MB";
        }
    }
}
