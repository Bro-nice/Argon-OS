import { AgentStep } from '../types/os';

export interface AssistantResponse {
  reply: string;
  action: string;
  target?: string;
  data?: {
    title?: string;
    content?: string;
  };
}

export interface AgentPlanResponse {
  summary: string;
  steps: Array<Omit<AgentStep, 'id' | 'approved' | 'status'>>;
}

export interface TutorResponse {
  explanation: string;
  keyPrinciple: string;
  practicePrompt: string;
  quizQuestion: string;
  quizOptions: string[];
  correctIndex: number;
  hint: string;
}

export interface DayScoreEvaluation {
  score: number;
  emoji: string;
  title: string;
  summary: string;
  strength: string;
  improvements: string[];
  tomorrow_challenge: string;
  encouragement: string;
}

function runOnDeviceIntentEngine(prompt: string): AssistantResponse {
  const query = prompt.toLowerCase();

  if (query.includes('ghost') || query.includes('secret') || query.includes('shadow')) {
    if (query.includes('exit') || query.includes('primary') || query.includes('back')) {
      return {
        reply: 'Switching back to Primary Device.',
        action: 'SWITCH_SPACE',
        target: 'primary',
      };
    }
    return {
      reply: 'Switching to isolated Ghost Device space.',
      action: 'SWITCH_SPACE',
      target: 'ghost',
    };
  }
  if (query.includes('focus') || query.includes('deep work') || query.includes('25m')) {
    return {
      reply: 'Starting a 25-minute Deep Work session with notifications silenced.',
      action: 'START_FOCUS',
      target: '25',
    };
  }
  if (query.includes('agent') || query.includes('automate') || query.includes('workflow')) {
    return {
      reply: 'Opening Autonomous Agents with per-step permission controls.',
      action: 'OPEN_APP',
      target: 'agents',
    };
  }
  if (query.includes('wellbeing') || query.includes('mindful') || query.includes('detox')) {
    return {
      reply: 'Opening Human Wellbeing Studio.',
      action: 'OPEN_APP',
      target: 'wellbeing',
    };
  }
  if (query.includes('grayscale') || query.includes('calm')) {
    return {
      reply: 'Toggling Calm Grayscale display mode.',
      action: 'TOGGLE_GRAYSCALE',
    };
  }
  if (query.includes('knowledge') || query.includes('memory') || query.includes('graph')) {
    return {
      reply: 'Opening your on-device Universal Knowledge Graph.',
      action: 'OPEN_APP',
      target: 'knowledge',
    };
  }
  if (query.includes('learn') || query.includes('tutor') || query.includes('lab') || query.includes('physics') || query.includes('study')) {
    return {
      reply: 'Opening Intelligent Education & Virtual Labs.',
      action: 'OPEN_APP',
      target: 'learn',
    };
  }
  if (query.includes('continuum') || query.includes('handoff') || query.includes('sync') || query.includes('workstation')) {
    return {
      reply: 'Opening Universal Continuum cross-device environment.',
      action: 'OPEN_APP',
      target: 'continuum',
    };
  }
  if (query.includes('eco') || query.includes('sustainable') || query.includes('energy') || query.includes('power save')) {
    return {
      reply: 'Toggling Sustainable Eco Computing Governor.',
      action: 'TOGGLE_ECO',
    };
  }
  if (query.includes('shield') || query.includes('ad') || query.includes('block') || query.includes('privacy')) {
    return {
      reply: 'Opening Shield & System-Wide Ad-Blocker.',
      action: 'OPEN_APP',
      target: 'shield',
    };
  }
  if (query.includes('rotate') || query.includes('anonymous') || query.includes('mask')) {
    return {
      reply: 'Rotating anonymous device fingerprint on-device.',
      action: 'ROTATE_IDENTITY',
    };
  }
  if (query.includes('camera') || query.includes('photo')) {
    return { reply: 'Opening Camera.', action: 'OPEN_APP', target: 'camera' };
  }
  if (query.includes('play store') || query.includes('playstore') || query.includes('google play')) {
    return { reply: 'Opening Google Play Store.', action: 'OPEN_APP', target: 'playstore' };
  }
  if (query.includes('gmail') || query.includes('mail') || query.includes('email')) {
    return { reply: 'Opening Gmail local mail workspace.', action: 'OPEN_APP', target: 'gmail' };
  }
  if (query.includes('brave')) {
    return { reply: 'Opening Brave Private Browser.', action: 'OPEN_APP', target: 'brave' };
  }
  if (query.includes('tor') || query.includes('onion')) {
    return { reply: 'Opening Tor Browser.', action: 'OPEN_APP', target: 'tor' };
  }
  if (query.includes('dayscore') || query.includes('day score') || query.includes('reflect')) {
    return { reply: 'Opening dayscore.ai.studio reflection coach.', action: 'OPEN_APP', target: 'dayscore' };
  }
  if (query.includes('browser') || query.includes('web')) {
    return { reply: 'Opening Quantum Private Browser.', action: 'OPEN_APP', target: 'browser' };
  }
  if (query.includes('phone') || query.includes('call')) {
    return { reply: 'Opening Phone dialer.', action: 'OPEN_APP', target: 'phone' };
  }
  if (query.includes('setting') || query.includes('wifi')) {
    return { reply: 'Opening System Settings.', action: 'OPEN_APP', target: 'settings' };
  }
  if (query.includes('terminal') || query.includes('shell')) {
    return { reply: 'Opening Terminal.', action: 'OPEN_APP', target: 'terminal' };
  }
  if (query.includes('torch') || query.includes('flashlight')) {
    return { reply: 'Toggling hardware flashlight.', action: 'TOGGLE_FLASHLIGHT' };
  }
  if (query.includes('file') || query.includes('storage')) {
    return { reply: 'Opening On-Device Files.', action: 'OPEN_APP', target: 'files' };
  }
  if (query.includes('note')) {
    return { reply: 'Opening Local Notes.', action: 'OPEN_APP', target: 'notes' };
  }

  return {
    reply: `Processed "${prompt}" locally on-device. Zero bytes transmitted outside your device.`,
    action: 'NONE',
  };
}

