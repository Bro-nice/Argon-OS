import React, { useState, useEffect } from 'react';
import { ArrowLeft, Columns, Maximize2, X } from 'lucide-react';
import {
  AppId,
  AppMetadata,
  DeviceSpace,
  EcoProfile,
  FileItem,
  FloatingWindowState,
  HardwareState,
  OSCustomization,
  OSNotification,
  PrivacyProfile,
  ShieldStats,
  ViewportMode,
  WellbeingState,
  WorkspaceState,
} from './types/os';
import {
  subscribeToRealHardware,
  setMasterAudioVolume,
  setHardwareTorch,
  playLockChime,
  startAmbientAudioStream,
  stopAmbientAudioStream,
  triggerHaptic,
} from './utils/hardware';
import {
  createInitialPrivacyProfile,
  generateAnonymousIdentity,
  readSpaceData,
  shredSpaceData,
  writeSpaceData,
} from './utils/localVault';
import {
  loadEcoProfile,
  loadWellbeingState,
  saveEcoProfile,
  saveWellbeingState,
} from './utils/humanOsStore';
import {
  applyCustomizationToDom,
  DEFAULT_LINUX_WALLPAPER,
  GHOST_LINUX_WALLPAPER,
  loadCustomization,
  saveCustomization,
} from './utils/customizationStore';
import { loadShieldStats, recordBlockedEvent, saveShieldStats } from './utils/shieldEngine';
import { HardwareDeviceFrame } from './components/frame/HardwareDeviceFrame';
import { StatusBar } from './components/os/StatusBar';
import { OmniIsland } from './components/os/OmniIsland';
import { HomeScreen } from './components/os/HomeScreen';
import { LockScreen } from './components/os/LockScreen';
import { ControlCenter } from './components/os/ControlCenter';
import { NotificationCenter } from './components/os/NotificationCenter';
import { AppSwitcher } from './components/os/AppSwitcher';
import { NavigationBar } from './components/os/NavigationBar';
import { AuraAssistant } from './components/os/AuraAssistant';
import { CommandLauncher } from './components/os/CommandLauncher';
import { WindowManagerLayer } from './components/os/WindowManagerLayer';

// Argon OS Core Subsystems
import { AgentsApp } from './components/apps/AgentsApp';
import { WellbeingApp } from './components/apps/WellbeingApp';
import { KnowledgeApp } from './components/apps/KnowledgeApp';
import { LearnApp } from './components/apps/LearnApp';
import { ContinuumApp } from './components/apps/ContinuumApp';
import { EcoApp } from './components/apps/EcoApp';

// Studio, Developer & Utility Applications
import { CodeStudioApp } from './components/apps/CodeStudioApp';
import { PaintStudioApp } from './components/apps/PaintStudioApp';
import { CalendarApp } from './components/apps/CalendarApp';
import { KeyringApp } from './components/apps/KeyringApp';
import { TaskManagerApp } from './components/apps/TaskManagerApp';
import { PhoneApp } from './components/apps/PhoneApp';
import { CameraApp } from './components/apps/CameraApp';
import { MessagesApp } from './components/apps/MessagesApp';
import { BrowserApp } from './components/apps/BrowserApp';
import { FilesApp, PRIMARY_DEFAULT_FILES, GHOST_DEFAULT_FILES } from './components/apps/FilesApp';
import { MusicApp } from './components/apps/MusicApp';
import { ClockApp } from './components/apps/ClockApp';
import { CalculatorApp } from './components/apps/CalculatorApp';
import { WeatherApp } from './components/apps/WeatherApp';
import { NotesApp } from './components/apps/NotesApp';
import { VitalsApp } from './components/apps/VitalsApp';
import { AppStoreApp } from './components/apps/AppStoreApp';
import { SettingsApp } from './components/apps/SettingsApp';
import { TerminalApp } from './components/apps/TerminalApp';
import { CyberRunnerApp } from './components/apps/CyberRunnerApp';
import { ShieldApp } from './components/apps/ShieldApp';
import { GhostSpaceApp } from './components/apps/GhostSpaceApp';
import { PlayStoreApp } from './components/apps/PlayStoreApp';
import { GmailApp } from './components/apps/GmailApp';
import { BraveApp } from './components/apps/BraveApp';
import { TorBrowserApp } from './components/apps/TorBrowserApp';
import { DayScoreApp } from './components/apps/DayScoreApp';

