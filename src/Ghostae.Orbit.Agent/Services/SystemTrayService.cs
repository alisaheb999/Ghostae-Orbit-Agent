using System;
using System.Drawing;
using System.Windows;
using System.Windows.Forms;
using Ghostae.Orbit.Agent.Models;

namespace Ghostae.Orbit.Agent.Services
{
    public class SystemTrayService : IDisposable
    {
        private static readonly Lazy<SystemTrayService> _instance = new(() => new SystemTrayService());
        public static SystemTrayService Instance => _instance.Value;

        private NotifyIcon? _notifyIcon;
        private ContextMenuStrip? _contextMenu;
        private ToolStripMenuItem? _statusItem;
        private ToolStripMenuItem? _pauseItem;

        public event Action? OnOpenRequested;
        public event Action? OnSettingsRequested;
        public event Action? OnLogsRequested;

        public void Initialize()
        {
            _contextMenu = new ContextMenuStrip();

            var titleItem = new ToolStripMenuItem("Ghostae Orbit Agent")
            {
                Enabled = false,
                Font = new Font(System.Drawing.SystemFonts.DefaultFont, System.Drawing.FontStyle.Bold)
            };
            _contextMenu.Items.Add(titleItem);
            _contextMenu.Items.Add(new ToolStripSeparator());

            var openItem = new ToolStripMenuItem("Open Dashboard", null, (s, e) => OnOpenRequested?.Invoke());
            _statusItem = new ToolStripMenuItem("Status: Disconnected", null, (s, e) => ShowStatusNotification());
            _pauseItem = new ToolStripMenuItem("Pause Agent", null, (s, e) => TogglePause());
            var settingsItem = new ToolStripMenuItem("Settings", null, (s, e) => OnSettingsRequested?.Invoke());
            var logsItem = new ToolStripMenuItem("View Logs", null, (s, e) => OnLogsRequested?.Invoke());
            var quitItem = new ToolStripMenuItem("Quit", null, (s, e) => System.Windows.Application.Current.Shutdown());

            _contextMenu.Items.Add(openItem);
            _contextMenu.Items.Add(_statusItem);
            _contextMenu.Items.Add(_pauseItem);
            _contextMenu.Items.Add(new ToolStripSeparator());
            _contextMenu.Items.Add(settingsItem);
            _contextMenu.Items.Add(logsItem);
            _contextMenu.Items.Add(new ToolStripSeparator());
            _contextMenu.Items.Add(quitItem);

            _notifyIcon = new NotifyIcon
            {
                Icon = CreateStatusIcon(System.Drawing.Color.Gray),
                Text = "Ghostae Orbit Agent",
                Visible = true,
                ContextMenuStrip = _contextMenu
            };

            _notifyIcon.DoubleClick += (s, e) => OnOpenRequested?.Invoke();

            // Hook connection and task events
            OrbitWebSocketClient.Instance.OnConnectionStateChanged += UpdateTrayStatus;
            TaskExecutionEngine.Instance.OnTaskUpdated += (item) =>
            {
                if (item.State == TaskExecutionState.Running)
                {
                    UpdateTrayWorking(item.DisplayName);
                }
            };
        }

        public void UpdateStatus(string statusText, System.Drawing.Color color)
        {
            if (_notifyIcon != null)
            {
                _notifyIcon.Icon = CreateStatusIcon(color);
                _notifyIcon.Text = $"Ghostae Orbit Agent ({statusText})";
            }
            if (_statusItem != null)
            {
                _statusItem.Text = $"Status: {statusText}";
            }
        }

        private void UpdateTrayStatus(ConnectionState state)
        {
            switch (state)
            {
                case ConnectionState.Connected:
                    UpdateStatus("Connected", System.Drawing.Color.FromArgb(16, 185, 129)); // Green
                    break;
                case ConnectionState.Connecting:
                    UpdateStatus("Connecting...", System.Drawing.Color.FromArgb(245, 158, 11)); // Amber
                    break;
                case ConnectionState.Disconnected:
                    UpdateStatus("Disconnected", System.Drawing.Color.FromArgb(235, 0, 41)); // Red
                    break;
                case ConnectionState.Error:
                    UpdateStatus("Error", System.Drawing.Color.FromArgb(235, 0, 41));
                    break;
            }
        }

        private void UpdateTrayWorking(string taskName)
        {
            if (_notifyIcon != null)
            {
                _notifyIcon.Icon = CreateStatusIcon(System.Drawing.Color.FromArgb(59, 130, 246)); // Blue
                _notifyIcon.Text = $"Ghostae Orbit Agent: {taskName}";
            }
            if (_statusItem != null)
            {
                _statusItem.Text = $"Working: {taskName}";
            }
        }

        private void TogglePause()
        {
            var client = OrbitWebSocketClient.Instance;
            client.IsPaused = !client.IsPaused;
            if (_pauseItem != null)
            {
                _pauseItem.Text = client.IsPaused ? "Resume Agent" : "Pause Agent";
            }
            if (client.IsPaused)
            {
                UpdateStatus("Paused", System.Drawing.Color.Orange);
            }
            else
            {
                client.Reconnect();
            }
        }

        public void ShowNotification(string title, string message, bool isError = false)
        {
            _notifyIcon?.ShowBalloonTip(
                4000,
                title,
                message,
                isError ? ToolTipIcon.Error : ToolTipIcon.Info
            );
        }

        private void ShowStatusNotification()
        {
            var state = OrbitWebSocketClient.Instance.State;
            _notifyIcon?.ShowBalloonTip(3000, "Ghostae Orbit Agent", $"Connection State: {state}\nActive Task: {TaskExecutionEngine.Instance.CurrentActiveTask?.DisplayName ?? "None"}", ToolTipIcon.Info);
        }

        private static Icon CreateStatusIcon(System.Drawing.Color dotColor)
        {
            // Programmatically draw a clean modern status orb icon 32x32
            using var bmp = new Bitmap(32, 32);
            using (var g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                g.Clear(System.Drawing.Color.Transparent);

                // Outer circle (White/Light)
                using (var brush = new SolidBrush(System.Drawing.Color.White))
                {
                    g.FillEllipse(brush, 2, 2, 28, 28);
                }
                using (var pen = new Pen(System.Drawing.Color.FromArgb(220, 220, 220), 1.5f))
                {
                    g.DrawEllipse(pen, 2, 2, 28, 28);
                }

                // Inner status dot
                using (var brush = new SolidBrush(dotColor))
                {
                    g.FillEllipse(brush, 8, 8, 16, 16);
                }
            }

            var hIcon = bmp.GetHicon();
            return Icon.FromHandle(hIcon);
        }

        public void Dispose()
        {
            _notifyIcon?.Dispose();
            _contextMenu?.Dispose();
        }
    }
}
