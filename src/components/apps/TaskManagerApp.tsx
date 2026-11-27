import React, { useState, useEffect } from 'react';
import { Cpu, Activity, Trash2, ArrowUpRight, HardDrive } from 'lucide-react';
import { AppId, AppMetadata, HardwareState } from '../../types/os';

interface TaskManagerAppProps {
  hardware: HardwareState;
  openApps: AppId[];
  appMetadata: Record<AppId, AppMetadata>;
  onFocusApp: (appId: AppId) => void;
  onKillApp: (appId: AppId) => void;
}

const KERNEL_DAEMONS = [
  { pid: 1, name: 'argonos-init (Microkernel)', cpu: '0.4%', mem: '18 MB', status: 'System' },
  { pid: 14, name: 'shield-firewall-l4', cpu: '0.8%', mem: '24 MB', status: 'Active' },
  { pid: 29, name: 'local-vault-cipher', cpu: '0.2%', mem: '12 MB', status: 'Sealed' },
  { pid: 42, name: 'hardware-sensor-bridge', cpu: '0.5%', mem: '16 MB', status: 'Synced' },
];

export const TaskManagerApp: React.FC<TaskManagerAppProps> = ({
  hardware,
  openApps,
  appMetadata,
  onFocusApp,
  onKillApp,
}) => {
  const [fps, setFps] = useState(hardware.refreshRateHz || 60);
  const [coreLoads, setCoreLoads] = useState<number[]>(() =>
    Array.from({ length: Math.min(16, Math.max(2, hardware.cpuCores)) }, (_, i) => 12 + ((i * 7) % 28))
  );

  // Measure live requestAnimationFrame cadence & refresh process metrics
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
        setCoreLoads((prev) =>
          prev.map((v, idx) => {
            const base = 10 + openApps.length * 4 + ((idx * 5) % 15);
            const jitter = Math.round((Math.random() - 0.5) * 14);
            return Math.max(3, Math.min(96, Math.round((v + base + jitter) / 2)));
          })
        );
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [openApps.length]);

  const avgCpu = Math.round(coreLoads.reduce((s, n) => s + n, 0) / Math.max(1, coreLoads.length));

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col p-4 overflow-y-auto select-none space-y-4">
      <div className="max-w-4xl w-full mx-auto space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h1 className="text-sm font-bold text-white">System Monitor & Task Manager</h1>
          </div>
          <span className="text-xs font-mono text-emerald-400 tabular-nums">
            {fps} FPS · {hardware.cpuCores} Logical Cores
          </span>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-900 border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 block">CPU UTILIZATION</span>
            <span className="text-xl font-bold text-cyan-400 font-mono tabular-nums">{avgCpu}%</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 block">JS HEAP / RAM</span>
            <span className="text-xl font-bold text-white font-mono tabular-nums">
              {hardware.jsHeapUsedMb ? `${hardware.jsHeapUsedMb} MB` : `${hardware.memoryTotalGb} GB`}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 block">OPEN APPS</span>
            <span className="text-xl font-bold text-emerald-400 font-mono tabular-nums">
              {openApps.length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 block">STORAGE USED</span>
            <span className="text-xl font-bold text-amber-400 font-mono tabular-nums">
              {hardware.storageUsedMb} MB
            </span>
          </div>
        </div>

        {/* Per-Core CPU Meter Grid */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Logical Thread Distribution
            </span>
            <span className="font-mono text-[11px] text-slate-400">{hardware.hostPlatform}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {coreLoads.map((load, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>CPU{i}</span>
                  <span className="tabular-nums text-white">{load}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
                  <div
                    style={{ width: `${load}%` }}
                    className={`h-full transition-all duration-300 ${
                      load > 75 ? 'bg-rose-500' : load > 45 ? 'bg-amber-400' : 'bg-cyan-400'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Application Processes */}
        <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Running Applications ({openApps.length})</span>
            <span className="text-[11px] font-mono text-slate-400">Interactive Process Control</span>
          </div>

          {openApps.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">
              No user applications running in foreground/background.
            </p>
          ) : (
            <div className="divide-y divide-white/5 text-xs">
              {openApps.map((appId, idx) => {
                const meta = appMetadata[appId];
                return (
                  <div
                    key={appId}
                    className="px-3.5 py-2.5 flex items-center justify-between hover:bg-white/5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] text-slate-500 tabular-nums w-12">
                        #{120 + idx * 7}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-white block truncate">
                          {meta?.name || appId}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {meta?.category} · sandbox isolated
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onFocusApp(appId)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-cyan-300 border border-white/10 flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Focus</span>
                      </button>
                      <button
                        onClick={() => onKillApp(appId)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>End Task</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Core Kernel Services */}
        <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center gap-2 text-xs font-semibold text-slate-300">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>Core System Daemons</span>
          </div>
          <div className="divide-y divide-white/5 text-xs font-mono">
            {KERNEL_DAEMONS.map((d) => (
              <div key={d.pid} className="px-3.5 py-2 flex items-center justify-between text-slate-300">
                <span className="truncate">
                  <span className="text-slate-500 mr-2">PID {d.pid}</span>
                  {d.name}
                </span>
                <span className="text-[11px] text-emerald-400 shrink-0">
                  {d.cpu} · {d.mem}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
