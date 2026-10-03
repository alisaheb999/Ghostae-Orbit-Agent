/**
 * Creative Suite Universal CEP Host Bridge Client
 * Runs inside Adobe CEP panels (After Effects & Premiere Pro)
 */
(function() {
    var csInterface = new CSInterface();
    var WS_PORT = 49815;
    var WS_URL = "ws://127.0.0.1:" + WS_PORT + "/ws";
    var ws = null;
    var reconnectTimer = null;
    var pollingTimer = null;

    var statusEl = null;
    var hostInfoEl = null;

    function updateStatusUI(text, isConnected) {
        if (!statusEl) statusEl = document.getElementById("bridge-status");
        if (!hostInfoEl) hostInfoEl = document.getElementById("host-info");

        if (statusEl) {
            statusEl.innerText = text;
            statusEl.className = isConnected ? "connected" : "disconnected";
        }
    }

    function init() {
        var env = csInterface.getHostEnvironment();
        if (hostInfoEl) {
            hostInfoEl.innerText = env.appName + " v" + env.appVersion;
        }
        connect();
    }

    function connect() {
        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
            return;
        }

        updateStatusUI("Connecting to Hub...", false);

        try {
            ws = new WebSocket(WS_URL);
        } catch (e) {
            scheduleReconnect();
            return;
        }

        ws.onopen = function() {
            updateStatusUI("Connected to Desktop Hub", true);
            if (reconnectTimer) clearTimeout(reconnectTimer);

            // Handshake with host environment details
            var env = csInterface.getHostEnvironment();
            var handshake = {
                type: "Handshake",
                payload: {
                    client_id: "adobe_cep_" + Math.random().toString(36).substring(7),
                    host_app: env.appName,
                    version: env.appVersion
                }
            };
            ws.send(JSON.stringify(handshake));

            // Start polling active composition state every 1.5 seconds
            startStatePolling();
        };

        ws.onmessage = function(event) {
            try {
                var message = JSON.parse(event.data);
                handleIncomingMessage(message);
            } catch (err) {
                console.error("[CEP Bridge] Message parse error:", err);
            }
        };

        ws.onclose = function() {
            updateStatusUI("Disconnected (Waiting for Hub)", false);
            stopStatePolling();
            scheduleReconnect();
        };

        ws.onerror = function(err) {
            ws.close();
        };
    }

    function scheduleReconnect() {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 2000);
    }

    function handleIncomingMessage(msg) {
        if (msg.type === "ApplyPreset") {
            var payload = msg.payload;
            var escapedPath = (payload.file_path || "").replace(/\\/g, "/");
            var script = "HubDispatcher.applyPreset('" + escapedPath + "', '" + payload.preset_type + "')";

            csInterface.evalScript(script, function(rawResult) {
                var result = { success: false };
                try {
                    result = JSON.parse(rawResult);
                } catch(e) {
                    result = { success: false, error: "JSX Error: " + rawResult };
                }

                var response = {
                    type: "ApplyPresetResponse",
                    payload: {
                        success: result.success,
                        error: result.error || null,
                        comp_name: result.compName || null
                    }
                };

                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(response));
                }
            });
        }
    }

    function startStatePolling() {
        stopStatePolling();
        pollingTimer = setInterval(function() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                csInterface.evalScript("HubDispatcher.getActiveCompState()", function(rawResult) {
                    try {
                        var parsed = JSON.parse(rawResult);
                        ws.send(JSON.stringify({
                            type: "HostStateChanged",
                            payload: parsed
                        }));
                    } catch(e) {}
                });
            }
        }, 1500);
    }

    function stopStatePolling() {
        if (pollingTimer) {
            clearInterval(pollingTimer);
            pollingTimer = null;
        }
    }

    window.addEventListener("DOMContentLoaded", init);
})();
