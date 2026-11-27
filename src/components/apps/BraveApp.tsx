import React, { useState } from 'react';
import {
  Flame,
  ShieldCheck,
  ShieldAlert,
  Lock,
  RotateCw,
  ArrowLeft,
  Plus,
  X,
  ExternalLink,
  BookOpen,
  WifiOff,
  Zap,
  Globe,
} from 'lucide-react';
import { DeviceSpace, PrivacyProfile, ShieldStats } from '../../types/os';
import { readSpaceData, sanitizeTrackingUrl, writeSpaceData } from '../../utils/localVault';
import { runBatchTrackerScan } from '../../utils/shieldEngine';
import { triggerHaptic } from '../../utils/hardware';

interface BraveAppProps {
  deviceSpace: DeviceSpace;
  privacy: PrivacyProfile;
  onUpdatePrivacy: (partial: Partial<PrivacyProfile>) => void;
  shieldStats: ShieldStats;
  onUpdateShieldStats: (stats: ShieldStats) => void;
}

interface ReaderArticle {
  title: string;
  description?: string;
  extract: string;
  sourceUrl?: string;
  thumbnail?: string | null;
  related?: { title: string; url: string }[];
}

interface BraveTab {
  id: string;
  title: string;
  url: string;
  trackersBlocked: number;
  strippedParams: string[];
  article: ReaderArticle | null;
  errorMsg?: string | null;
}

