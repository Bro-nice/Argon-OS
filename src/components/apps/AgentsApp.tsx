import React, { useState } from 'react';
import {
  Bot,
  Check,
  CheckCircle2,
  Lock,
  Play,
  ShieldCheck,
  XCircle,
  FileClock,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import {
  AgentStep,
  AgentTask,
  AppId,
  DeviceSpace,
  EcoProfile,
  HardwareState,
  PermissionAuditEntry,
  PrivacyProfile,
  WellbeingState,
} from '../../types/os';
import { planAgentWorkflow } from '../../services/api';
import {
  addKnowledgeNode,
  appendPermissionAudit,
  loadPermissionAuditLog,
} from '../../utils/humanOsStore';
import { triggerHaptic } from '../../utils/hardware';

interface AgentsAppProps {
  deviceSpace: DeviceSpace;
  privacy: PrivacyProfile;
  hardware: HardwareState;
  wellbeing: WellbeingState;
  eco: EcoProfile;
  onUpdateHardware: (partial: Partial<HardwareState>) => void;
  onUpdatePrivacy: (partial: Partial<PrivacyProfile>) => void;
  onUpdateWellbeing: (partial: Partial<WellbeingState>) => void;
  onUpdateEco: (partial: Partial<EcoProfile>) => void;
  onRotateIdentity: () => void;
  onLaunchApp: (app: AppId) => void;
}

const PRESET_GOALS = [
  '25m Deep Study Sprint on Wave Physics',
  'Full Privacy Lockdown & Identity Rotation',
  'Sustainable Battery & Calm Focus Mode',
];

export const AgentsApp: React.FC<AgentsAppProps> = ({
  deviceSpace,
  privacy,
  onUpdateHardware,
  onUpdatePrivacy,
  onUpdateWellbeing,
  onUpdateEco,
  onRotateIdentity,
  onLaunchApp,
}) => {
  const [tab, setTab] = useState<'planner' | 'audit'>('planner');
  const [goal, setGoal] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTask, setActiveTask] = useState<AgentTask | null>(null);
  const [auditLog, setAuditLog] = useState<PermissionAuditEntry[]>(() =>
    loadPermissionAuditLog(deviceSpace)
  );
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const handleCreatePlan = async (customGoal?: string) => {
    const targetGoal = (customGoal ?? goal).trim();
    if (!targetGoal || isPlanning) return;

    triggerHaptic(15);
    setIsPlanning(true);
    setStatusBanner(null);

    try {
      const plan = await planAgentWorkflow(
        targetGoal,
        { deviceSpace, airGap: privacy.localOnlyAirGap },
        privacy.localOnlyAirGap
      );

      const steps: AgentStep[] = plan.steps.map((s, idx) => ({
        ...s,
        id: `step-${Date.now()}-${idx}`,
        approved: true,
        status: 'pending',
      }));

      setActiveTask({
        id: `task-${Date.now()}`,
        goal: targetGoal,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        summary: plan.summary,
        steps,
        executed: false,
      });
    } finally {
      setIsPlanning(false);
    }
  };

  const toggleStepApproval = (stepId: string) => {
    if (!activeTask || activeTask.executed || isExecuting) return;
    triggerHaptic(10);
    setActiveTask({
      ...activeTask,
      steps: activeTask.steps.map((s) =>
        s.id === stepId ? { ...s, approved: !s.approved } : s
      ),
    });
  };

  const executeStepAction = (step: AgentStep) => {
    switch (step.actionType) {
      case 'ENABLE_DND':
        onUpdateHardware({ doNotDisturb: true });
        break;
      case 'ENABLE_FOCUS': {
        const mins = Math.max(5, Math.min(90, parseInt(step.target || '25', 10) || 25));
        onUpdateWellbeing({
          focusDurationMin: mins,
          focusSecondsLeft: mins * 60,
          focusActive: true,
          focusIntent: activeTask?.goal || 'Agent Focus Session',
        });
        break;
      }
      case 'ENABLE_SHIELD':
        onUpdatePrivacy({ shieldEnabled: true, shieldLevel: 'aggressive' });
        break;
      case 'ENABLE_AIRGAP':
        onUpdatePrivacy({ localOnlyAirGap: true });
        break;
      case 'ROTATE_IDENTITY':
        onRotateIdentity();
        break;
      case 'ENABLE_ECO':
        onUpdateEco({ ecoMode: true, reducedMotion: true, oledDarkSaver: true });
        break;
      case 'SET_BRIGHTNESS': {
        const lvl = Math.max(20, Math.min(100, parseInt(step.target || '60', 10) || 60));
        onUpdateHardware({ screenBrightness: lvl });
        break;
      }
      case 'SAVE_KNOWLEDGE':
        addKnowledgeNode(
          deviceSpace,
          step.target || activeTask?.goal || 'Agent Synthesis',
          `${step.explanation}\n\nGoal context: ${activeTask?.goal || ''}`,
          ['agent', 'synthesis']
        );
        break;
      case 'OPEN_APP':
        if (step.target) {
          setTimeout(() => onLaunchApp(step.target as AppId), 450);
        }
        break;
    }
  };

  const handleRunApprovedSteps = async () => {
    if (!activeTask || isExecuting) return;
    triggerHaptic([15, 25]);
    setIsExecuting(true);

    let updatedSteps = [...activeTask.steps];
    let latestAudit = auditLog;
    let completedCount = 0;

    for (let i = 0; i < updatedSteps.length; i++) {
      const step = updatedSteps[i];
      if (!step.approved) {
        updatedSteps[i] = { ...step, status: 'denied' };
        latestAudit = appendPermissionAudit(deviceSpace, {
          actor: 'Sovereign Agent',
          scope: step.permissionScope,
          action: step.title,
          outcome: 'denied',
          explanation: 'User withheld permission prior to execution.',
        });
        setActiveTask({ ...activeTask, steps: [...updatedSteps] });
        setAuditLog(latestAudit);
        continue;
      }

      updatedSteps[i] = { ...step, status: 'running' };
      setActiveTask({ ...activeTask, steps: [...updatedSteps] });
      await new Promise((r) => setTimeout(r, 260));

      executeStepAction(step);
      updatedSteps[i] = { ...step, status: 'completed' };
      completedCount++;

      latestAudit = appendPermissionAudit(deviceSpace, {
        actor: 'Sovereign Agent',
        scope: step.permissionScope,
        action: step.title,
        outcome: 'approved',
        explanation: step.explanation,
      });

      setActiveTask({ ...activeTask, steps: [...updatedSteps] });
      setAuditLog(latestAudit);
    }

    setActiveTask({ ...activeTask, steps: updatedSteps, executed: true });
    setStatusBanner(`Executed ${completedCount} approved step${completedCount === 1 ? '' : 's'} with full audit trail.`);
    setIsExecuting(false);
  };

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col p-4 select-none overflow-y-auto space-y-3.5">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          <h1 className="text-sm font-bold text-white">Autonomous Agents</h1>
        </div>
        <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded-xl p-0.5 text-xs">
          <button
            onClick={() => setTab('planner')}
            className={`min-h-[32px] px-3 rounded-lg font-medium cursor-pointer transition-colors ${
              tab === 'planner' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
            }`}
          >
            Workflows
          </button>
          <button
            onClick={() => {
              setAuditLog(loadPermissionAuditLog(deviceSpace));
              setTab('audit');
            }}
            className={`min-h-[32px] px-3 rounded-lg font-medium cursor-pointer transition-colors ${
              tab === 'audit' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
            }`}
          >
            Audit Ledger
          </button>
        </div>
      </div>

      {tab === 'planner' ? (
        <div className="space-y-3.5 flex-1">
          {/* Intent Input */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Express an outcome</span>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {privacy.localOnlyAirGap ? '100% Offline Planner' : 'Permission-Gated'}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlan()}
                placeholder="e.g. Start 25m focus & prepare wave physics notes..."
                className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => handleCreatePlan()}
                disabled={!goal.trim() || isPlanning}
                className="min-h-[42px] px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                {isPlanning ? 'Planning...' : 'Plan'}
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 block">Quick intent templates</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_GOALS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setGoal(preset);
                      handleCreatePlan(preset);
                    }}
                    className="min-h-[34px] px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-200 flex items-center gap-1 cursor-pointer text-left"
                  >
                    <ChevronRight className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>{preset}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {statusBanner && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusBanner}</span>
            </div>
          )}

          {/* Active Plan with Granular Permission Controls */}
          {activeTask ? (
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase block">
                    Execution Plan · {activeTask.createdAt}
                  </span>
                  <h2 className="text-xs font-bold text-white mt-0.5">{activeTask.summary}</h2>
                </div>
                <Sliders className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              <div className="space-y-2">
                {activeTask.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`p-3 rounded-xl border transition-colors ${
                      step.status === 'completed'
                        ? 'bg-emerald-950/30 border-emerald-500/30'
                        : step.status === 'denied'
                        ? 'bg-slate-950/60 border-white/5 opacity-60'
                        : 'bg-slate-950/70 border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                            0{idx + 1}
                          </span>
                          <span className="font-semibold text-white">{step.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                          {step.explanation}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-cyan-300">
                          <span>Scope: {step.permissionScope}</span>
                          <span>·</span>
                          <span>{step.capability}</span>
                        </div>
                      </div>

                      {!activeTask.executed ? (
                        <button
                          onClick={() => toggleStepApproval(step.id)}
                          className={`min-h-[34px] px-2.5 rounded-lg text-[11px] font-semibold border cursor-pointer shrink-0 ${
                            step.approved
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          {step.approved ? 'Allow' : 'Deny'}
                        </button>
                      ) : (
                        <span className="shrink-0">
                          {step.status === 'completed' ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-500" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!activeTask.executed && (
                <button
                  onClick={handleRunApprovedSteps}
                  disabled={isExecuting}
                  className="w-full min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>{isExecuting ? 'Executing Approved Actions...' : 'Approve & Execute Plan'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/10 text-center space-y-2">
              <ShieldCheck className="w-6 h-6 text-cyan-400 mx-auto" />
              <p className="text-xs font-semibold text-white">User-Controlled Sovereign Automation</p>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                Agents propose explicit capabilities and never act silently. Inspect, allow, or deny every system permission before execution.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5 flex-1">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-semibold">
              <FileClock className="w-4 h-4 text-cyan-400" />
              Local Explainable AI & Permission Ledger
            </span>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {auditLog.length} entries
            </span>
          </div>

          <div className="space-y-2">
            {auditLog.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-xl bg-slate-900/75 border border-white/10 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white truncate">{entry.action}</span>
                  <span
                    className={`font-mono text-[10px] uppercase shrink-0 ${
                      entry.outcome === 'approved' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {entry.outcome}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">{entry.explanation}</p>
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                  <span>{entry.timestamp}</span>
                  <span>·</span>
                  <span>{entry.scope}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
