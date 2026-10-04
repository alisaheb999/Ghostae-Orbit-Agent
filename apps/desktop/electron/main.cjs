const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');
const crypto = require('crypto');
const os = require('os');

let mainWindow = null;
let bridgeInstance = null;

// Core shared secret for entitlement signature verification
const GHOSTAE_ENTITLEMENT_SECRET = 'ghostae_entitlement_v1_k9z2!x7Q';

/**
 * 1. True Deterministic Hardware ID (Fixes Device-Limit Lockout)
 */
function getDeterministicHWID() {
  try {
    if (process.platform === 'win32') {
      const output = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { encoding: 'utf-8' });
      const match = output.match(/MachineGuid\s+REG_SZ\s+([a-zA-Z0-9-]+)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
      // Fallback: PowerShell motherboard / system UUID
      const psOutput = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"', { encoding: 'utf-8' });
      if (psOutput.trim() && psOutput.trim().length > 8) {
        return psOutput.trim();
      }
    } else if (process.platform === 'darwin') {
      const output = execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { split($0, line, \"\\\"\"); print line[4] }'", { encoding: 'utf-8' });
      if (output.trim()) {
        return output.trim();
      }
    } else if (process.platform === 'linux') {
      if (fs.existsSync('/etc/machine-id')) {
        return fs.readFileSync('/etc/machine-id', 'utf8').trim();
      } else if (fs.existsSync('/var/lib/dbus/machine-id')) {
        return fs.readFileSync('/var/lib/dbus/machine-id', 'utf8').trim();
      }
    }
  } catch (e) {
    console.error('[HWID] Failed to read native machine ID, using persistent host fallback:', e.message);
  }
  // Safe persistent fallback hashed with username and hostname
  return crypto.createHash('sha256').update(os.hostname() + (os.userInfo?.()?.username || 'user')).digest('hex').slice(0, 32);
}

/**
 * 2. Automatic Adobe PlayerDebugMode Enablement for CSXS 9 to 16 (Non-blocking)
 */
function enableAdobePlayerDebugMode() {
  const csxsVersions = [9, 10, 11, 12, 13, 14, 15, 16];
  if (process.platform === 'win32') {
    const cmd = csxsVersions.map(ver => `reg add "HKCU\\Software\\Adobe\\CSXS.${ver}" /v PlayerDebugMode /t REG_SZ /d 1 /f`).join(' & ');
    exec(cmd, { stdio: 'ignore' }, () => {});
  } else if (process.platform === 'darwin') {
    const cmd = csxsVersions.map(ver => `defaults write com.adobe.CSXS.${ver} PlayerDebugMode 1`).join(' ; ');
    exec(cmd, { stdio: 'ignore' }, () => {});
  }
}

/**
 * 3. Safe Adobe Running Process Check
 */
function checkAdobeRunning() {
  const running = [];
  try {
    if (process.platform === 'win32') {
      const output = execSync('tasklist /FI "STATUS eq running" /FO CSV /NH', { encoding: 'utf-8' }).toLowerCase();
      if (output.includes('afterfx.exe')) running.push('Adobe After Effects');
      if (output.includes('adobe premiere pro.exe')) running.push('Adobe Premiere Pro');
    } else if (process.platform === 'darwin') {
      try {
        const pgrepAe = execSync('pgrep -x "After Effects"', { encoding: 'utf-8' });
        if (pgrepAe.trim()) running.push('Adobe After Effects');
      } catch (e) {}
      try {
        const pgrepPr = execSync('pgrep -x "Adobe Premiere Pro"', { encoding: 'utf-8' });
        if (pgrepPr.trim()) running.push('Adobe Premiere Pro');
      } catch (e) {}
    }
  } catch (err) {
    console.warn('[Process Check] Failed to check running processes:', err.message);
  }
  return {
    isRunning: running.length > 0,
    runningApps: running
  };
}

function getHubSessionPath() {
  const appData = app.getPath('appData');
  const ghostaeDir = path.join(appData, 'Ghostae');
  if (!fs.existsSync(ghostaeDir)) {
    fs.mkdirSync(ghostaeDir, { recursive: true });
  }
  return path.join(ghostaeDir, 'hub_session.json');
}

/**
 * Cryptographically generates signed entitlements without bearer tokens
 */
function generateSignedEntitlements(licensesData, machineId, userEmail) {
  const issuedAt = new Date().toISOString();
  // 30-Day Signed Offline Grace Period
  const offlineUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const entitlements = {};
  const licenses = {};

  if (Array.isArray(licensesData)) {
    for (const lic of licensesData) {
      if (lic.isEnabled !== false && lic.status !== 'expired' && lic.status !== 'suspended') {
        const rawSlug = String(lic.productId || lic.product_slug || lic.slug || 'text').replace(/^prod-/, '').toLowerCase();
        const normSlug = rawSlug.replace(/^ghostae-/, '');
        const fullSlug = `ghostae-${normSlug}`;
        const plan = (lic.validity === 'lifetime' || lic.status === 'Lifetime' || lic.plan === 'lifetime') ? 'lifetime' : (lic.plan || 'pro');
        const key = lic.key || lic.licenseKey || lic.code || `GHST-${normSlug.toUpperCase()}-ACTV`;

        const payloadToSign = `${normSlug}|${machineId}|${issuedAt}|${offlineUntil}|active|${plan}`;
        const signature = crypto.createHmac('sha256', GHOSTAE_ENTITLEMENT_SECRET).update(payloadToSign).digest('hex');

        const entitlementRecord = {
          product_slug: normSlug,
          status: 'active',
          plan: plan,
          machine_id: machineId,
          issued_at: issuedAt,
          offline_until: offlineUntil,
          signature: signature
        };

        const licenseRecord = {
          valid: true,
          status: 'active',
          plan: plan,
          key: key
        };

        entitlements[normSlug] = entitlementRecord;
        entitlements[fullSlug] = entitlementRecord;
        if (rawSlug !== normSlug && rawSlug !== fullSlug) {
          entitlements[rawSlug] = entitlementRecord;
        }

        licenses[normSlug] = licenseRecord;
        licenses[fullSlug] = licenseRecord;
        if (rawSlug !== normSlug && rawSlug !== fullSlug) {
          licenses[rawSlug] = licenseRecord;
        }
      }
    }
  } else if (licensesData && typeof licensesData === 'object') {
    for (const [k, v] of Object.entries(licensesData)) {
      const normSlug = k.replace(/^prod-/, '').replace(/^ghostae-/, '').toLowerCase();
      const plan = v.plan || (v.validity === 'lifetime' ? 'lifetime' : 'pro');
      const key = v.key || v.licenseKey || `GHST-${normSlug.toUpperCase()}-ACTV`;
      const isAct = v.valid !== false && v.status !== 'expired' && v.status !== 'suspended';
      const licenseRecord = {
        valid: isAct,
        status: isAct ? 'active' : (v.status || 'inactive'),
        plan: plan,
        key: key
      };
      licenses[normSlug] = licenseRecord;
      licenses[`ghostae-${normSlug}`] = licenseRecord;
    }
  }

  // Ensure default "text" is active if no specific products are loaded yet for instant CEP verification
  if (Object.keys(licenses).length === 0) {
    licenses['text'] = {
      valid: true,
      status: 'active',
      plan: 'pro',
      key: 'GHST-TEXT-PRO-ACTIVATED'
    };
    licenses['ghostae-text'] = {
      valid: true,
      status: 'active',
      plan: 'pro',
      key: 'GHST-TEXT-PRO-ACTIVATED'
    };
  }

  return {
    user_email: userEmail || 'user@example.com',
    licenses: licenses,
    machine_id: machineId,
    last_synced: issuedAt,
    offline_until: offlineUntil,
    entitlements: entitlements
  };
}

function getAppIconPath() {
  const candidates = [
    path.join(__dirname, 'assets', 'icon.ico'),
    path.join(__dirname, '../build', 'icon.ico'),
    path.join(__dirname, 'assets', 'icon.png'),
    path.join(__dirname, '../build', 'icon.png')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

function createWindow() {
  const appIcon = getAppIconPath();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0A0A0E',
    icon: appIcon,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0D0D12',
      symbolColor: '#FFFFFF',
      height: 42
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // Secure window navigation handlers (Strictly block untrusted origins)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:5173') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Production vs Dev Load Logic
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    const devUrl = 'http://localhost:5173';
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // 1. Business Rule: Ensure app does NOT auto-launch with OS
  try {
    app.setLoginItemSettings({
      openAtLogin: false,
      path: process.execPath
    });
  } catch (e) {}

  // 2. CRITICAL: Automatically ensure Adobe CEP PlayerDebugMode is enabled
  enableAdobePlayerDebugMode();

  createWindow();

  // 3. Start Adobe Bridge & Auto-Installer in background
  try {
    const { bootstrapBridge } = await import('../backend/bridge-server-entry.js');
    if (bootstrapBridge) {
      bridgeInstance = await bootstrapBridge();
    }
  } catch (e) {
    console.warn("[Electron Main] Bridge startup note:", e.message);
  }

  // Ensure default hub_session.json exists for CEP extensions
  try {
    const sessionPath = getHubSessionPath();
    if (!fs.existsSync(sessionPath)) {
      const initSession = generateSignedEntitlements([], getDeterministicHWID(), 'user@example.com');
      fs.writeFileSync(sessionPath, JSON.stringify(initSession, null, 2), 'utf8');
      console.log('[Electron Main] Initialized default hub_session.json at:', sessionPath);
    }
  } catch (e) {}

  // IPC Handler: Deterministic Hardware ID
  ipcMain.handle('get-hardware-id', () => {
    return getDeterministicHWID();
  });

  // IPC Handler: Safe Running Adobe Application Check
  ipcMain.handle('check-adobe-running', () => {
    return checkAdobeRunning();
  });

  // IPC Handler: Signed Entitlements Persistence (ZERO BEARER TOKENS)
  ipcMain.handle('save-hub-session', async (event, sessionPayload) => {
    try {
      if (!sessionPayload || typeof sessionPayload !== 'object') {
        throw new Error('Invalid session payload format.');
      }

      const machineId = getDeterministicHWID();
      const licensesList = sessionPayload.licenses || [];
      const userEmail = sessionPayload.user_email || sessionPayload.email || 'license-holder@ghostae.com';

      // Generate cryptographically signed entitlements
      const signedSession = generateSignedEntitlements(licensesList, machineId, userEmail);

      const sessionPath = getHubSessionPath();
      fs.writeFileSync(sessionPath, JSON.stringify(signedSession, null, 2), 'utf8');
      console.log('[Electron IPC] Signed hub entitlements saved to:', sessionPath);

      // Also sync to Documents/Ghostae/License/activation.json for standalone CEP panels
      try {
        const docsBase = app.getPath('documents') || path.join(os.homedir(), 'Documents');
        const docsDir = path.join(docsBase, 'Ghostae', 'License');
        if (!fs.existsSync(docsDir)) {
          fs.mkdirSync(docsDir, { recursive: true });
        }
        const actPath = path.join(docsDir, 'activation.json');
        fs.writeFileSync(actPath, JSON.stringify(signedSession, null, 2), 'utf8');
        console.log('[Electron IPC] Documents activation.json synced to:', actPath);
      } catch (e) {
        console.warn('[Electron IPC] Documents activation sync note:', e.message);
      }

      return { success: true, path: sessionPath, offline_until: signedSession.offline_until };
    } catch (err) {
      console.error('[Electron IPC] Failed to save signed session:', err.message);
      return { success: false, error: err.message };
    }
  });

  // IPC Handler: Clear Session
  ipcMain.handle('clear-hub-session', async () => {
    try {
      const sessionPath = getHubSessionPath();
      if (fs.existsSync(sessionPath)) {
        fs.unlinkSync(sessionPath);
      }
      try {
        const docsBase = app.getPath('documents') || path.join(os.homedir(), 'Documents');
        const actPath = path.join(docsBase, 'Ghostae', 'License', 'activation.json');
        if (fs.existsSync(actPath)) fs.unlinkSync(actPath);
      } catch (e) {}
      console.log('[Electron IPC] Hub session cleared.');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // IPC Handler: Read Hub Session
  ipcMain.handle('get-hub-session', async () => {
    try {
      const sessionPath = getHubSessionPath();
      if (fs.existsSync(sessionPath)) {
        const raw = fs.readFileSync(sessionPath, 'utf8');
        return { success: true, session: JSON.parse(raw) };
      }
      return { success: true, session: null };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // IPC Handler: Atomic and Validated Extension Installation
  ipcMain.handle('install-cep-extension', async (event, params) => {
    try {
      if (!params || typeof params !== 'object') {
        throw new Error('Invalid installation parameters.');
      }

      const { slug, downloadUrl, cepFolderName, expectedChecksum, authToken } = params;

      // Validate inputs
      if (!slug || typeof slug !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(slug)) {
        throw new Error('Invalid extension slug identifier.');
      }
      if (!downloadUrl || typeof downloadUrl !== 'string' || !downloadUrl.startsWith('https://')) {
        throw new Error('Download URL must be a valid secure HTTPS link.');
      }
      if (cepFolderName && (typeof cepFolderName !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(cepFolderName) || cepFolderName.includes('..'))) {
        throw new Error('Invalid target CEP folder name.');
      }

      const { installPackageFromUrl } = await import('../backend/package-manager.js');
      const result = await installPackageFromUrl({
        slug,
        downloadUrl,
        expectedChecksum,
        cepFolderName: cepFolderName || `com.ghostae.${slug}`,
        authToken: typeof authToken === 'string' ? authToken : undefined,
        onProgress: (progressInfo) => {
          try {
            if (event.sender && !event.sender.isDestroyed()) {
              event.sender.send('cep-install-progress', {
                slug,
                ...progressInfo
              });
            }
          } catch (e) {}
        }
      });
      return { success: true, result };
    } catch (err) {
      console.error('[Electron IPC] Installation error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // IPC Handler: Safe External Browser Opener
  ipcMain.handle('open-external', async (event, url) => {
    try {
      if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
        await shell.openExternal(url);
        return { success: true };
      }
      return { success: false, error: 'Disallowed protocol' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // IPC Handler: Scan all physically installed CEP extensions on machine
  ipcMain.handle('scan-installed-cep-extensions', async () => {
    try {
      const { scanInstalledCEPExtensions } = await import('../backend/cep-installer.js');
      const extensions = scanInstalledCEPExtensions();
      return { success: true, extensions };
    } catch (err) {
      console.error('[Electron IPC] Failed to scan installed CEP extensions:', err.message);
      return { success: false, extensions: [], error: err.message };
    }
  });

  // IPC Handler: Uninstall/remove extension from user CEP directory
  ipcMain.handle('uninstall-cep-extension', async (event, folderName) => {
    try {
      const { deleteInstalledExtension } = await import('../backend/cep-installer.js');
      const res = deleteInstalledExtension(folderName);
      return { success: true, result: res };
    } catch (err) {
      console.error('[Electron IPC] Uninstall error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // IPC Handler: Open extension folder in OS File Explorer
  ipcMain.handle('open-extension-folder', async (event, targetPath) => {
    try {
      const { getUserCEPExtensionsDir } = await import('../backend/cep-installer.js');
      const folderToOpen = targetPath && typeof targetPath === 'string' && fs.existsSync(targetPath)
        ? targetPath
        : getUserCEPExtensionsDir();
      if (!fs.existsSync(folderToOpen)) {
        fs.mkdirSync(folderToOpen, { recursive: true });
      }
      await shell.openPath(folderToOpen);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/**
 * Business Rule: Closing window fully terminates app & bridge process
 * No background / tray-only persistence.
 */
app.on('window-all-closed', () => {
  if (bridgeInstance && typeof bridgeInstance.stop === 'function') {
    try {
      bridgeInstance.stop();
    } catch (e) {}
  }
  app.quit();
});

app.on('before-quit', () => {
  if (bridgeInstance && typeof bridgeInstance.stop === 'function') {
    try {
      bridgeInstance.stop();
    } catch (e) {}
  }
});
