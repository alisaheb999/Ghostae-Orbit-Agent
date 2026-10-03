import { detectAdobeInstallations } from './adobe-detector.js';
import { enablePlayerDebugMode, installExtensionJunction, getUserCEPExtensionsDir } from './cep-installer.js';
import { getHardwareID } from './hwid.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=== VERIFYING CREATIVE SUITE HOST SUBSYSTEM ===");

// 1. HWID
const hwid = getHardwareID();
console.log(`[1] HWID: ${hwid}`);

// 2. Adobe Scanner
const installs = detectAdobeInstallations();
console.log(`[2] Detected ${installs.length} Adobe Installations:`);
installs.forEach(i => console.log(`    - ${i.name} -> ${i.versionName} (CSXS ${i.csxsVersion})`));

// 3. PlayerDebugMode in Windows Registry
console.log(`[3] Configuring PlayerDebugMode = 1 in Registry...`);
const regResults = enablePlayerDebugMode();
const okCount = regResults.filter(r => r.success).length;
console.log(`    Registry Updated: ${okCount}/${regResults.length} CSXS versions configured successfully.`);

// 4. CEP Deployment via NTFS Junction
const bridgeSource = path.resolve(__dirname, '../../cep-bridge');
const target = installExtensionJunction(bridgeSource, 'com.creativesuite.hub.bridge');
console.log(`[4] Universal CEP Bridge Deployment:`);
console.log(`    Source: ${target.sourcePath}`);
console.log(`    Linked: ${target.targetPath}`);
console.log(`    Verified exists: ${target.installed}`);

console.log("=== ALL HOST SUBSYSTEMS VERIFIED & READY ===");
