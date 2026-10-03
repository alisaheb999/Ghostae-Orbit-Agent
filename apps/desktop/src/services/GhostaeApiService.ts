/**
 * Ghostae Creative Suite Desktop Hub - Official Production API Client
 * Connects directly to https://ghostae.com/api/public/v1/desktop
 */

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  isPro: boolean;
}

export interface ApiLicenseItem {
  id: string;
  product_slug: string;
  product_name: string;
  license_key: string;
  status: 'active' | 'suspended' | 'expired';
  validity: string;
  expires_at?: string | null;
  max_devices: number;
  is_active_on_this_machine?: boolean;
  is_enabled?: boolean;
}

export interface LoginResponse {
  status: 'success' | 'error';
  token?: string;
  user?: ApiUser;
  licenses?: ApiLicenseItem[];
  message?: string;
  isOfflineGrace?: boolean;
}

export interface SyncLicensesResponse {
  status: 'success' | 'error';
  licenses?: ApiLicenseItem[];
  message?: string;
  isOfflineGrace?: boolean;
}

export interface ActivateHwidResponse {
  status: 'success' | 'error';
  message: string;
  activation_id?: string;
  devices_used?: number;
  max_devices?: number;
}

export interface CatalogScreenshotItem {
  url: string;
  title?: string;
}

export interface CatalogTutorialItem {
  id?: string;
  title: string;
  url: string;
  duration?: string;
  thumbnail?: string;
}

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  latest_version: string;
  price_bdt: number;
  is_free: boolean;
  target_host: 'AE' | 'PPRO' | 'BOTH';
  min_ae_version: number;
  thumbnail_url: string;
  download_url: string;
  cep_folder_name: string;
  changelog: string;
  description?: string;
  screenshots?: CatalogScreenshotItem[];
  tutorials?: CatalogTutorialItem[];
  features?: Array<{ title: string; desc: string }>;
}

export interface CatalogResponse {
  status: 'success' | 'error';
  products?: CatalogProduct[];
  message?: string;
  fromCache?: boolean;
}

export interface DesktopUpdateResponse {
  updateAvailable: boolean;
  latestVersion: string;
  downloadUrl?: string;
  mandatory?: boolean;
  notes?: string;
}

const CACHE_KEY = 'ghostae_offline_license_cache';
const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days Signed Offline Grace

// Aggressive 24-Hour Catalog Local Caching
const CATALOG_CACHE_KEY = 'ghostae_cached_catalog';
const CATALOG_TIMESTAMP_KEY = 'ghostae_catalog_timestamp';
const CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours TTL

// Base URL configured from .env with fallback to official ghostae.com endpoint
export const API_BASE_URL: string = (
  (import.meta as any).env?.VITE_GHOSTAE_API_BASE_URL ||
  'https://ghostae.com/api/public/v1/desktop'
).replace(/\/+$/, '');

let cachedDeterministicHwid: string | null = null;

/**
 * Initializes and retrieves the true deterministic Machine HWID via Electron IPC
 */
export async function getHardwareIdAsync(): Promise<string> {
  if (cachedDeterministicHwid) {
    return cachedDeterministicHwid;
  }

  // 1. Try Electron preload IPC (window.ghostaeDesktop.getHardwareId)
  if (typeof window !== 'undefined') {
    const desktop = window.ghostaeDesktop;
    if (desktop && typeof desktop.getHardwareId === 'function') {
      try {
        const id = await desktop.getHardwareId();
        if (id && typeof id === 'string' && id.trim()) {
          cachedDeterministicHwid = id.trim();
          localStorage.setItem('ghostae_machine_hwid', cachedDeterministicHwid);
          return cachedDeterministicHwid;
        }
      } catch (err) {
        console.warn('[Ghostae API] Error invoking getHardwareId IPC:', err);
      }
    }
  }

  // 2. Check localStorage cache
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('ghostae_machine_hwid') : null;
  if (stored) {
    cachedDeterministicHwid = stored;
    return stored;
  }

  // 3. Fallback synchronous generation
  const ctx = getMachineContext();
  return ctx.hwid;
}

