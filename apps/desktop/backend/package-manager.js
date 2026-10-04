import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { execSync } from 'child_process';
import { getUserCEPExtensionsDir, enablePlayerDebugMode } from './cep-installer.js';

function copyDirRecursive(source, target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }
    const items = fs.readdirSync(source);
    for (const item of items) {
        const srcPath = path.join(source, item);
        const tgtPath = path.join(target, item);
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
            copyDirRecursive(srcPath, tgtPath);
        } else {
            fs.copyFileSync(srcPath, tgtPath);
        }
    }
}

async function downloadStreamWithProgress(url, headers = {}, onProgress = null) {
    let response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const contentLengthHeader = response.headers.get('content-length');
    let totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

    // Handle possible JSON wrapper (e.g. storage signed URL redirects)
    if (contentType.includes('application/json') || (totalBytes > 0 && totalBytes < 20000)) {
        const text = await response.text();
        try {
            const parsed = JSON.parse(text);
            const resolvedUrl = parsed.url || parsed.download_url || parsed.signed_url || parsed.data?.url;
            if (resolvedUrl && typeof resolvedUrl === 'string') {
                return downloadStreamWithProgress(resolvedUrl, {}, onProgress);
            }
        } catch (e) {}
        return Buffer.from(text);
    }

    const reader = response.body.getReader();
    const chunks = [];
    let receivedBytes = 0;
    const startTime = Date.now();
    let lastReportTime = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(Buffer.from(value));
        receivedBytes += value.length;

        const now = Date.now();
        if (onProgress && (now - lastReportTime > 150 || (totalBytes > 0 && receivedBytes >= totalBytes))) {
            lastReportTime = now;
            const elapsedSec = Math.max(0.1, (now - startTime) / 1000);
            const speedBytesPerSec = receivedBytes / elapsedSec;

            let percent = totalBytes > 0 ? Math.min(98, Math.round((receivedBytes / totalBytes) * 100)) : Math.min(95, Math.round(receivedBytes / (1024 * 1024)));
            let speedText = speedBytesPerSec > 1024 * 1024 
                ? `${(speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
                : `${Math.round(speedBytesPerSec / 1024)} KB/s`;

            let etaSec = (totalBytes > receivedBytes && speedBytesPerSec > 0)
                ? Math.round((totalBytes - receivedBytes) / speedBytesPerSec)
                : 0;
            
            let etaText = etaSec > 60
                ? `~${Math.floor(etaSec / 60)}m ${etaSec % 60}s remaining`
                : etaSec > 0 ? `~${etaSec}s remaining` : 'Calculating...';

            let downloadedMB = (receivedBytes / (1024 * 1024)).toFixed(1);
            let totalMB = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : downloadedMB;

            onProgress({
                percent,
                progress: percent,
                downloadedBytes: receivedBytes,
                totalBytes,
                downloadedMB: `${downloadedMB} MB`,
                totalMB: `${totalMB} MB`,
                speedText,
                speed: speedText,
                etaText,
                eta: etaText,
                statusText: `Downloading: ${downloadedMB} MB / ${totalMB} MB (${percent}%) • ${speedText} • ${etaText}`,
                status: `Downloading: ${downloadedMB} MB / ${totalMB} MB (${percent}%) • ${speedText} • ${etaText}`
            });
        }
    }

    return Buffer.concat(chunks);
}

/**
 * Downloads, verifies, stages, validates and atomically installs a CEP extension package.
 * Automatically resolves JSON signed URLs, validates ZIP headers, and searches manifest recursively.
 */
export async function installPackageFromUrl({ slug, downloadUrl, expectedChecksum, cepFolderName, cep_folder_name, authToken, onProgress }) {
    // 0. Ensure PlayerDebugMode = 1 for CSXS 9 to 16
    enablePlayerDebugMode();

    const tempDir = path.join(process.env.TEMP || 'C:\\Windows\\Temp', 'ghostae_hub');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const tempZipPath = path.join(tempDir, `${slug}_${timestamp}.zip`);
    const stagingDir = path.join(tempDir, `staging_${slug}_${timestamp}`);

    const cepDir = getUserCEPExtensionsDir();
    if (!fs.existsSync(cepDir)) {
        fs.mkdirSync(cepDir, { recursive: true });
    }

    const folderName = cep_folder_name || cepFolderName || (slug.startsWith('com.') ? slug : `com.ghostae.${slug}`);
    const liveTargetDir = path.join(cepDir, folderName);
    const backupDir = path.join(tempDir, `backup_${folderName}_${timestamp}`);

    let backupCreated = false;

    try {
        if (onProgress) {
            onProgress({ percent: 2, statusText: 'Connecting to Ghostae Cloud CDN...', speedText: 'Connecting...', etaText: 'Starting...' });
        }

        // 1. Download file stream with real-time byte progress tracking
        const headers = {};
        if (authToken && typeof authToken === 'string') {
            headers['Authorization'] = `Bearer ${authToken.trim()}`;
        }

        console.log(`[CEP Installer] Streaming package from: ${downloadUrl}`);
        let buffer = await downloadStreamWithProgress(downloadUrl, headers, onProgress);

        // Validate ZIP magic header: standard ZIP file starts with 'PK' (0x50 0x4B 0x03 0x04)
        const isZipHeader = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B;
        if (!isZipHeader) {
            const previewText = buffer.subarray(0, 300).toString('utf8').replace(/[\r\n\t]+/g, ' ');
            throw new Error(`Invalid package format: Expected ZIP binary file, but received: "${previewText}"`);
        }

        // 2. SHA-256 Checksum verification
        if (expectedChecksum) {
            const hash = crypto.createHash('sha256').update(buffer).digest('hex');
            if (hash.toLowerCase() !== expectedChecksum.toLowerCase()) {
                throw new Error(`Security Exception: Checksum mismatch. Expected ${expectedChecksum}, got ${hash}`);
            }
        }

        fs.writeFileSync(tempZipPath, buffer);

        // 3. Extract to isolated staging directory with Zip Slip / Path Traversal protection
        fs.mkdirSync(stagingDir, { recursive: true });
        let zip;
        try {
            zip = new AdmZip(tempZipPath);
        } catch (zipErr) {
            throw new Error(`Corrupt or invalid ZIP package: ${zipErr.message}`);
        }

        const zipEntries = zip.getEntries();
        if (!zipEntries || zipEntries.length === 0) {
            throw new Error('Downloaded ZIP archive is empty.');
        }

        const resolvedStaging = path.resolve(stagingDir);

        for (const entry of zipEntries) {
            const entryPath = entry.entryName;
            const destPath = path.resolve(stagingDir, entryPath);

            // Zip Slip protection: ensure entry does not escape staging directory
            if (!destPath.startsWith(resolvedStaging + path.sep) && destPath !== resolvedStaging) {
                throw new Error(`Security Exception: Archive entry traverses outside staging folder: ${entryPath}`);
            }

            if (entry.isDirectory) {
                fs.mkdirSync(destPath, { recursive: true });
            } else {
                fs.mkdirSync(path.dirname(destPath), { recursive: true });
                fs.writeFileSync(destPath, entry.getData());
            }
        }

        // 4. Validate and locate expected Adobe CEP manifest file recursively
        function findManifestFolder(currentDir, depth = 0) {
            if (depth > 6) return null;
            if (fs.existsSync(path.join(currentDir, 'CSXS', 'manifest.xml'))) {
                return currentDir;
            }
            try {
                const entries = fs.readdirSync(currentDir);
                for (const entry of entries) {
                    const subPath = path.join(currentDir, entry);
                    if (fs.statSync(subPath).isDirectory()) {
                        const found = findManifestFolder(subPath, depth + 1);
                        if (found) return found;
                    }
                }
            } catch (e) {}
            return null;
        }

        const manifestFolder = findManifestFolder(stagingDir);
        if (!manifestFolder) {
            throw new Error('Validation failed: Package does not contain a valid Adobe CEP CSXS/manifest.xml file.');
        }
        const extractionRoot = manifestFolder;

        // 5. Anti-Collision & Safe Overwrite Protection
        let finalTargetFolderName = folderName;
        let finalLiveTargetDir = path.join(cepDir, finalTargetFolderName);

        if (fs.existsSync(finalLiveTargetDir)) {
            const existingManifestPath = path.join(finalLiveTargetDir, 'CSXS', 'manifest.xml');
            let isDifferentExtension = false;
            if (fs.existsSync(existingManifestPath)) {
                try {
                    const existingXml = fs.readFileSync(existingManifestPath, 'utf8');
                    const incomingXml = fs.readFileSync(path.join(extractionRoot, 'CSXS', 'manifest.xml'), 'utf8');
                    const matchExistingId = existingXml.match(/ExtensionBundleId\s*=\s*["']([^"']+)["']/i);
                    const matchIncomingId = incomingXml.match(/ExtensionBundleId\s*=\s*["']([^"']+)["']/i);
                    if (matchExistingId && matchIncomingId && matchExistingId[1].trim() !== matchIncomingId[1].trim()) {
                        isDifferentExtension = true;
                    }
                } catch (e) {}
            }

            if (isDifferentExtension) {
                // Generate a collision-free folder name so existing extensions are NEVER destroyed
                let counter = 1;
                while (fs.existsSync(path.join(cepDir, `${folderName}_ghostae_${counter}`))) {
                    counter++;
                }
                finalTargetFolderName = `${folderName}_ghostae_${counter}`;
                finalLiveTargetDir = path.join(cepDir, finalTargetFolderName);
                console.log(`[Anti-Collision] Conflict with existing extension detected. Diverted to: ${finalTargetFolderName}`);
            }
        }

        // 5.1 Backup existing target folder if it still exists (same extension upgrade)
        if (fs.existsSync(finalLiveTargetDir)) {
            fs.renameSync(finalLiveTargetDir, backupDir);
            backupCreated = true;
        }

        if (onProgress) {
            onProgress({
                percent: 98,
                progress: 98,
                statusText: 'Extracting and deploying files to Adobe CEP directory...',
                status: 'Extracting and deploying files to Adobe CEP directory...',
                speedText: 'Extracting...',
                speed: 'Extracting...',
                etaText: 'Finalizing...',
                eta: 'Finalizing...',
                downloadedMB: `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`,
                totalMB: `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`
            });
        }

        // 6. Copy validated files from staging to target
        try {
            copyDirRecursive(extractionRoot, finalLiveTargetDir);
        } catch (copyErr) {
            throw new Error(`Failed to copy extension files to destination: ${copyErr.message}`);
        }

        // 6.5 Strictly verify physical manifest.xml on destination disk
        const finalManifestPath = path.join(finalLiveTargetDir, 'CSXS', 'manifest.xml');
        if (!fs.existsSync(finalManifestPath)) {
            throw new Error(`Installation verification failed: manifest file was not found at ${finalManifestPath}`);
        }

        // Set safe read/execute permissions on Unix/macOS
        try {
            if (process.platform !== 'win32') {
                execSync(`chmod -R 755 "${finalLiveTargetDir}"`, { stdio: 'ignore' });
            }
        } catch (e) {}

        // If installation succeeded, clean up backup
        if (backupCreated && fs.existsSync(backupDir)) {
            try {
                fs.rmSync(backupDir, { recursive: true, force: true });
            } catch (e) {}
        }

        if (onProgress) {
            onProgress({
                percent: 100,
                progress: 100,
                isDone: true,
                statusText: 'Installation complete!',
                status: 'Installation complete!',
                speedText: 'Complete',
                speed: 'Complete',
                etaText: 'Done',
                eta: 'Done'
            });
        }

        return {
            success: true,
            installedPath: finalLiveTargetDir,
            slug,
            folderName: finalTargetFolderName
        };
    } catch (err) {
        // 7. Atomic Rollback: Restore backup if installation failed
        if (backupCreated && fs.existsSync(backupDir)) {
            try {
                if (fs.existsSync(finalLiveTargetDir)) {
                    fs.rmSync(finalLiveTargetDir, { recursive: true, force: true });
                }
                fs.renameSync(backupDir, finalLiveTargetDir);
                console.log(`[CEP Installer] Restored previous working extension ${finalTargetFolderName} from backup.`);
            } catch (restoreErr) {
                console.error('[CEP Installer] Rollback error:', restoreErr.message);
            }
        }
        throw err;
    } finally {
        // 8. Clean up staging directory and temp zip
        try {
            if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
        } catch (e) {}
        try {
            if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });
        } catch (e) {}
        try {
            if (backupCreated && fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
        } catch (e) {}
    }
}
