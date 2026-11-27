import React from 'react';
import { Leaf, BatteryCharging, Cpu, Sun, Zap, CheckCircle2 } from 'lucide-react';
import { EcoProfile, HardwareState, PrivacyProfile } from '../../types/os';
import { triggerHaptic } from '../../utils/hardware';

interface EcoAppProps {
  eco: EcoProfile;
  hardware: HardwareState;
  privacy: PrivacyProfile;
  onUpdateEco: (partial: Partial<EcoProfile>) => void;
  onUpdateHardware: (partial: Partial<HardwareState>) => void;
  onUpdatePrivacy: (partial: Partial<PrivacyProfile>) => void;
}

export const EcoApp: React.FC<EcoAppProps> = ({
  eco,
  hardware,
  privacy,
  onUpdateEco,
  onUpdateHardware,
  onUpdatePrivacy,
}) => {
  const toggleEcoMode = () => {
    triggerHaptic(15);
    const nextEco = !eco.ecoMode;
    onUpdateEco({
      ecoMode: nextEco,
      reducedMotion: nextEco,
      oledDarkSaver: true,
    });
    if (nextEco && hardware.screenBrightness > 65) {
      onUpdateHardware({ screenBrightness: 60 });
    }
  };

  const tips = [
    {
      title: 'Display Panel Power',
      status: hardware.screenBrightness <= 70 ? 'Optimal' : 'High Draw',
      detail: `Brightness at ${hardware.screenBrightness}%. Lowering below 70% reduces panel wattage.`,
      actionLabel: hardware.screenBrightness > 65 ? 'Set 60%' : null,
      onAction: () => onUpdateHardware({ screenBrightness: 60 }),
    },
    {
      title: 'Cloud & Radio Dependency',
      status: privacy.localOnlyAirGap ? 'Zero Cloud' : 'Local-First',
      detail: privacy.localOnlyAirGap
        ? 'Air-Gap active: all AI and storage run locally with zero remote radio wakeups.'
        : 'Enable Air-Gap to process tasks 100% locally without network transmission.',
      actionLabel: !privacy.localOnlyAirGap ? 'Enable Air-Gap' : null,
      onAction: () => onUpdatePrivacy({ localOnlyAirGap: true }),
    },
    {
      title: 'Battery Longevity Care',
      status: hardware.batteryLevel >= 20 && hardware.batteryLevel <= 85 ? 'Healthy Band' : 'Inspect',
      detail: `Host battery at ${hardware.batteryLevel}%. Keeping lithium cells between 20% and 85% extends cycle lifespan.`,
      actionLabel: null,
      onAction: undefined,
    },
  ];

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col p-4 select-none overflow-y-auto space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-400" />
          <h1 className="text-sm font-bold text-white">Sustainable Computing</h1>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 tabular-nums">
          {eco.estimatedWhSaved.toFixed(2)} Wh conserved
        </span>
      </div>

      {/* Eco Governor Card */}
      <div
        className={`p-4 rounded-2xl border space-y-3 transition-colors ${
          eco.ecoMode
            ? 'bg-emerald-950/35 border-emerald-500/40'
            : 'bg-slate-900/85 border-white/10'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white">Eco Power Governor</h2>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Lowers display luminance, enables reduced motion, and prioritizes local efficiency.
            </p>
          </div>
          <button
            onClick={toggleEcoMode}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-bold cursor-pointer shrink-0 ${
              eco.ecoMode
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {eco.ecoMode ? 'Eco Active' : 'Enable Eco'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[11px] font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">Battery</span>
            <span className="text-white tabular-nums flex items-center gap-1">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              {hardware.batteryLevel}%
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Display</span>
            <span className="text-white tabular-nums flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              {hardware.screenBrightness}% · {hardware.refreshRateHz}Hz
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Threads</span>
            <span className="text-white tabular-nums flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              {hardware.cpuCores} Cores
            </span>
          </div>
        </div>
      </div>

      {/* Reduced Motion Toggle */}
      <button
        onClick={() => {
          triggerHaptic(10);
          onUpdateEco({ reducedMotion: !eco.reducedMotion });
        }}
        className="w-full min-h-[52px] p-3.5 rounded-2xl bg-slate-900/75 border border-white/10 flex items-center justify-between cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-amber-400" />
          <div>
            <span className="text-xs font-bold text-white block">Low-Resource Motion Profile</span>
            <span className="text-[11px] text-slate-400">
              Ideal for older or low-cost hardware to keep frames smooth
            </span>
          </div>
        </div>
        <span className="text-[11px] font-mono text-emerald-400">
          {eco.reducedMotion ? 'Active' : 'Standard'}
        </span>
      </button>

      {/* Hardware Longevity Diagnostics */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-300 block">
          Hardware Efficiency & Lifespan
        </span>
        {tips.map((t) => (
          <div
            key={t.title}
            className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 space-y-1.5 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">{t.title}</span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {t.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{t.detail}</p>
            {t.actionLabel && t.onAction && (
              <button
                onClick={t.onAction}
                className="min-h-[32px] px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold cursor-pointer mt-1"
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
