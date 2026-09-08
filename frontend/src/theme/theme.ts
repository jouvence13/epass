// Design tokens ported from stitch_uac_buspass_digital_ticketing_platform/*/code.html
// (Academic Transit System design system — see DESIGN.md)

export const colors = {
  // Official Republic of Benin Design Palette
  primary: '#008751', // Vert Officiel République du Bénin
  onPrimary: '#ffffff',
  primaryContainer: '#004d2e', // Vert Forêt Institutionnel
  onPrimaryContainer: '#a3e6c2',
  primaryFixed: '#c7f2dc',
  primaryFixedDim: '#8ee4b7',
  onPrimaryFixed: '#002816',
  onPrimaryFixedVariant: '#005934',

  secondary: '#FCD116', // Jaune Or République du Bénin
  onSecondary: '#2b2100',
  secondaryContainer: '#fef08a',
  onSecondaryContainer: '#713f12',
  secondaryFixed: '#fde047',
  secondaryFixedDim: '#facc15',

  tertiary: '#E8112D', // Rouge République du Bénin
  onTertiary: '#ffffff',
  tertiaryContainer: '#ffe4e6',
  onTertiaryContainer: '#9f1239',
  tertiaryFixed: '#fecdd3',
  tertiaryFixedDim: '#fda4af',
  onTertiaryFixed: '#4c0519',
  onTertiaryFixedVariant: '#881337',

  error: '#E8112D',
  onError: '#ffffff',
  errorContainer: '#fee2e2',
  onErrorContainer: '#991b1b',

  background: '#f8fafc',
  onBackground: '#0f172a',
  surface: '#ffffff',
  onSurface: '#0f172a',
  surfaceVariant: '#f1f5f9',
  onSurfaceVariant: '#475569',
  surfaceDim: '#e2e8f0',
  surfaceBright: '#ffffff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f8fafc',
  surfaceContainer: '#f1f5f9',
  surfaceContainerHigh: '#e2e8f0',
  surfaceContainerHighest: '#cbd5e1',

  outline: '#64748b',
  outlineVariant: '#cbd5e1',

  inverseSurface: '#1e293b',
  inverseOnSurface: '#f8fafc',
  inversePrimary: '#8ee4b7',

  // Benin National & Brand Tokens
  beninGreen: '#008751',
  beninYellow: '#FCD116',
  beninRed: '#E8112D',
  beninDarkGreen: '#004D2E',
  beninGold: '#D97706',

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
  xxl: 40,
  gutter: 12,
  containerMargin: 16,
};

export const radius = {
  xs: 4,
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
  headlineLg: { fontSize: 28, lineHeight: 36, fontWeight: '700' as const },
  headlineMd: { fontSize: 24, lineHeight: 32, fontWeight: '600' as const },
  headlineSm: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMd: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  bodySm: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  labelCaps: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.6 },
  statusCode: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const, letterSpacing: 1.8 },
};
