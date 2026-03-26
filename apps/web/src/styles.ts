export const baseStyles = `
:root {
  color-scheme: light;
  --bg: #f7f6f2;
  --ink: #1f2a37;
  --accent: #1f6f78;
  --accent-light: rgba(31, 111, 120, 0.12);
  --card: #ffffff;
  --line: #d6d3d1;
  --success: #2E7D32;
  --warning: #E65100;
  --danger: #C62828;
  --info: #1565C0;
  --text-secondary: #475569;
  --radius: 12px;
  --radius-lg: 20px;
}
body {
  margin: 0;
  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  background: linear-gradient(180deg, #f7f6f2 0%, #eef4f4 100%);
  color: var(--ink);
  min-height: 100vh;
}
* { box-sizing: border-box; }
nav {
  background: var(--card);
  border-bottom: 1px solid var(--line);
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 56px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
nav .brand {
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--accent);
  margin-right: 24px;
  white-space: nowrap;
}
nav a {
  padding: 8px 14px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--ink);
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.15s;
  white-space: nowrap;
}
nav a:hover { background: var(--accent-light); }
nav a.active {
  background: var(--accent);
  color: white;
}
nav .spacer { flex: 1; }
nav .user-info {
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}
nav .user-info .role {
  background: var(--accent-light);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}
.page-header h1 {
  margin: 0;
  font-size: 1.6rem;
}
.page-header .subtitle {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 4px;
}
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: 0 4px 16px rgba(31, 42, 55, 0.06);
}
.card h2 {
  margin: 0 0 16px;
  font-size: 1.15rem;
}
.grid {
  display: grid;
  gap: 20px;
}
.grid-2 { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.grid-3 { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.grid-4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
form { display: grid; gap: 12px; }
label {
  display: grid;
  gap: 4px;
  font-weight: 600;
  font-size: 0.85rem;
}
input, select, textarea {
  border: 1px solid #cbd5e1;
  border-radius: var(--radius);
  padding: 10px 12px;
  font: inherit;
  font-size: 0.9rem;
  transition: border-color 0.15s;
}
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}
textarea { resize: vertical; min-height: 80px; }
button {
  border: 0;
  border-radius: 999px;
  padding: 10px 18px;
  background: var(--accent);
  color: white;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
button:hover { background: #175a61; }
button:active { transform: scale(0.98); }
button.secondary {
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
}
button.secondary:hover { background: var(--accent-light); }
button.danger { background: var(--danger); }
button.danger:hover { background: #a31f1f; }
button.small {
  padding: 6px 12px;
  font-size: 0.8rem;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
th {
  text-align: left;
  padding: 10px 12px;
  background: #f8fafc;
  border-bottom: 2px solid var(--line);
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-secondary);
}
td {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
}
tr:hover td { background: #f8fafc; }
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-success { background: #dcfce7; color: #166534; }
.badge-warning { background: #fff7ed; color: #9a3412; }
.badge-danger { background: #fee2e2; color: #991b1b; }
.badge-info { background: #dbeafe; color: #1e40af; }
.badge-neutral { background: #f1f5f9; color: #475569; }
.alert {
  padding: 12px 16px;
  border-radius: var(--radius);
  font-size: 0.9rem;
  margin-bottom: 16px;
}
.alert-error { background: #fee2e2; color: #991b1b; border-left: 3px solid var(--danger); }
.alert-success { background: #dcfce7; color: #166534; border-left: 3px solid var(--success); }
.alert-info { background: #dbeafe; color: #1e40af; border-left: 3px solid var(--info); }
pre {
  overflow: auto;
  padding: 16px;
  border-radius: var(--radius);
  background: #0f172a;
  color: #dbeafe;
  font-size: 0.85rem;
  max-height: 300px;
}
.empty {
  text-align: center;
  padding: 32px;
  color: var(--text-secondary);
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.kpi {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
  text-align: center;
}
.kpi .value {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--accent);
}
.kpi .label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.timeline {
  border-left: 2px solid var(--line);
  margin-left: 16px;
  padding-left: 20px;
}
.timeline-item {
  position: relative;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}
.timeline-item::before {
  content: '';
  position: absolute;
  left: -26px;
  top: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--card);
}
.timeline-item .time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
.timeline-item .type {
  font-weight: 600;
  font-size: 0.85rem;
  margin: 4px 0;
}
.timeline-item .detail {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.hidden { display: none !important; }
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-secondary);
}
.loading::after {
  content: '';
  width: 20px;
  height: 20px;
  border: 2px solid var(--line);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-left: 8px;
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
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--card);
  border-top: 1px solid var(--line);
  padding: 8px 24px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: flex;
  justify-content: space-between;
  z-index: 100;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.modal {
  background: var(--card);
  border-radius: var(--radius-lg);
  padding: 24px;
  min-width: 400px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.modal h2 { margin-top: 0; }
.tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--line);
  margin-bottom: 20px;
}
.tab-bar button {
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  padding: 10px 20px;
  font-weight: 600;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}
.tab-bar button.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.tab-bar button:hover {
  background: var(--accent-light);
}
@media (max-width: 768px) {
  nav { padding: 0 12px; gap: 4px; overflow-x: auto; }
  nav a { padding: 6px 10px; font-size: 0.8rem; }
  main { padding: 16px; }
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
}
`;
