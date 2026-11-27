// Deep Real-Time Hardware Synchronization & Master Web Audio Engine

import { HardwareState } from '../types/os';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let currentVolumeScalar = 0.75;

let ambientMusicOsc1: OscillatorNode | null = null;
let ambientMusicOsc2: OscillatorNode | null = null;
let ambientMusicGain: GainNode | null = null;

let wakeLockSentinel: any = null;
let torchStream: MediaStream | null = null;

function getAudioContext(): { ctx: AudioContext; out: GainNode } {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = currentVolumeScalar;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  if (!masterGain) {
    masterGain = audioCtx.createGain();
    masterGain.gain.value = currentVolumeScalar;
    masterGain.connect(audioCtx.destination);
  }
  return { ctx: audioCtx, out: masterGain };
}

export function setMasterAudioVolume(volumeLevel: number, isMuted: boolean) {
  currentVolumeScalar = isMuted ? 0 : Math.max(0, Math.min(1, volumeLevel / 100));
  if (masterGain && audioCtx) {
    try {
      masterGain.gain.setTargetAtTime(currentVolumeScalar, audioCtx.currentTime, 0.02);
    } catch {}
  }
}

// DTMF Frequencies for Telephone Keypad
const DTMF_FREQS: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

export function playDtmfTone(key: string, durationMs: number = 140) {
  try {
    const { ctx, out } = getAudioContext();
    const freqs = DTMF_FREQS[key] || [440, 880];

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = freqs[0];
    osc2.frequency.value = freqs[1];

    gainNode.gain.setValueAtTime(0.16, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(out);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + durationMs / 1000);
    osc2.stop(ctx.currentTime + durationMs / 1000);

    triggerHaptic(15);
  } catch {}
}

export function playShutterSound() {
  try {
    const { ctx, out } = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(850, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gainNode);
    gainNode.connect(out);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);

    triggerHaptic([20, 30, 20]);
  } catch {}
}

export function playLockChime(isLocking: boolean) {
  try {
    const { ctx, out } = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startFreq = isLocking ? 620 : 340;
    const endFreq = isLocking ? 220 : 680;

    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(out);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);

    triggerHaptic(20);
  } catch {}
}

export function startAmbientAudioStream(frequencyHz: number = 432) {
  try {
    const { ctx, out } = getAudioContext();
    if (ambientMusicGain) {
      stopAmbientAudioStream();
    }

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.value = frequencyHz;
    osc2.frequency.value = frequencyHz * 1.5;

    filter.type = 'lowpass';
    filter.frequency.value = 850;

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 1.2);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc1.start();
    osc2.start();

    ambientMusicOsc1 = osc1;
    ambientMusicOsc2 = osc2;
    ambientMusicGain = gain;
  } catch {}
}

export function stopAmbientAudioStream() {
  try {
    if (ambientMusicGain && audioCtx) {
      ambientMusicGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      setTimeout(() => {
        try {
          ambientMusicOsc1?.stop();
          ambientMusicOsc2?.stop();
          ambientMusicOsc1?.disconnect();
          ambientMusicOsc2?.disconnect();
          ambientMusicGain?.disconnect();
        } catch {}
        ambientMusicOsc1 = null;
        ambientMusicOsc2 = null;
        ambientMusicGain = null;
      }, 500);
    }
  } catch {}
}

export function triggerHaptic(pattern: number | number[] = 15) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

export async function toggleHardwareWakeLock(enable: boolean): Promise<boolean> {
  try {
    if (enable && 'wakeLock' in navigator) {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      return true;
    }
    if (!enable && wakeLockSentinel) {
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
      return false;
    }
  } catch {}
  return false;
}

export async function setHardwareTorch(enable: boolean): Promise<boolean> {
  try {
    if (enable) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        torchStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        const track = torchStream.getVideoTracks()[0];
        const caps = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
        if (caps.torch) {
          await (track as any).applyConstraints({ advanced: [{ torch: true }] });
          return true;
        }
      }
    } else if (torchStream) {
      torchStream.getTracks().forEach((t) => t.stop());
      torchStream = null;
    }
  } catch {
    if (torchStream) {
      torchStream.getTracks().forEach((t) => t.stop());
      torchStream = null;
    }
  }
  return false;
}

function getGpuInfo(): { renderer: string; vendor: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      const dbg = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        return {
          renderer:
            (gl as any).getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'Hardware GPU Accelerator',
          vendor: (gl as any).getParameter(dbg.UNMASKED_VENDOR_WEBGL) || 'WebGL 2.0 Hardware',
        };
      }
    }
  } catch {}
  return {
    renderer: 'Hardware Graphics Pipeline (WebGL)',
    vendor: 'Standard Host GPU',
  };
}

