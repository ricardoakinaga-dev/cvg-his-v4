export const baseStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

/* ═══════════════════════════════════════════════════
   CVG-HIS V2 — Premium Design System
   ═══════════════════════════════════════════════════ */

:root {
  color-scheme: light dark;
  
  /* 🎨 Premium Blue Color Palette */
  --bg: #f0f4f8;
  --bg-gradient: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  --bg-mesh: 
    radial-gradient(at 40% 20%, rgba(59, 130, 246, 0.08) 0px, transparent 50%),
    radial-gradient(at 80% 0%, rgba(37, 99, 235, 0.06) 0px, transparent 50%),
    radial-gradient(at 0% 50%, rgba(14, 165, 233, 0.05) 0px, transparent 50%),
    radial-gradient(at 80% 50%, rgba(29, 78, 216, 0.04) 0px, transparent 50%),
    radial-gradient(at 0% 100%, rgba(6, 182, 212, 0.06) 0px, transparent 50%);
  
  --ink: #0c1929;
  --ink-soft: #334155;
  --ink-muted: #94a3b8;
  
  /* Primary — Pure Blue */
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --primary-light: #60a5fa;
  --primary-glow: rgba(37, 99, 235, 0.12);
  --primary-gradient: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%);
  
  /* Accent — Teal */
  --accent: #0d9488;
  --accent-dark: #0f766e;
  --accent-light: #2dd4bf;
  --accent-glow: rgba(13, 148, 136, 0.12);
  
  /* Semantic */
  --success: #10b981;
  --success-soft: rgba(16, 185, 129, 0.1);
  --warning: #f59e0b;
  --warning-soft: rgba(245, 158, 11, 0.1);
  --danger: #ef4444;
  --danger-soft: rgba(239, 68, 68, 0.1);
  --info: #3b82f6;
  --info-soft: rgba(59, 130, 246, 0.1);
  
  /* Surfaces */
  --card: rgba(255, 255, 255, 0.7);
  --card-solid: #ffffff;
  --card-border: rgba(255, 255, 255, 0.6);
  --glass: rgba(255, 255, 255, 0.25);
  --glass-border: rgba(255, 255, 255, 0.35);
  
  --line: rgba(148, 163, 184, 0.2);
  --line-strong: rgba(100, 116, 139, 0.25);
  
  /* Shadows — Premium depth */
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.05);
  --shadow-xl: 0 16px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06);
  --shadow-glow: 0 0 20px rgba(37, 99, 235, 0.15), 0 0 40px rgba(37, 99, 235, 0.05);
  --shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
  
  /* Radius */
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;
  
  /* Transitions */
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  
  /* Touch */
  --touch-min: 44px;
  
  /* Sidebar */
  --sidebar-width: clamp(220px, 18vw, 260px);
  --sidebar-collapsed-width: 72px;
  --sidebar-mobile-width: 280px;
}

/* ═══════════════════════════════════════════════════
   BASE RESET & TYPOGRAPHY
   ═══════════════════════════════════════════════════ */

*, *::before, *::after { box-sizing: border-box; }

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--ink);
  background: var(--bg);
  background-image: var(--bg-mesh);
  background-attachment: fixed;
  min-height: 100vh;
}

body.sidebar-open { overflow: hidden; }
body.command-palette-open { overflow: hidden; }

a { color: inherit; text-decoration: none; }
button, input, select, textarea { font-family: inherit; font-size: inherit; }

.mobile-top-nav { display: none; }

/* ═══════════════════════════════════════════════════
   BUTTONS — Premium with micro-interactions
   ═══════════════════════════════════════════════════ */

button {
  border: 0;
  border-radius: var(--radius);
  padding: 10px 20px;
  background: var(--primary-gradient);
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  letter-spacing: 0.01em;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-md), 0 4px 14px rgba(37, 99, 235, 0.25);
  transition:
    transform var(--duration-fast) var(--ease),
    box-shadow var(--duration-fast) var(--ease),
    filter var(--duration-fast) var(--ease);
}

