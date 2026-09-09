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

/**
 * Legacy light theme snapshot. Keep these values stable for existing SSR
 * consumers; use `cvgPulseLightTheme` for the current CSS theme contract.
 */
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

/**
 * Legacy dark theme snapshot. Keep these values stable for existing SSR
 * consumers; use `cvgPulseDarkTheme` for the current CSS theme contract.
 */
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

/**
 * Current CVG Pulse light theme values, matching the first `:root` block in
 * `tokens/variables.css`. These values keep the existing SSR-friendly theme
 * shape while making the current cyan/mint/ink and Aptos CSS contract explicit.
 * The corresponding CSS source remains authoritative; unit tests bind these
 * values to its declarations.
 */
export const cvgPulseLightTheme: ThemeColors = {
  bg: '#eef4f6',
  bgElevated: '#ffffff',
  bgSubtle: '#f5f9fa',
  bgOverlay: 'rgba(8, 23, 32, 0.58)',
  surface: '#ffffff',
  surfaceGlass: 'rgba(255, 255, 255, 0.9)',
  surfaceHover: '#f1f8f9',
  border: '#d5e2e6',
  borderStrong: '#b8ccd2',
  text: '#112530',
  textSecondary: '#3e5c67',
  textMuted: '#55717a',
  textInverse: '#ffffff',
  textLink: '#066b80',
  focusRing: 'rgba(15, 168, 184, 0.42)'
} as const;

/**
 * Current CVG Pulse dark theme values, matching the explicit
 * `:root[data-theme='dark']` block in `tokens/variables.css`.
 */
export const cvgPulseDarkTheme: ThemeColors = {
  bg: '#091522',
  bgElevated: '#112337',
  bgSubtle: '#0e1c2a',
  bgOverlay: 'rgba(3, 11, 18, 0.78)',
  surface: '#112337',
  surfaceGlass: 'rgba(17, 35, 55, 0.9)',
  surfaceHover: '#1a3346',
  border: '#2b4558',
  borderStrong: '#426277',
  text: '#eff7f5',
  textSecondary: '#b4cbd0',
  textMuted: '#96b0b7',
  textInverse: '#091522',
  textLink: '#70e0e5',
  focusRing: '#83e7eb'
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
