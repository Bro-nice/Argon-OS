import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Plus,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { DeviceSpace } from '../../types/os';
import { readSpaceData, writeSpaceData } from '../../utils/localVault';
import { triggerHaptic } from '../../utils/hardware';

interface KeyringAppProps {
  deviceSpace: DeviceSpace;
}

interface SecretEntry {
  id: string;
  service: string;
  username: string;
  secret: string;
  category: 'login' | 'ssh' | 'api' | 'recovery';
  updatedAt: string;
}

function generateCryptoSecret(length = 20, includeSymbols = true): string {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  const sym = '!@#$%^&*_-+=';
  const charset = lower + upper + nums + (includeSymbols ? sym : '');
  const bytes = new Uint32Array(length);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join('');
}

export const KeyringApp: React.FC<KeyringAppProps> = ({ deviceSpace }) => {
  const [entries, setEntries] = useState<SecretEntry[]>(() =>
    readSpaceData<SecretEntry[]>(deviceSpace, 'keyring_entries', [
      {
        id: 'k1',
        service: 'Local SSH Enclave Key',
        username: 'human@sovereign',
        secret: generateCryptoSecret(24, false),
        category: 'ssh',
        updatedAt: 'On-Device',
      },
    ])
  );

  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [genLength, setGenLength] = useState(20);
  const [genSymbols, setGenSymbols] = useState(true);
  const [generatedPass, setGeneratedPass] = useState(() => generateCryptoSecret(20, true));

  const [serviceInput, setServiceInput] = useState('');
  const [userInput, setUserInput] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<SecretEntry['category']>('login');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setEntries(readSpaceData<SecretEntry[]>(deviceSpace, 'keyring_entries', []));
    setRevealedIds({});
  }, [deviceSpace]);

  const persist = (next: SecretEntry[]) => {
    setEntries(next);
    writeSpaceData(deviceSpace, 'keyring_entries', next);
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceInput.trim() || !secretInput.trim()) return;
    triggerHaptic(15);
    const created: SecretEntry = {
      id: `key-${Date.now()}`,
      service: serviceInput.trim(),
      username: userInput.trim() || 'anonymous',
      secret: secretInput.trim(),
      category: categoryInput,
      updatedAt: new Date().toLocaleDateString(),
    };
    persist([created, ...entries]);
    setServiceInput('');
    setUserInput('');
    setSecretInput('');
  };

  const handleCopy = (id: string, val: string) => {
    navigator.clipboard?.writeText(val).catch(() => {});
    triggerHaptic(10);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filtered = entries.filter(
    (e) =>
      !search.trim() ||
      e.service.toLowerCase().includes(search.toLowerCase()) ||
      e.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col p-4 overflow-y-auto select-none space-y-4">
      <div className="max-w-3xl w-full mx-auto space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white">Local Keyring & Password Vault</h1>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            {deviceSpace === 'ghost' ? 'Ghost Partition' : 'Primary Enclave'}
          </span>
        </div>

        {/* Cryptographic Generator */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">Hardware CSPRNG Generator</span>
            <span className="font-mono text-cyan-400 tabular-nums">{genLength} chars</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-white/10 font-mono text-xs text-emerald-300 truncate select-text">
              {generatedPass}
            </div>
            <button
              onClick={() => setGeneratedPass(generateCryptoSecret(genLength, genSymbols))}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
              title="Regenerate"
            >
              <RefreshCw className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              onClick={() => handleCopy('gen', generatedPass)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
              title="Copy"
            >
              {copiedId === 'gen' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-slate-300" />
              )}
            </button>
            <button
              onClick={() => setSecretInput(generatedPass)}
              className="px-2.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs cursor-pointer"
            >
              Use
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 text-xs text-slate-400">
            <input
              type="range"
              min="12"
              max="40"
              value={genLength}
              onChange={(e) => {
                const len = parseInt(e.target.value, 10);
                setGenLength(len);
                setGeneratedPass(generateCryptoSecret(len, genSymbols));
              }}
              className="flex-1 accent-cyan-400 cursor-pointer"
            />
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={genSymbols}
                onChange={(e) => {
                  setGenSymbols(e.target.checked);
                  setGeneratedPass(generateCryptoSecret(genLength, e.target.checked));
                }}
                className="accent-cyan-400"
              />
              <span>Symbols</span>
            </label>
          </div>
        </div>

        {/* Add Secret Form */}
        <form
          onSubmit={handleSaveEntry}
          className="p-3.5 rounded-xl bg-slate-900 border border-white/10 grid grid-cols-1 sm:grid-cols-4 gap-2"
        >
          <input
            type="text"
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
            placeholder="Service (e.g. GitHub)"
            className="px-2.5 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Username / Email"
            className="px-2.5 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <input
            type="text"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            placeholder="Password or Secret Key"
            className="px-2.5 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <div className="flex gap-1.5">
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value as SecretEntry['category'])}
              className="px-2 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
            >
              <option value="login">Login</option>
              <option value="ssh">SSH</option>
              <option value="api">API</option>
              <option value="recovery">Recovery</option>
            </select>
            <button
              type="submit"
              className="flex-1 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Store</span>
            </button>
          </div>
        </form>

        {/* Search & Stored Vault */}
        <div className="space-y-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter stored keys..."
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">
                No secrets stored in this device space yet.
              </p>
            ) : (
              filtered.map((entry) => {
                const shown = Boolean(revealedIds[entry.id]);
                return (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl bg-slate-900 border border-white/10 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block">{entry.service}</span>
                      <span className="text-[11px] text-slate-400 font-mono block">
                        {entry.username} · {entry.category.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded bg-slate-950 border border-white/10 font-mono text-xs text-cyan-300 max-w-[180px] truncate select-text">
                        {shown ? entry.secret : '••••••••••••••••'}
                      </span>
                      <button
                        onClick={() =>
                          setRevealedIds((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))
                        }
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                        title={shown ? 'Hide' : 'Reveal'}
                      >
                        {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleCopy(entry.id, entry.secret)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                        title="Copy"
                      >
                        {copiedId === entry.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => persist(entries.filter((x) => x.id !== entry.id))}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
