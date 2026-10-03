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
 * Automates PlayerDebugMode = 1 for CSXS 9 through 16 (Adobe 2023 - 2026+)
 */
export function enablePlayerDebugMode() {
    const results = [];
    const csxsVersions = [9, 10, 11, 12, 13, 14, 15, 16];

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

/**
 * Scans all Adobe CEP extension folders on the machine (both user and system level)
 */
export function scanInstalledCEPExtensions() {
    const list = [];
    const dirsToCheck = [];

    const userCep = getUserCEPExtensionsDir();
    dirsToCheck.push({ dir: userCep, isUserDir: true });

    if (process.platform === 'win32') {
        const common32 = path.join(process.env['CommonProgramFiles(x86)'] || 'C:\\Program Files (x86)\\Common Files', 'Adobe', 'CEP', 'extensions');
        const common64 = path.join(process.env['CommonProgramFiles'] || 'C:\\Program Files\\Common Files', 'Adobe', 'CEP', 'extensions');
        if (fs.existsSync(common32)) dirsToCheck.push({ dir: common32, isUserDir: false });
        if (fs.existsSync(common64) && common64 !== common32) dirsToCheck.push({ dir: common64, isUserDir: false });
    }

    const seenFolders = new Set();

    for (const { dir, isUserDir } of dirsToCheck) {
        if (!fs.existsSync(dir)) continue;
        try {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const folderPath = path.join(dir, item);
                if (seenFolders.has(folderPath.toLowerCase())) continue;
                seenFolders.add(folderPath.toLowerCase());

                try {
                    const stat = fs.statSync(folderPath);
                    if (!stat.isDirectory()) continue;

                    const manifestPath = path.join(folderPath, 'CSXS', 'manifest.xml');
                    if (!fs.existsSync(manifestPath)) continue;

                    const xml = fs.readFileSync(manifestPath, 'utf8');

                    // Extract Bundle ID
                    const bundleMatch = xml.match(/ExtensionBundleId=["']([^"']+)["']/i);
                    const bundleId = bundleMatch ? bundleMatch[1] : item;

                    // Extract Name
                    const nameMatch = xml.match(/ExtensionBundleName=["']([^"']+)["']/i) || xml.match(/<Menu[^>]*>([^<]+)<\/Menu>/i);
                    const displayName = nameMatch ? nameMatch[1].trim() : item;

                    // Extract Version
                    const verMatch = xml.match(/ExtensionBundleVersion=["']([^"']+)["']/i) || xml.match(/Version=["']([^"']+)["']/i);
                    const version = verMatch ? verMatch[1] : '1.0.0';

                    // Extract Host apps
                    const hosts = [];
                    const hostMatches = xml.matchAll(/<Host\s+Name=["']([^"']+)["']/gi);
                    for (const m of hostMatches) {
                        const h = m[1];
                        if (h === 'AEFT') hosts.push('After Effects');
                        else if (h === 'PPRO') hosts.push('Premiere Pro');
                        else if (h === 'PHXS') hosts.push('Photoshop');
                        else if (h === 'ILST') hosts.push('Illustrator');
                        else hosts.push(h);
                    }

                    const isOfficial = /ghost/i.test(bundleId) || /ghost/i.test(item) || /ghost/i.test(displayName);

                    list.push({
                        id: bundleId,
                        folderName: item,
                        displayName,
                        version,
                        hosts: [...new Set(hosts)],
                        fullPath: folderPath,
                        isUserDir,
                        isOfficial,
                        modifiedAt: stat.mtimeMs
                    });
                } catch (folderErr) {}
            }
        } catch (dirErr) {}
    }

    return list;
}

/**
 * Safely uninstalls / removes an extension folder from the user CEP directory
 */
export function deleteInstalledExtension(folderName) {
    if (!folderName || typeof folderName !== 'string' || folderName.includes('..') || folderName.includes('/') || folderName.includes('\\')) {
        throw new Error('Invalid extension folder name.');
    }
    const userCep = getUserCEPExtensionsDir();
    const target = path.join(userCep, folderName);
    if (!fs.existsSync(target)) {
        throw new Error(`Extension folder not found: ${folderName}`);
    }
    fs.rmSync(target, { recursive: true, force: true });
    return { success: true, folderName };
}

