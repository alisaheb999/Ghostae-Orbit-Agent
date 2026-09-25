using System;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Ghostae.Orbit.Agent.Models;

namespace Ghostae.Orbit.Agent.Services
{
    public class UpdateManifest
    {
        public string LatestVersion { get; set; } = "1.0.0";
        public string DownloadUrl { get; set; } = string.Empty;
        public string Sha256Hash { get; set; } = string.Empty;
        public string ReleaseNotes { get; set; } = string.Empty;
        public bool Mandatory { get; set; } = false;
    }

    public class AutoUpdateService
    {
        private static readonly Lazy<AutoUpdateService> _instance = new(() => new AutoUpdateService());
        public static AutoUpdateService Instance => _instance.Value;

        public string CurrentVersion => "1.0.0";

        public event Action<UpdateManifest>? OnUpdateAvailable;

        private readonly HttpClient _httpClient = new() { Timeout = TimeSpan.FromSeconds(15) };
        private CancellationTokenSource? _checkCts;

        public void StartAutoCheckInterval()
        {
            _checkCts?.Cancel();
            _checkCts = new CancellationTokenSource();
            _ = RunUpdateLoopAsync(_checkCts.Token);
        }

        private async Task RunUpdateLoopAsync(CancellationToken token)
        {
            while (!token.IsCancellationRequested)
            {
                try
                {
                    await CheckForUpdatesAsync(token);
                }
                catch (Exception ex)
                {
                    LoggingService.Instance.Warn(LogCategory.System, "Auto-update background check failed", ex.Message);
                }

                // Check every 4 hours
                await Task.Delay(TimeSpan.FromHours(4), token);
            }
        }

        public async Task<UpdateManifest?> CheckForUpdatesAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                var serverUrl = ConfigService.Instance.Current.ServerUrl.TrimEnd('/');
                var manifestUrl = $"{serverUrl}/api/v1/agent/version";

                using var response = await _httpClient.GetAsync(manifestUrl, cancellationToken);
                if (!response.IsSuccessStatusCode) return null;

                var json = await response.Content.ReadAsStringAsync(cancellationToken);
                var manifest = JsonSerializer.Deserialize<UpdateManifest>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (manifest != null && IsNewerVersion(manifest.LatestVersion, CurrentVersion))
                {
                    LoggingService.Instance.Info(LogCategory.System, $"Update available: v{manifest.LatestVersion} (Current: v{CurrentVersion})");
                    OnUpdateAvailable?.Invoke(manifest);
                    return manifest;
                }
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Warn(LogCategory.System, "Failed to query update manifest", ex.Message);
            }

            return null;
        }

        public async Task<bool> VerifyFileChecksumAsync(string filePath, string expectedSha256)
        {
            if (!File.Exists(filePath)) return false;

            using var sha = SHA256.Create();
            await using var stream = File.OpenRead(filePath);
            var hashBytes = await sha.ComputeHashAsync(stream);
            var computedHash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();

            return string.Equals(computedHash, expectedSha256?.ToLowerInvariant(), StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsNewerVersion(string latest, string current)
        {
            if (Version.TryParse(latest, out var vLatest) && Version.TryParse(current, out var vCurrent))
            {
                return vLatest > vCurrent;
            }
            return false;
        }
    }
}