button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%);
  pointer-events: none;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg), 0 8px 20px rgba(37, 99, 235, 0.3);
  filter: brightness(1.05);
}

button:active {
  transform: translateY(0) scale(0.98);
  box-shadow: var(--shadow-sm);
}

button.secondary {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  color: var(--primary-dark);
  border: 1px solid rgba(37, 99, 235, 0.15);
  box-shadow: var(--shadow-sm);
}
button.secondary::before { display: none; }
button.secondary:hover {
  background: white;
  border-color: rgba(37, 99, 235, 0.3);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

button.danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: var(--shadow-md), 0 4px 14px rgba(239, 68, 68, 0.25);
}
button.danger:hover {
  box-shadow: var(--shadow-lg), 0 8px 20px rgba(239, 68, 68, 0.3);
}

button.small {
  padding: 6px 14px;
  font-size: 0.8rem;
  border-radius: var(--radius-sm);
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
  filter: grayscale(0.5);
}

/* ═══════════════════════════════════════════════════
   FORM INPUTS — Clean with focus glow
   ═══════════════════════════════════════════════════ */

input, select, textarea {
  border: 1.5px solid var(--line-strong);
  border-radius: var(--radius);
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  color: var(--ink);
  transition:
    border-color var(--duration-fast) var(--ease),
    box-shadow var(--duration-fast) var(--ease),
    background var(--duration-fast) var(--ease);
}

input:hover, select:hover, textarea:hover {
  border-color: rgba(37, 99, 235, 0.3);
}

input:focus, select:focus, textarea:focus {
  outline: none;
  background: white;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow), var(--shadow-sm);
}

textarea {
  resize: vertical;
  min-height: 80px;
}

label {
  display: grid;
  gap: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink-soft);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ═══════════════════════════════════════════════════
   APP SHELL — Grid layout
   ═══════════════════════════════════════════════════ */

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  gap: 0;
  padding: 8px;
  transition: grid-template-columns var(--duration-normal) var(--ease);
}

.app-shell[data-sidebar-state='collapsed'] {
  grid-template-columns: var(--sidebar-collapsed-width) minmax(0, 1fr);
}

.app-shell[data-sidebar-state='collapsed'] .sidebar {
  width: var(--sidebar-collapsed-width);
  padding: 8px;
}

.app-shell[data-sidebar-state='collapsed'] .sidebar-brand-text,
.app-shell[data-sidebar-state='collapsed'] .sidebar-search,
.app-shell[data-sidebar-state='collapsed'] .sidebar-group-label,
.app-shell[data-sidebar-state='collapsed'] .sidebar-group-chevron,
.app-shell[data-sidebar-state='collapsed'] .sidebar-link-label,
.app-shell[data-sidebar-state='collapsed'] .sidebar-footer {
  display: none;
}

.app-shell[data-sidebar-state='collapsed'] .sidebar-brand {
  justify-content: center;
  padding: 12px 4px;
}

.app-shell[data-sidebar-state='collapsed'] .sidebar-group-links {
  display: none;
}

.app-shell[data-sidebar-state='collapsed'] details.sidebar-group[open] .sidebar-group-links {
  display: grid;
}

.app-shell[data-sidebar-state='collapsed'] .sidebar-link {
  justify-content: center;
  padding: 10px;
}

.app-shell[data-sidebar-state='collapsed'] .sidebar-link-icon {
  font-size: 1.2rem;
}

.app-shell[data-sidebar-state='collapsed'] .sidebar-group-toggle {
  justify-content: center;
  padding: 8px;
}

.app-shell[data-sidebar-state='collapsed'] .sidebar-group-icon {
  font-size: 1rem;
}

.app-shell[data-sidebar-state='collapsed'] .sidebar-collapse-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
}

.app-shell[data-sidebar-state='collapsed'] .sidebar-collapse-btn::after {
  content: '→';
}

.sidebar-overlay { display: none; }

