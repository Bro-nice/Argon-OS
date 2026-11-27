import React, { useState } from 'react';
import {
  HeartHandshake,
  Play,
  Pause,
  RotateCcw,
  Eye,
  BellOff,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { HardwareState, WellbeingState } from '../../types/os';
import { triggerHaptic } from '../../utils/hardware';

interface WellbeingAppProps {
  wellbeing: WellbeingState;
  hardware: HardwareState;
  onUpdateWellbeing: (partial: Partial<WellbeingState>) => void;
  onUpdateHardware: (partial: Partial<HardwareState>) => void;
}

export const WellbeingApp: React.FC<WellbeingAppProps> = ({
  wellbeing,
  hardware,
  onUpdateWellbeing,
  onUpdateHardware,
}) => {
  const [intentionDraft, setIntentionDraft] = useState(wellbeing.currentIntention);
  const [savedToast, setSavedToast] = useState(false);

  const mins = Math.floor(wellbeing.focusSecondsLeft / 60);
  const secs = wellbeing.focusSecondsLeft % 60;
  const formattedTimer = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const progressPct =
    wellbeing.focusDurationMin > 0
      ? Math.round(
          ((wellbeing.focusDurationMin * 60 - wellbeing.focusSecondsLeft) /
            (wellbeing.focusDurationMin * 60)) *
            100
        )
      : 0;

  const setDuration = (minutes: number) => {
    triggerHaptic(10);
    onUpdateWellbeing({
      focusDurationMin: minutes,
      focusSecondsLeft: minutes * 60,
      focusActive: false,
    });
  };

  const toggleFocus = () => {
    triggerHaptic(15);
    const nextActive = !wellbeing.focusActive;
    onUpdateWellbeing({ focusActive: nextActive });
    if (nextActive && !hardware.doNotDisturb) {
      onUpdateHardware({ doNotDisturb: true });
    }
  };

  const saveIntention = () => {
    triggerHaptic(10);
    onUpdateWellbeing({ currentIntention: intentionDraft.trim() || 'Stay present.' });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const updateBudget = (appKey: string, nextMin: number) => {
    onUpdateWellbeing({
      appBudgetsMin: {
        ...wellbeing.appBudgetsMin,
        [appKey]: Math.max(5, Math.min(180, nextMin)),
      },
    });
  };

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col p-4 select-none overflow-y-auto space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-emerald-400" />
          <h1 className="text-sm font-bold text-white">Human Wellbeing</h1>
        </div>
        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
          {wellbeing.dailyFocusMinutes}m focused today · {wellbeing.focusSessionsCompleted} sessions
        </span>
      </div>

      {/* Deep Work Timer */}
      <div className="p-4 rounded-2xl bg-slate-900/85 border border-white/10 space-y-3.5 text-center">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Deep Work Session
          </span>
          <span className="text-[11px] font-mono text-slate-400 tabular-nums">
            {progressPct}% complete
          </span>
        </div>

        <div className="py-1">
          <div className="text-5xl font-black tracking-tight font-mono tabular-nums text-white">
            {formattedTimer}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">{wellbeing.focusIntent}</p>
        </div>

        {/* Duration Presets */}
        <div className="flex items-center justify-center gap-2">
          {[15, 25, 45, 60].map((m) => (
            <button
              key={m}
              onClick={() => setDuration(m)}
              className={`min-h-[34px] px-3 rounded-xl text-xs font-mono cursor-pointer border transition-colors ${
                wellbeing.focusDurationMin === m
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                  : 'bg-slate-950 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-2.5 pt-1">
          <button
            onClick={toggleFocus}
            className={`min-h-[44px] flex-1 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
              wellbeing.focusActive
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
            }`}
          >
            {wellbeing.focusActive ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause Focus</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Begin Focus</span>
              </>
            )}
          </button>

          <button
            onClick={() => setDuration(wellbeing.focusDurationMin)}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-white cursor-pointer"
            title="Reset Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Attention Protection Toggles (Real Hardware & Display Effects) */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => {
            triggerHaptic(15);
            onUpdateWellbeing({ calmGrayscale: !wellbeing.calmGrayscale });
          }}
          className={`min-h-[64px] p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
            wellbeing.calmGrayscale
              ? 'bg-slate-800 border-white/40 text-white'
              : 'bg-slate-900/75 border-white/10 text-slate-300 hover:border-white/25'
          }`}
        >
          <div className="flex items-center justify-between">
            <Eye className="w-4 h-4 text-slate-200" />
            <span className="text-[10px] font-mono">
              {wellbeing.calmGrayscale ? 'ON' : 'OFF'}
            </span>
          </div>
          <span className="text-xs font-bold text-white block mt-1.5">Calm Grayscale</span>
          <span className="text-[10px] text-slate-400 block">Reduces visual overstimulation</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic(15);
            onUpdateHardware({ doNotDisturb: !hardware.doNotDisturb });
          }}
          className={`min-h-[64px] p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
            hardware.doNotDisturb
              ? 'bg-rose-500/20 border-rose-500/40 text-white'
              : 'bg-slate-900/75 border-white/10 text-slate-300 hover:border-white/25'
          }`}
        >
          <div className="flex items-center justify-between">
            <BellOff className="w-4 h-4 text-rose-300" />
            <span className="text-[10px] font-mono">
              {hardware.doNotDisturb ? 'ON' : 'OFF'}
            </span>
          </div>
          <span className="text-xs font-bold text-white block mt-1.5">Attention Shield</span>
          <span className="text-[10px] text-slate-400 block">Silences non-urgent alerts</span>
        </button>
      </div>

      {/* Intentionality Prompt (Zero Manipulation / Zero Streaks) */}
      <div className="p-3.5 rounded-2xl bg-slate-900/75 border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white">Today&apos;s Primary Intention</span>
          {savedToast && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Saved locally
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={intentionDraft}
            onChange={(e) => setIntentionDraft(e.target.value)}
            placeholder="What matters most right now?"
            className="flex-1 min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-400"
          />
          <button
            onClick={saveIntention}
            className="min-h-[40px] px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
          >
            Set
          </button>
        </div>
      </div>

      {/* Mindful Attention Budgets */}
      <div className="p-3.5 rounded-2xl bg-slate-900/75 border border-white/10 space-y-2.5">
        <span className="text-xs font-semibold text-white block">
          Self-Directed Daily App Boundaries
        </span>
        {[
          { key: 'browser', label: 'Quantum Web Browser' },
          { key: 'messages', label: 'Messages' },
          { key: 'game', label: 'Runner Game' },
        ].map((item) => {
          const val = wellbeing.appBudgetsMin[item.key] ?? 30;
          return (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">{item.label}</span>
                <span className="font-mono text-cyan-300 tabular-nums">{val} min/day</span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={val}
                onChange={(e) => updateBudget(item.key, parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
