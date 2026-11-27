import React, { useEffect, useMemo, useState } from 'react';
import { Delete, History, Trash2, Copy, Check } from 'lucide-react';
import { triggerHaptic } from '../../utils/hardware';
import { evaluateMathExpression, formatMathResult } from '../../utils/mathEngine';

interface HistoryEntry {
  expr: string;
  result: string;
}

const OPERATORS = ['+', '-', '×', '÷', '^'];

export const CalculatorApp: React.FC = () => {
  const [expression, setExpression] = useState('0');
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scientific, setScientific] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);

  // Live preview of current expression while typing
  const livePreview = useMemo(() => {
    if (errorMsg || justEvaluated) return null;
    if (!/[+\-×÷^%√(]/.test(expression)) return null;
    try {
      const val = evaluateMathExpression(expression);
      return formatMathResult(val);
    } catch {
      return null;
    }
  }, [expression, errorMsg, justEvaluated]);

  const appendDigit = (digit: string) => {
    triggerHaptic(10);
    setErrorMsg(null);
    if (justEvaluated) {
      setExpression(digit === '.' ? '0.' : digit);
      setJustEvaluated(false);
      return;
    }

    if (digit === '.') {
      // Prevent multiple decimals in the current numeric segment
      const parts = expression.split(/[+\-×÷^()%]/);
      const currentSegment = parts[parts.length - 1] ?? '';
      if (currentSegment.includes('.')) return;
      if (currentSegment === '') {
        setExpression((prev) => `${prev}0.`);
        return;
      }
      setExpression((prev) => `${prev}.`);
      return;
    }

    setExpression((prev) => {
      if (prev === '0') return digit;
      // Avoid leading zero like 5+07
      if (/[+\-×÷^(]0$/.test(prev)) {
        return `${prev.slice(0, -1)}${digit}`;
      }
      return `${prev}${digit}`;
    });
  };

  const appendOperator = (op: string) => {
    triggerHaptic(12);
    setErrorMsg(null);
    setJustEvaluated(false);

    setExpression((prev) => {
      const trimmed = prev.trim();
      const last = trimmed[trimmed.length - 1];
      if (OPERATORS.includes(last)) {
        // Allow unary minus after ×, ÷, ^, (
        if (op === '-' && last !== '-' && last !== '+') {
          return `${trimmed}-`;
        }
        return `${trimmed.slice(0, -1)}${op}`;
      }
      if (last === '(' && op !== '-') return trimmed;
      return `${trimmed}${op}`;
    });
  };

  const appendToken = (token: string) => {
    triggerHaptic(10);
    setErrorMsg(null);
    if (justEvaluated) {
      setExpression(token);
      setJustEvaluated(false);
      return;
    }
    setExpression((prev) => (prev === '0' ? token : `${prev}${token}`));
  };

  const handleToggleSign = () => {
    triggerHaptic(10);
    setErrorMsg(null);
    setJustEvaluated(false);
    setExpression((prev) => {
      if (prev === '0') return '-';
      if (prev.startsWith('-(') && prev.endsWith(')')) {
        return prev.slice(2, -1);
      }
      if (/^-?\d+(\.\d+)?$/.test(prev)) {
        return prev.startsWith('-') ? prev.slice(1) : `-${prev}`;
      }
      return `-(${prev})`;
    });
  };

  const handleBackspace = () => {
    triggerHaptic(10);
    setErrorMsg(null);
    if (justEvaluated) {
      setExpression('0');
      setJustEvaluated(false);
      return;
    }
    setExpression((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  const handleClear = () => {
    triggerHaptic(10);
    setExpression('0');
    setErrorMsg(null);
    setJustEvaluated(false);
  };

  const handleEvaluate = () => {
    triggerHaptic(18);
    try {
      // Auto-close missing parentheses cleanly for convenience
      const openCount = (expression.match(/\(/g) || []).length;
      const closeCount = (expression.match(/\)/g) || []).length;
      const balanced =
        openCount > closeCount ? `${expression}${')'.repeat(openCount - closeCount)}` : expression;

      const val = evaluateMathExpression(balanced);
      const formatted = formatMathResult(val);
      setHistory((prev) => [{ expr: balanced, result: formatted }, ...prev].slice(0, 30));
      setExpression(formatted);
      setJustEvaluated(true);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid expression');
    }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(expression).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Full Physical Keyboard Support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        appendDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        appendDigit('.');
      } else if (e.key === '+') {
        e.preventDefault();
        appendOperator('+');
      } else if (e.key === '-') {
        e.preventDefault();
        appendOperator('-');
      } else if (e.key === '*') {
        e.preventDefault();
        appendOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        appendOperator('÷');
      } else if (e.key === '^') {
        e.preventDefault();
        appendOperator('^');
      } else if (e.key === '(' || e.key === ')') {
        e.preventDefault();
        appendToken(e.key);
      } else if (e.key === '%') {
        e.preventDefault();
        appendToken('%');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEvaluate();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="flex-1 w-full h-full bg-[#0b0f17] text-white flex flex-col justify-between p-4 select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setScientific(!scientific)}
            className={`min-h-[34px] px-3 rounded-lg font-medium border cursor-pointer transition-colors ${
              scientific
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            {scientific ? 'Scientific' : 'Standard'}
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`min-h-[34px] px-2.5 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${
              showHistory
                ? 'bg-white/15 border-white/25 text-white'
                : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="tabular-nums">{history.length}</span>
          </button>
        </div>

        <button
          onClick={handleCopy}
          className="min-h-[34px] px-2.5 rounded-lg bg-slate-900 border border-white/10 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
          title="Copy Result"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* History Drawer OR Calculator Main */}
      {showHistory ? (
        <div className="flex-1 overflow-y-auto py-3 space-y-2 max-w-md mx-auto w-full">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
            <span>Calculation History (click to reuse)</span>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-slate-900/60 border border-white/10 text-xs text-slate-400">
              No calculations yet. Type on keyboard or use keypad.
            </div>
          ) : (
            history.map((h, i) => (
              <button
                key={i}
                onClick={() => {
                  setExpression(h.result);
                  setShowHistory(false);
                  setJustEvaluated(false);
                }}
                className="w-full p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 flex items-center justify-between text-left cursor-pointer"
              >
                <span className="text-xs font-mono text-slate-400 truncate">{h.expr}</span>
                <span className="text-sm font-mono font-bold text-cyan-300 tabular-nums ml-3">
                  = {h.result}
                </span>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full">
          {/* Display */}
          <div className="my-auto flex flex-col items-end justify-end px-3 py-4 space-y-1 min-h-[120px]">
            <div className="w-full text-right overflow-x-auto">
              <span
                className={`font-mono font-bold tracking-tight text-white tabular-nums break-all ${
                  expression.length > 14 ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-5xl'
                }`}
              >
                {expression}
              </span>
            </div>
            <div className="min-h-[22px] text-sm font-mono tabular-nums">
              {errorMsg ? (
                <span className="text-rose-400">{errorMsg}</span>
              ) : livePreview ? (
                <span className="text-cyan-400">= {livePreview}</span>
              ) : (
                <span className="text-slate-500 text-xs">Keyboard enabled</span>
              )}
            </div>
          </div>

          {/* Scientific Row */}
          {scientific && (
            <div className="grid grid-cols-5 gap-1.5 pb-2">
              {[
                { label: 'sin', fn: () => appendToken('sin(') },
                { label: 'cos', fn: () => appendToken('cos(') },
                { label: 'tan', fn: () => appendToken('tan(') },
                { label: 'log', fn: () => appendToken('log(') },
                { label: 'ln', fn: () => appendToken('ln(') },
                { label: '(', fn: () => appendToken('(') },
                { label: ')', fn: () => appendToken(')') },
                { label: '√', fn: () => appendToken('√(') },
                { label: 'xʸ', fn: () => appendOperator('^') },
                { label: 'π', fn: () => appendToken('π') },
              ].map((b) => (
                <button
                  key={b.label}
                  onClick={b.fn}
                  className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-mono text-cyan-300 cursor-pointer active:scale-95"
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}

          {/* Main Keypad */}
          <div className="grid grid-cols-4 gap-2 pb-2">
            {[
              { label: 'AC', onClick: handleClear, cls: 'bg-slate-800 text-rose-400 font-bold' },
              { label: '±', onClick: handleToggleSign, cls: 'bg-slate-800 text-slate-200' },
              { label: '%', onClick: () => appendToken('%'), cls: 'bg-slate-800 text-slate-200' },
              { label: '÷', onClick: () => appendOperator('÷'), cls: 'bg-amber-500/20 text-amber-300 font-bold' },

              { label: '7', onClick: () => appendDigit('7'), cls: 'bg-slate-900 text-white' },
              { label: '8', onClick: () => appendDigit('8'), cls: 'bg-slate-900 text-white' },
              { label: '9', onClick: () => appendDigit('9'), cls: 'bg-slate-900 text-white' },
              { label: '×', onClick: () => appendOperator('×'), cls: 'bg-amber-500/20 text-amber-300 font-bold' },

              { label: '4', onClick: () => appendDigit('4'), cls: 'bg-slate-900 text-white' },
              { label: '5', onClick: () => appendDigit('5'), cls: 'bg-slate-900 text-white' },
              { label: '6', onClick: () => appendDigit('6'), cls: 'bg-slate-900 text-white' },
              { label: '-', onClick: () => appendOperator('-'), cls: 'bg-amber-500/20 text-amber-300 font-bold' },

              { label: '1', onClick: () => appendDigit('1'), cls: 'bg-slate-900 text-white' },
              { label: '2', onClick: () => appendDigit('2'), cls: 'bg-slate-900 text-white' },
              { label: '3', onClick: () => appendDigit('3'), cls: 'bg-slate-900 text-white' },
              { label: '+', onClick: () => appendOperator('+'), cls: 'bg-amber-500/20 text-amber-300 font-bold' },

              { label: '0', onClick: () => appendDigit('0'), cls: 'bg-slate-900 text-white' },
              { label: '.', onClick: () => appendDigit('.'), cls: 'bg-slate-900 text-white' },
              { label: 'DEL', onClick: handleBackspace, cls: 'bg-slate-900 text-slate-300', isDel: true },
              { label: '=', onClick: handleEvaluate, cls: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold' },
            ].map((btn, idx) => (
              <button
                key={idx}
                onClick={btn.onClick}
                className={`h-13 rounded-2xl flex items-center justify-center text-lg font-semibold border border-white/10 transition-transform active:scale-95 cursor-pointer ${btn.cls}`}
              >
                {btn.isDel ? <Delete className="w-5 h-5" /> : btn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