/* Topbar */
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px;
  margin-bottom: 12px;
  min-height: 44px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ink);
}

.topbar-chip {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--ink-muted);
  background: rgba(37, 99, 235, 0.06);
  padding: 3px 10px;
  border-radius: var(--radius-full);
}

.topbar-menu-btn {
  display: none;
  width: 40px;
  height: 40px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.7);
  color: var(--ink-soft);
  font-size: 1.2rem;
  cursor: pointer;
  place-items: center;
  transition: background 0.15s ease, color 0.15s ease;
}

.topbar-menu-btn:hover {
  background: rgba(37, 99, 235, 0.08);
  color: var(--primary);
}

.topbar-command-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: var(--radius-full);
  white-space: nowrap;
  box-shadow: var(--shadow-sm);
}

.topbar-command-btn .topbar-command-label {
  font-size: 0.78rem;
  letter-spacing: 0.02em;
}

.topbar-command-btn span[aria-hidden="true"] {
  font-family: var(--font-family-mono, monospace);
  font-size: 0.75rem;
  font-weight: 700;
}

/* Command palette */
.command-palette {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: flex-start center;
  padding: 12vh 20px 20px;
}

.command-palette[hidden] {
  display: none;
}

.command-palette-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: rgba(3, 15, 30, 0.52);
  backdrop-filter: blur(10px);
  box-shadow: none;
}

.command-palette-backdrop::before {
  display: none;
}

.command-palette-backdrop:hover,
.command-palette-backdrop:active {
  transform: none;
  box-shadow: none;
  filter: none;
}

.command-palette-panel {
  position: relative;
  width: min(740px, 100%);
  max-height: min(72vh, 760px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: calc(var(--radius-xl) + 4px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(248, 250, 252, 0.94);
  backdrop-filter: blur(18px) saturate(160%);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.32);
}

.command-palette-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding: 20px 20px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.command-palette-kicker {
  margin: 0 0 4px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--primary-dark);
}

.command-palette-header h2 {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 800;
  color: var(--ink);
}

.command-palette-close-btn {
  flex-shrink: 0;
}

.command-palette-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(255, 255, 255, 0.7);
}

.command-palette-search-icon {
  color: var(--primary);
  font-size: 1rem;
}

.command-palette-input {
  flex: 1;
  border: 0;
  background: transparent;
  padding: 0;
  box-shadow: none;
  color: var(--ink);
  font-size: 0.95rem;
  outline: none;
}

.command-palette-input:focus {
  box-shadow: none;
  background: transparent;
}

.command-palette-input::placeholder {
  color: var(--ink-muted);
}

.command-palette-search-hint,
.command-palette-item-shortcut,
.command-palette-footer kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  padding: 4px 7px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.88);
  color: var(--ink-soft);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: var(--shadow-xs);
}

.command-palette-results {
  max-height: 48vh;
  overflow-y: auto;
  padding: 10px;
}

.command-palette-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease),
    transform var(--duration-fast) var(--ease),
    box-shadow var(--duration-fast) var(--ease);
}

.command-palette-item:hover,
.command-palette-item.is-active {
  background: rgba(37, 99, 235, 0.08);
  color: var(--ink);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.16);
  transform: translateY(-1px);
}

.command-palette-item[hidden] {
  display: none;
}

.command-palette-item-icon {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.command-palette-item-body {
  display: grid;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.command-palette-item-body strong {
  font-size: 0.92rem;
  font-weight: 700;
}

.command-palette-item-body span {
  font-size: 0.75rem;
  color: var(--ink-muted);
}

.command-palette-empty {
  margin: 0;
  padding: 0 20px 12px;
  color: var(--ink-muted);
  font-size: 0.88rem;
}

.command-palette-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  justify-content: space-between;
  padding: 12px 20px 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  color: var(--ink-muted);
  font-size: 0.76rem;
}

.command-palette-footer span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* ═══════════════════════════════════════════════════
   SIDEBAR — Premium glassmorphism
   ═══════════════════════════════════════════════════ */

.sidebar {
  position: sticky;
  top: 8px;
  height: calc(100vh - 16px);
  padding: 0;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 10;
}

.sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: 
    linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 30%),
    linear-gradient(180deg, transparent 85%, rgba(37, 99, 235, 0.02) 100%);
  z-index: 0;
}

