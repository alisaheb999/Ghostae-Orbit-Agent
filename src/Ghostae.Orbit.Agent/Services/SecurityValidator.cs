using System;
using System.Collections.Generic;
using System.IO;
using Ghostae.Orbit.Agent.Models;

namespace Ghostae.Orbit.Agent.Services
{
    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public string? Reason { get; set; }

        public static ValidationResult Ok() => new ValidationResult { IsValid = true };
        public static ValidationResult Reject(string reason) => new ValidationResult { IsValid = false, Reason = reason };
    }

    public static class SecurityValidator
    {
        private static readonly HashSet<string> AllowedTools = new(StringComparer.OrdinalIgnoreCase)
        {
            "desktop_status",
            "screenshot",
            "screen_record",
            "file_manager",
            "adobe_status",
            "adobe_project",
            "render",
            "power"
        };

        private static readonly HashSet<string> AllowedFileOperations = new(StringComparer.OrdinalIgnoreCase)
        {
            "list",
            "find",
            "copy",
            "move",
            "rename",
            "create_folder"
        };

        private static readonly HashSet<string> AllowedAdobeProjectOperations = new(StringComparer.OrdinalIgnoreCase)
        {
            "open",
            "save",
            "status"
        };

        private static readonly HashSet<string> AllowedRenderOperations = new(StringComparer.OrdinalIgnoreCase)
        {
            "start",
            "status",
            "cancel",
            "verify"
        };

        private static readonly HashSet<string> AllowedPowerOperations = new(StringComparer.OrdinalIgnoreCase)
        {
            "shutdown",
            "restart",
            "cancel_shutdown",
            "status"
        };

        public static bool ValidateHmacSignature(string payload, string expectedSignature, string secretKey)
        {
            if (string.IsNullOrEmpty(payload) || string.IsNullOrEmpty(expectedSignature) || string.IsNullOrEmpty(secretKey))
            {
                return false;
            }

            try
            {
                using var hmac = new System.Security.Cryptography.HMACSHA256(System.Text.Encoding.UTF8.GetBytes(secretKey));
                var hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(payload));
                var computedSignature = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
                return string.Equals(computedSignature, expectedSignature.ToLowerInvariant(), StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        public static ValidationResult ValidateCommand(CommandRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.TaskId))
            {
                return ValidationResult.Reject("Missing or empty task_id");
            }

            if (string.IsNullOrWhiteSpace(request.Tool))
            {
                return ValidationResult.Reject("Missing or empty tool name");
            }

            // Strict Tool Allowlist
            if (!AllowedTools.Contains(request.Tool))
            {
                LoggingService.Instance.Warn(LogCategory.Errors, $"Security rejection: Tool '{request.Tool}' is not in the allowlist");
                return ValidationResult.Reject($"Tool '{request.Tool}' is not supported or recognized. REJECTED.");
            }

            var config = ConfigService.Instance.Current;

            // Permission Checks
            switch (request.Tool.ToLowerInvariant())
            {
                case "screenshot":
                    if (!config.AllowScreenshots)
                        return ValidationResult.Reject("Permission denied: Screenshots are disabled in agent settings");
                    break;

                case "screen_record":
                    if (!config.AllowRecording)
                        return ValidationResult.Reject("Permission denied: Screen recording is disabled in agent settings");
                    break;

                case "file_manager":
                    if (!config.AllowFileOperations)
                        return ValidationResult.Reject("Permission denied: File operations are disabled in agent settings");
                    break;

                case "adobe_status":
                case "adobe_project":
                    if (!config.AllowAdobeControl)
                        return ValidationResult.Reject("Permission denied: Adobe control is disabled in agent settings");
                    break;

                case "power":
                    if (!config.AllowPowerControl)
                        return ValidationResult.Reject("Permission denied: Power control is disabled in agent settings");
                    break;
            }

            return ValidationResult.Ok();
        }

        public static bool IsPathSafe(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) return false;

            try
            {
                var fullPath = Path.GetFullPath(path);

                // Prevent operating anywhere inside Windows directory
                var winDir = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
                if (fullPath.StartsWith(winDir, StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

                // Prevent persistence via Startup folders
                var startupDir = Environment.GetFolderPath(Environment.SpecialFolder.Startup);
                var commonStartupDir = Environment.GetFolderPath(Environment.SpecialFolder.CommonStartup);
                if ((!string.IsNullOrEmpty(startupDir) && fullPath.StartsWith(startupDir, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(commonStartupDir) && fullPath.StartsWith(commonStartupDir, StringComparison.OrdinalIgnoreCase)))
                {
                    return false;
                }

                // Prevent drive root wipe
                var root = Path.GetPathRoot(fullPath);
                if (string.Equals(fullPath.TrimEnd('\\', '/'), root?.TrimEnd('\\', '/'), StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
