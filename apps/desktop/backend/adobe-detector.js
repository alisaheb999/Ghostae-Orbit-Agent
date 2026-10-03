import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Maps Adobe version year/number to CSXS version
 */
export function mapVersionToCSXS(versionStr) {
    if (versionStr.includes("2026") || versionStr.includes("26")) return 15;
    if (versionStr.includes("2025") || versionStr.includes("25")) return 14;
    if (versionStr.includes("2024") || versionStr.includes("24")) return 12;
    if (versionStr.includes("2023") || versionStr.includes("23")) return 11;
    if (versionStr.includes("2022") || versionStr.includes("22")) return 10;
    return 9;
}

/**
 * Detects all installed After Effects and Premiere Pro instances
 */
export function detectAdobeInstallations() {
    const installations = [];

    if (process.platform === 'win32') {
        const adobeDir = "C:\\Program Files\\Adobe";
        if (fs.existsSync(adobeDir)) {
            const items = fs.readdirSync(adobeDir);
            for (const item of items) {
                const fullPath = path.join(adobeDir, item);
                if (!fs.statSync(fullPath).isDirectory()) continue;

                if (item.startsWith("Adobe After Effects")) {
                    const exePath = path.join(fullPath, "Support Files", "AfterFX.exe");
                    installations.push({
                        name: "After Effects",
                        versionName: item,
                        executablePath: fs.existsSync(exePath) ? exePath : fullPath,
                        csxsVersion: mapVersionToCSXS(item),
                        exists: fs.existsSync(exePath)
                    });
                } else if (item.startsWith("Adobe Premiere Pro")) {
                    const exePath = path.join(fullPath, "Adobe Premiere Pro.exe");
                    installations.push({
                        name: "Premiere Pro",
                        versionName: item,
                        executablePath: fs.existsSync(exePath) ? exePath : fullPath,
                        csxsVersion: mapVersionToCSXS(item),
                        exists: fs.existsSync(exePath)
                    });
                }
            }
        }
    } else if (process.platform === 'darwin') {
        const appsDir = "/Applications";
        if (fs.existsSync(appsDir)) {
            const items = fs.readdirSync(appsDir);
            for (const item of items) {
                if (item.startsWith("Adobe After Effects")) {
                    installations.push({
                        name: "After Effects",
                        versionName: item,
                        executablePath: path.join(appsDir, item, `${item}.app`),
                        csxsVersion: mapVersionToCSXS(item),
                        exists: true
                    });
                } else if (item.startsWith("Adobe Premiere Pro")) {
                    installations.push({
                        name: "Premiere Pro",
                        versionName: item,
                        executablePath: path.join(appsDir, item, `${item}.app`),
                        csxsVersion: mapVersionToCSXS(item),
                        exists: true
                    });
                }
            }
        }
    }

    return installations;
}
