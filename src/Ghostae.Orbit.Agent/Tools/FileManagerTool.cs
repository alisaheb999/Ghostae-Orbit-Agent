using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;

namespace Ghostae.Orbit.Agent.Tools
{
    public class FileManagerInput
    {
        [JsonPropertyName("operation")]
        public string Operation { get; set; } = "list"; // list, find, copy, move, rename, create_folder

        [JsonPropertyName("path")]
        public string? Path { get; set; }

        [JsonPropertyName("destination")]
        public string? Destination { get; set; }

        [JsonPropertyName("new_name")]
        public string? NewName { get; set; }

        [JsonPropertyName("search_pattern")]
        public string? SearchPattern { get; set; }

        [JsonPropertyName("overwrite")]
        public bool Overwrite { get; set; } = false;

        [JsonPropertyName("recursive")]
        public bool Recursive { get; set; } = false;
    }

    public class FileManagerTool : IAgentTool
    {
        public string ToolName => "file_manager";

        public async Task<CommandResponse> ExecuteAsync(CommandRequest request, IProgress<CommandResponse> progress, CancellationToken cancellationToken)
        {
            try
            {
                var input = request.GetInput<FileManagerInput>() ?? new FileManagerInput();
                var op = input.Operation?.ToLowerInvariant() ?? "list";

                progress.Report(CommandResponse.ProgressUpdate(request.TaskId, 20, $"Executing file operation: {op}"));

                switch (op)
                {
                    case "list":
                        return await Task.Run(() => ListDirectory(request.TaskId, input), cancellationToken);

                    case "find":
                        return await Task.Run(() => FindFiles(request.TaskId, input), cancellationToken);

                    case "copy":
                        return await Task.Run(() => CopyItem(request.TaskId, input), cancellationToken);

                    case "move":
                        return await Task.Run(() => MoveItem(request.TaskId, input), cancellationToken);

                    case "rename":
                        return await Task.Run(() => RenameItem(request.TaskId, input), cancellationToken);

                    case "create_folder":
                        return await Task.Run(() => CreateFolder(request.TaskId, input), cancellationToken);

                    default:
                        return CommandResponse.Rejected(request.TaskId, $"File operation '{op}' is not supported");
                }
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Error(LogCategory.Files, "File manager operation failed", ex.Message);
                return CommandResponse.Failed(request.TaskId, $"File operation failed: {ex.Message}");
            }
        }

        private static CommandResponse ListDirectory(string taskId, FileManagerInput input)
        {
            var targetPath = string.IsNullOrWhiteSpace(input.Path)
                ? Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)
                : input.Path;

            if (!SecurityValidator.IsPathSafe(targetPath) || !Directory.Exists(targetPath))
            {
                return CommandResponse.Failed(taskId, $"Directory does not exist or access is restricted: {targetPath}");
            }

            var dir = new DirectoryInfo(targetPath);
            var items = new List<object>();

            foreach (var subDir in dir.GetDirectories())
            {
                items.Add(new
                {
                    name = subDir.Name,
                    path = subDir.FullName,
                    is_directory = true,
                    size_bytes = 0L,
                    modified = subDir.LastWriteTimeUtc.ToString("o")
                });
            }

            foreach (var file in dir.GetFiles())
            {
                items.Add(new
                {
                    name = file.Name,
                    path = file.FullName,
                    is_directory = false,
                    size_bytes = file.Length,
                    modified = file.LastWriteTimeUtc.ToString("o"),
                    extension = file.Extension
                });
            }

            var result = new
            {
                current_path = dir.FullName,
                parent_path = dir.Parent?.FullName,
                item_count = items.Count,
                items = items
            };

            LoggingService.Instance.Info(LogCategory.Files, $"Listed directory: {dir.FullName} ({items.Count} items)");
            return CommandResponse.Success(taskId, result, $"Directory listed: {items.Count} items found");
        }

        private static CommandResponse FindFiles(string taskId, FileManagerInput input)
        {
            var rootPath = string.IsNullOrWhiteSpace(input.Path)
                ? Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)
                : input.Path;

            if (!SecurityValidator.IsPathSafe(rootPath) || !Directory.Exists(rootPath))
            {
                return CommandResponse.Failed(taskId, $"Search path is invalid or restricted: {rootPath}");
            }

            var pattern = string.IsNullOrWhiteSpace(input.SearchPattern) ? "*" : input.SearchPattern;
            var searchOpt = input.Recursive ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly;

            var matches = new List<object>();
            var dir = new DirectoryInfo(rootPath);

            var files = dir.EnumerateFiles(pattern, searchOpt).Take(100);
            foreach (var f in files)
            {
                matches.Add(new
                {
                    name = f.Name,
                    path = f.FullName,
                    is_directory = false,
                    size_bytes = f.Length,
                    modified = f.LastWriteTimeUtc.ToString("o")
                });
            }

