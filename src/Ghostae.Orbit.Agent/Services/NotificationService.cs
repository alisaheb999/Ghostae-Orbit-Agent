using System;
using System.IO;
using Ghostae.Orbit.Agent.Models;

namespace Ghostae.Orbit.Agent.Services
{
    public class NotificationService
    {
        private static readonly Lazy<NotificationService> _instance = new(() => new NotificationService());
        public static NotificationService Instance => _instance.Value;

        public void ShowNotification(string title, string message, bool isError = false)
        {
            try
            {
                // Dispatch notification via System Tray balloon / notification banner
                SystemTrayService.Instance.ShowNotification(title, message, isError);
                LoggingService.Instance.Info(LogCategory.System, $"Notification Dispatched: [{title}] {message}");
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Warn(LogCategory.System, "Failed to display toast notification", ex.Message);
            }
        }

        public void NotifyRenderCompleted(string projectName, string outputPath)
        {
            ShowNotification(
                "Ghostae Orbit - Render Completed",
                $"Project '{projectName}' finished rendering successfully. Output saved to {Path.GetFileName(outputPath)}."
            );
        }

        public void NotifyTaskFailed(string taskName, string reason)
        {
            ShowNotification(
                "Ghostae Orbit - Task Alert",
                $"Task '{taskName}' encountered an issue: {reason}",
                isError: true
            );
        }
    }
}
