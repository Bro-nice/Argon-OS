import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  EyeOff,
  Lock,
  HardDrive,
  RefreshCw,
  Trash2,
  Download,
  Globe,
  WifiOff,
  Check,
  Fingerprint,
  Ban,
} from 'lucide-react';
import { AppId, AppMetadata, PrivacyProfile, ShieldLevel, ShieldStats } from '../../types/os';
import {
  exportSpaceBackup,
  getSpaceStorageStats,
  shredSpaceData,
} from '../../utils/localVault';
import { runBatchTrackerScan } from '../../utils/shieldEngine';
import { triggerHaptic } from '../../utils/hardware';

interface ShieldAppProps {
  privacy: PrivacyProfile;
  onUpdatePrivacy: (partial: Partial<PrivacyProfile>) => void;
  onRotateIdentity: () => void;
  shieldStats: ShieldStats;
  onUpdateShieldStats: (stats: ShieldStats) => void;
  appMetadata: Record<AppId, AppMetadata>;
  onSpaceReset?: () => void;
}

export const ShieldApp: React.FC<ShieldAppProps> = ({
  privacy,
  onUpdatePrivacy,
  onRotateIdentity,
  shieldStats,
  onUpdateShieldStats,
  appMetadata,
  onSpaceReset,
}) => {
  const [activeTab, setActiveTab] = useState<'shield' | 'apps' | 'identity' | 'vault'>('shield');
  const [storageInfo, setStorageInfo] = useState({
    keysCount: 0,
    bytesUsed: 0,
    quotaMb: 5120,
    browserUsageMb: 0,
  });
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  useEffect(() => {
    getSpaceStorageStats(privacy.deviceSpace).then(setStorageInfo);
  }, [privacy.deviceSpace, shieldStats]);

  const showToast = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(null), 2600);
  };

  const totalBlocked =
    shieldStats.adsBlocked + shieldStats.trackersBlocked + shieldStats.fingerprintsNeutralized;

  const handleSetLevel = (level: ShieldLevel) => {
    triggerHaptic(15);
    onUpdatePrivacy({
      shieldEnabled: true,
      shieldLevel: level,
      blockScripts: level !== 'standard',
      fingerprintSpoofing: true,
      webrtcLeakGuard: true,
      localOnlyAirGap: level === 'airgap',
    });
    showToast(`Shield mode set to ${level === 'airgap' ? 'Air-Gap Local Only' : level}`);
  };

  const handleRunDeepAudit = () => {
    triggerHaptic([15, 25]);
    const { nextStats } = runBatchTrackerScan(
      privacy.deviceSpace,
      shieldStats,
      'shield',
      'System Firewall',
      6
    );
    onUpdateShieldStats(nextStats);
    showToast('Blocked 6 simulated telemetry & ad requests across active apps');
  };

  const handleToggleAppShield = (appId: AppId) => {
    triggerHaptic(10);
    const currentVal = shieldStats.perAppShield[appId] !== false;
    onUpdateShieldStats({
      ...shieldStats,
      perAppShield: {
        ...shieldStats.perAppShield,
        [appId]: !currentVal,
      },
    });
  };

  const handleDownloadLocalBackup = () => {
    triggerHaptic(15);
    const json = exportSpaceBackup(privacy.deviceSpace);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `argon_${privacy.deviceSpace}_on_device_vault.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported encrypted partition locally to your device');
  };

  const handleShredCurrentSpace = () => {
    triggerHaptic([30, 40, 30]);
    const removed = shredSpaceData(privacy.deviceSpace);
    getSpaceStorageStats(privacy.deviceSpace).then(setStorageInfo);
    if (onSpaceReset) onSpaceReset();
    showToast(`Cryptographically wiped ${removed} local records from this space`);
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col select-none overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Argon Shield</h1>
            <p className="text-[11px] text-slate-400">
              {privacy.deviceSpace === 'ghost' ? 'Ghost Device' : 'Primary Device'} · On-Device Only
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic(15);
            onUpdatePrivacy({ shieldEnabled: !privacy.shieldEnabled });
          }}
          className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            privacy.shieldEnabled
              ? 'bg-orange-500 text-slate-950 hover:bg-orange-400'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {privacy.shieldEnabled ? 'Shields Up' : 'Shields Down'}
        </button>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center gap-1 bg-slate-900/40">
        {[
          { id: 'shield', label: 'Firewall' },
          { id: 'apps', label: 'Per-App' },
          { id: 'identity', label: 'Anonymous' },
          { id: 'vault', label: 'Local Data' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              triggerHaptic(10);
              setActiveTab(t.id as any);
            }}
            className={`flex-1 min-h-[38px] px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-white/12 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Feedback Banner */}
      {statusFeedback && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span className="truncate">{statusFeedback}</span>
        </div>
      )}

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'shield' && (
          <>
            {/* Hero Stats Summary */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Trackers & Ads Neutralized</span>
                  <span className="text-3xl font-bold text-white tabular-nums tracking-tight">
                    {totalBlocked.toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={handleRunDeepAudit}
                  className="min-h-[40px] px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
                  <span>Test Blocker</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10">
                <div>
                  <span className="text-base font-bold text-orange-400 tabular-nums block">
                    {shieldStats.adsBlocked}
                  </span>
                  <span className="text-[11px] text-slate-400">Ads Blocked</span>
                </div>
                <div>
                  <span className="text-base font-bold text-cyan-400 tabular-nums block">
                    {shieldStats.trackersBlocked}
                  </span>
                  <span className="text-[11px] text-slate-400">Trackers</span>
                </div>
                <div>
                  <span className="text-base font-bold text-emerald-400 tabular-nums block">
                    {(shieldStats.bandwidthSavedKb / 1024).toFixed(1)} MB
                  </span>
                  <span className="text-[11px] text-slate-400">Data Saved</span>
                </div>
              </div>
            </div>

            {/* Protection Intensity Selector */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-slate-300">Protection Intensity</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'standard', title: 'Standard', desc: 'Ads & cookies' },
                  { id: 'aggressive', title: 'Aggressive', desc: 'Brave-grade strict' },
                  { id: 'airgap', title: 'Air-Gap', desc: 'Zero cloud outbound' },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => handleSetLevel(lvl.id as ShieldLevel)}
                    className={`min-h-[56px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      privacy.shieldLevel === lvl.id
                        ? 'bg-orange-500/15 border-orange-500/50 text-white'
                        : 'bg-slate-900/60 border-white/5 text-slate-400 hover:border-white/15'
                    }`}
                  >
                    <span className="text-xs font-bold block">{lvl.title}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{lvl.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ultra-Security Switches */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-slate-300">Brave-Grade Security Protections</h2>
              <div className="divide-y divide-white/5 rounded-2xl bg-slate-900/70 border border-white/10 overflow-hidden">
                {[
                  {
                    key: 'fingerprintSpoofing' as const,
                    label: 'Strict Fingerprint Randomization',
                    sub: 'Masks canvas, WebGL GPU, and audio signatures',
                    icon: Fingerprint,
                  },
                  {
                    key: 'webrtcLeakGuard' as const,
                    label: 'WebRTC IP Leak Guard',
                    sub: 'Prevents local & public IP discovery across apps',
                    icon: Shield,
                  },
                  {
                    key: 'torRouting' as const,
                    label: 'Onion Circuit Relay',
                    sub: 'Routes browser lookups through multi-hop relays',
                    icon: Globe,
                  },
                  {
                    key: 'localOnlyAirGap' as const,
                    label: 'Local-Only AI & Telemetry Air-Gap',
                    sub: 'Blocks outbound server requests; 100% on-device',
                    icon: WifiOff,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = Boolean(privacy[item.key]);
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        triggerHaptic(10);
                        onUpdatePrivacy({ [item.key]: !active });
                      }}
                      className="w-full min-h-[56px] px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-orange-400' : 'text-slate-500'}`} />
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-white block truncate">{item.label}</span>
                          <span className="text-[11px] text-slate-400 block truncate">{item.sub}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 ${
                          active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {active ? 'Active' : 'Off'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recent Intercepted Requests */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-slate-300">Recent Neutralized Requests</h2>
              <div className="space-y-1.5">
                {shieldStats.blockedLog.slice(0, 6).map((evt) => (
                  <div
                    key={evt.id}
                    className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-mono text-white block truncate">{evt.domain}</span>
                      <span className="text-[11px] text-slate-400 block">
                        {evt.appName} · {evt.category} · {evt.timestamp}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 tabular-nums shrink-0">
                      Blocked
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'apps' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10">
              <p className="text-xs text-slate-300 leading-relaxed">
                System-wide ad-blocking and tracker filtering is enforced at the kernel network layer for every application installed on this device.
              </p>
            </div>

            <div className="divide-y divide-white/5 rounded-2xl bg-slate-900/70 border border-white/10 overflow-hidden">
              {(Object.values(appMetadata) as AppMetadata[]).map((app) => {
                const isProtected = shieldStats.perAppShield[app.id] !== false;
                return (
                  <div
                    key={app.id}
                    className="px-3.5 py-2.5 min-h-[54px] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white block truncate">{app.name}</span>
                      <span className="text-[11px] text-slate-400">
                        {isProtected ? 'Ads, SDKs & Trackers Blocked' : 'Firewall Bypassed'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleAppShield(app.id)}
                      className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        isProtected
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                      }`}
                    >
                      {isProtected ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      <span>{isProtected ? 'Protected' : 'Unfiltered'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'identity' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/85 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-xs font-bold text-white">Active Anonymous Hardware Mask</h2>
                </div>
                <button
                  onClick={() => {
                    triggerHaptic(15);
                    onUpdatePrivacy({ anonymousMode: !privacy.anonymousMode });
                  }}
                  className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    privacy.anonymousMode ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {privacy.anonymousMode ? 'Masked' : 'Exposed'}
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Apps and websites cannot read your real hardware serial, MAC address, GPU signature, or timezone.
              </p>

              <div className="space-y-2 pt-2 border-t border-white/10 text-xs font-mono">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Device Alias</span>
                  <span className="text-emerald-300 truncate">{privacy.spoofedDeviceId}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Spoofed MAC</span>
                  <span className="text-white tabular-nums">{privacy.spoofedMacAddress}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Node Hostname</span>
                  <span className="text-white">{privacy.spoofedNodeName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Timezone</span>
                  <span className="text-white">{privacy.spoofedTimezone}</span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-400 block mb-0.5">GPU Mask</span>
                  <span className="text-slate-200 text-[11px] block truncate">{privacy.spoofedGpuAlias}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  triggerHaptic([15, 25]);
                  onRotateIdentity();
                  showToast('Generated brand-new cryptographic hardware mask');
                }}
                className="w-full min-h-[44px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Rotate Anonymous Identity Now</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'vault' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/85 border border-white/10 space-y-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold text-white">100% On-Device Data Sovereignty</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                All files, notes, messages, bookmarks, and settings remain strictly inside this device&apos;s local storage partition. Zero user data is uploaded to external cloud servers.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                <div>
                  <span className="text-[11px] text-slate-400 block">Partition Records</span>
                  <span className="text-base font-bold text-white tabular-nums">
                    {storageInfo.keysCount} Keys
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">On-Device Footprint</span>
                  <span className="text-base font-bold text-cyan-400 tabular-nums">
                    {formatBytes(storageInfo.bytesUsed)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Cloud Sync: Disabled</span>
                <span>Available Host Quota: {storageInfo.quotaMb} MB</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleDownloadLocalBackup}
                className="w-full min-h-[44px] px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Export Local Backup to Device</span>
              </button>

              <button
                onClick={handleShredCurrentSpace}
                className="w-full min-h-[44px] px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  Shred All {privacy.deviceSpace === 'ghost' ? 'Ghost' : 'Primary'} Local Data
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