            var result = new
            {
                search_root = rootPath,
                search_pattern = pattern,
                recursive = input.Recursive,
                match_count = matches.Count,
                matches = matches
            };

            LoggingService.Instance.Info(LogCategory.Files, $"Find completed: {matches.Count} matches for '{pattern}' in {rootPath}");
            return CommandResponse.Success(taskId, result, $"Search completed: {matches.Count} matches");
        }

        private static CommandResponse CopyItem(string taskId, FileManagerInput input)
        {
            if (string.IsNullOrWhiteSpace(input.Path) || string.IsNullOrWhiteSpace(input.Destination))
            {
                return CommandResponse.Failed(taskId, "Both path and destination are required for copy");
            }

            if (!SecurityValidator.IsPathSafe(input.Path) || !SecurityValidator.IsPathSafe(input.Destination))
            {
                return CommandResponse.Rejected(taskId, "Copy path violates security restrictions");
            }

            if (File.Exists(input.Path))
            {
                var destDir = Path.GetDirectoryName(input.Destination);
                if (!string.IsNullOrEmpty(destDir)) Directory.CreateDirectory(destDir);

                File.Copy(input.Path, input.Destination, input.Overwrite);
                LoggingService.Instance.Success(LogCategory.Files, $"File copied: {Path.GetFileName(input.Path)} -> {input.Destination}");
                return CommandResponse.Success(taskId, new { source = input.Path, destination = input.Destination }, "File copied successfully");
            }

            return CommandResponse.Failed(taskId, $"Source file not found: {input.Path}");
        }

        private static CommandResponse MoveItem(string taskId, FileManagerInput input)
        {
            if (string.IsNullOrWhiteSpace(input.Path) || string.IsNullOrWhiteSpace(input.Destination))
            {
                return CommandResponse.Failed(taskId, "Both path and destination are required for move");
            }

            if (!SecurityValidator.IsPathSafe(input.Path) || !SecurityValidator.IsPathSafe(input.Destination))
            {
                return CommandResponse.Rejected(taskId, "Move path violates security restrictions");
            }

            if (File.Exists(input.Path))
            {
                if (File.Exists(input.Destination) && input.Overwrite)
                {
                    File.Delete(input.Destination);
                }
                File.Move(input.Path, input.Destination);
                LoggingService.Instance.Success(LogCategory.Files, $"File moved: {Path.GetFileName(input.Path)} -> {input.Destination}");
                return CommandResponse.Success(taskId, new { source = input.Path, destination = input.Destination }, "File moved successfully");
            }

            return CommandResponse.Failed(taskId, $"Source file not found: {input.Path}");
        }

        private static CommandResponse RenameItem(string taskId, FileManagerInput input)
        {
            if (string.IsNullOrWhiteSpace(input.Path) || string.IsNullOrWhiteSpace(input.NewName))
            {
                return CommandResponse.Failed(taskId, "Both path and new_name are required for rename");
            }

            if (!SecurityValidator.IsPathSafe(input.Path))
            {
                return CommandResponse.Rejected(taskId, "Rename path violates security restrictions");
            }

            var dir = Path.GetDirectoryName(input.Path);
            if (string.IsNullOrEmpty(dir)) dir = ".";
            var target = Path.Combine(dir, input.NewName);

            if (File.Exists(input.Path))
            {
                File.Move(input.Path, target);
                LoggingService.Instance.Success(LogCategory.Files, $"Renamed: {Path.GetFileName(input.Path)} -> {input.NewName}");
                return CommandResponse.Success(taskId, new { old_path = input.Path, new_path = target }, "File renamed successfully");
            }
            if (Directory.Exists(input.Path))
            {
                Directory.Move(input.Path, target);
                LoggingService.Instance.Success(LogCategory.Files, $"Renamed folder: {Path.GetFileName(input.Path)} -> {input.NewName}");
                return CommandResponse.Success(taskId, new { old_path = input.Path, new_path = target }, "Folder renamed successfully");
            }

            return CommandResponse.Failed(taskId, $"Target path not found: {input.Path}");
        }

        private static CommandResponse CreateFolder(string taskId, FileManagerInput input)
        {
            if (string.IsNullOrWhiteSpace(input.Path))
            {
                return CommandResponse.Failed(taskId, "Path is required for create_folder");
            }

            if (!SecurityValidator.IsPathSafe(input.Path))
            {
                return CommandResponse.Rejected(taskId, "Folder path violates security restrictions");
            }

            Directory.CreateDirectory(input.Path);
            LoggingService.Instance.Success(LogCategory.Files, $"Folder created: {input.Path}");
            return CommandResponse.Success(taskId, new { path = input.Path }, "Folder created successfully");
        }
    }
}
