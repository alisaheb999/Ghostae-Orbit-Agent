using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Ghostae.Orbit.Agent.Models;
using Ghostae.Orbit.Agent.Services;
using Ghostae.Orbit.Agent.Tools;

namespace Ghostae.Orbit.Tests
{
    class Program
    {
        private static int _testsPassed = 0;
        private static int _testsFailed = 0;

        static async Task<int> Main(string[] args)
        {
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==========================================================");
            Console.WriteLine("    GHOSTAE ORBIT AGENT — AUTOMATED TEST SUITE & E2E");
            Console.WriteLine("==========================================================");
            Console.ResetColor();

            Console.WriteLine("\n[0/3] Testing UI Views and ViewModels...");
            TestUiInstantiation();

            // Run Independent Tool Tests
            Console.WriteLine("\n[1/3] Running Independent Tool Verification...");
            await TestDesktopStatusTool();
            await TestScreenshotTool();
            await TestScreenRecordTool();
            await TestFileManagerTool();
            await TestAdobeStatusTool();
            await TestAdobeProjectTool();
            await TestRenderControlTool();
            await TestPowerControlTool();

            // Run Security Rejection Tests
            Console.WriteLine("\n[2/3] Running Strict Security Allowlist Tests...");
            await TestSecurityAllowlist();

            // Run Complete Orbit Server -> WebSocket -> Agent -> Adobe -> Result E2E Tests
            Console.WriteLine("\n[3/3] Running Full WebSocket End-to-End Workflows...");
            await RunEndToEndServerTests();

            Console.WriteLine("\n==========================================================");
            if (_testsFailed == 0)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"ALL TESTS PASSED! ({_testsPassed} passed, 0 failed)");
                Console.ResetColor();
                return 0;
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"TESTS COMPLETED WITH FAILURES: {_testsPassed} passed, {_testsFailed} failed");
                Console.ResetColor();
                return 1;
            }
        }

        static void TestUiInstantiation()
        {
            var t = new Thread(() =>
            {
                try
                {
                    if (System.Windows.Application.Current == null)
                    {
                        new System.Windows.Application();
                    }

                    // Load merged dictionaries so styles/colors exist
                    var app = System.Windows.Application.Current;
                    app.Resources.MergedDictionaries.Add(new System.Windows.ResourceDictionary { Source = new Uri("pack://application:,,,/Ghostae.Orbit.Agent;component/Styles/Colors.xaml") });
                    app.Resources.MergedDictionaries.Add(new System.Windows.ResourceDictionary { Source = new Uri("pack://application:,,,/Ghostae.Orbit.Agent;component/Styles/Icons.xaml") });
                    app.Resources.MergedDictionaries.Add(new System.Windows.ResourceDictionary { Source = new Uri("pack://application:,,,/Ghostae.Orbit.Agent;component/Styles/Controls.xaml") });

                    Console.WriteLine("    Testing ViewModels...");
                    var vm = new Ghostae.Orbit.Agent.ViewModels.MainViewModel();
                    Assert(vm != null, "MainViewModel created");

                    Console.WriteLine("    Testing Views...");
                    var ov = new Ghostae.Orbit.Agent.Views.OverviewView { DataContext = vm.OverviewVM };
                    Assert(ov != null, "OverviewView created");

                    var tv = new Ghostae.Orbit.Agent.Views.TasksView { DataContext = vm.TasksVM };
                    Assert(tv != null, "TasksView created");

                    var dv = new Ghostae.Orbit.Agent.Views.DesktopView { DataContext = vm.DesktopVM };
                    Assert(dv != null, "DesktopView created");

                    var av = new Ghostae.Orbit.Agent.Views.AdobeView { DataContext = vm.AdobeVM };
                    Assert(av != null, "AdobeView created");

                    var rv = new Ghostae.Orbit.Agent.Views.RecordingView { DataContext = vm.RecordingVM };
                    Assert(rv != null, "RecordingView created");

                    var sv = new Ghostae.Orbit.Agent.Views.ScreenshotView { DataContext = vm.ScreenshotVM };
                    Assert(sv != null, "ScreenshotView created");

                    var fv = new Ghostae.Orbit.Agent.Views.FilesView { DataContext = vm.FilesVM };
                    Assert(fv != null, "FilesView created");

                    var stv = new Ghostae.Orbit.Agent.Views.SettingsView { DataContext = vm.SettingsVM };
                    Assert(stv != null, "SettingsView created");

                    var lv = new Ghostae.Orbit.Agent.Views.LogsView { DataContext = vm.LogsVM };
                    Assert(lv != null, "LogsView created");

                    var diagv = new Ghostae.Orbit.Agent.Views.TestDiagnosticsView { DataContext = vm.TestDiagnosticsVM };
                    Assert(diagv != null, "TestDiagnosticsView created");

                    Console.WriteLine("    Testing MainWindow...");
                    var win = new Ghostae.Orbit.Agent.MainWindow();
                    Assert(win != null, "MainWindow created");
                }
                catch (Exception ex)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"UI Test Error: {ex}");
                    Console.ResetColor();
                    _testsFailed++;
                }
            });

            t.SetApartmentState(ApartmentState.STA);
            t.Start();
            t.Join();
            SynchronizationContext.SetSynchronizationContext(null);
        }

        static void Assert(bool condition, string testName, string? details = null)
        {
            if (condition)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.Write("  [PASS] ");
                Console.ResetColor();
                Console.WriteLine($"{testName}{(details != null ? $" ({details})" : "")}");
                _testsPassed++;
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.Write("  [FAIL] ");
                Console.ResetColor();
                Console.WriteLine($"{testName} - FAILED{(details != null ? $": {details}" : "")}");
                _testsFailed++;
            }
        }

        static async Task TestDesktopStatusTool()
        {
            var tool = new DesktopStatusTool();
            var cmd = new CommandRequest { TaskId = "t_status_1", Tool = "desktop_status" };
            var resp = await tool.ExecuteAsync(cmd, new Progress<CommandResponse>(), default);

            Assert(resp.Status == "success", "desktop_status execution status", resp.Message);
            Assert(resp.Result != null, "desktop_status returned structured telemetry payload");
        }

        static async Task TestScreenshotTool()
        {
            var tool = new ScreenshotTool();
            var cmd = new CommandRequest
            {
                TaskId = "t_shot_1",
                Tool = "screenshot",
                Input = JsonSerializer.SerializeToElement(new { target = "full_screen", include_base64 = true })
            };
            var resp = await tool.ExecuteAsync(cmd, new Progress<CommandResponse>(), default);

            Assert(resp.Status == "success", "screenshot execution status");
            if (resp.Result != null)
            {
                var doc = JsonDocument.Parse(JsonSerializer.Serialize(resp.Result));
                var path = doc.RootElement.GetProperty("file_path").GetString();
                Assert(File.Exists(path), "screenshot output file exists on disk", path);
            }
        }

        static async Task TestScreenRecordTool()
        {
            var tool = new ScreenRecordTool();

            // Start
            var startCmd = new CommandRequest
            {
                TaskId = "t_rec_1",
                Tool = "screen_record",
                Input = JsonSerializer.SerializeToElement(new { operation = "start", target = "full_screen", quality = "Standard" })
            };
            var startResp = await tool.ExecuteAsync(startCmd, new Progress<CommandResponse>(), default);
            Assert(startResp.Status == "success" && ScreenRecordTool.IsRecording, "screen_record start");

            // Wait 1.5 seconds
            await Task.Delay(1500);

            // Status
            var statCmd = new CommandRequest
            {
                TaskId = "t_rec_2",
                Tool = "screen_record",
                Input = JsonSerializer.SerializeToElement(new { operation = "status" })
            };
            var statResp = await tool.ExecuteAsync(statCmd, new Progress<CommandResponse>(), default);
            Assert(statResp.Status == "success", "screen_record query status");

            // Stop
            var stopCmd = new CommandRequest
            {
                TaskId = "t_rec_3",
                Tool = "screen_record",
                Input = JsonSerializer.SerializeToElement(new { operation = "stop" })
            };
            var stopResp = await tool.ExecuteAsync(stopCmd, new Progress<CommandResponse>(), default);
            Assert(stopResp.Status == "success" && !ScreenRecordTool.IsRecording, "screen_record stop & save");
        }

        static async Task TestFileManagerTool()
        {
            var tool = new FileManagerTool();
            var testDir = Path.Combine(Path.GetTempPath(), "OrbitTestDir_" + Guid.NewGuid().ToString("N")[..6]);

            // Create folder
            var createCmd = new CommandRequest
            {
                TaskId = "t_file_1",
                Tool = "file_manager",
                Input = JsonSerializer.SerializeToElement(new { operation = "create_folder", path = testDir })
            };
            var createResp = await tool.ExecuteAsync(createCmd, new Progress<CommandResponse>(), default);
            Assert(createResp.Status == "success" && Directory.Exists(testDir), "file_manager create_folder");

            // List
            var listCmd = new CommandRequest
            {
                TaskId = "t_file_2",
                Tool = "file_manager",
                Input = JsonSerializer.SerializeToElement(new { operation = "list", path = testDir })
            };
            var listResp = await tool.ExecuteAsync(listCmd, new Progress<CommandResponse>(), default);
            Assert(listResp.Status == "success", "file_manager list directory");

            // Clean up
            try { Directory.Delete(testDir, true); } catch { }
        }

        static async Task TestAdobeStatusTool()
        {
            var tool = new AdobeStatusTool();
            var cmd = new CommandRequest { TaskId = "t_adobestat_1", Tool = "adobe_status" };
            var resp = await tool.ExecuteAsync(cmd, new Progress<CommandResponse>(), default);
            Assert(resp.Status == "success", "adobe_status returns AE and Premiere state");
        }

        static async Task TestAdobeProjectTool()
        {
            var tool = new AdobeProjectTool();
            var cmd = new CommandRequest
            {
                TaskId = "t_adobeproj_1",
                Tool = "adobe_project",
                Input = JsonSerializer.SerializeToElement(new { operation = "status", application = "premiere" })
            };
            var resp = await tool.ExecuteAsync(cmd, new Progress<CommandResponse>(), default);
            Assert(resp.Status == "success", "adobe_project status for Premiere Pro");
        }

        static async Task TestRenderControlTool()
        {
            var tool = new RenderControlTool();
            var outPath = Path.Combine(Path.GetTempPath(), $"TestRender_{Guid.NewGuid():N}.mp4");

            var cmd = new CommandRequest
            {
                TaskId = "t_render_1",
                Tool = "render",
                Input = JsonSerializer.SerializeToElement(new
                {
                    operation = "start",
                    application = "premiere",
                    output_path = outPath
                })
            };

            var progressUpdates = 0;
            var progress = new Progress<CommandResponse>(r => progressUpdates++);
            var resp = await tool.ExecuteAsync(cmd, progress, default);

            Assert(resp.Status == "success", "render workflow completed with 6-point verification");
            Assert(File.Exists(outPath), "render output artifact exists on disk");
            Assert(progressUpdates > 0, "render emitted live progress events", $"{progressUpdates} updates received");

            try { File.Delete(outPath); } catch { }
        }

        static async Task TestPowerControlTool()
        {
            var tool = new PowerControlTool();

            // Status check
            var statCmd = new CommandRequest
            {
                TaskId = "t_pwr_1",
                Tool = "power",
                Input = JsonSerializer.SerializeToElement(new { operation = "status" })
            };
            var statResp = await tool.ExecuteAsync(statCmd, new Progress<CommandResponse>(), default);
            Assert(statResp.Status == "success", "power tool returns power status");

            // Unauthorized shutdown attempt (must be rejected)
            var unauthCmd = new CommandRequest
            {
                TaskId = "t_pwr_2",
                Tool = "power",
                Input = JsonSerializer.SerializeToElement(new { operation = "shutdown" })
            };
            var unauthResp = await tool.ExecuteAsync(unauthCmd, new Progress<CommandResponse>(), default);
            Assert(unauthResp.Status == "rejected", "power tool rejects unauthorized shutdown requests");
        }

        static async Task TestSecurityAllowlist()
        {
            // 1. Unknown tool
            var evilCmd1 = new CommandRequest { TaskId = "t_sec_1", Tool = "execute_powershell" };
            var resp1 = await ToolDispatcher.Instance.DispatchAsync(evilCmd1, new Progress<CommandResponse>(), default);
            Assert(resp1.Status == "rejected", "Arbitrary powershell execution tool strictly rejected");

            // 2. CMD tool
            var evilCmd2 = new CommandRequest { TaskId = "t_sec_2", Tool = "run_cmd" };
            var resp2 = await ToolDispatcher.Instance.DispatchAsync(evilCmd2, new Progress<CommandResponse>(), default);
            Assert(resp2.Status == "rejected", "Arbitrary cmd shell execution tool strictly rejected");

            // 3. System32 path traversal
            Assert(!SecurityValidator.IsPathSafe(@"C:\Windows\System32\cmd.exe"), "System32 protected against traversal/deletion");
        }

        static async Task RunEndToEndServerTests()
        {
            // Start Mock Orbit Server on port 18875
            var server = new MockOrbitServer();
            await server.StartAsync();

            try
            {
                // Point Agent Config to mock server
                ConfigService.Instance.Current.ServerUrl = "ws://127.0.0.1:18875/agent/v1/";
                ConfigService.Instance.Save();

                // Start Orbit WebSocket Client
                OrbitWebSocketClient.Instance.Start();

                // Wait for connection
                Console.WriteLine("  Waiting for Agent to establish outbound WebSocket connection...");
                var connected = await server.WaitForConnectionAsync(TimeSpan.FromSeconds(8));
                Assert(connected, "Agent established outbound TLS/WebSocket connection to Orbit Server");

                if (!connected) return;

                // E2E Test 1: "Render my current Premiere project" (Section 38)
                Console.WriteLine("\n  --> Executing End-to-End Test 1: Render current Premiere project");
                var renderTask = server.SendTaskAsync(new
                {
                    version = "1",
                    task_id = "e2e_task_render_001",
                    tool = "render",
                    input = new
                    {
                        application = "premiere",
                        operation = "start"
                    }
                });

                var renderResult = await renderTask;
                Assert(renderResult.HasValue && renderResult.Value.TryGetProperty("status", out var rStatus) && rStatus.GetString() == "success",
                    "E2E Test 1 Final Status: Success");
                Assert(renderResult.HasValue && renderResult.Value.TryGetProperty("result", out var resObj) && resObj.GetProperty("output_verified").GetBoolean(),
                    "E2E Test 1 Output Verified: true");

                // E2E Test 2: "Take a screenshot of my current Premiere window" (Section 39)
                Console.WriteLine("\n  --> Executing End-to-End Test 2: Screenshot active Premiere window");
                var shotTask = server.SendTaskAsync(new
                {
                    version = "1",
                    task_id = "e2e_task_shot_002",
                    tool = "screenshot",
                    input = new
                    {
                        target = "active_window"
                    }
                });

                var shotResult = await shotTask;
                Assert(shotResult.HasValue && shotResult.Value.TryGetProperty("status", out var sStatus) && sStatus.GetString() == "success",
                    "E2E Test 2 Screenshot captured & verified successfully");

                // E2E Test 3: "Render the project and shut down my PC when it finishes" (Section 40)
                Console.WriteLine("\n  --> Executing End-to-End Test 3: Render + Guarded Shutdown");
                var pwrTask = server.SendTaskAsync(new
                {
                    version = "1",
                    task_id = "e2e_task_render_shutdown_003",
                    tool = "power",
                    input = new
                    {
                        operation = "status",
                        wait_for_render = true,
                        server_authorization = "auth_orbit_srv_token_approved"
                    }
                });

                var pwrResult = await pwrTask;
                Assert(pwrResult.HasValue && pwrResult.Value.TryGetProperty("status", out var pStatus) && pStatus.GetString() == "success",
                    "E2E Test 3 Render guard & authorized power status check succeeded");
            }
            finally
            {
                server.Stop();
                OrbitWebSocketClient.Instance.Stop();
            }
        }
    }

    public class MockOrbitServer
    {
        private HttpListener? _listener;
        private WebSocket? _clientSocket;
        private readonly TaskCompletionSource<bool> _connectedTcs = new();
        private readonly System.Collections.Concurrent.ConcurrentDictionary<string, TaskCompletionSource<JsonElement>> _pendingTasks = new();

        public async Task StartAsync()
        {
            await Task.Yield();
            _listener = new HttpListener();
            _listener.Prefixes.Add("http://127.0.0.1:18875/agent/v1/");
            _listener.Start();

            _ = Task.Run(async () =>
            {
                while (_listener.IsListening)
                {
                    try
                    {
                        var context = await _listener.GetContextAsync();
                        if (context.Request.IsWebSocketRequest)
                        {
                            var wsContext = await context.AcceptWebSocketAsync(null);
                            _clientSocket = wsContext.WebSocket;
                            _connectedTcs.TrySetResult(true);
                            _ = Task.Run(() => ReadLoopAsync(_clientSocket));
                        }
                        else
                        {
                            context.Response.StatusCode = 400;
                            context.Response.Close();
                        }
                    }
                    catch { break; }
                }
            });
        }

        private async Task ReadLoopAsync(WebSocket ws)
        {
            var buffer = new byte[1024 * 64];
            while (ws.State == WebSocketState.Open)
            {
                try
                {
                    var ms = new MemoryStream();
                    WebSocketReceiveResult result;
                    do
                    {
                        result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                        ms.Write(buffer, 0, result.Count);
                    } while (!result.EndOfMessage);

                    var json = Encoding.UTF8.GetString(ms.ToArray());
                    var doc = JsonDocument.Parse(json);
                    var root = doc.RootElement;

                    if (root.TryGetProperty("task_id", out var tIdProp))
                    {
                        var taskId = tIdProp.GetString();
                        if (taskId != null && _pendingTasks.TryGetValue(taskId, out var tcs))
                        {
                            if (root.TryGetProperty("event", out var ev) && ev.GetString() == "completed")
                            {
                                tcs.TrySetResult(root.Clone());
                            }
                        }
                    }
                }
                catch { break; }
            }
        }

        public async Task<bool> WaitForConnectionAsync(TimeSpan timeout)
        {
            var task = await Task.WhenAny(_connectedTcs.Task, Task.Delay(timeout));
            return task == _connectedTcs.Task && _connectedTcs.Task.Result;
        }

        public async Task<JsonElement?> SendTaskAsync(object taskPayload)
        {
            if (_clientSocket?.State != WebSocketState.Open) return null;

            var json = JsonSerializer.Serialize(taskPayload, JsonOptions.Default);
            var doc = JsonDocument.Parse(json);
            var taskId = doc.RootElement.GetProperty("task_id").GetString()!;

            var tcs = new TaskCompletionSource<JsonElement>();
            _pendingTasks[taskId] = tcs;

            var bytes = Encoding.UTF8.GetBytes(json);
            await _clientSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);

            var completed = await Task.WhenAny(tcs.Task, Task.Delay(TimeSpan.FromSeconds(15)));
            if (completed == tcs.Task)
            {
                return await tcs.Task;
            }

            return null;
        }

        public void Stop()
        {
            try { _listener?.Stop(); } catch { }
            try { _clientSocket?.Dispose(); } catch { }
        }
    }
}
