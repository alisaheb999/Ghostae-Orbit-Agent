/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GHOSTAE_API_BASE_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface LocalInstalledExtension {
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

interface Window {
  ghostaeDesktop?: {
    getHardwareId: () => Promise<string>;
    checkAdobeRunning: () => Promise<{ isRunning: boolean; runningApps: string[] }>;
    saveHubSession: (sessionData: any) => Promise<{ success: boolean; path?: string; offline_until?: string; error?: string }>;
    clearHubSession: () => Promise<{ success: boolean; error?: string }>;
    getHubSession: () => Promise<{ success: boolean; session?: any; error?: string }>;
    installCEPExtension: (params: { slug: string; downloadUrl: string; cepFolderName?: string; expectedChecksum?: string; authToken?: string }) => Promise<{ success: boolean; result?: any; error?: string }>;
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
    scanInstalledCEPExtensions: () => Promise<{ success: boolean; extensions: LocalInstalledExtension[]; error?: string }>;
    uninstallCEPExtension: (folderName: string) => Promise<{ success: boolean; result?: any; error?: string }>;
    openExtensionFolder: (targetPath?: string) => Promise<{ success: boolean; error?: string }>;
    isDesktop?: boolean;
  };
}
