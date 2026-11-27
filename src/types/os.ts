export type AppId =
  | 'agents'
  | 'wellbeing'
  | 'knowledge'
  | 'learn'
  | 'continuum'
  | 'eco'
  | 'phone'
  | 'camera'
  | 'messages'
  | 'browser'
  | 'files'
  | 'gallery'
  | 'music'
  | 'settings'
  | 'appstore'
  | 'terminal'
  | 'notes'
  | 'weather'
  | 'calculator'
  | 'clock'
  | 'vitals'
  | 'game'
  | 'shield'
  | 'ghost'
  | 'code'
  | 'paint'
  | 'calendar'
  | 'keyring'
  | 'monitor'
  | 'playstore'
  | 'gmail'
  | 'brave'
  | 'tor'
  | 'dayscore';

export type DeviceSpace = 'primary' | 'ghost';

export type ShieldLevel = 'standard' | 'aggressive' | 'airgap';

export type DeviceFormFactor = 'phone' | 'workstation' | 'wearable' | 'vehicle' | 'home';

export type AccentTheme = 'cyan' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate';
export type FontTheme = 'jakarta' | 'dm' | 'manrope' | 'mono';
export type IconShape = 'squircle' | 'rounded' | 'square' | 'circle';
export type SurfaceStyle = 'glass' | 'matte' | 'minimal';
export type DockPosition = 'bottom' | 'left' | 'hidden';
export type WindowMode = 'tiling' | 'floating';
export type UIScale = 'compact' | 'standard' | 'comfortable';

export interface OSCustomization {
  accentTheme: AccentTheme;
  fontTheme: FontTheme;
  uiScale: UIScale;
  iconShape: IconShape;
  surfaceStyle: SurfaceStyle;
  dockPosition: DockPosition;
  windowMode: WindowMode;
  showDesktopWidgets: boolean;
  showAppLabels: boolean;
  gridDensity: 'compact' | 'balanced' | 'spacious';
  wallpaperDim: number; // 10 - 80
  wallpaperBlur: number; // 0 - 16
  highContrastBorders: boolean;
}

export interface FloatingWindowState {
  appId: AppId;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
}

export interface WorkspaceState {
  id: number; // 1..4
  name: string;
  activeApp: AppId | null;
  splitScreenApp: AppId | null;
  floatingWindows: FloatingWindowState[];
}

export interface AppMetadata {
  id: AppId;
  name: string;
  icon: string;
  color: string;
  category: 'human' | 'core' | 'media' | 'utility' | 'system' | 'productivity' | 'game' | 'security';
  badge?: number;
  isRemovable?: boolean;
}

export type ViewportMode = 'native_full' | 'chassis_pocket' | 'desktop_windowed';

export interface HardwareState {
  batteryLevel: number;
  isCharging: boolean;
  batteryChargingTimeSec: number | null;
  batteryDischargingTimeSec: number | null;
  isOnline: boolean;
  networkType: '6G / Wi-Fi 7' | '5G Ultra' | '4G LTE' | 'Wi-Fi' | 'Offline';
  networkSpeedMbps: number;
  networkRttMs: number;
  cpuCores: number;
  memoryTotalGb: number;
  memoryUsedMb: number;
  jsHeapUsedMb: number | null;
  storageQuotaGb: number;
  storageUsedMb: number;
  gpuRenderer: string;
  gpuVendor: string;
  hostPlatform: string;
  hostBrowser: string;
  hostTimezone: string;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  refreshRateHz: number;
  colorGamut: 'Display P3' | 'sRGB';
  touchPoints: number;
  cameraCount: number;
  micCount: number;
  speakerCount: number;
  deviceTiltX: number;
  deviceTiltY: number;
  geolocationCity: string;
  geolocationCoords: string;
  screenBrightness: number;
  volumeLevel: number;
  isMuted: boolean;
  flashlightOn: boolean;
  nightLightOn: boolean;
  airplaneMode: boolean;
  bluetoothOn: boolean;
  locationOn: boolean;
  doNotDisturb: boolean;
  wakeLockActive: boolean;
  micMutedByHardware: boolean;
  cameraMutedByHardware: boolean;
  deviceOrientation: 'portrait' | 'landscape';
}

