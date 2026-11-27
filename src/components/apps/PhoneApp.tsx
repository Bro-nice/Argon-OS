import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneOff,
  Users,
  Clock,
  Delete,
  Mic,
  MicOff,
  Volume2,
  Grid,
  Plus,
  Trash2,
} from 'lucide-react';
import { ContactItem, DeviceSpace } from '../../types/os';
import { playDtmfTone, triggerHaptic } from '../../utils/hardware';
import { readSpaceData, writeSpaceData } from '../../utils/localVault';

const INITIAL_CONTACTS: ContactItem[] = [
  { id: 'c1', name: 'Alex Rivera', phone: '+1 (415) 890-2134', avatarColor: 'bg-cyan-500', isFavorite: true },
  { id: 'c2', name: 'Maya Lin', phone: '+1 (650) 412-9876', avatarColor: 'bg-emerald-500', isFavorite: true },
  { id: 'c3', name: 'Kernel Core Team', phone: '+1 (800) 555-0199', avatarColor: 'bg-indigo-500' },
];

interface CallLogItem {
  id: string;
  target: string;
  time: string;
  duration: string;
  type: 'outgoing' | 'incoming' | 'missed';
}

interface PhoneAppProps {
  deviceSpace?: DeviceSpace;
  onStartCall?: (number: string) => void;
  onEndCall?: () => void;
  isCallActive?: boolean;
}

