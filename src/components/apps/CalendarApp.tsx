import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, Check } from 'lucide-react';
import { DeviceSpace } from '../../types/os';
import { readSpaceData, writeSpaceData } from '../../utils/localVault';
import { triggerHaptic } from '../../utils/hardware';

interface CalendarAppProps {
  deviceSpace: DeviceSpace;
}

interface CalendarEvent {
  id: string;
  dateKey: string; // YYYY-MM-DD
  time: string;
  title: string;
  completed: boolean;
}

const formatKey = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export const CalendarApp: React.FC<CalendarAppProps> = ({ deviceSpace }) => {
  const today = new Date();
  const todayKey = formatKey(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    readSpaceData<CalendarEvent[]>(deviceSpace, 'calendar_events', [
      {
        id: 'ev1',
        dateKey: todayKey,
        time: '10:00',
        title: 'Deep Work Block — Local Systems Architecture',
        completed: false,
      },
      {
        id: 'ev2',
        dateKey: todayKey,
        time: '17:30',
        title: 'Outdoor Movement & Screen Break',
        completed: false,
      },
    ])
  );
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('14:00');

  useEffect(() => {
    setEvents(readSpaceData<CalendarEvent[]>(deviceSpace, 'calendar_events', []));
  }, [deviceSpace]);

  const persist = (next: CalendarEvent[]) => {
    setEvents(next);
    writeSpaceData(deviceSpace, 'calendar_events', next);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    triggerHaptic(15);
    const created: CalendarEvent = {
      id: `ev-${Date.now()}`,
      dateKey: selectedKey,
      time: newTime || '09:00',
      title: newTitle.trim(),
      completed: false,
    };
    persist([...events, created].sort((a, b) => a.time.localeCompare(b.time)));
    setNewTitle('');
  };

  const handleToggle = (id: string) => {
    persist(events.map((ev) => (ev.id === id ? { ...ev, completed: !ev.completed } : ev)));
  };

  const handleDelete = (id: string) => {
    persist(events.filter((ev) => ev.id !== id));
  };

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  });

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const selectedEvents = events.filter((ev) => ev.dateKey === selectedKey);

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col md:flex-row overflow-hidden select-none">
      {/* Monthly Grid */}
      <div className="flex-1 p-4 flex flex-col space-y-3 overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-cyan-400" />
            <h1 className="text-sm font-bold text-white">{monthLabel}</h1>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                setSelectedKey(todayKey);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => shiftMonth(-1)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => shiftMonth(1)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-mono text-slate-400">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 flex-1">
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div key={`pad-${idx}`} className="rounded-lg bg-slate-900/20" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1;
            const key = formatKey(viewYear, viewMonth, day);
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const dayEvents = events.filter((e) => e.dateKey === key);

            return (
              <button
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`min-h-[54px] p-1.5 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-white'
                    : isToday
                    ? 'bg-slate-900 border-emerald-500/50 text-white'
                    : 'bg-slate-900/60 border-white/5 hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                <span className="text-xs font-mono font-bold tabular-nums">{day}</span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-mono text-cyan-300 truncate">
                    {dayEvents.length} item{dayEvents.length > 1 ? 's' : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Agenda Panel */}
      <aside className="w-full md:w-80 bg-slate-900/70 border-t md:border-t-0 md:border-l border-white/10 p-4 flex flex-col space-y-3 overflow-y-auto">
        <div>
          <span className="text-[11px] font-mono text-slate-400 block">SELECTED DATE</span>
          <h2 className="text-sm font-bold text-white">{selectedKey}</h2>
        </div>

        <form onSubmit={handleAddEvent} className="space-y-2 p-3 rounded-xl bg-slate-950 border border-white/10">
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white"
            />
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Schedule block or reminder..."
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add to Schedule</span>
          </button>
        </form>

        <div className="flex-1 space-y-2">
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No scheduled events for {selectedKey}.
            </p>
          ) : (
            selectedEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded-xl bg-slate-950 border border-white/10 flex items-start justify-between gap-2"
              >
                <button
                  onClick={() => handleToggle(ev.id)}
                  className="flex items-start gap-2 text-left flex-1 cursor-pointer min-w-0"
                >
                  <span
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      ev.completed
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                        : 'border-slate-500'
                    }`}
                  >
                    {ev.completed && <Check className="w-3 h-3" />}
                  </span>
                  <div className="min-w-0">
                    <span className="text-[11px] font-mono text-cyan-400 block tabular-nums">
                      {ev.time}
                    </span>
                    <span
                      className={`text-xs block break-words ${
                        ev.completed ? 'line-through text-slate-500' : 'text-white'
                      }`}
                    >
                      {ev.title}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(ev.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};
