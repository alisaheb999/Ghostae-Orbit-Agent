using System;
using System.Linq;
using System.Threading;
using System.Windows;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;

namespace Ghostae.Orbit.Agent
{
    public partial class App : Application
    {
        private MainWindow? _mainWindow;
        private static Mutex? _singleInstanceMutex;

        private void OnStartup(object sender, StartupEventArgs e)
        {
            try
            {
                Native.Win32.SetProcessDpiAwarenessContext(Native.Win32.DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
            }
            catch { }

            const string mutexName = @"Global\GhostaeOrbitAgent_SingleInstance_Mutex";
            _singleInstanceMutex = new Mutex(true, mutexName, out bool createdNew);
            if (!createdNew)
            {
                // Another instance is already running
                Shutdown();
                return;
            }

            // Catch unhandled exceptions to prevent silent crashes
            AppDomain.CurrentDomain.UnhandledException += (s, args) =>
            {
                if (args.ExceptionObject is Exception ex)
                {
                    CrashReporterService.Instance.HandleException(ex, "AppDomain.UnhandledException");
                }
            };

            DispatcherUnhandledException += (s, args) =>
            {
                CrashReporterService.Instance.HandleException(args.Exception, "DispatcherUnhandledException");
                args.Handled = true; // Prevent crash
            };

            LoggingService.Instance.Info(LogCategory.System, "Ghostae Orbit Agent starting up (v1.0.0)");

            // Start Auto-Updater Background Service
            AutoUpdateService.Instance.StartAutoCheckInterval();

            // Initialize System Tray
            SystemTrayService.Instance.Initialize();
            SystemTrayService.Instance.OnOpenRequested += BringToForeground;
            SystemTrayService.Instance.OnSettingsRequested += () =>
            {
                BringToForeground();
                _mainWindow?.NavigateTo("Settings");
            };
            SystemTrayService.Instance.OnLogsRequested += () =>
            {
                BringToForeground();
                _mainWindow?.NavigateTo("Logs");
            };

            // Start outbound WebSocket connection
            OrbitWebSocketClient.Instance.Start();

            // Check if launched in background
            bool startInBackground = e.Args.Any(a => string.Equals(a, "--background", StringComparison.OrdinalIgnoreCase));

            _mainWindow = new MainWindow();

            if (!startInBackground)
            {
                _mainWindow.Show();
            }
            else
            {
                LoggingService.Instance.Info(LogCategory.System, "Agent started in background tray mode");
            }
        }

        public void BringToForeground()
        {
            if (_mainWindow == null)
            {
                _mainWindow = new MainWindow();
            }

            if (!_mainWindow.IsVisible)
            {
                _mainWindow.Show();
            }

            if (_mainWindow.WindowState == WindowState.Minimized)
            {
                _mainWindow.WindowState = WindowState.Normal;
            }

            _mainWindow.Activate();
            _mainWindow.Focus();
        }

        protected override void OnExit(ExitEventArgs e)
        {
            OrbitWebSocketClient.Instance.Stop();
            SystemTrayService.Instance.Dispose();
            try { _singleInstanceMutex?.ReleaseMutex(); } catch { }
            _singleInstanceMutex?.Dispose();
            base.OnExit(e);
        }
    }
}
