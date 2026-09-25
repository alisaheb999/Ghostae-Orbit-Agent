using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Ghostae.Orbit.Agent.Models;

namespace Ghostae.Orbit.Agent.Services
{
    public class TaskExecutionEngine
    {
        private static readonly Lazy<TaskExecutionEngine> _instance = new(() => new TaskExecutionEngine());
        public static TaskExecutionEngine Instance => _instance.Value;

        private readonly ConcurrentDictionary<string, (TaskItem Item, CancellationTokenSource Cts)> _activeTasks = new();
        private readonly List<TaskItem> _history = new();
        private readonly object _historyLock = new();

        public event Action<TaskItem>? OnTaskUpdated;
        public event Action<TaskItem>? OnTaskCompleted;
        public event Action<CommandResponse>? OnTaskEventGenerated;

        public TaskItem? CurrentActiveTask => _activeTasks.Values.FirstOrDefault().Item;
        public IReadOnlyList<TaskItem> History
        {
            get
            {
                lock (_historyLock)
                {
                    return _history.ToList();
                }
            }
        }

        public async Task<CommandResponse> EnqueueAndRunTaskAsync(CommandRequest request)
        {
            var taskItem = new TaskItem
            {
                TaskId = request.TaskId,
                ToolName = request.Tool,
                DisplayName = FormatDisplayName(request.Tool),
                Application = DetermineApplication(request),
                State = TaskExecutionState.Running,
                Progress = 0,
                StatusMessage = "Starting execution...",
                StartTime = DateTime.Now
            };

            var cts = new CancellationTokenSource();
            _activeTasks[request.TaskId] = (taskItem, cts);
            OnTaskUpdated?.Invoke(taskItem);

            // Emit initial acknowledgement
            var ack = CommandResponse.Acknowledged(request.TaskId, $"Agent accepted task: {taskItem.DisplayName}");
            OnTaskEventGenerated?.Invoke(ack);

            var progress = new Progress<CommandResponse>(resp =>
            {
                taskItem.Progress = resp.Progress ?? taskItem.Progress;
                taskItem.StatusMessage = resp.Message ?? taskItem.StatusMessage;
                OnTaskUpdated?.Invoke(taskItem);
                OnTaskEventGenerated?.Invoke(resp);
            });

            try
            {
                var response = await ToolDispatcher.Instance.DispatchAsync(request, progress, cts.Token);

                taskItem.EndTime = DateTime.Now;
                taskItem.State = response.Status switch
                {
                    "success" => TaskExecutionState.Success,
                    "rejected" => TaskExecutionState.Failed,
                    "cancelled" => TaskExecutionState.Cancelled,
                    _ => TaskExecutionState.Failed
                };

                taskItem.StatusMessage = response.Message ?? (taskItem.State == TaskExecutionState.Success ? "Completed" : "Failed");
                taskItem.Progress = taskItem.State == TaskExecutionState.Success ? 100 : taskItem.Progress;
                taskItem.ErrorMessage = response.Error;
                if (response.Result != null)
                {
                    taskItem.ResultJson = JsonSerializer.Serialize(response.Result, JsonOptions.Default);
                }

                FinalizeTask(taskItem);
                OnTaskEventGenerated?.Invoke(response);
                return response;
            }
            catch (OperationCanceledException)
            {
                taskItem.State = TaskExecutionState.Cancelled;
                taskItem.StatusMessage = "Task cancelled";
                taskItem.EndTime = DateTime.Now;
                FinalizeTask(taskItem);

                var cancelResponse = new CommandResponse
                {
                    TaskId = request.TaskId,
                    Status = "cancelled",
                    Event = "completed",
                    Error = "Task execution was cancelled"
                };
                OnTaskEventGenerated?.Invoke(cancelResponse);
                return cancelResponse;
            }
            catch (Exception ex)
            {
                taskItem.State = TaskExecutionState.Failed;
                taskItem.StatusMessage = "Execution error";
                taskItem.ErrorMessage = ex.Message;
                taskItem.EndTime = DateTime.Now;
                FinalizeTask(taskItem);

                var failResponse = CommandResponse.Failed(request.TaskId, ex.Message);
                OnTaskEventGenerated?.Invoke(failResponse);
                return failResponse;
            }
        }

        public bool CancelTask(string taskId)
        {
            if (_activeTasks.TryGetValue(taskId, out var entry))
            {
                entry.Cts.Cancel();
                LoggingService.Instance.Warn(LogCategory.Tasks, $"Cancellation signal sent to task {taskId}");
                return true;
            }
            return false;
        }

        private void FinalizeTask(TaskItem item)
        {
            _activeTasks.TryRemove(item.TaskId, out _);

            lock (_historyLock)
            {
                _history.Insert(0, item);
                if (_history.Count > 100)
                {
                    _history.RemoveAt(_history.Count - 1);
                }
            }

            OnTaskUpdated?.Invoke(item);
            OnTaskCompleted?.Invoke(item);
        }

        private static string FormatDisplayName(string tool) => tool.ToLowerInvariant() switch
        {
            "desktop_status" => "Desktop Status Check",
            "screenshot" => "Take Screenshot",
            "screen_record" => "Screen Recording",
            "file_manager" => "File Operation",
            "adobe_status" => "Adobe Status Check",
            "adobe_project" => "Adobe Project Control",
            "render" => "Render Project",
            "power" => "Power Control",
            _ => tool
        };

        private static string DetermineApplication(CommandRequest request)
        {
            var tool = request.Tool.ToLowerInvariant();
            if (tool == "render" || tool == "adobe_status" || tool == "adobe_project")
            {
                try
                {
                    if (request.Input.ValueKind == JsonValueKind.Object &&
                        request.Input.TryGetProperty("application", out var appProp))
                    {
                        var app = appProp.GetString()?.ToLowerInvariant();
                        if (app == "after_effects" || app == "ae") return "After Effects";
                        if (app == "premiere" || app == "pr") return "Premiere Pro";
                    }
                }
                catch { }
                return "Premiere Pro";
            }
            return "Windows";
        }
    }
}
