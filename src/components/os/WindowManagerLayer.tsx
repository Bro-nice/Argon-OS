import React, { useRef, useState } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
  Columns,
} from 'lucide-react';
import { AppId, AppMetadata, FloatingWindowState, OSCustomization } from '../../types/os';

interface WindowManagerLayerProps {
  windows: FloatingWindowState[];
  appMetadata: Record<AppId, AppMetadata>;
  customization: OSCustomization;
  renderAppContent: (appId: AppId) => React.ReactNode;
  onFocusWindow: (appId: AppId) => void;
  onUpdateWindow: (appId: AppId, partial: Partial<FloatingWindowState>) => void;
  onCloseWindow: (appId: AppId) => void;
  onEnableTilingMode: () => void;
}

export const WindowManagerLayer: React.FC<WindowManagerLayerProps> = ({
  windows,
  appMetadata,
  customization,
  renderAppContent,
  onFocusWindow,
  onUpdateWindow,
  onCloseWindow,
  onEnableTilingMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    appId: AppId;
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const visibleWindows = windows.filter((w) => !w.isMinimized);
  const topZ = visibleWindows.reduce((m, w) => Math.max(m, w.zIndex), 0);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const rect = containerRef.current?.getBoundingClientRect();
    const maxW = rect?.width || 1280;
    const maxH = rect?.height || 720;

    if (dragState.mode === 'move') {
      const nextX = Math.max(0, Math.min(maxW - 180, dragState.origX + dx));
      const nextY = Math.max(0, Math.min(maxH - 80, dragState.origY + dy));
      onUpdateWindow(dragState.appId, { x: nextX, y: nextY, isMaximized: false });
    } else {
      const nextW = Math.max(340, Math.min(maxW - dragState.origX, dragState.origW + dx));
      const nextH = Math.max(260, Math.min(maxH - dragState.origY, dragState.origH + dy));
      onUpdateWindow(dragState.appId, { width: nextW, height: nextH, isMaximized: false });
    }
  };

  const handlePointerUp = () => {
    if (dragState) setDragState(null);
  };

  const snapWindow = (appId: AppId, side: 'left' | 'right') => {
    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect?.width || 1200;
    const h = rect?.height || 680;
    const halfW = Math.max(340, Math.floor((w - 24) / 2));
    onUpdateWindow(appId, {
      isMaximized: false,
      x: side === 'left' ? 8 : halfW + 16,
      y: 8,
      width: halfW,
      height: Math.max(320, h - 16),
    });
  };

  const surfaceBg =
    customization.surfaceStyle === 'matte'
      ? 'bg-slate-950'
      : customization.surfaceStyle === 'minimal'
      ? 'bg-slate-950/95'
      : 'bg-slate-950/90 backdrop-blur-xl';

  const borderClass = customization.highContrastBorders
    ? 'border-white/30'
    : 'border-white/15';

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
    >
      {visibleWindows.map((win) => {
        const meta = appMetadata[win.appId];
        const isFocused = win.zIndex === topZ;

        const style: React.CSSProperties = win.isMaximized
          ? {
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              zIndex: win.zIndex,
            }
          : {
              left: win.x,
              top: win.y,
              width: win.width,
              height: win.height,
              zIndex: win.zIndex,
            };

        return (
          <div
            key={win.appId}
            style={style}
            onPointerDown={() => {
              if (!isFocused) onFocusWindow(win.appId);
            }}
            className={`absolute pointer-events-auto flex flex-col overflow-hidden shadow-2xl border transition-shadow ${surfaceBg} ${
              win.isMaximized ? 'rounded-none' : 'rounded-xl'
            } ${
              isFocused ? 'border-cyan-400/50 shadow-black/80' : `${borderClass} opacity-95`
            }`}
          >
            {/* Draggable Window Titlebar */}
            <div
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                onFocusWindow(win.appId);
                if (win.isMaximized) return;
                setDragState({
                  appId: win.appId,
                  mode: 'move',
                  startX: e.clientX,
                  startY: e.clientY,
                  origX: win.x,
                  origY: win.y,
                  origW: win.width,
                  origH: win.height,
                });
              }}
              onDoubleClick={() =>
                onUpdateWindow(win.appId, { isMaximized: !win.isMaximized })
              }
              className={`px-3 py-2 flex items-center justify-between border-b border-white/10 cursor-move select-none shrink-0 ${
                isFocused ? 'bg-slate-900/95' : 'bg-slate-900/70'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    meta?.color || 'bg-cyan-500'
                  }`}
                />
                <span className="text-xs font-semibold text-white truncate">
                  {meta?.name || win.appId}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => snapWindow(win.appId, 'left')}
                  className="hidden sm:flex p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  title="Snap Left Half"
                >
                  <PanelLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => snapWindow(win.appId, 'right')}
                  className="hidden sm:flex p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  title="Snap Right Half"
                >
                  <PanelRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onEnableTilingMode}
                  className="hidden sm:flex p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300 cursor-pointer"
                  title="Switch to Single / Split Tiling Mode"
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onUpdateWindow(win.appId, { isMinimized: true })}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  title="Minimize to Bar"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    onUpdateWindow(win.appId, { isMaximized: !win.isMaximized })
                  }
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  title={win.isMaximized ? 'Restore' : 'Maximize'}
                >
                  {win.isMaximized ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => onCloseWindow(win.appId)}
                  className="p-1 rounded hover:bg-rose-500/25 text-slate-400 hover:text-rose-300 cursor-pointer"
                  title="Close Window"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Application Body */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {renderAppContent(win.appId)}
            </div>

            {/* Bottom-Right Resize Handle */}
            {!win.isMaximized && (
              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onFocusWindow(win.appId);
                  setDragState({
                    appId: win.appId,
                    mode: 'resize',
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: win.x,
                    origY: win.y,
                    origW: win.width,
                    origH: win.height,
                  });
                }}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5 text-slate-500 hover:text-cyan-400"
                title="Drag to Resize"
              >
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-current">
                  <path d="M11 1v10H1v-1.5h8.5V1H11zm-3.5 3.5v6.5H1v-1.5h5V4.5h1.5z" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
