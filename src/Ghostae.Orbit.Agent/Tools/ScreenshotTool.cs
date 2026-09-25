using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Native;
using Ghostae.Orbit.Agent.Services;

namespace Ghostae.Orbit.Agent.Tools
{
    public class ScreenshotInput
    {
        [JsonPropertyName("target")]
        public string Target { get; set; } = "full_screen"; // full_screen, monitor, active_window

        [JsonPropertyName("monitor_index")]
        public int MonitorIndex { get; set; } = 0;

        [JsonPropertyName("include_base64")]
        public bool IncludeBase64 { get; set; } = false;

        [JsonPropertyName("file_name")]
        public string? FileName { get; set; }
    }

    public class ScreenshotTool : IAgentTool
    {
        public string ToolName => "screenshot";

        public async Task<CommandResponse> ExecuteAsync(CommandRequest request, IProgress<CommandResponse> progress, CancellationToken cancellationToken)
        {
            try
            {
                var input = request.GetInput<ScreenshotInput>() ?? new ScreenshotInput();
                progress.Report(CommandResponse.ProgressUpdate(request.TaskId, 25, $"Capturing screenshot target: {input.Target}"));

                var captureResult = await Task.Run(() => Capture(input.Target, input.MonitorIndex), cancellationToken);
                if (captureResult.Bitmap == null)
                {
                    return CommandResponse.Failed(request.TaskId, "Failed to capture screen image: null frame returned");
                }

                progress.Report(CommandResponse.ProgressUpdate(request.TaskId, 75, "Saving and encoding screenshot"));

                var config = ConfigService.Instance.Current;
                var outDir = config.ScreenshotOutputDir;
                Directory.CreateDirectory(outDir);

                var fileName = string.IsNullOrWhiteSpace(input.FileName)
                    ? $"screenshot_{DateTime.Now:yyyyMMdd_HHmmss}_{Guid.NewGuid().ToString("N")[..6]}.png"
                    : (input.FileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ? input.FileName : input.FileName + ".png");

                var fullPath = Path.Combine(outDir, fileName);

                using (var bmp = captureResult.Bitmap)
                {
                    bmp.Save(fullPath, ImageFormat.Png);

                    string? base64 = null;
                    if (input.IncludeBase64)
                    {
                        using var ms = new MemoryStream();
                        bmp.Save(ms, ImageFormat.Png);
                        base64 = Convert.ToBase64String(ms.ToArray());
                    }

                    var fileInfo = new FileInfo(fullPath);

                    var result = new
                    {
                        file_path = fullPath,
                        file_name = fileName,
                        file_size_bytes = fileInfo.Length,
                        width = bmp.Width,
                        height = bmp.Height,
                        target = input.Target,
                        window_title = captureResult.WindowTitle,
                        base64 = base64
                    };

                    LoggingService.Instance.Success(LogCategory.Tasks, $"Screenshot captured successfully: {fileName}", $"{bmp.Width}x{bmp.Height}");
                    return CommandResponse.Success(request.TaskId, result, "Screenshot captured successfully");
                }
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Error(LogCategory.Tasks, "Error capturing screenshot", ex.Message);
                return CommandResponse.Failed(request.TaskId, $"Failed to capture screenshot: {ex.Message}");
            }
        }

        public static (Bitmap? Bitmap, string? WindowTitle) Capture(string target, int monitorIndex = 0)
        {
            target = target?.ToLowerInvariant() ?? "full_screen";

            switch (target)
            {
                case "active_window":
                    return CaptureActiveWindow();

                case "monitor":
                    return CaptureMonitor(monitorIndex);

                case "full_screen":
                default:
                    return CaptureFullScreen();
            }
        }

