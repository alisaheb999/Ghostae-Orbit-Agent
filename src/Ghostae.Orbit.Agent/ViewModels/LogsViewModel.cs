using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Windows.Forms;
using System.Windows.Input;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;

namespace Ghostae.Orbit.Agent.ViewModels
{
    public class LogsViewModel : ViewModelBase
    {
        private string _selectedCategory = "All";
        private bool _showAdvanced = false;

        public ObservableCollection<LogEntry> DisplayLogs { get; } = new();

        public string SelectedCategory
        {
            get => _selectedCategory;
            set
            {
                if (SetProperty(ref _selectedCategory, value))
                {
                    Refresh();
                }
            }
        }

        public bool ShowAdvanced
        {
            get => _showAdvanced;
            set
            {
                if (SetProperty(ref _showAdvanced, value))
                {
                    Refresh();
                }
            }
        }

        public ICommand FilterCategoryCommand { get; }
        public ICommand ClearLogsCommand { get; }
        public ICommand ExportLogsCommand { get; }

        public LogsViewModel()
        {
            FilterCategoryCommand = new RelayCommand(p =>
            {
                if (p is string cat) SelectedCategory = cat;
            });

            ClearLogsCommand = new RelayCommand(() =>
            {
                LoggingService.Instance.Clear();
                Refresh();
            });

            ExportLogsCommand = new RelayCommand(() =>
            {
                using var sfd = new SaveFileDialog
                {
                    Filter = "Log File (*.log)|*.log|Text File (*.txt)|*.txt",
                    FileName = $"orbit_agent_logs_{DateTime.Now:yyyyMMdd_HHmmss}.log"
                };

                if (sfd.ShowDialog() == DialogResult.OK)
                {
                    var lines = DisplayLogs.Select(l => $"[{l.Timestamp:yyyy-MM-dd HH:mm:ss}] [{l.Level}] [{l.Category}] {l.Message} {l.Details}");
                    File.WriteAllLines(sfd.FileName, lines);
                    LoggingService.Instance.Success(LogCategory.System, $"Logs exported to {sfd.FileName}");
                }
            });

            LoggingService.Instance.OnLogAdded += entry =>
            {
                DispatcherHelper.SafeInvoke(() =>
                {
                    if (MatchesFilter(entry))
                    {
                        DisplayLogs.Insert(0, entry);
                        if (DisplayLogs.Count > 300)
                        {
                            DisplayLogs.RemoveAt(DisplayLogs.Count - 1);
                        }
                    }
                });
            };

            Refresh();
        }

        public void Refresh()
        {
            DispatcherHelper.SafeInvoke(() =>
            {
                DisplayLogs.Clear();
                var all = LoggingService.Instance.GetAllLogs().Reverse();
                foreach (var log in all)
                {
                    if (MatchesFilter(log))
                    {
                        DisplayLogs.Add(log);
                    }
                }
            });
        }

        private bool MatchesFilter(LogEntry entry)
        {
            if (SelectedCategory == "All") return true;
            return string.Equals(entry.Category.ToString(), SelectedCategory, StringComparison.OrdinalIgnoreCase);
        }
    }
}
