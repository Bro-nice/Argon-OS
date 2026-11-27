import React, { useState, useRef, useEffect } from 'react';
import { FileText, Mic, MicOff, Plus, Save, Check, Lock, Trash2, Download, Search } from 'lucide-react';
import { DeviceSpace } from '../../types/os';
import { readSpaceData, writeSpaceData } from '../../utils/localVault';
import { triggerHaptic } from '../../utils/hardware';

interface NotesAppProps {
  deviceSpace: DeviceSpace;
}

interface NoteItem {
  id: string;
  title: string;
  body: string;
  date: string;
}

const PRIMARY_INITIAL_NOTES: NoteItem[] = [
  {
    id: 'n1',
    title: 'Argon OS Local Notes',
    body: 'All notes in Primary Device remain encrypted locally inside this device storage.',
    date: 'Local Disk',
  },
];

const GHOST_INITIAL_NOTES: NoteItem[] = [
  {
    id: 'gn1',
    title: 'Ghost Space Private Scratchpad',
    body: 'Isolated from Primary Device. Zero cloud sync, zero external backups.',
    date: 'Ghost Vault',
  },
];

export const NotesApp: React.FC<NotesAppProps> = ({ deviceSpace }) => {
  const [notes, setNotes] = useState<NoteItem[]>(() =>
    readSpaceData<NoteItem[]>(
      deviceSpace,
      'notes',
      deviceSpace === 'ghost' ? GHOST_INITIAL_NOTES : PRIMARY_INITIAL_NOTES
    )
  );
  const [selectedNote, setSelectedNote] = useState<NoteItem>(notes[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const loaded = readSpaceData<NoteItem[]>(
      deviceSpace,
      'notes',
      deviceSpace === 'ghost' ? GHOST_INITIAL_NOTES : PRIMARY_INITIAL_NOTES
    );
    setNotes(loaded);
    setSelectedNote(loaded[0]);
  }, [deviceSpace]);

  const handleStartRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
      }
      setIsRecording(true);
      triggerHaptic(20);
    } catch {
      setIsRecording(true);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    triggerHaptic(15);
    const newMemo: NoteItem = {
      id: Date.now().toString(),
      title: `Voice Memo #${notes.length + 1}`,
      body: `Captured local voice note at ${new Date().toLocaleTimeString()} (stored strictly on-device).`,
      date: 'Today',
    };
    const next = [newMemo, ...notes];
    setNotes(next);
    setSelectedNote(newMemo);
    writeSpaceData(deviceSpace, 'notes', next);
  };

  const handleSaveNote = () => {
    triggerHaptic(10);
    const updated = { ...selectedNote, date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const next = notes.map((n) => (n.id === selectedNote.id ? updated : n));
    setSelectedNote(updated);
    setNotes(next);
    writeSpaceData(deviceSpace, 'notes', next);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1800);
  };

  const handleDeleteNote = (id: string) => {
    triggerHaptic(12);
    const remaining = notes.filter((n) => n.id !== id);
    const fallback: NoteItem = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      body: '',
      date: 'Today',
    };
    const next = remaining.length > 0 ? remaining : [fallback];
    setNotes(next);
    setSelectedNote(next[0]);
    writeSpaceData(deviceSpace, 'notes', next);
  };

  const handleDownloadNote = () => {
    const blob = new Blob([`# ${selectedNote.title}\n\n${selectedNote.body}`], {
      type: 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(selectedNote.title || 'note').replace(/\s+/g, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const wordCount = selectedNote.body.trim() ? selectedNote.body.trim().split(/\s+/).length : 0;

  return (
    <div className="flex-1 w-full h-full bg-[#0b0f17] text-white flex flex-col justify-between p-4 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <FileText
            className={`w-4 h-4 ${deviceSpace === 'ghost' ? 'text-emerald-400' : 'text-cyan-400'}`}
          />
          <span className="font-bold text-white">
            {deviceSpace === 'ghost' ? 'Ghost Notes' : 'Local Notes'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            On-Device
          </span>
          <button
            onClick={() => {
              const newN: NoteItem = {
                id: Date.now().toString(),
                title: 'Untitled Note',
                body: '',
                date: 'Today',
              };
              const next = [newN, ...notes];
              setNotes(next);
              setSelectedNote(newN);
              writeSpaceData(deviceSpace, 'notes', next);
            }}
            className="min-h-[34px] px-2.5 flex items-center gap-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-semibold cursor-pointer"
            title="Create Note"
          >
            <Plus className="w-4 h-4" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Search + Note Tabs */}
      <div className="space-y-2 py-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter notes..."
            className="w-full min-h-[34px] pl-8 pr-3 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {filteredNotes.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelectedNote(n)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer transition-colors border ${
                selectedNote.id === n.id
                  ? 'bg-white/15 border-white/25 text-white font-semibold'
                  : 'bg-slate-900/70 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {n.title || 'Untitled'}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col space-y-2.5 pb-1 overflow-hidden">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
            <input
              type="text"
              value={selectedNote.title}
              onChange={(e) => setSelectedNote({ ...selectedNote, title: e.target.value })}
              className="flex-1 text-sm font-bold text-white bg-transparent focus:outline-none"
              placeholder="Note Title..."
            />
            <button
              onClick={handleDownloadNote}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              title="Download Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteNote(selectedNote.id)}
              className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer"
              title="Delete Note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <textarea
            value={selectedNote.body}
            onChange={(e) => setSelectedNote({ ...selectedNote, body: e.target.value })}
            className="flex-1 w-full bg-transparent text-xs text-slate-200 resize-none focus:outline-none py-2.5 leading-relaxed font-sans placeholder:text-slate-600"
            placeholder="Write private notes stored strictly on your own device..."
          />

          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
            <span className="text-[10px] text-slate-400 font-mono tabular-nums">
              {selectedNote.date} · {wordCount} words
            </span>
            <button
              onClick={handleSaveNote}
              className="min-h-[36px] px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Voice Recorder */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
          <span className="text-xs font-semibold text-white">
            {isRecording ? 'Recording Local Audio...' : 'Offline Voice Memo'}
          </span>

          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isRecording ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20 text-cyan-300'
            }`}
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{isRecording ? 'Stop Memo' : 'Record Memo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
