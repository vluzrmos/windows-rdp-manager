export type ScreenMode = 'fullscreen' | 'custom' | 'windowed';

export interface RdpDisplayConfig {
  screenMode: ScreenMode;
  width?: number;
  height?: number;
  smartSizing: boolean;
  useMultimon: boolean;
  colorDepth?: 15 | 16 | 24 | 32; // bits per pixel
}

export interface RdpLocalResources {
  redirectClipboard: boolean;
  redirectPrinters: boolean;
  redirectDrives: boolean;
  drivesToRedirect?: string[]; // e.g. ["C:", "D:"] or ["*"]
  audioMode: 0 | 1 | 2; // 0: Play locally, 1: Play on remote, 2: Do not play
  audioCapture: boolean; // Redirect microphone
}

export interface RdpExperience {
  connectionType: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1: Modem, 2: Low-speed, 3: Satellite, 4: High-speed, 5: WAN, 6: LAN, 7: Auto-detect
  enableWallpaper: boolean;
  enableFontSmoothing: boolean;
  enableDesktopComposition: boolean;
  enableTheme: boolean;
  adminConsole: boolean; // Connect to console session (/admin)
}

export interface RdpGateway {
  enabled: boolean;
  hostname: string;
  username?: string;
  usageMethod: 0 | 1 | 2 | 3 | 4; // 0: None, 1: Direct, 2: By detect, 3: Direct always, 4: Default
}

export interface RdpConnection {
  id: string;
  name: string;
  group: string; // e.g., "Produção", "Homologação", "Dev", "Clientes"
  host: string;
  port: number; // default: 3389
  username: string;
  domain?: string;
  encryptedPassword?: string; // encrypted via DPAPI
  password?: string; // decrypted in memory only when required
  hasPassword?: boolean;
  notes?: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastConnectedAt?: number;

  display: RdpDisplayConfig;
  resources: RdpLocalResources;
  experience: RdpExperience;
  gateway?: RdpGateway;
  launchMode?: 'default' | 'direct' | 'rdp_file'; // Sobrescreve o modo de inicialização global
}

export type LaunchMode = 'direct' | 'rdp_file';

export type ConnectionStatus = 'online' | 'offline' | 'checking' | 'unknown';

export interface PingResult {
  host: string;
  port: number;
  online: boolean;
  latencyMs?: number;
  error?: string;
}

export interface AppSettings {
  autoCheckPing: boolean;
  minimizeToTrayOnConnect: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  startWithWindows: boolean;
  confirmBeforeDelete: boolean;
  defaultGroup: string;
  defaultLaunchMode: LaunchMode; // Padrão global ('direct' ou 'rdp_file')
  masterPasswordEnabled: boolean;
  salt?: string;
  passwordVerifierHash?: string;
}

export interface ExportData {
  version: string;
  exportedAt: number;
  connections: RdpConnection[];
}
