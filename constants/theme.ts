import { MD3DarkTheme } from 'react-native-paper';

export const COLORS = {
  // Brand / interactive — WHITE on dark bg
  primary:       '#FFFFFF',
  primaryHover:  '#E5E5E5',

  // Page chrome
  background:    '#000000',   // true black
  surface:       '#1C1C1E',   // iOS dark surface
  surfaceAlt:    '#2C2C2E',

  // Borders
  border:        '#38383A',   // visible on dark surface
  borderStrong:  '#48484A',

  // Text
  textPrimary:   '#FFFFFF',
  textSecondary: '#8E8E93',   // iOS system gray
  textTertiary:  '#636366',
  textInverse:   '#000000',   // text on white/primary bg

  // Semantic — iOS dark mode equivalents
  success:       '#30D158',
  successBg:     'rgba(48, 209, 88, 0.15)',
  warning:       '#FF9F0A',
  warningBg:     'rgba(255, 159, 10, 0.15)',
  danger:        '#FF453A',
  dangerBg:      'rgba(255, 69, 58, 0.15)',
  info:          '#0A84FF',
  infoBg:        'rgba(10, 132, 255, 0.15)',

  overlay:       'rgba(0,0,0,0.8)',

  // Backward-compat aliases
  secondary:     '#FF9F0A',
  card:          '#1C1C1E',
  driver:        '#FFFFFF',
  shipper:       '#FF9F0A',
  approved:      '#30D158',
  pending:       '#FF9F0A',
  rejected:      '#FF453A',
  demandLow:     '#30D158',
  demandNormal:  '#FF9F0A',
  demandHigh:    '#FF453A',
} as const;

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  20,
  xl:  28,
  xxl: 40,
} as const;

export const RADIUS = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   22,
  full: 999,
} as const;

export const FONT_SIZE = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   21,
  xxl:  27,
  xxxl: 34,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary:          COLORS.primary,
    onPrimary:        '#000000',
    secondary:        COLORS.secondary,
    onSecondary:      '#000000',
    background:       COLORS.background,
    surface:          COLORS.surface,
    onSurface:        COLORS.textPrimary,
    onSurfaceVariant: COLORS.textSecondary,
    outline:          COLORS.border,
    error:            COLORS.danger,
  },
};