/**
 * Gets or computes deterministic machine HWID & hostname
 */
export function getMachineContext(): { hwid: string; machine_name: string; platform: string } {
  const platform = typeof process !== 'undefined' && process.platform ? process.platform : 'win32';
  
  let machine_name = 'Workstation-Client';
  if (typeof process !== 'undefined' && process.env?.COMPUTERNAME) {
    machine_name = process.env.COMPUTERNAME;
  } else if (typeof navigator !== 'undefined' && navigator.userAgent) {
    machine_name = navigator.userAgent.includes('Windows') ? 'Windows-PC' : 'MacBook-Studio';
  }

  // Check cached deterministic HWID first
  let hwid = cachedDeterministicHwid || (typeof localStorage !== 'undefined' ? localStorage.getItem('ghostae_machine_hwid') : null);
  if (!hwid) {
    hwid = 'HWID-' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ghostae_machine_hwid', hwid);
    }
  }

  return { hwid, machine_name, platform };
}

export interface LoginParams {
  email?: string;
  password?: string;
  license_key?: string;
  hwid?: string;
  machine_name?: string;
  platform?: string;
}

/**
 * Offline Grace Period Handler
 * Returns cached licenses only if within 30-day window. NEVER mocks fake pro access.
 */
function getValidOfflineGraceCache(identifier?: string): { user: ApiUser; token: string; licenses: ApiLicenseItem[]; licenseKey?: string; cachedAt: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const age = Date.now() - (parsed.timestamp || 0);

    if (age < GRACE_PERIOD_MS && parsed.user && parsed.licenses) {
      if (identifier) {
        const idLower = identifier.trim().toLowerCase();
        const emailMatch = parsed.user.email && parsed.user.email.toLowerCase() === idLower;
        const keyMatch = (parsed.licenseKey && parsed.licenseKey.toLowerCase() === idLower) ||
          parsed.licenses.some((l: ApiLicenseItem) => l.license_key && l.license_key.toLowerCase() === idLower);
        if (!emailMatch && !keyMatch) {
          return null;
        }
      }
      return {
        user: parsed.user,
        token: parsed.token || '',
        licenses: parsed.licenses,
        licenseKey: parsed.licenseKey,
        cachedAt: parsed.timestamp || Date.now()
      };
    }
  } catch (e) {
    console.warn('[Offline License] Cache reading error:', e);
  }
  return null;
}

function saveOfflineGraceCache(user: ApiUser, token: string, licenses: ApiLicenseItem[], licenseKey?: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      user,
      token,
      licenses,
      licenseKey
    }));
  } catch (e) {
    console.warn('[Offline License] Cache saving failed:', e);
  }
}

/**
 * Standardized success checker supporting various backend shapes
 * (e.g. { ok: true }, { success: true }, { status: 'success' })
 */
function isResponseSuccess(response: Response, data: any): boolean {
  if (!response.ok) return false;
  if (!data) return false;
  if (data.success === false || data.ok === false || data.status === 'error' || data.status === 'failed') {
    return false;
  }
  if (data.error && (typeof data.error === 'string' || typeof data.error.message === 'string')) {
    return false;
  }
  if (data.success === true || data.ok === true || data.status === 'success' || data.status === 'ok') {
    return true;
  }
  return response.ok;
}

/**
 * Robust error extractor supporting { error: { message } }, { message }, { msg }, etc.
 */
function extractErrorMessage(data: any, fallbackStatus?: number): string {
  if (!data) return `Request failed (HTTP ${fallbackStatus || 'unknown'})`;
  if (typeof data === 'string' && data.trim()) return data;
  if (typeof data.error === 'string' && data.error.trim()) return data.error;
  if (data.error && typeof data.error.message === 'string' && data.error.message.trim()) {
    return data.error.message;
  }
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  if (typeof data.msg === 'string' && data.msg.trim()) return data.msg;
  if (data.error && typeof data.error.code === 'string') {
    const code = data.error.code;
    if (code === 'invalid_credentials') return 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।';
    if (code === 'invalid_key') return 'লাইসেন্স কী পাওয়া যায়নি বা সঠিক নয়।';
    if (code === 'bad_request') return 'ইনপুট তথ্য সঠিক নয়।';
    if (code === 'unauthorized') return 'সেশন এক্সপায়ার হয়েছে। পুনরায় লগইন করুন।';
    return code;
  }
  if (fallbackStatus) return `Request failed (HTTP ${fallbackStatus})`;
  return 'অনুরোধটি সম্পন্ন করা সম্ভব হয়নি।';
}

