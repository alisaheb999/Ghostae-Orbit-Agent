import path from 'path';
import { fileURLToPath } from 'url';
import { detectAdobeInstallations } from './adobe-detector.js';
import { enablePlayerDebugMode, installExtensionJunction } from './cep-installer.js';
import { AdobeBridgeServer } from './bridge-server.js';
import { getHardwareID } from './hwid.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function bootstrapBridge() {
    console.log("[Creative Hub] Initializing Adobe Bridge Subsystem...");
    
    // 1. Enable PlayerDebugMode
    enablePlayerDebugMode();

    // 2. Link Bridge Extension
    const bridgeSourceDir = path.resolve(__dirname, '../../cep-bridge');
    try {
        installExtensionJunction(bridgeSourceDir, 'com.creativesuite.hub.bridge');
    } catch (e) {
        console.warn("[Creative Hub] Bridge link notice:", e.message);
    }

    // 3. Start WebSocket Server
    const bridge = new AdobeBridgeServer(49815);
    await bridge.start();
    return bridge;
}
