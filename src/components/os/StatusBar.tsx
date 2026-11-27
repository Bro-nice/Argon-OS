import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  ShieldCheck,
  SlidersHorizontal,
  Bell,
  EyeOff,
  Search,
  Monitor,
  Smartphone,
  LayoutGrid,
} from 'lucide-react';
import {
  DeviceSpace,
  HardwareState,
  PrivacyProfile,
  ViewportMode,
  WindowMode,
} from '../../types/os';
import { triggerHaptic } from '../../utils/hardware';

interface StatusBarProps {
  hardware: HardwareState;
  deviceSpace: DeviceSpace;
  privacy: PrivacyProfile;
  viewportMode: ViewportMode;
  windowMode: WindowMode;
  activeWorkspace: number;
  onSelectWorkspace: (ws: number) => void;
  onToggleWindowMode: () => void;
  onChangeViewportMode: (mode: ViewportMode) => void;
  onOpenControlCenter: () => void;
  onOpenNotifications: () => void;
  onOpenLauncher: () => void;
  notificationCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  hardware,
  deviceSpace,
  privacy,
  viewportMode,
  windowMode,
  activeWorkspace,
  onSelectWorkspace,
  onToggleWindowMode,
  onChangeViewportMode,
  onOpenControlCenter,
  onOpenNotifications,
  onOpenLauncher,
  notificationCount,
}) => {
  const [time, setTime] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="relative w-full z-40 px-4 py-1.5 bg-slate-950/80 border-b border-white/10 backdrop-blur-md flex items-center justify-between text-xs font-medium text-slate-300 select-none">
      {/* Left: Clock, Virtual Workspaces, Launcher */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => {
            triggerHaptic(10);
            onOpenNotifications();
          }}
          className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
          title="Notification Center"
        >
          <span className="font-bold text-white tracking-tight tabular-nums text-xs sm:text-sm">
            {time}
          </span>
          {deviceSpace === 'ghost' && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-400">
              <EyeOff className="w-3 h-3" />
              Ghost
            </span>
          )}
          {notificationCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-mono text-cyan-300 tabular-nums">
              <Bell className="w-3 h-3" />
              {notificationCount}
            </span>
          )}
        </button>

        {/* Linux-Style Virtual Workspaces 1-4 */}
        {viewportMode === 'native_full' && (
          <div
            className="hidden md:flex items-center gap-0.5 p-0.5 rounded-md bg-white/5 border border-white/10"
            title="Virtual Workspaces (Alt+1..4)"
          >
            {[1, 2, 3, 4].map((ws) => (
              <button
                key={ws}
                onClick={() => {
                  triggerHaptic(8);
                  onSelectWorkspace(ws);
                }}
                className={`w-5 h-5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                  activeWorkspace === ws
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {ws}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            triggerHaptic(10);
            onOpenLauncher();
          }}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 hover:text-white cursor-pointer transition-colors"
          title="Open Quick Launcher (Ctrl+K)"
        >
          <Search className="w-3 h-3 text-cyan-400" />
          <span>Search / Cmd</span>
          <span className="font-mono text-[9px] text-slate-400 px-1 rounded bg-black/40">⌘K</span>
        </button>
      </div>

      {/* Center spacer for Omni-Island */}
      <div className="w-14 sm:w-20" />

      {/* Right: Window Mode, Pocket/Desktop, Shield, Network, Battery & Control Center */}
      <div className="flex items-center gap-2">
        {viewportMode === 'native_full' && (
          <button
            onClick={() => {
              triggerHaptic(10);
              onToggleWindowMode();
            }}
            className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-slate-300 hover:text-white cursor-pointer"
            title="Toggle Floating Windows vs Maximized Tiling"
          >
            <LayoutGrid className="w-3 h-3 text-emerald-400" />
            <span>{windowMode === 'floating' ? 'Floating WM' : 'Tiled WM'}</span>
          </button>
        )}

        <button
          onClick={() => {
            triggerHaptic(10);
            onChangeViewportMode(
              viewportMode === 'native_full' ? 'chassis_pocket' : 'native_full'
            );
          }}
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-slate-300 hover:text-white cursor-pointer"
          title={
            viewportMode === 'native_full'
              ? 'Switch to Pocket Phone Frame'
              : 'Switch to Full Workstation'
          }
        >
          {viewportMode === 'native_full' ? (
            <Smartphone className="w-3 h-3 text-cyan-400" />
          ) : (
            <Monitor className="w-3 h-3 text-cyan-400" />
          )}
          <span>{viewportMode === 'native_full' ? 'Pocket' : 'Desktop'}</span>
        </button>

        {privacy.shieldEnabled && (
          <ShieldCheck className="w-3.5 h-3.5 text-orange-400" aria-label="Shield Active" />
        )}

        {privacy.localOnlyAirGap ? (
          <WifiOff className="w-3.5 h-3.5 text-emerald-400" aria-label="Local Air-Gap" />
        ) : (
          <Wifi className="w-3.5 h-3.5 text-cyan-400" aria-label="Network Connected" />
        )}

        <div className="flex items-center gap-1 text-slate-200">
          <span className="text-[10px] tabular-nums font-mono">{hardware.batteryLevel}%</span>
          <div className="w-4 h-2 border border-slate-400 rounded-sm p-[1px] flex items-center">
            <div
              style={{ width: `${hardware.batteryLevel}%` }}
              className={`h-full rounded-[1px] ${
                hardware.batteryLevel > 20 ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic(15);
            onOpenControlCenter();
          }}
          className="p-1.5 rounded-md bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Open Control Center"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
        </button>
      </div>
    </header>
  );
};
