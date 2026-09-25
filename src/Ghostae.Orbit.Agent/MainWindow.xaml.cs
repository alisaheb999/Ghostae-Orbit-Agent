using System.ComponentModel;
using System.Windows;
using Ghostae.Orbit.Agent.Services;
using Ghostae.Orbit.Agent.ViewModels;

namespace Ghostae.Orbit.Agent
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }

        public void NavigateTo(string pageName)
        {
            if (DataContext is MainViewModel vm)
            {
                vm.NavigateTo(pageName);
            }
        }

        protected override void OnClosing(CancelEventArgs e)
        {
            if (ConfigService.Instance.Current.MinimizeToTray)
            {
                e.Cancel = true;
                Hide();
            }
            else
            {
                base.OnClosing(e);
            }
        }
    }
}
