export interface ThemeColors {
  bg: string;
  bgElevated: string;
  bgSubtle: string;
  bgOverlay: string;
  surface: string;
  surfaceGlass: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textLink: string;
  focusRing: string;
}

export const lightTheme: ThemeColors = {
  bg: '#f0f4f8',
  bgElevated: '#ffffff',
  bgSubtle: '#f8fafc',
  bgOverlay: 'rgba(0, 0, 0, 0.4)',
  surface: '#ffffff',
  surfaceGlass: 'rgba(255, 255, 255, 0.7)',
  surfaceHover: '#f8fafc',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textInverse: '#ffffff',
  textLink: '#2563eb',
  focusRing: 'rgba(37, 99, 235, 0.4)'
} as const;

export const darkTheme: ThemeColors = {
  bg: '#0f172a',
  bgElevated: '#1e293b',
  bgSubtle: '#162032',
  bgOverlay: 'rgba(0, 0, 0, 0.6)',
  surface: '#1e293b',
  surfaceGlass: 'rgba(30, 41, 59, 0.8)',
  surfaceHover: '#334155',
  border: '#334155',
  borderStrong: '#475569',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textInverse: '#0f172a',
  textLink: '#60a5fa',
  focusRing: 'rgba(96, 165, 250, 0.4)'
} as const;

export function generateThemeCSS(theme: ThemeColors): string {
  return `
  --color-bg: ${theme.bg};
  --color-bg-elevated: ${theme.bgElevated};
  --color-bg-subtle: ${theme.bgSubtle};
  --color-bg-overlay: ${theme.bgOverlay};
  --color-surface: ${theme.surface};
  --color-surface-glass: ${theme.surfaceGlass};
  --color-surface-hover: ${theme.surfaceHover};
  --color-border: ${theme.border};
  --color-border-strong: ${theme.borderStrong};
  --color-text: ${theme.text};
  --color-text-secondary: ${theme.textSecondary};
  --color-text-muted: ${theme.textMuted};
  --color-text-inverse: ${theme.textInverse};
  --color-text-link: ${theme.textLink};
  --color-focus-ring: ${theme.focusRing};
`.trim();
}
