export const baseStyles = `
:root {
  color-scheme: light;
  --bg: #f6f8fb;
  --bg-strong: #edf1f6;
  --ink: #163042;
  --ink-soft: #607284;
  --accent: #2a726c;
  --accent-strong: #245f5b;
  --accent-soft: rgba(42, 114, 108, 0.12);
  --accent-glow: rgba(42, 114, 108, 0.18);
  --navy: #163042;
  --navy-soft: #213f57;
  --card: rgba(255, 255, 255, 0.8);
  --card-solid: #ffffff;
  --line: rgba(137, 156, 177, 0.22);
  --line-strong: rgba(107, 126, 147, 0.24);
  --success: #2f7d4f;
  --warning: #bc6a1f;
  --danger: #b24a4a;
  --info: #406cc7;
  --shadow-sm: 0 2px 6px rgba(21, 37, 56, 0.02);
  --shadow-md: 0 4px 10px rgba(21, 37, 56, 0.03);
  --shadow-lg: 0 6px 14px rgba(21, 37, 56, 0.04);
  --radius: 8px;
  --radius-lg: 14px;
  --touch-min: 44px;
  --transition-fast: 0.18s ease;
  --transition-normal: 0.24s ease;
  --sidebar-width: clamp(140px, 22vw, 200px);
  --sidebar-collapsed-width: clamp(36px, 5vw, 48px);
  --sidebar-mobile-width: clamp(260px, 80vw, 320px);
  --sidebar-tablet-width: clamp(180px, 28vw, 260px);
  --sidebar-padding: clamp(3px, 0.6vw, 6px);
  --sidebar-gap: clamp(2px, 0.4vw, 4px);
  --sidebar-radius: clamp(6px, 1.2vw, 12px);
  --font-size-base: clamp(0.58rem, 1.2vw, 0.72rem);
  --font-size-group-label: clamp(0.52rem, 1vw, 0.66rem);
  --font-size-group-kicker: clamp(0.38rem, 0.8vw, 0.48rem);
  --font-size-link: clamp(0.58rem, 1.1vw, 0.7rem);
  --link-padding-y: clamp(4px, 0.8vw, 6px);
  --link-padding-x: clamp(4px, 0.8vw, 7px);
  --icon-size: clamp(10px, 1.4vw, 13px);
  --icon-size-sm: clamp(8px, 1.1vw, 11px);
  --toggle-size: clamp(12px, 1.8vw, 16px);
  --chevron-size: clamp(0.6rem, 1vw, 0.72rem);
  --group-padding-y: clamp(3px, 0.6vw, 5px);
  --group-padding-x: clamp(4px, 0.7vw, 6px);
  --sidebar-border-width: 1px;
}
* { box-sizing: border-box; }
html, body {
  min-height: 100%;
}
body {
  margin: 0;
  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at top left, rgba(42, 114, 108, 0.06), transparent 28%),
    radial-gradient(circle at top right, rgba(64, 108, 199, 0.04), transparent 26%),
    linear-gradient(180deg, var(--bg) 0%, #eff4f8 42%, #f9fbfd 100%);
  color: var(--ink);
}
body.sidebar-open {
  overflow: hidden;
}
.mobile-top-nav {
  display: none;
}
a {
  color: inherit;
}
button,
input,
select,
textarea {
  font: inherit;
}
button {
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: white;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(15, 118, 110, 0.14);
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    filter 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;
}
button:hover {
  transform: translateY(-1px);
  filter: saturate(1.05);
  box-shadow: 0 14px 22px rgba(15, 118, 110, 0.2);
}
button:active {
  transform: translateY(0) scale(0.99);
}
button.secondary {
  background: rgba(255, 255, 255, 0.84);
  color: var(--accent-strong);
  border: 1px solid rgba(15, 118, 110, 0.2);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
}
button.secondary:hover {
  background: white;
  border-color: rgba(15, 118, 110, 0.32);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.1);
}
button.danger {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  box-shadow: 0 10px 20px rgba(185, 28, 28, 0.14);
}
button.danger:hover {
  box-shadow: 0 14px 22px rgba(185, 28, 28, 0.2);
}
button.small {
  padding: 7px 10px;
  font-size: 0.76rem;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
input, select, textarea {
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: var(--radius);
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink);
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    background 0.16s ease;
}
input:hover, select:hover, textarea:hover {
  border-color: rgba(15, 118, 110, 0.25);
}
input:focus, select:focus, textarea:focus {
  outline: none;
  background: white;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
textarea {
  resize: vertical;
  min-height: 76px;
}
label {
  display: grid;
  gap: 5px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ink);
}
.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  gap: 0;
  padding: 6px 8px 8px;
  transition: grid-template-columns var(--transition-normal);
}
.app-shell[data-sidebar-state='collapsed'] {
  grid-template-columns: var(--sidebar-collapsed-width) minmax(0, 1fr);
}
.sidebar-overlay {
  display: none;
}
.sidebar {
  position: sticky;
  top: 6px;
  height: calc(100vh - 12px);
  padding: var(--sidebar-padding);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.58) 0%, rgba(247, 250, 252, 0.65) 100%);
  color: var(--ink);
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: var(--sidebar-gap);
  border: var(--sidebar-border-width) solid rgba(255, 255, 255, 0.32);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(8px);
  overflow: hidden;
  border-radius: var(--sidebar-radius);
}
.sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,0.2), transparent 14%, transparent 88%, rgba(42,114,108,0.015));
}
.sidebar-top,
.sidebar-nav,
.sidebar-footer {
  position: relative;
  z-index: 1;
}
.sidebar-top {
  position: absolute;
  top: var(--sidebar-padding);
  right: var(--sidebar-padding);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sidebar-gap);
  pointer-events: none;
  z-index: 3;
}
.card-surface {
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 4px 8px rgba(21, 37, 56, 0.018);
}
.sidebar-nav {
  overflow: auto;
  display: grid;
  gap: 3px;
  padding: 16px 0 0;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.sidebar-nav::-webkit-scrollbar {
  width: 2px;
}
.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-nav::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 999px;
}
.sidebar:hover .sidebar-nav,
.sidebar-nav:hover {
  scrollbar-color: rgba(107, 126, 147, 0.1) transparent;
}
.sidebar:hover .sidebar-nav::-webkit-scrollbar-thumb,
.sidebar-nav:hover::-webkit-scrollbar-thumb {
  background: rgba(107, 126, 147, 0.1);
}
.sidebar-group {
  display: grid;
  gap: var(--sidebar-gap);
}
.sidebar-group-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sidebar-gap);
  padding: var(--group-padding-y) var(--group-padding-x);
  border-radius: calc(var(--sidebar-radius) - 4px);
  background: rgba(255, 255, 255, 0.14);
  box-shadow: none;
  color: var(--ink);
  transition:
    background 0.16s ease,
    box-shadow 0.16s ease;
}
.sidebar-group-toggle:hover {
  background: rgba(255, 255, 255, 0.32);
}
.sidebar-group-text {
  display: grid;
  text-align: left;
  gap: 2px;
}
.sidebar-group-kicker {
  font-size: var(--font-size-group-kicker);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(96, 114, 132, 0.65);
}
.sidebar-group-label {
  font-size: var(--font-size-group-label);
  font-weight: 700;
  color: var(--ink);
}
.sidebar-group-chevron {
  color: var(--ink-soft);
  transition: transform 0.18s ease;
  font-size: var(--chevron-size);
}
.sidebar-group[open] .sidebar-group-chevron {
  transform: rotate(180deg);
}
.sidebar-group-links {
  display: none;
  padding: 0;
}
.sidebar-group[open] .sidebar-group-links {
  display: grid;
  gap: 1px;
}
.sidebar-link {
  display: flex;
  align-items: center;
  gap: var(--link-padding-x);
  padding: var(--link-padding-y) var(--link-padding-x);
  border-radius: calc(var(--sidebar-radius) - 4px);
  color: var(--ink-soft);
  text-decoration: none;
  font-size: var(--font-size-link);
  font-weight: 600;
  min-height: var(--touch-min);
  transition:
    background 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease,
    border-color 0.16s ease;
  border: var(--sidebar-border-width) solid transparent;
}
.sidebar-link:hover {
  background: rgba(42, 114, 108, 0.06);
  color: var(--ink);
  transform: none;
  border-color: rgba(42, 114, 108, 0.04);
}
.sidebar-link.active {
  background: rgba(42, 114, 108, 0.7);
  color: white;
}
.sidebar-link-icon {
  width: var(--icon-size-sm);
  display: inline-flex;
  justify-content: center;
  font-size: var(--icon-size-sm);
  color: currentColor;
  flex-shrink: 0;
}
.sidebar-footer {
  padding: 2px;
}
.sidebar-user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.66rem;
}
.sidebar-user-card strong {
  display: block;
  color: var(--ink);
  font-size: 0.7rem;
}
.sidebar-user-label {
  display: block;
  margin-bottom: 3px;
  font-size: 0.56rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-soft);
}
.sidebar-login-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 7px 8px;
  border-radius: 7px;
  text-decoration: none;
  background: rgba(42,114,108,0.06);
  color: var(--accent-strong);
  font-weight: 700;
  font-size: 0.72rem;
}
.sidebar-login-link:hover {
  background: rgba(42,114,108,0.1);
}
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--toggle-size);
  height: var(--toggle-size);
  padding: 0;
  border-radius: 999px;
  background: rgba(255,255,255,0.02);
  color: var(--accent-strong);
  box-shadow: none;
  opacity: 0;
  transition:
    opacity 0.16s ease,
    background 0.16s ease,
    transform 0.16s ease;
  pointer-events: auto;
}
.sidebar:hover .icon-button,
.sidebar-top:hover .icon-button,
.icon-button:focus-visible,
.icon-button:hover,
.topbar .icon-button {
  opacity: 1;
  transform: none;
}
.sidebar-collapse-button {
  font-size: calc(var(--toggle-size) - 8px);
  color: rgba(36, 95, 91, 0.6);
}
.icon-button:hover {
  background: rgba(255,255,255, 0.4);
}
.workspace-shell {
  min-width: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 10px;
}
.topbar {
  position: sticky;
  top: 10px;
  z-index: 20;
  display: none;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 14px;
  background: rgba(255, 255, 255, 0.52);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow: var(--shadow-sm);
  border-radius: 20px;
}
.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.topbar-title-wrap {
  display: grid;
  gap: 2px;
}
.topbar-overline {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-soft);
}
.topbar-title {
  font-size: 0.94rem;
}
.topbar .icon-button {
  background: white;
  color: var(--ink);
  border: 1px solid rgba(137, 156, 177, 0.18);
  box-shadow: var(--shadow-sm);
  width: 28px;
  height: 28px;
  border-radius: 8px;
  opacity: 0;
}
.topbar .icon-button:hover {
  background: white;
  color: var(--accent-strong);
  border-color: rgba(42, 114, 108, 0.18);
}
.topbar-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(42, 114, 108, 0.06);
  color: var(--accent-strong);
  font-size: 0.66rem;
  font-weight: 700;
}
main {
  padding: 4px 2px 0;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}
.page-header h1 {
  margin: 0;
  font-size: 1.8rem;
  line-height: 1.05;
}
.page-header .subtitle {
  color: var(--ink-soft);
  font-size: 0.92rem;
  margin-top: 4px;
}
.card {
  background: var(--card);
  border: 1px solid rgba(255, 255, 255, 0.48);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(12px);
}
.card h2 {
  margin: 0 0 14px;
  font-size: 1.08rem;
}
.grid {
  display: grid;
  gap: 18px;
}
.grid-2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.grid-3 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.grid-4 { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
form { display: grid; gap: 10px; }
.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
  overflow: hidden;
}
th {
  text-align: left;
  padding: 10px 12px;
  background: rgba(248, 250, 252, 0.9);
  border-bottom: 2px solid rgba(226, 232, 240, 0.88);
  font-weight: 800;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}
td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.85);
  vertical-align: top;
}
tr:hover td {
  background: rgba(248, 250, 252, 0.94);
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.3);
}
.badge-success { background: #dcfce7; color: #166534; }
.badge-warning { background: #fff7ed; color: #9a3412; }
.badge-danger { background: #fee2e2; color: #991b1b; }
.badge-info { background: #dbeafe; color: #1e40af; }
.badge-neutral { background: #f1f5f9; color: #475569; }
.alert {
  padding: 12px 14px;
  border-radius: var(--radius);
  font-size: 0.86rem;
  margin-bottom: 14px;
  box-shadow: var(--shadow-sm);
}
.alert-error { background: #fee2e2; color: #991b1b; border-left: 3px solid var(--danger); }
.alert-success { background: #dcfce7; color: #166534; border-left: 3px solid var(--success); }
.alert-info { background: #dbeafe; color: #1e40af; border-left: 3px solid var(--info); }
pre {
  overflow: auto;
  padding: 14px;
  border-radius: var(--radius);
  background: #0f172a;
  color: #dbeafe;
  font-size: 0.8rem;
  max-height: 280px;
}
.empty {
  text-align: center;
  padding: 30px;
  color: var(--ink-soft);
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.kpi {
  background: linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248,250,252,0.92) 100%);
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 18px;
  padding: 15px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}
.kpi .value {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--accent);
}
.kpi .label {
  font-size: 0.68rem;
  color: var(--ink-soft);
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.timeline {
  border-left: 2px solid rgba(148, 163, 184, 0.22);
  margin-left: 14px;
  padding-left: 18px;
}
.timeline-item {
  position: relative;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.88);
}
.timeline-item::before {
  content: '';
  position: absolute;
  left: -24px;
  top: 5px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid white;
}
.timeline-item .time {
  font-size: 0.7rem;
  color: var(--ink-soft);
}
.timeline-item .type {
  font-weight: 700;
  font-size: 0.8rem;
  margin: 3px 0;
}
.timeline-item .detail {
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.hidden { display: none !important; }
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36px;
  color: var(--ink-soft);
}
.loading::after {
  content: '';
  width: 18px;
  height: 18px;
  border: 2px solid rgba(148, 163, 184, 0.28);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-left: 7px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.search-bar input {
  flex: 1;
  border-radius: 999px;
}
.status-bar {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 4px 3px;
  color: var(--ink-soft);
  font-size: 0.7rem;
}
.app-shell[data-sidebar-state='collapsed'] .sidebar {
  padding-inline: 6px;
}
.app-shell[data-sidebar-state='collapsed'] .sidebar-top {
  justify-content: center;
}
.app-shell[data-sidebar-state='collapsed'] .sidebar-footer,
.app-shell[data-sidebar-state='collapsed'] .sidebar-group-kicker,
.app-shell[data-sidebar-state='collapsed'] .sidebar-group-label,
.app-shell[data-sidebar-state='collapsed'] .sidebar-link-label {
  display: none;
}
.app-shell[data-sidebar-state='collapsed'] .sidebar-group-toggle,
.app-shell[data-sidebar-state='collapsed'] .sidebar-link {
  justify-content: center;
  padding-inline: 5px;
}
.app-shell[data-sidebar-state='collapsed'] .sidebar-group[open] .sidebar-group-links {
  display: none;
}
.app-shell[data-sidebar-state='collapsed'] .sidebar-group-chevron {
  display: none;
}

@media (max-width: 1024px) {
  .app-shell {
    grid-template-columns: var(--sidebar-tablet-width) minmax(0, 1fr);
    padding: 8px;
  }
  .app-shell[data-sidebar-state='collapsed'] {
    grid-template-columns: var(--sidebar-collapsed-width) minmax(0, 1fr);
  }
  .sidebar {
    width: var(--sidebar-tablet-width);
  }
}

@media (max-width: 640px) {
  .topbar {
    display: flex;
    padding: 10px 12px;
    border-radius: 14px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .topbar .icon-button {
    width: 32px;
    height: 32px;
    opacity: 1;
  }
  .topbar-title {
    font-size: 0.88rem;
  }
  .topbar-overline {
    font-size: 0.56rem;
    letter-spacing: 0.1em;
  }
  .topbar-chip {
    display: none;
  }
  .mobile-top-nav {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    -webkit-overflow-scrolling: touch;
    flex: 1 0 100%;
    order: 3;
    padding-top: 4px;
  }
  .mobile-top-nav::-webkit-scrollbar {
    height: 3px;
  }
  .mobile-top-nav::-webkit-scrollbar-track {
    background: transparent;
  }
  .mobile-top-nav::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
  }
  .mobile-top-nav:hover::-webkit-scrollbar-thumb,
  .mobile-top-nav:focus-within::-webkit-scrollbar-thumb {
    background: rgba(107, 126, 147, 0.12);
  }
  .mobile-top-nav:hover,
  .mobile-top-nav:focus-within {
    scrollbar-color: rgba(107, 126, 147, 0.12) transparent;
  }
  .mobile-nav-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 8px;
    background: rgba(42, 114, 108, 0.06);
    color: var(--accent-strong);
    text-decoration: none;
    font-size: 0.66rem;
    font-weight: 600;
    white-space: nowrap;
    transition: background 0.18s ease, color 0.18s ease;
  }
  .mobile-nav-link:hover {
    background: rgba(42, 114, 108, 0.12);
    color: var(--accent-strong);
  }
  .mobile-nav-link.active {
    background: linear-gradient(135deg, rgba(42, 114, 108, 0.82), rgba(55, 126, 119, 0.78));
    color: white;
  }
  .mobile-nav-icon {
    font-size: 0.58rem;
  }
  .mobile-nav-label {
    font-size: 0.66rem;
  }
  .app-shell {
    grid-template-columns: minmax(0, 1fr);
    padding: 6px;
  }
  .app-shell[data-sidebar-state='expanded'] {
    grid-template-columns: minmax(0, 1fr);
  }
  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 45;
    border: 0;
    background: rgba(22, 48, 66, 0.22);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-normal);
  }
  body.sidebar-open .sidebar-overlay {
    opacity: 1;
    pointer-events: auto;
  }
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: var(--sidebar-mobile-width);
    max-width: 85vw;
    height: 100vh;
    border-radius: 0 var(--sidebar-radius) var(--sidebar-radius) 0;
    z-index: 50;
    transform: translateX(calc(-1 * var(--sidebar-mobile-width)));
    transition: transform var(--transition-normal);
  }
  body.sidebar-open .sidebar {
    transform: translateX(0);
  }
  .sidebar-top {
    top: var(--sidebar-padding);
    right: var(--sidebar-padding);
  }
  .workspace-shell {
    min-height: 100vh;
  }
  .app-shell[data-sidebar-state='collapsed'] .sidebar-footer,
  .app-shell[data-sidebar-state='collapsed'] .sidebar-group-kicker,
  .app-shell[data-sidebar-state='collapsed'] .sidebar-group-label,
  .app-shell[data-sidebar-state='collapsed'] .sidebar-link-label {
    display: revert;
  }
  .app-shell[data-sidebar-state='collapsed'] .sidebar-group[open] .sidebar-group-links {
    display: grid;
  }
  .app-shell[data-sidebar-state='collapsed'] .sidebar-group-chevron {
    display: inline-flex;
  }
  .app-shell[data-sidebar-state='collapsed'] .sidebar-group-toggle,
  .app-shell[data-sidebar-state='collapsed'] .sidebar-link {
    justify-content: flex-start;
    padding-inline: 6px;
  }
  main {
    padding: 3px 0 0;
  }
  .grid-2, .grid-3, .grid-4, .kpi-grid {
    grid-template-columns: 1fr;
  }
  .search-bar,
  .btn-row,
  .topbar,
  .topbar-left,
  .topbar-right,
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  .status-bar {
    padding: 0 3px 6px;
    flex-direction: column;
  }
  .topbar {
    padding: 12px 14px;
  }
  .topbar-title {
    font-size: 1rem;
  }
}
`;