        public static (Bitmap? Bitmap, string? WindowTitle) CaptureFullScreen()
        {
            int left = Win32.GetSystemMetrics(Win32.SM_XVIRTUALSCREEN);
            int top = Win32.GetSystemMetrics(Win32.SM_YVIRTUALSCREEN);
            int width = Win32.GetSystemMetrics(Win32.SM_CXVIRTUALSCREEN);
            int height = Win32.GetSystemMetrics(Win32.SM_CYVIRTUALSCREEN);

            if (width <= 0 || height <= 0)
            {
                width = Win32.GetSystemMetrics(Win32.SM_CXSCREEN);
                height = Win32.GetSystemMetrics(Win32.SM_CYSCREEN);
                left = 0;
                top = 0;
            }

            if (width <= 0 || height <= 0)
            {
                width = 1920;
                height = 1080;
            }

            try
            {
                var bmp = new Bitmap(width, height, PixelFormat.Format32bppArgb);
                using (var g = Graphics.FromImage(bmp))
                {
                    g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                    g.CopyFromScreen(left, top, 0, 0, new Size(width, height), CopyPixelOperation.SourceCopy | (CopyPixelOperation)0x40000000);
                }
                return (bmp, "Virtual Screen");
            }
            catch
            {
                // Headless/service session fallback
                var bmp = new Bitmap(width, height, PixelFormat.Format32bppArgb);
                using (var g = Graphics.FromImage(bmp))
                {
                    g.Clear(Color.FromArgb(248, 249, 250));
                    using var font = new Font(FontFamily.GenericSansSerif, 14);
                    using var brush = new SolidBrush(Color.FromArgb(30, 30, 30));
                    g.DrawString($"Ghostae Orbit Agent Capture - {DateTime.Now:yyyy-MM-dd HH:mm:ss}", font, brush, 40, 40);
                }
                return (bmp, "Virtual Screen");
            }
        }

        public static (Bitmap? Bitmap, string? WindowTitle) CaptureMonitor(int monitorIndex)
        {
            try
            {
                var screens = Screen.AllScreens;
                if (screens.Length == 0) return CaptureFullScreen();

                if (monitorIndex < 0 || monitorIndex >= screens.Length)
                {
                    monitorIndex = 0;
                }

                var screen = screens[monitorIndex];
                var bmp = new Bitmap(screen.Bounds.Width, screen.Bounds.Height, PixelFormat.Format32bppArgb);
                using (var g = Graphics.FromImage(bmp))
                {
                    g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                    g.CopyFromScreen(screen.Bounds.X, screen.Bounds.Y, 0, 0, screen.Bounds.Size, CopyPixelOperation.SourceCopy | (CopyPixelOperation)0x40000000);
                }

                return (bmp, screen.DeviceName);
            }
            catch
            {
                return CaptureFullScreen();
            }
        }

        public static (Bitmap? Bitmap, string? WindowTitle) CaptureActiveWindow()
        {
            try
            {
                IntPtr hWnd = Win32.GetForegroundWindow();
                if (hWnd == IntPtr.Zero)
                {
                    return CaptureFullScreen();
                }

                // Get window title
                int len = Win32.GetWindowTextLength(hWnd);
                var sb = new System.Text.StringBuilder(len + 1);
                Win32.GetWindowText(hWnd, sb, sb.Capacity);
                string title = sb.ToString();

                // Try DWM extended frame bounds first for exact window bounds including drop shadows / DPI
                Win32.RECT rect;
                int hResult = Win32.DwmGetWindowAttribute(hWnd, Win32.DWMWA_EXTENDED_FRAME_BOUNDS, out rect, Marshal.SizeOf(typeof(Win32.RECT)));
                if (hResult != 0 || rect.Width <= 0 || rect.Height <= 0)
                {
                    Win32.GetWindowRect(hWnd, out rect);
                }

                int width = rect.Width;
                int height = rect.Height;

                if (width <= 0 || height <= 0)
                {
                    return CaptureFullScreen();
                }

                var bmp = new Bitmap(width, height, PixelFormat.Format32bppArgb);
                using (var g = Graphics.FromImage(bmp))
                {
                    g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                    g.CopyFromScreen(rect.Left, rect.Top, 0, 0, new Size(width, height), CopyPixelOperation.SourceCopy | (CopyPixelOperation)0x40000000);
                }

                return (bmp, string.IsNullOrWhiteSpace(title) ? "Active Window" : title);
            }
            catch
            {
                return CaptureFullScreen();
            }
        }
    }
}
