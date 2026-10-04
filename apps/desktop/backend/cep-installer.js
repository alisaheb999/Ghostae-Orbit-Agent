import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';

const CSXS_VERSIONS = [9, 10, 11, 12, 13, 14, 15, 16];

/**
 * Returns the standard per-user Adobe CEP extensions directory.
 */
export function getUserCEPExtensionsDir() {
    if (process.platform === 'win32') {
        const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || 'C:\\', 'AppData', 'Roaming');
        return path.join(appData, 'Adobe', 'CEP', 'extensions');
    }
    if (process.platform === 'darwin') {
        const home = process.env.HOME || '/Users/Shared';
        return path.join(home, 'Library', 'Application Support', 'Adobe', 'CEP', 'extensions');
    }
    throw new Error('Unsupported operating system for Adobe CEP.');
}

function runAsync(cmd, args) {
    return new Promise((resolve) => {
        execFile(cmd, args, { windowsHide: true }, (err) => resolve(!err));
    });
}

/**
 * Enables PlayerDebugMode = 1 for CSXS 9..16 (Adobe 2019 - 2026+).
 * Fully asynchronous so it never blocks the Electron main thread.
 */
export async function enablePlayerDebugMode() {
    if (process.platform === 'win32') {
        await Promise.all(CSXS_VERSIONS.map((v) =>
            runAsync('reg', ['add', `HKCU\\Software\\Adobe\\CSXS.${v}`, '/v', 'PlayerDebugMode', '/t', 'REG_SZ', '/d', '1', '/f'])
        ));
    } else if (process.platform === 'darwin') {
        await Promise.all(CSXS_VERSIONS.map((v) =>
            runAsync('defaults', ['write', `com.adobe.CSXS.${v}`, 'PlayerDebugMode', '1'])
        ));
    }
}

function readManifestInfo(manifestPath, fallbackName) {
    const xml = fs.readFileSync(manifestPath, 'utf8');

    const bundleMatch = xml.match(/ExtensionBundleId=["']([^"']+)["']/i);
    const nameMatch = xml.match(/ExtensionBundleName=["']([^"']+)["']/i) || xml.match(/<Menu[^>]*>([^<]+)<\/Menu>/i);
    const verMatch = xml.match(/ExtensionBundleVersion=["']([^"']+)["']/i) || xml.match(/Version=["']([^"']+)["']/i);

    const hosts = [];
    for (const m of xml.matchAll(/<Host\s+Name=["']([^"']+)["']/gi)) {
        const h = m[1];
        if (h === 'AEFT') hosts.push('After Effects');
        else if (h === 'PPRO') hosts.push('Premiere Pro');
        else if (h === 'PHXS') hosts.push('Photoshop');
        else if (h === 'ILST') hosts.push('Illustrator');
        else hosts.push(h);
    }

    return {
        bundleId: bundleMatch ? bundleMatch[1] : fallbackName,
        displayName: nameMatch ? nameMatch[1].trim() : fallbackName,
        version: verMatch ? verMatch[1] : '0.0.0',
        hosts: [...new Set(hosts)]
    };
}

/**
 * Scans the Adobe CEP extension folders (user + system level) and reports what is
 * physically installed. This is the single source of truth for "installed" state.
 */
export function scanInstalledCEPExtensions() {
    const list = [];
    const dirsToCheck = [{ dir: getUserCEPExtensionsDir(), isUserDir: true }];

    if (process.platform === 'win32') {
        const common32 = path.join(process.env['CommonProgramFiles(x86)'] || 'C:\\Program Files (x86)\\Common Files', 'Adobe', 'CEP', 'extensions');
        const common64 = path.join(process.env['CommonProgramFiles'] || 'C:\\Program Files\\Common Files', 'Adobe', 'CEP', 'extensions');
        if (fs.existsSync(common32)) dirsToCheck.push({ dir: common32, isUserDir: false });
        if (common64.toLowerCase() !== common32.toLowerCase() && fs.existsSync(common64)) {
            dirsToCheck.push({ dir: common64, isUserDir: false });
        }
    }

    const seen = new Set();

    for (const { dir, isUserDir } of dirsToCheck) {
        if (!fs.existsSync(dir)) continue;
        let items = [];
        try { items = fs.readdirSync(dir); } catch (e) { continue; }

        for (const item of items) {
            const folderPath = path.join(dir, item);
            const dedupeKey = folderPath.toLowerCase();
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);

            try {
                if (!fs.statSync(folderPath).isDirectory()) continue;
                const manifestPath = path.join(folderPath, 'CSXS', 'manifest.xml');
                if (!fs.existsSync(manifestPath)) continue;

                const info = readManifestInfo(manifestPath, item);
                const isOfficial = /ghost/i.test(info.bundleId) || /ghost/i.test(item) || /ghost/i.test(info.displayName);

                list.push({
                    id: info.bundleId,
                    folderName: item,
                    displayName: info.displayName,
                    version: info.version,
                    hosts: info.hosts,
                    fullPath: folderPath,
                    isUserDir,
                    isOfficial,
                    modifiedAt: fs.statSync(folderPath).mtimeMs
                });
            } catch (e) { /* skip unreadable folder */ }
        }
    }

    return list;
}

/**
 * Removes an extension folder from the user CEP directory.
 */
export function deleteInstalledExtension(folderName) {
    if (!folderName || typeof folderName !== 'string' || folderName.includes('..') || folderName.includes('/') || folderName.includes('\\')) {
        throw new Error('Invalid extension folder name.');
    }
    const target = path.join(getUserCEPExtensionsDir(), folderName);
    if (!fs.existsSync(target)) {
        throw new Error(`Extension folder not found: ${folderName}`);
    }
    fs.rmSync(target, { recursive: true, force: true });
    return { success: true, folderName };
}
