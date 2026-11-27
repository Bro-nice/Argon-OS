import React, { useState } from 'react';
import {
  Phone,
  Camera,
  MessageSquare,
  Globe,
  Folder,
  Image,
  Music,
  Settings,
  ShoppingBag,
  Terminal,
  FileText,
  CloudSun,
  Calculator,
  Clock,
  Activity,
  Bot,
  Gamepad2,
  Layers,
  ShieldCheck,
  EyeOff,
  HeartHandshake,
  Network,
  GraduationCap,
  Share2,
  Leaf,
  Send,
  Search,
  Code2,
  Brush,
  Calendar,
  KeyRound,
  Cpu,
  Play,
  Mail,
  Flame,
  Orbit,
  Award,
} from 'lucide-react';
import {
  AppId,
  AppMetadata,
  DeviceSpace,
  EcoProfile,
  OSCustomization,
  PrivacyProfile,
  ShieldStats,
  WellbeingState,
} from '../../types/os';
import { getIconShapeClass } from '../../utils/customizationStore';
import { triggerHaptic } from '../../utils/hardware';
import { queryOSAssistant } from '../../services/api';

interface HomeScreenProps {
  appMetadata: Record<AppId, AppMetadata>;
  onLaunchApp: (app: AppId) => void;
  deviceSpace: DeviceSpace;
  privacy: PrivacyProfile;
  shieldStats: ShieldStats;
  wellbeing: WellbeingState;
  eco: EcoProfile;
  customization: OSCustomization;
  onSwitchSpace: (target: DeviceSpace) => void;
  onOpenAssistant: () => void;
  onOpenLauncher: () => void;
  onExecuteIntent: (action: string, target?: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  appMetadata,
  onLaunchApp,
  deviceSpace,
  privacy,
  shieldStats,
  wellbeing,
  eco,
  customization,
  onSwitchSpace,
  onOpenAssistant,
  onOpenLauncher,
  onExecuteIntent,
}) => {
  const [intentInput, setIntentInput] = useState('');
  const [intentStatus, setIntentStatus] = useState<string | null>(null);

  const getAppIconComponent = (iconName: string) => {
    const cls = 'w-5 h-5 sm:w-6 sm:h-6 text-white';
    switch (iconName) {
      case 'Bot':
        return <Bot className={cls} />;
      case 'HeartHandshake':
        return <HeartHandshake className={cls} />;
      case 'Network':
        return <Network className={cls} />;
      case 'GraduationCap':
        return <GraduationCap className={cls} />;
      case 'Share2':
        return <Share2 className={cls} />;
      case 'Leaf':
        return <Leaf className={cls} />;
      case 'Phone':
        return <Phone className={cls} />;
      case 'Camera':
        return <Camera className={cls} />;
      case 'MessageSquare':
        return <MessageSquare className={cls} />;
      case 'Globe':
        return <Globe className={cls} />;
      case 'Folder':
        return <Folder className={cls} />;
      case 'Image':
        return <Image className={cls} />;
      case 'Music':
        return <Music className={cls} />;
      case 'Settings':
        return <Settings className={cls} />;
      case 'ShoppingBag':
        return <ShoppingBag className={cls} />;
      case 'Terminal':
        return <Terminal className={cls} />;
      case 'FileText':
        return <FileText className={cls} />;
      case 'CloudSun':
        return <CloudSun className={cls} />;
      case 'Calculator':
        return <Calculator className={cls} />;
      case 'Clock':
        return <Clock className={cls} />;
      case 'Activity':
        return <Activity className={cls} />;
      case 'Gamepad2':
        return <Gamepad2 className={cls} />;
      case 'ShieldCheck':
        return <ShieldCheck className={cls} />;
      case 'EyeOff':
        return <EyeOff className={cls} />;
      case 'Code2':
        return <Code2 className={cls} />;
      case 'Brush':
        return <Brush className={cls} />;
      case 'Calendar':
        return <Calendar className={cls} />;
      case 'KeyRound':
        return <KeyRound className={cls} />;
      case 'Cpu':
        return <Cpu className={cls} />;
      case 'Play':
        return <Play className={cls} />;
      case 'Mail':
        return <Mail className={cls} />;
      case 'Flame':
        return <Flame className={cls} />;
      case 'Orbit':
        return <Orbit className={cls} />;
      case 'Award':
        return <Award className={cls} />;
      default:
        return <Layers className={cls} />;
    }
  };

  const allApps = Object.values(appMetadata);
  const dockApps: AppId[] = ['terminal', 'code', 'files', 'browser', 'calculator', 'agents', 'settings'];
  const gridApps = allApps.filter((app) => !dockApps.includes(app.id));

  const displayedApps =
    intentInput.trim().length > 0
      ? allApps.filter((a) => a.name.toLowerCase().includes(intentInput.trim().toLowerCase()))
      : gridApps;

  const totalBlocked =
    shieldStats.adsBlocked + shieldStats.trackersBlocked + shieldStats.fingerprintsNeutralized;

  const handleRunIntent = async (preset?: string) => {
    const q = (preset ?? intentInput).trim();
    if (!q) return;
    triggerHaptic(15);
    const res = await queryOSAssistant(q, { deviceSpace }, privacy.localOnlyAirGap);
    setIntentStatus(res.reply);
    if (res.action && res.action !== 'NONE') {
      setTimeout(() => {
        onExecuteIntent(res.action, res.target);
        setIntentInput('');
      }, 280);
    }
  };

  const focusMinsLeft = Math.floor(wellbeing.focusSecondsLeft / 60);
  const focusSecsLeft = wellbeing.focusSecondsLeft % 60;
  const iconRadius = getIconShapeClass(customization.iconShape);

  const surfacePanel =
    customization.surfaceStyle === 'matte'
      ? 'bg-slate-950'
      : customization.surfaceStyle === 'minimal'
      ? 'bg-slate-950/60'
      : 'bg-slate-950/80 backdrop-blur-xl';

  const borderStroke = customization.highContrastBorders ? 'border-white/25' : 'border-white/10';

  const renderDock = (vertical: boolean) => (
    <div
      className={`${
        vertical
          ? 'flex flex-col items-center gap-2 py-3 px-2 rounded-2xl'
          : 'w-fit mx-auto px-3 py-2 rounded-2xl flex items-center gap-2 sm:gap-3'
      } ${surfacePanel} border ${borderStroke} shadow-2xl`}
    >
      {dockApps.map((appId) => {
        const app = appMetadata[appId];
        return (
          <button
            key={appId}
            onClick={() => {
              triggerHaptic(12);
              onLaunchApp(appId);
            }}
            className="relative flex flex-col items-center justify-center transition-transform active:scale-95 hover:-translate-y-0.5 cursor-pointer"
            title={app.name}
          >
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 ${iconRadius} flex items-center justify-center shadow-md border border-white/10 ${app.color}`}
            >
              {getAppIconComponent(app.icon)}
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex-1 w-full flex overflow-hidden select-none">
      {/* Left Dock Rail option */}
      {customization.dockPosition === 'left' && (
        <div className="hidden sm:flex items-center pl-3 py-4 z-10">{renderDock(true)}</div>
      )}

      <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-between space-y-4">
          {/* Top Intent Surface & Optional Context Cards */}
          <div className="space-y-3">
            <div className={`p-3.5 rounded-2xl ${surfacePanel} border ${borderStroke} space-y-2.5 shadow-xl`}>
              <div className="flex items-center justify-between px-0.5 text-[11px]">
                <span className="font-semibold tracking-wide text-white">Argon OS</span>
                <div className="flex items-center gap-2 font-mono text-slate-400">
                  <span>
                    {deviceSpace === 'ghost' ? 'Ghost Enclave' : 'Primary'} · {eco.activeFormFactor}
                    {eco.ecoMode ? ' · Eco' : ''}
                  </span>
                  <button
                    onClick={onOpenLauncher}
                    className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                  >
                    <Search className="w-3 h-3 text-cyan-400" />
                    <span>⌘K</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={intentInput}
                  onChange={(e) => {
                    setIntentInput(e.target.value);
                    if (intentStatus) setIntentStatus(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleRunIntent()}
                  placeholder="Search apps or express an intent (e.g. code studio, calendar, 25m focus)..."
                  className="flex-1 min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
                {intentInput.trim() ? (
                  <button
                    onClick={() => handleRunIntent()}
                    className="min-h-[40px] px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Run</span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenAssistant}
                    className="min-h-[40px] px-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-cyan-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    title="Open Personal Intelligence"
                  >
                    <Bot className="w-4 h-4" />
                    <span className="hidden sm:inline">Assistant</span>
                  </button>
                )}
              </div>

              {intentStatus && <p className="text-xs text-cyan-300 px-0.5">{intentStatus}</p>}
            </div>

            {customization.showDesktopWidgets && (
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => {
                    triggerHaptic(10);
                    onLaunchApp('shield');
                  }}
                  className={`p-3 rounded-xl ${surfacePanel} border ${borderStroke} hover:border-orange-400/40 transition-colors cursor-pointer text-left flex items-center justify-between`}
                >
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">SHIELD FIREWALL</span>
                    <span className="text-sm font-bold text-white tabular-nums">
                      {totalBlocked.toLocaleString()} blocked
                    </span>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0" />
                </button>

                <button
                  onClick={() => {
                    triggerHaptic(10);
                    onLaunchApp('wellbeing');
                  }}
                  className={`p-3 rounded-xl ${surfacePanel} border ${borderStroke} hover:border-emerald-400/40 transition-colors cursor-pointer text-left flex items-center justify-between`}
                >
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      {wellbeing.focusActive ? 'DEEP WORK LIVE' : 'WELLBEING'}
                    </span>
                    <span className="text-sm font-bold text-white tabular-nums font-mono">
                      {wellbeing.focusActive
                        ? `${String(focusMinsLeft).padStart(2, '0')}:${String(focusSecsLeft).padStart(2, '0')}`
                        : `${wellbeing.dailyFocusMinutes}m focus`}
                    </span>
                  </div>
                  <HeartHandshake className="w-4 h-4 text-emerald-400 shrink-0" />
                </button>

                <button
                  onClick={() => {
                    triggerHaptic(15);
                    onSwitchSpace(deviceSpace === 'ghost' ? 'primary' : 'ghost');
                  }}
                  className={`p-3 rounded-xl border transition-colors cursor-pointer text-left flex items-center justify-between ${
                    deviceSpace === 'ghost'
                      ? 'bg-emerald-950/75 border-emerald-500/40 hover:border-emerald-400'
                      : `${surfacePanel} ${borderStroke} hover:border-cyan-400/40`
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 block">DEVICE SPACE</span>
                    <span className="text-sm font-bold text-white block truncate">
                      {deviceSpace === 'ghost' ? 'Ghost Active' : 'Primary'}
                    </span>
                  </div>
                  <EyeOff
                    className={`w-4 h-4 shrink-0 ${
                      deviceSpace === 'ghost' ? 'text-emerald-400' : 'text-cyan-400'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* App Grid */}
          <div className="space-y-3 my-auto">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-y-4 gap-x-2 text-center py-2">
              {displayedApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    triggerHaptic(12);
                    onLaunchApp(app.id);
                  }}
                  className="flex flex-col items-center gap-1.5 transition-transform active:scale-95 cursor-pointer group"
                >
                  <div className="relative">
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 ${iconRadius} flex items-center justify-center shadow-lg border border-white/10 transition-transform ${app.color} group-hover:scale-105`}
                    >
                      {getAppIconComponent(app.icon)}
                    </div>

                    {app.badge && app.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-slate-950 tabular-nums">
                        {app.badge}
                      </span>
                    )}
                  </div>

                  {customization.showAppLabels && (
                    <span className="text-[11px] font-medium text-white/90 group-hover:text-white truncate max-w-[82px]">
                      {app.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Dock option */}
          {customization.dockPosition === 'bottom' && <div className="w-full pt-1">{renderDock(false)}</div>}
        </div>
      </div>
    </div>
  );
};
