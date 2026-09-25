using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;

namespace Ghostae.Orbit.Agent.Tools
{
    public class ScreenRecordInput
    {
        [JsonPropertyName("operation")]
        public string Operation { get; set; } = "status"; // start, stop, status

        [JsonPropertyName("target")]
        public string Target { get; set; } = "full_screen"; // full_screen, monitor, window

        [JsonPropertyName("quality")]
        public string Quality { get; set; } = "High"; // Standard, High

        [JsonPropertyName("monitor_index")]
        public int MonitorIndex { get; set; } = 0;

        [JsonPropertyName("max_duration_seconds")]
        public int? MaxDurationSeconds { get; set; }
    }

    public class ScreenRecordTool : IAgentTool
    {
        public string ToolName => "screen_record";

        private static readonly object _syncLock = new();
        private static bool _isRecording = false;
        private static CancellationTokenSource? _recordCts;
        private static Task? _recordTask;
        private static DateTime _recordingStartTime;
        private static string _currentRecordingPath = string.Empty;
        private static long _recordedFrames = 0;
        private static string _activeTarget = "full_screen";
        private static string _activeQuality = "High";

        public static bool IsRecording => _isRecording;
        public static TimeSpan ElapsedTime => _isRecording ? (DateTime.Now - _recordingStartTime) : TimeSpan.Zero;
        public static string CurrentFilePath => _currentRecordingPath;
        public static long RecordedFrames => _recordedFrames;

        public async Task<CommandResponse> ExecuteAsync(CommandRequest request, IProgress<CommandResponse> progress, CancellationToken cancellationToken)
        {
            try
            {
                var input = request.GetInput<ScreenRecordInput>() ?? new ScreenRecordInput();
                var op = input.Operation?.ToLowerInvariant() ?? "status";

                switch (op)
                {
                    case "start":
                        return await StartRecordingAsync(request.TaskId, input, progress);

                    case "stop":
                        return await StopRecordingAsync(request.TaskId, progress);

                    case "status":
                    default:
                        return GetStatusResponse(request.TaskId);
                }
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Error(LogCategory.Recording, "Screen recording operation failed", ex.Message);
                return CommandResponse.Failed(request.TaskId, $"Screen recording error: {ex.Message}");
            }
        }

        private Task<CommandResponse> StartRecordingAsync(string taskId, ScreenRecordInput input, IProgress<CommandResponse> progress)
        {
            lock (_syncLock)
            {
                if (_isRecording)
                {
                    return Task.FromResult(CommandResponse.Failed(taskId, "A screen recording is already in progress"));
                }

                var config = ConfigService.Instance.Current;
                var outDir = config.RecordingOutputDir;
                Directory.CreateDirectory(outDir);

                var fileName = $"recording_{DateTime.Now:yyyyMMdd_HHmmss}.avi";
                _currentRecordingPath = Path.Combine(outDir, fileName);
                _activeTarget = input.Target;
                _activeQuality = input.Quality;
                _recordedFrames = 0;
                _recordingStartTime = DateTime.Now;
                _isRecording = true;

                _recordCts = new CancellationTokenSource();
                var token = _recordCts.Token;

                // Background frame capture task
                _recordTask = Task.Run(() => CaptureLoop(_currentRecordingPath, input, token), token);

                LoggingService.Instance.Info(LogCategory.Recording, $"Screen recording started: {fileName}", $"Target: {input.Target}, Quality: {input.Quality}");
                progress.Report(CommandResponse.ProgressUpdate(taskId, 10, "Recording active", "recording"));

                var result = new
                {
                    status = "recording",
                    file_path = _currentRecordingPath,
                    target = _activeTarget,
                    quality = _activeQuality,
                    start_time = _recordingStartTime.ToString("o")
                };

                return Task.FromResult(CommandResponse.Success(taskId, result, "Screen recording started successfully"));
            }
        }

        private async Task<CommandResponse> StopRecordingAsync(string taskId, IProgress<CommandResponse> progress)
        {
            string outPath;
            TimeSpan duration;
            long frames;

            lock (_syncLock)
            {
                if (!_isRecording)
                {
                    return CommandResponse.Failed(taskId, "No screen recording is currently active");
                }

                _recordCts?.Cancel();
                outPath = _currentRecordingPath;
                duration = DateTime.Now - _recordingStartTime;
                frames = _recordedFrames;
            }

            progress.Report(CommandResponse.ProgressUpdate(taskId, 50, "Finalizing recording file"));

            if (_recordTask != null)
            {
                try
                {
                    await Task.WhenAny(_recordTask, Task.Delay(4000));
                }
                catch { }
            }

            lock (_syncLock)
            {
                _isRecording = false;
                _recordCts?.Dispose();
                _recordCts = null;
                _recordTask = null;
            }

            long fileSize = 0;
            if (File.Exists(outPath))
            {
                fileSize = new FileInfo(outPath).Length;
            }

            LoggingService.Instance.Success(LogCategory.Recording, $"Screen recording stopped: {Path.GetFileName(outPath)}", $"Duration: {duration:mm\\:ss}, Size: {fileSize / 1024} KB");

            var result = new
            {
                status = "stopped",
                file_path = outPath,
                file_name = Path.GetFileName(outPath),
                file_size_bytes = fileSize,
                duration_seconds = Math.Round(duration.TotalSeconds, 1),
                duration_formatted = duration.ToString(@"hh\:mm\:ss"),
                frame_count = frames
            };

            return CommandResponse.Success(taskId, result, "Screen recording stopped and saved successfully");
        }

