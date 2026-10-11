import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  background: '#390040',
  surface: '#470B4C',
  selected: '#730071',
  text: '#C2C094',
  muted: '#A9A587',
  accent: '#DC9596',
  border: 'rgba(194, 192, 148, 0.20)',
  accentBorder: 'rgba(220, 149, 150, 0.45)',
} as const;

const appColors = {
  text: Palette.text,
  background: Palette.background,
  backgroundElement: Palette.surface,
  backgroundSelected: Palette.selected,
  textSecondary: Palette.muted,
} as const;

export const Colors = {
  light: appColors,
  dark: appColors,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Typography = {
  brand: 'Telma-Bold',
  heading: 'CrimsonPro-SemiBold',
  headingStrong: 'CrimsonPro-Bold',
  body: 'Sora-Regular',
  medium: 'Sora-Medium',
  semibold: 'Sora-SemiBold',
} as const;

export const Fonts = {
  sans: Typography.body,
  serif: Typography.heading,
  rounded: Typography.body,
  mono: Platform.select({ ios: 'ui-monospace', web: 'var(--font-mono)' }) ?? 'monospace',
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  compact: 12,
  three: 16,
  four: 24,
  five: 32,
  section: 48,
  six: 64,
} as const;

export const Radius = { small: 6, card: 8, button: 10, input: 10 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