const createBraveTab = (): BraveTab => ({
  id: `brave-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  title: 'Brave New Tab',
  url: 'brave://dashboard',
  trackersBlocked: 0,
  strippedParams: [],
  article: null,
  errorMsg: null,
});

export const BraveApp: React.FC<BraveAppProps> = ({
  deviceSpace,
  privacy,
  onUpdatePrivacy,
  shieldStats,
  onUpdateShieldStats,
}) => {
  const [tabs, setTabs] = useState<BraveTab[]>(() => [createBraveTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const [urlInput, setUrlInput] = useState(activeTab.url);
  const [isLoading, setIsLoading] = useState(false);
  const [shieldsOpen, setShieldsOpen] = useState(false);
  const [history, setHistory] = useState<string[]>(() =>
    deviceSpace === 'ghost' ? [] : readSpaceData<string[]>(deviceSpace, 'brave_history', [])
  );

  const selectTab = (tab: BraveTab) => {
    setActiveTabId(tab.id);
    setUrlInput(tab.url);
  };

  const addTab = () => {
    triggerHaptic(10);
    const t = createBraveTab();
    setTabs((prev) => [...prev, t]);
    setActiveTabId(t.id);
    setUrlInput(t.url);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      const fresh = createBraveTab();
      setTabs([fresh]);
      setActiveTabId(fresh.id);
      setUrlInput(fresh.url);
      return;
    }
    const idx = tabs.findIndex((t) => t.id === id);
    const rest = tabs.filter((t) => t.id !== id);
    setTabs(rest);
    if (activeTabId === id) {
      const next = rest[Math.max(0, idx - 1)];
      setActiveTabId(next.id);
      setUrlInput(next.url);
    }
  };

  const updateTab = (id: string, partial: Partial<BraveTab>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...partial } : t)));
  };

  const navigateTo = async (rawTarget: string, trackerCount = 8) => {
    const target = rawTarget.trim();
    if (!target) return;
    const currentId = activeTab.id;

    if (target === 'brave://dashboard') {
      updateTab(currentId, {
        title: 'Brave New Tab',
        url: 'brave://dashboard',
        trackersBlocked: 0,
        strippedParams: [],
        article: null,
        errorMsg: null,
      });
      setUrlInput('brave://dashboard');
      return;
    }

    const looksLikeUrl =
      target.startsWith('http://') ||
      target.startsWith('https://') ||
      (target.includes('.') && !target.includes(' '));

    let cleanUrl = target;
    let strippedParams: string[] = [];

    if (looksLikeUrl) {
      let normalized = target.startsWith('http') ? target : `https://${target}`;
      normalized = normalized.replace(/^http:\/\//i, 'https://');
      const sanitized = sanitizeTrackingUrl(normalized);
      cleanUrl = sanitized.cleanUrl;
      strippedParams = sanitized.strippedParams;
    }

    triggerHaptic(12);
    setIsLoading(true);
    setUrlInput(cleanUrl);

    let blockedNow = 0;
    if (privacy.shieldEnabled) {
      const { nextStats } = runBatchTrackerScan(
        deviceSpace,
        shieldStats,
        'brave',
        'Brave Browser',
        trackerCount
      );
      onUpdateShieldStats(nextStats);
      blockedNow = trackerCount;
    }

    if (deviceSpace !== 'ghost') {
      const nextHist = [cleanUrl, ...history.filter((u) => u !== cleanUrl)].slice(0, 10);
      setHistory(nextHist);
      writeSpaceData(deviceSpace, 'brave_history', nextHist);
    }

    if (privacy.localOnlyAirGap || deviceSpace === 'ghost') {
      updateTab(currentId, {
        title: looksLikeUrl ? cleanUrl.replace(/^https?:\/\//, '').split('/')[0] : target,
        url: cleanUrl,
        trackersBlocked: blockedNow,
        strippedParams,
        article: null,
        errorMsg:
          deviceSpace === 'ghost'
            ? 'Ghost Device isolation active: outbound HTTP requests blocked on-device.'
            : 'Air-Gap active: turn off Air-Gap in Brave Shields to fetch live knowledge pages.',
      });
      setIsLoading(false);
      return;
    }

    let lookupQuery = target;
    if (looksLikeUrl) {
      try {
        const u = new URL(cleanUrl);
        lookupQuery = u.hostname.replace(/^www\./, '').split('.')[0];
      } catch {
        lookupQuery = target;
      }
    }

    try {
      const res = await fetch(`/api/os/browse?q=${encodeURIComponent(lookupQuery)}`);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      if (data.found) {
        updateTab(currentId, {
          title: data.title || lookupQuery,
          url: looksLikeUrl ? cleanUrl : data.sourceUrl || cleanUrl,
          trackersBlocked: blockedNow,
          strippedParams,
          article: {
            title: data.title,
            description: data.description,
            extract: data.extract,
            sourceUrl: data.sourceUrl,
            thumbnail: data.thumbnail,
            related: data.related,
          },
          errorMsg: null,
        });
        if (!looksLikeUrl && data.sourceUrl) setUrlInput(data.sourceUrl);
      } else {
        updateTab(currentId, {
          title: lookupQuery,
          url: cleanUrl,
          trackersBlocked: blockedNow,
          strippedParams,
          article: null,
          errorMsg: `No public summary found for "${lookupQuery}".`,
        });
      }
    } catch {
      updateTab(currentId, {
        title: lookupQuery,
        url: cleanUrl,
        trackersBlocked: blockedNow,
        strippedParams,
        article: null,
        errorMsg: 'Lookup unreachable. Running sanitized local container.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalSavedMb = ((shieldStats.bandwidthSavedKb || 0) / 1024).toFixed(2);
  const totalBlocked =
    shieldStats.adsBlocked + shieldStats.trackersBlocked + shieldStats.fingerprintsNeutralized;

  return (
    <div className="flex-1 w-full h-full bg-[#0e1017] text-white flex flex-col select-none overflow-hidden">
      {/* Tab Bar */}
      <div className="px-2 pt-2 bg-[#141722] border-b border-white/10 flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => selectTab(tab)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs max-w-[180px] cursor-pointer border-t border-x ${
              tab.id === activeTab.id
                ? 'bg-[#1c2030] border-orange-500/30 text-white font-medium'
                : 'bg-transparent border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="truncate">{tab.title}</span>
            <span
              onClick={(e) => closeTab(tab.id, e)}
              className="p-0.5 rounded hover:bg-white/15 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </span>
          </button>
        ))}
        <button
          onClick={addTab}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          title="New Private Tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Omnibar */}
      <div className="p-2.5 bg-[#1c2030] border-b border-white/10 flex items-center gap-2">
        <button
          onClick={() => navigateTo('brave://dashboard', 0)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
          title="Brave Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigateTo(activeTab.url, 4)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
          title="Reload"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigateTo(urlInput, 8);
          }}
          className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 focus-within:border-orange-500/70"
        >
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Search privately or enter URL..."
            className="flex-1 bg-transparent text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none"
          />
        </form>

        <button
          onClick={() => setShieldsOpen(!shieldsOpen)}
          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer border ${
            privacy.shieldEnabled
              ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
              : 'bg-slate-800 border-white/10 text-slate-400'
          }`}
          title="Brave Shields"
        >
          {privacy.shieldEnabled ? (
            <ShieldCheck className="w-4 h-4 text-orange-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-slate-400" />
          )}
          <span className="tabular-nums">{activeTab.trackersBlocked}</span>
        </button>
      </div>

      {/* Brave Shields Panel */}
      {shieldsOpen && (
        <div className="p-4 bg-[#171a26] border-b border-orange-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white">
                Brave Shields are {privacy.shieldEnabled ? 'UP' : 'DOWN'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Blocks ads, third-party cookies, bounce tracking, and browser fingerprinting.
              </p>
            </div>
            <button
              onClick={() => onUpdatePrivacy({ shieldEnabled: !privacy.shieldEnabled })}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                privacy.shieldEnabled ? 'bg-orange-500 text-slate-950' : 'bg-slate-700 text-white'
              }`}
            >
              {privacy.shieldEnabled ? 'Shields UP' : 'Shields DOWN'}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { key: 'blockScripts', label: 'Block Scripts', on: privacy.blockScripts },
              { key: 'fingerprintSpoofing', label: 'Block Fingerprinting', on: privacy.fingerprintSpoofing },
              { key: 'webrtcLeakGuard', label: 'WebRTC Guard', on: privacy.webrtcLeakGuard },
              { key: 'torRouting', label: 'Private with Tor', on: privacy.torRouting },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => onUpdatePrivacy({ [item.key]: !item.on } as Partial<PrivacyProfile>)}
                className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                  item.on
                    ? 'bg-orange-500/15 border-orange-500/40 text-white'
                    : 'bg-slate-950 border-white/10 text-slate-400'
                }`}
              >
                <span className="truncate">{item.label}</span>
                <span className="font-mono text-[10px]">{item.on ? 'ON' : 'OFF'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Viewport */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl mx-auto space-y-5">
          {activeTab.strippedParams.length > 0 && (
            <div className="p-3 rounded-xl bg-orange-500/15 border border-orange-500/30 text-xs text-orange-200">
              Brave stripped tracking query params: {activeTab.strippedParams.join(', ')}
            </div>
          )}

          {activeTab.errorMsg && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{activeTab.errorMsg}</span>
            </div>
          )}

          {activeTab.article ? (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-orange-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  BRAVE CLEAN READER · HTTPS UPGRADED
                </span>
                <span>{activeTab.trackersBlocked} Trackers Blocked</span>
              </div>
              <h2 className="text-lg font-bold text-white">{activeTab.article.title}</h2>
              {activeTab.article.description && (
                <p className="text-xs text-slate-400">{activeTab.article.description}</p>
              )}
              <p className="text-sm text-slate-200 leading-relaxed select-text">
                {activeTab.article.extract}
              </p>
              {activeTab.article.sourceUrl && (
                <a
                  href={activeTab.article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 text-xs text-orange-300"
                >
                  <span>Open Full Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ) : (
            <>
              {/* Brave Stats Hero */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-950/50 via-slate-900 to-indigo-950/50 border border-orange-500/25 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <h2 className="text-base font-bold text-white">Brave Privacy Dashboard</h2>
                  </div>
                  <span className="text-[11px] font-mono text-orange-300">
                    {privacy.shieldLevel.toUpperCase()} SHIELDS
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10">
                    <span className="text-xl font-bold text-orange-400 tabular-nums block">
                      {totalBlocked.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400">Trackers & Ads Blocked</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10">
                    <span className="text-xl font-bold text-cyan-400 tabular-nums block">
                      {totalSavedMb} MB
                    </span>
                    <span className="text-[11px] text-slate-400">Bandwidth Saved</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10">
                    <span className="text-xl font-bold text-emerald-400 tabular-nums block">
                      {Math.max(1, Math.round(totalBlocked * 0.05))}s
                    </span>
                    <span className="text-[11px] text-slate-400">Est. Time Saved</span>
                  </div>
                </div>
              </div>

              {/* Quick Topics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: 'Privacy Engineering', query: 'Privacy' },
                  { label: 'Linux Architecture', query: 'Linux' },
                  { label: 'Web Security', query: 'HTTPS' },
                  { label: 'Cryptography', query: 'Public-key cryptography' },
                ].map((q) => (
                  <button
                    key={q.query}
                    onClick={() => navigateTo(q.query, 9)}
                    className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-left cursor-pointer space-y-1"
                  >
                    <Zap className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xs font-semibold text-white block">{q.label}</span>
                  </button>
                ))}
              </div>

              {history.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-400 block">Recent Tabs</span>
                  {history.slice(0, 4).map((h, i) => (
                    <button
                      key={`${h}-${i}`}
                      onClick={() => navigateTo(h, 4)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-left text-[11px] font-mono text-slate-300 flex items-center gap-2 cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span className="truncate">{h}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
