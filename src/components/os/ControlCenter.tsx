import React from 'react';
import {
  Wifi,
  Radio,
  Bluetooth,
  Plane,
  Flashlight,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  RotateCw,
  ShieldCheck,
  Leaf,
  Eye,
  Play,
  Pause,
  SkipForward,
  X,
  Bot,
  EyeOff,
  WifiOff,
  ArrowRightLeft,
  GraduationCap,
} from 'lucide-react';
import {
  DeviceSpace,
  EcoProfile,
  HardwareState,
  AppId,
  PrivacyProfile,
  WellbeingState,
} from '../../types/os';
import { triggerHaptic } from '../../utils/hardware';

interface ControlCenterProps {
  isOpen: boolean;
  onClose: () => void;
  hardware: HardwareState;
  onUpdateHardware: (partial: Partial<HardwareState>) => void;
  deviceSpace: DeviceSpace;
  privacy: PrivacyProfile;
  wellbeing: WellbeingState;
  eco: EcoProfile;
  onUpdatePrivacy: (partial: Partial<PrivacyProfile>) => void;
  onUpdateWellbeing: (partial: Partial<WellbeingState>) => void;
  onUpdateEco: (partial: Partial<EcoProfile>) => void;
  onSwitchSpace: (target: DeviceSpace) => void;
  onLaunchApp: (app: AppId) => void;
  isPlayingMusic: boolean;
  onToggleMusic: () => void;
  currentTrackTitle?: string;
}

