import React, { useState } from 'react';
import {
  ArrowLeft,
  RotateCw,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Flame,
  Lock,
  Globe,
  EyeOff,
  Check,
  Zap,
  Plus,
  X,
  BookOpen,
  WifiOff,
} from 'lucide-react';
import { DeviceSpace, PrivacyProfile, ShieldStats } from '../../types/os';
import { readSpaceData, sanitizeTrackingUrl, writeSpaceData } from '../../utils/localVault';
import { runBatchTrackerScan } from '../../utils/shieldEngine';
import { triggerHaptic } from '../../utils/hardware';

interface BrowserAppProps {
  deviceSpace: DeviceSpace;
  privacy: PrivacyProfile;
  onUpdatePrivacy: (partial: Partial<PrivacyProfile>) => void;
  shieldStats: ShieldStats;
  onUpdateShieldStats: (stats: ShieldStats) => void;
}

interface BookmarkItem {
  title: string;
  url: string;
  snippet: string;
  simulatedTrackers: number;
}

interface ReaderArticle {
  title: string;
  description?: string;
  extract: string;
  sourceUrl?: string;
  thumbnail?: string | null;
  related?: { title: string; url: string }[];
}

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  trackersBlocked: number;
  strippedParams: string[];
  article: ReaderArticle | null;
  errorMsg?: string | null;
}

const DEFAULT_BOOKMARKS: BookmarkItem[] = [
  {
    title: 'Argon OS Sovereign Manifesto',
    url: 'https://argonos.local/manifesto',
    snippet: 'Zero-cloud hardware isolation, capability microkernel, and local data sovereignty.',
    simulatedTrackers: 0,
  },
  {
    title: 'Linux Kernel (Encyclopedia)',
    url: 'Linux kernel',
    snippet: 'Fetch clean ad-free reference summary via Quantum Private Reader.',
    simulatedTrackers: 4,
  },
  {
    title: 'Ad & Tracker Stress Test',
    url: 'https://audit.privacy-check.local/ad-heavy-news',
    snippet: 'Simulate loading a heavy news site with 14 ads, pixels, and fingerprint scripts.',
    simulatedTrackers: 14,
  },
  {
    title: 'Operating System Concepts',
    url: 'Operating system',
    snippet: 'Architecture of microkernels, process scheduling, and memory protection.',
    simulatedTrackers: 3,
  },
];

const createHomeTab = (): BrowserTab => ({
  id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  title: 'Argon OS Home',
  url: 'https://argonos.local/manifesto',
  trackersBlocked: 0,
  strippedParams: [],
  article: null,
  errorMsg: null,
});

