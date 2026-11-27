import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Calculator, ArrowRight, Command, Terminal, EyeOff, Leaf, Zap } from 'lucide-react';
import { AppId, AppMetadata, DeviceSpace } from '../../types/os';
import { evaluateMathExpression, formatMathResult } from '../../utils/mathEngine';
import { triggerHaptic } from '../../utils/hardware';

interface CommandLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  appMetadata: Record<AppId, AppMetadata>;
  deviceSpace: DeviceSpace;
  onLaunchApp: (appId: AppId) => void;
  onExecuteIntent: (action: string, target?: string) => void;
  onOpenAppSwitcher: () => void;
}

interface LauncherItem {
  id: string;
  label: string;
  subtitle: string;
  badge: string;
  type: 'math' | 'app' | 'action';
  run: () => void;
}

export const CommandLauncher: React.FC<CommandLauncherProps> = ({
  isOpen,
  onClose,
  appMetadata,
  deviceSpace,
  onLaunchApp,
  onExecuteIntent,
  onOpenAppSwitcher,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedMath, setCopiedMath] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setCopiedMath(false);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const mathResult = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return null;
    const expr = trimmed.startsWith('=') ? trimmed.slice(1).trim() : trimmed;
    if (!/[0-9]/.test(expr)) return null;
    try {
      const val = evaluateMathExpression(expr);
      return { expr, formatted: formatMathResult(val) };
    } catch {
      return null;
    }
  }, [query]);

  const items = useMemo<LauncherItem[]>(() => {
    const list: LauncherItem[] = [];
    const q = query.trim().toLowerCase();

    if (mathResult) {
      list.push({
        id: 'math-eval',
        label: `= ${mathResult.formatted}`,
        subtitle: `Copy result for "${mathResult.expr}"`,
        badge: 'MATH',
        type: 'math',
        run: () => {
          navigator.clipboard?.writeText(mathResult.formatted).catch(() => {});
          setCopiedMath(true);
          setTimeout(() => onClose(), 300);
        },
      });
    }

    const systemActions: LauncherItem[] = [
      {
        id: 'act-focus',
        label: 'Start 25m Deep Work Focus',
        subtitle: 'Enables Do Not Disturb & Wellbeing countdown timer',
        badge: 'ACTION',
        type: 'action',
        run: () => {
          onExecuteIntent('START_FOCUS', '25');
          onClose();
        },
      },
      {
        id: 'act-space',
        label: deviceSpace === 'ghost' ? 'Return to Primary Device' : 'Switch to Isolated Ghost Device',
        subtitle: 'Zero-leak separate partition & masked hardware ID',
        badge: 'SPACE',
        type: 'action',
        run: () => {
          onExecuteIntent('SWITCH_SPACE', deviceSpace === 'ghost' ? 'primary' : 'ghost');
          onClose();
        },
      },
      {
        id: 'act-eco',
        label: 'Toggle Sustainable Eco Governor',
        subtitle: 'Optimize display & reduced motion power profile',
        badge: 'POWER',
        type: 'action',
        run: () => {
          onExecuteIntent('TOGGLE_ECO');
          onClose();
        },
      },
      {
        id: 'act-grayscale',
        label: 'Toggle Calm Grayscale Display',
        subtitle: 'Reduce screen stimulation immediately',
        badge: 'WELLBEING',
        type: 'action',
        run: () => {
          onExecuteIntent('TOGGLE_GRAYSCALE');
          onClose();
        },
      },
      {
        id: 'act-rotate',
        label: 'Rotate Anonymous Device Identity',
        subtitle: 'Generate fresh MAC & hardware node mask',
        badge: 'PRIVACY',
        type: 'action',
        run: () => {
          onExecuteIntent('ROTATE_IDENTITY');
          onClose();
        },
      },
      {
        id: 'act-split',
        label: 'Open Multitask & Split-View Switcher',
        subtitle: 'Run two applications side-by-side or inspect running tasks',
        badge: 'WM',
        type: 'action',
        run: () => {
          onClose();
          onOpenAppSwitcher();
        },
      },
    ];

    const matchedApps: LauncherItem[] = Object.values(appMetadata)
      .filter(
        (app) =>
          !q ||
          app.name.toLowerCase().includes(q) ||
          app.id.toLowerCase().includes(q) ||
          app.category.toLowerCase().includes(q)
      )
      .map((app) => ({
        id: `app-${app.id}`,
        label: app.name,
        subtitle: `Launch ${app.category} application`,
        badge: app.category.toUpperCase(),
        type: 'app' as const,
        run: () => {
          triggerHaptic(10);
          onLaunchApp(app.id);
          onClose();
        },
      }));

    const matchedActions = systemActions.filter(
      (act) => !q || act.label.toLowerCase().includes(q) || act.subtitle.toLowerCase().includes(q)
    );

    list.push(...matchedApps.slice(0, 8), ...matchedActions.slice(0, 4));
    return list;
  }, [query, mathResult, appMetadata, deviceSpace, onLaunchApp, onExecuteIntent, onOpenAppSwitcher, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length, query]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length ? (prev - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      items[selectedIndex].run();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-14 sm:pt-20 px-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-slate-950 border border-white/15 shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-slate-900/80">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type app name, command, or math (e.g. 240 * 1.15, sqrt(144))..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400">
            ESC
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No matching applications or system actions.
            </div>
          ) : (
            items.map((item, idx) => {
              const active = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={item.run}
                  className={`w-full px-4 py-2.5 flex items-center justify-between text-left cursor-pointer transition-colors ${
                    active ? 'bg-cyan-500/15 text-white' : 'hover:bg-white/5 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === 'math'
                          ? 'bg-amber-500/20 text-amber-400'
                          : item.type === 'action'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-cyan-500/15 text-cyan-400'
                      }`}
                    >
                      {item.type === 'math' ? (
                        <Calculator className="w-4 h-4" />
                      ) : item.id.includes('space') ? (
                        <EyeOff className="w-4 h-4" />
                      ) : item.id.includes('eco') ? (
                        <Leaf className="w-4 h-4" />
                      ) : item.type === 'action' ? (
                        <Zap className="w-4 h-4" />
                      ) : (
                        <Terminal className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium block truncate">
                        {item.type === 'math' && copiedMath ? 'Copied to clipboard!' : item.label}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                      {item.badge}
                    </span>
                    {active && <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-slate-900/70 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Command className="w-3 h-3 text-cyan-400" />
            <span>↑↓ Navigate · Enter Execute · Inline Math Active</span>
          </span>
          <span>Argon OS Launcher</span>
        </div>
      </div>
    </div>
  );
};
