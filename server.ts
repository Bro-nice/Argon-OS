import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const MODEL_NAME = 'gemini-4-hydrogen';

const isValidKey = (key?: string) =>
  Boolean(key && key !== 'MY_GEMINI_API_KEY' && !key.startsWith('MY_') && key.length > 15);

// Argon OS Personal Intelligence & Intent Router
app.post('/api/os/assistant', async (req: Request, res: Response) => {
  try {
    const { prompt, systemState } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    if (isValidKey(process.env.GEMINI_API_KEY)) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI assistant timeout')), 6000)
        );

        const aiCall = ai.models.generateContent({
          model: MODEL_NAME,
          contents: `User goal/command: "${prompt}"\nCurrent OS Context: ${JSON.stringify(systemState || {})}`,
          config: {
            systemInstruction: `You are Personal Intelligence inside Argon OS — a calm, human-centered, sovereign operating system.
Your job is to interpret what the user wants to accomplish and map it to one crisp system action rather than forcing them to hunt through app icons.
Respect human attention, never use manipulative language, and keep replies concise (1-2 sentences).

Available actions:
- "OPEN_APP" with target in: ['agents', 'wellbeing', 'knowledge', 'learn', 'continuum', 'eco', 'code', 'paint', 'calendar', 'keyring', 'monitor', 'shield', 'ghost', 'browser', 'brave', 'tor', 'playstore', 'gmail', 'dayscore', 'camera', 'phone', 'messages', 'files', 'notes', 'settings', 'terminal', 'clock', 'calculator', 'weather', 'music', 'vitals']
- "START_FOCUS" with target as duration minutes string (e.g. "25")
- "TOGGLE_ECO"
- "TOGGLE_GRAYSCALE"
- "TOGGLE_FLASHLIGHT"
- "SWITCH_SPACE" with target "ghost" or "primary"
- "ROTATE_IDENTITY"
- "CREATE_KNOWLEDGE" with data: { title, content, tags }
- "NONE" when purely answering a question.

Return valid JSON matching the schema.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING },
                action: { type: Type.STRING },
                target: { type: Type.STRING },
                data: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                  },
                },
              },
              required: ['reply', 'action'],
            },
          },
        });

        const response: any = await Promise.race([aiCall, timeoutPromise]);
        const parsed = JSON.parse(response.text?.trim() || '{}');
        return res.json(parsed);
      } catch (err) {
        console.warn('Gemini OS assistant fallback:', err);
      }
    }

    // Deterministic intent fallback when API key isn't configured
    const query = prompt.toLowerCase();
    let reply = `Ready to help with "${prompt}" inside Argon OS.`;
    let action = 'NONE';
    let target = '';

    if (query.includes('focus') || query.includes('deep work') || query.includes('study session')) {
      reply = 'Starting a 25-minute Deep Work focus session with Do Not Disturb enabled.';
      action = 'START_FOCUS';
      target = '25';
    } else if (query.includes('code') || query.includes('ide') || query.includes('editor')) {
      reply = 'Opening Code Studio local sandbox IDE.';
      action = 'OPEN_APP';
      target = 'code';
    } else if (query.includes('paint') || query.includes('draw') || query.includes('canvas')) {
      reply = 'Opening Canvas Studio.';
      action = 'OPEN_APP';
      target = 'paint';
    } else if (query.includes('calendar') || query.includes('schedule')) {
      reply = 'Opening Calendar planner.';
      action = 'OPEN_APP';
      target = 'calendar';
    } else if (query.includes('password') || query.includes('keyring') || query.includes('key')) {
      reply = 'Opening Local Keyring Vault.';
      action = 'OPEN_APP';
      target = 'keyring';
    } else if (query.includes('task') || query.includes('monitor') || query.includes('cpu')) {
      reply = 'Opening System Monitor & Task Manager.';
      action = 'OPEN_APP';
      target = 'monitor';
    } else if (query.includes('agent') || query.includes('automate') || query.includes('workflow')) {
      reply = 'Opening Autonomous Agents with transparent permission controls.';
      action = 'OPEN_APP';
      target = 'agents';
    } else if (query.includes('learn') || query.includes('tutor') || query.includes('physics') || query.includes('lab')) {
      reply = 'Opening Intelligent Education & Interactive Virtual Labs.';
      action = 'OPEN_APP';
      target = 'learn';
    } else if (query.includes('knowledge') || query.includes('memory') || query.includes('graph')) {
      reply = 'Opening your on-device Universal Knowledge Graph.';
      action = 'OPEN_APP';
      target = 'knowledge';
    } else if (query.includes('continuum') || query.includes('handoff') || query.includes('devices')) {
      reply = 'Opening Universal Continuum device mesh.';
      action = 'OPEN_APP';
      target = 'continuum';
    } else if (query.includes('eco') || query.includes('sustainable') || query.includes('battery save')) {
      reply = 'Enabling Sustainable Eco Computing profile to reduce power draw.';
      action = 'TOGGLE_ECO';
    } else if (query.includes('grayscale') || query.includes('calm display')) {
      reply = 'Toggling Calm Grayscale display mode.';
      action = 'TOGGLE_GRAYSCALE';
    } else if (query.includes('wellbeing') || query.includes('detox')) {
      reply = 'Opening Human Wellbeing Studio.';
      action = 'OPEN_APP';
      target = 'wellbeing';
    } else if (query.includes('play store') || query.includes('playstore') || query.includes('google play')) {
      reply = 'Opening Google Play Store.';
      action = 'OPEN_APP';
      target = 'playstore';
    } else if (query.includes('gmail') || query.includes('mail') || query.includes('email')) {
      reply = 'Opening Gmail local mail workspace.';
      action = 'OPEN_APP';
      target = 'gmail';
    } else if (query.includes('brave')) {
      reply = 'Opening Brave Private Browser with Shields Up.';
      action = 'OPEN_APP';
      target = 'brave';
    } else if (query.includes('tor') || query.includes('onion')) {
      reply = 'Opening Tor Browser over isolated onion circuits.';
      action = 'OPEN_APP';
      target = 'tor';
    } else if (query.includes('dayscore') || query.includes('day score') || query.includes('reflect')) {
      reply = 'Opening dayscore.ai.studio daily reflection coach.';
      action = 'OPEN_APP';
      target = 'dayscore';
    } else if (query.includes('ghost') || query.includes('secret')) {
      reply = query.includes('exit') ? 'Returning to Primary Device.' : 'Mounting isolated Ghost Device.';
      action = 'SWITCH_SPACE';
      target = query.includes('exit') ? 'primary' : 'ghost';
    } else {
      reply = `Understood "${prompt}". Try launching an Autonomous Agent or opening Knowledge & Learn labs to go deeper.`;
    }

    return res.json({ reply, action, target });
  } catch (error) {
    console.error('Error in /api/os/assistant:', error);
    return res.status(500).json({ error: 'Failed to process assistant prompt.' });
  }
});

// Autonomous Agent Multi-Step Planner
app.post('/api/os/agent-plan', async (req: Request, res: Response) => {
  try {
    const { goal, systemContext } = req.body;
    if (!goal || typeof goal !== 'string' || !goal.trim()) {
      return res.status(400).json({ error: 'Goal is required.' });
    }

    if (isValidKey(process.env.GEMINI_API_KEY)) {
      try {
        const aiCall = ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Create a practical, transparent multi-step Argon OS agent execution plan for goal: "${goal}"\nContext: ${JSON.stringify(systemContext || {})}`,
          config: {
            systemInstruction: `You are the Argon OS Sovereign Agent Planner.
Decompose the user's goal into 3 to 4 concrete, safe, locally executable OS steps.
Every step MUST specify an exact actionType from:
- "ENABLE_DND" (capability: "Hardware Focus Lock", permissionScope: "hardware:dnd")
- "ENABLE_FOCUS" (capability: "Wellbeing Deep Work Timer", permissionScope: "wellbeing:timer", target: minutes e.g. "25")
- "ENABLE_SHIELD" (capability: "System Ad & Tracker Block", permissionScope: "privacy:shield")
- "ENABLE_AIRGAP" (capability: "Zero-Cloud Air-Gap", permissionScope: "privacy:airgap")
- "ROTATE_IDENTITY" (capability: "Rotate Hardware Mask", permissionScope: "privacy:identity")
- "ENABLE_ECO" (capability: "Sustainable Power Governor", permissionScope: "eco:governor")
- "SET_BRIGHTNESS" (capability: "Adaptive Display Luminance", permissionScope: "hardware:display", target: "65")
- "SAVE_KNOWLEDGE" (capability: "Write to On-Device Knowledge Graph", permissionScope: "knowledge:write", target: short topic title, explanation: clear starter synthesis)
- "OPEN_APP" (capability: "Open Target Environment", permissionScope: "os:launch", target in ['learn', 'knowledge', 'wellbeing', 'shield', 'eco', 'continuum', 'browser', 'notes'])

Never fabricate external web actions that cannot execute. Every step must explain why the permission is requested.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      capability: { type: Type.STRING },
                      permissionScope: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                      actionType: { type: Type.STRING },
                      target: { type: Type.STRING },
                    },
                    required: ['title', 'capability', 'permissionScope', 'explanation', 'actionType'],
                  },
                },
              },
              required: ['summary', 'steps'],
            },
          },
        });

        const response: any = await aiCall;
        const parsed = JSON.parse(response.text?.trim() || '{}');
        if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
          return res.json(parsed);
        }
      } catch (err) {
        console.warn('Gemini agent-plan fallback:', err);
      }
    }

    // Deterministic high-signal multi-step plan fallback
    const q = goal.toLowerCase();
    const steps: any[] = [];

    if (q.includes('privacy') || q.includes('anonymous') || q.includes('audit') || q.includes('lockdown')) {
      steps.push(
        {
          title: 'Enforce Brave-grade Shield across all apps',
          capability: 'System Ad & Tracker Block',
          permissionScope: 'privacy:shield',
          explanation: 'Blocks ads, cross-app telemetry, and fingerprinting scripts across the OS.',
          actionType: 'ENABLE_SHIELD',
        },
        {
          title: 'Rotate anonymous device & MAC mask',
          capability: 'Rotate Hardware Mask',
          permissionScope: 'privacy:identity',
          explanation: 'Generates a fresh on-device cryptographic hardware alias.',
          actionType: 'ROTATE_IDENTITY',
        },
        {
          title: 'Record privacy hardening log in Knowledge Vault',
          capability: 'Write to On-Device Knowledge Graph',
          permissionScope: 'knowledge:write',
          explanation: `Saves an audit entry for "${goal}" strictly inside local storage.`,
          actionType: 'SAVE_KNOWLEDGE',
          target: 'Privacy Hardening Checklist',
        }
      );
    } else if (q.includes('battery') || q.includes('eco') || q.includes('sustainable') || q.includes('energy')) {
      steps.push(
        {
          title: 'Engage Sustainable Eco Governor',
          capability: 'Sustainable Power Governor',
          permissionScope: 'eco:governor',
          explanation: 'Reduces animation cadence and optimizes background processing.',
          actionType: 'ENABLE_ECO',
        },
        {
          title: 'Calibrate display luminance to 60%',
          capability: 'Adaptive Display Luminance',
          permissionScope: 'hardware:display',
          explanation: 'Lowers panel power draw while maintaining crisp legibility.',
          actionType: 'SET_BRIGHTNESS',
          target: '60',
        },
        {
          title: 'Open Sustainable Computing telemetry',
          capability: 'Open Target Environment',
          permissionScope: 'os:launch',
          explanation: 'Displays live host hardware energy conservation metrics.',
          actionType: 'OPEN_APP',
          target: 'eco',
        }
      );
    } else {
      steps.push(
        {
          title: 'Silence interruptions with Do Not Disturb',
          capability: 'Hardware Focus Lock',
          permissionScope: 'hardware:dnd',
          explanation: 'Prevents non-essential notifications from breaking attention.',
          actionType: 'ENABLE_DND',
        },
        {
          title: 'Start 25-minute intentional focus timer',
          capability: 'Wellbeing Deep Work Timer',
          permissionScope: 'wellbeing:timer',
          explanation: 'Allocates a bounded work block with zero manipulative streaks.',
          actionType: 'ENABLE_FOCUS',
          target: '25',
        },
        {
          title: `Create starter brief for "${goal.slice(0, 40)}"`,
          capability: 'Write to On-Device Knowledge Graph',
          permissionScope: 'knowledge:write',
          explanation: 'Stores a structured concept node on your local device for lifelong recall.',
          actionType: 'SAVE_KNOWLEDGE',
          target: goal.slice(0, 48),
        },
        {
          title: 'Launch Education & Interactive Labs',
          capability: 'Open Target Environment',
          permissionScope: 'os:launch',
          explanation: 'Opens interactive simulations and adaptive tutoring.',
          actionType: 'OPEN_APP',
          target: 'learn',
        }
      );
    }

    return res.json({
      summary: `Prepared a ${steps.length}-step local workflow for "${goal}" with explicit per-step permissions.`,
      steps,
    });
  } catch (error) {
    console.error('Error in /api/os/agent-plan:', error);
    return res.status(500).json({ error: 'Failed to generate agent plan.' });
  }
});

// Intelligent Education Socratic AI Tutor
app.post('/api/os/tutor', async (req: Request, res: Response) => {
  try {
    const { topic, level } = req.body;
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required.' });
    }

    if (isValidKey(process.env.GEMINI_API_KEY)) {
      try {
        const aiCall = ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Teach the topic "${topic}" at level "${level || 'curious learner'}".`,
          config: {
            systemInstruction: `You are the Argon OS Intelligent Education Tutor.
Teach clearly, foster deep intuition rather than rote memorization, and avoid bloat.
Return strictly valid JSON matching the schema with:
- explanation: concise 2-3 sentence intuitive explanation
- keyPrinciple: 1 crisp core formula, law, or mental model
- practicePrompt: 1 hands-on thought experiment the learner can try right now
- quizQuestion: 1 conceptual check question
- quizOptions: exactly 3 short answer choices
- correctIndex: 0, 1, or 2
- hint: helpful Socratic hint without giving away the answer immediately`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                explanation: { type: Type.STRING },
                keyPrinciple: { type: Type.STRING },
                practicePrompt: { type: Type.STRING },
                quizQuestion: { type: Type.STRING },
                quizOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                hint: { type: Type.STRING },
              },
              required: [
                'explanation',
                'keyPrinciple',
                'practicePrompt',
                'quizQuestion',
                'quizOptions',
                'correctIndex',
                'hint',
              ],
            },
          },
        });

        const response: any = await aiCall;
        const parsed = JSON.parse(response.text?.trim() || '{}');
        if (parsed.explanation && Array.isArray(parsed.quizOptions)) {
          return res.json(parsed);
        }
      } catch (err) {
        console.warn('Gemini tutor fallback:', err);
      }
    }

    return res.json({
      explanation: `${topic} is best understood by looking at how inputs transform into predictable system behavior. Rather than memorizing isolated facts, trace the core feedback loop and conservation rule governing how ${topic} responds when you vary one parameter at a time.`,
      keyPrinciple: `System State(t+1) = State(t) + Net Rate × Δt — isolate one variable to observe cause and effect.`,
      practicePrompt: `Open the Interactive Lab tab and double a single parameter while keeping others constant. Predict whether the rate increases linearly or non-linearly before pressing Play.`,
      quizQuestion: `When studying "${topic}" scientifically, what reveals causal structure most reliably?`,
      quizOptions: [
        'Varying one controlled parameter while observing the system response',
        'Changing every parameter simultaneously without recording baselines',
        'Memorizing final numbers without testing edge conditions',
      ],
      correctIndex: 0,
      hint: 'Think about how controlled experiments separate signal from noise.',
    });
  } catch (error) {
    console.error('Error in /api/os/tutor:', error);
    return res.status(500).json({ error: 'Failed to load tutoring session.' });
  }
});