export const BrowserApp: React.FC<BrowserAppProps> = ({
  deviceSpace,
  privacy,
  onUpdatePrivacy,
  shieldStats,
  onUpdateShieldStats,
}) => {
  const [tabs, setTabs] = useState<BrowserTab[]>(() => [createHomeTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const [urlInput, setUrlInput] = useState(activeTab.url);
  const [isLoading, setIsLoading] = useState(false);
  const [shieldsDrawerOpen, setShieldsDrawerOpen] = useState(false);
  const [historyClearedMsg, setHistoryClearedMsg] = useState(false);

  const [history, setHistory] = useState<string[]>(() =>
    deviceSpace === 'ghost' ? [] : readSpaceData<string[]>(deviceSpace, 'browser_history', [])
  );

  const selectTab = (tab: BrowserTab) => {
    setActiveTabId(tab.id);
    setUrlInput(tab.url);
  };

  const addTab = () => {
    triggerHaptic(10);
    const fresh = createHomeTab();
    setTabs((prev) => [...prev, fresh]);
    setActiveTabId(fresh.id);
    setUrlInput(fresh.url);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(10);
    if (tabs.length === 1) {
      const reset = createHomeTab();
      setTabs([reset]);
      setActiveTabId(reset.id);
      setUrlInput(reset.url);
      return;
    }
    const idx = tabs.findIndex((t) => t.id === id);
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      const next = remaining[Math.max(0, idx - 1)];
      setActiveTabId(next.id);
      setUrlInput(next.url);
    }
  };

  const updateTab = (id: string, partial: Partial<BrowserTab>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...partial } : t)));
  };

  const navigateTo = async (rawTarget: string, trackerCount = 6) => {
    let target = rawTarget.trim();
    if (!target) return;

    const currentId = activeTab.id;
    const isLocalPage =
      target.startsWith('https://argonos.local') ||
      target.startsWith('https://audit.privacy-check.local');
    const looksLikeUrl =
      target.startsWith('http://') ||
      target.startsWith('https://') ||
      (target.includes('.') && !target.includes(' '));

    let cleanUrl = target;
    let strippedParams: string[] = [];

    if (looksLikeUrl) {
      let normalized = target;
      if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = `https://${normalized}`;
      }
      normalized = normalized.replace(/^http:\/\//i, 'https://');
      const sanitized = sanitizeTrackingUrl(normalized);
      cleanUrl = sanitized.cleanUrl;
      strippedParams = sanitized.strippedParams;
    }

    triggerHaptic(15);
    setIsLoading(true);
    setUrlInput(cleanUrl);

    let blockedNow = 0;
    if (privacy.shieldEnabled) {
      const { nextStats } = runBatchTrackerScan(
        deviceSpace,
        shieldStats,
        'browser',
        'Quantum Browser',
        trackerCount
      );
      onUpdateShieldStats(nextStats);
      blockedNow = trackerCount;
    }

    const nextHist = [cleanUrl, ...history.filter((u) => u !== cleanUrl)].slice(0, 12);
    setHistory(nextHist);
    if (deviceSpace !== 'ghost') {
      writeSpaceData(deviceSpace, 'browser_history', nextHist);
    }

    if (isLocalPage) {
      updateTab(currentId, {
        title: cleanUrl.includes('ad-heavy-news') ? 'Shield Stress Audit' : 'Argon OS Home',
        url: cleanUrl,
        trackersBlocked: blockedNow,
        strippedParams,
        article: null,
        errorMsg: null,
      });
      setIsLoading(false);
      return;
    }

    // Air-Gap or Ghost Device strictly refuses outbound HTTP requests
    if (privacy.localOnlyAirGap || deviceSpace === 'ghost') {
      updateTab(currentId, {
        title: looksLikeUrl ? cleanUrl.replace(/^https?:\/\//, '').split('/')[0] : target,
        url: cleanUrl,
        trackersBlocked: blockedNow,
        strippedParams,
        article: null,
        errorMsg:
          deviceSpace === 'ghost'
            ? 'Ghost Device Air-Gap active: outbound network requests are quarantined on-device.'
            : 'Zero-Cloud Air-Gap active: disable Air-Gap in Shield to fetch external pages.',
      });
      setIsLoading(false);
      return;
    }

    // Extract lookup keyword from URL domain or search text
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
      if (!res.ok) throw new Error('Reader offline');
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
        if (!looksLikeUrl && data.sourceUrl) {
          setUrlInput(data.sourceUrl);
        }
      } else {
        updateTab(currentId, {
          title: lookupQuery,
          url: cleanUrl,
          trackersBlocked: blockedNow,
          strippedParams,
          article: null,
          errorMsg: `No public reference summary found for "${lookupQuery}". You can open the URL directly below.`,
        });
      }
    } catch {
      updateTab(currentId, {
        title: lookupQuery,
        url: cleanUrl,
        trackersBlocked: blockedNow,
        strippedParams,
        article: null,
        errorMsg: 'Network lookup unavailable. Running local sanitized sandbox view.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(urlInput, 7);
  };

  const handleShredSession = () => {
    triggerHaptic([20, 30]);
    setHistory([]);
    writeSpaceData(deviceSpace, 'browser_history', []);
    const cleanTab = createHomeTab();
    setTabs([cleanTab]);
    setActiveTabId(cleanTab.id);
    setUrlInput(cleanTab.url);
    setHistoryClearedMsg(true);
    setTimeout(() => setHistoryClearedMsg(false), 2200);
  };

  const totalShieldBlocked =
    shieldStats.adsBlocked + shieldStats.trackersBlocked + shieldStats.fingerprintsNeutralized;

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col select-none overflow-hidden relative">
      {/* Tab Strip */}
      <div className="px-2 pt-2 bg-slate-950 border-b border-white/10 flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              onClick={() => selectTab(tab)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs max-w-[170px] cursor-pointer transition-colors border-t border-x ${
                isActive
                  ? 'bg-slate-900 border-white/15 text-white font-medium'
                  : 'bg-slate-950 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">{tab.title}</span>
              <span
                onClick={(e) => closeTab(tab.id, e)}
                className="p-0.5 rounded hover:bg-white/15 text-slate-400 hover:text-white shrink-0"
                title="Close Tab"
              >
                <X className="w-3 h-3" />
              </span>
            </button>
          );
        })}
        <button
          onClick={addTab}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          title="New Private Tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Omnibar */}
      <div className="p-2.5 bg-slate-900 border-b border-white/10 space-y-1.5">
        <form onSubmit={handleFormSubmit} className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => navigateTo('https://argonos.local/manifesto', 0)}
            className="min-h-[36px] min-w-[34px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer rounded-lg hover:bg-white/5"
            title="Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => navigateTo(activeTab.url, 4)}
            className="min-h-[36px] min-w-[34px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer rounded-lg hover:bg-white/5"
            title="Reload"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
          </button>

          <div className="flex-1 min-h-[36px] flex items-center gap-2 px-3 rounded-lg bg-slate-950 border border-white/10 focus-within:border-orange-400/60">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Search topic or enter URL (e.g. Quantum computing, kernel.org)..."
              className="flex-1 bg-transparent text-white placeholder:text-slate-500 focus:outline-none truncate font-mono text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setShieldsDrawerOpen(!shieldsDrawerOpen);
            }}
            className={`min-h-[36px] px-2.5 rounded-lg flex items-center gap-1 font-mono text-xs font-bold cursor-pointer transition-colors shrink-0 ${
              privacy.shieldEnabled
                ? 'bg-orange-500/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500/30'
                : 'bg-slate-800 border border-white/10 text-slate-400'
            }`}
            title="Shield Controls"
          >
            {privacy.shieldEnabled ? (
              <ShieldCheck className="w-4 h-4 text-orange-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-slate-400" />
            )}
            <span className="tabular-nums">{activeTab.trackersBlocked}</span>
          </button>

          <button
            type="button"
            onClick={handleShredSession}
            className="min-h-[36px] min-w-[36px] rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 flex items-center justify-center cursor-pointer transition-colors shrink-0"
            title="Shred All Tabs & Session"
          >
            <Flame className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between px-1 text-[10px] text-slate-400 font-mono">
          <span>
            {deviceSpace === 'ghost' ? 'Ghost Ephemeral' : 'Private Sandbox'} ·{' '}
            {privacy.localOnlyAirGap ? 'Air-Gapped' : privacy.torRouting ? 'Onion Relay' : 'Direct HTTPS'}
          </span>
          <span className="text-orange-400 tabular-nums">{totalShieldBlocked} Total Blocked</span>
        </div>
      </div>

      {/* Shields Popover */}
      {shieldsDrawerOpen && (
        <div className="p-3.5 bg-slate-900/95 border-b border-orange-500/30 space-y-2.5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-white">Shield Protection</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[230px]">{activeTab.url}</p>
            </div>
            <button
              onClick={() => {
                triggerHaptic(15);
                onUpdatePrivacy({ shieldEnabled: !privacy.shieldEnabled });
              }}
              className={`min-h-[32px] px-3 rounded-lg text-xs font-bold cursor-pointer ${
                privacy.shieldEnabled ? 'bg-orange-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {privacy.shieldEnabled ? 'UP' : 'DOWN'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { key: 'blockScripts', label: 'Block Scripts', on: privacy.blockScripts },
              { key: 'fingerprintSpoofing', label: 'Anti-Fingerprint', on: privacy.fingerprintSpoofing },
              { key: 'torRouting', label: 'Onion Relay', on: privacy.torRouting },
              { key: 'webrtcLeakGuard', label: 'WebRTC Guard', on: privacy.webrtcLeakGuard },
            ].map((ctrl) => (
              <button
                key={ctrl.key}
                onClick={() => onUpdatePrivacy({ [ctrl.key]: !ctrl.on } as Partial<PrivacyProfile>)}
                className={`min-h-[36px] px-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer ${
                  ctrl.on
                    ? 'bg-orange-500/15 border-orange-500/40 text-white'
                    : 'bg-slate-950 border-white/10 text-slate-400'
                }`}
              >
                <span className="truncate">{ctrl.label}</span>
                <span className="font-mono text-[10px] ml-1">{ctrl.on ? 'ON' : 'OFF'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Viewport */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {historyClearedMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Session shredded. Zero traces left on device.</span>
            </div>
          )}

          {activeTab.strippedParams.length > 0 && (
            <div className="p-3 rounded-xl bg-orange-500/15 border border-orange-500/30 text-xs text-orange-200">
              Stripped tracking URL parameters: {activeTab.strippedParams.join(', ')}
            </div>
          )}

          {activeTab.errorMsg && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{activeTab.errorMsg}</span>
            </div>
          )}

          {/* Active Page / Reader Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono text-emerald-400">HTTPS Upgraded · Zero Third-Party Cookies</span>
              <span className="font-mono text-orange-400 tabular-nums">
                {activeTab.trackersBlocked} Trackers Stripped
              </span>
            </div>

            {activeTab.article ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono mb-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>CLEAN READER MODE</span>
                    </div>
                    <h2 className="text-lg font-bold text-white">{activeTab.article.title}</h2>
                    {activeTab.article.description && (
                      <p className="text-xs text-slate-400">{activeTab.article.description}</p>
                    )}
                  </div>
                  {activeTab.article.thumbnail && (
                    <img
                      src={activeTab.article.thumbnail}
                      alt={activeTab.article.title}
                      className="w-16 h-16 rounded-lg object-cover border border-white/10 shrink-0"
                    />
                  )}
                </div>

                <p className="text-sm text-slate-200 leading-relaxed select-text">
                  {activeTab.article.extract}
                </p>

                {activeTab.article.sourceUrl && (
                  <a
                    href={activeTab.article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-medium text-cyan-300"
                  >
                    <span>Open Full Source in New Window</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {activeTab.article.related && activeTab.article.related.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <span className="text-[11px] text-slate-400 font-medium block">Related Topics</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeTab.article.related.map((rel) => (
                        <button
                          key={rel.title}
                          onClick={() => navigateTo(rel.title, 2)}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/10 text-xs text-slate-200 cursor-pointer"
                        >
                          {rel.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab.url.includes('ad-heavy-news') ? (
              <div className="p-3 rounded-lg bg-slate-950 border border-white/5 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-orange-400 font-semibold">
                  <Zap className="w-4 h-4" />
                  <span>Stress Test Complete — Clean Reader Enforced</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Neutralized 6 programmatic banner ad iframes, 4 cross-site tracking pixels, 2 canvas
                  fingerprint probes, and 2 third-party analytics beacons before execution.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-white break-all">{activeTab.url}</h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ephemeral sandbox ready. Masked node: {privacy.spoofedNodeName} ·{' '}
                  {privacy.spoofedTimezone}. Search any topic above (e.g. &ldquo;Linux&rdquo;,
                  &ldquo;Relativity&rdquo;) to read clean, tracker-free articles, or enter a URL.
                </p>
              </div>
            )}
          </div>

          {/* Bookmarks */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 block">
              Private Bookmarks & Security Audits
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEFAULT_BOOKMARKS.map((b) => (
                <button
                  key={b.url}
                  onClick={() => navigateTo(b.url, b.simulatedTrackers)}
                  className="p-3 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-white/10 cursor-pointer transition-colors text-left space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{b.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">{b.snippet}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Local History */}
          {history.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400">
                  {deviceSpace === 'ghost' ? 'Volatile RAM Tabs (Auto-Shred)' : 'Local History'}
                </span>
                <button
                  onClick={handleShredSession}
                  className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1">
                {history.slice(0, 5).map((url, idx) => (
                  <button
                    key={`${url}-${idx}`}
                    onClick={() => navigateTo(url, 3)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/50 hover:bg-slate-800/60 text-left text-[11px] font-mono text-slate-300 truncate cursor-pointer flex items-center gap-2 border border-white/5"
                  >
                    {deviceSpace === 'ghost' ? (
                      <EyeOff className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <span className="truncate">{url}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
