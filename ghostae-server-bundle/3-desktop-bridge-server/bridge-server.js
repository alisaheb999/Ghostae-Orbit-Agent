import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

export class AdobeBridgeServer extends EventEmitter {
    constructor(port = 49815) {
        super();
        this.port = port;
        this.wss = null;
        this.clients = new Map(); // clientId -> WebSocket
        this.latestHostState = { comp_active: false, comp_name: "No Host Connected", duration: 0.0 };
    }

    start() {
        return new Promise((resolve, reject) => {
            try {
                this.wss = new WebSocketServer({ port: this.port, host: '127.0.0.1' }, () => {
                    console.log(`[Bridge Server] Listening on ws://127.0.0.1:${this.port}/ws`);
                    this.emit('started', this.port);
                    resolve(this.port);
                });

                this.wss.on('connection', (ws, req) => {
                    let clientId = null;

                    ws.on('message', (data) => {
                        try {
                            const message = JSON.parse(data.toString());
                            this.handleMessage(ws, message, (id) => { clientId = id; });
                        } catch (err) {
                            console.error('[Bridge Server] Error parsing JSON message:', err);
                        }
                    });

                    ws.on('close', () => {
                        if (clientId) {
                            this.clients.delete(clientId);
                            console.log(`[Bridge Server] Client disconnected: ${clientId}`);
                            this.emit('client_disconnected', clientId);
                        }
                    });

                    ws.on('error', (err) => {
                        console.error('[Bridge Server] Socket error:', err.message);
                    });
                });

                this.wss.on('error', (err) => {
                    console.error('[Bridge Server] Server failure:', err.message);
                    this.emit('error', err);
                    reject(err);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    handleMessage(ws, msg, setClientId) {
        switch (msg.type) {
            case 'Handshake': {
                const { client_id, host_app, version } = msg.payload;
                setClientId(client_id);
                this.clients.set(client_id, ws);
                console.log(`[Bridge Server] Handshake successful: ${host_app} v${version} (${client_id})`);
                this.emit('client_connected', { client_id, host_app, version });
                break;
            }
            case 'HostStateChanged': {
                this.latestHostState = msg.payload;
                this.emit('host_state_changed', msg.payload);
                break;
            }
            case 'ApplyPresetResponse': {
                this.emit('apply_response', msg.payload);
                break;
            }
            default:
                break;
        }
    }

    applyPreset(presetData) {
        return new Promise((resolve, reject) => {
            if (this.clients.size === 0) {
                return reject(new Error("No active Adobe After Effects or Premiere Pro session connected to bridge."));
            }

            const outgoing = {
                type: 'ApplyPreset',
                payload: {
                    preset_id: presetData.preset_id || 'preset_custom',
                    preset_type: presetData.preset_type || 'FFX_PRESET',
                    file_path: presetData.file_path,
                    target_layer: presetData.target_layer || null
                }
            };

            const jsonStr = JSON.stringify(outgoing);
            for (const [id, client] of this.clients.entries()) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(jsonStr);
                }
            }

            // Await response
            const onResponse = (res) => {
                this.off('apply_response', onResponse);
                if (res.success) {
                    resolve(res);
                } else {
                    reject(new Error(res.error || "ExtendScript execution failed."));
                }
            };

            this.once('apply_response', onResponse);

            // 8 second timeout safety
            setTimeout(() => {
                this.off('apply_response', onResponse);
                reject(new Error("Timeout waiting for Adobe host response."));
            }, 8000);
        });
    }

    stop() {
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
    }
}
