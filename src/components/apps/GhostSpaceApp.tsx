import React, { useState, useEffect } from 'react';
import {
  EyeOff,
  Lock,
  Smartphone,
  ShieldCheck,
  Flame,
  ArrowRightLeft,
  HardDrive,
  RefreshCw,
  Check,
  KeyRound,
} from 'lucide-react';
import { DeviceSpace, PrivacyProfile } from '../../types/os';
import { getSpaceStorageStats } from '../../utils/localVault';
import { triggerHaptic } from '../../utils/hardware';

interface GhostSpaceAppProps {
  deviceSpace: DeviceSpace;
  privacy: PrivacyProfile;
  onSwitchSpace: (target: DeviceSpace) => void;
  onBurnGhostDevice: () => void;
  onRotateIdentity: () => void;
  onOpenShield: () => void;
}

export const GhostSpaceApp: React.FC<GhostSpaceAppProps> = ({
  deviceSpace,
  privacy,
  onSwitchSpace,
  onBurnGhostDevice,
  onRotateIdentity,
  onOpenShield,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [ghostStats, setGhostStats] = useState({ keysCount: 0, bytesUsed: 0 });
  const [burnConfirmed, setBurnConfirmed] = useState(false);

  useEffect(() => {
    getSpaceStorageStats('ghost').then((s) =>
      setGhostStats({ keysCount: s.keysCount, bytesUsed: s.bytesUsed })
    );
  }, [deviceSpace]);

  const isGhost = deviceSpace === 'ghost';

  const handleRequestEnterGhost = () => {
    triggerHaptic(15);
    setPinPromptOpen(true);
    setPinInput('');
    setPinError(false);
  };

  const handleVerifyPin = (digit: string) => {
    triggerHaptic(10);
    if (pinInput.length >= 4) return;
    const next = pinInput + digit;
    setPinInput(next);
    if (next.length === 4) {
      if (next === '9999') {
        setTimeout(() => {
          setPinPromptOpen(false);
          setPinInput('');
          onSwitchSpace('ghost');
        }, 160);
      } else {
        setPinError(true);
        setTimeout(() => {
          setPinInput('');
          setPinError(false);
        }, 450);
      }
    }
  };

  const handleBurn = () => {
    triggerHaptic([35, 45, 35]);
    onBurnGhostDevice();
    setBurnConfirmed(true);
    setTimeout(() => setBurnConfirmed(false), 2500);
    getSpaceStorageStats('ghost').then((s) =>
      setGhostStats({ keysCount: s.keysCount, bytesUsed: s.bytesUsed })
    );
  };

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col select-none overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isGhost
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800 border border-white/10 text-slate-200'
            }`}
          >
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">
              {isGhost ? 'Ghost Device Active' : 'Isolated Ghost Device'}
            </h1>
            <p className="text-[11px] text-slate-400">
              Hardware-Isolated Second Device · Local Partition
            </p>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">Active Environment</span>
          <span
            className={`text-xs font-mono font-bold ${
              isGhost ? 'text-emerald-400' : 'text-cyan-400'
            }`}
          >
            {isGhost ? 'Shadow Space (Isolated)' : 'Primary Device'}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {isGhost
            ? 'You are operating inside a completely separate virtualized device. All files, notes, messages, browser tabs, and hardware identifiers are isolated from your primary phone and stored strictly on this device.'
            : 'Open a completely separate, encrypted second phone inside Argon OS—similar to Samsung Secure Folder, with its own isolated apps, files, randomized hardware fingerprint, and zero-telemetry air-gap.'}
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block">Ghost Partition</span>
            <span className="font-mono font-semibold text-white tabular-nums">
              {ghostStats.keysCount} records · {(ghostStats.bytesUsed / 1024).toFixed(1)} KB
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Lock Screen Secret PIN</span>
            <span className="font-mono font-semibold text-emerald-400 tabular-nums">9999</span>
          </div>
        </div>
      </div>

      {/* Primary Action Switch */}
      {!isGhost ? (
        !pinPromptOpen ? (
          <div className="space-y-2.5">
            <button
              onClick={handleRequestEnterGhost}
              className="w-full min-h-[48px] px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg"
            >
              <Lock className="w-4 h-4" />
              <span>Enter Isolated Ghost Device</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic(15);
                onSwitchSpace('ghost');
              }}
              className="w-full min-h-[44px] px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              <span>Instant Boot Shadow Device</span>
            </button>
          </div>
        ) : (
          /* Secret PIN Pad */
          <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Enter Ghost PIN (9999)</span>
              </div>
              <button
                onClick={() => setPinPromptOpen(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 py-1">
              {[0, 1, 2, 3].map((idx) => (
                <span
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    pinError
                      ? 'bg-rose-500 border-rose-400'
                      : idx < pinInput.length
                      ? 'bg-emerald-400 border-emerald-300'
                      : 'border-slate-600'
                  }`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'Del'].map((k, idx) =>
                k === '' ? (
                  <div key={`pad-empty-${idx}`} />
                ) : (
                  <button
                    key={`pin-key-${k}`}
                    onClick={() => {
                      if (k === 'Del') setPinInput((p) => p.slice(0, -1));
                      else handleVerifyPin(k);
                    }}
                    className="min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm cursor-pointer transition-colors"
                  >
                    {k}
                  </button>
                )
              )}
            </div>
          </div>
        )
      ) : (
        /* Controls while inside Ghost Device */
        <div className="space-y-2.5">
          <button
            onClick={() => {
              triggerHaptic(15);
              onSwitchSpace('primary');
            }}
            className="w-full min-h-[48px] px-4 rounded-2xl bg-white text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            <span>Exit & Lock Back to Primary Device</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                triggerHaptic(15);
                onRotateIdentity();
              }}
              className="min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>New Mask ID</span>
            </button>

            <button
              onClick={onOpenShield}
              className="min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
              <span>Open Shield</span>
            </button>
          </div>

          <button
            onClick={handleBurn}
            className="w-full min-h-[44px] px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {burnConfirmed ? <Check className="w-4 h-4 text-emerald-400" /> : <Flame className="w-4 h-4" />}
            <span>
              {burnConfirmed ? 'Ghost Device Shredded & Regenerated' : 'Burn & Regenerate Ghost Device'}
            </span>
          </button>
        </div>
      )}

      {/* Isolation Guarantees */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2.5">
        <span className="text-xs font-semibold text-slate-300 block">
          Hardware Isolation Guarantees
        </span>
        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex items-start gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>Separate encrypted local storage partition; zero cross-space data leakage.</span>
          </div>
          <div className="flex items-start gap-2">
            <EyeOff className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Spoofed Device ID ({privacy.spoofedDeviceId}) & randomized MAC ({privacy.spoofedMacAddress}).</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <span>Aggressive Brave-grade ad & tracker firewall active on every app.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
