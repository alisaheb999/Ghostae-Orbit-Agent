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
    public class FileDisplayItem
    {
        public string Name { get; set; } = string.Empty;
        public string FullPath { get; set; } = string.Empty;
        public bool IsDirectory { get; set; }
        public string Type => IsDirectory ? "Folder" : Path.GetExtension(Name).ToUpperInvariant();
        public string SizeFormatted { get; set; } = string.Empty;
        public string ModifiedFormatted { get; set; } = string.Empty;
    }

    public class FilesViewModel : ViewModelBase
    {
        private string _currentPath = "";
        private FileDisplayItem? _selectedItem;
        private string _searchQuery = "";

        public ObservableCollection<FileDisplayItem> Items { get; } = new();

        public string CurrentPath
        {
            get => _currentPath;
            set
            {
                if (SetProperty(ref _currentPath, value))
                {
                    NavigateToPath(_currentPath);
                }
            }
        }

        public FileDisplayItem? SelectedItem
        {
            get => _selectedItem;
            set => SetProperty(ref _selectedItem, value);
        }

        public string SearchQuery
        {
            get => _searchQuery;
            set => SetProperty(ref _searchQuery, value);
        }

        public ICommand NavigateUpCommand { get; }
        public ICommand RefreshCommand { get; }
        public ICommand CreateFolderCommand { get; }
        public ICommand RenameCommand { get; }
        public ICommand SearchCommand { get; }
        public ICommand OpenItemCommand { get; }

        public FilesViewModel()
        {
            _currentPath = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

            NavigateUpCommand = new RelayCommand(() =>
            {
                try
                {
                    var parent = Directory.GetParent(CurrentPath);
                    if (parent != null && parent.Exists)
                    {
                        CurrentPath = parent.FullName;
                    }
                }
                catch { }
            });

            RefreshCommand = new RelayCommand(() => NavigateToPath(CurrentPath));

            CreateFolderCommand = new RelayCommand(() =>
            {
                var folderName = "New_Folder_" + DateTime.Now.ToString("HHmmss");
                var newDir = Path.Combine(CurrentPath, folderName);
                try
                {
                    Directory.CreateDirectory(newDir);
                    LoggingService.Instance.Success(LogCategory.Files, $"Created folder: {folderName}");
                    NavigateToPath(CurrentPath);
                }
                catch (Exception ex)
                {
                    LoggingService.Instance.Error(LogCategory.Files, "Failed to create folder", ex.Message);
                }
            });

            RenameCommand = new RelayCommand(() =>
            {
                if (SelectedItem != null)
                {
                    var oldName = SelectedItem.Name;
                    var newName = oldName + "_renamed";
                    var parent = Path.GetDirectoryName(SelectedItem.FullPath);
                    if (parent != null)
                    {
                        var newPath = Path.Combine(parent, newName);
                        try
                        {
                            if (SelectedItem.IsDirectory)
                                Directory.Move(SelectedItem.FullPath, newPath);
                            else
                                File.Move(SelectedItem.FullPath, newPath);

                            LoggingService.Instance.Success(LogCategory.Files, $"Renamed: {oldName} -> {newName}");
                            NavigateToPath(CurrentPath);
                        }
                        catch (Exception ex)
                        {
                            LoggingService.Instance.Error(LogCategory.Files, "Failed to rename", ex.Message);
                        }
                    }
                }
            });

            SearchCommand = new RelayCommand(() =>
            {
                if (string.IsNullOrWhiteSpace(SearchQuery))
                {
                    NavigateToPath(CurrentPath);
                    return;
                }

                try
                {
                    var dir = new DirectoryInfo(CurrentPath);
                    var matches = dir.EnumerateFileSystemInfos($"*{SearchQuery}*", SearchOption.TopDirectoryOnly);

                    Items.Clear();
                    foreach (var info in matches)
                    {
                        bool isDir = (info.Attributes & FileAttributes.Directory) == FileAttributes.Directory;
                        Items.Add(new FileDisplayItem
                        {
                            Name = info.Name,
                            FullPath = info.FullName,
                            IsDirectory = isDir,
                            SizeFormatted = isDir ? "-" : $"{((FileInfo)info).Length / 1024} KB",
                            ModifiedFormatted = info.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
                        });
                    }
                }
                catch (Exception ex)
                {
                    LoggingService.Instance.Error(LogCategory.Files, "Search failed", ex.Message);
                }
            });

            OpenItemCommand = new RelayCommand(() =>
            {
                if (SelectedItem != null)
                {
                    if (SelectedItem.IsDirectory)
                    {
                        CurrentPath = SelectedItem.FullPath;
                    }
                    else
                    {
                        try
                        {
                            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                            {
                                FileName = SelectedItem.FullPath,
                                UseShellExecute = true
                            });
                        }
                        catch { }
                    }
                }
            });

            NavigateToPath(_currentPath);
        }

        private void NavigateToPath(string path)
        {
            if (string.IsNullOrWhiteSpace(path) || !Directory.Exists(path)) return;

            try
            {
                var dir = new DirectoryInfo(path);
                Items.Clear();

                foreach (var d in dir.GetDirectories())
                {
                    Items.Add(new FileDisplayItem
                    {
                        Name = d.Name,
                        FullPath = d.FullName,
                        IsDirectory = true,
                        SizeFormatted = "-",
                        ModifiedFormatted = d.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
                    });
                }

                foreach (var f in dir.GetFiles())
                {
                    Items.Add(new FileDisplayItem
                    {
                        Name = f.Name,
                        FullPath = f.FullName,
                        IsDirectory = false,
                        SizeFormatted = $"{f.Length / 1024} KB",
                        ModifiedFormatted = f.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
                    });
                }
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Error(LogCategory.Files, $"Cannot open folder {path}", ex.Message);
            }
        }
    }
}
