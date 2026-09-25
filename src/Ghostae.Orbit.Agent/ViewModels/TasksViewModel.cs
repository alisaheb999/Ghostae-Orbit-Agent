using System.Collections.ObjectModel;
using System.Linq;
using System.Windows.Input;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;

namespace Ghostae.Orbit.Agent.ViewModels
{
    public class TasksViewModel : ViewModelBase
    {
        private readonly MainViewModel _mainVM;
        private TaskItem? _selectedTask;
        private string _filter = "All";

        public ObservableCollection<TaskItem> AllTasks { get; } = new();

        public TaskItem? SelectedTask
        {
            get => _selectedTask;
            set => SetProperty(ref _selectedTask, value);
        }

        public string Filter
        {
            get => _filter;
            set
            {
                if (SetProperty(ref _filter, value))
                {
                    RefreshList();
                }
            }
        }

        public ICommand CancelTaskCommand { get; }
        public ICommand RefreshCommand { get; }

        public TasksViewModel(MainViewModel mainVM)
        {
            _mainVM = mainVM;

            CancelTaskCommand = new RelayCommand(p =>
            {
                if (p is string taskId)
                {
                    TaskExecutionEngine.Instance.CancelTask(taskId);
                }
            });

            RefreshCommand = new RelayCommand(RefreshList);

            TaskExecutionEngine.Instance.OnTaskUpdated += _ => RefreshList();
            TaskExecutionEngine.Instance.OnTaskCompleted += _ => RefreshList();

            RefreshList();
        }

        public void RefreshList()
        {
            DispatcherHelper.SafeInvoke(() =>
            {
                AllTasks.Clear();

                var current = TaskExecutionEngine.Instance.CurrentActiveTask;
                if (current != null && (Filter == "All" || Filter == "Running"))
                {
                    AllTasks.Add(current);
                }

                var history = TaskExecutionEngine.Instance.History;
                foreach (var t in history)
                {
                    if (Filter == "All" ||
                        (Filter == "Success" && t.State == TaskExecutionState.Success) ||
                        (Filter == "Failed" && t.State == TaskExecutionState.Failed))
                    {
                        if (current?.TaskId != t.TaskId)
                        {
                            AllTasks.Add(t);
                        }
                    }
                }
            });
        }
    }
}