.sidebar-top, .sidebar-nav, .sidebar-footer {
  position: relative;
  z-index: 1;
}

.sidebar-top {
  display: none;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: grid;
  gap: 2px;
  padding: 4px 8px;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.sidebar-nav::-webkit-scrollbar { width: 3px; }
.sidebar-nav::-webkit-scrollbar-track { background: transparent; }
.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(37, 99, 235, 0.1);
  border-radius: 999px;
}
.sidebar:hover .sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(37, 99, 235, 0.2);
}

/* Sidebar Brand */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--line);
  position: relative;
  z-index: 3;
}

.sidebar-brand-link {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 4px;
  transition: background 0.15s ease;
}

.sidebar-brand-link:hover {
  background: rgba(37, 99, 235, 0.06);
}

.sidebar-brand-logo {
  font-size: 1.5rem;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  background: var(--primary-gradient);
  border-radius: var(--radius-sm);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
}

.sidebar-brand-text {
  flex: 1;
  min-width: 0;
}

.sidebar-brand-text strong {
  display: block;
  font-size: 0.9rem;
  font-weight: 800;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}

.sidebar-brand-text span {
  display: block;
  font-size: 0.65rem;
  color: var(--ink-muted);
  letter-spacing: 0.02em;
}

/* Sidebar Collapse Button */
.sidebar-collapse-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.7);
  color: var(--ink-muted);
  font-size: 0.9rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: 
    background 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease,
    border-color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.sidebar-collapse-btn:hover {
  background: rgba(37, 99, 235, 0.08);
  color: var(--primary);
  border-color: rgba(37, 99, 235, 0.2);
  transform: scale(1.05);
}

.sidebar-collapse-btn:active {
  transform: scale(0.95);
}

/* Sidebar Search */
.sidebar-search {
  padding: 8px 12px;
}

.sidebar-search input {
  width: 100%;
  padding: 8px 12px;
  font-size: 0.8rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.5);
  color: var(--ink);
}

.sidebar-search input::placeholder {
  color: var(--ink-muted);
}

.sidebar-search input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-glow);
  background: white;
}

/* Sidebar Group */
.sidebar-group { border: 0; }
.sidebar-group[open] > .sidebar-group-toggle { margin-bottom: 2px; }

.sidebar-group-toggle {
  list-style: none;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease);
  display: flex;
  align-items: center;
  gap: 6px;
}

.sidebar-group-toggle:hover {
  background: rgba(37, 99, 235, 0.06);
}

.sidebar-group-toggle::-webkit-details-marker { display: none; }
.sidebar-group-toggle::marker { display: none; content: ''; }

.sidebar-group-icon {
  font-size: 0.85rem;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.sidebar-group-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.sidebar-group-chevron {
  margin-left: auto;
  font-size: 0.65rem;
  color: var(--ink-muted);
  transition: transform var(--duration-fast) var(--ease);
}

.sidebar-group[open] > .sidebar-group-toggle > .sidebar-group-chevron {
  transform: rotate(180deg);
}

.sidebar-group-links {
  display: grid;
  gap: 1px;
  padding-left: 4px;
}

/* Sidebar Links */
.sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ink-soft);
  transition:
    background var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease),
    transform var(--duration-fast) var(--ease),
    box-shadow var(--duration-fast) var(--ease);
  position: relative;
}

.sidebar-link:hover {
  background: rgba(37, 99, 235, 0.06);
  color: var(--ink);
  transform: translateX(2px);
}

.sidebar-link.active {
  background: var(--primary-gradient);
  color: white;
  font-weight: 600;
  box-shadow: var(--shadow-sm), 0 2px 8px rgba(37, 99, 235, 0.25);
}