const APP_REGISTRY: Record<AppId, AppMetadata> = {
  agents: { id: 'agents', name: 'Agents', icon: 'Bot', color: 'bg-cyan-600', category: 'human' },
  wellbeing: {
    id: 'wellbeing',
    name: 'Wellbeing',
    icon: 'HeartHandshake',
    color: 'bg-emerald-600',
    category: 'human',
  },
  knowledge: {
    id: 'knowledge',
    name: 'Knowledge',
    icon: 'Network',
    color: 'bg-indigo-600',
    category: 'human',
  },
  learn: {
    id: 'learn',
    name: 'Learn Lab',
    icon: 'GraduationCap',
    color: 'bg-sky-600',
    category: 'human',
  },
  continuum: {
    id: 'continuum',
    name: 'Continuum',
    icon: 'Share2',
    color: 'bg-teal-600',
    category: 'human',
  },
  eco: { id: 'eco', name: 'Eco Power', icon: 'Leaf', color: 'bg-green-600', category: 'human' },
  shield: {
    id: 'shield',
    name: 'Shield',
    icon: 'ShieldCheck',
    color: 'bg-orange-500',
    category: 'security',
  },
  ghost: {
    id: 'ghost',
    name: 'Ghost Space',
    icon: 'EyeOff',
    color: 'bg-emerald-700',
    category: 'security',
  },
  keyring: {
    id: 'keyring',
    name: 'Keyring',
    icon: 'KeyRound',
    color: 'bg-emerald-600',
    category: 'security',
  },
  monitor: {
    id: 'monitor',
    name: 'Task Mgr',
    icon: 'Cpu',
    color: 'bg-slate-700',
    category: 'system',
  },
  code: {
    id: 'code',
    name: 'Code Studio',
    icon: 'Code2',
    color: 'bg-sky-700',
    category: 'productivity',
  },
  paint: {
    id: 'paint',
    name: 'Canvas',
    icon: 'Brush',
    color: 'bg-purple-600',
    category: 'media',
  },
  calendar: {
    id: 'calendar',
    name: 'Calendar',
    icon: 'Calendar',
    color: 'bg-cyan-700',
    category: 'productivity',
  },
  phone: { id: 'phone', name: 'Phone', icon: 'Phone', color: 'bg-emerald-500', category: 'core' },
  messages: {
    id: 'messages',
    name: 'Messages',
    icon: 'MessageSquare',
    color: 'bg-emerald-600',
    category: 'core',
    badge: 1,
  },
  browser: {
    id: 'browser',
    name: 'Quantum Web',
    icon: 'Globe',
    color: 'bg-orange-600',
    category: 'core',
  },
  camera: { id: 'camera', name: 'Camera', icon: 'Camera', color: 'bg-slate-700', category: 'media' },
  files: { id: 'files', name: 'Files', icon: 'Folder', color: 'bg-amber-600', category: 'utility' },
  gallery: { id: 'gallery', name: 'Photos', icon: 'Image', color: 'bg-indigo-500', category: 'media' },
  music: { id: 'music', name: 'Music', icon: 'Music', color: 'bg-rose-500', category: 'media' },
  settings: {
    id: 'settings',
    name: 'Settings',
    icon: 'Settings',
    color: 'bg-slate-600',
    category: 'system',
  },
  appstore: {
    id: 'appstore',
    name: 'Market',
    icon: 'ShoppingBag',
    color: 'bg-cyan-600',
    category: 'utility',
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal',
    icon: 'Terminal',
    color: 'bg-slate-900',
    category: 'system',
  },
  notes: {
    id: 'notes',
    name: 'Notes',
    icon: 'FileText',
    color: 'bg-yellow-500',
    category: 'productivity',
  },
  weather: {
    id: 'weather',
    name: 'Weather',
    icon: 'CloudSun',
    color: 'bg-sky-500',
    category: 'utility',
  },
  calculator: {
    id: 'calculator',
    name: 'Calculator',
    icon: 'Calculator',
    color: 'bg-amber-500',
    category: 'utility',
  },
  clock: { id: 'clock', name: 'Clock', icon: 'Clock', color: 'bg-orange-500', category: 'utility' },
  vitals: {
    id: 'vitals',
    name: 'Vitals',
    icon: 'Activity',
    color: 'bg-emerald-700',
    category: 'system',
  },
  game: { id: 'game', name: 'Runner', icon: 'Gamepad2', color: 'bg-purple-600', category: 'game' },
  playstore: {
    id: 'playstore',
    name: 'Play Store',
    icon: 'Play',
    color: 'bg-emerald-600',
    category: 'utility',
  },
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    icon: 'Mail',
    color: 'bg-red-600',
    category: 'productivity',
  },
  brave: {
    id: 'brave',
    name: 'Brave',
    icon: 'Flame',
    color: 'bg-orange-600',
    category: 'security',
  },
  tor: {
    id: 'tor',
    name: 'Tor Browser',
    icon: 'Orbit',
    color: 'bg-purple-700',
    category: 'security',
  },
  dayscore: {
    id: 'dayscore',
    name: 'dayscore.ai',
    icon: 'Award',
    color: 'bg-indigo-600',
    category: 'human',
  },
};

function createInitialWorkspaces(): WorkspaceState[] {
  return [1, 2, 3, 4].map((id) => ({
    id,
    name: `Workspace ${id}`,
    activeApp: null,
    splitScreenApp: null,
    floatingWindows: [],
  }));
}

function getDefaultNotifications(space: DeviceSpace): OSNotification[] {
  if (space === 'ghost') {
    return [
      {
        id: 'gn1',
        appId: 'ghost',
        appName: 'Ghost Enclave',
        title: 'Isolated Second Device Ready',
        body: 'Hardware ID masked, Air-Gap enforced, zero data shared with Primary.',
        time: 'Now',
      },
    ];
  }
  return [
    {
      id: 'n1',
      appId: 'shield',
      appName: 'Argon OS Shield',
      title: 'All-App Ad Blocker & Anonymity Active',
      body: 'User data stays 100% on-device. Zero telemetry permitted.',
      time: 'Now',
    },
    {
      id: 'n2',
      appId: 'settings',
      appName: 'Workspace & Customization',
      title: 'Floating Windows, Workspaces 1-4 & Code Studio Ready',
      body: 'Press Ctrl+K for Launcher, Alt+1..4 for Virtual Workspaces, or customize in Settings.',
      time: 'Now',
    },
  ];
}

