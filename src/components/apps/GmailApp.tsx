import React, { useState } from 'react';
import {
  Mail,
  Inbox,
  Send,
  Star,
  Trash2,
  Plus,
  Search,
  ShieldAlert,
  FileEdit,
  X,
} from 'lucide-react';
import { DeviceSpace } from '../../types/os';
import { readSpaceData, writeSpaceData } from '../../utils/localVault';
import { triggerHaptic } from '../../utils/hardware';

interface GmailAppProps {
  deviceSpace: DeviceSpace;
}

interface LocalMailItem {
  id: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash';
  from: string;
  to: string;
  subject: string;
  body: string;
  time: string;
  starred: boolean;
  read: boolean;
}

const DEFAULT_LOCAL_MAILS: LocalMailItem[] = [
  {
    id: 'mail-1',
    folder: 'inbox',
    from: 'Argon OS Security Enclave <enclave@argonos.local>',
    to: 'local-user@argonos.local',
    subject: 'Local-Only Mail Sandbox Active',
    body: 'External Gmail account connection is currently disabled per your preference. You can write, organize, star, and store local messages & drafts strictly on your own device with zero external transmission.',
    time: 'Today',
    starred: true,
    read: false,
  },
];

export const GmailApp: React.FC<GmailAppProps> = ({ deviceSpace }) => {
  const [mails, setMails] = useState<LocalMailItem[]>(() =>
    readSpaceData<LocalMailItem[]>(deviceSpace, 'local_gmail_items', DEFAULT_LOCAL_MAILS)
  );
  const [folder, setFolder] = useState<'inbox' | 'starred' | 'sent' | 'drafts' | 'trash'>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(mails[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [composing, setComposing] = useState(false);
  const [toInput, setToInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [bodyInput, setBodyInput] = useState('');

  const persist = (next: LocalMailItem[]) => {
    setMails(next);
    writeSpaceData(deviceSpace, 'local_gmail_items', next);
  };

  const visibleMails = mails.filter((m) => {
    const matchesFolder =
      folder === 'starred' ? m.starred && m.folder !== 'trash' : m.folder === folder;
    if (!matchesFolder) return false;
    const q = search.trim().toLowerCase();
    return (
      !q ||
      m.subject.toLowerCase().includes(q) ||
      m.from.toLowerCase().includes(q) ||
      m.body.toLowerCase().includes(q)
    );
  });

  const activeMail = mails.find((m) => m.id === selectedId) || visibleMails[0] || null;

  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    persist(mails.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)));
  };

  const handleMoveToTrash = (id: string) => {
    triggerHaptic(12);
    const target = mails.find((m) => m.id === id);
    if (!target) return;
    if (target.folder === 'trash') {
      persist(mails.filter((m) => m.id !== id));
    } else {
      persist(mails.map((m) => (m.id === id ? { ...m, folder: 'trash' } : m)));
    }
    if (selectedId === id) setSelectedId(null);
  };

  const handleSaveLocal = (targetFolder: 'sent' | 'drafts') => {
    if (!subjectInput.trim() && !bodyInput.trim()) return;
    triggerHaptic(15);
    const item: LocalMailItem = {
      id: `mail-${Date.now()}`,
      folder: targetFolder,
      from: 'local-user@argonos.local',
      to: toInput.trim() || 'local-archive@argonos.local',
      subject: subjectInput.trim() || '(No Subject)',
      body: bodyInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      starred: false,
      read: true,
    };
    const next = [item, ...mails];
    persist(next);
    setSelectedId(item.id);
    setFolder(targetFolder);
    setComposing(false);
    setToInput('');
    setSubjectInput('');
    setBodyInput('');
  };

  return (
    <div className="flex-1 w-full h-full bg-[#0c1018] text-white flex flex-col select-none overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/95 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center">
            <Mail className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Gmail</h1>
            <span className="text-[10px] font-mono text-amber-300">
              Offline Enclave Mode · External Gmail Sync Disabled
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search local mail..."
              className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none w-32 sm:w-44"
            />
          </div>
          <button
            onClick={() => setComposing(true)}
            className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Compose</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/25 flex items-center gap-2 text-[11px] text-amber-200 shrink-0">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          Gmail cloud authorization was declined. Operating strictly as an on-device encrypted mail & draft archive inside{' '}
          {deviceSpace === 'ghost' ? 'Ghost Device' : 'Primary Device'}.
        </span>
      </div>

      {/* Main Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-36 sm:w-44 border-r border-white/10 bg-slate-950/60 p-2 space-y-1 shrink-0">
          {(
            [
              { id: 'inbox', label: 'Inbox', icon: Inbox },
              { id: 'starred', label: 'Starred', icon: Star },
              { id: 'sent', label: 'Outbox / Sent', icon: Send },
              { id: 'drafts', label: 'Drafts', icon: FileEdit },
              { id: 'trash', label: 'Trash', icon: Trash2 },
            ] as const
          ).map((f) => {
            const Icon = f.icon;
            const count =
              f.id === 'starred'
                ? mails.filter((m) => m.starred && m.folder !== 'trash').length
                : mails.filter((m) => m.folder === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => setFolder(f.id)}
                className={`w-full px-2.5 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  folder === f.id
                    ? 'bg-red-500/15 text-red-200 font-semibold border border-red-500/30'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{f.label}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Thread List */}
        <div className="w-56 sm:w-72 border-r border-white/10 overflow-y-auto divide-y divide-white/5 shrink-0">
          {visibleMails.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No messages in {folder}.</div>
          ) : (
            visibleMails.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedId(m.id);
                  if (!m.read) {
                    persist(mails.map((x) => (x.id === m.id ? { ...x, read: true } : x)));
                  }
                }}
                className={`w-full p-3 text-left cursor-pointer transition-colors space-y-1 ${
                  activeMail?.id === m.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white truncate">{m.subject}</span>
                  <button
                    onClick={(e) => handleToggleStar(m.id, e)}
                    className="text-slate-400 hover:text-amber-400 cursor-pointer shrink-0"
                  >
                    <Star className={`w-3.5 h-3.5 ${m.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{m.from}</p>
                <p className="text-[11px] text-slate-500 truncate">{m.body}</p>
              </button>
            ))
          )}
        </div>

        {/* Reader */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeMail ? (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-white">{activeMail.subject}</h2>
                  <p className="text-xs text-slate-300">From: {activeMail.from}</p>
                  <p className="text-[11px] text-slate-400">
                    To: {activeMail.to} · {activeMail.time}
                  </p>
                </div>
                <button
                  onClick={() => handleMoveToTrash(activeMail.id)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 cursor-pointer"
                  title={activeMail.folder === 'trash' ? 'Delete Permanently' : 'Move to Trash'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                {activeMail.body}
              </p>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Select a local message or click Compose to create an encrypted draft.
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {composing && (
        <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/15 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-white">New Local Draft / Archive</span>
              <button
                onClick={() => setComposing(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                placeholder="To (stored locally only)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-red-400"
              />
              <input
                type="text"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                placeholder="Subject"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-red-400"
              />
              <textarea
                rows={6}
                value={bodyInput}
                onChange={(e) => setBodyInput(e.target.value)}
                placeholder="Write local note or message..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-red-400 resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => handleSaveLocal('drafts')}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleSaveLocal('sent')}
                  className="px-3.5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-xs font-bold text-white cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Save to Outbox</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