.sidebar-link.active::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%);
  pointer-events: none;
}

.sidebar-link-icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.sidebar-link-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Sidebar Footer */
.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.3);
}

/* Collapse button */
.sidebar-collapse-btn, .icon-button {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(37, 99, 235, 0.1);
  color: var(--ink-soft);
  font-size: 0.75rem;
  display: grid;
  place-items: center;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: var(--shadow-xs);
  transition:
    background var(--duration-fast) var(--ease),
    transform var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.icon-button:hover {
  background: rgba(37, 99, 235, 0.08);
  color: var(--primary);
  transform: scale(1.1);
}

/* ═══════════════════════════════════════════════════
   WORKSPACE — Main content area
   ═══════════════════════════════════════════════════ */

.workspace-shell {
  padding: 16px 20px 40px;
  overflow-x: hidden;
  min-width: 0;
}

/* ═══════════════════════════════════════════════════
   CARDS — Premium glass effect
   ═══════════════════════════════════════════════════ */

.card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  box-shadow: var(--shadow-card);
  transition:
    box-shadow var(--duration-normal) var(--ease),
    transform var(--duration-normal) var(--ease);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.card h2 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 14px;
  letter-spacing: -0.01em;
}

/* ═══════════════════════════════════════════════════
   PAGE HEADER
   ═══════════════════════════════════════════════════ */

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 0.85rem;
  color: var(--ink-muted);
  margin: 4px 0 0;
  font-weight: 400;
}

/* ═══════════════════════════════════════════════════
   GRID LAYOUTS
   ═══════════════════════════════════════════════════ */

.grid { display: grid; gap: 16px; }
.grid-2 { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.grid-3 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.grid-4 { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }

.btn-row {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}

/* ═══════════════════════════════════════════════════
   TABLES — Clean with hover
   ═══════════════════════════════════════════════════ */

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.85rem;
}

thead th {
  padding: 10px 14px;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-muted);
  background: rgba(37, 99, 235, 0.04);
  border-bottom: 2px solid var(--line);
  position: sticky;
  top: 0;
}

thead th:first-child { border-radius: var(--radius-sm) 0 0 0; }
thead th:last-child { border-radius: 0 var(--radius-sm) 0 0; }

tbody td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
  vertical-align: middle;
}

tbody tr {
  transition: background var(--duration-fast) var(--ease);
}

tbody tr:hover {
  background: rgba(37, 99, 235, 0.03);
}

tbody tr:last-child td { border-bottom: 0; }

code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.8em;
  background: rgba(37, 99, 235, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--primary-dark);
}

/* ═══════════════════════════════════════════════════
   BADGES — Status indicators
   ═══════════════════════════════════════════════════ */

.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.badge-success {
  background: var(--success-soft);
  color: var(--success);
}
.badge-warning {
  background: var(--warning-soft);
  color: #b45309;
}
.badge-error, .badge-danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.badge-info {
  background: var(--info-soft);
  color: var(--info);
}

/* ═══════════════════════════════════════════════════
   ALERTS — Animated entrance
   ═══════════════════════════════════════════════════ */

.alert {
  padding: 12px 16px;
  border-radius: var(--radius);
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 12px;
  animation: alertSlideIn var(--duration-normal) var(--ease-bounce);
  border-left: 4px solid;
}

.alert-success {
  background: var(--success-soft);
  color: #065f46;
  border-color: var(--success);
}
.alert-error {
  background: var(--danger-soft);
  color: #991b1b;
  border-color: var(--danger);
}
.alert-info {
  background: var(--info-soft);
  color: #1e40af;
  border-color: var(--info);
}
.alert-warning {
  background: var(--warning-soft);
  color: #92400e;
  border-color: var(--warning);
}

@keyframes alertSlideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ═══════════════════════════════════════════════════
   STATS CARDS — Dashboard widgets
   ═══════════════════════════════════════════════════ */

