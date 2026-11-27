import React, { useState, useEffect } from 'react';
import {
  Clock as ClockIcon,
  AlarmClock,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Hourglass,
} from 'lucide-react';
import { AlarmItem } from '../../types/os';
import { playLockChime, triggerHaptic } from '../../utils/hardware';

const INITIAL_ALARMS: AlarmItem[] = [
  { id: 'a1', time: '06:30', label: 'Morning Deep Focus', days: ['Mon–Fri'], isEnabled: true },
  { id: 'a2', time: '22:30', label: 'Evening Wind Down', days: ['Everyday'], isEnabled: true },
];

const WORLD_CITIES = [
  { city: 'New York', tz: 'America/New_York' },
  { city: 'London', tz: 'Europe/London' },
  { city: 'Berlin', tz: 'Europe/Berlin' },
  { city: 'Tokyo', tz: 'Asia/Tokyo' },
  { city: 'Sydney', tz: 'Australia/Sydney' },
];

export const ClockApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'alarm' | 'stopwatch' | 'timer' | 'world'>('alarm');
  const [alarms, setAlarms] = useState<AlarmItem[]>(INITIAL_ALARMS);
  const [newAlarmTime, setNewAlarmTime] = useState('08:00');
  const [newAlarmLabel, setNewAlarmLabel] = useState('');
  const [nowDate, setNowDate] = useState(() => new Date());

  // High-precision Stopwatch
  const [swTimeMs, setSwTimeMs] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);

  // Real Countdown Timer
  const [timerPresetSec, setTimerPresetSec] = useState(300);
  const [timerLeftSec, setTimerLeftSec] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);

  // Live 1s world clock tick
  useEffect(() => {
    const t = setInterval(() => setNowDate(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Stopwatch loop using real elapsed performance.now()
  useEffect(() => {
    if (!swRunning) return;
    let last = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      setSwTimeMs((prev) => prev + (now - last));
      last = now;
    }, 25);
    return () => clearInterval(interval);
  }, [swRunning]);

  // Countdown Timer loop with chime on completion
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerLeftSec((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          playLockChime(false);
          triggerHaptic([30, 40, 30]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const toggleAlarm = (id: string) => {
    triggerHaptic(15);
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, isEnabled: !a.isEnabled } : a)));
  };

  const addAlarm = () => {
    triggerHaptic(15);
    const alarm: AlarmItem = {
      id: Date.now().toString(),
      time: newAlarmTime || '08:00',
      label: newAlarmLabel.trim() || 'Reminder Alarm',
      days: ['Everyday'],
      isEnabled: true,
    };
    setAlarms([alarm, ...alarms]);
    setNewAlarmLabel('');
  };

  const deleteAlarm = (id: string) => {
    triggerHaptic(10);
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  };

  const formatStopwatch = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  };

  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 w-full h-full bg-[#0b0f17] text-white flex flex-col justify-between p-4 select-none overflow-hidden">
      {/* Tab Header */}
      <div className="grid grid-cols-4 gap-1 pb-2 border-b border-white/10 text-xs">
        {[
          { id: 'alarm' as const, label: 'Alarms', icon: AlarmClock },
          { id: 'stopwatch' as const, label: 'Stopwatch', icon: Timer },
          { id: 'timer' as const, label: 'Timer', icon: Hourglass },
          { id: 'world' as const, label: 'World', icon: ClockIcon },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`min-h-[36px] flex items-center justify-center gap-1.5 rounded-lg cursor-pointer transition-colors ${
                active ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto py-3 max-w-lg mx-auto w-full">
        {activeTab === 'alarm' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-wrap items-center gap-2">
              <input
                type="time"
                value={newAlarmTime}
                onChange={(e) => setNewAlarmTime(e.target.value)}
                className="min-h-[38px] px-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white"
              />
              <input
                type="text"
                value={newAlarmLabel}
                onChange={(e) => setNewAlarmLabel(e.target.value)}
                placeholder="Alarm label..."
                className="flex-1 min-w-[120px] min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={addAlarm}
                className="min-h-[38px] px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2">
              {alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span
                      className={`text-2xl font-bold font-mono tabular-nums ${
                        alarm.isEnabled ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {alarm.time}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {alarm.label} · {alarm.days.join(', ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <input
                      type="checkbox"
                      checked={alarm.isEnabled}
                      onChange={() => toggleAlarm(alarm.id)}
                      className="w-5 h-5 accent-cyan-400 cursor-pointer"
                    />
                    <button
                      onClick={() => deleteAlarm(alarm.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Delete Alarm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stopwatch' && (
          <div className="flex flex-col items-center justify-between h-full py-4 space-y-6">
            <div className="my-auto text-center space-y-1">
              <span className="text-5xl font-black font-mono text-cyan-400 tabular-nums tracking-tight">
                {formatStopwatch(swTimeMs)}
              </span>
              <p className="text-xs text-slate-400">Elapsed Time</p>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={() => {
                  triggerHaptic(10);
                  if (swRunning) {
                    setLaps([swTimeMs, ...laps]);
                  } else {
                    setSwTimeMs(0);
                    setLaps([]);
                  }
                }}
                className="w-16 h-16 rounded-full bg-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-center cursor-pointer active:scale-95 border border-white/10"
              >
                {swRunning ? 'Lap' : 'Reset'}
              </button>

              <button
                onClick={() => {
                  triggerHaptic(15);
                  setSwRunning(!swRunning);
                }}
                className={`w-16 h-16 rounded-full flex items-center justify-center font-bold transition-transform active:scale-95 cursor-pointer shadow-xl ${
                  swRunning ? 'bg-rose-500 text-white' : 'bg-emerald-400 text-slate-950'
                }`}
              >
                {swRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
            </div>

            {laps.length > 0 && (
              <div className="w-full max-h-40 overflow-y-auto space-y-1.5 pt-2 border-t border-white/10">
                {laps.map((lap, idx) => (
                  <div key={idx} className="flex justify-between text-xs font-mono text-slate-300 px-2 tabular-nums">
                    <span>Lap {laps.length - idx}</span>
                    <span>{formatStopwatch(lap)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'timer' && (
          <div className="flex flex-col items-center justify-between h-full py-4 space-y-5">
            <div className="my-auto text-center space-y-2">
              <span className="text-5xl font-black font-mono text-white tabular-nums tracking-tight">
                {formatTimer(timerLeftSec)}
              </span>
              <p className="text-xs text-slate-400">
                {timerLeftSec === 0 ? 'Timer Complete' : timerRunning ? 'Counting down' : 'Ready'}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: '1m', sec: 60 },
                { label: '5m', sec: 300 },
                { label: '10m', sec: 600 },
                { label: '25m', sec: 1500 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setTimerPresetSec(p.sec);
                    setTimerLeftSec(p.sec);
                    setTimerRunning(false);
                  }}
                  className={`min-h-[36px] px-3 rounded-xl text-xs font-mono border cursor-pointer ${
                    timerPresetSec === p.sec
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-slate-900 border-white/10 text-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setTimerRunning(false);
                  setTimerLeftSec(timerPresetSec);
                }}
                className="w-14 h-14 rounded-full bg-slate-800 border border-white/10 text-white flex items-center justify-center cursor-pointer"
                title="Reset Timer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                disabled={timerLeftSec === 0}
                className={`w-16 h-16 rounded-full flex items-center justify-center font-bold cursor-pointer disabled:opacity-40 ${
                  timerRunning ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500 text-slate-950'
                }`}
              >
                {timerRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'world' && (
          <div className="space-y-2">
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Local Host Time</span>
                <span className="text-[10px] text-cyan-300 font-mono">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </span>
              </div>
              <span className="text-lg font-bold font-mono text-white tabular-nums">
                {nowDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {WORLD_CITIES.map((w) => {
              const formatted = new Intl.DateTimeFormat([], {
                timeZone: w.tz,
                hour: '2-digit',
                minute: '2-digit',
              }).format(nowDate);
              const dateLabel = new Intl.DateTimeFormat([], {
                timeZone: w.tz,
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              }).format(nowDate);
              return (
                <div
                  key={w.city}
                  className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{w.city}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{dateLabel}</span>
                  </div>
                  <span className="text-base font-bold font-mono text-cyan-300 tabular-nums">
                    {formatted}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
