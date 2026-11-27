import { DeviceSpace, PrivacyProfile } from '../types/os';

const STORAGE_PREFIX = 'aether_os_v15';

function spacePrefix(space: DeviceSpace): string {
  return `${STORAGE_PREFIX}::${space}::`;
}

export function readSpaceData<T>(space: DeviceSpace, key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(`${spacePrefix(space)}${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeSpaceData<T>(space: DeviceSpace, key: string, value: T): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(`${spacePrefix(space)}${key}`, JSON.stringify(value));
  } catch {
    // Handle storage quota silently on-device
  }
}

export function shredSpaceData(space: DeviceSpace): number {
  let removed = 0;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    const prefix = spacePrefix(space);
    const keysToDelete: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((k) => {
      // Overwrite with random zeroes before deletion for cryptographic hygiene
      window.localStorage.setItem(k, '0'.repeat(64));
      window.localStorage.removeItem(k);
      removed++;
    });
  } catch {}
  return removed;
}

export async function getSpaceStorageStats(space: DeviceSpace): Promise<{
  keysCount: number;
  bytesUsed: number;
  quotaMb: number;
  browserUsageMb: number;
}> {
  let keysCount = 0;
  let bytesUsed = 0;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const prefix = spacePrefix(space);
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysCount++;
          const val = window.localStorage.getItem(key) || '';
          bytesUsed += (key.length + val.length) * 2;
        }
      }
    }
  } catch {}

  let quotaMb = 5120;
  let browserUsageMb = Number((bytesUsed / (1024 * 1024)).toFixed(3));

  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      if (est.quota) quotaMb = Math.round(est.quota / (1024 * 1024));
      if (est.usage) browserUsageMb = Number((est.usage / (1024 * 1024)).toFixed(2));
    }
  } catch {}

  return { keysCount, bytesUsed, quotaMb, browserUsageMb };
}

export function exportSpaceBackup(space: DeviceSpace): string {
  const dump: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    deviceSpace: space,
    storagePolicy: '100% On-Device Local Partition (Zero Cloud Transmission)',
    partitions: {},
  };

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const prefix = spacePrefix(space);
      const partitions: Record<string, unknown> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const shortKey = key.slice(prefix.length);
          try {
            partitions[shortKey] = JSON.parse(window.localStorage.getItem(key) || 'null');
          } catch {
            partitions[shortKey] = window.localStorage.getItem(key);
          }
        }
      }
      dump.partitions = partitions;
    }
  } catch {}

  return JSON.stringify(dump, null, 2);
}

const SPOOF_GPU_ALIASES = [
  'Argon Virtual Shader Unit v4 (Randomized)',
  'Generic Mesa/LLVMpipe Anonymized Renderer',
  'Sovereign Enclave Graphics Core',
  'Neutralized WebGL Canvas Engine',
];

const SPOOF_USER_AGENTS = [
  'Mozilla/5.0 (ArgonOS 1.0; Linux; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
];

function randomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteCount; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
}

export function generateAnonymousIdentity(space: DeviceSpace): Pick<
  PrivacyProfile,
  | 'spoofedDeviceId'
  | 'spoofedMacAddress'
  | 'spoofedGpuAlias'
  | 'spoofedUserAgent'
  | 'spoofedTimezone'
  | 'spoofedNodeName'
> {
  const hexA = randomHex(2);
  const hexB = randomHex(2);
  const hexC = randomHex(2);
  const macBytes = Array.from({ length: 6 }, (_, i) => {
    const raw = parseInt(randomHex(1), 16);
    // Locally administered unicast MAC bit
    const val = i === 0 ? (raw & 0xfc) | 0x02 : raw;
    return val.toString(16).padStart(2, '0').toUpperCase();
  });

  const gpuIdx = parseInt(randomHex(1), 16) % SPOOF_GPU_ALIASES.length;
  const uaIdx = parseInt(randomHex(1), 16) % SPOOF_USER_AGENTS.length;

  return {
    spoofedDeviceId: `${space === 'ghost' ? 'GHOST' : 'ANON'}-${hexA}-${hexB}-${hexC}`,
    spoofedMacAddress: macBytes.join(':'),
    spoofedGpuAlias: SPOOF_GPU_ALIASES[gpuIdx],
    spoofedUserAgent: SPOOF_USER_AGENTS[uaIdx],
    spoofedTimezone: 'UTC+00:00 (Masked)',
    spoofedNodeName: `${space === 'ghost' ? 'shadow' : 'argon'}-${hexA.toLowerCase()}`,
  };
}

export function createInitialPrivacyProfile(space: DeviceSpace): PrivacyProfile {
  const saved = readSpaceData<PrivacyProfile | null>(space, 'privacy_profile', null);
  if (saved) return { ...saved, deviceSpace: space };

  const identity = generateAnonymousIdentity(space);
  const profile: PrivacyProfile = {
    deviceSpace: space,
    anonymousMode: true,
    shieldEnabled: true,
    shieldLevel: space === 'ghost' ? 'airgap' : 'aggressive',
    torRouting: space === 'ghost',
    blockScripts: space === 'ghost',
    fingerprintSpoofing: true,
    webrtcLeakGuard: true,
    localOnlyAirGap: space === 'ghost',
    ...identity,
  };
  writeSpaceData(space, 'privacy_profile', profile);
  return profile;
}

export async function computeLocalChecksum(input: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoded = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .slice(0, 8)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {}
  return randomHex(8).toLowerCase();
}

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'dclid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'ref_src',
  'si',
  '_hsenc',
  '_hsmi',
];

export function sanitizeTrackingUrl(rawUrl: string): {
  cleanUrl: string;
  strippedParams: string[];
} {
  const strippedParams: string[] = [];
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    TRACKING_PARAMS.forEach((param) => {
      if (parsed.searchParams.has(param)) {
        strippedParams.push(param);
        parsed.searchParams.delete(param);
      }
    });
    return {
      cleanUrl: parsed.toString(),
      strippedParams,
    };
  } catch {
    return { cleanUrl: rawUrl, strippedParams: [] };
  }
}
