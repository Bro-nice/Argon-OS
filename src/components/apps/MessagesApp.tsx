import React, { useState, useEffect } from 'react';
import { Send, ArrowLeft, ShieldCheck, Lock, Plus, Trash2 } from 'lucide-react';
import { DeviceSpace, MessageItem, ShieldStats } from '../../types/os';
import { readSpaceData, sanitizeTrackingUrl, writeSpaceData } from '../../utils/localVault';
import { recordBlockedEvent } from '../../utils/shieldEngine';
import { triggerHaptic } from '../../utils/hardware';

interface MessagesAppProps {
  deviceSpace: DeviceSpace;
  shieldStats: ShieldStats;
  onUpdateShieldStats: (stats: ShieldStats) => void;
}

interface ThreadItem {
  id: string;
  name: string;
  avatar: string;
  messages: MessageItem[];
}

const PRIMARY_THREADS: ThreadItem[] = [
  {
    id: 'c1',
    name: 'Alex Rivera',
    avatar: 'bg-cyan-500',
    messages: [
      {
        id: 'm1',
        contactId: 'c1',
        sender: 'contact',
        text: 'Hey! Did you enable Shield across all apps?',
        timestamp: '10:12 AM',
      },
      {
        id: 'm2',
        contactId: 'c1',
        sender: 'user',
        text: 'Yes—zero trackers leaving this device now.',
        timestamp: '10:14 AM',
      },
    ],
  },
  {
    id: 'c4',
    name: 'Argon OS Enclave',
    avatar: 'bg-emerald-600',
    messages: [
      {
        id: 'm5',
        contactId: 'c4',
        sender: 'contact',
        text: 'Local-only encrypted message partition active. Tracking parameters in links are automatically stripped.',
        timestamp: 'Today',
      },
    ],
  },
];

const GHOST_THREADS: ThreadItem[] = [
  {
    id: 'gc1',
    name: 'Anonymous Peer #409',
    avatar: 'bg-emerald-600',
    messages: [
      {
        id: 'gm1',
        contactId: 'gc1',
        sender: 'contact',
        text: 'Ghost Space peer tunnel verified. Zero cloud logs.',
        timestamp: 'Now',
      },
    ],
  },
];

export const MessagesApp: React.FC<MessagesAppProps> = ({
  deviceSpace,
  shieldStats,
  onUpdateShieldStats,
}) => {
  const [threads, setThreads] = useState<ThreadItem[]>(() =>
    readSpaceData<ThreadItem[]>(
      deviceSpace,
      'messages',
      deviceSpace === 'ghost' ? GHOST_THREADS : PRIMARY_THREADS
    )
  );
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sanitizedNote, setSanitizedNote] = useState<string | null>(null);
  const [creatingThread, setCreatingThread] = useState(false);
  const [newPeerName, setNewPeerName] = useState('');

  useEffect(() => {
    setThreads(
      readSpaceData<ThreadItem[]>(
        deviceSpace,
        'messages',
        deviceSpace === 'ghost' ? GHOST_THREADS : PRIMARY_THREADS
      )
    );
    setActiveThreadId(null);
  }, [deviceSpace]);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const handleCreateThread = () => {
    if (!newPeerName.trim()) return;
    const thread: ThreadItem = {
      id: `th-${Date.now()}`,
      name: newPeerName.trim(),
      avatar: 'bg-indigo-600',
      messages: [],
    };
    const next = [thread, ...threads];
    setThreads(next);
    writeSpaceData(deviceSpace, 'messages', next);
    setNewPeerName('');
    setCreatingThread(false);
    setActiveThreadId(thread.id);
  };

  const handleDeleteThread = (id: string) => {
    const next = threads.filter((t) => t.id !== id);
    setThreads(next);
    writeSpaceData(deviceSpace, 'messages', next);
    if (activeThreadId === id) setActiveThreadId(null);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeThreadId) return;
    triggerHaptic(15);

    let processedText = inputText.trim();
    const urlMatch = processedText.match(/https?:\/\/\S+/i);
    if (urlMatch) {
      const { cleanUrl, strippedParams } = sanitizeTrackingUrl(urlMatch[0]);
      if (strippedParams.length > 0) {
        processedText = processedText.replace(urlMatch[0], cleanUrl);
        const nextStats = recordBlockedEvent(
          deviceSpace,
          shieldStats,
          'messages',
          'Messages',
          `url-param:${strippedParams.join(',')}`,
          'tracker',
          65
        );
        onUpdateShieldStats(nextStats);
        setSanitizedNote(`Stripped tracking tags: ${strippedParams.join(', ')}`);
        setTimeout(() => setSanitizedNote(null), 3000);
      }
    }

    const newMessage: MessageItem = {
      id: Date.now().toString(),
      contactId: activeThreadId,
      sender: 'user',
      text: processedText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextThreads = threads.map((t) =>
      t.id === activeThreadId ? { ...t, messages: [...t.messages, newMessage] } : t
    );
    setThreads(nextThreads);
    writeSpaceData(deviceSpace, 'messages', nextThreads);
    setInputText('');
  };

  return (
    <div className="flex-1 w-full h-full bg-[#0b0f17] text-white flex flex-col select-none overflow-hidden">
      {!activeThread ? (
        <div className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h1 className="text-base font-bold text-white">
              {deviceSpace === 'ghost' ? 'Ghost Messages' : 'Messages'}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Link Shield
              </span>
              <button
                onClick={() => setCreatingThread(!creatingThread)}
                className="min-h-[32px] px-2.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>
          </div>

          {creatingThread && (
            <div className="p-3 rounded-2xl bg-slate-900 border border-cyan-500/30 flex gap-2">
              <input
                type="text"
                value={newPeerName}
                onChange={(e) => setNewPeerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateThread()}
                placeholder="Recipient or peer name..."
                className="flex-1 min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
              />
              <button
                onClick={handleCreateThread}
                className="min-h-[38px] px-3.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Start
              </button>
            </div>
          )}

          <div className="space-y-2">
            {threads.map((thread) => {
              const lastMsg = thread.messages[thread.messages.length - 1];
              return (
                <div
                  key={thread.id}
                  onClick={() => {
                    triggerHaptic(10);
                    setActiveThreadId(thread.id);
                  }}
                  className="p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-800 border border-white/5 flex items-center gap-3 cursor-pointer transition-all"
                >
                  <div
                    className={`w-10 h-10 rounded-full ${thread.avatar} text-white font-bold text-sm flex items-center justify-center shrink-0`}
                  >
                    {thread.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{thread.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{lastMsg?.timestamp || 'New'}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {lastMsg?.text || 'Empty local conversation'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteThread(thread.id);
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full max-w-2xl mx-auto w-full">
          <div className="p-3 bg-slate-900/90 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveThreadId(null)}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="text-xs font-bold text-white block">{activeThread.name}</span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Stored Locally on Device
                </span>
              </div>
            </div>
          </div>

          {sanitizedNote && (
            <div className="mx-3 mt-2 px-3 py-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-[11px] text-orange-200">
              {sanitizedNote}
            </div>
          )}

          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            {activeThread.messages.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                Send a message stored strictly on this device.
              </p>
            ) : (
              activeThread.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-cyan-600 text-white rounded-br-none'
                        : 'bg-slate-900 border border-white/10 text-slate-100 rounded-bl-none'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 font-mono">{m.timestamp}</span>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-slate-900/90 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Encrypted local message (links auto-cleaned)..."
              className="flex-1 min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="min-h-[40px] min-w-[40px] rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4 fill-slate-950" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
