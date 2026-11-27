import React, { useState } from 'react';
import {
  Play,
  Search,
  Star,
  Download,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  ExternalLink,
  Smartphone,
  Gamepad2,
  Lock,
} from 'lucide-react';
import { AppId, DeviceSpace } from '../../types/os';
import { readSpaceData, writeSpaceData } from '../../utils/localVault';
import { triggerHaptic } from '../../utils/hardware';

interface PlayStoreAppProps {
  deviceSpace: DeviceSpace;
  onLaunchApp?: (appId: AppId) => void;
}

interface PlayPackage {
  id: string;
  name: string;
  developer: string;
  category: 'Apps' | 'Games' | 'Privacy' | 'Productivity';
  rating: number;
  downloads: string;
  size: string;
  description: string;
  trackersBlocked: number;
  privacyGrade: 'A+' | 'A' | 'B';
  installed: boolean;
  preinstalled?: boolean;
  launchTarget?: AppId;
  accent: string;
}

const DEFAULT_PLAY_CATALOG: PlayPackage[] = [
  {
    id: 'pkg-brave',
    name: 'Brave Private Browser',
    developer: 'Brave Software, Inc.',
    category: 'Privacy',
    rating: 4.9,
    downloads: '100M+',
    size: '88 MB',
    description: 'Fast, privacy-first browser blocking ads, cross-site trackers, and fingerprinting by default.',
    trackersBlocked: 14,
    privacyGrade: 'A+',
    installed: true,
    preinstalled: true,
    launchTarget: 'brave',
    accent: 'bg-orange-600',
  },
  {
    id: 'pkg-tor',
    name: 'Tor Browser',
    developer: 'The Tor Project',
    category: 'Privacy',
    rating: 4.8,
    downloads: '50M+',
    size: '104 MB',
    description: 'Route traffic across three encrypted volunteer relays with isolated ephemeral circuits.',
    trackersBlocked: 19,
    privacyGrade: 'A+',
    installed: true,
    preinstalled: true,
    launchTarget: 'tor',
    accent: 'bg-purple-700',
  },
  {
    id: 'pkg-dayscore',
    name: 'dayscore.ai.studio',
    developer: 'DayScore Studio',
    category: 'Productivity',
    rating: 4.9,
    downloads: '5M+',
    size: '18 MB',
    description: 'Intelligent daily reflection and self-improvement coach with balanced 0-100 scoring.',
    trackersBlocked: 0,
    privacyGrade: 'A+',
    installed: true,
    preinstalled: true,
    launchTarget: 'dayscore',
    accent: 'bg-indigo-600',
  },
  {
    id: 'pkg-gmail',
    name: 'Gmail',
    developer: 'Google LLC',
    category: 'Productivity',
    rating: 4.5,
    downloads: '10B+',
    size: '46 MB',
    description: 'Email client running inside Argon OS sandbox with local draft & privacy guard.',
    trackersBlocked: 9,
    privacyGrade: 'B',
    installed: true,
    preinstalled: true,
    launchTarget: 'gmail',
    accent: 'bg-red-600',
  },
  {
    id: 'pkg-signal',
    name: 'Signal Private Messenger',
    developer: 'Signal Foundation',
    category: 'Privacy',
    rating: 4.9,
    downloads: '100M+',
    size: '54 MB',
    description: 'End-to-end encrypted messaging and calls backed by open-source zero-knowledge protocols.',
    trackersBlocked: 0,
    privacyGrade: 'A+',
    installed: false,
    launchTarget: 'messages',
    accent: 'bg-sky-600',
  },
  {
    id: 'pkg-vlc',
    name: 'VLC Media Player',
    developer: 'Videolabs',
    category: 'Apps',
    rating: 4.8,
    downloads: '500M+',
    size: '36 MB',
    description: 'Open-source local media player supporting lossless FLAC, MKV, and WebM without ads.',
    trackersBlocked: 0,
    privacyGrade: 'A+',
    installed: false,
    launchTarget: 'music',
    accent: 'bg-amber-600',
  },
  {
    id: 'pkg-krita',
    name: 'Krita Digital Painting',
    developer: 'Krita Foundation',
    category: 'Apps',
    rating: 4.7,
    downloads: '10M+',
    size: '112 MB',
    description: 'Professional open-source digital painting and illustration canvas.',
    trackersBlocked: 0,
    privacyGrade: 'A+',
    installed: false,
    launchTarget: 'paint',
    accent: 'bg-cyan-700',
  },
  {
    id: 'pkg-cyber-runner',
    name: 'Cyber Runner DX',
    developer: 'Human Arcade',
    category: 'Games',
    rating: 4.8,
    downloads: '1M+',
    size: '28 MB',
    description: 'Zero-ad 120fps reflex arcade runner sandboxed with offline high scores.',
    trackersBlocked: 0,
    privacyGrade: 'A+',
    installed: true,
    preinstalled: true,
    launchTarget: 'game',
    accent: 'bg-purple-600',
  },
  {
    id: 'pkg-chess',
    name: 'Lichess Offline Tactics',
    developer: 'Lichess.org',
    category: 'Games',
    rating: 4.9,
    downloads: '10M+',
    size: '21 MB',
    description: 'Free, open-source chess engine and puzzle trainer with zero tracking.',
    trackersBlocked: 0,
    privacyGrade: 'A+',
    installed: false,
    accent: 'bg-slate-700',
  },
];

