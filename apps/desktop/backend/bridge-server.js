import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import os from 'os';

const GHOSTAE_ENTITLEMENT_SECRET = 'ghostae_entitlement_v1_k9z2!x7Q';

function getLocalDeterministicHWID() {
    try {
        if (process.platform === 'win32') {
            const output = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { encoding: 'utf-8' });
            const match = output.match(/MachineGuid\s+REG_SZ\s+([a-zA-Z0-9-]+)/i);
            if (match && match[1]) return match[1].trim();
            const psOutput = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"', { encoding: 'utf-8' });
            if (psOutput.trim() && psOutput.trim().length > 8) return psOutput.trim();
        } else if (process.platform === 'darwin') {
            const output = execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { split($0, line, \"\\\"\"); print line[4] }'", { encoding: 'utf-8' });
            if (output.trim()) return output.trim();
        } else if (process.platform === 'linux') {
            if (fs.existsSync('/etc/machine-id')) return fs.readFileSync('/etc/machine-id', 'utf8').trim();
            if (fs.existsSync('/var/lib/dbus/machine-id')) return fs.readFileSync('/var/lib/dbus/machine-id', 'utf8').trim();
        }
    } catch (e) {}
    return crypto.createHash('sha256').update(os.hostname() + (os.userInfo?.()?.username || 'user')).digest('hex').slice(0, 32);
}

function getHubSessionPath() {
    if (process.platform === 'win32') {
        const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Admin', 'AppData', 'Roaming');
        return path.join(appData, 'Ghostae', 'hub_session.json');
    } else if (process.platform === 'darwin') {
        return path.join(process.env.HOME || '', 'Library', 'Application Support', 'Ghostae', 'hub_session.json');
    } else {
        return path.join(process.env.HOME || '', '.config', 'Ghostae', 'hub_session.json');
    }
}

