import React, { useState } from 'react';
import { Phone, Play, Pause, Music, X, ShieldCheck, EyeOff } from 'lucide-react';
import { DeviceSpace } from '../../types/os';
import { triggerHaptic } from '../../utils/hardware';

interface OmniIslandProps {
  activeCallDuration?: string | null;
  isPlayingMusic: boolean;
  onToggleMusic: () => void;
  currentTrackTitle?: string;
  isCameraActive: boolean;
  isMicActive: boolean;
  deviceSpace: DeviceSpace;
  shieldBlockedTotal: number;
  onOpenApp: (app: any) => void;
}

export const OmniIsland: React.FC<OmniIslandProps> = ({
  activeCallDuration,
  isPlayingMusic,
  onToggleMusic,
  currentTrackTitle = 'Horizon Frequency',
  isCameraActive,
  isMicActive,
  deviceSpace,
  shieldBlockedTotal,
  onOpenApp,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    triggerHaptic(15);
    setIsExpanded(!isExpanded);
  };

  const hasActivity =
    activeCallDuration || isPlayingMusic || isCameraActive || isMicActive || deviceSpace === 'ghost';

  return (
    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-40 select-none">
      {!isExpanded ? (
        <button
          onClick={toggleExpand}
          className={`h-7 px-3 rounded-full bg-black/90 hover:bg-black border backdrop-blur-xl flex items-center gap-2 cursor-pointer transition-all duration-200 shadow-2xl ${
            deviceSpace === 'ghost' ? 'border-emerald-500/40' : 'border-white/15'
          } ${hasActivity ? 'min-w-[116px]' : 'min-w-[78px]'}`}
          title="Tap for Privacy & Active Status"
        >
          {isCameraActive && <span className="w-2 h-2 rounded-full bg-emerald-400" title="Camera Active" />}
          {isMicActive && <span className="w-2 h-2 rounded-full bg-amber-400" title="Microphone Active" />}

          {activeCallDuration && (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Phone className="w-3 h-3" />
              <span className="text-[10px] font-mono tabular-nums text-white">{activeCallDuration}</span>
            </div>
          )}

          {isPlayingMusic && !activeCallDuration && (
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Music className="w-3 h-3" />
              <span className="text-[10px] text-white truncate max-w-[80px]">{currentTrackTitle}</span>
            </div>
          )}

          {deviceSpace === 'ghost' && !activeCallDuration && !isPlayingMusic && (
            <div className="flex items-center gap-1.5 mx-auto text-emerald-400">
              <EyeOff className="w-3 h-3" />
              <span className="text-[10px] font-mono font-semibold text-white">GHOST</span>
            </div>
          )}

          {!hasActivity && (
            <div className="flex items-center gap-2 mx-auto">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
            </div>
          )}
        </button>
      ) : (
        <div
          className="w-72 p-4 rounded-3xl bg-black/95 border border-white/20 backdrop-blur-2xl shadow-2xl space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-2">
            <span className="font-mono text-cyan-400 text-[10px] uppercase tracking-wider">
              {deviceSpace === 'ghost' ? 'Ghost Device Active' : 'System Status'}
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={() => {
              setIsExpanded(false);
              onOpenApp('shield');
            }}
            className="w-full p-3 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-between text-left cursor-pointer hover:bg-slate-800"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <div>
                <span className="text-xs font-bold text-white block">Argon Shield</span>
                <span className="text-[10px] text-slate-400 tabular-nums">
                  {shieldBlockedTotal} ads & trackers blocked
                </span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-orange-400">Open</span>
          </button>

          {activeCallDuration && (
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Active Call</span>
                  <span className="text-[10px] text-emerald-300 font-mono tabular-nums">
                    {activeCallDuration}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsExpanded(false);
                  onOpenApp('phone');
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                View
              </button>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Music className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white truncate block">{currentTrackTitle}</span>
                <span className="text-[10px] text-slate-400">Local Audio Engine</span>
              </div>
            </div>

            <button
              onClick={onToggleMusic}
              className="w-8 h-8 rounded-full bg-white text-slate-950 flex items-center justify-center shrink-0 cursor-pointer"
            >
              {isPlayingMusic ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
