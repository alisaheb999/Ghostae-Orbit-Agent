export type HostAppType = 'AE' | 'PPRO' | 'BOTH';

export type ProductCategory = 
  | 'typography' 
  | 'sfx' 
  | 'transitions' 
  | 'templates' 
  | 'presets' 
  | 'subtitles';

export type PresetPayloadType = 
  | 'FFX_PRESET' 
  | 'SFX_AUDIO' 
  | 'TEXT_V2' 
  | 'MOGRT_TEMPLATE';

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ProductCategory;
  target_host: HostAppType;
  thumbnail_url: string;
  preview_video_url?: string;
  preview_audio_url?: string;
  is_active: boolean;
  latest_version?: ProductVersion;
  is_owned?: boolean;
}

export interface ProductVersion {
  id: string;
  product_id: string;
  version: string;
  changelog: string;
  package_file_path: string;
  package_checksum: string;
  file_size_bytes: number;
  is_critical_patch: boolean;
  created_at: string;
}

export interface UserEntitlement {
  id: string;
  user_id: string;
  product_id: string;
  is_active: boolean;
  expires_at: string | null; // null = lifetime
  created_at: string;
}

export interface DeviceRecord {
  id: string;
  user_id: string;
  hwid_hash: string;
  device_name: string;
  os_platform: 'windows' | 'macos';
  last_active: string;
}

export interface AdobeInstallationInfo {
  name: 'After Effects' | 'Premiere Pro';
  version: string;
  executable_path: string;
  csxs_version: number;
  cep_extension_dir: string;
}

// Local WebSocket Bridge Message Schemas
export type BridgeMessage = 
  | { type: 'Handshake'; payload: { client_id: string; host_app: string; version: string } }
  | { type: 'Heartbeat'; payload: { timestamp: number } }
  | { 
      type: 'ApplyPreset'; 
      payload: { 
        preset_id: string; 
        preset_type: PresetPayloadType; 
        file_path: string; 
        target_layer?: string; 
      } 
    }
  | { 
      type: 'ApplyPresetResponse'; 
      payload: { 
        success: boolean; 
        error: string | null; 
        comp_name: string | null; 
      } 
    }
  | { 
      type: 'HostStateChanged'; 
      payload: { 
        comp_active: boolean; 
        comp_name: string; 
        duration: number; 
        current_time?: number;
      } 
    };