.stat-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-card);
  transition: transform var(--duration-normal) var(--ease), box-shadow var(--duration-normal) var(--ease);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-card .stat-value {
  font-size: 2rem;
  font-weight: 800;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.stat-card .stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-muted);
  margin-top: 4px;
}

/* ═══════════════════════════════════════════════════
   DASHBOARD SPECIFIC
   ═══════════════════════════════════════════════════ */

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.dashboard-welcome {
  background: var(--primary-gradient);
  border-radius: var(--radius-xl);
  padding: 28px 32px;
  color: white;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-lg), 0 8px 32px rgba(37, 99, 235, 0.3);
}

.dashboard-welcome::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
  pointer-events: none;
}

.dashboard-welcome::after {
  content: '';
  position: absolute;
  bottom: -30%;
  left: -10%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  pointer-events: none;
}

.dashboard-welcome h2 {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 0 6px;
  position: relative;
  z-index: 1;
}

.dashboard-welcome p {
  margin: 0;
  opacity: 0.85;
  font-size: 0.9rem;
  position: relative;
  z-index: 1;
}

/* ═══════════════════════════════════════════════════
   LOGIN PAGE — Centered premium
   ═══════════════════════════════════════════════════ */

.login-wrapper {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background: 
    radial-gradient(ellipse at top left, rgba(37, 99, 235, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(16, 185, 129, 0.06) 0%, transparent 50%),
    var(--bg);
}

.login-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-xl);
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--shadow-xl);
}

.login-card h1 {
  font-size: 1.75rem;
  font-weight: 800;
  text-align: center;
  margin: 0 0 6px;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-card .login-subtitle {
  text-align: center;
  color: var(--ink-muted);
  font-size: 0.875rem;
  margin: 0 0 28px;
}

/* ═══════════════════════════════════════════════════
   LOADING STATES
   ═══════════════════════════════════════════════════ */

.loading-skeleton {
  background: linear-gradient(90deg, 
    rgba(37, 99, 235, 0.06) 25%, 
    rgba(37, 99, 235, 0.12) 50%, 
    rgba(37, 99, 235, 0.06) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--line);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ═══════════════════════════════════════════════════
   TOOLTIP
   ═══════════════════════════════════════════════════ */

[data-tooltip] {
  position: relative;
}

[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-4px);
  padding: 4px 10px;
  background: var(--ink);
  color: white;
  font-size: 0.7rem;
  font-weight: 500;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--duration-fast) var(--ease), transform var(--duration-fast) var(--ease);
  z-index: 100;
}

[data-tooltip]:hover::after {
  opacity: 1;
  transform: translateX(-50%) translateY(-8px);
}

/* ═══════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════ */

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--ink-muted);
}

