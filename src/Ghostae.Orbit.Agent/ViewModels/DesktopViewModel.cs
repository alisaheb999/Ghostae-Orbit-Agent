using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Input;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;
using Ghostae.Orbit.Agent.Tools;

namespace Ghostae.Orbit.Agent.ViewModels
{
    public class DesktopViewModel : ViewModelBase
    {
        private double _cpuUsage = 0;
        private string _cpuFormatted = "0%";
        private double _ramUsage = 0;
        private string _ramFormatted = "0 / 0 GB";
        private string _osName = "Windows";
        private string _machineName = Environment.MachineName;
        private string _uptimeFormatted = "0h 0m";

        public ObservableCollection<DriveMetric> Drives { get; } = new();

        public double CpuUsage { get => _cpuUsage; set => SetProperty(ref _cpuUsage, value); }
        public string CpuFormatted { get => _cpuFormatted; set => SetProperty(ref _cpuFormatted, value); }
        public double RamUsage { get => _ramUsage; set => SetProperty(ref _ramUsage, value); }
        public string RamFormatted { get => _ramFormatted; set => SetProperty(ref _ramFormatted, value); }
        public string OsName { get => _osName; set => SetProperty(ref _osName, value); }
        public string MachineName { get => _machineName; set => SetProperty(ref _machineName, value); }
        public string UptimeFormatted { get => _uptimeFormatted; set => SetProperty(ref _uptimeFormatted, value); }

        public ICommand RefreshCommand { get; }

        public DesktopViewModel()
        {
            RefreshCommand = new RelayCommand(Refresh);
            Refresh();
        }

        public void Refresh()
        {
            var cpu = DesktopStatusTool.GetCpuUsage();
            CpuUsage = cpu;
            CpuFormatted = $"{Math.Round(cpu, 1)}%";

            var mem = DesktopStatusTool.GetMemoryStatus();
            RamUsage = mem.LoadPercent;
            double usedGb = (mem.TotalBytes - mem.AvailBytes) / (1024.0 * 1024 * 1024);
            double totalGb = mem.TotalBytes / (1024.0 * 1024 * 1024);
            RamFormatted = $"{usedGb:F1} / {totalGb:F1} GB ({mem.LoadPercent}%)";

            OsName = RuntimeInformation.OSDescription;
            MachineName = Environment.MachineName;

            var uptime = TimeSpan.FromMilliseconds(Environment.TickCount64);
            UptimeFormatted = $"{(int)uptime.TotalDays}d {uptime.Hours}h {uptime.Minutes}m";

            Drives.Clear();
            try
            {
                foreach (var d in DriveInfo.GetDrives())
                {
                    if (d.IsReady)
                    {
                        Drives.Add(new DriveMetric
                        {
                            Name = d.Name,
                            Label = string.IsNullOrEmpty(d.VolumeLabel) ? "Local Disk" : d.VolumeLabel,
                            TotalBytes = d.TotalSize,
                            FreeBytes = d.TotalFreeSpace
                        });
                    }
                }
            }
            catch { }
        }
    }
}
