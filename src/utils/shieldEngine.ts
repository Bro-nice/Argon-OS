import { AppId, BlockedEvent, DeviceSpace, ShieldStats } from '../types/os';
import { readSpaceData, writeSpaceData } from './localVault';

const ALL_PROTECTED_APPS: AppId[] = [
  'browser',
  'messages',
  'phone',
  'camera',
  'files',
  'gallery',
  'music',
  'settings',
  'appstore',
  'terminal',
  'notes',
  'weather',
  'calculator',
  'clock',
  'vitals',
  'game',
  'shield',
  'ghost',
];

const INITIAL_BLOCKED_EVENTS: BlockedEvent[] = [
  {
    id: 'blk_1',
    appId: 'browser',
    appName: 'Quantum Browser',
    domain: 'doubleclick.net',
    category: 'ad',
    timestamp: 'Just now',
    bytesSaved: 420,
  },
  {
    id: 'blk_2',
    appId: 'browser',
    appName: 'Quantum Browser',
    domain: 'connect.facebook.net',
    category: 'tracker',
    timestamp: '1m ago',
    bytesSaved: 185,
  },
  {
    id: 'blk_3',
    appId: 'weather',
    appName: 'Weather',
    domain: 'telemetry.ad-sdk.io',
    category: 'telemetry',
    timestamp: '3m ago',
    bytesSaved: 94,
  },
  {
    id: 'blk_4',
    appId: 'music',
    appName: 'Music',
    domain: 'fingerprint.audio-metrics.com',
    category: 'fingerprint',
    timestamp: '5m ago',
    bytesSaved: 120,
  },
  {
    id: 'blk_5',
    appId: 'appstore',
    appName: 'Market',
    domain: 'analytics.google.com',
    category: 'tracker',
    timestamp: '8m ago',
    bytesSaved: 310,
  },
];

export const KNOWN_BLOCKLIST_DOMAINS: Array<{
  domain: string;
  category: BlockedEvent['category'];
  bytesSaved: number;
}> = [
  { domain: 'doubleclick.net', category: 'ad', bytesSaved: 480 },
  { domain: 'pagead2.googlesyndication.com', category: 'ad', bytesSaved: 610 },
  { domain: 'google-analytics.com', category: 'tracker', bytesSaved: 210 },
  { domain: 'connect.facebook.net', category: 'tracker', bytesSaved: 295 },
  { domain: 'pixel.ads.twitter.com', category: 'tracker', bytesSaved: 145 },
  { domain: 'fingerprintjs.com', category: 'fingerprint', bytesSaved: 320 },
  { domain: 'metrics.icloud-beacon.net', category: 'telemetry', bytesSaved: 110 },
  { domain: 'ads.tiktok-analytics.com', category: 'ad', bytesSaved: 530 },
  { domain: 'coinhive-miner.cdn.io', category: 'cryptominer', bytesSaved: 890 },
  { domain: 'scorecardresearch.com', category: 'tracker', bytesSaved: 175 },
];

function createDefaultShieldStats(space: DeviceSpace): ShieldStats {
  const perAppShield: Record<string, boolean> = {};
  ALL_PROTECTED_APPS.forEach((id) => {
    perAppShield[id] = true;
  });

  return {
    adsBlocked: space === 'ghost' ? 42 : 128,
    trackersBlocked: space === 'ghost' ? 29 : 84,
    fingerprintsNeutralized: space === 'ghost' ? 19 : 37,
    bandwidthSavedKb: space === 'ghost' ? 1420 : 4890,
    blockedLog: space === 'ghost' ? INITIAL_BLOCKED_EVENTS.slice(0, 2) : INITIAL_BLOCKED_EVENTS,
    perAppShield,
  };
}

export function loadShieldStats(space: DeviceSpace): ShieldStats {
  const defaultStats = createDefaultShieldStats(space);
  const stored = readSpaceData<ShieldStats | null>(space, 'shield_stats', null);
  if (!stored) {
    writeSpaceData(space, 'shield_stats', defaultStats);
    return defaultStats;
  }
  return {
    ...defaultStats,
    ...stored,
    perAppShield: { ...defaultStats.perAppShield, ...(stored.perAppShield || {}) },
  };
}

export function saveShieldStats(space: DeviceSpace, stats: ShieldStats): void {
  writeSpaceData(space, 'shield_stats', stats);
}

export function recordBlockedEvent(
  space: DeviceSpace,
  current: ShieldStats,
  appId: AppId,
  appName: string,
  domain: string,
  category: BlockedEvent['category'],
  bytesSaved: number = 180
): ShieldStats {
  const isAppProtected = current.perAppShield[appId] !== false;
  if (!isAppProtected) return current;

  const event: BlockedEvent = {
    id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    appId,
    appName,
    domain,
    category,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    bytesSaved,
  };

  const next: ShieldStats = {
    ...current,
    adsBlocked: current.adsBlocked + (category === 'ad' ? 1 : 0),
    trackersBlocked: current.trackersBlocked + (category === 'tracker' || category === 'telemetry' ? 1 : 0),
    fingerprintsNeutralized:
      current.fingerprintsNeutralized + (category === 'fingerprint' || category === 'cryptominer' ? 1 : 0),
    bandwidthSavedKb: current.bandwidthSavedKb + bytesSaved,
    blockedLog: [event, ...current.blockedLog].slice(0, 40),
  };

  saveShieldStats(space, next);
  return next;
}

export function runBatchTrackerScan(
  space: DeviceSpace,
  current: ShieldStats,
  appId: AppId,
  appName: string,
  count: number = 5
): { nextStats: ShieldStats; blockedInBatch: BlockedEvent[] } {
  let working = current;
  const blockedInBatch: BlockedEvent[] = [];

  for (let i = 0; i < count; i++) {
    const sample = KNOWN_BLOCKLIST_DOMAINS[Math.floor(Math.random() * KNOWN_BLOCKLIST_DOMAINS.length)];
    working = recordBlockedEvent(space, working, appId, appName, sample.domain, sample.category, sample.bytesSaved);
    if (working.blockedLog[0]) {
      blockedInBatch.push(working.blockedLog[0]);
    }
  }

  return { nextStats: working, blockedInBatch };
}