        private static CommandResponse GetStatusResponse(string taskId)
        {
            lock (_syncLock)
            {
                long fileSize = 0;
                if (_isRecording && File.Exists(_currentRecordingPath))
                {
                    fileSize = new FileInfo(_currentRecordingPath).Length;
                }

                var result = new
                {
                    is_recording = _isRecording,
                    current_file = _isRecording ? _currentRecordingPath : null,
                    duration_seconds = _isRecording ? Math.Round((DateTime.Now - _recordingStartTime).TotalSeconds, 1) : 0,
                    frames_captured = _recordedFrames,
                    file_size_bytes = fileSize,
                    target = _activeTarget,
                    quality = _activeQuality
                };

                return CommandResponse.Success(taskId, result, _isRecording ? "Recording in progress" : "No active recording");
            }
        }

        private struct AviIndexEntry
        {
            public uint CkId;
            public uint Flags;
            public uint ChunkOffset;
            public uint ChunkLength;
        }

        private static void CaptureLoop(string outputPath, ScreenRecordInput input, CancellationToken cancellationToken)
        {
            int fps = string.Equals(input.Quality, "High", StringComparison.OrdinalIgnoreCase) ? 30 : 15;
            int frameIntervalMs = 1000 / fps;

            try
            {
                // Grab an initial frame to resolve dimensions
                var (initBmp, _) = ScreenshotTool.Capture(input.Target, input.MonitorIndex);
                if (initBmp == null)
                {
                    LoggingService.Instance.Error(LogCategory.Recording, "Could not capture initial screen frame");
                    return;
                }

                int width = initBmp.Width;
                int height = initBmp.Height;

                using var fs = new FileStream(outputPath, FileMode.Create, FileAccess.ReadWrite, FileShare.ReadWrite);
                using var bw = new System.IO.BinaryWriter(fs);

                // 1. RIFF Header
                bw.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));
                long riffSizePos = fs.Position;
                bw.Write((uint)0); // Placeholder
                bw.Write(System.Text.Encoding.ASCII.GetBytes("AVI "));

                // 2. hdrl LIST
                bw.Write(System.Text.Encoding.ASCII.GetBytes("LIST"));
                long hdrlSizePos = fs.Position;
                bw.Write((uint)0); // Placeholder
                long hdrlStart = fs.Position;
                bw.Write(System.Text.Encoding.ASCII.GetBytes("hdrl"));

                // avih chunk
                bw.Write(System.Text.Encoding.ASCII.GetBytes("avih"));
                bw.Write((uint)56);
                uint microSecPerFrame = (uint)(1000000 / fps);
                bw.Write(microSecPerFrame);
                bw.Write((uint)(width * height * 3));
                bw.Write((uint)0);
                bw.Write((uint)0x10); // AVIF_HASINDEX
                long totalFramesPos = fs.Position;
                bw.Write((uint)0); // dwTotalFrames placeholder
                bw.Write((uint)0);
                bw.Write((uint)1); // streams
                bw.Write((uint)(width * height * 3));
                bw.Write((uint)width);
                bw.Write((uint)height);
                bw.Write((uint)0);
                bw.Write((uint)0);
                bw.Write((uint)0);
                bw.Write((uint)0);

                // strl LIST
                bw.Write(System.Text.Encoding.ASCII.GetBytes("LIST"));
                long strlSizePos = fs.Position;
                bw.Write((uint)0); // Placeholder
                long strlStart = fs.Position;
                bw.Write(System.Text.Encoding.ASCII.GetBytes("strl"));

                // strh chunk
                bw.Write(System.Text.Encoding.ASCII.GetBytes("strh"));
                bw.Write((uint)56);
                bw.Write(System.Text.Encoding.ASCII.GetBytes("vids"));
                bw.Write(System.Text.Encoding.ASCII.GetBytes("MJPG"));
                bw.Write((uint)0);
                bw.Write((ushort)0);
                bw.Write((ushort)0);
                bw.Write((uint)0);
                bw.Write((uint)1);
                bw.Write((uint)fps);
                bw.Write((uint)0);
                long strhLengthPos = fs.Position;
                bw.Write((uint)0); // dwLength placeholder
                bw.Write((uint)(width * height * 3));
                bw.Write((uint)10000);
                bw.Write((uint)0);
                bw.Write((short)0);
                bw.Write((short)0);
                bw.Write((short)width);
                bw.Write((short)height);