function getHostPlatform(): string {
  if (typeof navigator === 'undefined') return 'Embedded Host';
  const uaData = (navigator as any).userAgentData;
  if (uaData?.platform) return `${uaData.platform} Host`;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Apple iOS Hardware';
  if (/Android/i.test(ua)) return 'Android Linux Hardware';
  if (/Mac/i.test(ua)) return 'Apple macOS Hardware';
  if (/Win/i.test(ua)) return 'Windows Hardware';
  if (/Linux/i.test(ua)) return 'GNU/Linux Hardware';
  return 'Physical Host Platform';
}

function getHostBrowser(): string {
  if (typeof navigator === 'undefined') return 'Web Engine';
  const ua = navigator.userAgent;
  if (/Edg/i.test(ua)) return 'Edge Chromium';
  if (/Chrome/i.test(ua)) return 'Chromium Engine';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'WebKit Native';
  if (/Firefox/i.test(ua)) return 'Gecko Engine';
  return 'Native Web Engine';
}

export function measureHostRefreshRate(onMeasured: (hz: number) => void): () => void {
  if (typeof window === 'undefined' || !window.requestAnimationFrame) return () => {};
  let frames = 0;
  let start = performance.now();
  let cancelled = false;
  let rafId = 0;

  const tick = (now: number) => {
    if (cancelled) return;
    frames++;
    const elapsed = now - start;
    if (elapsed >= 600) {
      const rawHz = (frames * 1000) / elapsed;
      const snappedHz =
        rawHz > 132 ? 144 : rawHz > 105 ? 120 : rawHz > 80 ? 90 : rawHz > 50 ? 60 : Math.round(rawHz);
      onMeasured(snappedHz);
      return;
    }
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}

export async function enumerateHostMediaDevices(): Promise<{
  cameraCount: number;
  micCount: number;
  speakerCount: number;
}> {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        cameraCount: devices.filter((d) => d.kind === 'videoinput').length,
        micCount: devices.filter((d) => d.kind === 'audioinput').length,
        speakerCount: devices.filter((d) => d.kind === 'audiooutput').length,
      };
    }
  } catch {}
  return { cameraCount: 1, micCount: 1, speakerCount: 1 };
}

export async function syncHostGeolocation(): Promise<{ coords: string; city: string } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(3);
        const lon = pos.coords.longitude.toFixed(3);
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Host';
        resolve({ coords: `${lat}°, ${lon}°`, city: tz.split('/').pop()?.replace(/_/g, ' ') || tz });
      },
      () => resolve(null),
      { timeout: 4000, enableHighAccuracy: false }
    );
  });
}

export async function requestSensorPermissions(
  onUpdate: (partial: Partial<HardwareState>) => void
): Promise<string> {
  try {
    const devOrient = DeviceOrientationEvent as any;
    if (devOrient && typeof devOrient.requestPermission === 'function') {
      await devOrient.requestPermission();
    }
  } catch {}

  const media = await enumerateHostMediaDevices();
  onUpdate(media);

  const geo = await syncHostGeolocation();
  if (geo) {
    onUpdate({
      geolocationCoords: geo.coords,
      geolocationCity: geo.city,
      locationOn: true,
    });
    return `Synced GPS (${geo.coords}) & ${media.cameraCount} cam / ${media.micCount} mic`;
  }

  return `Synced ${media.cameraCount} cameras, ${media.micCount} mics, ${media.speakerCount} audio outputs`;
}

function readNetworkSnapshot(): Partial<HardwareState> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    return { isOnline: false, networkType: 'Offline', networkSpeedMbps: 0, networkRttMs: 0 };
  }
  const conn = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
  const downlink = conn?.downlink ? Math.round(conn.downlink) : 100;
  const rtt = typeof conn?.rtt === 'number' ? conn.rtt : 18;
  const eff = conn?.effectiveType || '4g';
  const networkType: HardwareState['networkType'] =
    eff === '4g' && downlink >= 50 ? '6G / Wi-Fi 7' : eff === '4g' ? '5G Ultra' : '4G LTE';

  return {
    isOnline: true,
    networkType,
    networkSpeedMbps: downlink,
    networkRttMs: rtt,
  };
}

function readDisplaySnapshot(): Partial<HardwareState> {
  if (typeof window === 'undefined') return {};
  const isLandscape = window.innerWidth > window.innerHeight;
  const p3 = window.matchMedia && window.matchMedia('(color-gamut: p3)').matches;
  return {
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: Number((window.devicePixelRatio || 1).toFixed(2)),
    colorGamut: p3 ? 'Display P3' : 'sRGB',
    touchPoints: navigator.maxTouchPoints || 0,
    deviceOrientation: isLandscape ? 'landscape' : 'portrait',
  };
}

