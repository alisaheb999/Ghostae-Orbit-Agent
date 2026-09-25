using System;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Ghostae.Orbit.Agent.Models;

namespace Ghostae.Orbit.Agent.Services
{
    public class OrbitWebSocketClient
    {
        private static readonly Lazy<OrbitWebSocketClient> _instance = new(() => new OrbitWebSocketClient());
        public static OrbitWebSocketClient Instance => _instance.Value;

        private ClientWebSocket? _webSocket;
        private CancellationTokenSource? _connectionCts;
        private Task? _heartbeatTask;
        private readonly object _stateLock = new();

        public ConnectionState State { get; private set; } = ConnectionState.Disconnected;
        public DateTime? LastHeartbeatTime { get; private set; }
        public string? LastError { get; private set; }
        public bool IsPaused { get; set; } = false;

        public event Action<ConnectionState>? OnConnectionStateChanged;
        public event Action<DateTime>? OnHeartbeat;

        public OrbitWebSocketClient()
        {
            // Subscribe to task engine events to automatically send responses/progress back over WebSocket
            TaskExecutionEngine.Instance.OnTaskEventGenerated += async (resp) =>
            {
                await SendMessageAsync(resp);
            };
        }

        public void Start()
        {
            lock (_stateLock)
            {
                if (State == ConnectionState.Connected || State == ConnectionState.Connecting)
                    return;

                _connectionCts = new CancellationTokenSource();
                _ = Task.Run(() => ConnectionLoopAsync(_connectionCts.Token));
            }
        }

        public void Stop()
        {
            lock (_stateLock)
            {
                _connectionCts?.Cancel();
                CloseSocket();
                SetState(ConnectionState.Disconnected);
            }
        }

        public void Reconnect()
        {
            Stop();
            Start();
        }

        private async Task ConnectionLoopAsync(CancellationToken token)
        {
            int retryDelayMs = 2000;
            const int maxRetryDelayMs = 30000;

            while (!token.IsCancellationRequested)
            {
                if (IsPaused)
                {
                    await Task.Delay(2000, token);
                    continue;
                }

                try
                {
                    SetState(ConnectionState.Connecting);
                    var config = ConfigService.Instance.Current;
                    var uri = new Uri(config.ServerUrl);

                    LoggingService.Instance.Info(LogCategory.Connection, $"Connecting outbound to Orbit server: {config.ServerUrl}");

                    _webSocket = new ClientWebSocket();
                    _webSocket.Options.KeepAliveInterval = TimeSpan.FromSeconds(20);

                    // Connect with timeout
                    using var connectCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                    using var linked = CancellationTokenSource.CreateLinkedTokenSource(token, connectCts.Token);
                    await _webSocket.ConnectAsync(uri, linked.Token);

                    SetState(ConnectionState.Connected);
                    LastError = null;
                    retryDelayMs = 2000;
                    LoggingService.Instance.Success(LogCategory.Connection, "Secure WebSocket connection established to Orbit server");

                    // Send authentication handshake
                    await SendAuthHandshakeAsync();

                    // Start background heartbeat
                    _heartbeatTask = Task.Run(() => HeartbeatLoopAsync(token), token);

                    // Listen loop
                    await ListenLoopAsync(token);
                }
                catch (OperationCanceledException) when (token.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    LastError = ex.Message;
                    SetState(ConnectionState.Disconnected);
                    LoggingService.Instance.Warn(LogCategory.Connection, $"WebSocket connection lost: {ex.Message}. Reconnecting in {retryDelayMs / 1000}s...");

                    CloseSocket();

                    try
                    {
                        await Task.Delay(retryDelayMs, token);
                        retryDelayMs = Math.Min(retryDelayMs * 2, maxRetryDelayMs);
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                }
            }

            SetState(ConnectionState.Disconnected);
        }

        private async Task SendAuthHandshakeAsync()
        {
            var config = ConfigService.Instance.Current;
            var handshake = new
            {
                type = "auth",
                device_id = config.DeviceId,
                device_name = config.DeviceName,
                token = ConfigService.Instance.GetAuthToken(),
                version = "1.0.0",
                platform = "Windows",
                timestamp = DateTime.UtcNow.ToString("o")
            };

            await SendRawJsonAsync(JsonSerializer.Serialize(handshake, JsonOptions.Default));
            LoggingService.Instance.Info(LogCategory.Connection, $"Sent device identity handshake: {config.DeviceId}");
        }

        private async Task HeartbeatLoopAsync(CancellationToken token)
        {
            while (!token.IsCancellationRequested && State == ConnectionState.Connected)
            {
                try
                {
                    var interval = ConfigService.Instance.Current.HeartbeatIntervalSeconds;
                    await Task.Delay(TimeSpan.FromSeconds(interval), token);

                    if (State == ConnectionState.Connected)
                    {
                        var hb = new
                        {
                            type = "heartbeat",
                            device_id = ConfigService.Instance.Current.DeviceId,
                            status = "online",
                            timestamp = DateTime.UtcNow.ToString("o")
                        };

                        await SendRawJsonAsync(JsonSerializer.Serialize(hb, JsonOptions.Default));
                        LastHeartbeatTime = DateTime.Now;
                        OnHeartbeat?.Invoke(DateTime.Now);
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    LoggingService.Instance.Warn(LogCategory.Connection, "Failed to send heartbeat", ex.Message);
                    break;
                }
            }
        }

        private async Task ListenLoopAsync(CancellationToken token)
        {
            var buffer = new byte[1024 * 64];

            while (!token.IsCancellationRequested && _webSocket?.State == WebSocketState.Open)
            {
                var ms = new System.IO.MemoryStream();
                WebSocketReceiveResult result;

                do
                {
                    result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), token);
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                        SetState(ConnectionState.Disconnected);
                        return;
                    }

                    ms.Write(buffer, 0, result.Count);
                }
                while (!result.EndOfMessage);

                var messageJson = Encoding.UTF8.GetString(ms.ToArray());
                _ = ProcessIncomingMessageAsync(messageJson);
            }
        }

