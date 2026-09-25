using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Native;
using Ghostae.Orbit.Agent.Services;

namespace Ghostae.Orbit.Agent.Tools
{
    public class DesktopStatusTool : IAgentTool
    {
        public string ToolName => "desktop_status";

        private static System.Runtime.InteropServices.ComTypes.FILETIME _prevSysKernel;
        private static System.Runtime.InteropServices.ComTypes.FILETIME _prevSysUser;
        private static DateTime _lastCpuSampleTime = DateTime.MinValue;
        private static double _lastCalculatedCpu = 0.0;
        private static readonly object _cpuLock = new();

        public async Task<CommandResponse> ExecuteAsync(CommandRequest request, IProgress<CommandResponse> progress, CancellationToken cancellationToken)
        {
            try
            {
                progress.Report(CommandResponse.ProgressUpdate(request.TaskId, 20, "Collecting system telemetry"));

                var cpu = await Task.Run(GetCpuUsage, cancellationToken);
                var mem = GetMemoryStatus();
                var drives = GetDriveInfo();
                var adobe = GetAdobeStatus();

                progress.Report(CommandResponse.ProgressUpdate(request.TaskId, 80, "Assembling status payload"));

                var result = new
                {
                    agent = new
                    {
                        status = "online",
                        version = "1.0.0",
                        machine_name = Environment.MachineName,
                        uptime_seconds = (long)TimeSpan.FromMilliseconds(Environment.TickCount64).TotalSeconds
                    },
                    windows = new
                    {
                        status = "online",
                        os_version = RuntimeInformation.OSDescription,
                        architecture = RuntimeInformation.OSArchitecture.ToString()
                    },
                    metrics = new
                    {
                        cpu_percent = Math.Round(cpu, 1),
                        ram_total_gb = Math.Round(mem.TotalBytes / (1024.0 * 1024 * 1024), 2),
                        ram_used_gb = Math.Round((mem.TotalBytes - mem.AvailBytes) / (1024.0 * 1024 * 1024), 2),
                        ram_percent = Math.Round(mem.LoadPercent, 1),
                        drives = drives.ConvertAll(d => new
                        {
                            name = d.Name,
                            label = d.Label,
                            total_gb = Math.Round(d.TotalBytes / (1024.0 * 1024 * 1024), 1),
                            free_gb = Math.Round(d.FreeBytes / (1024.0 * 1024 * 1024), 1),
                            free_percent = Math.Round(d.FreePercentage, 1)
                        })
                    },
                    adobe = adobe
                };

                LoggingService.Instance.Info(LogCategory.System, "Desktop status reported successfully");
                return CommandResponse.Success(request.TaskId, result, "Desktop status retrieved");
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Error(LogCategory.System, "Error getting desktop status", ex.Message);
                return CommandResponse.Failed(request.TaskId, $"Failed to get desktop status: {ex.Message}");
            }
        }

        public static (long TotalBytes, long AvailBytes, double LoadPercent) GetMemoryStatus()
        {
            var mem = new Win32.MEMORYSTATUSEX();
            if (Win32.GlobalMemoryStatusEx(mem))
            {
                return ((long)mem.ullTotalPhys, (long)mem.ullAvailPhys, mem.dwMemoryLoad);
            }
            return (0, 0, 0);
        }

        public static List<DriveMetric> GetDriveInfo()
        {
            var list = new List<DriveMetric>();
            try
            {
                foreach (var d in DriveInfo.GetDrives())
                {
                    if (d.IsReady)
                    {
                        list.Add(new DriveMetric
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
            return list;
        }

        public static object GetAdobeStatus()
        {
            var aeProcesses = Process.GetProcessesByName("AfterFX");
            var prProcesses = Process.GetProcessesByName("Adobe Premiere Pro");

            return new
            {
                after_effects = new
                {
                    is_running = aeProcesses.Length > 0,
                    pid = aeProcesses.Length > 0 ? aeProcesses[0].Id : 0,
                    process_count = aeProcesses.Length
                },
                premiere_pro = new
                {
                    is_running = prProcesses.Length > 0,
                    pid = prProcesses.Length > 0 ? prProcesses[0].Id : 0,
                    process_count = prProcesses.Length
                }
            };
        }

        public static double GetCpuUsage()
        {
            lock (_cpuLock)
            {
                if (DateTime.UtcNow - _lastCpuSampleTime < TimeSpan.FromMilliseconds(500) && _lastCpuSampleTime != DateTime.MinValue)
                {
                    return _lastCalculatedCpu;
                }

                if (!Win32.GetSystemTimes(out var idleTime, out var kernelTime, out var userTime))
                {
                    return 0.0;
                }

                if (_lastCpuSampleTime == DateTime.MinValue)
                {
                    _prevSysKernel = kernelTime;
                    _prevSysUser = userTime;
                    _lastCpuSampleTime = DateTime.UtcNow;
                    Thread.Sleep(100);
                    if (!Win32.GetSystemTimes(out idleTime, out kernelTime, out userTime))
                        return 0.0;
                }

                ulong sysKernel = ((ulong)kernelTime.dwHighDateTime << 32) | (uint)kernelTime.dwLowDateTime;
                ulong sysUser = ((ulong)userTime.dwHighDateTime << 32) | (uint)userTime.dwLowDateTime;

                ulong prevKernel = ((ulong)_prevSysKernel.dwHighDateTime << 32) | (uint)_prevSysKernel.dwLowDateTime;
                ulong prevUser = ((ulong)_prevSysUser.dwHighDateTime << 32) | (uint)_prevSysUser.dwLowDateTime;

                ulong sysKernelDiff = sysKernel > prevKernel ? sysKernel - prevKernel : 0;
                ulong sysUserDiff = sysUser > prevUser ? sysUser - prevUser : 0;

                ulong sysTotal = sysKernelDiff + sysUserDiff;

                _prevSysKernel = kernelTime;
                _prevSysUser = userTime;
                _lastCpuSampleTime = DateTime.UtcNow;

                if (sysTotal == 0) return 0.0;

                // Estimate CPU utilization based on busy cycles
                double percent = (double)sysUserDiff / sysTotal * 100.0 * Environment.ProcessorCount;
                if (percent > 100.0) percent = 100.0;
                if (percent < 0.0) percent = 0.0;

                _lastCalculatedCpu = percent;
                return percent;
            }
        }
    }
}
