import {
  AccentTheme,
  DeviceSpace,
  FontTheme,
  IconShape,
  OSCustomization,
  UIScale,
} from '../types/os';
import { readSpaceData, writeSpaceData } from './localVault';

export const DEFAULT_LINUX_WALLPAPER =
  '/src/assets/images/wallpaper_linux_aurora_ridge_1795791970944.jpg';

export const GHOST_LINUX_WALLPAPER =
  '/src/assets/images/wallpaper_linux_topo_slate_1795791971923.jpg';

export const WALLPAPER_CATALOG = [
  {
    id: 'linux_aurora',
    name: 'Linux Horizon Ridge',
    url: DEFAULT_LINUX_WALLPAPER,
  },
  {
    id: 'linux_topo',
    name: 'Topo Slate Wave',
    url: GHOST_LINUX_WALLPAPER,
  },
  {
    id: 'cosmic_fluid',
    name: 'Cosmic Fluid',
    url: '/src/assets/images/wallpaper_cosmic_fluid_1793976580569.jpg',
  },
  {
    id: 'solar_dune',
    name: 'Solar Dune',
    url: '/src/assets/images/wallpaper_solar_minimal_1793976600438.jpg',
  },
  {
    id: 'ghost_obsidian',
    name: 'Obsidian Core',
    url: '/src/assets/images/wallpaper_ghost_obsidian_1795750589887.jpg',
  },
];

export const DEFAULT_CUSTOMIZATION: OSCustomization = {
  accentTheme: 'cyan',
  fontTheme: 'jakarta',
  uiScale: 'standard',
  iconShape: 'squircle',
  surfaceStyle: 'glass',
  dockPosition: 'bottom',
  windowMode: 'floating',
  showDesktopWidgets: true,
  showAppLabels: true,
  gridDensity: 'balanced',
  wallpaperDim: 28,
  wallpaperBlur: 0,
  highContrastBorders: false,
};

export const ACCENT_TOKENS: Record<
  AccentTheme,
  {
    label: string;
    hex: string;
    rgb: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
  }
> = {
  cyan: {
    label: 'Arch Cyan',
    hex: '#22d3ee',
    rgb: '34, 211, 238',
    textClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500',
    borderClass: 'border-cyan-400',
  },
  emerald: {
    label: 'Mint Emerald',
    hex: '#34d399',
    rgb: '52, 211, 153',
    textClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500',
    borderClass: 'border-emerald-400',
  },
  amber: {
    label: 'Ubuntu Amber',
    hex: '#fbbf24',
    rgb: '251, 191, 36',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500',
    borderClass: 'border-amber-400',
  },
  indigo: {
    label: 'Fedora Indigo',
    hex: '#818cf8',
    rgb: '129, 140, 248',
    textClass: 'text-indigo-400',
    bgClass: 'bg-indigo-500',
    borderClass: 'border-indigo-400',
  },
  rose: {
    label: 'Crimson Pulse',
    hex: '#fb7185',
    rgb: '251, 113, 133',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-500',
    borderClass: 'border-rose-400',
  },
  slate: {
    label: 'Mono Steel',
    hex: '#e2e8f0',
    rgb: '226, 232, 240',
    textClass: 'text-slate-200',
    bgClass: 'bg-slate-200',
    borderClass: 'border-slate-300',
  },
};

export const FONT_STACKS: Record<FontTheme, { label: string; css: string }> = {
  jakarta: {
    label: 'Plus Jakarta Sans',
    css: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  dm: {
    label: 'DM Sans',
    css: "'DM Sans', system-ui, sans-serif",
  },
  manrope: {
    label: 'Manrope',
    css: "'Manrope', system-ui, sans-serif",
  },
  mono: {
    label: 'JetBrains Mono',
    css: "'JetBrains Mono', monospace",
  },
};

export function getIconShapeClass(shape: IconShape): string {
  switch (shape) {
    case 'circle':
      return 'rounded-full';
    case 'square':
      return 'rounded-md';
    case 'rounded':
      return 'rounded-xl';
    case 'squircle':
    default:
      return 'rounded-2xl';
  }
}

export function getScaleRootSize(scale: UIScale): string {
  switch (scale) {
    case 'compact':
      return '14px';
    case 'comfortable':
      return '17px';
    case 'standard':
    default:
      return '16px';
  }
}

export function loadCustomization(space: DeviceSpace): OSCustomization {
  return readSpaceData<OSCustomization>(space, 'os_customization', DEFAULT_CUSTOMIZATION);
}

export function saveCustomization(space: DeviceSpace, next: OSCustomization): void {
  writeSpaceData(space, 'os_customization', next);
}

export function applyCustomizationToDom(custom: OSCustomization): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const accent = ACCENT_TOKENS[custom.accentTheme] || ACCENT_TOKENS.cyan;
  const font = FONT_STACKS[custom.fontTheme] || FONT_STACKS.jakarta;
  root.style.setProperty('--os-accent', accent.hex);
  root.style.setProperty('--os-accent-rgb', accent.rgb);
  root.style.setProperty('--font-sans', font.css);
  root.style.fontSize = getScaleRootSize(custom.uiScale);
}