export const PlayStoreApp: React.FC<PlayStoreAppProps> = ({ deviceSpace, onLaunchApp }) => {
  const [packages, setPackages] = useState<PlayPackage[]>(() =>
    readSpaceData<PlayPackage[]>(deviceSpace, 'google_play_packages', DEFAULT_PLAY_CATALOG)
  );
  const [tab, setTab] = useState<'For You' | 'Apps' | 'Games' | 'Privacy' | 'Installed'>('For You');
  const [search, setSearch] = useState('');
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<PlayPackage | null>(null);

  const persist = (next: PlayPackage[]) => {
    setPackages(next);
    writeSpaceData(deviceSpace, 'google_play_packages', next);
  };

  const handleInstall = (id: string) => {
    triggerHaptic(18);
    setInstallingId(id);
    setTimeout(() => {
      const next = packages.map((p) => (p.id === id ? { ...p, installed: true } : p));
      persist(next);
      setSelectedPkg((curr) => (curr?.id === id ? { ...curr, installed: true } : curr));
      setInstallingId(null);
    }, 500);
  };

  const handleUninstall = (id: string) => {
    triggerHaptic(12);
    const next = packages.map((p) => (p.id === id ? { ...p, installed: false } : p));
    persist(next);
    setSelectedPkg((curr) => (curr?.id === id ? { ...curr, installed: false } : curr));
  };

  const filtered = packages.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.developer.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (tab === 'Installed') return p.installed;
    if (tab === 'Apps') return p.category === 'Apps' || p.category === 'Productivity';
    if (tab === 'Games') return p.category === 'Games';
    if (tab === 'Privacy') return p.category === 'Privacy' || p.privacyGrade === 'A+';
    return true;
  });

  const installedCount = packages.filter((p) => p.installed).length;

  return (
    <div className="flex-1 w-full h-full bg-[#0c1018] text-white flex flex-col select-none overflow-hidden">
      {/* Top Bar */}
      <div className="p-3.5 bg-slate-900/95 border-b border-white/10 space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Google Play Store</h1>
              <span className="text-[10px] font-mono text-slate-400">
                {deviceSpace === 'ghost' ? 'Ghost Sandbox Partition' : 'Sandboxed Play Bridge'} ·{' '}
                {installedCount} Installed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-[10px] font-mono text-orange-300">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Play Protect + Shield Active</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 focus-within:border-emerald-400/60">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search apps, games, Brave, Tor, dayscore.ai.studio..."
              className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {(['For You', 'Apps', 'Games', 'Privacy', 'Installed'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer shrink-0 transition-colors ${
                tab === t
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {selectedPkg ? (
            <div className="p-4 rounded-2xl bg-slate-900 border border-white/15 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-14 h-14 rounded-2xl ${selectedPkg.accent} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                  >
                    {selectedPkg.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">{selectedPkg.name}</h2>
                    <p className="text-xs text-emerald-400">{selectedPkg.developer}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {selectedPkg.rating} ★ · {selectedPkg.downloads} · {selectedPkg.size}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPkg(null)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 cursor-pointer"
                >
                  Back
                </button>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed">{selectedPkg.description}</p>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">Privacy Grade</span>
                  <span className="text-sm font-bold text-emerald-400">{selectedPkg.privacyGrade}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">Ad SDKs Blocked</span>
                  <span className="text-sm font-bold text-orange-400">
                    {selectedPkg.trackersBlocked}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10">
                  <span className="text-[10px] text-slate-400 block">Isolation</span>
                  <span className="text-sm font-bold text-cyan-400">Sandboxed</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedPkg.installed ? (
                  <>
                    {selectedPkg.launchTarget && onLaunchApp && (
                      <button
                        onClick={() => onLaunchApp(selectedPkg.launchTarget!)}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Application</span>
                      </button>
                    )}
                    {!selectedPkg.preinstalled && (
                      <button
                        onClick={() => handleUninstall(selectedPkg.id)}
                        className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Uninstall</span>
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => handleInstall(selectedPkg.id)}
                    disabled={installingId === selectedPkg.id}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{installingId === selectedPkg.id ? 'Installing...' : 'Install'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/60 border border-emerald-500/25 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                    <Lock className="w-3 h-3" />
                    <span>ZERO-TELEMETRY CONTAINERIZATION</span>
                  </div>
                  <h2 className="text-sm font-bold text-white">
                    Pre-Installed Essentials & Audited Apps
                  </h2>
                  <p className="text-xs text-slate-300">
                    Brave, Tor, dayscore.ai.studio, and sandboxed apps run locally with Shield stripping tracking SDKs.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-emerald-300">
                  <Smartphone className="w-6 h-6" />
                  <Gamepad2 className="w-6 h-6" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg)}
                    className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-white/10 hover:border-emerald-500/30 transition-colors cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl ${pkg.accent} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow`}
                      >
                        {pkg.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {pkg.name}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {pkg.developer}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                          <span className="flex items-center gap-0.5 text-amber-400">
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                            {pkg.rating}
                          </span>
                          <span>·</span>
                          <span>{pkg.size}</span>
                          <span>·</span>
                          <span className="text-emerald-400">Grade {pkg.privacyGrade}</span>
                        </div>
                      </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                      {pkg.installed ? (
                        pkg.launchTarget && onLaunchApp ? (
                          <button
                            onClick={() => onLaunchApp(pkg.launchTarget!)}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-emerald-500 hover:text-slate-950 text-xs font-semibold text-emerald-300 cursor-pointer transition-colors"
                          >
                            Open
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Installed
                          </span>
                        )
                      ) : (
                        <button
                          onClick={() => handleInstall(pkg.id)}
                          disabled={installingId === pkg.id}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          {installingId === pkg.id ? '...' : 'Install'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