export const ControlCenter: React.FC<ControlCenterProps> = ({
  isOpen,
  onClose,
  hardware,
  onUpdateHardware,
  deviceSpace,
  privacy,
  wellbeing,
  eco,
  onUpdatePrivacy,
  onUpdateWellbeing,
  onUpdateEco,
  onSwitchSpace,
  onLaunchApp,
  isPlayingMusic,
  onToggleMusic,
  currentTrackTitle = 'Horizon Frequency - 432Hz Ambient',
}) => {
  if (!isOpen) return null;

  const toggleToggle = (key: keyof HardwareState) => {
    triggerHaptic(15);
    onUpdateHardware({ [key]: !hardware[key] });
  };

  return (
    <div
      className="absolute inset-0 z-50 bg-black/65 backdrop-blur-2xl p-4 sm:p-6 flex flex-col justify-start select-none overflow-y-auto"
      onClick={onClose}
    >
      <div className="w-full max-w-sm mx-auto space-y-3.5 pt-6" onClick={(e) => e.stopPropagation()}>
        {/* Header Close Bar */}
        <div className="flex items-center justify-between text-white pb-2 border-b border-white/10">
          <span className="text-xs font-mono font-semibold tracking-wider text-cyan-300">
            Argon OS · {deviceSpace === 'ghost' ? 'Ghost Device' : 'Primary Device'}
          </span>
          <button
            onClick={onClose}
            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Privacy, Anonymity & Isolated Space Controls */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => {
              triggerHaptic(20);
              onClose();
              onSwitchSpace(deviceSpace === 'ghost' ? 'primary' : 'ghost');
            }}
            className={`min-h-[56px] p-3 rounded-2xl border flex items-center gap-2.5 text-left cursor-pointer transition-all ${
              deviceSpace === 'ghost'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                : 'bg-slate-900/85 border-white/10 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">
                {deviceSpace === 'ghost' ? 'Exit Ghost' : 'Ghost Device'}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {deviceSpace === 'ghost' ? 'Return to Primary' : 'Open Secret Device'}
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              triggerHaptic(15);
              onUpdatePrivacy({ shieldEnabled: !privacy.shieldEnabled });
            }}
            className={`min-h-[56px] p-3 rounded-2xl border flex items-center gap-2.5 text-left cursor-pointer transition-all ${
              privacy.shieldEnabled
                ? 'bg-orange-500/20 border-orange-500/50 text-white'
                : 'bg-slate-900/85 border-white/10 text-slate-400'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Shield Firewall</span>
              <span className="text-[10px] text-slate-300 block truncate">
                {privacy.shieldEnabled ? 'All Apps Protected' : 'Paused'}
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              triggerHaptic(15);
              onUpdatePrivacy({ anonymousMode: !privacy.anonymousMode });
            }}
            className={`min-h-[52px] p-3 rounded-2xl border flex items-center gap-2.5 text-left cursor-pointer transition-all ${
              privacy.anonymousMode
                ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                : 'bg-slate-900/85 border-white/10 text-slate-400'
            }`}
          >
            <EyeOff className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Anonymous ID</span>
              <span className="text-[10px] text-slate-300 block truncate">
                {privacy.anonymousMode ? 'Hardware Masked' : 'Off'}
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              triggerHaptic(15);
              onUpdatePrivacy({ localOnlyAirGap: !privacy.localOnlyAirGap });
            }}
            className={`min-h-[52px] p-3 rounded-2xl border flex items-center gap-2.5 text-left cursor-pointer transition-all ${
              privacy.localOnlyAirGap
                ? 'bg-cyan-500/20 border-cyan-500/40 text-white'
                : 'bg-slate-900/85 border-white/10 text-slate-300'
            }`}
          >
            <WifiOff className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Air-Gap Local</span>
              <span className="text-[10px] text-slate-300 block truncate">
                {privacy.localOnlyAirGap ? '0 Cloud Requests' : 'On-Device Storage'}
              </span>
            </div>
          </button>
        </div>

        {/* Network Cluster & Media Tile */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-3xl bg-slate-900/80 border border-white/10 grid grid-cols-2 gap-2">
            <button
              onClick={() => toggleToggle('isOnline')}
              className={`min-h-[48px] p-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                hardware.isOnline ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-white/10 text-white/70'
              }`}
            >
              <Wifi className="w-4 h-4" />
              <span className="text-[10px] mt-1">Wi-Fi</span>
            </button>

            <button
              onClick={() => toggleToggle('bluetoothOn')}
              className={`min-h-[48px] p-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                hardware.bluetoothOn ? 'bg-blue-500 text-white font-bold' : 'bg-white/10 text-white/70'
              }`}
            >
              <Bluetooth className="w-4 h-4" />
              <span className="text-[10px] mt-1">Bluetooth</span>
            </button>

            <button
              onClick={() => toggleToggle('airplaneMode')}
              className={`min-h-[48px] p-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                hardware.airplaneMode ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-white/10 text-white/70'
              }`}
            >
              <Plane className="w-4 h-4" />
              <span className="text-[10px] mt-1">Flight</span>
            </button>

            <button
              onClick={() => toggleToggle('locationOn')}
              className={`min-h-[48px] p-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                hardware.locationOn ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-white/10 text-white/70'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span className="text-[10px] mt-1">GPS</span>
            </button>
          </div>

          <div className="p-3.5 rounded-3xl bg-slate-900/80 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 block">Local Audio</span>
              <p className="text-xs font-bold text-white truncate mt-1">{currentTrackTitle}</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={onToggleMusic}
                className="w-10 h-10 rounded-full bg-white text-slate-950 flex items-center justify-center cursor-pointer shadow-lg"
              >
                {isPlayingMusic ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button
                onClick={onToggleMusic}
                className="w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Display Luminance & Master Volume */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="font-mono tabular-nums">{hardware.screenBrightness}%</span>
            </div>
            <input
              type="range"
              min="15"
              max="100"
              value={hardware.screenBrightness}
              onChange={(e) => onUpdateHardware({ screenBrightness: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <button
                onClick={() => onUpdateHardware({ isMuted: !hardware.isMuted })}
                className="cursor-pointer"
              >
                {hardware.isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                )}
              </button>
              <span className="font-mono tabular-nums">
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
        </div>

        {/* Quick Toggles */}
        <div className="grid grid-cols-5 gap-2">
          <button
            onClick={() => toggleToggle('flashlightOn')}
            className={`min-h-[52px] p-2 rounded-2xl flex flex-col items-center justify-center cursor-pointer ${
              hardware.flashlightOn ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-900/80 border border-white/10 text-white/80'
            }`}
          >
            <Flashlight className="w-4 h-4" />
            <span className="text-[10px] mt-1">Torch</span>
          </button>

          <button
            onClick={() => toggleToggle('nightLightOn')}
            className={`min-h-[52px] p-2 rounded-2xl flex flex-col items-center justify-center cursor-pointer ${
              hardware.nightLightOn ? 'bg-indigo-500 text-white font-bold' : 'bg-slate-900/80 border border-white/10 text-white/80'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span className="text-[10px] mt-1">Night</span>
          </button>

          <button
            onClick={() => toggleToggle('doNotDisturb')}
            className={`min-h-[52px] p-2 rounded-2xl flex flex-col items-center justify-center cursor-pointer ${
              hardware.doNotDisturb ? 'bg-rose-500 text-white font-bold' : 'bg-slate-900/80 border border-white/10 text-white/80'
            }`}
          >
            <RotateCw className="w-4 h-4" />
            <span className="text-[10px] mt-1">DND</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(15);
              onUpdateWellbeing({ calmGrayscale: !wellbeing.calmGrayscale });
            }}
            className={`min-h-[52px] p-2 rounded-2xl flex flex-col items-center justify-center cursor-pointer ${
              wellbeing.calmGrayscale ? 'bg-slate-200 text-slate-950 font-bold' : 'bg-slate-900/80 border border-white/10 text-white/80'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="text-[10px] mt-1">Calm</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(15);
              const nextEco = !eco.ecoMode;
              onUpdateEco({ ecoMode: nextEco, reducedMotion: nextEco });
            }}
            className={`min-h-[52px] p-2 rounded-2xl flex flex-col items-center justify-center cursor-pointer ${
              eco.ecoMode ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-900/80 border border-white/10 text-white/80'
            }`}
          >
            <Leaf className="w-4 h-4" />
            <span className="text-[10px] mt-1">Eco</span>
          </button>
        </div>

        {/* Quick App Shortcuts */}
        <div className="grid grid-cols-4 gap-2 pt-1 border-t border-white/10">
          {[
            { id: 'agents' as AppId, label: 'Agents', icon: Bot, color: 'text-cyan-400' },
            { id: 'learn' as AppId, label: 'Learn', icon: GraduationCap, color: 'text-sky-400' },
            { id: 'shield' as AppId, label: 'Shield', icon: ShieldCheck, color: 'text-orange-400' },
            { id: 'ghost' as AppId, label: 'Ghost', icon: EyeOff, color: 'text-emerald-300' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => {
                  onClose();
                  onLaunchApp(s.id);
                }}
                className="min-h-[48px] p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex flex-col items-center justify-center cursor-pointer"
              >
                <Icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-[10px] mt-1">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
