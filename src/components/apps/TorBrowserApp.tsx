import React, { useState } from 'react';
import {
  Orbit,
  RefreshCw,
  Shield,
  Lock,
  Flame,
  ArrowRight,
  ExternalLink,
  BookOpen,
  WifiOff,
} from 'lucide-react';
import { DeviceSpace, PrivacyProfile } from '../../types/os';
import { triggerHaptic } from '../../utils/hardware';

interface TorBrowserAppProps {
  deviceSpace: DeviceSpace;
  privacy: PrivacyProfile;
  onRotateIdentity: () => void;
}

interface OnionRelay {
  role: string;
  country: string;
  ipAlias: string;
}

interface ReaderArticle {
  title: string;
  description?: string;
  extract: string;
  sourceUrl?: string;
}

const GUARD_NODES: OnionRelay[] = [
  { role: 'Guard Relay', country: 'Switzerland', ipAlias: '185.220.101.xx' },
  { role: 'Guard Relay', country: 'Iceland', ipAlias: '193.218.118.xx' },
  { role: 'Guard Relay', country: 'Sweden', ipAlias: '192.42.116.xx' },
];

const MIDDLE_NODES: OnionRelay[] = [
  { role: 'Middle Relay', country: 'Germany', ipAlias: '176.10.99.xx' },
  { role: 'Middle Relay', country: 'Netherlands', ipAlias: '109.70.100.xx' },
  { role: 'Middle Relay', country: 'Austria', ipAlias: '185.100.87.xx' },
];

const EXIT_NODES: OnionRelay[] = [
  { role: 'Exit Node', country: 'Norway', ipAlias: '51.15.43.xx' },
  { role: 'Exit Node', country: 'Luxembourg', ipAlias: '199.249.230.xx' },
  { role: 'Exit Node', country: 'Canada', ipAlias: '198.96.155.xx' },
];

function buildCircuit(): OnionRelay[] {
  const pick = (arr: OnionRelay[]) => arr[Math.floor(Math.random() * arr.length)];
  return [pick(GUARD_NODES), pick(MIDDLE_NODES), pick(EXIT_NODES)];
}

