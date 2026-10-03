import crypto from 'crypto';
import { execSync } from 'child_process';

/**
 * Computes a privacy-preserving, deterministic Hardware ID (HWID)
 */
export function getHardwareID() {
    let rawIdentifier = "";

    try {
        if (process.platform === 'win32') {
            // Get BIOS / Motherboard UUID
            const uuidOutput = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"', { stdio: 'pipe' })
                .toString().trim();
            // Get Processor Id
            const cpuOutput = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_Processor).ProcessorId"', { stdio: 'pipe' })
                .toString().trim();

            rawIdentifier = `${uuidOutput}_${cpuOutput}`;
        } else if (process.platform === 'darwin') {
            const macUuid = execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { split($0, line, \"\\\"\"); print line[4] }'", { stdio: 'pipe' })
                .toString().trim();
            rawIdentifier = macUuid;
        } else {
            rawIdentifier = `${process.arch}_${process.platform}_creative_suite`;
        }
    } catch (e) {
        console.warn("[HWID] Fallback to system hostname hash:", e.message);
        rawIdentifier = `${process.env.COMPUTERNAME || 'generic_host'}_creative_fallback`;
    }

    // SHA-256 hash with an app-specific salt
    const salt = "creative_suite_hub_2026_salt";
    return crypto.createHash('sha256').update(rawIdentifier + salt).digest('hex');
}
