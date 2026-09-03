// Design tokens ported from stitch_uac_buspass_digital_ticketing_platform/*/code.html
// (Academic Transit System design system — see DESIGN.md)

export const colors = {
  primary: '#001e40',
  onPrimary: '#ffffff',
  primaryContainer: '#003366',
  onPrimaryContainer: '#799dd6',
  primaryFixed: '#d5e3ff',
  primaryFixedDim: '#a7c8ff',
  onPrimaryFixed: '#001b3c',
  onPrimaryFixedVariant: '#1f477b',

  secondary: '#1b6d24',
  onSecondary: '#ffffff',
  secondaryContainer: '#a0f399',
  onSecondaryContainer: '#217128',
  secondaryFixed: '#a3f69c',
  secondaryFixedDim: '#88d982',

  tertiary: '#2b1b00',
  onTertiary: '#ffffff',
  tertiaryContainer: '#472f00',
  onTertiaryContainer: '#ce9000',
  tertiaryFixed: '#ffdeac',
  tertiaryFixedDim: '#ffba38',
  onTertiaryFixed: '#281900',
  onTertiaryFixedVariant: '#604100',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  background: '#f8f9fa',
  onBackground: '#191c1d',
  surface: '#f8f9fa',
  onSurface: '#191c1d',
  surfaceVariant: '#e1e3e4',
  onSurfaceVariant: '#43474f',
  surfaceDim: '#d9dadb',
  surfaceBright: '#f8f9fa',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f4f5',
  surfaceContainer: '#edeeef',
  surfaceContainerHigh: '#e7e8e9',
  surfaceContainerHighest: '#e1e3e4',

  outline: '#737780',
  outlineVariant: '#c3c6d1',

  inverseSurface: '#2e3132',
  inverseOnSurface: '#f0f1f2',
  inversePrimary: '#a7c8ff',

  // Mobile money brand slots
  mtnYellow: '#FFCC00',
  moovBlue: '#0055A5',
  white: '#ffffff',
  black: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  gutter: 12,
  containerMargin: 16,
};

export const radius = {
  sm: 8,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const typography = {
  displayLg: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -0.5 },
  headlineMd: { fontSize: 24, lineHeight: 32, fontWeight: '600' as const },
  headlineSm: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMd: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  labelCaps: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.6 },
  statusCode: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const, letterSpacing: 1.8 },
};