export const TorBrowserApp: React.FC<TorBrowserAppProps> = ({
  deviceSpace,
  privacy,
  onRotateIdentity,
}) => {
  const [circuit, setCircuit] = useState<OnionRelay[]>(() => buildCircuit());
  const [securityLevel, setSecurityLevel] = useState<'Standard' | 'Safer' | 'Safest'>('Safer');
  const [urlInput, setUrlInput] = useState('https://check.torproject.org');
  const [isLoading, setIsLoading] = useState(false);
  const [article, setArticle] = useState<ReaderArticle | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(
    'Tor circuit verified. Zero browsing history written to disk.'
  );

  const handleNewCircuit = () => {
    triggerHaptic(15);
    setCircuit(buildCircuit());
    setStatusNotice('Built a new 3-hop encrypted Onion circuit.');
  };

  const handleNewIdentity = () => {
    triggerHaptic([20, 30]);
    onRotateIdentity();
    setCircuit(buildCircuit());
    setArticle(null);
    setUrlInput('https://check.torproject.org');
    setStatusNotice('New Tor Identity: RAM session shredded & hardware fingerprint rotated.');
  };

  const handleNavigate = async (queryTarget: string) => {
    const q = queryTarget.trim();
    if (!q) return;
    setUrlInput(q);

    if (q.includes('torproject.org') || q.endsWith('.onion')) {
      setArticle(null);
      setStatusNotice(
        `Connected through ${circuit[0].country} → ${circuit[1].country} → ${circuit[2].country} (${securityLevel} mode).`
      );
      return;
    }

    if (privacy.localOnlyAirGap || deviceSpace === 'ghost') {
      setArticle(null);
      setStatusNotice(
        'Device Air-Gap active: external lookups quarantined locally.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const cleanTerm = q.replace(/^https?:\/\//, '').split('/')[0].split('.')[0];
      const res = await fetch(`/api/os/browse?q=${encodeURIComponent(cleanTerm || q)}`);
      if (!res.ok) throw new Error('Relay unavailable');
      const data = await res.json();
      if (data.found) {
        setArticle({
          title: data.title,
          description: data.description,
          extract: data.extract,
          sourceUrl: data.sourceUrl,
        });
        setStatusNotice(`Fetched sanitized reader summary via Tor ${securityLevel} sandbox.`);
      } else {
        setArticle(null);
        setStatusNotice(`No public entry matched "${q}".`);
      }
    } catch {
      setArticle(null);
      setStatusNotice('Tor lookup bridge unreachable right now.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full h-full bg-[#130d1d] text-white flex flex-col select-none overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 bg-[#1c132b] border-b border-purple-500/25 space-y-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/25 border border-purple-400/40 flex items-center justify-center">
              <Orbit className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Tor Browser</h1>
              <span className="text-[10px] font-mono text-purple-300">
                Onion Routing · Ephemeral RAM Session
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleNewCircuit}
              className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-xs text-purple-200 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>New Circuit</span>
            </button>
            <button
              onClick={handleNewIdentity}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-xs text-rose-200 flex items-center gap-1 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>New Identity</span>
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNavigate(urlInput);
          }}
          className="flex items-center gap-2"
        >
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/50 border border-purple-500/30">
            <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter .onion address or search privately..."
              className="flex-1 bg-transparent text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white cursor-pointer"
          >
            {isLoading ? 'Routing...' : 'Go'}
          </button>
        </form>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {statusNotice && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-400/25 text-xs text-purple-200 flex items-center gap-2">
              {privacy.localOnlyAirGap ? (
                <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Shield className="w-4 h-4 text-purple-300 shrink-0" />
              )}
              <span>{statusNotice}</span>
            </div>
          )}

          {/* 3-Hop Onion Circuit Visualizer */}
          <div className="p-4 rounded-2xl bg-[#191126] border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-purple-200">Active 3-Hop Onion Circuit</span>
              <span className="font-mono text-[10px] text-slate-400">
                Node Alias: {privacy.spoofedNodeName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {circuit.map((hop, idx) => (
                <div
                  key={`${hop.role}-${idx}`}
                  className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-mono text-purple-300 block">
                      HOP {idx + 1} · {hop.role.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-white">{hop.country}</span>
                    <span className="text-[10px] font-mono text-slate-400 block">{hop.ipAlias}</span>
                  </div>
                  {idx < 2 && <ArrowRight className="w-3.5 h-3.5 text-purple-400 hidden sm:block" />}
                </div>
              ))}
            </div>
          </div>

          {/* Security Level */}
          <div className="p-4 rounded-2xl bg-[#191126] border border-purple-500/20 space-y-2">
            <span className="text-xs font-bold text-white block">Tor Security Level</span>
            <div className="grid grid-cols-3 gap-2">
              {(['Standard', 'Safer', 'Safest'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSecurityLevel(lvl)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                    securityLevel === lvl
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {article ? (
            <div className="p-5 rounded-2xl bg-[#1b1329] border border-purple-400/25 space-y-3">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-purple-300">
                <BookOpen className="w-3.5 h-3.5" />
                <span>SANITIZED TOR READER</span>
              </div>
              <h2 className="text-lg font-bold text-white">{article.title}</h2>
              <p className="text-sm text-slate-200 leading-relaxed select-text">{article.extract}</p>
              {article.sourceUrl && (
                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-purple-300 hover:underline"
                >
                  <span>External Reference</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  name: 'Tor Project Onion Status',
                  target: 'Tor (network)',
                  desc: 'Learn how multi-hop onion routing prevents traffic correlation.',
                },
                {
                  name: 'DuckDuckGo Privacy Search',
                  target: 'DuckDuckGo',
                  desc: 'Explore anonymous search architecture without user profiling.',
                },
              ].map((b) => (
                <button
                  key={b.name}
                  onClick={() => handleNavigate(b.target)}
                  className="p-3.5 rounded-xl bg-[#191126] hover:bg-[#221734] border border-purple-500/20 text-left cursor-pointer space-y-1"
                >
                  <span className="text-xs font-bold text-white block">{b.name}</span>
                  <span className="text-[11px] text-slate-400 block">{b.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
