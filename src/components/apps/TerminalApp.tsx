import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import { DeviceSpace, FileItem, HardwareState, PrivacyProfile, ShieldStats } from '../../types/os';
import { readSpaceData, writeSpaceData } from '../../utils/localVault';
import { PRIMARY_DEFAULT_FILES, GHOST_DEFAULT_FILES } from './FilesApp';
import { evaluateMathExpression, formatMathResult } from '../../utils/mathEngine';

interface TerminalAppProps {
  deviceSpace: DeviceSpace;
  privacy: PrivacyProfile;
  shieldStats: ShieldStats;
  hardware?: HardwareState;
  onSwitchSpace: (target: DeviceSpace) => void;
  onBurnGhostDevice: () => void;
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
}

const KNOWN_COMMANDS = [
  'help',
  'ls',
  'cd',
  'pwd',
  'cat',
  'touch',
  'echo',
  'rm',
  'calc',
  'whoami',
  'shield',
  'vault',
  'ghost',
  'shred',
  'neofetch',
  'uname',
  'date',
  'free',
  'ps',
  'history',
  'clear',
];

export const TerminalApp: React.FC<TerminalAppProps> = ({
  deviceSpace,
  privacy,
  shieldStats,
  hardware,
  onSwitchSpace,
  onBurnGhostDevice,
}) => {
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('/Documents');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: '1',
      type: 'system',
      text: `Argon OS 1.0 Sovereign Shell (${deviceSpace === 'ghost' ? 'Ghost Enclave' : 'Primary Partition'})`,
    },
    {
      id: '2',
      type: 'system',
      text: 'Linux-compatible userland. Type "help", "ls", "calc 2^8", or "neofetch". Up/Down for history.',
    },
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const getFiles = (): FileItem[] =>
    readSpaceData<FileItem[]>(
      deviceSpace,
      'files',
      deviceSpace === 'ghost' ? GHOST_DEFAULT_FILES : PRIMARY_DEFAULT_FILES
    );

  const saveFiles = (files: FileItem[]) => {
    writeSpaceData(deviceSpace, 'files', files);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = historyIdx < cmdHistory.length - 1 ? historyIdx + 1 : historyIdx;
      setHistoryIdx(nextIdx);
      setInput(cmdHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx <= 0) {
        setHistoryIdx(-1);
        setInput('');
      } else {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInput(cmdHistory[nextIdx]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const trimmed = input.trim().toLowerCase();
      if (!trimmed) return;
      const match = KNOWN_COMMANDS.find((c) => c.startsWith(trimmed));
      if (match) setInput(`${match} `);
    }
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;

    setCmdHistory((prev) => [raw, ...prev].slice(0, 50));
    setHistoryIdx(-1);

    const newLines: TerminalLine[] = [
      ...lines,
      {
        id: `${Date.now()}-in`,
        type: 'input',
        text: `${privacy.spoofedNodeName}:${cwd}$ ${raw}`,
      },
    ];

    // Handle simple redirection: echo text > filename
    const redirectMatch = raw.match(/^echo\s+(.+?)\s*>\s*(\S+)$/i);
    if (redirectMatch) {
      const content = redirectMatch[1].replace(/^["']|["']$/g, '');
      const fname = redirectMatch[2];
      const files = getFiles();
      const existing = files.find((f) => f.name === fname && f.path === cwd);
      if (existing) {
        saveFiles(
          files.map((f) =>
            f.id === existing.id
              ? { ...f, content, sizeBytes: content.length, updatedAt: 'Modified' }
              : f
          )
        );
      } else {
        saveFiles([
          {
            id: Date.now().toString(),
            name: fname,
            path: cwd === '/' ? '/Documents' : cwd,
            type: 'document',
            sizeBytes: content.length,
            updatedAt: 'Created',
            content,
          },
          ...files,
        ]);
      }
      newLines.push({
        id: `${Date.now()}-out`,
        type: 'output',
        text: `Wrote ${content.length} bytes to ${cwd}/${fname}`,
      });
      setLines(newLines);
      setInput('');
      return;
    }

    const parts = raw.split(/\s+/);
    const root = parts[0].toLowerCase();
    const args = parts.slice(1);
    const pushOut = (text: string, type: TerminalLine['type'] = 'output') =>
      newLines.push({ id: `${Date.now()}-${Math.random()}`, type, text });

    switch (root) {
      case 'help':
        pushOut(`Filesystem & Shell:
  ls, pwd, cd <dir>, cat <file>, touch <file>, echo "txt" > <file>, rm <file>
Utilities & Hardware:
  calc <expr>, date, uname -a, free, ps, history, clear
Sovereign Privacy:
  whoami, shield, vault, ghost, shred, neofetch`);
        break;

      case 'pwd':
        pushOut(cwd);
        break;

      case 'cd': {
        const dest = args[0] || '/';
        if (dest === '..' || dest === '/' || dest === '~') {
          setCwd('/');
        } else {
          const clean = dest.startsWith('/') ? dest : `/${dest.replace(/^\.\//, '')}`;
          setCwd(clean);
        }
        break;
      }

      case 'ls': {
        const files = getFiles();
        if (cwd === '/') {
          pushOut('Documents/  Photos/  Downloads/  Audio/');
        } else {
          const inDir = files.filter((f) => f.path.toLowerCase() === cwd.toLowerCase());
          if (inDir.length === 0) {
            pushOut('(empty directory)');
          } else {
            pushOut(
              inDir
                .map((f) => `${f.type.padEnd(9)} ${String(f.sizeBytes).padStart(8)} B  ${f.name}`)
                .join('\n')
            );
          }
        }
        break;
      }

      case 'touch': {
        const fname = args[0];
        if (!fname) {
          pushOut('usage: touch <filename>', 'error');
          break;
        }
        const files = getFiles();
        const targetPath = cwd === '/' ? '/Documents' : cwd;
        if (!files.some((f) => f.name === fname && f.path === targetPath)) {
          saveFiles([
            {
              id: Date.now().toString(),
              name: fname,
              path: targetPath,
              type: 'document',
              sizeBytes: 0,
              updatedAt: 'Just now',
              content: '',
            },
            ...files,
          ]);
        }
        pushOut(`Created ${targetPath}/${fname}`);
        break;
      }

      case 'cat': {
        const fname = args[0];
        if (!fname) {
          pushOut('usage: cat <filename>', 'error');
          break;
        }
        const file = getFiles().find((f) => f.name === fname);
        if (!file) {
          pushOut(`cat: ${fname}: No such file in local partition`, 'error');
        } else {
          pushOut(file.content || `[Binary ${file.type}: ${file.sizeBytes} bytes]`);
        }
        break;
      }

      case 'rm': {
        const fname = args[0];
        if (!fname) {
          pushOut('usage: rm <filename>', 'error');
          break;
        }
        const files = getFiles();
        const next = files.filter((f) => f.name !== fname);
        if (next.length === files.length) {
          pushOut(`rm: cannot remove '${fname}': No such file`, 'error');
        } else {
          saveFiles(next);
          pushOut(`Removed ${fname}`);
        }
        break;
      }

      case 'echo':
        pushOut(args.join(' ').replace(/^["']|["']$/g, ''));
        break;

      case 'calc': {
        const expr = args.join(' ');
        if (!expr) {
          pushOut('usage: calc <expression>  (e.g. calc (12+8)*3)', 'error');
          break;
        }
        try {
          pushOut(formatMathResult(evaluateMathExpression(expr)));
        } catch (err: any) {
          pushOut(`calc error: ${err?.message || 'Invalid expression'}`, 'error');
        }
        break;
      }

      case 'date':
        pushOut(new Date().toString());
        break;

      case 'free':
        pushOut(
          `Host RAM: ${hardware?.memoryTotalGb ?? 8} GB · JS Heap: ${
            hardware?.jsHeapUsedMb ?? 42
          } MB · Disk Quota: ${hardware?.storageQuotaGb ?? 64} GB`
        );
        break;

      case 'ps':
        pushOut(`PID  SERVICE                 STATE
101  argon-intent-compositor  running (${hardware?.refreshRateHz ?? 60}Hz)
102  shield-l4-firewall       ${privacy.shieldEnabled ? 'active' : 'paused'}
103  local-enclave-vault      mounted (${deviceSpace})
104  hardware-sensor-sync     active (${hardware?.cpuCores ?? 8} cores)`);
        break;

      case 'history':
        pushOut(cmdHistory.slice().reverse().map((c, i) => ` ${i + 1}  ${c}`).join('\n') || '(empty)');
        break;

      case 'whoami':
        pushOut(`Space: ${deviceSpace.toUpperCase()}
Alias ID: ${privacy.spoofedDeviceId}
MAC Mask: ${privacy.spoofedMacAddress}
Timezone: ${privacy.spoofedTimezone}
Cloud Sync: DISABLED (100% On-Device)`);
        break;

      case 'shield':
        pushOut(`Argon OS Shield Firewall: ${privacy.shieldEnabled ? 'UP' : 'DOWN'} (${privacy.shieldLevel})
Ads Blocked: ${shieldStats.adsBlocked}
Trackers Blocked: ${shieldStats.trackersBlocked}
Fingerprints Neutralized: ${shieldStats.fingerprintsNeutralized}
Tor Onion Relay: ${privacy.torRouting ? 'ACTIVE' : 'STANDBY'}
Air-Gap Local-Only: ${privacy.localOnlyAirGap ? 'ENFORCED' : 'OFF'}`);
        break;

      case 'vault':
        pushOut(`Storage Policy: 100% On-Device Partition (${deviceSpace})
External Telemetry: 0 bytes transmitted
WebRTC Leak Guard: ${privacy.webrtcLeakGuard ? 'ACTIVE' : 'OFF'}`);
        break;

      case 'ghost':
        onSwitchSpace(deviceSpace === 'ghost' ? 'primary' : 'ghost');
        pushOut(`Switching partition to ${deviceSpace === 'ghost' ? 'Primary' : 'Ghost'} Device...`);
        break;

      case 'shred':
        onBurnGhostDevice();
        pushOut('Ghost partition overwritten with zeroes and new anonymous identity minted.');
        break;

      case 'neofetch':
        pushOut(`OS: Argon OS 1.0 Sovereign (${deviceSpace} space)
Host: ${hardware?.hostPlatform || 'Physical Host'} (${hardware?.cpuCores || 8} threads)
Display: ${hardware?.screenWidth || 1440}x${hardware?.screenHeight || 900} @ ${hardware?.refreshRateHz || 60}Hz
Identity: ${privacy.spoofedDeviceId}
Shield: ${privacy.shieldLevel.toUpperCase()} (${shieldStats.adsBlocked + shieldStats.trackersBlocked} blocked)
Storage: Local-Only On-Device Vault`);
        break;

      case 'uname':
        pushOut('Linux argon-enclave 6.12.4-argon-sovereign #1 SMP aarch64 GNU/Linux');
        break;

      case 'clear':
        setLines([]);
        setInput('');
        return;

      default:
        pushOut(`argon-sh: command not found: ${root}. Type "help".`, 'error');
    }

    setLines(newLines);
    setInput('');
  };

  return (
    <div className="flex-1 w-full h-full bg-[#070a10] text-white flex flex-col justify-between p-4 select-none overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white truncate">{privacy.spoofedNodeName}@enclave</span>
        </div>
        <span className="text-[10px] text-emerald-400 uppercase">{deviceSpace} · bash</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 py-2">
        {lines.map((l) => (
          <div
            key={l.id}
            className={`whitespace-pre-wrap leading-relaxed ${
              l.type === 'input'
                ? 'text-cyan-300 font-bold'
                : l.type === 'error'
                ? 'text-rose-400'
                : l.type === 'system'
                ? 'text-slate-400'
                : 'text-slate-200'
            }`}
          >
            {l.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleCommand} className="flex items-center gap-2 pt-2 border-t border-white/10">
        <span className="text-emerald-400 select-none">{cwd}$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ls, cat, touch, echo, calc, neofetch..."
          className="flex-1 bg-transparent text-white focus:outline-none text-xs"
          autoFocus
        />
      </form>
    </div>
  );
};
