/**
 * Legacy JS color snapshot.
 *
 * Keep this export stable for existing consumers. It is intentionally not the
 * current CVG Pulse palette; use `cvgPulseTokens.colors` for CSS-backed tokens.
 */
export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a'
  },
  accent: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a'
  },
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857'
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309'
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c'
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8'
  },
  neutral: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  }
} as const;

/** Legacy JS spacing snapshot; use `cvgPulseTokens.spacing` for new consumers. */
export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem'
} as const;

/** Legacy JS radius snapshot; use `cvgPulseTokens.radius` for new consumers. */
export const radius = {
  none: '0',
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.25rem',
  full: '9999px'
} as const;

/**
 * Legacy JS shadow snapshot. Keep its literal values stable; use
 * `cvgPulseTokens.shadows` for the current CSS-backed contract.
 */
export const shadows = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
  sm: '0 2px 8px rgba(0, 0, 0, 0.06)',
  md: '0 4px 16px rgba(0, 0, 0, 0.08)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.1)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.12)',
  glow: '0 0 20px rgba(37, 99, 235, 0.15)',
  inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
  focus: '0 0 0 3px rgba(37, 99, 235, 0.4)'
} as const;

/**
 * Legacy JS typography snapshot (including Inter). Keep it stable for existing
 * consumers; use `cvgPulseTokens.typography` for the current Aptos-backed roles.
 */
export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace"
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.8125rem',
    base: '0.9375rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem'
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75
  }
} as const;

/**
 * Legacy JS transition snapshot. CSS-backed motion tokens are exposed under
 * `cvgPulseTokens.motion` and retain reduced-motion behavior in CSS.
 */
export const transitions = {
  ease: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms'
  }
} as const;

/** Legacy JS z-index snapshot; use `cvgPulseTokens.zIndex` for new consumers. */
export const zIndex = {
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
  tooltip: 600
} as const;

/** Legacy JS layout snapshot; use `cvgPulseTokens.layout` for new consumers. */
export const layout = {
  touchMin: '44px',
  maxWidthProse: '65ch',
  maxWidthContainer: '1280px',
  sidebarWidth: 'clamp(220px, 18vw, 260px)',
  sidebarCollapsedWidth: '72px',
  topbarHeight: '56px'
} as const;

/**
 * Theme-aware CSS references for new UI consumers. Import variables.css first.
 * Legacy literal exports above retain their compatibility values; they are not
 * a snapshot of the current CSS theme. Motion references honor reduced motion
 * in CSS and must not be parsed as JavaScript timer durations.
 */
export const semanticTokens = {
  material: {
    canvas: 'var(--material-canvas)',
    panel: 'var(--material-panel)',
    inset: 'var(--material-inset)',
    raised: 'var(--material-raised)',
    hover: 'var(--material-hover)',
    scrim: 'var(--material-scrim)',
    border: 'var(--material-border)',
    borderStrong: 'var(--material-border-strong)',
    radiusControl: 'var(--material-radius-control)',
    radiusPanel: 'var(--material-radius-panel)',
    radiusEditorial: 'var(--material-radius-editorial)',
    elevationPanel: 'var(--material-elevation-panel)',
    elevationFloating: 'var(--material-elevation-floating)',
    elevationDrawer: 'var(--material-elevation-drawer)'
  },
  spacing: {
    controlGap: 'var(--space-control-gap)',
    panelPadding: 'var(--space-panel-padding)',
    sectionGap: 'var(--space-section-gap)'
  },
  content: {
    primary: 'var(--content-primary)',
    secondary: 'var(--content-secondary)',
    muted: 'var(--content-muted)',
    link: 'var(--content-link)'
  },
  action: {
    primary: 'var(--action-primary-bg)',
    hover: 'var(--action-primary-hover)',
    pressed: 'var(--action-primary-pressed)',
    content: 'var(--action-primary-content)'
  },
  typography: {
    familyInterface: 'var(--type-family-interface)',
    familyEditorial: 'var(--type-family-editorial)',
    familyCode: 'var(--type-family-code)',
    sizeBody: 'var(--type-size-body)',
    sizeLabel: 'var(--type-size-label)',
    sizeMetadata: 'var(--type-size-metadata)',
    sizePageTitle: 'var(--type-size-page-title)',
    sizeEditorial: 'var(--type-size-editorial)',
    weightBody: 'var(--type-weight-body)',
    weightLabel: 'var(--type-weight-label)',
    weightTitle: 'var(--type-weight-title)',
    leadingBody: 'var(--type-leading-body)',
    leadingTitle: 'var(--type-leading-title)',
    trackingBody: 'var(--type-tracking-body)',
    trackingTitle: 'var(--type-tracking-title)',
    numericVariant: 'var(--type-numeric-variant)',
    measureProse: 'var(--type-measure-prose)'
  },
  motion: {
    duration: {
      hover: 'var(--motion-duration-hover)',
      press: 'var(--motion-duration-press)',
      detail: 'var(--motion-duration-detail)',
      drawer: 'var(--motion-duration-drawer)',
      route: 'var(--motion-duration-route)',
      exit: 'var(--motion-duration-exit)'
    },
    ease: {
      enter: 'var(--motion-ease-enter)',
      state: 'var(--motion-ease-state)',
      exit: 'var(--motion-ease-exit)'
    },
    distance: {
      press: 'var(--motion-distance-press)',
      detail: 'var(--motion-distance-detail)',
      drawer: 'var(--motion-distance-drawer)',
      route: 'var(--motion-distance-route)'
    }
  }
} as const;