function runLocalAgentPlanner(goal: string): AgentPlanResponse {
  const q = goal.toLowerCase();
  const steps: AgentPlanResponse['steps'] = [];

  if (q.includes('privacy') || q.includes('anonymous') || q.includes('audit') || q.includes('lockdown')) {
    steps.push(
      {
        title: 'Enforce system-wide Shield ad & tracker firewall',
        capability: 'System Ad & Tracker Block',
        permissionScope: 'privacy:shield',
        explanation: 'Blocks cross-app ads, trackers, and script fingerprinting.',
        actionType: 'ENABLE_SHIELD',
      },
      {
        title: 'Rotate anonymous device & MAC fingerprint',
        capability: 'Rotate Hardware Mask',
        permissionScope: 'privacy:identity',
        explanation: 'Mints a fresh local hardware alias so apps cannot correlate identity.',
        actionType: 'ROTATE_IDENTITY',
      },
      {
        title: 'Enable Local-Only Air-Gap enforcement',
        capability: 'Zero-Cloud Air-Gap',
        permissionScope: 'privacy:airgap',
        explanation: 'Ensures Personal Intelligence runs 100% offline on-device.',
        actionType: 'ENABLE_AIRGAP',
      }
    );
  } else if (q.includes('eco') || q.includes('battery') || q.includes('sustainable') || q.includes('energy')) {
    steps.push(
      {
        title: 'Activate Sustainable Eco Governor',
        capability: 'Sustainable Power Governor',
        permissionScope: 'eco:governor',
        explanation: 'Enables reduced motion and OLED-friendly low-power orchestration.',
        actionType: 'ENABLE_ECO',
      },
      {
        title: 'Lower display brightness to 60%',
        capability: 'Adaptive Display Luminance',
        permissionScope: 'hardware:display',
        explanation: 'Extends panel lifespan and reduces wattage immediately.',
        actionType: 'SET_BRIGHTNESS',
        target: '60',
      },
      {
        title: 'Open Sustainable Computing Monitor',
        capability: 'Open Target Environment',
        permissionScope: 'os:launch',
        explanation: 'Shows live hardware power metrics and Wh conserved.',
        actionType: 'OPEN_APP',
        target: 'eco',
      }
    );
  } else {
    steps.push(
      {
        title: 'Enable Do Not Disturb to protect attention',
        capability: 'Hardware Focus Lock',
        permissionScope: 'hardware:dnd',
        explanation: 'Silences incoming alerts while you work intentionally.',
        actionType: 'ENABLE_DND',
      },
      {
        title: 'Begin 25-minute Deep Work session',
        capability: 'Wellbeing Deep Work Timer',
        permissionScope: 'wellbeing:timer',
        explanation: 'Starts a calm timer inside Wellbeing Studio.',
        actionType: 'ENABLE_FOCUS',
        target: '25',
      },
      {
        title: `Store structured concept note: ${goal.slice(0, 36)}`,
        capability: 'Write to On-Device Knowledge Graph',
        permissionScope: 'knowledge:write',
        explanation: 'Saves a local Knowledge node inside your encrypted space.',
        actionType: 'SAVE_KNOWLEDGE',
        target: goal.slice(0, 48),
      },
      {
        title: 'Open Intelligent Education Virtual Lab',
        capability: 'Open Target Environment',
        permissionScope: 'os:launch',
        explanation: 'Launches interactive simulations and adaptive tutoring.',
        actionType: 'OPEN_APP',
        target: 'learn',
      }
    );
  }

  return {
    summary: `Prepared a ${steps.length}-step on-device plan for "${goal}".`,
    steps,
  };
}