export function subscribeToRealHardware(
  onUpdate: (partial: Partial<HardwareState>) => void
): () => void {
  const gpu = getGpuInfo();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  const tzCity = tz.split('/').pop()?.replace(/_/g, ' ') || tz;
  const mem = (performance as any)?.memory;

  onUpdate({
    cpuCores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8,
    memoryTotalGb:
      typeof navigator !== 'undefined' && (navigator as any).deviceMemory
        ? (navigator as any).deviceMemory
        : 8,
    gpuRenderer: gpu.renderer,
    gpuVendor: gpu.vendor,
    hostPlatform: getHostPlatform(),
    hostBrowser: getHostBrowser(),
    hostTimezone: tz,
    geolocationCity: tzCity,
    jsHeapUsedMb: mem ? Math.round(mem.usedJSHeapSize / (1024 * 1024)) : null,
    ...readNetworkSnapshot(),
    ...readDisplaySnapshot(),
  });

  // Live Refresh Rate Measurement
  const cancelHz = measureHostRefreshRate((hz) => onUpdate({ refreshRateHz: hz }));

  // Live Storage Estimate
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage
      .estimate()
      .then((est) => {
        onUpdate({
          storageQuotaGb: est.quota ? Number((est.quota / (1024 * 1024 * 1024)).toFixed(1)) : 64,
          storageUsedMb: est.usage ? Number((est.usage / (1024 * 1024)).toFixed(2)) : 0,
        });
      })
      .catch(() => {});
  }

  // Live Media Devices
  enumerateHostMediaDevices().then(onUpdate);

  // Live Battery Events
  let batteryRef: any = null;
  const updateBattery = () => {
    if (!batteryRef) return;
    onUpdate({
      batteryLevel: Math.round(batteryRef.level * 100),
      isCharging: batteryRef.charging,
      batteryChargingTimeSec:
        Number.isFinite(batteryRef.chargingTime) && batteryRef.chargingTime > 0
          ? batteryRef.chargingTime
          : null,
      batteryDischargingTimeSec:
        Number.isFinite(batteryRef.dischargingTime) && batteryRef.dischargingTime > 0
          ? batteryRef.dischargingTime
          : null,
    });
  };

  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    (navigator as any)
      .getBattery()
      .then((bat: any) => {
        batteryRef = bat;
        updateBattery();
        bat.addEventListener('levelchange', updateBattery);
        bat.addEventListener('chargingchange', updateBattery);
        bat.addEventListener('chargingtimechange', updateBattery);
        bat.addEventListener('dischargingtimechange', updateBattery);
      })
      .catch(() => {});
  }

  // Live Network Events
  const handleNetChange = () => onUpdate(readNetworkSnapshot());
  window.addEventListener('online', handleNetChange);
  window.addEventListener('offline', handleNetChange);
  const conn = (navigator as any).connection;
  if (conn && conn.addEventListener) {
    conn.addEventListener('change', handleNetChange);
  }

  // Live Display & Orientation Events
  const handleDisplayChange = () => onUpdate(readDisplaySnapshot());
  window.addEventListener('resize', handleDisplayChange);
  window.addEventListener('orientationchange', handleDisplayChange);

  // Live Gyroscope / Orientation Tilt
  const handleMotionTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma !== null || e.beta !== null) {
      onUpdate({
        deviceTiltX: Math.round(Math.max(-45, Math.min(45, e.gamma || 0))),
        deviceTiltY: Math.round(Math.max(-45, Math.min(45, e.beta || 0))),
      });
    }
  };
  window.addEventListener('deviceorientation', handleMotionTilt);

  // Live Media Device Hotplug (headphones/mic/webcam connected/removed)
  const handleDeviceChange = () => enumerateHostMediaDevices().then(onUpdate);
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
  }

  // Periodic JS Heap & Storage telemetry update every 5s
  const telemetryInterval = setInterval(() => {
    const m = (performance as any)?.memory;
    if (m) {
      onUpdate({
        jsHeapUsedMb: Math.round(m.usedJSHeapSize / (1024 * 1024)),
      });
    }
  }, 5000);

  return () => {
    cancelHz();
    clearInterval(telemetryInterval);
    window.removeEventListener('online', handleNetChange);
    window.removeEventListener('offline', handleNetChange);
    window.removeEventListener('resize', handleDisplayChange);
    window.removeEventListener('orientationchange', handleDisplayChange);
    window.removeEventListener('deviceorientation', handleMotionTilt);
    if (conn && conn.removeEventListener) {
      conn.removeEventListener('change', handleNetChange);
    }
    if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    }
    if (batteryRef) {
      batteryRef.removeEventListener('levelchange', updateBattery);
      batteryRef.removeEventListener('chargingchange', updateBattery);
      batteryRef.removeEventListener('chargingtimechange', updateBattery);
      batteryRef.removeEventListener('dischargingtimechange', updateBattery);
    }
  };
}
