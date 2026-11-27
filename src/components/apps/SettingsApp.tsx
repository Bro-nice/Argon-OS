import React, { useState } from 'react';
import {
  Settings,
  Smartphone,
  Sun,
  Volume2,
  ShieldCheck,
  Layers,
  ChevronRight,
  ArrowLeft,
  Check,
  EyeOff,
  HardDrive,
  Palette,
  Layout,
  Upload,
  Download,
  RotateCcw,
  Keyboard,
} from 'lucide-react';
import {
  AccentTheme,
  DeviceSpace,
  DockPosition,
  FontTheme,
  HardwareState,
  IconShape,
  OSCustomization,
  PrivacyProfile,
  SurfaceStyle,
  UIScale,
  WindowMode,
} from '../../types/os';
import {
  ACCENT_TOKENS,
  DEFAULT_CUSTOMIZATION,
  FONT_STACKS,
  WALLPAPER_CATALOG,
} from '../../utils/customizationStore';
import { triggerHaptic } from '../../utils/hardware';

interface SettingsAppProps {
  hardware: HardwareState;
  onUpdateHardware: (partial: Partial<HardwareState>) => void;
  currentWallpaper: string;
  onSelectWallpaper: (url: string) => void;
  navigationMode: 'gestures' | 'buttons';
  onChangeNavigationMode: (mode: 'gestures' | 'buttons') => void;
  deviceSpace: DeviceSpace;
  privacy: PrivacyProfile;
  customization: OSCustomization;
  onUpdateCustomization: (partial: Partial<OSCustomization>) => void;
  onSwitchSpace: (target: DeviceSpace) => void;
  onOpenShield: () => void;
  onOpenGhostSpace: () => void;
}

