import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ShieldCheck,
  Activity,
  Monitor,
  CheckCircle2,
  EyeOff,
  RefreshCw,
  Compass,
  Camera,
  HardDrive,
  Wifi,
  Sun,
} from 'lucide-react';
import { HardwareState, PrivacyProfile, ViewportMode } from '../../types/os';
import {
  requestSensorPermissions,
  toggleHardwareWakeLock,
  triggerHaptic,
} from '../../utils/hardware';

interface VitalsAppProps {
  hardware: HardwareState;
  privacy: PrivacyProfile;
  onUpdateHardware: (partial: Partial<HardwareState>) => void;
  viewportMode: ViewportMode;
  onChangeViewportMode: (mode: ViewportMode) => void;
}

export const VitalsApp: React.FC<VitalsAppProps> = ({
  hardware,
  privacy,
  onUpdateHardware,
  viewportMode,
  onChangeViewportMode,
}) => {
  const [cpuLoad, setCpuLoad] = useState(14);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuLoad(Math.floor(8 + Math.random() * 14));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncSensors = async () => {
    triggerHaptic([15, 25]);
    const msg = await requestSensorPermissions(onUpdateHardware);
    setSyncMessage(msg);
    setTimeout(() => setSyncMessage(null), 3500);
  };

  const handleToggleWakeLock = async () => {
    triggerHaptic(15);
    const active = await toggleHardwareWakeLock(!hardware.wakeLockActive);
    onUpdateHardware({ wakeLockActive: active });
  };

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col p-4 select-none overflow-y-auto space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white">Live Hardware Sync</span>
        </div>
        <button
          onClick={handleSyncSensors}
          className="min-h-[34px] px-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Sensors</span>
        </button>
      </div>

      {syncMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300">
          {syncMessage}
        </div>
      )}

      {/* Host Physical Hardware Identification */}
      <div className="p-4 rounded-2xl bg-slate-900/85 border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Monitor className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white truncate">{hardware.hostPlatform}</h2>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                {hardware.hostBrowser} · {hardware.hostTimezone}
              </p>
            </div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[11px] font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">Display</span>
            <span className="text-white tabular-nums">
              {hardware.screenWidth}×{hardware.screenHeight}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Refresh Rate</span>
            <span className="text-cyan-400 tabular-nums">{hardware.refreshRateHz} Hz</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Gamut · Touch</span>
            <span className="text-white">
              {hardware.colorGamut === 'Display P3' ? 'P3' : 'sRGB'} · {hardware.touchPoints}pt
            </span>
          </div>
        </div>

        <p
          className="text-[11px] text-slate-300 font-mono truncate pt-2 border-t border-white/5"
          title={hardware.gpuRenderer}
        >
          GPU: {hardware.gpuRenderer}
        </p>

        {/* Quick Display Sync Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() =>
              onChangeViewportMode(
                viewportMode === 'native_full' ? 'chassis_pocket' : 'native_full'
              )
            }
            className="min-h-[38px] px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
          >
            {viewportMode === 'native_full' ? 'Chassis Frame' : 'Fill Physical Screen'}
          </button>

          <button
            onClick={handleToggleWakeLock}
            className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
              hardware.wakeLockActive
                ? 'bg-amber-400 text-slate-950'
                : 'bg-white/10 hover:bg-white/15 text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>{hardware.wakeLockActive ? 'Wake Lock On' : 'Screen Wake Lock'}</span>
          </button>
        </div>
      </div>

      {/* CPU & Memory Live Readout */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-xs font-bold text-white block">
                Host Processor ({hardware.cpuCores} Threads)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {hardware.memoryTotalGb} GB RAM
                {hardware.jsHeapUsedMb !== null ? ` · ${hardware.jsHeapUsedMb} MB Heap` : ''}
              </span>
            </div>
          </div>
          <span className="text-lg font-bold font-mono text-cyan-400 tabular-nums">{cpuLoad}%</span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10">
          {Array.from({ length: Math.min(8, hardware.cpuCores || 8) }).map((_, idx) => (
            <div key={idx} className="p-2 rounded-xl bg-slate-950 text-center space-y-1">
              <span className="text-[9px] text-slate-400 font-mono block">Core #{idx}</span>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, cpuLoad + ((idx * 5) % 25))}%` }}
                  className="h-full bg-cyan-400 rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Sensors, I/O Devices, Network & Storage */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Media Hardware</span>
          </div>
          <span className="font-mono font-bold text-white block tabular-nums">
            {hardware.cameraCount} Cam · {hardware.micCount} Mic · {hardware.speakerCount} Audio
          </span>
          <span className="text-[10px] text-slate-400 font-mono block">Hotplug Active</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
            <span>Host Disk Quota</span>
          </div>
          <span className="font-mono font-bold text-white block tabular-nums">
            {hardware.storageQuotaGb} GB Free Quota
          </span>
          <span className="text-[10px] text-slate-400 font-mono block tabular-nums">
            {hardware.storageUsedMb} MB Local Partition
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <span>Network Interface</span>
          </div>
          <span className="font-mono font-bold text-white block tabular-nums">
            {hardware.isOnline ? `${hardware.networkSpeedMbps} Mbps` : 'Offline'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono block tabular-nums">
            {hardware.networkType} · {hardware.networkRttMs} ms RTT
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            <span>Gyro & Battery</span>
          </div>
          <span className="font-mono font-bold text-white block tabular-nums">
            {hardware.batteryLevel}% {hardware.isCharging ? 'Charging' : 'Battery'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono block tabular-nums">
            Tilt X:{hardware.deviceTiltX}° Y:{hardware.deviceTiltY}°
          </span>
        </div>
      </div>

      {/* Active Outbound Anonymity Mask */}
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-500/25 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
            <EyeOff className="w-4 h-4" />
            Outbound Privacy Mask ({privacy.deviceSpace === 'ghost' ? 'Ghost' : 'Primary'})
          </span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-[11px] font-mono text-slate-300 truncate">
          Apps see: {privacy.anonymousMode ? privacy.spoofedDeviceId : 'Direct Hardware'} ·{' '}
          {privacy.fingerprintSpoofing ? privacy.spoofedGpuAlias : hardware.gpuRenderer}
        </p>
      </div>
    </div>
  );
};
