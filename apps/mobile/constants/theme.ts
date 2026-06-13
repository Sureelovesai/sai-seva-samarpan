/**
 * App theme. Brand palette mirrors the web app (sky / emerald / rose on warm backgrounds).
 */

import { Platform } from 'react-native';

export const Brand = {
  sky: '#0ea5e9',
  skyDark: '#0369a1',
  blue: '#2563eb',
  emerald: '#059669',
  rose: '#e11d48',
  purple: '#6d28d9',
  amber: '#f59e0b',

  // Warm surfaces used across the web UI
  cream: '#fefaf8',
  pinkHero: '#f8e8e6',

  ink: '#1f2937',
  inkSoft: '#475569',
  muted: '#6b7280',
  line: '#e5e7eb',
  card: '#ffffff',
  bg: '#f5f7fb',
};

const tintColorLight = Brand.blue;
const tintColorDark = '#7dd3fc';

export const Colors = {
  light: {
    text: Brand.ink,
    background: Brand.bg,
    tint: tintColorLight,
    icon: Brand.muted,
    tabIconDefault: Brand.muted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#0b1220',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
