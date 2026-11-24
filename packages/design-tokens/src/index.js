export const colors = {
  brand: {
    50: '#F2FFE8',
    100: '#E2FAD0',
    500: '#58CC02',
    600: '#46A302',
    700: '#347D02'
  },
  navy: {
    700: '#344563',
    900: '#172B4D'
  },
  blue: {
    50: '#EFF9FF',
    100: '#D8F0FF',
    500: '#1CB0F6',
    700: '#0C7BB3'
  },
  purple: {
    50: '#F6EFFF',
    100: '#EAE0FF',
    500: '#A560E8',
    700: '#7834BE'
  },
  orange: {
    50: '#FFF5E5',
    100: '#FFE4B8',
    500: '#FF9600',
    700: '#B86200'
  },
  yellow: {
    50: '#FFFBE5',
    400: '#FFC800',
    700: '#9A7200'
  },
  red: {
    50: '#FFF0F0',
    100: '#FFD6D6',
    500: '#FF4B4B',
    700: '#C42323'
  },
  success: {
    50: '#ECFDF3',
    600: '#238636',
    700: '#1A6B2A'
  },
  surface: {
    base: '#FFFFFF',
    muted: '#F7F9FC',
    subtle: '#EEF2F6',
    border: '#DCE3EA'
  },
  text: {
    primary: '#172B4D',
    secondary: '#52637A',
    muted: '#718096'
  },
  dark: {
    bg: '#101827',
    surface: '#172235',
    surfaceRaised: '#202F45',
    border: '#34445B',
    textPrimary: '#F4F7FB',
    textSecondary: '#B7C4D4'
  }
};

export const semanticStatusTokens = {
  success: {
    color: colors.success[600],
    bg: colors.success[50],
    icon: 'check-circle',
    label: 'Tepat'
  },
  error: {
    color: colors.red[500],
    bg: colors.red[50],
    icon: 'x-circle',
    label: 'Perlu perbaikan'
  },
  warning: {
    color: colors.orange[500],
    bg: colors.orange[50],
    icon: 'alert-triangle',
    label: 'Perhatian'
  },
  info: {
    color: colors.blue[500],
    bg: colors.blue[50],
    icon: 'info',
    label: 'Informasi'
  },
  ai: {
    color: colors.purple[500],
    bg: colors.purple[50],
    icon: 'sparkles',
    label: 'Draf AI'
  },
  locked: {
    color: colors.text.muted,
    bg: colors.surface.subtle,
    icon: 'lock',
    label: 'Terkunci'
  },
  completed: {
    color: colors.brand[600],
    bg: colors.brand[50],
    icon: 'check',
    label: 'Selesai'
  },
  in_progress: {
    color: colors.blue[700],
    bg: colors.blue[50],
    icon: 'play-circle',
    label: 'Sedang berjalan'
  },
  mastered: {
    color: colors.purple[700],
    bg: colors.purple[50],
    icon: 'award',
    label: 'Dikuasai'
  }
};

export const typography = {
  fontFamily: {
    sans: 'Nunito Sans',
    display: 'Nunito',
    mono: 'ui-monospace'
  },
  scale: {
    display: { size: 36, lineHeight: 44, weight: 800 },
    h1: { size: 30, lineHeight: 38, weight: 800 },
    h2: { size: 24, lineHeight: 32, weight: 800 },
    h3: { size: 20, lineHeight: 28, weight: 700 },
    h4: { size: 18, lineHeight: 26, weight: 700 },
    bodyLg: { size: 18, lineHeight: 28, weight: 600 },
    body: { size: 16, lineHeight: 24, weight: 500 },
    bodySm: { size: 14, lineHeight: 21, weight: 500 },
    caption: { size: 12, lineHeight: 18, weight: 600 },
    button: { size: 15, lineHeight: 20, weight: 800 }
  }
};

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999
};

export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

export const designTokens = {
  colors,
  semanticStatusTokens,
  typography,
  spacing,
  radii,
  breakpoints
};

export default designTokens;