.empty-state-icon {
  font-size: 3rem;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state-text {
  font-size: 0.9rem;
  font-weight: 500;
}

/* ═══════════════════════════════════════════════════
   MISC
   ═══════════════════════════════════════════════════ */

.muted { color: var(--ink-muted); font-style: italic; }
.text-success { color: var(--success); }
.text-danger { color: var(--danger); }
.text-warning { color: #b45309; }
.text-primary { color: var(--primary); }
.font-bold { font-weight: 700; }
.text-center { text-align: center; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mb-2 { margin-bottom: 8px; }
.mb-4 { margin-bottom: 16px; }

hr {
  border: 0;
  height: 1px;
  background: var(--line);
  margin: 16px 0;
}

/* ═══════════════════════════════════════════════════
   SCROLLBAR — Custom premium
   ═══════════════════════════════════════════════════ */

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(37, 99, 235, 0.15);
  border-radius: 99px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(37, 99, 235, 0.25);
}

/* ═══════════════════════════════════════════════════
   SELECTION
   ═══════════════════════════════════════════════════ */

::selection {
  background: rgba(37, 99, 235, 0.2);
  color: var(--ink);
}

/* ═══════════════════════════════════════════════════
   RESPONSIVE — Enterprise Mobile
   ═══════════════════════════════════════════════════ */

/* --- Bottom Navigation (Mobile) --- */
.mobile-bottom-nav {
  display: none;
}

/* --- Mobile: ≤ 768px (Smartphone) --- */
@media (max-width: 768px) {
  :root {
    --sidebar-width: 0px;
  }

  .app-shell {
    grid-template-columns: 1fr;
    padding: 0;
    min-height: 100dvh; /* dynamic viewport height */
  }

  /* Premium Drawer Sidebar */
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: min(85vw, 320px);
    height: 100dvh;
    transform: translateX(-105%);
    transition: transform var(--duration-normal) var(--ease), box-shadow var(--duration-normal) var(--ease);
    z-index: 200;
    border-radius: 0 var(--radius-xl) var(--radius-xl) 0;
    box-shadow: var(--shadow-xl);
    padding: env(safe-area-inset-top, 12px) 16px env(safe-area-inset-bottom, 12px) 16px;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  body.sidebar-open .sidebar {
    transform: translateX(0);
    box-shadow: 20px 0 60px rgba(0, 0, 0, 0.2);
  }

  /* Drawer Overlay */
  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 199;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--duration-normal) var(--ease);
    -webkit-tap-highlight-color: transparent;
  }

  body.sidebar-open .sidebar-overlay {
    opacity: 1;
    pointer-events: auto;
  }

  /* Hide desktop sidebar elements on mobile */
  .sidebar-top { display: none; }

  /* Workspace */
  .workspace-shell {
    padding: 12px 12px 80px; /* bottom padding for bottom nav */
    padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  }

  /* Topbar — Simplified */
  .topbar {
    padding: 8px 4px;
    min-height: 48px;
  }

  .topbar-chip { display: none; }
  .topbar-overline { display: none; }

  .topbar-title {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .topbar-menu-btn {
    display: grid;
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }

  .topbar-command-btn {
    padding: 8px 10px;
  }

  .topbar-command-label {
    display: none;
  }

  .command-palette {
    padding: 0;
  }

  .command-palette-panel {
    width: 100%;
    max-width: 100%;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
  }

  .command-palette-header,
  .command-palette-search,
  .command-palette-empty,
  .command-palette-footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .command-palette-results {
    max-height: none;
    flex: 1;
  }

  /* Page Header */
  .page-header {
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
  }

  .page-header h1 {
    font-size: 1.35rem;
  }

  .page-header button {
    width: 100%;
  }

  /* Grids — Single column */
  .grid-2, .grid-3, .grid-4 {
    grid-template-columns: 1fr;
  }

  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .dashboard-welcome {
    padding: 20px;
    border-radius: var(--radius-lg);
  }

  .dashboard-welcome h2 {
    font-size: 1.25rem;
  }

  /* Cards */
  .card {
    padding: 16px;
    border-radius: var(--radius);
  }

  .card h2 {
    font-size: 0.9rem;
  }

  /* Forms — Touch Optimized */
  input, select, textarea {
    padding: 14px 16px;
    font-size: 16px; /* prevent iOS zoom */
    border-radius: var(--radius);
    min-height: var(--touch-min);
  }

  label {
    font-size: 0.75rem;
  }

  button {
    min-height: var(--touch-min);
    padding: 12px 20px;
    font-size: 0.95rem;
    border-radius: var(--radius);
  }

  .btn-row {
    flex-direction: column;
    gap: 8px;
  }

  .btn-row button {
    width: 100%;
  }

  /* Tables → Card View */
  table, thead, tbody, tr, th, td {
    display: block;
  }

  thead {
    display: none;
  }

  tbody tr {
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    margin-bottom: 10px;
    padding: 12px;
    box-shadow: var(--shadow-xs);
  }

  tbody tr:hover {
    background: rgba(255, 255, 255, 0.7);
  }

  tbody td {
    padding: 6px 0;
    border: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
  }

  tbody td::before {
    content: attr(data-label);
    font-weight: 700;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-muted);
    flex-shrink: 0;
    margin-right: 12px;
  }

  /* Stat Cards */
  .stat-card {
    padding: 16px;
  }

  .stat-card .stat-value {
    font-size: 1.5rem;
  }

  /* Login */
  .login-card {
    padding: 28px 24px;
    max-width: 100%;
    border-radius: var(--radius-lg);
  }

  .login-card h1 {
    font-size: 1.5rem;
  }

  /* Hide mobile-top-nav (replaced by bottom nav) */
  .mobile-top-nav {
    display: none;
  }

  /* Bottom Navigation */
  .mobile-bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 150;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-top: 1px solid var(--glass-border);
    padding: 6px 8px;
    padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px));
    gap: 2px;
    justify-content: space-around;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.06);
  }

  .bottom-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--ink-muted);
    text-decoration: none;
    min-width: 56px;
    min-height: 48px;
    transition: 
      color var(--duration-fast) var(--ease),
      background var(--duration-fast) var(--ease),
      transform var(--duration-fast) var(--ease);
    -webkit-tap-highlight-color: transparent;
    position: relative;
  }

  .bottom-nav-item:active {
    transform: scale(0.92);
  }

  .bottom-nav-item.active {
    color: var(--primary);
  }

  .bottom-nav-item.active::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 3px;
    background: var(--primary-gradient);
    border-radius: 0 0 4px 4px;
  }

  .bottom-nav-icon {
    font-size: 1.25rem;
    line-height: 1;
  }

  .bottom-nav-label {
    font-size: 0.6rem;
    letter-spacing: 0.01em;
  }

  /* Status bar hidden on mobile */
  .status-bar { display: none; }
}

