import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GhostaeApiService, getHardwareIdAsync } from '../services/GhostaeApiService';

export interface TutorialItem {
  id?: string;
  title: string;
  url: string;
  duration?: string;
  thumbnail?: string;
}

export interface ScreenshotItem {
  url: string;
  title?: string;
}

export interface ProductItem {
  id: string;
  slug: string;
  name: string;
  type: 'official' | 'free_resource';
  priceBDT: number;
  isFree: boolean;
  image: string;
  version: string;
  latestVersion?: string;
  category: string;
  tagline: string;
  description: string;
  changelog?: string;
  isOwned: boolean;
  isInstalled: boolean;
  hasUpdate: boolean;
  installProgress?: number; // 0 - 100
  installStatusText?: string;
  isInstalling?: boolean;
  targetHost: 'AE' | 'PPRO' | 'BOTH';
  features: { title: string; desc: string }[];
  screenshots: ScreenshotItem[];
  tutorials?: TutorialItem[];
  downloadUrl?: string;
  cepFolderName?: string;
}

export interface LocalInstalledExtension {
  id: string;
  folderName: string;
  displayName: string;
  version: string;
  hosts: string[];
  fullPath: string;
  isUserDir: boolean;
  isOfficial: boolean;
  modifiedAt: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isPro: boolean;
}

export interface LicenseItem {
  id: string;
  productId: string;
  productName: string;
  key: string;
  validity: string;
  validityDaysText: string;
  devices: string;
  tier: string;
  status: 'Active' | 'Lifetime';
  isEnabled: boolean; // ON / OFF toggle
  image: string;
}

export interface UpdateItem {
  id: string;
  productId: string;
  name: string;
  versionAvailable: string;
  notes: string;
  image: string;
  downloadUrl?: string;
}

interface HubStoreState {
  // Authentication & Cloud Sync State
  currentUser: UserProfile | null;
  authToken: string | null;
  isOfflineGrace: boolean;
  isCatalogLoading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithLicenseKey: (licenseKey: string) => Promise<void>;
  logout: () => void;
  initCloudSync: (forceRefresh?: boolean) => Promise<void>;
  syncLicenses: () => Promise<void>;

  // Navigation
  currentTab: 'store' | 'library' | 'licenses' | 'updates';
  selectedProductDetail: ProductItem | null;

  // Products, Licenses & Updates
  products: ProductItem[];
  licenses: LicenseItem[];
  updates: UpdateItem[];

  // Support & Toast
  toastMessage: string | null;
  isBridgeConnected: boolean;
  activeCompName: string;
  hwid: string;

  // Custom CEP Link Path
  customCepPath: string;
  isCustomCepModalOpen: boolean;
  openCustomCepModal: () => void;
  closeCustomCepModal: () => void;
  setCustomCepPath: (path: string) => void;

  // Client Actions
  setCurrentTab: (tab: 'store' | 'library' | 'licenses' | 'updates') => void;
  openProductDetail: (product: ProductItem) => void;
  closeProductDetail: () => void;
  openCheckout: (product: ProductItem) => void;

  // Installation & Management
  installExtensionToCEP: (productId: string) => Promise<void>;
  uninstallExtensionFromCEP: (productId: string) => Promise<void>;
  toggleLicenseStatus: (licenseId: string) => Promise<void>;
  updateAllPending: () => Promise<void>;

  // Local CEP Extension Hub Management
  installedCepList: LocalInstalledExtension[];
  isScanningCep: boolean;
  scanLocalCEPExtensions: () => Promise<void>;
  uninstallLocalCEP: (folderName: string) => Promise<boolean>;
  openLocalCEPFolder: (targetPath?: string) => Promise<void>;

  // Host Action
  launchInHost: (product: ProductItem) => void;
  showToast: (msg: string) => void;
}

const INITIAL_PRODUCTS: ProductItem[] = [];
const INITIAL_LICENSES: LicenseItem[] = [];
const INITIAL_UPDATES: UpdateItem[] = [];

/**
 * Universal Multi-Layer Product Ownership Checker
 * Checks slug normalization, ID match, product name, all-suite license, and local session
 */