export const PhoneApp: React.FC<PhoneAppProps> = ({
  deviceSpace = 'primary',
  onStartCall,
  onEndCall,
  isCallActive = false,
}) => {
  const [activeTab, setActiveTab] = useState<'keypad' | 'recents' | 'contacts'>('keypad');
  const [dialedNumber, setDialedNumber] = useState('');
  const [inCall, setInCall] = useState(isCallActive);
  const [activeTarget, setActiveTarget] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  const [contacts, setContacts] = useState<ContactItem[]>(() =>
    readSpaceData<ContactItem[]>(deviceSpace, 'phone_contacts', INITIAL_CONTACTS)
  );
  const [recents, setRecents] = useState<CallLogItem[]>(() =>
    readSpaceData<CallLogItem[]>(deviceSpace, 'phone_recents', [
      { id: 'r1', target: 'Alex Rivera', time: '10:14 AM', type: 'incoming', duration: '4m 12s' },
    ])
  );
  const [searchContact, setSearchContact] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    if (!inCall) {
      setCallDuration(0);
      return;
    }
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [inCall]);

  const handleKeyClick = (key: string) => {
    playDtmfTone(key, 120);
    setDialedNumber((prev) => prev + key);
  };

  const handleDelete = () => {
    triggerHaptic(10);
    setDialedNumber((prev) => prev.slice(0, -1));
  };

  const handleStartCall = (numberToCall?: string) => {
    const num = numberToCall || dialedNumber;
    if (!num) return;
    triggerHaptic([30, 40]);
    setActiveTarget(num);
    setInCall(true);
    if (onStartCall) onStartCall(num);
  };

  const handleHangUp = () => {
    triggerHaptic([20, 20]);
    const entry: CallLogItem = {
      id: Date.now().toString(),
      target: activeTarget || dialedNumber || 'Unknown',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: formatCallTime(callDuration),
      type: 'outgoing',
    };
    const nextRecents = [entry, ...recents].slice(0, 30);
    setRecents(nextRecents);
    writeSpaceData(deviceSpace, 'phone_recents', nextRecents);
    setInCall(false);
    if (onEndCall) onEndCall();
  };

  const handleAddContact = () => {
    if (!newName.trim() || !newPhone.trim()) return;
    const item: ContactItem = {
      id: Date.now().toString(),
      name: newName.trim(),
      phone: newPhone.trim(),
      avatarColor: 'bg-cyan-600',
    };
    const next = [item, ...contacts];
    setContacts(next);
    writeSpaceData(deviceSpace, 'phone_contacts', next);
    setNewName('');
    setNewPhone('');
    setAddingContact(false);
  };

  const handleDeleteContact = (id: string) => {
    const next = contacts.filter((c) => c.id !== id);
    setContacts(next);
    writeSpaceData(deviceSpace, 'phone_contacts', next);
  };

  const formatCallTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex-1 w-full h-full bg-[#0b0f17] text-white flex flex-col justify-between p-4 select-none overflow-hidden">
      {inCall ? (
        <div className="flex-1 flex flex-col items-center justify-between py-10">
          <div className="text-center space-y-2">
            <div className="w-24 h-24 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 mx-auto flex items-center justify-center text-3xl font-bold shadow-2xl">
              {(activeTarget || dialedNumber || 'U')[0]}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {activeTarget || dialedNumber || 'Active Call'}
            </h2>
            <p className="text-sm font-mono text-emerald-400 tabular-nums">
              Connected · {formatCallTime(callDuration)}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 w-full max-w-xs">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto cursor-pointer ${
                isMuted ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsSpeaker(!isSpeaker)}
              className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto cursor-pointer ${
                isSpeaker ? 'bg-cyan-500 text-slate-950' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setInCall(false)}
              className="w-14 h-14 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center mx-auto cursor-pointer"
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleHangUp}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl active:scale-90 cursor-pointer"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full">
          {activeTab === 'keypad' && (
            <div className="flex-1 flex flex-col justify-between py-2">
              <div className="min-h-[60px] flex items-center justify-center relative px-6">
                <span className="text-3xl font-bold tracking-wider text-white tabular-nums truncate">
                  {dialedNumber || ''}
                </span>
                {dialedNumber && (
                  <button
                    onClick={handleDelete}
                    className="absolute right-4 p-2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <Delete className="w-6 h-6" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 w-full max-w-xs mx-auto my-auto">
                {[
                  { key: '1', letters: '' },
                  { key: '2', letters: 'ABC' },
                  { key: '3', letters: 'DEF' },
                  { key: '4', letters: 'GHI' },
                  { key: '5', letters: 'JKL' },
                  { key: '6', letters: 'MNO' },
                  { key: '7', letters: 'PQRS' },
                  { key: '8', letters: 'TUV' },
                  { key: '9', letters: 'WXYZ' },
                  { key: '*', letters: '' },
                  { key: '0', letters: '+' },
                  { key: '#', letters: '' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleKeyClick(item.key)}
                    className="w-16 h-16 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 flex flex-col items-center justify-center mx-auto active:scale-90 cursor-pointer"
                  >
                    <span className="text-2xl font-bold leading-none">{item.key}</span>
                    {item.letters && (
                      <span className="text-[8px] text-slate-400 font-mono tracking-widest mt-0.5">
                        {item.letters}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => handleStartCall()}
                  disabled={!dialedNumber}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-slate-950 flex items-center justify-center shadow-xl active:scale-90 cursor-pointer"
                >
                  <Phone className="w-7 h-7 fill-slate-950" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="flex-1 flex flex-col overflow-y-auto space-y-3 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h2 className="text-base font-bold text-white">Contacts</h2>
                <button
                  onClick={() => setAddingContact(!addingContact)}
                  className="min-h-[32px] px-2.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {addingContact && (
                <div className="p-3 rounded-2xl bg-slate-900 border border-cyan-500/30 space-y-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contact name..."
                    className="w-full min-h-[36px] px-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Phone number..."
                    className="w-full min-h-[36px] px-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                  />
                  <button
                    onClick={handleAddContact}
                    className="w-full min-h-[36px] rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Save Contact
                  </button>
                </div>
              )}

              <input
                type="text"
                value={searchContact}
                onChange={(e) => setSearchContact(e.target.value)}
                placeholder="Search contacts..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />

              <div className="space-y-1.5 overflow-y-auto">
                {contacts
                  .filter((c) => c.name.toLowerCase().includes(searchContact.toLowerCase()))
                  .map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => handleStartCall(contact.phone)}
                      className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-white/5 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full ${contact.avatarColor} text-white font-bold text-xs flex items-center justify-center`}
                        >
                          {contact.name[0]}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">{contact.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{contact.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-emerald-400" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContact(contact.id);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'recents' && (
            <div className="flex-1 flex flex-col space-y-2 pt-2 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h2 className="text-base font-bold text-white">Recent Calls</h2>
                {recents.length > 0 && (
                  <button
                    onClick={() => {
                      setRecents([]);
                      writeSpaceData(deviceSpace, 'phone_recents', []);
                    }}
                    className="text-xs text-rose-400 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              {recents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No recent calls logged.</p>
              ) : (
                recents.map((call) => (
                  <div
                    key={call.id}
                    onClick={() => handleStartCall(call.target)}
                    className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-white/5 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{call.target}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {call.time} · {call.duration}
                      </span>
                    </div>
                    <Phone className="w-4 h-4 text-cyan-400" />
                  </div>
                ))
              )}
            </div>
          )}

          <div className="pt-3 border-t border-white/10 flex items-center justify-around text-xs">
            <button
              onClick={() => setActiveTab('recents')}
              className={`flex flex-col items-center gap-1 cursor-pointer ${
                activeTab === 'recents' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Recents</span>
            </button>
            <button
              onClick={() => setActiveTab('keypad')}
              className={`flex flex-col items-center gap-1 cursor-pointer ${
                activeTab === 'keypad' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Keypad</span>
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex flex-col items-center gap-1 cursor-pointer ${
                activeTab === 'contacts' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Contacts</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
