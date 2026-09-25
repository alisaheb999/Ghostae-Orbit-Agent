using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Win32;

namespace Ghostae.Orbit.Agent.Services
{
    public class AgentConfig
    {
        public string ServerUrl { get; set; } = "ws://127.0.0.1:8765"; // Default local or configured server
        public string DeviceId { get; set; } = Guid.NewGuid().ToString("D");
        public string DeviceName { get; set; } = Environment.MachineName;
        public string EncryptedAuthToken { get; set; } = string.Empty;
        public bool StartWithWindows { get; set; } = false;
        public bool MinimizeToTray { get; set; } = true;
        public int HeartbeatIntervalSeconds { get; set; } = 15;

        // Permissions
        public bool AllowScreenshots { get; set; } = true;
        public bool AllowRecording { get; set; } = true;
        public bool AllowFileOperations { get; set; } = true;
        public bool AllowAdobeControl { get; set; } = true;
        public bool AllowPowerControl { get; set; } = true;

        // Paths
        public string RecordingOutputDir { get; set; } = string.Empty;
        public string ScreenshotOutputDir { get; set; } = string.Empty;
        public string RecordingQuality { get; set; } = "High"; // Standard, High
    }

    public class ConfigService
    {
        private static readonly Lazy<ConfigService> _instance = new(() => new ConfigService());
        public static ConfigService Instance => _instance.Value;

        private readonly string _configFilePath;
        private AgentConfig _config;

        public AgentConfig Current => _config;

        public ConfigService()
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var dir = Path.Combine(appData, "GhostaeOrbit");
            Directory.CreateDirectory(dir);
            _configFilePath = Path.Combine(dir, "config.json");

            _config = Load();

            // Set default paths if empty
            if (string.IsNullOrEmpty(_config.RecordingOutputDir))
            {
                var videos = Environment.GetFolderPath(Environment.SpecialFolder.MyVideos);
                _config.RecordingOutputDir = Path.Combine(videos, "OrbitRecordings");
            }
            if (string.IsNullOrEmpty(_config.ScreenshotOutputDir))
            {
                var pics = Environment.GetFolderPath(Environment.SpecialFolder.MyPictures);
                _config.ScreenshotOutputDir = Path.Combine(pics, "OrbitScreenshots");
            }

            try
            {
                Directory.CreateDirectory(_config.RecordingOutputDir);
                Directory.CreateDirectory(_config.ScreenshotOutputDir);
            }
            catch { }
        }

        private AgentConfig Load()
        {
            try
            {
                if (File.Exists(_configFilePath))
                {
                    var json = File.ReadAllText(_configFilePath);
                    var cfg = JsonSerializer.Deserialize<AgentConfig>(json);
                    if (cfg != null) return cfg;
                }
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Warn(Models.LogCategory.System, "Failed to load config, using defaults", ex.Message);
            }

            var newConfig = new AgentConfig();
            Save(newConfig);
            return newConfig;
        }

        public void Save(AgentConfig? config = null)
        {
            if (config != null) _config = config;
            try
            {
                var json = JsonSerializer.Serialize(_config, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(_configFilePath, json);
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Error(Models.LogCategory.System, "Failed to save configuration", ex.Message);
            }
        }

        public void SetAuthToken(string token)
        {
            try
            {
                if (string.IsNullOrEmpty(token))
                {
                    _config.EncryptedAuthToken = string.Empty;
                }
                else
                {
                    var bytes = Encoding.UTF8.GetBytes(token);
                    var protectedBytes = ProtectedData.Protect(bytes, null, DataProtectionScope.CurrentUser);
                    _config.EncryptedAuthToken = Convert.ToBase64String(protectedBytes);
                }
                Save();
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Error(Models.LogCategory.System, "Failed to protect auth token", ex.Message);
            }
        }

        public string GetAuthToken()
        {
            try
            {
                if (string.IsNullOrEmpty(_config.EncryptedAuthToken)) return string.Empty;
                var protectedBytes = Convert.FromBase64String(_config.EncryptedAuthToken);
                var bytes = ProtectedData.Unprotect(protectedBytes, null, DataProtectionScope.CurrentUser);
                return Encoding.UTF8.GetString(bytes);
            }
            catch
            {
                return string.Empty;
            }
        }

        public void UpdateAutoStart(bool enable)
        {
            _config.StartWithWindows = enable;
            Save();

            try
            {
                using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
                if (key != null)
                {
                    const string runName = "GhostaeOrbitAgent";
                    if (enable)
                    {
                        var exePath = Environment.ProcessPath ?? Path.Combine(AppContext.BaseDirectory, "Ghostae.Orbit.Agent.exe");
                        key.SetValue(runName, $"\"{exePath}\" --background");
                    }
                    else
                    {
                        key.DeleteValue(runName, false);
                    }
                }
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Warn(Models.LogCategory.System, "Failed to update Windows autostart registry", ex.Message);
            }
        }
    }
}