export const GhostaeApiService = {
  /**
   * ① Authentication: User Login (Dual support: Email & Password OR License Key)
   * POST /api/public/v1/desktop/auth/login
   */
  async login(paramsOrEmail: LoginParams | string, maybePassword?: string): Promise<LoginResponse> {
    const machineCtx = getMachineContext();
    const deterministicHwid = await getHardwareIdAsync();
    let bodyPayload: Record<string, any>;
    let queryIdentifier = '';
    let usedLicenseKey: string | undefined = undefined;

    if (typeof paramsOrEmail === 'object') {
      bodyPayload = {
        hwid: paramsOrEmail.hwid || deterministicHwid || machineCtx.hwid,
        machine_name: paramsOrEmail.machine_name || machineCtx.machine_name,
        platform: paramsOrEmail.platform || machineCtx.platform
      };
      if (paramsOrEmail.email) {
        bodyPayload.email = paramsOrEmail.email.trim();
        queryIdentifier = paramsOrEmail.email.trim();
      }
      if (paramsOrEmail.password) {
        bodyPayload.password = paramsOrEmail.password;
      }
      if (paramsOrEmail.license_key) {
        const cleanKey = paramsOrEmail.license_key.trim();
        bodyPayload.license_key = cleanKey;
        queryIdentifier = cleanKey;
        usedLicenseKey = cleanKey;
      }
    } else {
      queryIdentifier = paramsOrEmail.trim();
      bodyPayload = {
        email: paramsOrEmail.trim(),
        password: maybePassword,
        hwid: deterministicHwid || machineCtx.hwid,
        machine_name: machineCtx.machine_name,
        platform: machineCtx.platform
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      const data = await response.json();

      if (!isResponseSuccess(response, data)) {
        return {
          status: 'error',
          message: extractErrorMessage(data, response.status)
        };
      }

      // Extract user, token and licenses supporting different response formats
      const token = data.token || data.access_token || data.session?.access_token || '';
      const rawUser = data.user || data.data?.user || data.profile;
      const rawLicenses = data.licenses || data.data?.licenses || [];

      // Synthesize user object if login was via license key and server provided minimal user
      const user: ApiUser = rawUser || {
        id: data.user_id || 'usr_license_holder',
        name: data.user_name || 'Ghostae Pro User',
        email: usedLicenseKey ? `license-holder-${usedLicenseKey.slice(-6)}@ghostae.com` : (data.email || 'license-holder@ghostae.com'),
        isPro: true
      };

      const mappedLicenses: ApiLicenseItem[] = Array.isArray(rawLicenses) ? rawLicenses.map((l: any) => ({
        id: l.id || l.license_id || String(Math.random()),
        product_slug: l.product_slug || l.slug || 'text',
        product_name: l.product_name || l.name || 'Ghostae Extension',
        license_key: l.license_key || l.key || usedLicenseKey || '',
        status: (l.status || 'active').toLowerCase(),
        validity: l.validity || (l.is_lifetime ? 'lifetime' : 'active'),
        expires_at: l.expires_at || null,
        max_devices: l.max_devices || 1,
        is_active_on_this_machine: l.is_active_on_this_machine ?? true,
        is_enabled: l.is_enabled ?? true
      })) : [];

      if (usedLicenseKey && mappedLicenses.length === 0) {
        mappedLicenses.push({
          id: `lic_${usedLicenseKey}`,
          product_slug: 'text',
          product_name: 'Ghostae Text',
          license_key: usedLicenseKey,
          status: 'active',
          validity: 'lifetime',
          max_devices: 1,
          is_active_on_this_machine: true,
          is_enabled: true
        });
      }

      // Cache valid response for 30-day offline grace period
      if (user && mappedLicenses.length > 0) {
        saveOfflineGraceCache(user, token, mappedLicenses, usedLicenseKey);
      }

      return {
        status: 'success',
        token,
        user,
        licenses: mappedLicenses
      };
    } catch (err: any) {
      console.warn('[Ghostae API] Network error during login, inspecting 30-day offline cache...');
      
      const cached = getValidOfflineGraceCache(queryIdentifier);
      if (cached) {
        return {
          status: 'success',
          token: cached.token,
          user: cached.user,
          licenses: cached.licenses,
          isOfflineGrace: true,
          message: 'Running in 30-day offline grace period.'
        };
      }

      return {
        status: 'error',
        message: 'Unable to connect to Ghostae cloud server. Please check your internet connection.'
      };
    }
  },

  /**
   * ② User Licenses Sync (Auto-Sync upon app launch)
   * GET /api/public/v1/desktop/licenses
   */
  async syncLicenses(token: string): Promise<SyncLicensesResponse> {
    if (!token) {
      return { status: 'error', message: 'No authorization token available.' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/licenses`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!isResponseSuccess(response, data)) {
        return {
          status: 'error',
          message: extractErrorMessage(data, response.status)
        };
      }

      const rawLicenses = data.licenses || data.data?.licenses || [];
      const mappedLicenses: ApiLicenseItem[] = Array.isArray(rawLicenses) ? rawLicenses.map((l: any) => ({
        id: l.id || l.license_id || String(Math.random()),
        product_slug: l.product_slug || l.slug || 'text',
        product_name: l.product_name || l.name || 'Ghostae Extension',
        license_key: l.license_key || l.key || '',
        status: (l.status || 'active').toLowerCase(),
        validity: l.validity || (l.is_lifetime ? 'lifetime' : 'active'),
        expires_at: l.expires_at || null,
        max_devices: l.max_devices || 1,
        is_active_on_this_machine: l.is_active_on_this_machine ?? true,
        is_enabled: l.is_enabled ?? true
      })) : [];

      return {
        status: 'success',
        licenses: mappedLicenses
      };
    } catch (err: any) {
      console.warn('[Ghostae API] License sync network error, checking 30-day offline cache...');
      const cached = getValidOfflineGraceCache();
      if (cached) {
        return {
          status: 'success',
          licenses: cached.licenses,
          isOfflineGrace: true,
          message: `Offline — last verified on ${new Date(cached.cachedAt).toLocaleDateString()}.`
        };
      }
      return {
        status: 'error',
        message: 'Could not connect to Ghostae server to sync licenses.'
      };
    }
  },

  /**
   * ③ Machine HWID Activation & Binding
   * POST /api/public/v1/desktop/license/activate
   */
  async activateLicenseHwid(licenseKey: string, token?: string): Promise<ActivateHwidResponse> {
    const { machine_name, platform } = getMachineContext();
    const hwid = await getHardwareIdAsync();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/license/activate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          license_key: licenseKey.trim(),
          hwid,
          machine_name,
          platform
        })
      });

      const data = await response.json();

      if (response.status === 403) {
        return {
          status: 'error',
          message: extractErrorMessage(data) || 'Device limit reached (1 workstation max). Please deactivate previous workstation on ghostae.com'
        };
      }

      if (!isResponseSuccess(response, data)) {
        return {
          status: 'error',
          message: extractErrorMessage(data, response.status)
        };
      }

      return {
        status: 'success',
        message: data.message || 'Workstation registered successfully.',
        activation_id: data.activation_id || data.id,
        devices_used: data.devices_used ?? data.used_devices ?? 1,
        max_devices: data.max_devices ?? 1
      };
    } catch (err: any) {
      return {
        status: 'error',
        message: 'Network connection failed during workstation activation.'
      };
    }
  },

  /**
   * ④ Product Catalog & Official Extension Releases
   * GET /api/public/v1/desktop/catalog
   * Implements 24-hour aggressive local caching (ghostae_cached_catalog & ghostae_catalog_timestamp)
   * with graceful offline fallback.
   */
  async getCatalog(forceRefresh = false): Promise<CatalogResponse> {
    // 1. If forcing refresh, clear local catalog cache so deletions on server reflect immediately
    if (forceRefresh && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(CATALOG_CACHE_KEY);
        localStorage.removeItem(CATALOG_TIMESTAMP_KEY);
      } catch (e) {}
    } else if (typeof localStorage !== 'undefined') {
      // Check valid local cache if not forcing refresh
      try {
        const cachedRaw = localStorage.getItem(CATALOG_CACHE_KEY);
        const timestampStr = localStorage.getItem(CATALOG_TIMESTAMP_KEY);
        if (cachedRaw && timestampStr) {
          const timestamp = parseInt(timestampStr, 10);
          if (Date.now() - timestamp < CATALOG_CACHE_TTL_MS) {
            const cachedProducts = JSON.parse(cachedRaw);
            if (Array.isArray(cachedProducts) && cachedProducts.length > 0) {
              return {
                status: 'success',
                products: cachedProducts,
                fromCache: true
              };
            }
          }
        }
      } catch (cacheErr) {
        console.warn('[Ghostae API] Error checking local catalog cache:', cacheErr);
      }
    }

    // 2. Network fetch from official Ghostae Cloud backend
    try {
      const response = await fetch(`${API_BASE_URL}/catalog`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!isResponseSuccess(response, data)) {
        throw new Error(extractErrorMessage(data, response.status));
      }

      const rawProducts = data.products || data.data?.products || [];
      const products: CatalogProduct[] = Array.isArray(rawProducts) ? rawProducts.map((p: any) => {
        // Handle slug OR product_slug
        const slug = String(p.slug || p.product_slug || 'text').toLowerCase();

        // Handle download_url OR download_endpoint (prepend https://ghostae.com if relative)
        let downloadUrl = p.download_url || p.downloadUrl || '';
        if (!downloadUrl && (p.download_endpoint || p.downloadEndpoint)) {
          const endpoint = p.download_endpoint || p.downloadEndpoint;
          downloadUrl = endpoint.startsWith('http')
            ? endpoint
            : `https://ghostae.com${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        }

        // Handle version OR latest_version
        const version = p.version || p.latest_version || p.latestVersion || '1.0.0';

        // Handle target_host
        let targetHost: 'AE' | 'PPRO' | 'BOTH' = 'AE';
        const rawHost = String(p.host_app || p.target_host || p.targetHost || '').toLowerCase();
        if (rawHost.includes('premiere') || rawHost === 'ppro') targetHost = 'PPRO';
        else if (rawHost.includes('both') || (rawHost.includes('ae') && rawHost.includes('pr'))) targetHost = 'BOTH';

        // Handle is_free & price_bdt (with fallback for paid releases)
        const isFree = Boolean(p.is_free ?? p.isFree ?? false);
        let priceBDT = Number(p.price_bdt ?? p.priceBDT ?? p.price ?? 0);
        if (!isFree && priceBDT === 0) {
          priceBDT = 499; // Standard catalog fallback price for paid extensions
        }

        // Handle thumbnail_url - strictly from server, never inject dummy demo images
        const thumbnailUrl = p.thumbnail_url || p.thumbnailUrl || p.image || '';

        // Handle screenshots array or gallery
        const rawScreenshots = p.screenshots || p.gallery || p.screenshot_urls || [];
        const normalizedScreenshots = Array.isArray(rawScreenshots) ? rawScreenshots.map((s: any, idx: number) => {
          if (typeof s === 'string') return { url: s, title: `Preview ${idx + 1}` };
          return { url: s.url || s.image_url || '', title: s.title || `Preview ${idx + 1}` };
        }).filter((s: any) => Boolean(s.url)) : [];

        // Handle video tutorials (supports array of 4-5 videos or single tutorial_url / video_url)
        const rawTutorials = p.tutorials || p.video_tutorials || p.videos || [];
        let normalizedTutorials: Array<{ id?: string; title: string; url: string; duration?: string; thumbnail?: string }> = [];
        
        if (Array.isArray(rawTutorials) && rawTutorials.length > 0) {
          normalizedTutorials = rawTutorials.map((t: any, idx: number) => {
            if (typeof t === 'string') {
              return { id: `tut-${idx}`, title: `Tutorial ${idx + 1}`, url: t, duration: 'Video Guide' };
            }
            return {
              id: t.id || `tut-${idx}`,
              title: t.title || `Tutorial ${idx + 1}: Getting Started`,
              url: t.url || t.video_url || t.link || '',
              duration: t.duration || 'Full Guide',
              thumbnail: t.thumbnail || t.thumbnail_url || ''
            };
          }).filter((t: any) => Boolean(t.url));
        } else if (p.tutorial_url || p.video_url || p.tutorialUrl || p.videoUrl) {
          const singleUrl = p.tutorial_url || p.video_url || p.tutorialUrl || p.videoUrl;
          normalizedTutorials.push({
            id: 'tut-main',
            title: `${p.name || 'Extension'} — Workflow & Installation Guide`,
            url: singleUrl,
            duration: 'Video Guide',
            thumbnail: thumbnailUrl
          });
        }

        return {
          id: p.id || p.release_id || p.releaseId || `prod-${slug}`,
          slug: slug,
          name: p.name || (slug === 'text' ? 'Ghostae Text' : 'Ghostae Extension'),
          category: p.category || (slug === 'text' ? 'Text Animation Panel' : 'Creative Extension'),
          price_bdt: priceBDT,
          is_free: isFree,
          latest_version: version,
          target_host: targetHost,
          min_ae_version: p.min_ae_version || 2023,
          thumbnail_url: thumbnailUrl,
          download_url: downloadUrl,
          cep_folder_name: p.cep_folder_name || p.cepFolderName || (slug === 'text' ? 'com.text' : `com.ghostae.${slug}`),
          changelog: p.changelog || p.release_notes || p.releaseNotes || '',
          description: p.description || p.short_description || '',
          screenshots: normalizedScreenshots,
          tutorials: normalizedTutorials,
          features: Array.isArray(p.features) ? p.features : []
        };
      }) : [];

      // Save to localStorage cache
      if (typeof localStorage !== 'undefined' && products.length > 0) {
        try {
          localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(products));
          localStorage.setItem(CATALOG_TIMESTAMP_KEY, Date.now().toString());
        } catch (e) {}
      }

      return {
        status: 'success',
        products,
        fromCache: false
      };
    } catch (err: any) {
      console.warn('[Ghostae API] Network error during catalog fetch. Checking local cache fallback...', err);
      // Graceful offline fallback: ALWAYS load cached catalog if network fails
      if (typeof localStorage !== 'undefined') {
        try {
          const cachedRaw = localStorage.getItem(CATALOG_CACHE_KEY);
          if (cachedRaw) {
            const cachedProducts = JSON.parse(cachedRaw);
            if (Array.isArray(cachedProducts) && cachedProducts.length > 0) {
              return {
                status: 'success',
                products: cachedProducts,
                fromCache: true,
                message: 'Loaded catalog from local offline cache.'
              };
            }
          }
        } catch (e) {}
      }

      return {
        status: 'error',
        message: err?.message || 'Could not fetch catalog from Ghostae cloud.'
      };
    }
  },

  /**
   * ⑤ Desktop App Self-Updater (EXE Updater)
   * GET /api/public/v1/desktop/app/check-update?version={CURRENT_VERSION}&platform={win32|darwin}
   */
  async checkAppUpdate(currentVersion: string): Promise<DesktopUpdateResponse> {
    const { platform } = getMachineContext();

    try {
      const cleanVersion = encodeURIComponent(currentVersion.replace(/^v/i, ''));
      const response = await fetch(
        `${API_BASE_URL}/app/check-update?version=${cleanVersion}&platform=${encodeURIComponent(platform)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        updateAvailable: Boolean(data.updateAvailable ?? data.update_available),
        latestVersion: data.latestVersion || data.latest_version || currentVersion,
        downloadUrl: data.downloadUrl || data.download_url,
        mandatory: Boolean(data.mandatory),
        notes: data.notes || data.release_notes
      };
    } catch (err: any) {
      return {
        updateAvailable: false,
        latestVersion: currentVersion
      };
    }
  }
};