export interface PrivacyProfile {
  deviceSpace: DeviceSpace;
  anonymousMode: boolean;
  shieldEnabled: boolean;
  shieldLevel: ShieldLevel;
  torRouting: boolean;
  blockScripts: boolean;
  fingerprintSpoofing: boolean;
  webrtcLeakGuard: boolean;
  localOnlyAirGap: boolean;
  spoofedDeviceId: string;
  spoofedMacAddress: string;
  spoofedGpuAlias: string;
  spoofedUserAgent: string;
  spoofedTimezone: string;
  spoofedNodeName: string;
}

export interface BlockedEvent {
  id: string;
  appId: AppId;
  appName: string;
  domain: string;
  category: 'ad' | 'tracker' | 'fingerprint' | 'telemetry' | 'cryptominer';
  timestamp: string;
  bytesSaved: number;
}

export interface ShieldStats {
  adsBlocked: number;
  trackersBlocked: number;
  fingerprintsNeutralized: number;
  bandwidthSavedKb: number;
  blockedLog: BlockedEvent[];
  perAppShield: Record<string, boolean>;
}

export type AgentActionType =
  | 'ENABLE_FOCUS'
  | 'ENABLE_DND'
  | 'SAVE_KNOWLEDGE'
  | 'OPEN_APP'
  | 'ENABLE_SHIELD'
  | 'ROTATE_IDENTITY'
  | 'ENABLE_ECO'
  | 'ENABLE_AIRGAP'
  | 'SET_BRIGHTNESS';

export interface AgentStep {
  id: string;
  title: string;
  capability: string;
  permissionScope: string;
  explanation: string;
  actionType: AgentActionType;
  target?: string;
  payload?: Record<string, unknown>;
  approved: boolean;
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'denied';
}

export interface AgentTask {
  id: string;
  goal: string;
  createdAt: string;
  steps: AgentStep[];
  summary: string;
  executed: boolean;
}

export interface PermissionAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  scope: string;
  action: string;
  outcome: 'approved' | 'denied' | 'revoked';
  explanation: string;
}

export interface WellbeingState {
  focusDurationMin: number;
  focusSecondsLeft: number;
  focusActive: boolean;
  focusIntent: string;
  calmGrayscale: boolean;
  dailyFocusMinutes: number;
  focusSessionsCompleted: number;
  appBudgetsMin: Record<string, number>;
  currentIntention: string;
}

export interface KnowledgeNode {
  id: string;
  title: string;
  content: string;
  tags: string[];
  linkedIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContinuumDevice {
  id: string;
  name: string;
  formFactor: DeviceFormFactor;
  status: 'connected' | 'standby';
  lastSeen: number;
  battery: number;
  activeApp: string;
  isSelf?: boolean;
}

export interface ContinuumHandoff {
  id: string;
  fromDevice: string;
  type: 'note' | 'url' | 'intent';
  title: string;
  payload: string;
  timestamp: string;
}

export interface EcoProfile {
  ecoMode: boolean;
  reducedMotion: boolean;
  oledDarkSaver: boolean;
  estimatedWhSaved: number;
  activeFormFactor: DeviceFormFactor;
}

export interface OSNotification {
  id: string;
  appId: AppId;
  appName: string;
  title: string;
  body: string;
  time: string;
  avatar?: string;
  isRead?: boolean;
}

export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'image' | 'audio' | 'document' | 'code';
  sizeBytes: number;
  updatedAt: string;
  content?: string;
  dataUrl?: string;
}

export interface ContactItem {
  id: string;
  name: string;
  phone: string;
  avatarColor: string;
  isFavorite?: boolean;
}

export interface MessageItem {
  id: string;
  contactId: string;
  sender: 'user' | 'contact';
  text: string;
  timestamp: string;
}

export interface AlarmItem {
  id: string;
  time: string;
  label: string;
  days: string[];
  isEnabled: boolean;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  coverGradient: string;
  genre: string;
}