export default function App() {
  const [deviceSpace, setDeviceSpace] = useState<DeviceSpace>('primary');
  const [isSwitchingSpace, setIsSwitchingSpace] = useState(false);

  const [isLocked, setIsLocked] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceState[]>(createInitialWorkspaces);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number>(1);
  const [openApps, setOpenApps] = useState<AppId[]>(['agents', 'wellbeing', 'learn', 'shield']);

  const [viewportMode, setViewportMode] = useState<ViewportMode>('native_full');

  const currentWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const activeApp = currentWorkspace.activeApp;
  const splitScreenApp = currentWorkspace.splitScreenApp;
  const floatingWindows = currentWorkspace.floatingWindows;

  const updateCurrentWorkspace = (
    updater: (ws: WorkspaceState) => WorkspaceState
  ) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === activeWorkspaceId ? updater(w) : w))
    );
  };

  // Privacy, Wellbeing, Eco & Deep Customization State (Isolated Per Device Space)
  const [privacy, setPrivacy] = useState<PrivacyProfile>(() =>
    createInitialPrivacyProfile('primary')
  );
  const [shieldStats, setShieldStats] = useState<ShieldStats>(() => loadShieldStats('primary'));
  const [wellbeing, setWellbeing] = useState<WellbeingState>(() => loadWellbeingState('primary'));
  const [eco, setEco] = useState<EcoProfile>(() => loadEcoProfile('primary'));
  const [customization, setCustomization] = useState<OSCustomization>(() =>
    loadCustomization('primary')
  );

  // Overlays
  const [isControlCenterOpen, setIsControlCenterOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);

  // Wallpapers & Navigation (Persisted Per Space)
  const [currentWallpaper, setCurrentWallpaper] = useState<string>(() =>
    readSpaceData<string>('primary', 'wallpaper', DEFAULT_LINUX_WALLPAPER)
  );
  const [navigationMode, setNavigationMode] = useState<'gestures' | 'buttons'>('buttons');

  // Media & Call state
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [currentTrackTitle, setCurrentTrackTitle] = useState('Horizon Frequency (432Hz)');
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDurationStr, setCallDurationStr] = useState<string | null>(null);

  // Real Hardware State
  const [hardware, setHardware] = useState<HardwareState>({
    batteryLevel: 94,
    isCharging: false,
    batteryChargingTimeSec: null,
    batteryDischargingTimeSec: null,
    isOnline: true,
    networkType: '6G / Wi-Fi 7',
    networkSpeedMbps: 100,
    networkRttMs: 18,
    cpuCores: 8,
    memoryTotalGb: 8,
    memoryUsedMb: 2048,
    jsHeapUsedMb: null,
    storageQuotaGb: 64,
    storageUsedMb: 0,
    gpuRenderer: 'Hardware Graphics Pipeline',
    gpuVendor: 'Host GPU',
    hostPlatform: 'Physical Host Platform',
    hostBrowser: 'Web Engine',
    hostTimezone: 'Local',
    screenWidth: 1440,
    screenHeight: 900,
    devicePixelRatio: 2,
    refreshRateHz: 60,
    colorGamut: 'sRGB',
    touchPoints: 0,
    cameraCount: 1,
    micCount: 1,
    speakerCount: 1,
    deviceTiltX: 0,
    deviceTiltY: 0,
    geolocationCity: 'Local Device',
    geolocationCoords: 'Masked (GPS Standby)',
    screenBrightness: 90,
    volumeLevel: 75,
    isMuted: false,
    flashlightOn: false,
    nightLightOn: false,
    airplaneMode: false,
    bluetoothOn: true,
    locationOn: false,
    doNotDisturb: false,
    wakeLockActive: false,
    micMutedByHardware: false,
    cameraMutedByHardware: false,
    deviceOrientation: 'portrait',
  });

  const [notifications, setNotifications] = useState<OSNotification[]>(() =>
    getDefaultNotifications('primary')
  );

  // Apply theme tokens (font, accent, UI scale) dynamically to root DOM
  useEffect(() => {
    applyCustomizationToDom(customization);
  }, [customization]);

  // Real-Time Hardware Event Sync
  useEffect(() => {
    const unsubscribe = subscribeToRealHardware((partial) => {
      setHardware((prev) => ({ ...prev, ...partial }));
    });
    return unsubscribe;
  }, []);

  // Global OS Keyboard Shortcuts (Ctrl+K Launcher, Alt+1..4 Workspaces, Escape)
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsLauncherOpen((prev) => !prev);
      } else if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        setActiveWorkspaceId(parseInt(e.key, 10));
      } else if (e.key === 'Escape') {
        setIsLauncherOpen(false);
        setIsControlCenterOpen(false);
        setIsNotificationCenterOpen(false);
        setIsAppSwitcherOpen(false);
        setIsAssistantOpen(false);
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, []);

  useEffect(() => {
    setMasterAudioVolume(hardware.volumeLevel, hardware.isMuted);
  }, [hardware.volumeLevel, hardware.isMuted]);

  useEffect(() => {
    setHardwareTorch(hardware.flashlightOn);
  }, [hardware.flashlightOn]);

  useEffect(() => {
    if (!wellbeing.focusActive) return;
    const timer = setInterval(() => {
      setWellbeing((prev) => {
        if (!prev.focusActive) return prev;
        if (prev.focusSecondsLeft <= 1) {
          playLockChime(false);
          const completed: WellbeingState = {
            ...prev,
            focusActive: false,
            focusSecondsLeft: prev.focusDurationMin * 60,
            dailyFocusMinutes: prev.dailyFocusMinutes + prev.focusDurationMin,
            focusSessionsCompleted: prev.focusSessionsCompleted + 1,
          };
          saveWellbeingState(deviceSpace, completed);
          return completed;
        }
        const next: WellbeingState = {
          ...prev,
          focusSecondsLeft: prev.focusSecondsLeft - 1,
        };
        if (next.focusSecondsLeft % 10 === 0) {
          saveWellbeingState(deviceSpace, next);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [wellbeing.focusActive, deviceSpace]);

  useEffect(() => {
    if (!eco.ecoMode) return;
    const timer = setInterval(() => {
      setEco((prev) => {
        if (!prev.ecoMode) return prev;
        const next: EcoProfile = {
          ...prev,
          estimatedWhSaved: Number((prev.estimatedWhSaved + 0.01).toFixed(2)),
        };
        saveEcoProfile(deviceSpace, next);
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [eco.ecoMode, deviceSpace]);

  const handleUpdatePrivacy = (partial: Partial<PrivacyProfile>) => {
    setPrivacy((prev) => {
      const next = { ...prev, ...partial };
      writeSpaceData(deviceSpace, 'privacy_profile', next);
      return next;
    });
  };

  const handleUpdateWellbeing = (partial: Partial<WellbeingState>) => {
    setWellbeing((prev) => {
      const next = { ...prev, ...partial };
      saveWellbeingState(deviceSpace, next);
      return next;
    });
  };

  const handleUpdateEco = (partial: Partial<EcoProfile>) => {
    setEco((prev) => {
      const next = { ...prev, ...partial };
      saveEcoProfile(deviceSpace, next);
      return next;
    });
  };

  const handleUpdateCustomization = (partial: Partial<OSCustomization>) => {
    setCustomization((prev) => {
      const next = { ...prev, ...partial };
      saveCustomization(deviceSpace, next);
      return next;
    });
  };

  const handleRotateIdentity = () => {
    const newMask = generateAnonymousIdentity(deviceSpace);
    handleUpdatePrivacy(newMask);
  };

  const handleUpdateShieldStats = (stats: ShieldStats) => {
    setShieldStats(stats);
    saveShieldStats(deviceSpace, stats);
  };

  const handleSwitchSpace = (targetSpace: DeviceSpace) => {
    if (targetSpace === deviceSpace) return;
    triggerHaptic([20, 35]);
    setIsSwitchingSpace(true);
    setIsControlCenterOpen(false);
    setIsNotificationCenterOpen(false);
    setIsAppSwitcherOpen(false);
    setIsAssistantOpen(false);
    setIsLauncherOpen(false);

    setTimeout(() => {
      setDeviceSpace(targetSpace);
      setWorkspaces(createInitialWorkspaces());
      setActiveWorkspaceId(1);
      setOpenApps(
        targetSpace === 'ghost'
          ? ['browser', 'shield', 'keyring', 'notes']
          : ['agents', 'wellbeing', 'learn', 'shield']
      );
      setPrivacy(createInitialPrivacyProfile(targetSpace));
      setShieldStats(loadShieldStats(targetSpace));
      setWellbeing(loadWellbeingState(targetSpace));
      setEco(loadEcoProfile(targetSpace));
      setCustomization(loadCustomization(targetSpace));
      setNotifications(getDefaultNotifications(targetSpace));
      const defaultWall =
        targetSpace === 'ghost' ? GHOST_LINUX_WALLPAPER : DEFAULT_LINUX_WALLPAPER;
      setCurrentWallpaper(readSpaceData<string>(targetSpace, 'wallpaper', defaultWall));
      setIsSwitchingSpace(false);
    }, 320);
  };

  const handleBurnGhostDevice = () => {
    shredSpaceData('ghost');
    const freshGhostPrivacy = createInitialPrivacyProfile('ghost');
    const freshShield = loadShieldStats('ghost');
    if (deviceSpace === 'ghost') {
      setPrivacy(freshGhostPrivacy);
      setShieldStats(freshShield);
      setWellbeing(loadWellbeingState('ghost'));
      setEco(loadEcoProfile('ghost'));
      setCustomization(loadCustomization('ghost'));
      setWorkspaces(createInitialWorkspaces());
      setOpenApps(['browser', 'shield']);
      setNotifications(getDefaultNotifications('ghost'));
      setCurrentWallpaper(GHOST_LINUX_WALLPAPER);
    }
  };

  const handleToggleMusic = () => {
    if (!isPlayingMusic) {
      startAmbientAudioStream(432);
      setIsPlayingMusic(true);
    } else {
      stopAmbientAudioStream();
      setIsPlayingMusic(false);
    }
  };

  const updateHardware = (partial: Partial<HardwareState>) => {
    setHardware((prev) => ({ ...prev, ...partial }));
  };

  const useFloatingWM =
    viewportMode === 'native_full' &&
    customization.windowMode === 'floating' &&
    typeof window !== 'undefined' &&
    window.innerWidth >= 720;

  const handleLaunchApp = (appId: AppId) => {
    if (!openApps.includes(appId)) {
      setOpenApps((prev) => [appId, ...prev]);
    }

    if (useFloatingWM) {
      updateCurrentWorkspace((ws) => {
        const maxZ = ws.floatingWindows.reduce((m, w) => Math.max(m, w.zIndex), 10);
        const existing = ws.floatingWindows.find((w) => w.appId === appId);
        if (existing) {
          return {
            ...ws,
            floatingWindows: ws.floatingWindows.map((w) =>
              w.appId === appId ? { ...w, isMinimized: false, zIndex: maxZ + 1 } : w
            ),
          };
        }
        const offset = (ws.floatingWindows.length % 5) * 28;
        const winW = Math.min(820, Math.max(460, Math.floor((window.innerWidth || 1200) * 0.6)));
        const winH = Math.min(600, Math.max(400, Math.floor((window.innerHeight || 800) * 0.68)));
        const newWin: FloatingWindowState = {
          appId,
          x: 48 + offset,
          y: 28 + offset,
          width: winW,
          height: winH,
          zIndex: maxZ + 1,
          isMinimized: false,
          isMaximized: false,
        };
        return {
          ...ws,
          floatingWindows: [...ws.floatingWindows, newWin],
        };
      });
    } else {
      updateCurrentWorkspace((ws) => ({ ...ws, activeApp: appId }));
    }

    if (privacy.shieldEnabled && shieldStats.perAppShield[appId] !== false) {
      const nextStats = recordBlockedEvent(
        deviceSpace,
        shieldStats,
        appId,
        APP_REGISTRY[appId].name,
        `telemetry.${appId}-sdk.blocked`,
        'telemetry',
        85
      );
      setShieldStats(nextStats);
    }

    setIsControlCenterOpen(false);
    setIsNotificationCenterOpen(false);
    setIsAppSwitcherOpen(false);
    setIsAssistantOpen(false);
  };

  const handleFocusFloatingWindow = (appId: AppId) => {
    updateCurrentWorkspace((ws) => {
      const maxZ = ws.floatingWindows.reduce((m, w) => Math.max(m, w.zIndex), 10);
      return {
        ...ws,
        floatingWindows: ws.floatingWindows.map((w) =>
          w.appId === appId ? { ...w, zIndex: maxZ + 1, isMinimized: false } : w
        ),
      };
    });
  };

  const handleUpdateFloatingWindow = (appId: AppId, partial: Partial<FloatingWindowState>) => {
    updateCurrentWorkspace((ws) => ({
      ...ws,
      floatingWindows: ws.floatingWindows.map((w) =>
        w.appId === appId ? { ...w, ...partial } : w
      ),
    }));
  };

  const handleCloseFloatingWindow = (appId: AppId) => {
    updateCurrentWorkspace((ws) => ({
      ...ws,
      floatingWindows: ws.floatingWindows.filter((w) => w.appId !== appId),
    }));
  };

  const handleExecuteIntent = (action: string, target?: string) => {
    switch (action) {
      case 'OPEN_APP':
        if (target && target in APP_REGISTRY) {
          handleLaunchApp(target as AppId);
        }
        break;
      case 'SWITCH_SPACE':
        if (target === 'ghost' || target === 'primary') {
          handleSwitchSpace(target);
        }
        break;
      case 'START_FOCUS': {
        const mins = Math.max(5, Math.min(90, parseInt(target || '25', 10) || 25));
        handleUpdateWellbeing({
          focusDurationMin: mins,
          focusSecondsLeft: mins * 60,
          focusActive: true,
        });
        updateHardware({ doNotDisturb: true });
        handleLaunchApp('wellbeing');
        break;
      }
      case 'TOGGLE_ECO': {
        const nextEco = !eco.ecoMode;
        handleUpdateEco({ ecoMode: nextEco, reducedMotion: nextEco });
        if (nextEco && hardware.screenBrightness > 65) {
          updateHardware({ screenBrightness: 60 });
        }
        handleLaunchApp('eco');
        break;
      }
      case 'TOGGLE_GRAYSCALE':
        handleUpdateWellbeing({ calmGrayscale: !wellbeing.calmGrayscale });
        break;
      case 'TOGGLE_FLASHLIGHT':
        updateHardware({ flashlightOn: !hardware.flashlightOn });
        break;
      case 'ROTATE_IDENTITY':
        handleRotateIdentity();
        break;
      default:
        break;
    }
  };

  const handleCloseActiveApp = () => {
    updateCurrentWorkspace((ws) => ({
      ...ws,
      activeApp: null,
      splitScreenApp: null,
      floatingWindows: ws.floatingWindows.map((w) => ({ ...w, isMinimized: true })),
    }));
  };

  const handleKillApp = (appId: AppId) => {
    setOpenApps((prev) => prev.filter((a) => a !== appId));
    setWorkspaces((prev) =>
      prev.map((ws) => ({
        ...ws,
        activeApp: ws.activeApp === appId ? null : ws.activeApp,
        splitScreenApp: ws.splitScreenApp === appId ? null : ws.splitScreenApp,
        floatingWindows: ws.floatingWindows.filter((w) => w.appId !== appId),
      }))
    );
  };

  const handleClearAllApps = () => {
    setOpenApps([]);
    setWorkspaces(createInitialWorkspaces());
    setIsAppSwitcherOpen(false);
  };

  const handlePowerButton = () => {
    playLockChime(!isLocked);
    setIsLocked(!isLocked);
    setIsControlCenterOpen(false);
    setIsNotificationCenterOpen(false);
    setIsAppSwitcherOpen(false);
    setIsAssistantOpen(false);
    setIsLauncherOpen(false);
  };

  const renderAppContent = (appId: AppId) => {
    const spaceKey = `${deviceSpace}-${appId}`;
    switch (appId) {
      case 'agents':
        return (
          <AgentsApp
            key={spaceKey}
            deviceSpace={deviceSpace}
            privacy={privacy}
            hardware={hardware}
            wellbeing={wellbeing}
            eco={eco}
            onUpdateHardware={updateHardware}
            onUpdatePrivacy={handleUpdatePrivacy}
            onUpdateWellbeing={handleUpdateWellbeing}
            onUpdateEco={handleUpdateEco}
            onRotateIdentity={handleRotateIdentity}
            onLaunchApp={handleLaunchApp}
          />
        );
      case 'wellbeing':
        return (
          <WellbeingApp
            key={spaceKey}
            wellbeing={wellbeing}
            hardware={hardware}
            onUpdateWellbeing={handleUpdateWellbeing}
            onUpdateHardware={updateHardware}
          />
        );
      case 'knowledge':
        return <KnowledgeApp key={spaceKey} deviceSpace={deviceSpace} />;
      case 'learn':
        return <LearnApp key={spaceKey} deviceSpace={deviceSpace} privacy={privacy} />;
      case 'continuum':
        return (
          <ContinuumApp
            key={spaceKey}
            deviceSpace={deviceSpace}
            privacy={privacy}
            hardware={hardware}
            viewportMode={viewportMode}
            eco={eco}
            onChangeViewportMode={setViewportMode}
            onUpdateEco={handleUpdateEco}
          />
        );
      case 'eco':
        return (
          <EcoApp
            key={spaceKey}
            eco={eco}
            hardware={hardware}
            privacy={privacy}
            onUpdateEco={handleUpdateEco}
            onUpdateHardware={updateHardware}
            onUpdatePrivacy={handleUpdatePrivacy}
          />
        );
      case 'code':
        return <CodeStudioApp key={spaceKey} deviceSpace={deviceSpace} />;
      case 'paint':
        return <PaintStudioApp key={spaceKey} deviceSpace={deviceSpace} />;
      case 'calendar':
        return <CalendarApp key={spaceKey} deviceSpace={deviceSpace} />;
      case 'keyring':
        return <KeyringApp key={spaceKey} deviceSpace={deviceSpace} />;
      case 'monitor':
        return (
          <TaskManagerApp
            key={spaceKey}
            hardware={hardware}
            openApps={openApps}
            appMetadata={APP_REGISTRY}
            onFocusApp={handleLaunchApp}
            onKillApp={handleKillApp}
          />
        );
      case 'shield':
        return (
          <ShieldApp
            key={spaceKey}
            privacy={privacy}
            onUpdatePrivacy={handleUpdatePrivacy}
            onRotateIdentity={handleRotateIdentity}
            shieldStats={shieldStats}
            onUpdateShieldStats={handleUpdateShieldStats}
            appMetadata={APP_REGISTRY}
            onSpaceReset={() => {
              if (deviceSpace === 'ghost') handleBurnGhostDevice();
            }}
          />
        );
      case 'ghost':
        return (
          <GhostSpaceApp
            key={spaceKey}
            deviceSpace={deviceSpace}
            privacy={privacy}
            onSwitchSpace={handleSwitchSpace}
            onBurnGhostDevice={handleBurnGhostDevice}
            onRotateIdentity={handleRotateIdentity}
            onOpenShield={() => handleLaunchApp('shield')}
          />
        );
      case 'phone':
        return (
          <PhoneApp
            key={spaceKey}
            deviceSpace={deviceSpace}
            isCallActive={isCallActive}
            onStartCall={() => {
              setIsCallActive(true);
              setCallDurationStr('0:01');
            }}
            onEndCall={() => {
              setIsCallActive(false);
              setCallDurationStr(null);
            }}
          />
        );
      case 'camera':
        return (
          <CameraApp
            key={spaceKey}
            onOpenGallery={() => handleLaunchApp('gallery')}
            onPhotoCaptured={(dataUrl) => {
              const baseFiles =
                deviceSpace === 'ghost' ? GHOST_DEFAULT_FILES : PRIMARY_DEFAULT_FILES;
              const existing = readSpaceData<FileItem[]>(deviceSpace, 'files', baseFiles);
              const photoItem: FileItem = {
                id: `photo-${Date.now()}`,
                name: `capture_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}.jpg`,
                path: '/Photos',
                type: 'image',
                sizeBytes: Math.max(42000, Math.round(dataUrl.length * 0.75)),
                updatedAt: 'Just now',
                dataUrl,
              };
              writeSpaceData(deviceSpace, 'files', [photoItem, ...existing]);
              setNotifications((prev) => [
                {
                  id: `cam-${Date.now()}`,
                  appId: 'camera',
                  appName: 'Camera',
                  title: 'Photo Saved Locally',
                  body: `${photoItem.name} stored in ${
                    deviceSpace === 'ghost' ? 'Ghost' : 'Primary'
                  } /Photos.`,
                  time: 'Now',
                },
                ...prev.slice(0, 9),
              ]);
            }}
          />
        );
      case 'messages':
        return (
          <MessagesApp
            key={spaceKey}
            deviceSpace={deviceSpace}
            shieldStats={shieldStats}
            onUpdateShieldStats={handleUpdateShieldStats}
          />
        );
      case 'browser':
        return (
          <BrowserApp
            key={spaceKey}
            deviceSpace={deviceSpace}
            privacy={privacy}
            onUpdatePrivacy={handleUpdatePrivacy}
            shieldStats={shieldStats}
            onUpdateShieldStats={handleUpdateShieldStats}
          />
        );
      case 'files':
      case 'gallery':
        return <FilesApp key={spaceKey} deviceSpace={deviceSpace} />;
      case 'music':
        return (
          <MusicApp
            key={spaceKey}
            isPlaying={isPlayingMusic}
            onTogglePlay={handleToggleMusic}
            onTrackChange={(title) => setCurrentTrackTitle(title)}
          />
        );
      case 'clock':
        return <ClockApp key={spaceKey} />;
      case 'calculator':
        return <CalculatorApp key={spaceKey} />;
      case 'weather':
        return (
          <WeatherApp
            key={spaceKey}
            hardware={hardware}
            privacy={privacy}
            onUpdateHardware={updateHardware}
          />
        );
      case 'notes':
        return <NotesApp key={spaceKey} deviceSpace={deviceSpace} />;
      case 'vitals':
        return (
          <VitalsApp
            key={spaceKey}
            hardware={hardware}
            privacy={privacy}
            onUpdateHardware={updateHardware}
            viewportMode={viewportMode}
            onChangeViewportMode={setViewportMode}
          />
        );
      case 'appstore':
        return <AppStoreApp key={spaceKey} deviceSpace={deviceSpace} />;
      case 'terminal':
        return (
          <TerminalApp
            key={spaceKey}
            deviceSpace={deviceSpace}
            privacy={privacy}
            shieldStats={shieldStats}
            hardware={hardware}
            onSwitchSpace={handleSwitchSpace}
            onBurnGhostDevice={handleBurnGhostDevice}
          />
        );
      case 'game':
        return <CyberRunnerApp key={spaceKey} deviceSpace={deviceSpace} />;
      case 'settings':
        return (
          <SettingsApp
            key={spaceKey}
            hardware={hardware}
            onUpdateHardware={updateHardware}
            currentWallpaper={currentWallpaper}
            onSelectWallpaper={(url) => {
              setCurrentWallpaper(url);
              writeSpaceData(deviceSpace, 'wallpaper', url);
            }}
            navigationMode={navigationMode}
            onChangeNavigationMode={(m) => setNavigationMode(m)}
            deviceSpace={deviceSpace}
            privacy={privacy}
            customization={customization}
            onUpdateCustomization={handleUpdateCustomization}
            onSwitchSpace={handleSwitchSpace}
            onOpenShield={() => handleLaunchApp('shield')}
            onOpenGhostSpace={() => handleLaunchApp('ghost')}
          />
        );
      case 'playstore':
        return (
          <PlayStoreApp
            key={spaceKey}
            deviceSpace={deviceSpace}
            onLaunchApp={handleLaunchApp}
          />
        );
      case 'gmail':
        return <GmailApp key={spaceKey} deviceSpace={deviceSpace} />;
      case 'brave':
        return (
          <BraveApp
            key={spaceKey}
            deviceSpace={deviceSpace}
            privacy={privacy}
            onUpdatePrivacy={handleUpdatePrivacy}
            shieldStats={shieldStats}
            onUpdateShieldStats={handleUpdateShieldStats}
          />
        );
      case 'tor':
        return (
          <TorBrowserApp
            key={spaceKey}
            deviceSpace={deviceSpace}
            privacy={privacy}
            onRotateIdentity={handleRotateIdentity}
          />
        );
      case 'dayscore':
        return <DayScoreApp key={spaceKey} deviceSpace={deviceSpace} />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-white">
            <span>Application Viewport</span>
          </div>
        );
    }
  };

  const totalShieldBlocked =
    shieldStats.adsBlocked + shieldStats.trackersBlocked + shieldStats.fingerprintsNeutralized;

  return (
    <HardwareDeviceFrame
      hardware={hardware}
      onUpdateHardware={updateHardware}
      onPowerButton={handlePowerButton}
      wallpaperUrl={currentWallpaper}
      wallpaperDim={customization.wallpaperDim}
      wallpaperBlur={customization.wallpaperBlur}
      viewportMode={viewportMode}
      onChangeViewportMode={setViewportMode}
      calmGrayscale={wellbeing.calmGrayscale}
      reducedMotion={eco.reducedMotion}
    >
      {/* 1. Status Bar + Workspaces */}
      <StatusBar
        hardware={hardware}
        deviceSpace={deviceSpace}
        privacy={privacy}
        viewportMode={viewportMode}
        windowMode={customization.windowMode}
        activeWorkspace={activeWorkspaceId}
        onSelectWorkspace={setActiveWorkspaceId}
        onToggleWindowMode={() => {
          const nextMode = customization.windowMode === 'floating' ? 'tiling' : 'floating';
          handleUpdateCustomization({ windowMode: nextMode });
        }}
        onChangeViewportMode={setViewportMode}
        onOpenControlCenter={() => setIsControlCenterOpen(true)}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onOpenLauncher={() => setIsLauncherOpen(true)}
        notificationCount={notifications.length}
      />

      {/* 2. Omni-Island */}
      <OmniIsland
        activeCallDuration={callDurationStr}
        isPlayingMusic={isPlayingMusic}
        onToggleMusic={handleToggleMusic}
        currentTrackTitle={currentTrackTitle}
        isCameraActive={activeApp === 'camera'}
        isMicActive={activeApp === 'notes'}
        deviceSpace={deviceSpace}
        shieldBlockedTotal={totalShieldBlocked}
        onOpenApp={handleLaunchApp}
      />

      {/* 3. Main Viewport Canvas */}
      <main className="relative flex-1 w-full h-full flex flex-col overflow-hidden">
        {useFloatingWM ? (
          <>
            <HomeScreen
              appMetadata={APP_REGISTRY}
              onLaunchApp={handleLaunchApp}
              deviceSpace={deviceSpace}
              privacy={privacy}
              shieldStats={shieldStats}
              wellbeing={wellbeing}
              eco={eco}
              customization={customization}
              onSwitchSpace={handleSwitchSpace}
              onOpenAssistant={() => setIsAssistantOpen(true)}
              onOpenLauncher={() => setIsLauncherOpen(true)}
              onExecuteIntent={handleExecuteIntent}
            />

            {floatingWindows.length > 0 && (
              <WindowManagerLayer
                windows={floatingWindows}
                appMetadata={APP_REGISTRY}
                customization={customization}
                renderAppContent={renderAppContent}
                onFocusWindow={handleFocusFloatingWindow}
                onUpdateWindow={handleUpdateFloatingWindow}
                onCloseWindow={handleCloseFloatingWindow}
                onEnableTilingMode={() => {
                  const focused = [...floatingWindows].sort((a, b) => b.zIndex - a.zIndex)[0];
                  handleUpdateCustomization({ windowMode: 'tiling' });
                  if (focused) {
                    updateCurrentWorkspace((ws) => ({ ...ws, activeApp: focused.appId }));
                  }
                }}
              />
            )}

            {/* Minimized Window Task Strip inside Floating WM */}
            {floatingWindows.length > 0 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/85 border border-white/15 backdrop-blur-xl shadow-xl">
                {floatingWindows.map((win) => (
                  <button
                    key={win.appId}
                    onClick={() => handleFocusFloatingWindow(win.appId)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors ${
                      win.isMinimized
                        ? 'bg-white/5 text-slate-400 hover:text-white'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    {APP_REGISTRY[win.appId].name}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : activeApp === null ? (
          <HomeScreen
            appMetadata={APP_REGISTRY}
            onLaunchApp={handleLaunchApp}
            deviceSpace={deviceSpace}
            privacy={privacy}
            shieldStats={shieldStats}
            wellbeing={wellbeing}
            eco={eco}
            customization={customization}
            onSwitchSpace={handleSwitchSpace}
            onOpenAssistant={() => setIsAssistantOpen(true)}
            onOpenLauncher={() => setIsLauncherOpen(true)}
            onExecuteIntent={handleExecuteIntent}
          />
        ) : (
          <div className="flex-1 w-full h-full flex flex-col overflow-hidden">
            {/* Application Window Header */}
            <div className="px-3 py-1.5 bg-slate-900/95 border-b border-white/10 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={handleCloseActiveApp}
                  className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                  title="Return to Desktop"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desktop</span>
                </button>
                <span className="text-slate-600">/</span>
                <span className="font-semibold text-white truncate">
                  {APP_REGISTRY[activeApp].name}
                  {splitScreenApp ? ` + ${APP_REGISTRY[splitScreenApp].name}` : ''}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {viewportMode === 'native_full' && (
                  <button
                    onClick={() => {
                      handleUpdateCustomization({ windowMode: 'floating' });
                      handleLaunchApp(activeApp);
                    }}
                    className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-cyan-300 cursor-pointer text-[11px]"
                    title="Pop Out as Floating Window"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Pop Out</span>
                  </button>
                )}

                {splitScreenApp ? (
                  <button
                    onClick={() =>
                      updateCurrentWorkspace((ws) => ({ ...ws, splitScreenApp: null }))
                    }
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 cursor-pointer text-[11px]"
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Exit Split</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAppSwitcherOpen(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer text-[11px]"
                    title="Split View / Running Apps"
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Split / Tasks</span>
                  </button>
                )}

                <button
                  onClick={handleCloseActiveApp}
                  className="p-1 rounded-md hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer"
                  title="Close Window"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {splitScreenApp ? (
              <div
                className={`flex-1 flex ${
                  viewportMode === 'native_full' ? 'flex-col md:flex-row' : 'flex-col'
                } overflow-hidden`}
              >
                <div
                  className={`flex-1 overflow-hidden ${
                    viewportMode === 'native_full'
                      ? 'border-b md:border-b-0 md:border-r border-white/15'
                      : 'border-b border-white/15'
                  }`}
                >
                  {renderAppContent(activeApp)}
                </div>
                <div className="flex-1 overflow-hidden">{renderAppContent(splitScreenApp)}</div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {renderAppContent(activeApp)}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. Bottom System Navigation Bar */}
      <NavigationBar
        mode={navigationMode}
        onHome={handleCloseActiveApp}
        onBack={handleCloseActiveApp}
        onRecents={() => setIsAppSwitcherOpen(true)}
        onLauncher={() => setIsLauncherOpen(true)}
      />

      {/* 5. Control Center */}
      <ControlCenter
        isOpen={isControlCenterOpen}
        onClose={() => setIsControlCenterOpen(false)}
        hardware={hardware}
        onUpdateHardware={updateHardware}
        deviceSpace={deviceSpace}
        privacy={privacy}
        wellbeing={wellbeing}
        eco={eco}
        onUpdatePrivacy={handleUpdatePrivacy}
        onUpdateWellbeing={handleUpdateWellbeing}
        onUpdateEco={handleUpdateEco}
        onSwitchSpace={handleSwitchSpace}
        onLaunchApp={handleLaunchApp}
        isPlayingMusic={isPlayingMusic}
        onToggleMusic={handleToggleMusic}
        currentTrackTitle={currentTrackTitle}
      />

      {/* 6. Notification Center */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        onClearAll={() => setNotifications([])}
        onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
        onLaunchApp={handleLaunchApp}
      />

      {/* 7. App Switcher */}
      <AppSwitcher
        isOpen={isAppSwitcherOpen}
        onClose={() => setIsAppSwitcherOpen(false)}
        openApps={openApps}
        activeApp={activeApp}
        onSelectApp={(app) => {
          handleLaunchApp(app);
          setIsAppSwitcherOpen(false);
        }}
        onCloseApp={handleKillApp}
        onClearAllApps={handleClearAllApps}
        appMetadata={APP_REGISTRY}
        onEnableSplitScreen={(app1, app2) => {
          handleUpdateCustomization({ windowMode: 'tiling' });
          updateCurrentWorkspace((ws) => ({
            ...ws,
            activeApp: app1,
            splitScreenApp: app2,
          }));
          setIsAppSwitcherOpen(false);
        }}
      />

      {/* 8. Personal Intelligence */}
      <AuraAssistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onLaunchApp={handleLaunchApp}
        onExecuteIntent={handleExecuteIntent}
        onSwitchSpace={handleSwitchSpace}
        onRotateIdentity={handleRotateIdentity}
        localOnlyAirGap={privacy.localOnlyAirGap}
        systemState={{ deviceSpace, activeApp, openAppsCount: openApps.length }}
      />

      {/* 8b. Global Command & Quick Math Launcher (Ctrl+K) */}
      <CommandLauncher
        isOpen={isLauncherOpen}
        onClose={() => setIsLauncherOpen(false)}
        appMetadata={APP_REGISTRY}
        deviceSpace={deviceSpace}
        onLaunchApp={handleLaunchApp}
        onExecuteIntent={handleExecuteIntent}
        onOpenAppSwitcher={() => setIsAppSwitcherOpen(true)}
      />

      {/* 9. Isolated Space Transition Curtain */}
      {isSwitchingSpace && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center space-y-2">
          <span className="text-xs font-mono text-emerald-400">
            {deviceSpace === 'primary'
              ? 'Mounting Isolated Ghost Device...'
              : 'Returning to Primary Device...'}
          </span>
          <span className="text-[11px] text-slate-400">
            Switching encrypted on-device partition & hardware mask
          </span>
        </div>
      )}

      {/* 10. Dual-Boot Lock Screen */}
      {isLocked && (
        <LockScreen
          hardware={hardware}
          deviceSpace={deviceSpace}
          notifications={notifications}
          onUnlock={(targetSpace) => {
            if (targetSpace && targetSpace !== deviceSpace) {
              handleSwitchSpace(targetSpace);
            }
            setIsLocked(false);
          }}
          onLaunchApp={handleLaunchApp}
          onToggleFlashlight={() => updateHardware({ flashlightOn: !hardware.flashlightOn })}
          wallpaperUrl={currentWallpaper}
        />
      )}
    </HardwareDeviceFrame>
  );
}
