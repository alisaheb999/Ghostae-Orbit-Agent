import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Returns standard user-level CEP directory path
 */
export function getUserCEPExtensionsDir() {
    if (process.platform === 'win32') {
        const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || 'C:\\', 'AppData', 'Roaming');
        return path.join(appData, 'Adobe', 'CEP', 'extensions');
    } else if (process.platform === 'darwin') {
        const home = process.env.HOME || '/Users/Shared';
        return path.join(home, 'Library', 'Application Support', 'Adobe', 'CEP', 'extensions');
    }
    throw new Error('Unsupported operating system for Adobe CEP.');
}

/**
 * Automates PlayerDebugMode = 1 for CSXS 9 to 15
 */
export function enablePlayerDebugMode() {
    const results = [];
    const csxsVersions = [9, 10, 11, 12, 13, 14, 15];

    if (process.platform === 'win32') {
        for (const v of csxsVersions) {
            try {
                const regKey = `HKCU\\Software\\Adobe\\CSXS.${v}`;
                // Set PlayerDebugMode string value to "1"
                execSync(`reg add "${regKey}" /v PlayerDebugMode /t REG_SZ /d "1" /f`, { stdio: 'pipe' });
                results.push({ csxs: v, success: true });
            } catch (err) {
                results.push({ csxs: v, success: false, error: err.message });
            }
        }
    } else if (process.platform === 'darwin') {
        for (const v of csxsVersions) {
            try {
                const domain = `com.adobe.CSXS.${v}`;
                execSync(`defaults write ${domain} PlayerDebugMode 1`, { stdio: 'pipe' });
                results.push({ csxs: v, success: true });
            } catch (err) {
                results.push({ csxs: v, success: false, error: err.message });
            }
        }
    }

    return results;
}

/**
 * Safely installs/links an extension folder into the CEP directory
 * Uses unprivileged NTFS Junction (Windows mklink /J) or POSIX symlink (macOS)
 */
export function installExtensionJunction(sourcePath, extensionId) {
    const cepDir = getUserCEPExtensionsDir();

    // Ensure the Adobe/CEP/extensions directory exists
    if (!fs.existsSync(cepDir)) {
        fs.mkdirSync(cepDir, { recursive: true });
    }

    const targetPath = path.join(cepDir, extensionId);

    // If target already exists, clean it up first
    if (fs.existsSync(targetPath)) {
        try {
            const stats = fs.lstatSync(targetPath);
            if (stats.isSymbolicLink() || stats.isDirectory()) {
                fs.rmSync(targetPath, { recursive: true, force: true });
            }
        } catch (e) {
            console.warn(`[CEP Installer] Cleanup warning for ${targetPath}:`, e.message);
        }
    }

    if (process.platform === 'win32') {
        // Windows NTFS Directory Junction does NOT require administrator privileges!
        const cmd = `cmd /c mklink /J "${targetPath}" "${sourcePath}"`;
        execSync(cmd, { stdio: 'pipe' });
    } else {
        // macOS POSIX Symlink
        fs.symlinkSync(sourcePath, targetPath, 'dir');
    }

    return {
        installed: true,
        sourcePath,
        targetPath
    };
}
