import React, { useState } from 'react';
import {
  Award,
  Send,
  CheckCircle2,
  Target,
  TrendingUp,
  History,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { DeviceSpace } from '../../types/os';
import { DayScoreEvaluation, evaluateDayScore } from '../../services/api';
import { readSpaceData, writeSpaceData } from '../../utils/localVault';
import { triggerHaptic } from '../../utils/hardware';

interface DayScoreAppProps {
  deviceSpace: DeviceSpace;
}

interface SavedDayEntry extends DayScoreEvaluation {
  id: string;
  dateLabel: string;
  journalSnippet: string;
}

function getBandLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Exceptional Day', color: 'text-emerald-400' };
  if (score >= 75) return { label: 'Strong Day', color: 'text-cyan-400' };
  if (score >= 60) return { label: 'Decent Day', color: 'text-sky-400' };
  if (score >= 40) return { label: 'Weak Day', color: 'text-amber-400' };
  return { label: 'Very Difficult Day', color: 'text-rose-300' };
}

export const DayScoreApp: React.FC<DayScoreAppProps> = ({ deviceSpace }) => {
  const [journal, setJournal] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedDayEntry[]>(() =>
    readSpaceData<SavedDayEntry[]>(deviceSpace, 'dayscore_history', [])
  );
  const [activeResult, setActiveResult] = useState<SavedDayEntry | null>(
    () => history[0] || null
  );

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journal.trim() || isEvaluating) return;

    triggerHaptic(15);
    setIsEvaluating(true);
    setErrorMsg(null);

    try {
      const evaluation = await evaluateDayScore(journal);
      const entry: SavedDayEntry = {
        ...evaluation,
        id: `ds-${Date.now()}`,
        dateLabel: new Date().toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        journalSnippet: journal.trim().slice(0, 140),
      };
      const nextHistory = [entry, ...history].slice(0, 30);
      setHistory(nextHistory);
      writeSpaceData(deviceSpace, 'dayscore_history', nextHistory);
      setActiveResult(entry);
      setJournal('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to evaluate reflection right now.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleDeleteEntry = (id: string) => {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    writeSpaceData(deviceSpace, 'dayscore_history', next);
    if (activeResult?.id === id) {
      setActiveResult(next[0] || null);
    }
  };

  const band = activeResult ? getBandLabel(activeResult.score) : null;

  return (
    <div className="flex-1 w-full h-full bg-[#090d16] text-white flex flex-col select-none overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/95 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/25 border border-indigo-400/40 flex items-center justify-center">
            <Award className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">dayscore.ai.studio</h1>
            <span className="text-[10px] font-mono text-indigo-300">
              DayScore AI · Honest Daily Reflection & Sustainable Growth
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
          Saved locally in {deviceSpace === 'ghost' ? 'Ghost' : 'Primary'} Vault
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Reflection Composer */}
          <form
            onSubmit={handleEvaluate}
            className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3"
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white">
                How did your day actually go?
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                Free-form · Study, rest, work, struggles, wins
              </span>
            </div>

            <textarea
              rows={4}
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              placeholder="Write freely in any style or bullets: what you worked on, how you rested, distractions, unexpected challenges, or how you feel..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 resize-none leading-relaxed"
            />

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Studied 3h, worked out, scrolled 1h at night, slept 7h',
                  'Had a rough day caring for family, managed 1 small task',
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setJournal(sample)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 cursor-pointer"
                  >
                    Use Example
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!journal.trim() || isEvaluating}
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating Day...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Evaluate My Day</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Active Result Card */}
          {activeResult && band && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{activeResult.emoji}</span>
                    <span className={`text-xs font-mono font-bold ${band.color}`}>
                      {band.label.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white">{activeResult.title}</h2>
                  <span className="text-[11px] text-slate-400 block">{activeResult.dateLabel}</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-950/90 border border-white/10 shrink-0">
                  <div className="text-center">
                    <span className="text-3xl font-extrabold text-white tabular-nums">
                      {activeResult.score}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 block">/ 100</span>
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed select-text">
                {activeResult.summary}
              </p>

              {/* Strength */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Genuine Strength</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{activeResult.strength}</p>
              </div>

              {/* Actionable Improvements */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                  <TrendingUp className="w-4 h-4" />
                  <span>Actionable Improvements</span>
                </div>
                <ul className="space-y-1.5">
                  {activeResult.improvements.map((imp, idx) => (
                    <li
                      key={`${idx}-${imp.slice(0, 16)}`}
                      className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-200 flex items-start gap-2"
                    >
                      <span className="font-mono text-cyan-400 font-bold shrink-0">
                        {idx + 1}.
                      </span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tomorrow Challenge */}
              <div className="p-3.5 rounded-xl bg-indigo-500/15 border border-indigo-400/30 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                  <Target className="w-4 h-4" />
                  <span>Tomorrow&apos;s Challenge</span>
                </div>
                <p className="text-xs text-white font-medium">{activeResult.tomorrow_challenge}</p>
              </div>

              {/* Encouragement */}
              <p className="text-xs text-slate-300 italic border-t border-white/10 pt-3">
                {activeResult.encouragement}
              </p>
            </div>
          )}

          {/* Local History */}
          {history.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <History className="w-3.5 h-3.5" />
                <span>On-Device Reflection History ({history.length})</span>
              </div>
              <div className="space-y-1.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveResult(item)}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 ${
                      activeResult?.id === item.id
                        ? 'bg-indigo-500/15 border-indigo-400/40'
                        : 'bg-slate-900/60 border-white/10 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">{item.emoji}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {item.score}/100 · {item.title}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {item.dateLabel} — {item.journalSnippet}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEntry(item.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
