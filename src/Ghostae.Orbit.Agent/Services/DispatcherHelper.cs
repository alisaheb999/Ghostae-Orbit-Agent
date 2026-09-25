using System;
using System.Windows;

namespace Ghostae.Orbit.Agent.Services
{
    public static class DispatcherHelper
    {
        public static void RunOnUI(Action action) => SafeInvoke(action);

        public static void SafeInvoke(Action action)
        {
            var app = Application.Current;
            if (app?.Dispatcher == null || app.Dispatcher.HasShutdownStarted) return;

            try
            {
                if (app.Dispatcher.CheckAccess())
                {
                    action();
                }
                else if (app.Dispatcher.Thread.IsAlive)
                {
                    app.Dispatcher.BeginInvoke(action);
                }
            }
            catch
            {
                // Suppress if dispatcher is shutting down or thread died
            }
        }
    }
}