export async function queryOSAssistant(
  prompt: string,
  systemState: Record<string, unknown> = {},
  localOnlyAirGap: boolean = false
): Promise<AssistantResponse> {
  if (localOnlyAirGap || systemState?.deviceSpace === 'ghost') {
    return runOnDeviceIntentEngine(prompt);
  }

  const localCheck = runOnDeviceIntentEngine(prompt);
  if (localCheck.action !== 'NONE') {
    return localCheck;
  }

  try {
    const res = await fetch('/api/os/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemState }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    return await res.json();
  } catch {
    return runOnDeviceIntentEngine(prompt);
  }
}

export async function planAgentWorkflow(
  goal: string,
  systemContext: Record<string, unknown> = {},
  localOnlyAirGap: boolean = false
): Promise<AgentPlanResponse> {
  if (localOnlyAirGap || systemContext?.deviceSpace === 'ghost') {
    return runLocalAgentPlanner(goal);
  }

  try {
    const res = await fetch('/api/os/agent-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, systemContext }),
    });
    if (!res.ok) {
      throw new Error(`Agent planner returned ${res.status}`);
    }
    return await res.json();
  } catch {
    return runLocalAgentPlanner(goal);
  }
}

export async function requestTutorSession(
  topic: string,
  level: string = 'curious learner',
  localOnlyAirGap: boolean = false
): Promise<TutorResponse> {
  const localFallback: TutorResponse = {
    explanation: `${topic} operates through clear causal relationships between system inputs, constraints, and conserved quantities. Exploring one variable at a time lets you verify intuition before memorizing equations.`,
    keyPrinciple: 'Observe State → Vary One Parameter → Measure System Response',
    practicePrompt: 'Test this principle in the Virtual Physics/Wave/Logic Lab tab by changing one slider and predicting the shift first.',
    quizQuestion: `What is the strongest way to build lasting mastery of ${topic}?`,
    quizOptions: [
      'Manipulating one controlled variable and testing predictions in simulation',
      'Skipping conceptual models and only skimming definitions',
      'Changing multiple unrelated parameters at once',
    ],
    correctIndex: 0,
    hint: 'Controlled experimentation builds durable causal intuition.',
  };

  if (localOnlyAirGap) {
    return localFallback;
  }

  try {
    const res = await fetch('/api/os/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, level }),
    });
    if (!res.ok) {
      throw new Error(`Tutor returned ${res.status}`);
    }
    return await res.json();
  } catch {
    return localFallback;
  }
}

export async function evaluateDayScore(journal: string): Promise<DayScoreEvaluation> {
  const res = await fetch('/api/dayscore/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ journal }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `DayScore evaluation failed (${res.status}).`);
  }
  return data as DayScoreEvaluation;
}
