export function renderLayout(
  body: string,
  options: {
    title: string;
    activeNav: string;
    config: { appName: string; apiBaseUrl: string };
    userName?: string;
    userRole?: string;
  }
): string {
  const { title, activeNav, config, userName, userRole } = options;

  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/owners', label: 'Tutores' },
    { path: '/patients', label: 'Pacientes' },
    { path: '/encounters', label: 'Atendimentos' },
    { path: '/medical-records', label: 'Prontuario' }
  ];

  const navHtml = navLinks
    .map(
      (l) => `<a href="${l.path}" class="${activeNav === l.path ? 'active' : ''}">${l.label}</a>`
    )
    .join('\n');

  const userInfo = userName
    ? `<div class="user-info"><span>${userName}</span>${userRole ? `<span class="role">${userRole}</span>` : ''}<button class="small secondary" id="nav-logout">Sair</button></div>`
    : `<a href="/login" class="${activeNav === '/login' ? 'active' : ''}">Entrar</a>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — CVG-HIS V2</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏥</text></svg>">
  <style>
    {{STYLES}}
  </style>
</head>
<body>
  <nav>
    <span class="brand">CVG-HIS V2</span>
    ${navHtml}
    <span class="spacer"></span>
    ${userInfo}
  </nav>
  <main>
    ${body}
  </main>
  <div class="status-bar">
    <span>${config.appName} — ${config.apiBaseUrl}</span>
    <span id="status-time"></span>
  </div>
  <script>
    {{CLIENT_API}}
    {{CLIENT_NAV}}
    ${getClientScript(activeNav)}
  </script>
</body>
</html>`;
}

function getClientScript(_activeNav: string): string {
  return `
    document.getElementById('status-time').textContent = new Date().toLocaleTimeString('pt-BR');
    setInterval(() => {
      document.getElementById('status-time').textContent = new Date().toLocaleTimeString('pt-BR');
    }, 1000);

    const logoutBtn = document.getElementById('nav-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        const rt = getRefreshToken();
        await apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify(rt ? { refreshToken: rt } : {}) });
        clearTokens();
        window.location.assign('/login');
      });
    }
  `;
}
