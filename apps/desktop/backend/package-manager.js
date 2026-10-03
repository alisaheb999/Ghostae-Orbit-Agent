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

/**
 * Downloads, verifies, stages, validates and atomically installs a CEP extension package.
 * Automatically resolves JSON signed URLs, validates ZIP headers, and searches manifest recursively.
 */
export async function installPackageFromUrl({ slug, downloadUrl, expectedChecksum, cepFolderName, cep_folder_name, authToken }) {
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
        // 1. Download file stream (handling JSON endpoints with signed storage URLs)
        const headers = {};
        if (authToken && typeof authToken === 'string') {
            headers['Authorization'] = `Bearer ${authToken.trim()}`;
        }

        let targetUrl = downloadUrl;
        console.log(`[CEP Installer] Requesting package from: ${targetUrl}`);
        let response = await fetch(targetUrl, { headers });

        if (!response.ok) {
            let errorDetail = '';
            try {
                const errJson = await response.json();
                errorDetail = errJson?.error?.message || errJson?.message || '';
            } catch (e) {}
            throw new Error(`Failed to download package: HTTP ${response.status}${errorDetail ? ' - ' + errorDetail : ' ' + response.statusText}`);
        }

        let arrayBuffer = await response.arrayBuffer();
        let buffer = Buffer.from(arrayBuffer);

        // Check if server returned a JSON response (containing a signed Supabase / Storage CDN URL)
        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        const isJson = contentType.includes('application/json') || (buffer.length < 50000 && buffer.toString('utf8').trim().startsWith('{'));

        if (isJson) {
            try {
                const parsed = JSON.parse(buffer.toString('utf8'));
                if (parsed.success === false || parsed.ok === false || parsed.error) {
                    const msg = parsed.error?.message || parsed.message || (typeof parsed.error === 'string' ? parsed.error : 'Server rejected download request');
                    throw new Error(`Server download error: ${msg}`);
                }

                const resolvedUrl = parsed.url || parsed.download_url || parsed.signed_url || parsed.data?.url;
                if (resolvedUrl && typeof resolvedUrl === 'string') {
                    console.log(`[CEP Installer] Resolved storage CDN URL for ${slug}`);
                    targetUrl = resolvedUrl;
                    const storageRes = await fetch(targetUrl);
                    if (!storageRes.ok) {
                        throw new Error(`Failed to download binary from storage CDN: HTTP ${storageRes.status} ${storageRes.statusText}`);
                    }
                    arrayBuffer = await storageRes.arrayBuffer();
                    buffer = Buffer.from(arrayBuffer);
                }
            } catch (jsonErr) {
                if (jsonErr.message.startsWith('Server download error') || jsonErr.message.startsWith('Failed to download binary')) {
                    throw jsonErr;
                }
            }
        }

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