// DayScore AI — Daily Reflection & Self-Improvement Evaluation
const DAYSCORE_SYSTEM_INSTRUCTION = `You are DayScore AI, an intelligent daily reflection and self-improvement coach built into the DayScore application.
Your purpose is to help users understand how they used their day and encourage realistic, sustainable improvement.
You are not a therapist, doctor, psychiatrist, judge, teacher, police officer, or moral authority.
You must never shame, insult, humiliate, threaten, manipulate, or emotionally punish the user.
Your role is to provide honest, fair, supportive, and useful feedback.

Evaluate the user's day as one complete unit based on the relationship between the user's apparent responsibilities, intentions, effort, behavior, time usage, circumstances, and personal growth.
Generate exactly one integer score between 0 and 100 (90-100 Exceptional Day, 75-89 Strong Day, 60-74 Decent Day, 40-59 Weak Day, 0-39 Very Difficult Day).
Never score individual tasks, add up activity scores, punish necessary rest or circumstances outside the user's control, diagnose mental/medical conditions, or expose internal scoring math.
Distinguish deliberate avoidance from circumstantial difficulty and healthy rest. Use cautious reasoning if information is brief.
Provide 3 to 5 specific, realistic, encouraging improvements, one realistic tomorrow_challenge, one genuine supported strength, an encouraging emoji matching the score & tone, a concise supportive title, a personalized summary, and a supportive closing encouragement.
If the user expresses potential immediate danger or self-harm, prioritize a supportive safety response encouraging contacting local emergency services or a trusted person and never punish them with a harsh score.
Return valid JSON only matching the required schema.`;