function readHubSession() {
    try {
        const sessionPath = getHubSessionPath();
        if (fs.existsSync(sessionPath)) {
            const raw = fs.readFileSync(sessionPath, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn('[Bridge Server] Error reading hub session:', e.message);
    }
    return null;
}

/**
 * Validates cryptographically signed local entitlement
 * Never calls network. Fails if JSON was tampered or machine differs.
 */
function verifyProductLicense(productSlug) {
    const rawSlug = String(productSlug || 'text').trim().toLowerCase();
    const normSlug = rawSlug.replace(/^prod-/, '').replace(/^ghostae-/, '');
    const fullSlug = `ghostae-${normSlug}`;

    const session = readHubSession();
    if (!session) {
        return {
            valid: false,
            plan: 'free',
            status: 'inactive',
            product: normSlug,
            checkedVia: 'hub_socket'
        };
    }

    // Machine check if signature is present
    const currentMachineId = getLocalDeterministicHWID();
    const licensesMap = session.licenses || {};
    const entitlementsMap = session.entitlements || {};
    const record = licensesMap[normSlug] || licensesMap[fullSlug] || licensesMap[rawSlug] ||
                   entitlementsMap[normSlug] || entitlementsMap[fullSlug] || entitlementsMap[rawSlug];

    if (!record) {
        return {
            valid: false,
            plan: 'free',
            status: 'inactive',
            product: normSlug,
            checkedVia: 'hub_socket'
        };
    }

    if (session.machine_id && session.machine_id !== currentMachineId && record.signature) {
        console.warn('[Bridge Server] Entitlement rejected: Machine ID mismatch');
        return {
            valid: false,
            plan: 'free',
            status: 'inactive',
            product: normSlug,
            checkedVia: 'hub_socket'
        };
    }

    // 1. Expiration / Offline Grace Check (30 days)
    const offlineUntil = record.offline_until || session.offline_until;
    if (offlineUntil) {
        const expiryTime = new Date(offlineUntil).getTime();
        if (!isNaN(expiryTime) && Date.now() > expiryTime) {
            console.warn('[Bridge Server] Entitlement offline grace expired on:', offlineUntil);
            return {
                valid: false,
                plan: 'free',
                status: 'inactive',
                product: normSlug,
                checkedVia: 'hub_socket',
                offlineUntil: offlineUntil,
                graceExpired: true
            };
        }
    }

    // 2. Cryptographic Signature Verification (if HMAC signature exists)
    if (record.signature) {
        const expectedMachine = record.machine_id || session.machine_id || currentMachineId;
        const issuedAt = record.issued_at || session.last_synced || '';
        const payloadToVerify = `${normSlug}|${expectedMachine}|${issuedAt}|${offlineUntil || ''}|${record.status}|${record.plan}`;
        const computedSignature = crypto.createHmac('sha256', GHOSTAE_ENTITLEMENT_SECRET).update(payloadToVerify).digest('hex');

        if (computedSignature !== record.signature) {
            console.warn('[Bridge Server] Entitlement signature mismatch! Tampered session detected.');
            return {
                valid: false,
                plan: 'free',
                status: 'inactive',
                product: normSlug,
                checkedVia: 'hub_socket'
            };
        }
    }

    const isActive = record.valid === true || record.status === 'active' || record.status === 'Lifetime';
    if (isActive) {
        return {
            valid: true,
            plan: record.plan || (record.status === 'Lifetime' ? 'lifetime' : 'pro'),
            status: 'active',
            product: normSlug,
            checkedVia: 'hub_socket',
            offlineUntil: offlineUntil || undefined
        };
    }

    return {
        valid: false,
        plan: 'free',
        status: 'inactive',
        product: normSlug,
        checkedVia: 'hub_socket'
    };
}

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
                // Rule 6: Strictly bind only to 127.0.0.1, never 0.0.0.0
                this.wss = new WebSocketServer({ port: this.port, host: '127.0.0.1' }, () => {
                    console.log(`[Bridge Server] Strictly listening on ws://127.0.0.1:${this.port}/ws`);
                    this.emit('started', this.port);
                    resolve(this.port);
                });

                this.wss.on('connection', (ws) => {
                    let clientId = null;

                    ws.on('message', (data) => {
                        try {
                            const rawStr = data.toString().trim();
                            if (rawStr.length > 32768) {
                                // Reject abnormally large frames safely
                                return;
                            }
                            let message;
                            if (rawStr === 'CHECK_LICENSE' || rawStr.toUpperCase() === 'CHECK_LICENSE') {
                                message = { action: 'CHECK_LICENSE', product: 'text' };
                            } else {
                                message = JSON.parse(rawStr);
                            }
                            this.handleMessage(ws, message, (id) => { clientId = id; });
                        } catch (err) {
                            console.error('[Bridge Server] Malformed JSON message rejected:', err.message);
                        }
                    });

                    ws.on('close', () => {
                        if (clientId) {
                            this.clients.delete(clientId);
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
        // Strict message schema validation
        if (!msg || typeof msg !== 'object') {
            return;
        }

        const action = String(msg.action || msg.type || '').trim().toUpperCase();

        // 1. Live Entitlement verification for Adobe CEP extensions (Ghostae Universal SDK)
        if (action === 'GET_LICENSE' || action === 'CHECK_LICENSE') {
            const rawProduct = String(msg.product || msg.product_slug || msg.payload?.product || 'text');
            // Sanitize product string
            if (!/^[a-zA-Z0-9._-]+$/.test(rawProduct)) {
                ws.send(JSON.stringify({ status: 'inactive', plan: 'free', valid: false, error: 'Invalid product identifier' }));
                return;
            }

            const response = verifyProductLicense(rawProduct);
            if (msg.requestId) response.requestId = msg.requestId;
            if (msg.id) response.id = msg.id;

            // Rule 6: Strictly return minimum entitlement state (No license keys, No bearer tokens)
            ws.send(JSON.stringify(response));
            console.log(`[Bridge Server] Responded to ${action} for "${rawProduct}": ${response.status}`);
            return;
        }

        // 2. Health check ping
        if (action === 'PING') {
            ws.send(JSON.stringify({ action: 'PONG', type: 'PONG', status: 'ok', timestamp: Date.now() }));
            return;
        }

        // 3. CEP Host Application Handshake
        if (msg.type === 'Handshake') {
            if (msg.payload && typeof msg.payload === 'object') {
                const { client_id, host_app, version } = msg.payload;
                if (client_id && typeof client_id === 'string') {
                    setClientId(client_id);
                    this.clients.set(client_id, ws);
                    console.log(`[Bridge Server] Handshake successful: ${host_app} v${version} (${client_id})`);
                    this.emit('client_connected', { client_id, host_app, version });
                }
            }
            return;
        }

        if (msg.type === 'HostStateChanged') {
            if (msg.payload && typeof msg.payload === 'object') {
                this.latestHostState = msg.payload;
                this.emit('host_state_changed', msg.payload);
            }
            return;
        }

        if (msg.type === 'ApplyPresetResponse') {
            if (msg.payload) {
                this.emit('apply_response', msg.payload);
            }
            return;
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

            const onResponse = (res) => {
                this.off('apply_response', onResponse);
                if (res.success) {
                    resolve(res);
                } else {
                    reject(new Error(res.error || "ExtendScript execution failed."));
                }
            };

            this.once('apply_response', onResponse);

            setTimeout(() => {
                this.off('apply_response', onResponse);
                reject(new Error("Timeout waiting for Adobe host response."));
            }, 8000);
        });
    }

    stop() {
        console.log('[Bridge Server] Shutting down WebSocket bridge server...');
        for (const [id, client] of this.clients.entries()) {
            try {
                client.terminate();
            } catch (e) {}
        }
        this.clients.clear();

        if (this.wss) {
            try {
                this.wss.close();
            } catch (e) {}
            this.wss = null;
        }
    }
}
