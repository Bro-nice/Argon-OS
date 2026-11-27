import React, { useState } from 'react';
import { ShoppingBag, Download, Star, ShieldCheck, Trash2 } from 'lucide-react';
import { DeviceSpace } from '../../types/os';
import { triggerHaptic } from '../../utils/hardware';
import { readSpaceData, writeSpaceData } from '../../utils/localVault';

interface StoreAppItem {
  id: string;
  name: string;
  developer: string;
  rating: number;
  category: string;
  desc: string;
  trackersBlockedOnAudit: number;
  isInstalled: boolean;
  size: string;
}

const STORE_CATALOG: StoreAppItem[] = [
  {
    id: 'app_pixel_dash',
    name: 'Pixel Dash: Retro Runner',
    developer: 'Human Arcade Labs',
    rating: 4.9,
    category: 'Games',
    desc: 'High-speed 120fps procedural runner with 0 ad SDKs.',
    trackersBlockedOnAudit: 0,
    isInstalled: false,
    size: '24 MB',
  },
  {
    id: 'app_paint',
    name: 'Vector Studio Pro',
    developer: 'Creative Matrix',
    rating: 4.8,
    category: 'Creativity',
    desc: 'Local-only vector canvas; files never leave device.',
    trackersBlockedOnAudit: 0,
    isInstalled: false,
    size: '42 MB',
  },
  {
    id: 'app_podcast',
    name: 'Resonance Podcasts',
    developer: 'Lossless Audio',
    rating: 4.7,
    category: 'Media',
    desc: 'RSS audio client with 3 dynamic ad-insertion trackers stripped.',
    trackersBlockedOnAudit: 3,
    isInstalled: true,
    size: '18 MB',
  },
  {
    id: 'app_crypto',
    name: 'Cold Hardware Vault',
    developer: 'Sovereign Enclave',
    rating: 5.0,
    category: 'Security',
    desc: 'Zero-knowledge deterministic local hardware keychain.',
    trackersBlockedOnAudit: 0,
    isInstalled: true,
    size: '8 MB',
  },
];

interface AppStoreAppProps {
  deviceSpace?: DeviceSpace;
}

export const AppStoreApp: React.FC<AppStoreAppProps> = ({ deviceSpace = 'primary' }) => {
  const [catalog, setCatalog] = useState<StoreAppItem[]>(() =>
    readSpaceData<StoreAppItem[]>(deviceSpace, 'market_catalog', STORE_CATALOG)
  );
  const [installingId, setInstallingId] = useState<string | null>(null);

  const handleInstall = (id: string) => {
    triggerHaptic(20);
    setInstallingId(id);
    setTimeout(() => {
      setCatalog((prev) => {
        const next = prev.map((a) => (a.id === id ? { ...a, isInstalled: true } : a));
        writeSpaceData(deviceSpace, 'market_catalog', next);
        return next;
      });
      setInstallingId(null);
    }, 450);
  };

  const handleUninstall = (id: string) => {
    triggerHaptic(15);
    setCatalog((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, isInstalled: false } : a));
      writeSpaceData(deviceSpace, 'market_catalog', next);
      return next;
    });
  };

  return (
    <div className="flex-1 w-full h-full bg-[#0b0f17] text-white flex flex-col justify-between p-4 select-none overflow-y-auto space-y-4">
      <div className="max-w-2xl mx-auto w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white">Sovereign App Market</span>
          </div>
          <span className="text-emerald-400 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Ad-SDK Firewall Active
          </span>
        </div>

        {/* Featured Banner */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5">
          <span className="text-[11px] font-mono text-orange-400 block font-semibold">
            Tracker-Free Audited Software
          </span>
          <h2 className="text-sm font-bold text-white">Zero-Telemetry Sandboxes</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Every app runs inside an isolated partition with Shield blocking embedded ad networks and analytics beacons automatically.
          </p>
        </div>

        {/* Catalog List */}
        <div className="space-y-2.5 flex-1">
          {catalog.map((app) => (
            <div
              key={app.id}
              className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 flex items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <span className="text-xs font-bold text-white block truncate">{app.name}</span>
                <p className="text-[11px] text-slate-400 truncate">{app.desc}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span className="flex items-center gap-0.5 text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {app.rating}
                  </span>
                  <span>·</span>
                  <span>{app.category}</span>
                  <span>·</span>
                  <span>{app.size}</span>
                  <span>·</span>
                  <span className="text-emerald-400">
                    {app.trackersBlockedOnAudit === 0
                      ? '0 Trackers'
                      : `${app.trackersBlockedOnAudit} Blocked`}
                  </span>
                </div>
              </div>

              {app.isInstalled ? (
                <button
                  onClick={() => handleUninstall(app.id)}
                  className="min-h-[38px] px-3 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer bg-white/10 hover:bg-rose-500/20 text-emerald-400 hover:text-rose-300 shrink-0"
                  title="Uninstall"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              ) : (
                <button
                  onClick={() => handleInstall(app.id)}
                  disabled={installingId === app.id}
                  className="min-h-[38px] px-3 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-slate-950 shrink-0 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{installingId === app.id ? 'Installing...' : 'Get'}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