app.post('/api/dayscore/evaluate', async (req: Request, res: Response) => {
  try {
    const { journal } = req.body;
    if (!journal || typeof journal !== 'string' || !journal.trim()) {
      return res.status(400).json({ error: 'Please write a short reflection of your day first.' });
    }

    if (!isValidKey(process.env.GEMINI_API_KEY)) {
      return res.status(503).json({
        error: 'DayScore AI engine is not configured with an active Gemini API key on the server.',
      });
    }

    const aiResponse: any = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `User's daily reflection:\n"""\n${journal.trim().slice(0, 6000)}\n"""`,
      config: {
        systemInstruction: DAYSCORE_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            emoji: { type: Type.STRING },
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            strength: { type: Type.STRING },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            tomorrow_challenge: { type: Type.STRING },
            encouragement: { type: Type.STRING },
          },
          required: [
            'score',
            'emoji',
            'title',
            'summary',
            'strength',
            'improvements',
            'tomorrow_challenge',
            'encouragement',
          ],
        },
      },
    });

    const parsed = JSON.parse(aiResponse.text?.trim() || '{}');
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 50))));
    const improvements = Array.isArray(parsed.improvements)
      ? parsed.improvements.filter((s: unknown) => typeof s === 'string' && s.trim()).slice(0, 5)
      : [];

    if (!parsed.title || !parsed.summary || improvements.length < 1) {
      return res.status(502).json({ error: 'Received an incomplete DayScore evaluation.' });
    }

    return res.json({
      score,
      emoji: String(parsed.emoji || '🙂'),
      title: String(parsed.title),
      summary: String(parsed.summary),
      strength: String(parsed.strength || 'Taking time to reflect honestly on your day.'),
      improvements,
      tomorrow_challenge: String(
        parsed.tomorrow_challenge || 'Choose one meaningful priority and protect 30 focused minutes for it tomorrow.'
      ),
      encouragement: String(
        parsed.encouragement || 'This is where you are today. You can build steadily from here.'
      ),
    });
  } catch (error) {
    console.error('Error in /api/dayscore/evaluate:', error);
    return res.status(502).json({
      error: 'Unable to evaluate your reflection right now. Please try again in a moment.',
    });
  }
});