export const SettingsApp: React.FC<SettingsAppProps> = ({
  hardware,
  onUpdateHardware,
  currentWallpaper,
  onSelectWallpaper,
  navigationMode,
  onChangeNavigationMode,
  deviceSpace,
  privacy,
  customization,
  onUpdateCustomization,
  onSwitchSpace,
  onOpenShield,
  onOpenGhostSpace,
}) => {
  const [activeSection, setActiveSection] = useState<
    | 'root'
    | 'about'
    | 'personalize'
    | 'workspace'
    | 'display'
    | 'sound'
    | 'security'
    | 'navigation'
    | 'shortcuts'
  >('root');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleUploadWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSelectWallpaper(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportConfig = () => {
    const bundle = {
      exportedAt: new Date().toISOString(),
      deviceSpace,
      wallpaper: currentWallpaper,
      navigationMode,
      customization,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `argon-os-${deviceSpace}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (parsed.customization) onUpdateCustomization(parsed.customization);
        if (parsed.wallpaper) onSelectWallpaper(parsed.wallpaper);
        if (parsed.navigationMode) onChangeNavigationMode(parsed.navigationMode);
        setImportStatus('Configuration restored cleanly.');
      } catch {
        setImportStatus('Invalid JSON configuration file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col p-4 select-none overflow-y-auto space-y-4">
      <div className="max-w-3xl w-full mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
          <div className="flex items-center gap-2">
            {activeSection !== 'root' ? (
              <button
                onClick={() => setActiveSection('root')}
                className="min-h-[34px] min-w-[34px] flex items-center justify-center text-cyan-400 hover:text-white cursor-pointer rounded-lg hover:bg-white/5"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <Settings className="w-4 h-4 text-cyan-400" />
            )}
            <h1 className="font-bold text-white text-sm capitalize">
              {activeSection === 'root'
                ? 'System Settings & Customization'
                : activeSection.replace('-', ' ')}
            </h1>
          </div>

          {activeSection === 'personalize' && (
            <button
              onClick={() => onUpdateCustomization(DEFAULT_CUSTOMIZATION)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
          )}
        </div>

        {/* Root Menu */}
        {activeSection === 'root' && (
          <div className="space-y-2.5">
            <div
              onClick={() => {
                triggerHaptic(10);
                setActiveSection('about');
              }}
              className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    deviceSpace === 'ghost'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-cyan-500/20 text-cyan-400'
                  }`}
                >
                  {deviceSpace === 'ghost' ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Smartphone className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-white truncate">
                    {deviceSpace === 'ghost' ? 'Ghost Device (Isolated)' : 'Argon OS Workstation'}
                  </h2>
                  <span className="text-[11px] text-slate-400 font-mono block truncate">
                    Mask: {privacy.spoofedDeviceId} · {hardware.cpuCores} Threads · Local-Only
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  id: 'personalize',
                  label: 'Appearance & Theme Studio',
                  desc: 'Accent palette, fonts, UI scale, icon shapes, glass surfaces',
                  icon: Palette,
                  color: 'text-cyan-400',
                },
                {
                  id: 'workspace',
                  label: 'Windows, Dock & Desktop',
                  desc: 'Floating vs Tiled windows, dock rail, widgets, config backup',
                  icon: Layout,
                  color: 'text-emerald-400',
                },
                {
                  id: 'display',
                  label: 'Wallpapers & Luminance',
                  desc: 'Linux-inspired backdrops, custom uploads, dim & blur',
                  icon: Sun,
                  color: 'text-amber-400',
                },
                {
                  id: 'security',
                  label: 'Privacy & Ghost Device',
                  desc: 'Shield firewall, identity mask, isolated second device',
                  icon: ShieldCheck,
                  color: 'text-orange-400',
                },
                {
                  id: 'sound',
                  label: 'Sound & Audio Output',
                  desc: 'Master gain level and hardware mute',
                  icon: Volume2,
                  color: 'text-indigo-400',
                },
                {
                  id: 'navigation',
                  label: 'Taskbar & Navigation',
                  desc: 'Classic button bar or minimal gesture pill',
                  icon: Layers,
                  color: 'text-purple-400',
                },
                {
                  id: 'shortcuts',
                  label: 'Keyboard Shortcuts',
                  desc: 'Command launcher, workspaces, window tiling keys',
                  icon: Keyboard,
                  color: 'text-slate-300',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      triggerHaptic(10);
                      setActiveSection(item.id as any);
                    }}
                    className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 flex items-center justify-between cursor-pointer transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <Icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {item.label}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Theme & Appearance Studio */}
        {activeSection === 'personalize' && (
          <div className="space-y-4">
            {/* Accent Color */}
            <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2.5">
              <span className="text-xs font-semibold text-white block">System Accent Palette</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {(Object.keys(ACCENT_TOKENS) as AccentTheme[]).map((key) => {
                  const tok = ACCENT_TOKENS[key];
                  const active = customization.accentTheme === key;
                  return (
                    <button
                      key={key}
                      onClick={() => onUpdateCustomization({ accentTheme: key })}
                      className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer ${
                        active
                          ? 'bg-white/10 border-white/40 text-white'
                          : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: tok.hex }}
                      />
                      <span className="text-[11px] truncate">{tok.label.split(' ')[1]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typography & Scale */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2">
                <span className="text-xs font-semibold text-white block">System Font Family</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(FONT_STACKS) as FontTheme[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => onUpdateCustomization({ fontTheme: f })}
                      style={{ fontFamily: FONT_STACKS[f].css }}
                      className={`px-2.5 py-2 rounded-lg border text-xs text-left cursor-pointer ${
                        customization.fontTheme === f
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-slate-950 border-white/10 text-slate-300'
                      }`}
                    >
                      {FONT_STACKS[f].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2">
                <span className="text-xs font-semibold text-white block">Interface Scale</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['compact', 'standard', 'comfortable'] as UIScale[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => onUpdateCustomization({ uiScale: s })}
                      className={`px-2 py-2 rounded-lg border text-xs capitalize cursor-pointer ${
                        customization.uiScale === s
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-slate-950 border-white/10 text-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Icon Geometry & Surface Material */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2">
                <span className="text-xs font-semibold text-white block">App Icon Geometry</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['squircle', 'rounded', 'square', 'circle'] as IconShape[]).map((shape) => (
                    <button
                      key={shape}
                      onClick={() => onUpdateCustomization({ iconShape: shape })}
                      className={`px-2 py-2 rounded-lg border text-[11px] capitalize cursor-pointer ${
                        customization.iconShape === shape
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-slate-950 border-white/10 text-slate-300'
                      }`}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2">
                <span className="text-xs font-semibold text-white block">Window Surface Material</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['glass', 'matte', 'minimal'] as SurfaceStyle[]).map((mat) => (
                    <button
                      key={mat}
                      onClick={() => onUpdateCustomization({ surfaceStyle: mat })}
                      className={`px-2 py-2 rounded-lg border text-xs capitalize cursor-pointer ${
                        customization.surfaceStyle === mat
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-slate-950 border-white/10 text-slate-300'
                      }`}
                    >
                      {mat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Accessibility Contrast */}
            <button
              onClick={() =>
                onUpdateCustomization({ highContrastBorders: !customization.highContrastBorders })
              }
              className="w-full p-3.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs cursor-pointer"
            >
              <div>
                <span className="font-semibold text-white block">High-Contrast Window Borders</span>
                <span className="text-[11px] text-slate-400">
                  Sharpens window outlines and control contrast across all panels
                </span>
              </div>
              <span className="font-mono text-cyan-400">
                {customization.highContrastBorders ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        )}

        {/* Workspace, Windowing & Dock */}
        {activeSection === 'workspace' && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2">
              <span className="text-xs font-semibold text-white block">Window Manager Behavior</span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      id: 'floating',
                      label: 'Floating Desktop Windows',
                      desc: 'Drag, resize, snap left/right & layer multiple apps',
                    },
                    {
                      id: 'tiling',
                      label: 'Maximized & Split Tiling',
                      desc: 'Full-viewport app focus with 2-pane split mode',
                    },
                  ] as { id: WindowMode; label: string; desc: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onUpdateCustomization({ windowMode: m.id })}
                    className={`p-3 rounded-xl border text-left cursor-pointer ${
                      customization.windowMode === m.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-slate-950 border-white/10 text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold block">{m.label}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2">
              <span className="text-xs font-semibold text-white block">Desktop Dock Placement</span>
              <div className="grid grid-cols-3 gap-2">
                {(['bottom', 'left', 'hidden'] as DockPosition[]).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => onUpdateCustomization({ dockPosition: pos })}
                    className={`py-2 rounded-lg border text-xs capitalize cursor-pointer ${
                      customization.dockPosition === pos
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-slate-950 border-white/10 text-slate-300'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() =>
                  onUpdateCustomization({ showDesktopWidgets: !customization.showDesktopWidgets })
                }
                className="p-3.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs cursor-pointer"
              >
                <span className="font-semibold text-white">Desktop Telemetry Cards</span>
                <span className="font-mono text-cyan-400">
                  {customization.showDesktopWidgets ? 'VISIBLE' : 'HIDDEN'}
                </span>
              </button>

              <button
                onClick={() =>
                  onUpdateCustomization({ showAppLabels: !customization.showAppLabels })
                }
                className="p-3.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs cursor-pointer"
              >
                <span className="font-semibold text-white">App Grid Text Labels</span>
                <span className="font-mono text-cyan-400">
                  {customization.showAppLabels ? 'VISIBLE' : 'HIDDEN'}
                </span>
              </button>
            </div>

            {/* Export / Import Configuration */}
            <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2.5">
              <span className="text-xs font-semibold text-white block">
                Portable Configuration Backup (JSON)
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleExportConfig}
                  className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Config</span>
                </button>
                <label className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Import Config</span>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleImportConfig}
                    className="hidden"
                  />
                </label>
              </div>
              {importStatus && <p className="text-xs text-emerald-400">{importStatus}</p>}
            </div>
          </div>
        )}

        {/* Display & Wallpapers */}
        {activeSection === 'display' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">Brightness</span>
                  <span className="font-mono tabular-nums text-amber-400">
                    {hardware.screenBrightness}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={hardware.screenBrightness}
                  onChange={(e) =>
                    onUpdateHardware({ screenBrightness: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">Backdrop Dim</span>
                  <span className="font-mono tabular-nums text-cyan-400">
                    {customization.wallpaperDim}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="80"
                  value={customization.wallpaperDim}
                  onChange={(e) =>
                    onUpdateCustomization({ wallpaperDim: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">Backdrop Blur</span>
                  <span className="font-mono tabular-nums text-emerald-400">
                    {customization.wallpaperBlur}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="16"
                  value={customization.wallpaperBlur}
                  onChange={(e) =>
                    onUpdateCustomization({ wallpaperBlur: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Linux & Curated Wallpapers</span>
                <label className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Custom Wallpaper</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadWallpaper}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {WALLPAPER_CATALOG.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      triggerHaptic(15);
                      onSelectWallpaper(w.url);
                    }}
                    className={`relative h-28 rounded-xl overflow-hidden border-2 cursor-pointer transition-all text-left ${
                      currentWallpaper === w.url
                        ? 'border-cyan-400'
                        : 'border-white/10 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={w.url}
                      alt={w.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 to-transparent">
                      <span className="text-[11px] font-semibold text-white block truncate">
                        {w.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Security & Ghost Device */}
        {activeSection === 'security' && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <HardDrive className="w-4 h-4" />
                <span>Zero-Cloud On-Device Data Policy</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Every file, secret key, schedule, message, note, and appearance preference stays strictly on your own device partition.
              </p>
            </div>

            <button
              onClick={onOpenShield}
              className="w-full p-3.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 flex items-center justify-between cursor-pointer text-left"
            >
              <div>
                <span className="text-xs font-bold text-white block">Open Shield & Ad-Blocker</span>
                <span className="text-[11px] text-orange-200">
                  Manage tracker blocking, Tor relay, and fingerprint masking
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-300 shrink-0" />
            </button>

            <button
              onClick={onOpenGhostSpace}
              className="w-full p-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-between cursor-pointer text-left"
            >
              <div>
                <span className="text-xs font-bold text-white block">
                  {deviceSpace === 'ghost' ? 'Manage Active Ghost Device' : 'Open Isolated Ghost Device'}
                </span>
                <span className="text-[11px] text-emerald-200">
                  Completely separate hidden second device space (PIN 9999)
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-300 shrink-0" />
            </button>

            <button
              onClick={() => {
                triggerHaptic(15);
                onSwitchSpace(deviceSpace === 'ghost' ? 'primary' : 'ghost');
              }}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
            >
              Switch Immediately to {deviceSpace === 'ghost' ? 'Primary Device' : 'Ghost Device'}
            </button>
          </div>
        )}

        {/* About */}
        {activeSection === 'about' && (
          <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2.5 text-xs font-mono">
            {[
              ['Active Space', deviceSpace === 'ghost' ? 'Ghost Device' : 'Primary Device'],
              ['Anonymous Mask', privacy.spoofedDeviceId],
              ['OS Build', 'Argon OS Sovereign Workstation'],
              ['Host Platform', hardware.hostPlatform],
              ['Logical Cores', `${hardware.cpuCores} Threads`],
              ['Host Memory', `${hardware.memoryTotalGb} GB`],
              ['Storage Policy', '100% On-Device Local Partition'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-400">{k}</span>
                <span className="text-slate-100">{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Sound */}
        {activeSection === 'sound' && (
          <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="font-semibold">Master Volume</span>
              <span className="font-mono tabular-nums text-cyan-400">
                {hardware.isMuted ? 'Muted' : `${hardware.volumeLevel}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={hardware.isMuted ? 0 : hardware.volumeLevel}
              onChange={(e) =>
                onUpdateHardware({ volumeLevel: parseInt(e.target.value, 10), isMuted: false })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        )}

        {/* Navigation */}
        {activeSection === 'navigation' && (
          <div className="space-y-2.5">
            {(
              [
                {
                  id: 'buttons',
                  title: 'Workstation Navigation Bar',
                  desc: 'Labeled Back, Home, Tasks, and Launcher controls.',
                },
                {
                  id: 'gestures',
                  title: 'Minimal Gesture Pill',
                  desc: 'Clean single pill at bottom for minimal vertical footprint.',
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  triggerHaptic(15);
                  onChangeNavigationMode(opt.id);
                }}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between cursor-pointer text-left ${
                  navigationMode === opt.id
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-white'
                    : 'bg-slate-900 border-white/10 text-slate-300'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">{opt.title}</span>
                  <span className="text-[11px] text-slate-400">{opt.desc}</span>
                </div>
                {navigationMode === opt.id && <Check className="w-4 h-4 text-cyan-400" />}
              </button>
            ))}
          </div>
        )}

        {/* Shortcuts Reference */}
        {activeSection === 'shortcuts' && (
          <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2 text-xs">
            {[
              ['Ctrl+K / Cmd+K', 'Open Instant Command, App & Math Launcher'],
              ['Alt+1 .. Alt+4', 'Switch Virtual Workspaces 1 through 4'],
              ['Double-Click Window Bar', 'Maximize or Restore Floating Window'],
              ['Escape', 'Close Launcher, Control Center, or Overlays'],
              ['Calculator Keys', 'Full keyboard 0-9, + - * / ^ ( ), Enter, Backspace'],
            ].map(([shortcut, desc]) => (
              <div
                key={shortcut}
                className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0"
              >
                <span className="text-slate-300">{desc}</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-white/15 font-mono text-[11px] text-cyan-300 shrink-0">
                  {shortcut}
                </kbd>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