        public async Task ProcessIncomingMessageAsync(string json)
        {
            await Task.Yield();
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                // Check for cancel signal
                if (root.TryGetProperty("action", out var actionProp) &&
                    string.Equals(actionProp.GetString(), "cancel", StringComparison.OrdinalIgnoreCase) &&
                    root.TryGetProperty("task_id", out var cancelTaskId))
                {
                    TaskExecutionEngine.Instance.CancelTask(cancelTaskId.GetString() ?? "");
                    return;
                }

                // Parse standard command request
                var request = JsonSerializer.Deserialize<CommandRequest>(json, JsonOptions.Default);
                if (request != null && !string.IsNullOrEmpty(request.Tool))
                {
                    LoggingService.Instance.Info(LogCategory.Tasks, $"Received command from Orbit: {request.Tool} (ID: {request.TaskId})");
                    // Enqueue and run in background task engine
                    _ = TaskExecutionEngine.Instance.EnqueueAndRunTaskAsync(request);
                }
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Error(LogCategory.Connection, "Failed to parse incoming Orbit message", ex.Message);
            }
        }

        public async Task SendMessageAsync(CommandResponse response)
        {
            var json = JsonSerializer.Serialize(response, JsonOptions.Default);
            await SendRawJsonAsync(json);
        }

        public async Task SendRawMessageAsync(string json) => await SendRawJsonAsync(json);

        public async Task SendRawJsonAsync(string json)
        {
            if (_webSocket?.State != WebSocketState.Open) return;

            try
            {
                var bytes = Encoding.UTF8.GetBytes(json);
                await _webSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
            }
            catch (Exception ex)
            {
                LoggingService.Instance.Warn(LogCategory.Connection, "Error sending WebSocket packet", ex.Message);
            }
        }

        private void CloseSocket()
        {
            try
            {
                _webSocket?.Dispose();
            }
            catch { }
            _webSocket = null;
        }

        private void SetState(ConnectionState newState)
        {
            if (State != newState)
            {
                State = newState;
                OnConnectionStateChanged?.Invoke(newState);
            }
        }
    }
}
