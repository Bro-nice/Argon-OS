import React from 'react';
import { ChevronLeft, Home, Layers, Search } from 'lucide-react';
import { triggerHaptic } from '../../utils/hardware';

interface NavigationBarProps {
  mode: 'gestures' | 'buttons';
  onHome: () => void;
  onBack: () => void;
  onRecents: () => void;
  onLauncher?: () => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  mode,
  onHome,
  onBack,
  onRecents,
  onLauncher,
}) => {
  return (
    <nav
      aria-label="System Navigation"
      className="relative w-full h-10 flex items-center justify-center z-40 select-none bg-slate-950/75 border-t border-white/10 backdrop-blur-md pointer-events-auto"
    >
      {mode === 'gestures' ? (
        <button
          onClick={() => {
            triggerHaptic(15);
            onHome();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            triggerHaptic([20, 25]);
            onRecents();
          }}
          className="w-32 h-1.5 rounded-full bg-white/60 hover:bg-white active:scale-95 transition-all cursor-pointer shadow-lg"
          title="Tap for Home · Right-click for App Switcher"
        />
      ) : (
        <div className="w-full max-w-md flex items-center justify-around px-4 text-slate-300 text-xs">
          <button
            onClick={() => {
              triggerHaptic(10);
              onBack();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            title="Back"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Back</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(10);
              onHome();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            title="Home Desktop"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Home</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(15);
              onRecents();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            title="Running Tasks & Split View"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Tasks</span>
          </button>

          {onLauncher && (
            <button
              onClick={() => {
                triggerHaptic(10);
                onLauncher();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
              title="Command Launcher (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Launcher</span>
            </button>
          )}
        </div>
      )}
    </nav>
  );
};