export function checkIsProductOwned(
  product: { id: string; slug: string; name?: string; isFree?: boolean },
  licenses: Array<{ productId?: string; product_slug?: string; productName?: string; isEnabled?: boolean; status?: string; key?: string }>,
  currentUser?: { isPro?: boolean } | null
): boolean {
  if (product.isFree) return true;
  if (!licenses || !Array.isArray(licenses)) return false;

  const normalize = (s?: string) => String(s || '').toLowerCase().replace(/^prod-/, '').replace(/^com\.ghostae\./, '').replace(/^ghostae-/, '').replace(/[^a-z0-9]/g, '');

  const targetSlugNorm = normalize(product.slug);
  const targetIdNorm = normalize(product.id);
  const targetNameNorm = normalize(product.name);

  return licenses.some(lic => {
    if (lic.status === 'expired' || lic.status === 'suspended' || lic.isEnabled === false) {
      return false;
    }

    const licSlugNorm = normalize(lic.productId || lic.product_slug);
    const licNameNorm = normalize(lic.productName);

    // 1. Exact or normalized slug/id match
    if (licSlugNorm && (licSlugNorm === targetSlugNorm || licSlugNorm === targetIdNorm)) {
      return true;
    }

    // 2. Full Suite / All-access license
    if (licSlugNorm === 'all' || licSlugNorm === 'suite' || licSlugNorm === 'creativesuite' || licSlugNorm === 'full') {
      return true;
    }

    // 3. Text Panel fuzzy match (e.g. "text", "ghosttext", "textanimation")
    if (targetSlugNorm.includes('text') && (licSlugNorm.includes('text') || licNameNorm.includes('text'))) {
      return true;
    }

    // 4. Name match
    if (targetNameNorm && licNameNorm && (targetNameNorm === licNameNorm || licNameNorm.includes(targetNameNorm) || targetNameNorm.includes(licNameNorm))) {
      return true;
    }

    return false;
  });
}

function syncDesktopHubSession(userEmail: string, licenses: LicenseItem[]) {
  if (typeof window === 'undefined') return;
  const desktopApi = window.ghostaeDesktop;
  if (desktopApi && typeof desktopApi.saveHubSession === 'function') {
    desktopApi.saveHubSession({
      user_email: userEmail,
      licenses: licenses
    }).catch((e: any) => console.warn('[Hub Session] IPC error:', e));
  }
}

function clearDesktopHubSession() {
  if (typeof window === 'undefined') return;
  const desktopApi = window.ghostaeDesktop;
  if (desktopApi && typeof desktopApi.clearHubSession === 'function') {
    desktopApi.clearHubSession().catch((e: any) => console.warn('[Hub Session] clear error:', e));
  }
}


