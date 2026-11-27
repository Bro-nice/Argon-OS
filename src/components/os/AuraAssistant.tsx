import React, { useState } from 'react';
import { Bot, Send, X, Lock } from 'lucide-react';
import { queryOSAssistant } from '../../services/api';
import { triggerHaptic } from '../../utils/hardware';
import { AppId, DeviceSpace } from '../../types/os';

interface AuraAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchApp: (app: AppId) => void;
  onExecuteIntent: (action: string, target?: string) => void;
  onSwitchSpace: (target: DeviceSpace) => void;
  onRotateIdentity: () => void;
  localOnlyAirGap: boolean;
  systemState: Record<string, unknown>;
}

export const AuraAssistant: React.FC<AuraAssistantProps> = ({
  isOpen,
  onClose,
  onExecuteIntent,
  localOnlyAirGap,
  systemState,
}) => {
  const [query, setQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickPrompts = [
    'Start 25m focus session',
    'Open autonomous agents',
    'Open virtual physics lab',
    'Enable eco power mode',
    'Open Ghost Device',
  ];

  const handleSubmit = async (textToSend?: string) => {
    const prompt = textToSend || query;
    if (!prompt.trim() || isThinking) return;

    triggerHaptic(15);
    setIsThinking(true);
    setResponse(null);

    try {
      const res = await queryOSAssistant(prompt, systemState, localOnlyAirGap);
      setResponse(res.reply);

      if (res.action && res.action !== 'NONE') {
        setTimeout(() => {
          onClose();
          onExecuteIntent(res.action, res.target);
        }, 500);
      }
    } catch {
      setResponse('Executed locally on-device.');
    } finally {
      setIsThinking(false);
      setQuery('');
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 bg-black/70 backdrop-blur-2xl flex flex-col justify-end p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-auto p-5 rounded-3xl bg-slate-900/95 border border-white/15 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white">Personal Intelligence</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {localOnlyAirGap ? 'Air-Gapped' : 'Local-First'}
            </span>
            <button
              onClick={onClose}
              className="min-h-[32px] min-w-[32px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Response Display */}
        <div className="flex flex-col items-center justify-center py-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center">
            <Bot className="w-8 h-8 text-cyan-400" />
          </div>
          <p className="text-xs text-slate-200 font-medium text-center mt-3 leading-relaxed">
            {isThinking
              ? 'Understanding intent locally...'
              : response || 'Tell Argon OS what you want to accomplish—no app hunting needed.'}
          </p>
        </div>

        {/* Quick Prompts */}
        {!response && (
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((p) => (
              <button
                key={p}
                onClick={() => handleSubmit(p)}
                className="min-h-[34px] px-3 py-1 text-xs rounded-xl bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10 transition-colors cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Describe a goal or command..."
            className="w-full min-h-[42px] px-4 py-2.5 rounded-2xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 pr-12"
            autoFocus
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!query.trim() || isThinking}
            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-40 absolute right-1.5 top-1 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
