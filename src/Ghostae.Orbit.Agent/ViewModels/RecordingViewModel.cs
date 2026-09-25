using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Input;
using System.Windows.Threading;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;
using Ghostae.Orbit.Agent.Tools;

namespace Ghostae.Orbit.Agent.ViewModels
{
    public class RecordingViewModel : ViewModelBase
    {
        private string _target = "Full Screen";
        private string _quality = "High";
        private string _outputLocation = "";
        private bool _isRecording = false;
        private string _durationText = "00:00";
        private DispatcherTimer? _timer;

        // Post recording summary
        private bool _hasLastRecording = false;
        private string _lastFilePath = "";
        private string _lastDuration = "";
        private string _lastSize = "";

        public string Target { get => _target; set => SetProperty(ref _target, value); }
        public string Quality { get => _quality; set => SetProperty(ref _quality, value); }
        public string OutputLocation { get => _outputLocation; set => SetProperty(ref _outputLocation, value); }
        public bool IsRecording { get => _isRecording; set => SetProperty(ref _isRecording, value); }
        public string DurationText { get => _durationText; set => SetProperty(ref _durationText, value); }

        public bool HasLastRecording { get => _hasLastRecording; set => SetProperty(ref _hasLastRecording, value); }
        public string LastFilePath { get => _lastFilePath; set => SetProperty(ref _lastFilePath, value); }
        public string LastDuration { get => _lastDuration; set => SetProperty(ref _lastDuration, value); }
        public string LastSize { get => _lastSize; set => SetProperty(ref _lastSize, value); }

        public ICommand ToggleRecordingCommand { get; }
        public ICommand OpenLastFileCommand { get; }
        public ICommand ShowInFolderCommand { get; }

        public RecordingViewModel()
        {
            OutputLocation = ConfigService.Instance.Current.RecordingOutputDir;

            ToggleRecordingCommand = new RelayCommand(async () =>
            {
                if (!IsRecording)
                {
                    await StartRecording();
                }
                else
                {
                    await StopRecording();
                }
            });

            OpenLastFileCommand = new RelayCommand(() =>
            {
                if (File.Exists(LastFilePath))
                {
                    Process.Start(new ProcessStartInfo { FileName = LastFilePath, UseShellExecute = true });
                }
            });

            ShowInFolderCommand = new RelayCommand(() =>
            {
                if (File.Exists(LastFilePath))
                {
                    Process.Start("explorer.exe", $"/select,\"{LastFilePath}\"");
                }
                else if (Directory.Exists(OutputLocation))
                {
                    Process.Start("explorer.exe", OutputLocation);
                }
            });
        }

        private async System.Threading.Tasks.Task StartRecording()
        {
            var targetParam = Target.Replace(" ", "_").ToLowerInvariant();
            var cmd = new CommandRequest
            {
                TaskId = "ui_rec_" + Guid.NewGuid().ToString("N")[..6],
                Tool = "screen_record",
                Input = System.Text.Json.JsonSerializer.SerializeToElement(new ScreenRecordInput
                {
                    Operation = "start",
                    Target = targetParam,
                    Quality = Quality
                })
            };

            var tool = new ScreenRecordTool();
            var progress = new Progress<CommandResponse>();
            var resp = await tool.ExecuteAsync(cmd, progress, default);

            if (resp.Status == "success")
            {
                IsRecording = true;
                _timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
                _timer.Tick += (s, e) =>
                {
                    DurationText = ScreenRecordTool.ElapsedTime.ToString(@"mm\:ss");
                };
                _timer.Start();
                DurationText = "00:00";
            }
        }

        private async System.Threading.Tasks.Task StopRecording()
        {
            var cmd = new CommandRequest
            {
                TaskId = "ui_rec_stop_" + Guid.NewGuid().ToString("N")[..6],
                Tool = "screen_record",
                Input = System.Text.Json.JsonSerializer.SerializeToElement(new ScreenRecordInput
                {
                    Operation = "stop"
                })
            };

            var tool = new ScreenRecordTool();
            var progress = new Progress<CommandResponse>();
            var resp = await tool.ExecuteAsync(cmd, progress, default);

            _timer?.Stop();
            _timer = null;
            IsRecording = false;

            if (resp.Status == "success" && resp.Result != null)
            {
                try
                {
                    dynamic res = resp.Result;
                    LastFilePath = res.file_path;
                    LastDuration = res.duration_formatted;
                    LastSize = $"{res.file_size_bytes / 1024} KB";
                    HasLastRecording = true;
                }
                catch { }
            }
        }
    }
}
