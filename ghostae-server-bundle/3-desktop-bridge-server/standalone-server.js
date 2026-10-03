import path from 'path';
import { fileURLToPath } from 'url';
import { detectAdobeInstallations } from './adobe-detector.js';
import { enablePlayerDebugMode, installExtensionJunction, getUserCEPExtensionsDir } from './cep-installer.js';
import { AdobeBridgeServer } from './bridge-server.js';
import { getHardwareID } from './hwid.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
    console.log("==================================================================");
    console.log(" CREATIVE SUITE HUB - BACKEND & ADOBE BRIDGE INITIALIZATION");
    console.log("==================================================================");

    // 1. Generate HWID
    const hwid = getHardwareID();
    console.log(`[Security] System HWID: ${hwid.substring(0, 16)}...`);

    // 2. Detect Adobe Apps
    const installations = detectAdobeInstallations();
    console.log(`[Adobe Discovery] Found ${installations.length} Adobe application(s):`);
    for (const inst of installations) {
        console.log(`   - ${inst.versionName} (CSXS ${inst.csxsVersion}) -> ${inst.executablePath}`);
    }

    // 3. Enable PlayerDebugMode in Registry
    console.log("\n[Registry] Setting PlayerDebugMode = 1 for CSXS 9 to 15...");
    const debugResults = enablePlayerDebugMode();
    const successCount = debugResults.filter(r => r.success).length;
    console.log(`[Registry] Configured ${successCount} CSXS registry entries.`);

    // 4. Install Universal Bridge Extension via NTFS Junction
    const bridgeSourceDir = path.resolve(__dirname, '../../cep-bridge');
    console.log(`\n[Deployment] Linking Universal Bridge from: ${bridgeSourceDir}`);
    try {
        const deployRes = installExtensionJunction(bridgeSourceDir, 'com.creativesuite.hub.bridge');
        console.log(`[Deployment] Successfully linked bridge to: ${deployRes.targetPath}`);
    } catch (e) {
        console.error(`[Deployment Error]:`, e.message);
    }

    // 5. Start Localhost WebSocket Bridge Server
    console.log("\n[Bridge] Starting WebSocket server on 127.0.0.1:49815...");
    const bridgeServer = new AdobeBridgeServer(49815);
    await bridgeServer.start();

    bridgeServer.on('client_connected', (client) => {
        console.log(`[Bridge Event] Adobe Host Connected: ${client.host_app} v${client.version}`);
    });

    bridgeServer.on('host_state_changed', (state) => {
        console.log(`[Bridge Event] Active Timeline: "${state.comp_name}" (Active: ${state.comp_active})`);
    });

    console.log("\n>>> Creative Suite Hub Engine is READY & LISTENING for Adobe Events! <<<");
}

bootstrap().catch(err => {
    console.error("Bootstrap Failure:", err);
});