/**
 * Current CVG Pulse token map. Values are CSS custom-property references so
 * `variables.css` remains the runtime source of truth for cyan, mint, ink,
 * Aptos, themes, and reduced motion.
 *
 * Migration map for the public JS API:
 * - `colors.*` (blue/slate snapshot) -> `cvgPulseTokens.colors.*`
 * - `typography.fontFamily.sans` (Inter) ->
 *   `cvgPulseTokens.typography.fontFamily.interface` (Aptos stack)
 * - `lightTheme` / `darkTheme` -> `cvgPulseLightTheme` / `cvgPulseDarkTheme`
 * - existing `semanticTokens` remains available and is also exposed as the
 *   `semantic` layer below.
 *
 * The legacy exports above are deliberately not aliases of this object: their
 * literal values are a compatibility contract and must not be reinterpreted.
 */
export const cvgPulseTokens = {
  colors: {
    primary: {
      50: 'var(--color-primary-50)',
      100: 'var(--color-primary-100)',
      200: 'var(--color-primary-200)',
      300: 'var(--color-primary-300)',
      400: 'var(--color-primary-400)',
      500: 'var(--color-primary-500)',
      600: 'var(--color-primary-600)',
      700: 'var(--color-primary-700)',
      800: 'var(--color-primary-800)',
      900: 'var(--color-primary-900)'
    },
    accent: {
      50: 'var(--color-accent-50)',
      100: 'var(--color-accent-100)',
      200: 'var(--color-accent-200)',
      300: 'var(--color-accent-300)',
      400: 'var(--color-accent-400)',
      500: 'var(--color-accent-500)',
      600: 'var(--color-accent-600)',
      700: 'var(--color-accent-700)',
      800: 'var(--color-accent-800)',
      900: 'var(--color-accent-900)'
    },
    success: {
      50: 'var(--color-success-50)',
      100: 'var(--color-success-100)',
      200: 'var(--color-success-200)',
      300: 'var(--color-success-300)',
      400: 'var(--color-success-400)',
      500: 'var(--color-success-500)',
      600: 'var(--color-success-600)',
      700: 'var(--color-success-700)',
      800: 'var(--color-success-800)',
      900: 'var(--color-success-900)'
    },
    warning: {
      50: 'var(--color-warning-50)',
      100: 'var(--color-warning-100)',
      200: 'var(--color-warning-200)',
      300: 'var(--color-warning-300)',
      400: 'var(--color-warning-400)',
      500: 'var(--color-warning-500)',
      600: 'var(--color-warning-600)',
      700: 'var(--color-warning-700)',
      800: 'var(--color-warning-800)',
      900: 'var(--color-warning-900)'
    },
    danger: {
      50: 'var(--color-danger-50)',
      100: 'var(--color-danger-100)',
      200: 'var(--color-danger-200)',
      300: 'var(--color-danger-300)',
      400: 'var(--color-danger-400)',
      500: 'var(--color-danger-500)',
      600: 'var(--color-danger-600)',
      700: 'var(--color-danger-700)',
      800: 'var(--color-danger-800)',
      900: 'var(--color-danger-900)'
    },
    info: {
      50: 'var(--color-info-50)',
      100: 'var(--color-info-100)',
      200: 'var(--color-info-200)',
      300: 'var(--color-info-300)',
      400: 'var(--color-info-400)',
      500: 'var(--color-info-500)',
      600: 'var(--color-info-600)',
      700: 'var(--color-info-700)',
      800: 'var(--color-info-800)',
      900: 'var(--color-info-900)'
    },
    neutral: {
      0: 'var(--color-neutral-0)',
      50: 'var(--color-neutral-50)',
      100: 'var(--color-neutral-100)',
      200: 'var(--color-neutral-200)',
      300: 'var(--color-neutral-300)',
      400: 'var(--color-neutral-400)',
      500: 'var(--color-neutral-500)',
      600: 'var(--color-neutral-600)',
      700: 'var(--color-neutral-700)',
      800: 'var(--color-neutral-800)',
      900: 'var(--color-neutral-900)',
      950: 'var(--color-neutral-950)'
    },
    surface: {
      bg: 'var(--color-bg)',
      bgElevated: 'var(--color-bg-elevated)',
      bgSubtle: 'var(--color-bg-subtle)',
      bgOverlay: 'var(--color-bg-overlay)',
      surface: 'var(--color-surface)',
      surfaceGlass: 'var(--color-surface-glass)',
      surfaceHover: 'var(--color-surface-hover)',
      border: 'var(--color-border)',
      borderStrong: 'var(--color-border-strong)',
      text: 'var(--color-text)',
      textSecondary: 'var(--color-text-secondary)',
      textMuted: 'var(--color-text-muted)',
      textInverse: 'var(--color-text-inverse)',
      textLink: 'var(--color-text-link)',
      focusRing: 'var(--color-focus-ring)'
    },
    brand: {
      ink: 'var(--color-ink)',
      navy: 'var(--color-navy)',
      offWhite: 'var(--color-off-white)',
      cyan: 'var(--color-cyan)',
      coral: 'var(--color-coral)',
      mint: 'var(--color-mint)',
      primarySubtle: 'var(--color-primary-subtle)',
      primarySurface: 'var(--color-primary-surface)'
    }
  },
  spacing: {
    0: 'var(--space-0)',
    1: 'var(--space-1)',
    2: 'var(--space-2)',
    3: 'var(--space-3)',
    4: 'var(--space-4)',
    5: 'var(--space-5)',
    6: 'var(--space-6)',
    8: 'var(--space-8)',
    10: 'var(--space-10)',
    12: 'var(--space-12)',
    16: 'var(--space-16)',
    20: 'var(--space-20)',
    24: 'var(--space-24)'
  },
  radius: {
    none: 'var(--radius-none)',
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    '2xl': 'var(--radius-2xl)',
    full: 'var(--radius-full)'
  },
  shadows: {
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
    glow: 'var(--shadow-glow)',
    inner: 'var(--shadow-inner)',
    focus: 'var(--shadow-focus)'
  },
  typography: {
    fontFamily: {
      interface: 'var(--font-family-sans)',
      editorial: 'var(--font-family-display)',
      code: 'var(--font-family-mono)'
    },
    fontSize: {
      xs: 'var(--font-size-xs)',
      sm: 'var(--font-size-sm)',
      base: 'var(--font-size-base)',
      lg: 'var(--font-size-lg)',
      xl: 'var(--font-size-xl)',
      '2xl': 'var(--font-size-2xl)',
      '3xl': 'var(--font-size-3xl)',
      '4xl': 'var(--font-size-4xl)'
    },
    fontWeight: {
      normal: 'var(--font-weight-normal)',
      medium: 'var(--font-weight-medium)',
      semibold: 'var(--font-weight-semibold)',
      bold: 'var(--font-weight-bold)'
    },
    lineHeight: {
      tight: 'var(--line-height-tight)',
      normal: 'var(--line-height-normal)',
      relaxed: 'var(--line-height-relaxed)'
    },
    letterSpacing: {
      tight: 'var(--letter-spacing-tight)',
      normal: 'var(--letter-spacing-normal)',
      wide: 'var(--letter-spacing-wide)'
    },
    roles: {
      familyInterface: 'var(--type-family-interface)',
      familyEditorial: 'var(--type-family-editorial)',
      familyCode: 'var(--type-family-code)',
      sizeBody: 'var(--type-size-body)',
      sizeLabel: 'var(--type-size-label)',
      sizeMetadata: 'var(--type-size-metadata)',
      sizePageTitle: 'var(--type-size-page-title)',
      sizeEditorial: 'var(--type-size-editorial)',
      weightBody: 'var(--type-weight-body)',
      weightLabel: 'var(--type-weight-label)',
      weightTitle: 'var(--type-weight-title)',
      leadingBody: 'var(--type-leading-body)',
      leadingTitle: 'var(--type-leading-title)',
      trackingBody: 'var(--type-tracking-body)',
      trackingTitle: 'var(--type-tracking-title)',
      numericVariant: 'var(--type-numeric-variant)',
      measureProse: 'var(--type-measure-prose)'
    }
  },
  transitions: {
    ease: {
      default: 'var(--ease-default)',
      bounce: 'var(--ease-bounce)'
    },
    duration: {
      fast: 'var(--duration-fast)',
      normal: 'var(--duration-normal)',
      slow: 'var(--duration-slow)'
    }
  },
  motion: semanticTokens.motion,
  layout: {
    touchMin: 'var(--touch-min)',
    maxWidthProse: 'var(--max-width-prose)',
    maxWidthContainer: 'var(--max-width-container)',
    sidebarWidth: 'var(--sidebar-width)',
    sidebarCollapsedWidth: 'var(--sidebar-collapsed-width)',
    topbarHeight: 'var(--topbar-height)'
  },
  zIndex: {
    dropdown: 'var(--z-dropdown)',
    sticky: 'var(--z-sticky)',
    overlay: 'var(--z-overlay)',
    modal: 'var(--z-modal)',
    toast: 'var(--z-toast)',
    tooltip: 'var(--z-tooltip)'
  },
  semantic: semanticTokens
} as const;
