import {
  DeviceSpace,
  EcoProfile,
  KnowledgeNode,
  PermissionAuditEntry,
  WellbeingState,
} from '../types/os';
import { readSpaceData, writeSpaceData } from './localVault';

export function getDefaultWellbeingState(): WellbeingState {
  return {
    focusDurationMin: 25,
    focusSecondsLeft: 25 * 60,
    focusActive: false,
    focusIntent: 'Deep Work & Learning',
    calmGrayscale: false,
    dailyFocusMinutes: 45,
    focusSessionsCompleted: 2,
    appBudgetsMin: {
      browser: 45,
      messages: 30,
      game: 20,
    },
    currentIntention: 'Create something meaningful with calm, unbroken focus.',
  };
}

export function loadWellbeingState(space: DeviceSpace): WellbeingState {
  return readSpaceData<WellbeingState>(space, 'wellbeing_state', getDefaultWellbeingState());
}

export function saveWellbeingState(space: DeviceSpace, state: WellbeingState): void {
  writeSpaceData(space, 'wellbeing_state', state);
}

export function getDefaultEcoProfile(): EcoProfile {
  return {
    ecoMode: false,
    reducedMotion: false,
    oledDarkSaver: true,
    estimatedWhSaved: 1.4,
    activeFormFactor: 'phone',
  };
}

export function loadEcoProfile(space: DeviceSpace): EcoProfile {
  return readSpaceData<EcoProfile>(space, 'eco_profile', getDefaultEcoProfile());
}

export function saveEcoProfile(space: DeviceSpace, profile: EcoProfile): void {
  writeSpaceData(space, 'eco_profile', profile);
}

export function getDefaultKnowledgeNodes(space: DeviceSpace): KnowledgeNode[] {
  const now = new Date().toISOString();
  if (space === 'ghost') {
    return [
      {
        id: 'gk-1',
        title: 'Air-Gapped Operational Security',
        content:
          'All notes inside Ghost Space are encrypted to an isolated local partition. Zero bytes sync to external clouds or Primary Space.',
        tags: ['security', 'enclave'],
        linkedIds: ['gk-2'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'gk-2',
        title: 'Cryptographic Identity Hygiene',
        content:
          'Rotate device MAC and GPU masks before sensitive browsing. Strip UTM and tracking query parameters automatically via Shield.',
        tags: ['privacy', 'network'],
        linkedIds: ['gk-1'],
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  return [
    {
      id: 'kn-1',
      title: 'Argon OS Philosophy',
      content:
        'Technology should evolve around humanity, not humanity around technology. Calm attention, local sovereignty, and lifelong learning come first.',
      tags: ['principles', 'design'],
      linkedIds: ['kn-2', 'kn-3'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'kn-2',
      title: 'Conservation of Energy in Oscillators',
      content:
        'In a harmonic pendulum, total mechanical energy stays constant when damping = 0: Potential energy mgh trades smoothly into kinetic energy 1/2 mv^2 at the bottom arc.',
      tags: ['physics', 'learning'],
      linkedIds: ['kn-1', 'kn-4'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'kn-3',
      title: 'Digital Sovereignty & Local Vault',
      content:
        'User files, knowledge graphs, and agent audit logs stay on-device by default. Export portable JSON or Markdown snapshots anytime.',
      tags: ['privacy', 'sovereignty'],
      linkedIds: ['kn-1'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'kn-4',
      title: 'Wave Interference Principles',
      content:
        'When two coherent waves overlap, amplitudes sum linearly. Path differences of whole wavelengths create constructive nodes; half-wavelength offsets cancel.',
      tags: ['physics', 'waves'],
      linkedIds: ['kn-2'],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function loadKnowledgeNodes(space: DeviceSpace): KnowledgeNode[] {
  return readSpaceData<KnowledgeNode[]>(space, 'knowledge_nodes', getDefaultKnowledgeNodes(space));
}

export function saveKnowledgeNodes(space: DeviceSpace, nodes: KnowledgeNode[]): void {
  writeSpaceData(space, 'knowledge_nodes', nodes);
}

export function addKnowledgeNode(
  space: DeviceSpace,
  title: string,
  content: string,
  tags: string[] = ['captured'],
  linkedIds: string[] = []
): KnowledgeNode[] {
  const current = loadKnowledgeNodes(space);
  const now = new Date().toISOString();
  const node: KnowledgeNode = {
    id: `kn-${Date.now()}`,
    title: title.trim() || 'Untitled Insight',
    content: content.trim(),
    tags,
    linkedIds,
    createdAt: now,
    updatedAt: now,
  };
  const updated = [node, ...current];
  saveKnowledgeNodes(space, updated);
  return updated;
}

export function loadPermissionAuditLog(space: DeviceSpace): PermissionAuditEntry[] {
  return readSpaceData<PermissionAuditEntry[]>(space, 'permission_audit', [
    {
      id: 'audit-init',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actor: 'Argon OS Kernel',
      scope: 'storage:local_enclave',
      action: 'Initialized space-isolated on-device vault',
      outcome: 'approved',
      explanation: 'Zero-cloud local storage partition verified at boot.',
    },
  ]);
}

export function appendPermissionAudit(
  space: DeviceSpace,
  entry: Omit<PermissionAuditEntry, 'id' | 'timestamp'>
): PermissionAuditEntry[] {
  const current = loadPermissionAuditLog(space);
  const next: PermissionAuditEntry[] = [
    {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ...entry,
    },
    ...current,
  ].slice(0, 60);
  writeSpaceData(space, 'permission_audit', next);
  return next;
}