export const useHubStore = create<HubStoreState>()(
  persist(
    (set, get) => ({
      // Authentication & Cloud Sync State
      currentUser: null,
      authToken: null,
      isOfflineGrace: false,
      isAuthModalOpen: false,
      openAuthModal: () => set({ isAuthModalOpen: true }),
      closeAuthModal: () => set({ isAuthModalOpen: false }),

      /**
       * Automatic Cloud Synchronization (Catalog, User Licenses & App Updates)
       * Connects directly to production https://ghostae.com/api/public/v1/desktop
       */
      initCloudSync: async (forceRefresh = false) => {
        const { authToken } = get();
        set({ isCatalogLoading: true });

        // 0. Initialize and set true deterministic machine HWID
        try {
          const deterministicHwid = await getHardwareIdAsync();
          if (deterministicHwid) {
            set({ hwid: deterministicHwid });
          }
        } catch (e) {}

        // 1. Fetch live product catalog directly from ghostae.com
        try {
          const catalogRes = await GhostaeApiService.getCatalog(forceRefresh);
          if (catalogRes.status === 'success' && catalogRes.products) {
            const currentProducts = get().products;
            const currentLicenses = get().licenses;
            const currentUser = get().currentUser;
            const newUpdates: UpdateItem[] = [];

            const syncedProducts: ProductItem[] = catalogRes.products.map(cp => {
              const existing = currentProducts.find(p => p.slug === cp.slug || p.id === cp.id);
              const isInstalled = existing?.isInstalled || false;
              const installedVersion = existing?.version || '1.0.0';
              const latestVersion = cp.latest_version;
              const hasUpdate = isInstalled && latestVersion !== installedVersion;

              if (hasUpdate) {
                newUpdates.push({
                  id: `upd-${cp.slug}`,
                  productId: cp.id || `prod-${cp.slug}`,
                  name: cp.name,
                  versionAvailable: `v${latestVersion} Available`,
                  notes: cp.changelog || 'Performance improvements and Adobe compatibility updates.',
                  image: cp.thumbnail_url || '',
                  downloadUrl: cp.download_url
                });
              }

              const isOwned = checkIsProductOwned(cp, currentLicenses, currentUser);

              return {
                id: cp.id || `prod-${cp.slug}`,
                slug: cp.slug,
                name: cp.name,
                type: 'official',
                priceBDT: cp.price_bdt,
                isFree: cp.is_free,
                image: cp.thumbnail_url || '',
                version: isInstalled ? installedVersion : latestVersion,
                latestVersion: latestVersion,
                category: cp.category || 'Creative Extension',
                tagline: existing?.tagline || `${cp.name} for Adobe 2023+`,
                description: existing?.description || `${cp.name} - official Ghostae extension for After Effects and Premiere Pro CC 2023 to latest.`,
                changelog: cp.changelog || '',
                isOwned: isOwned,
                isInstalled,
                hasUpdate,
                targetHost: cp.target_host || 'AE',
                downloadUrl: cp.download_url,
                cepFolderName: cp.cep_folder_name || (cp.slug.startsWith('com.') ? cp.slug : `com.ghostae.${cp.slug}`),
                features: existing?.features && existing.features.length > 0 ? existing.features : (cp.features || []),
                screenshots: cp.screenshots && cp.screenshots.length > 0 ? cp.screenshots : (existing?.screenshots || []),
                tutorials: cp.tutorials && cp.tutorials.length > 0 ? cp.tutorials : (existing?.tutorials || [])
              };
            });

            // Update selected product detail if it was open
            const currentSelected = get().selectedProductDetail;
            const updatedSelected = currentSelected 
              ? (syncedProducts.find(p => p.slug === currentSelected.slug || p.id === currentSelected.id) || null)
              : null;

            // Strictly server products ONLY. Never preserve stale mock/demo items!
            set({ 
              products: syncedProducts,
              updates: newUpdates,
              selectedProductDetail: updatedSelected,
              isCatalogLoading: false
            });
          } else {
            set({ isCatalogLoading: false });
          }
        } catch (err) {
          console.warn('[Ghostae Cloud] Catalog auto-sync notice:', err);
          set({ isCatalogLoading: false });
        }

        // 2. User Licenses Auto-Sync (if logged in with token)
        if (authToken) {
          await get().syncLicenses();
        }

        // 3. Scan physical local Adobe CEP extensions on disk
        await get().scanLocalCEPExtensions();
      },

      /**
       * Sync User Licenses directly from production server
       */
      syncLicenses: async () => {
        const { authToken, showToast, licenses } = get();
        if (!authToken) return;

        try {
          const licRes = await GhostaeApiService.syncLicenses(authToken);
          if (licRes.status === 'success' && licRes.licenses) {
            const currentProds = get().products;
            const mappedLicenses: LicenseItem[] = licRes.licenses.map(l => {
              const prod = currentProds.find(p => p.slug === l.product_slug || p.id === l.product_slug);
              return {
                id: l.id,
                productId: prod?.id || l.product_slug,
                productName: l.product_name,
                key: l.license_key,
                validity: l.validity === 'lifetime' ? 'Lifetime Access (Never Expires)' : (l.expires_at || l.validity),
                validityDaysText: l.validity === 'lifetime' ? 'Lifetime Access' : 'Active',
                devices: l.is_active_on_this_machine ? '1 of 1 Device Active' : '0 of 1 Active (Deactivated)',
                tier: 'Lifetime License',
                status: l.validity === 'lifetime' ? 'Lifetime' : 'Active',
                isEnabled: l.is_active_on_this_machine ?? true,
                image: prod?.image || ''
              };
            });

            // Flag owned products dynamically
            const updatedProds = currentProds.map(p => {
              return { ...p, isOwned: checkIsProductOwned(p, mappedLicenses, get().currentUser) };
            });

            set({
              licenses: mappedLicenses,
              products: updatedProds,
              isOfflineGrace: Boolean(licRes.isOfflineGrace)
            });

            // Automatically persist signed session for CEP extensions
            syncDesktopHubSession(get().currentUser?.email || 'user@ghostae.com', mappedLicenses);

            if (licRes.isOfflineGrace) {
              showToast(licRes.message || "Offline — running in 30-day offline grace mode.");
            }
          } else if (licRes.status === 'error') {
            console.warn('[Ghostae Cloud] License sync offline note:', licRes.message);
            if (licenses.length > 0) {
              set({ isOfflineGrace: true });
              syncDesktopHubSession(get().currentUser?.email || 'user@ghostae.com', licenses);
            }
          }
        } catch (err) {
          console.warn('[Ghostae Cloud] License sync notice:', err);
          if (licenses.length > 0) {
            set({ isOfflineGrace: true });
          }
        }
      },

      loginWithEmail: async (email: string, pass: string) => {
        const { showToast, products } = get();
        if (!email || !pass) {
          showToast("দয়া করে ইমেইল ও পাসওয়ার্ড প্রদান করুন।");
          return;
        }
        showToast("Ghostae ক্লাউড সার্ভারের সাথে কানেক্ট করা হচ্ছে...");
        const res = await GhostaeApiService.login(email, pass);
        if (res.status === 'success' && res.user) {
          const userLicenses = res.licenses || [];
          const mappedLicenses: LicenseItem[] = userLicenses.map(l => {
            const prod = products.find(p => p.slug === l.product_slug || p.id === l.product_slug);
            return {
              id: l.id,
              productId: prod?.id || l.product_slug,
              productName: l.product_name,
              key: l.license_key,
              validity: l.validity === 'lifetime' ? 'Lifetime Access (Never Expires)' : (l.expires_at || l.validity),
              validityDaysText: l.validity === 'lifetime' ? 'Lifetime Access' : 'Active',
              devices: l.is_active_on_this_machine ? '1 of 1 Device Active' : '0 of 1 Active (Deactivated)',
              tier: 'Lifetime License',
              status: l.validity === 'lifetime' ? 'Lifetime' : 'Active',
              isEnabled: l.is_active_on_this_machine ?? true,
              image: prod?.image || ''
            };
          });

          // Match owned products strictly by user's real purchases
          const updatedProducts = products.map(p => {
            const owned = checkIsProductOwned(p, mappedLicenses, res.user);
            return { ...p, isOwned: owned };
          });

          set({
            authToken: res.token || null,
            currentUser: {
              id: res.user.id,
              name: res.user.name,
              email: res.user.email,
              avatarUrl: '',
              isPro: res.user.isPro
            },
            isAuthModalOpen: false,
            isOfflineGrace: Boolean(res.isOfflineGrace),
            licenses: mappedLicenses,
            products: updatedProducts
          });

          // Instantly sync %APPDATA%\Ghostae\hub_session.json for Adobe CEP
          syncDesktopHubSession(res.user.email, mappedLicenses);

          showToast(`স্বাগতম, ${res.user.name}! আপনার Ghostae লাইসেন্স সিংক হয়েছে।`);
        } else {
          showToast(res.message || "লগইন ব্যর্থ হয়েছে। আপনার ইমেইল ও পাসওয়ার্ড পরীক্ষা করুন।");
        }
      },

      loginWithLicenseKey: async (licenseKey: string) => {
        const { showToast, products } = get();
        const cleanKey = licenseKey.trim();
        if (!cleanKey) {
          showToast("দয়া করে একটি সঠিক লাইসেন্স কী (License Key) প্রদান করুন।");
          return;
        }

        showToast("Ghostae ক্লাউডে লাইসেন্স ভেরিফাই করা হচ্ছে...");
        const res = await GhostaeApiService.login({ license_key: cleanKey });

        if (res.status === 'success' && res.user) {
          const userLicenses = res.licenses || [];
          const mappedLicenses: LicenseItem[] = userLicenses.map(l => {
            const prod = products.find(p => p.slug === l.product_slug || p.id === l.product_slug);
            return {
              id: l.id,
              productId: prod?.id || l.product_slug,
              productName: l.product_name,
              key: l.license_key,
              validity: l.validity === 'lifetime' ? 'Lifetime Access (Never Expires)' : (l.expires_at || l.validity),
              validityDaysText: l.validity === 'lifetime' ? 'Lifetime Access' : 'Active',
              devices: l.is_active_on_this_machine ? '1 of 1 Device Active' : '0 of 1 Active (Deactivated)',
              tier: 'Lifetime License',
              status: l.validity === 'lifetime' ? 'Lifetime' : 'Active',
              isEnabled: l.is_active_on_this_machine ?? true,
              image: prod?.image || ''
            };
          });

          // Match owned products strictly by user's real purchases
          const updatedProducts = products.map(p => {
            const owned = checkIsProductOwned(p, mappedLicenses, res.user);
            return { ...p, isOwned: owned };
          });

          set({
            authToken: res.token || null,
            currentUser: {
              id: res.user.id,
              name: res.user.name,
              email: res.user.email,
              avatarUrl: '',
              isPro: res.user.isPro
            },
            isAuthModalOpen: false,
            isOfflineGrace: Boolean(res.isOfflineGrace),
            licenses: mappedLicenses,
            products: updatedProducts
          });

          // Instantly sync %APPDATA%\Ghostae\hub_session.json for Adobe CEP
          syncDesktopHubSession(res.user.email, mappedLicenses);

          showToast("লাইসেন্স কী সফলভাবে ভেরিফাই ও সিংক হয়েছে!");
        } else {
          showToast(res.message || "লাইসেন্স কী সঠিক নয় বা সার্ভারে পাওয়া যায়নি।");
        }
      },

      logout: () => {
        const { showToast } = get();
        set({
          authToken: null,
          currentUser: null,
          isOfflineGrace: false,
          licenses: [],
          updates: [],
          currentTab: 'store',
          selectedProductDetail: null,
          products: get().products.map(p => p.isFree ? p : { ...p, isOwned: false })
        });
        clearDesktopHubSession();
        showToast("অ্যাকাউন্ট থেকে সফলভাবে লগআউট করা হয়েছে।");
      },

      currentTab: 'store',
      selectedProductDetail: null,

      products: INITIAL_PRODUCTS,
      licenses: INITIAL_LICENSES,
      updates: INITIAL_UPDATES,
      installedCepList: [],
      isScanningCep: false,
      isCatalogLoading: true,

      toastMessage: null,
      isBridgeConnected: true,
      activeCompName: '',
      hwid: '',

      customCepPath: '%APPDATA%\\Adobe\\CEP\\extensions',
      isCustomCepModalOpen: false,
      openCustomCepModal: () => set({ isCustomCepModalOpen: true }),
      closeCustomCepModal: () => set({ isCustomCepModalOpen: false }),
      setCustomCepPath: (path) => {
        set({ customCepPath: path, isCustomCepModalOpen: false });
        get().showToast("Custom CEP folder path updated successfully!");
      },

      setCurrentTab: (tab) => {
        const { currentUser, openAuthModal, showToast } = get();
        if (!currentUser && tab !== 'store') {
          showToast("এই অপশনটি ব্যবহারের জন্য প্রথমে সাইন ইন করুন।");
          openAuthModal();
          return;
        }
        set({ currentTab: tab, selectedProductDetail: null });

        // Automatic silent background sync on navigation
        if (tab === 'licenses') {
          get().syncLicenses().catch(() => {});
        } else if (tab === 'library') {
          get().scanLocalCEPExtensions().catch(() => {});
        } else if (tab === 'updates') {
          get().initCloudSync().catch(() => {});
        }
      },

      openProductDetail: (product) => {
        set({ selectedProductDetail: product });
      },

      closeProductDetail: () => {
        set({ selectedProductDetail: null });
      },

      openCheckout: (product) => {
        const checkoutUrl = `https://ghostae.com/products/${product.slug}`;
        if (typeof window !== 'undefined') {
          const desktop = window.ghostaeDesktop;
          if (desktop && typeof desktop.openExternal === 'function') {
            desktop.openExternal(checkoutUrl);
          } else {
            window.open(checkoutUrl, '_blank');
          }
        }
        get().showToast(`অফিশিয়াল অর্ডারের জন্য ${product.name} পেজ ব্রাউজারে ওপেন করা হয়েছে।`);
      },

      // 1-Click CEP Auto-Installation (Physical CEP Extraction & Debug Mode Config)
      installExtensionToCEP: async (productId: string) => {
        const { products, showToast, authToken } = get();
        const product = products.find(p => p.id === productId);
        if (!product) return;

        // Check if Adobe After Effects / Premiere Pro is actively running
        if (typeof window !== 'undefined') {
          const desktop = window.ghostaeDesktop;
          if (desktop && typeof desktop.checkAdobeRunning === 'function') {
            try {
              const procInfo = await desktop.checkAdobeRunning();
              if (procInfo && procInfo.isRunning) {
                showToast("Adobe After Effects / Premiere Pro চালু রয়েছে। নতুন প্যানেল সম্পূর্ণ লোড করতে ইন্সটলের পর Adobe রিস্টার্ট করুন।");
              }
            } catch (e) {}
          }
        }

        set({
          products: products.map(p =>
            p.id === productId ? { 
              ...p, 
              isInstalling: true, 
              installProgress: 15,
              installStatusText: 'Connecting to Ghostae Cloud & verifying entitlements...' 
            } : p
          )
        });

        showToast(`${product.name} ডাউনলোড ও যাচাইকরণ শুরু হচ্ছে...`);

        // Check if running in Electron environment for real filesystem write
        if (typeof window !== 'undefined' && window.ghostaeDesktop?.installCEPExtension) {
          const downloadUrl = product.downloadUrl || `https://ghostae.com/downloads/${product.slug}.zip`;
          const cepFolderName = product.cepFolderName || (product.slug.startsWith('com.') ? product.slug : `com.ghostae.${product.slug}`);

          const desktop = window.ghostaeDesktop;
          try {
            set({
              products: get().products.map(p =>
                p.id === productId ? { 
                  ...p, 
                  installProgress: 40,
                  installStatusText: 'Downloading extension bundle from CDN...' 
                } : p
              )
            });

            const timer1 = setTimeout(() => {
              const currentProd = get().products.find(p => p.id === productId);
              if (currentProd?.isInstalling) {
                set({
                  products: get().products.map(p =>
                    p.id === productId ? { 
                      ...p, 
                      installProgress: 68,
                      installStatusText: 'Verifying Adobe CSXS manifest & signature...' 
                    } : p
                  )
                });
              }
            }, 800);

            const timer2 = setTimeout(() => {
              const currentProd = get().products.find(p => p.id === productId);
              if (currentProd?.isInstalling) {
                set({
                  products: get().products.map(p =>
                    p.id === productId ? { 
                      ...p, 
                      installProgress: 88,
                      installStatusText: 'Configuring CEP registry & PlayerDebugMode...' 
                    } : p
                  )
                });
              }
            }, 1800);

            const installRes = await desktop.installCEPExtension({
              slug: product.slug,
              downloadUrl,
              cepFolderName,
              authToken: authToken || undefined
            });

            clearTimeout(timer1);
            clearTimeout(timer2);

            if (!installRes || !installRes.success) {
              const errMsg = installRes?.error || 'Extension extraction or physical manifest verification failed.';
              throw new Error(errMsg);
            }

            const targetVersion = product.latestVersion || product.version;
            const updated = get().products.map(p =>
              p.id === productId ? { 
                ...p, 
                isInstalled: true, 
                isInstalling: false, 
                installProgress: 100, 
                installStatusText: 'Installation complete!',
                hasUpdate: false,
                version: targetVersion
              } : p
            );

            set({
              products: updated,
              updates: get().updates.filter(u => u.productId !== productId),
              selectedProductDetail: updated.find(p => p.id === productId) || null
            });

            // Rescan local CEP directory so Library view updates automatically
            await get().scanLocalCEPExtensions();

            showToast(`${product.name} সফলভাবে ইনস্টল হয়েছে! এখন Adobe After Effects / Premiere Pro ওপেন করে Window > Extensions-এ ব্যবহার করুন।`);
            return;
          } catch (ipcErr: any) {
            console.error('[CEP Install IPC error]', ipcErr);
            set({
              products: get().products.map(p =>
                p.id === productId ? { ...p, isInstalling: false, installProgress: 0, installStatusText: undefined } : p
              )
            });
            const errorDetail = ipcErr?.message || "এক্সটেনশন ইনস্টলেশন ব্যর্থ হয়েছে।";
            showToast(`ইনস্টলেশন এরর: ${errorDetail}`);
            return;
          }
        }

        // Not running in Electron desktop environment: Never fake success!
        set({
          products: get().products.map(p =>
            p.id === productId ? { ...p, isInstalling: false, installProgress: 0, installStatusText: undefined } : p
          )
        });
        showToast("ইনস্টলেশন এরর: ব্রাউজারে লোকাল CEP ফোল্ডারে ইনস্টল সম্ভব নয়। Ghostae Desktop App চালু করুন।");
      },

      uninstallExtensionFromCEP: async (productId: string) => {
        const { products, showToast } = get();
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const targetFolder = product.cepFolderName || product.slug;
        if (typeof window !== 'undefined' && window.ghostaeDesktop?.uninstallCEPExtension) {
          showToast(`Adobe CEP থেকে ${product.name} সরানো হচ্ছে...`);
          try {
            const res = await window.ghostaeDesktop.uninstallCEPExtension(targetFolder);
            if (!res || !res.success) {
              showToast(`আনইনস্টল ব্যর্থ: ${res?.error || 'Unknown error'}`);
              return;
            }
          } catch (e: any) {
            showToast(`আনইনস্টল ব্যর্থ: ${e.message}`);
            return;
          }
        }

        const updated = products.map(p =>
          p.id === productId ? { ...p, isInstalled: false } : p
        );

        set({
          products: updated,
          selectedProductDetail: updated.find(p => p.id === productId) || null
        });

        await get().scanLocalCEPExtensions();
        showToast(`${product.name} সফলভাবে আনইনস্টল করা হয়েছে।`);
      },

      scanLocalCEPExtensions: async () => {
        if (typeof window === 'undefined' || !window.ghostaeDesktop?.scanInstalledCEPExtensions) {
          return;
        }
        set({ isScanningCep: true });
        try {
          const res = await window.ghostaeDesktop.scanInstalledCEPExtensions();
          if (res && res.success && Array.isArray(res.extensions)) {
            const localList = res.extensions;
            // Cross-reference with store products to sync isInstalled flag
            const currentProducts = get().products;
            const updatedProducts = currentProducts.map(p => {
              const match = localList.some((ext: LocalInstalledExtension) => 
                ext.folderName.toLowerCase() === (p.cepFolderName || '').toLowerCase() ||
                ext.folderName.toLowerCase() === p.slug.toLowerCase() ||
                ext.id.toLowerCase() === (p.cepFolderName || '').toLowerCase() ||
                ext.id.toLowerCase() === p.slug.toLowerCase()
              );
              return match ? { ...p, isInstalled: true } : p;
            });
            set({ 
              installedCepList: localList, 
              products: updatedProducts,
              isScanningCep: false 
            });
          } else {
            set({ isScanningCep: false });
          }
        } catch (e) {
          console.warn('[Store] scanLocalCEPExtensions error:', e);
          set({ isScanningCep: false });
        }
      },

      uninstallLocalCEP: async (folderName: string) => {
        const { showToast } = get();
        if (typeof window === 'undefined' || !window.ghostaeDesktop?.uninstallCEPExtension) {
          showToast("Uninstallation not supported in browser environment.");
          return false;
        }
        showToast(`${folderName} আনইনস্টল করা হচ্ছে...`);
        try {
          const res = await window.ghostaeDesktop.uninstallCEPExtension(folderName);
          if (res && res.success) {
            showToast(`${folderName} সফলভাবে অ্যাডোবি ডিরেক্টরি থেকে মুছে ফেলা হয়েছে।`);
            await get().scanLocalCEPExtensions();
            const updatedProds = get().products.map(p => {
              if (p.cepFolderName === folderName || p.slug === folderName) {
                return { ...p, isInstalled: false };
              }
              return p;
            });
            set({ products: updatedProds });
            return true;
          } else {
            showToast(`আনইনস্টল ব্যর্থ: ${res?.error || 'Unknown error'}`);
            return false;
          }
        } catch (e: any) {
          showToast(`আনইনস্টল ব্যর্থ: ${e.message}`);
          return false;
        }
      },

      openLocalCEPFolder: async (targetPath?: string) => {
        if (typeof window !== 'undefined' && window.ghostaeDesktop?.openExtensionFolder) {
          await window.ghostaeDesktop.openExtensionFolder(targetPath);
        }
      },

      // ON / OFF License toggle (Calls ③ POST /api/public/v1/desktop/license/activate)
      toggleLicenseStatus: async (licenseId: string) => {
        const { licenses, authToken, showToast } = get();
        const lic = licenses.find(l => l.id === licenseId);
        if (!lic) return;

        if (lic.isEnabled) {
          // Deactivate
          const updated = licenses.map(l =>
            l.id === licenseId ? {
              ...l,
              isEnabled: false,
              devices: '0 of 1 Active (Deactivated)'
            } : l
          );

          set({ licenses: updated });
          syncDesktopHubSession(get().currentUser?.email || 'user@ghostae.com', updated);
          showToast(`ওয়ার্কস্টেশন থেকে লাইসেন্স ডি-অ্যাক্টিভ করা হয়েছে।`);
        } else {
          // Activate via API
          showToast(`সার্ভারে ওয়ার্কস্টেশন HWID রেজিস্ট্রেশন করা হচ্ছে...`);
          const res = await GhostaeApiService.activateLicenseHwid(lic.key, authToken || undefined);

          if (res.status === 'success') {
            const updated = licenses.map(l =>
              l.id === licenseId ? {
                ...l,
                isEnabled: true,
                devices: `${res.devices_used || 1} of ${res.max_devices || 1} Device Active`
              } : l
            );
            set({ licenses: updated });
            syncDesktopHubSession(get().currentUser?.email || 'user@ghostae.com', updated);
            showToast(res.message || "লাইসেন্স ও ওয়ার্কস্টেশন সফলভাবে সক্রিয় হয়েছে!");
          } else {
            showToast(res.message || "সক্রিয়করণ ব্যর্থ হয়েছে। ডিভাইস সীমা অতিক্রম করেছে।");
          }
        }
      },

      updateAllPending: async () => {
        const { showToast, updates, installExtensionToCEP } = get();
        if (!updates || updates.length === 0) return;
        showToast(`Updating ${updates.length} pending extension(s)...`);
        for (const item of [...updates]) {
          await installExtensionToCEP(item.productId);
        }
      },

      launchInHost: (product) => {
        const { showToast } = get();
        showToast(`Adobe After Effects / Premiere Pro ওপেন করে Window > Extensions > ${product.name} চালু করুন।`);
      },

      showToast: (msg) => {
        set({ toastMessage: msg });
        setTimeout(() => {
          if (get().toastMessage === msg) {
            set({ toastMessage: null });
          }
        }, 3500);
      }
    }),
    {
      name: 'ghostae_hub_client_store',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (!persistedState || version < 2) {
          return {
            ...persistedState,
            products: [],
            updates: [],
            activeCompName: '',
            hwid: ''
          };
        }
        return persistedState;
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        products: state.products,
        licenses: state.licenses,
        updates: state.updates,
        customCepPath: state.customCepPath,
        currentUser: state.currentUser,
        authToken: state.authToken,
        isOfflineGrace: state.isOfflineGrace
      })
    }
  )
);
