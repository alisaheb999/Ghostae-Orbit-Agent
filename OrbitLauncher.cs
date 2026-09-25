using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace Ghostae.Orbit.Launcher
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string standaloneExe = Path.Combine(baseDir, "dist", "standalone", "Ghostae.Orbit.Agent.exe");
                string releaseExe = Path.Combine(baseDir, "dist", "GhostaeOrbitAgent", "Ghostae.Orbit.Agent.exe");
                string singleFileExe = Path.Combine(baseDir, "dist", "singlefile", "Ghostae.Orbit.Agent.exe");

                string targetExe = null;
                if (File.Exists(standaloneExe))
                {
                    targetExe = standaloneExe;
                }
                else if (File.Exists(singleFileExe))
                {
                    targetExe = singleFileExe;
                }
                else if (File.Exists(releaseExe))
                {
                    targetExe = releaseExe;
                }

                if (targetExe == null)
                {
                    MessageBox.Show(
                        "Ghostae Orbit Agent executable was not found.\nPlease ensure the application is built in dist/.",
                        "Ghostae Orbit",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning);
                    return;
                }

                var psi = new ProcessStartInfo
                {
                    FileName = targetExe,
                    WorkingDirectory = Path.GetDirectoryName(targetExe),
                    Arguments = string.Join(" ", args),
                    UseShellExecute = true
                };

                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error launching Ghostae Orbit Agent:\n\n" + ex.Message,
                    "Ghostae Orbit Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            }
        }
    }
}
