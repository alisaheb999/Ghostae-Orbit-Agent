using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using System.Windows.Input;
using System.Windows.Media.Imaging;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;
using Ghostae.Orbit.Agent.Tools;

namespace Ghostae.Orbit.Agent.ViewModels
{
    public class ScreenshotViewModel : ViewModelBase
    {
        private string _target = "Full Screen";
        private bool _hasScreenshot = false;
        private string _lastScreenshotPath = "";
        private BitmapImage? _previewImage;
        private string _imageDimensions = "";
        private string _imageFileSize = "";

        public string Target { get => _target; set => SetProperty(ref _target, value); }
        public bool HasScreenshot { get => _hasScreenshot; set => SetProperty(ref _hasScreenshot, value); }
        public string LastScreenshotPath { get => _lastScreenshotPath; set => SetProperty(ref _lastScreenshotPath, value); }
        public BitmapImage? PreviewImage { get => _previewImage; set => SetProperty(ref _previewImage, value); }
        public string ImageDimensions { get => _imageDimensions; set => SetProperty(ref _imageDimensions, value); }
        public string ImageFileSize { get => _imageFileSize; set => SetProperty(ref _imageFileSize, value); }

        public ICommand TakeScreenshotCommand { get; }
        public ICommand OpenCommand { get; }
        public ICommand CopyCommand { get; }
        public ICommand ShowInFolderCommand { get; }

        public ScreenshotViewModel()
        {
            TakeScreenshotCommand = new RelayCommand(async () => await TakeScreenshotAsync());

            OpenCommand = new RelayCommand(() =>
            {
                if (File.Exists(LastScreenshotPath))
                {
                    Process.Start(new ProcessStartInfo { FileName = LastScreenshotPath, UseShellExecute = true });
                }
            });

            CopyCommand = new RelayCommand(() =>
            {
                if (File.Exists(LastScreenshotPath))
                {
                    try
                    {
                        using var img = System.Drawing.Image.FromFile(LastScreenshotPath);
                        System.Windows.Clipboard.SetImage(PreviewImage);
                        LoggingService.Instance.Info(LogCategory.Tasks, "Screenshot copied to clipboard");
                    }
                    catch { }
                }
            });

            ShowInFolderCommand = new RelayCommand(() =>
            {
                if (File.Exists(LastScreenshotPath))
                {
                    Process.Start("explorer.exe", $"/select,\"{LastScreenshotPath}\"");
                }
            });
        }

        private async System.Threading.Tasks.Task TakeScreenshotAsync()
        {
            var targetParam = Target.Replace(" ", "_").ToLowerInvariant();
            var cmd = new CommandRequest
            {
                TaskId = "ui_shot_" + Guid.NewGuid().ToString("N")[..6],
                Tool = "screenshot",
                Input = System.Text.Json.JsonSerializer.SerializeToElement(new ScreenshotInput
                {
                    Target = targetParam
                })
            };

            var tool = new ScreenshotTool();
            var progress = new Progress<CommandResponse>();
            var resp = await tool.ExecuteAsync(cmd, progress, default);

            if (resp.Status == "success" && resp.Result != null)
            {
                try
                {
                    dynamic res = resp.Result;
                    LastScreenshotPath = res.file_path;
                    ImageDimensions = $"{res.width} x {res.height} px";
                    ImageFileSize = $"{res.file_size_bytes / 1024} KB";

                    // Load preview bitmap safely without file lock
                    var bi = new BitmapImage();
                    bi.BeginInit();
                    bi.CacheOption = BitmapCacheOption.OnLoad;
                    bi.UriSource = new Uri(LastScreenshotPath);
                    bi.EndInit();
                    bi.Freeze();

                    PreviewImage = bi;
                    HasScreenshot = true;
                }
                catch { }
            }
        }
    }
}