/* --- Tablet: 769px — 1024px --- */
@media (min-width: 769px) and (max-width: 1024px) {
  :root {
    --sidebar-width: 200px;
  }

  .workspace-shell {
    padding: 14px 16px 20px;
  }

  .grid-3, .grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .card {
    padding: 18px 20px;
  }

  .mobile-top-nav, .mobile-bottom-nav {
    display: none;
  }

  .sidebar {
    border-radius: var(--radius-lg);
  }
}

/* --- Small phone: ≤ 375px --- */
@media (max-width: 375px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .page-header h1 {
    font-size: 1.15rem;
  }

  .stat-card .stat-value {
    font-size: 1.3rem;
  }

  .bottom-nav-item {
    min-width: 48px;
    padding: 6px 4px;
  }

  .bottom-nav-label {
    font-size: 0.55rem;
  }
}

/* --- Landscape phone --- */
@media (max-height: 500px) and (orientation: landscape) {
  .mobile-bottom-nav {
    padding: 4px;
  }

  .bottom-nav-item {
    min-height: 40px;
  }

  .workspace-shell {
    padding-bottom: 56px;
  }
}

/* ═══════════════════════════════════════════════════
   ANIMATIONS — Entrance effects
   ═══════════════════════════════════════════════════ */

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.card { animation: fadeInUp var(--duration-normal) var(--ease) both; }
.card:nth-child(2) { animation-delay: 50ms; }
.card:nth-child(3) { animation-delay: 100ms; }
.card:nth-child(4) { animation-delay: 150ms; }

.stat-card { animation: fadeInUp var(--duration-normal) var(--ease) both; }
.stat-card:nth-child(1) { animation-delay: 0ms; }
.stat-card:nth-child(2) { animation-delay: 60ms; }
.stat-card:nth-child(3) { animation-delay: 120ms; }
.stat-card:nth-child(4) { animation-delay: 180ms; }

/* ═══════════════════════════════════════════════════
   PRINT STYLES
   ═══════════════════════════════════════════════════ */

@media print {
  .sidebar, .sidebar-overlay, .mobile-top-nav { display: none !important; }
  .app-shell { grid-template-columns: 1fr; }
  .card { box-shadow: none; border: 1px solid #ddd; }
  body { background: white; }
}
`;
