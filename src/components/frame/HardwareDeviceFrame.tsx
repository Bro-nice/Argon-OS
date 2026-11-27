import React, { useEffect } from 'react';
import { HardwareState, ViewportMode } from '../../types/os';
import { triggerHaptic } from '../../utils/hardware';

interface HardwareDeviceFrameProps {
  hardware: HardwareState;
  onUpdateHardware: (partial: Partial<HardwareState>) => void;
  onPowerButton: () => void;
  wallpaperUrl: string;
  wallpaperDim?: number;
  wallpaperBlur?: number;
  viewportMode: ViewportMode;
  onChangeViewportMode: (mode: ViewportMode) => void;
  calmGrayscale?: boolean;
  reducedMotion?: boolean;
  children: React.ReactNode;
}

export const HardwareDeviceFrame: React.FC<HardwareDeviceFrameProps> = ({
  hardware,
  onUpdateHardware,
  onPowerButton,
  wallpaperUrl,
  wallpaperDim = 28,
  wallpaperBlur = 0,
  viewportMode,
  calmGrayscale = false,
  reducedMotion = false,
  children,
}) => {
  const increaseVolume = () => {
    triggerHaptic(10);
    onUpdateHardware({ volumeLevel: Math.min(100, hardware.volumeLevel + 10), isMuted: false });
  };

  const decreaseVolume = () => {
    triggerHaptic(10);
    onUpdateHardware({ volumeLevel: Math.max(0, hardware.volumeLevel - 10) });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'AudioVolumeUp') {
        onUpdateHardware({ volumeLevel: Math.min(100, hardware.volumeLevel + 10), isMuted: false });
      } else if (e.key === 'AudioVolumeDown') {
        onUpdateHardware({ volumeLevel: Math.max(0, hardware.volumeLevel - 10) });
      } else if (e.key === 'AudioVolumeMute') {
        onUpdateHardware({ isMuted: !hardware.isMuted });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hardware.volumeLevel, hardware.isMuted, onUpdateHardware]);

  const screenFilterStyle = {
    filter: `brightness(${hardware.screenBrightness / 100}) ${hardware.nightLightOn ? 'sepia(30%)' : ''} ${
      calmGrayscale ? 'grayscale(100%)' : ''
    }`.trim(),
  };

  const wallpaperFilterStyle: React.CSSProperties = {
    backgroundImage: `url(${wallpaperUrl})`,
    filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : undefined,
    transform: wallpaperBlur > 0 ? 'scale(1.04)' : undefined,
  };

  if (viewportMode === 'native_full') {
    return (
      <div
        style={screenFilterStyle}
        className={`fixed inset-0 w-screen h-screen bg-slate-950 flex flex-col overflow-hidden select-none ${
          reducedMotion ? '[&_*]:!transition-none' : ''
        }`}
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
          style={wallpaperFilterStyle}
        />
        <div
          className="absolute inset-0 bg-slate-950 pointer-events-none transition-opacity"
          style={{ opacity: Math.min(0.85, Math.max(0.05, wallpaperDim / 100)) }}
        />

        {hardware.flashlightOn && (
          <div className="absolute inset-0 bg-white/85 z-50 pointer-events-none transition-opacity" />
        )}

        <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">{children}</div>
      </div>
    );
  }

  const tiltTransform = reducedMotion
    ? 'none'
    : `perspective(1200px) rotateY(${hardware.deviceTiltX * 0.12}deg) rotateX(${
        -hardware.deviceTiltY * 0.08
      }deg)`;

  return (
    <div
      className={`min-h-screen w-full bg-[#05070c] text-slate-100 flex flex-col items-center justify-center p-2 sm:p-4 select-none overflow-x-hidden relative ${
        reducedMotion ? '[&_*]:!transition-none' : ''
      }`}
    >
      <div
        className="relative my-auto flex items-center justify-center py-2 transition-transform duration-150"
        style={{ transform: tiltTransform }}
      >
        <div className="absolute -left-3 top-28 flex flex-col gap-3 z-30">
          <button
            onClick={increaseVolume}
            className="w-2.5 h-12 rounded-l-md bg-slate-700 hover:bg-slate-500 border border-slate-600 transition-all cursor-pointer active:scale-95 shadow-lg"
            title="Physical Volume Up"
          />
          <button
            onClick={decreaseVolume}
            className="w-2.5 h-12 rounded-l-md bg-slate-700 hover:bg-slate-500 border border-slate-600 transition-all cursor-pointer active:scale-95 shadow-lg"
            title="Physical Volume Down"
          />
        </div>

        <div className="absolute -right-3 top-24 z-30">
          <button
            onClick={onPowerButton}
            className="w-2.5 h-14 rounded-r-md bg-slate-700 hover:bg-rose-500 border border-slate-600 transition-all cursor-pointer active:scale-95 shadow-lg"
            title="Physical Power Key"
          />
        </div>

        <div
          className={`relative w-[390px] sm:w-[410px] h-[830px] sm:h-[850px] rounded-[52px] p-2.5 bg-gradient-to-b from-[#252c39] via-[#141823] to-[#0c0f16] border-2 border-slate-700/60 transition-all flex flex-col overflow-hidden ${
            hardware.flashlightOn
              ? 'shadow-[0_0_110px_20px_rgba(255,255,255,0.6)]'
              : 'shadow-[0_0_80px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(56,189,248,0.2)]'
          }`}
        >
          <div
            style={screenFilterStyle}
            className="relative flex-1 w-full rounded-[44px] overflow-hidden flex flex-col bg-slate-950 bg-cover bg-center transition-all duration-300"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-500"
              style={wallpaperFilterStyle}
            />
            <div
              className="absolute inset-0 bg-slate-950 pointer-events-none"
              style={{ opacity: Math.min(0.85, Math.max(0.05, wallpaperDim / 100)) }}
            />

            <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