// Safe read-only web knowledge & encyclopedia reader for Quantum Browser
app.get('/api/os/browse', async (req: Request, res: Response) => {
  try {
    const rawQuery = String(req.query.q || '').trim();
    if (!rawQuery) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
        rawQuery
      )}&limit=5&namespace=0&format=json`;
      const searchRes = await fetch(searchUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ArgonOS-QuantumBrowser/1.0 (Local-First Reader)' },
      });

      if (!searchRes.ok) {
        throw new Error(`Search returned ${searchRes.status}`);
      }

      const searchJson = (await searchRes.json()) as [string, string[], string[], string[]];
      const titles = searchJson[1] || [];
      const urls = searchJson[3] || [];

      if (titles.length === 0) {
        return res.json({
          found: false,
          query: rawQuery,
          results: [],
        });
      }

      const topTitle = titles[0];
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        topTitle.replace(/ /g, '_')
      )}`;
      const summaryRes = await fetch(summaryUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ArgonOS-QuantumBrowser/1.0 (Local-First Reader)' },
      });

      let summaryData: any = null;
      if (summaryRes.ok) {
        summaryData = await summaryRes.json();
      }

      return res.json({
        found: true,
        query: rawQuery,
        title: summaryData?.title || topTitle,
        description: summaryData?.description || 'Public Knowledge Entry',
        extract:
          summaryData?.extract ||
          `Matched "${topTitle}". Open the external source link to read the complete document.`,
        sourceUrl: summaryData?.content_urls?.desktop?.page || urls[0] || '',
        thumbnail: summaryData?.thumbnail?.source || null,
        related: titles.slice(1).map((t, i) => ({
          title: t,
          url: urls[i + 1] || '',
        })),
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn('Error in /api/os/browse:', error);
    return res.status(502).json({ error: 'External network unreachable or blocked.' });
  }
});

// System telemetry & hardware sync endpoint
app.get('/api/system/health', (_req: Request, res: Response) => {
  res.json({
    os: 'Argon OS v1.0 (Sovereign Microkernel)',
    architecture: 'Capability-Based Local-First Kernel + Autonomous Agent IPC',
    uptimeSeconds: Math.floor(process.uptime()),
    status: 'SYSTEM_OPTIMAL',
    securityStatus: 'HARDWARE_ENCLAVE_ACTIVE',
    storage: {
      totalGb: 256,
      usedGb: 48.2,
      freeGb: 207.8,
    },
    batteryHealth: '100% (Cycle count: 42)',
    npuStatus: 'Online (On-Device Neural Engine)',
    activeServices: [
      'IntentCompositor-120Hz',
      'AgentPermissionBroker',
      'WellbeingGovernor',
      'KnowledgeVault-Local',
      'ShieldFirewall-L4',
    ],
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Argon OS Core Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
