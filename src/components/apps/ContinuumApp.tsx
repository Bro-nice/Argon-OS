import React, { useEffect, useRef, useState } from 'react';
import {
  Share2,
  Smartphone,
  Monitor,
  Watch,
  Car,
  Home,
  Send,
  ShieldAlert,
  Radio,
} from 'lucide-react';
import {
  ContinuumDevice,
  ContinuumHandoff,
  DeviceFormFactor,
  DeviceSpace,
  EcoProfile,
  HardwareState,
  PrivacyProfile,
  ViewportMode,
} from '../../types/os';
import { addKnowledgeNode } from '../../utils/humanOsStore';
import { triggerHaptic } from '../../utils/hardware';

interface ContinuumAppProps {
  deviceSpace: DeviceSpace;
  privacy: PrivacyProfile;
  hardware: HardwareState;
  viewportMode: ViewportMode;
  eco: EcoProfile;
  onChangeViewportMode: (mode: ViewportMode) => void;
  onUpdateEco: (partial: Partial<EcoProfile>) => void;
}

const CHANNEL_NAME = 'human_os_continuum_v1';

export const ContinuumApp: React.FC<ContinuumAppProps> = ({
  deviceSpace,
  privacy,
  hardware,
  viewportMode,
  eco,
  onChangeViewportMode,
  onUpdateEco,
}) => {
  const selfIdRef = useRef(`node-${Math.random().toString(36).slice(2, 8)}`);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [peers, setPeers] = useState<ContinuumDevice[]>([]);
  const [handoffs, setHandoffs] = useState<ContinuumHandoff[]>([]);
  const [handoffInput, setHandoffInput] = useState('');

  const airGapLocked = privacy.localOnlyAirGap || deviceSpace === 'ghost';

  useEffect(() => {
    if (airGapLocked || typeof BroadcastChannel === 'undefined') {
      channelRef.current?.close();
      channelRef.current = null;
      return;
    }

    const ch = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = ch;

    const sendHeartbeat = () => {
      ch.postMessage({
        kind: 'HEARTBEAT',
        device: {
          id: selfIdRef.current,
          name: `${privacy.spoofedNodeName} (${eco.activeFormFactor})`,
          formFactor: eco.activeFormFactor,
          status: 'connected',
          lastSeen: Date.now(),
          battery: hardware.batteryLevel,
          activeApp: 'Continuum',
        },
      });
    };

    ch.onmessage = (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.kind === 'HEARTBEAT' && msg.device?.id !== selfIdRef.current) {
        setPeers((prev) => {
          const filtered = prev.filter((p) => p.id !== msg.device.id && Date.now() - p.lastSeen < 12000);
          return [...filtered, msg.device];
        });
      } else if (msg.kind === 'HANDOFF' && msg.handoff) {
        setHandoffs((prev) => [msg.handoff, ...prev].slice(0, 12));
        addKnowledgeNode(
          deviceSpace,
          `Handoff: ${msg.handoff.title}`,
          msg.handoff.payload,
          ['continuum', 'handoff']
        );
      }
    };

    sendHeartbeat();
    const timer = setInterval(sendHeartbeat, 3000);
    return () => {
      clearInterval(timer);
      ch.close();
      channelRef.current = null;
    };
  }, [airGapLocked, deviceSpace, eco.activeFormFactor, hardware.batteryLevel, privacy.spoofedNodeName]);

  const selectFormFactor = (factor: DeviceFormFactor) => {
    triggerHaptic(15);
    onUpdateEco({ activeFormFactor: factor });
    if (factor === 'workstation' || factor === 'home' || factor === 'vehicle') {
      onChangeViewportMode('native_full');
    } else if (factor === 'phone' && typeof window !== 'undefined' && window.innerWidth > 900) {
      onChangeViewportMode('chassis_pocket');
    }
  };

  const handleBroadcastHandoff = () => {
    if (!handoffInput.trim() || airGapLocked) return;
    triggerHaptic(15);
    const handoff: ContinuumHandoff = {
      id: `ho-${Date.now()}`,
      fromDevice: `${privacy.spoofedNodeName} (${eco.activeFormFactor})`,
      type: 'note',
      title: handoffInput.trim().slice(0, 40),
      payload: handoffInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    channelRef.current?.postMessage({ kind: 'HANDOFF', handoff });
    setHandoffs((prev) => [handoff, ...prev].slice(0, 12));
    setHandoffInput('');
  };

  const formFactors: Array<{
    id: DeviceFormFactor;
    label: string;
    desc: string;
    icon: typeof Smartphone;
  }> = [
    { id: 'phone', label: 'Pocket', desc: 'Handheld portrait chassis', icon: Smartphone },
    { id: 'workstation', label: 'Workstation', desc: 'Full desktop spatial canvas', icon: Monitor },
    { id: 'wearable', label: 'Wearable', desc: 'Glanceable wrist profile', icon: Watch },
    { id: 'vehicle', label: 'Vehicle', desc: 'High-contrast drive view', icon: Car },
    { id: 'home', label: 'Ambient Home', desc: 'Room display environment', icon: Home },
  ];

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col p-4 select-none overflow-y-auto space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-cyan-400" />
          <h1 className="text-sm font-bold text-white">Universal Continuum</h1>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {viewportMode === 'native_full' ? 'Full Display' : 'Pocket Frame'}
        </span>
      </div>

      {/* Form Factor Adaptive Switcher */}
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white">Adaptive Device Surface</span>
          <span className="text-[11px] font-mono text-cyan-300 capitalize">
            {eco.activeFormFactor}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {formFactors.map((f) => {
            const Icon = f.icon;
            const active = eco.activeFormFactor === f.id;
            return (
              <button
                key={f.id}
                onClick={() => selectFormFactor(f.id)}
                className={`min-h-[58px] p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  active
                    ? 'bg-cyan-500/20 border-cyan-400 text-white'
                    : 'bg-slate-950 border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-cyan-300' : 'text-slate-400'}`} />
                <span className="text-xs font-bold block mt-1">{f.label}</span>
                <span className="text-[10px] text-slate-400 block truncate">{f.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Local Peer Discovery & Instant Handoff */}
      {airGapLocked ? (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-300">
            <ShieldAlert className="w-4 h-4" />
            <span>Air-Gap / Ghost Device Isolation Active</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Cross-window continuum broadcast is suspended so your Ghost or Air-Gapped session cannot be observed by other sessions.
          </p>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400" />
              Active Continuum Sessions
            </span>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {peers.length + 1} online
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/30 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">
                  This Device ({eco.activeFormFactor})
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {hardware.hostPlatform} · {hardware.screenWidth}×{hardware.screenHeight}
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 tabular-nums">
                {hardware.batteryLevel}%
              </span>
            </div>

            {peers.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-1">
                Open Argon OS in another browser window on this device to discover and hand off notes live via BroadcastChannel.
              </p>
            ) : (
              peers.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-white block">{p.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">Live local peer</span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-300 tabular-nums">
                    {p.battery}%
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Instant Handoff Input */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <span className="text-[11px] text-slate-300 block">
              Send instant local handoff to paired windows
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={handoffInput}
                onChange={(e) => setHandoffInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBroadcastHandoff()}
                placeholder="Share a note, URL, or task across windows..."
                className="flex-1 min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleBroadcastHandoff}
                disabled={!handoffInput.trim()}
                className="min-h-[38px] px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>

          {handoffs.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {handoffs.slice(0, 4).map((h) => (
                <div
                  key={h.id}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-[11px]"
                >
                  <div className="flex justify-between text-slate-400 font-mono text-[10px]">
                    <span>From {h.fromDevice}</span>
                    <span>{h.timestamp}</span>
                  </div>
                  <p className="text-slate-100 mt-0.5">{h.payload}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