                // strf chunk (BITMAPINFOHEADER)
                bw.Write(System.Text.Encoding.ASCII.GetBytes("strf"));
                bw.Write((uint)40);
                bw.Write((uint)40);
                bw.Write((int)width);
                bw.Write((int)height);
                bw.Write((ushort)1);
                bw.Write((ushort)24);
                bw.Write(System.Text.Encoding.ASCII.GetBytes("MJPG"));
                bw.Write((uint)(width * height * 3));
                bw.Write((int)0);
                bw.Write((int)0);
                bw.Write((uint)0);
                bw.Write((uint)0);

                // Close strl LIST
                long strlEnd = fs.Position;
                fs.Position = strlSizePos;
                bw.Write((uint)(strlEnd - strlStart));
                fs.Position = strlEnd;

                // Close hdrl LIST
                long hdrlEnd = fs.Position;
                fs.Position = hdrlSizePos;
                bw.Write((uint)(hdrlEnd - hdrlStart));
                fs.Position = hdrlEnd;

                // 3. movi LIST
                bw.Write(System.Text.Encoding.ASCII.GetBytes("LIST"));
                long moviSizePos = fs.Position;
                bw.Write((uint)0); // Placeholder
                long moviStart = fs.Position;
                bw.Write(System.Text.Encoding.ASCII.GetBytes("movi"));

                var indexEntries = new System.Collections.Generic.List<AviIndexEntry>();
                long frameCount = 0;

                // Write first frame
                using (initBmp)
                {
                    using var ms = new MemoryStream();
                    initBmp.Save(ms, ImageFormat.Jpeg);
                    var jpegBytes = ms.ToArray();

                    uint chunkOffset = (uint)(fs.Position - (moviStart + 4));
                    bw.Write(System.Text.Encoding.ASCII.GetBytes("00dc"));
                    bw.Write((uint)jpegBytes.Length);
                    bw.Write(jpegBytes);
                    if (jpegBytes.Length % 2 != 0) bw.Write((byte)0);

                    indexEntries.Add(new AviIndexEntry
                    {
                        CkId = 0x63643030,
                        Flags = 0x10,
                        ChunkOffset = chunkOffset,
                        ChunkLength = (uint)jpegBytes.Length
                    });
                    frameCount++;
                    Interlocked.Increment(ref _recordedFrames);
                }

                var sw = Stopwatch.StartNew();
                while (!cancellationToken.IsCancellationRequested)
                {
                    var loopStart = sw.ElapsedMilliseconds;

                    var (bmp, _) = ScreenshotTool.Capture(input.Target, input.MonitorIndex);
                    if (bmp != null)
                    {
                        using (bmp)
                        {
                            using var ms = new MemoryStream();
                            bmp.Save(ms, ImageFormat.Jpeg);
                            var bytes = ms.ToArray();

                            uint chunkOffset = (uint)(fs.Position - (moviStart + 4));
                            bw.Write(System.Text.Encoding.ASCII.GetBytes("00dc"));
                            bw.Write((uint)bytes.Length);
                            bw.Write(bytes);
                            if (bytes.Length % 2 != 0) bw.Write((byte)0);

                            indexEntries.Add(new AviIndexEntry
                            {
                                CkId = 0x63643030,
                                Flags = 0x10,
                                ChunkOffset = chunkOffset,
                                ChunkLength = (uint)bytes.Length
                            });

                            frameCount++;
                            Interlocked.Increment(ref _recordedFrames);
                        }
                    }

                    if (input.MaxDurationSeconds.HasValue && sw.Elapsed.TotalSeconds >= input.MaxDurationSeconds.Value)
                    {
                        break;
                    }

                    var elapsedLoop = (int)(sw.ElapsedMilliseconds - loopStart);
                    var delay = frameIntervalMs - elapsedLoop;
                    if (delay > 0)
                    {
                        Thread.Sleep(delay);
                    }
                }

                // 4. Update movi length
                long moviEnd = fs.Position;
                fs.Position = moviSizePos;
                bw.Write((uint)(moviEnd - moviStart));
                fs.Position = moviEnd;

                // 5. Write idx1 chunk
                bw.Write(System.Text.Encoding.ASCII.GetBytes("idx1"));
                bw.Write((uint)(indexEntries.Count * 16));
                foreach (var entry in indexEntries)
                {
                    bw.Write(entry.CkId);
                    bw.Write(entry.Flags);
                    bw.Write(entry.ChunkOffset);
                    bw.Write(entry.ChunkLength);
                }

                // 6. Update headers with final frame count and file size
                long totalSize = fs.Position;
                fs.Position = riffSizePos;
                bw.Write((uint)(totalSize - 8));

                fs.Position = totalFramesPos;
                bw.Write((uint)frameCount);

                fs.Position = strhLengthPos;
                bw.Write((uint)frameCount);

                fs.Flush();
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Error(LogCategory.Recording, "Capture loop encountered error", ex.Message);
            }
        }
    }
}
