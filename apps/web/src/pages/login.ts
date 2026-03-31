export function renderLogin(): string {
  return `
<div class="login-wrapper">
  <div class="login-card">
    <h1>NexusVet HIS</h1>
    <p class="login-subtitle">Sistema de Informacao Hospitalar Veterinario</p>
    
    <div id="login-error" style="display:none;margin-bottom:16px;" class="alert alert-error"></div>
    
    <form id="login-form" style="display:grid;gap:16px;">
      <label>
        Usuario
        <input id="login-username" name="username" value="admin" autocomplete="username" placeholder="Digite seu usuario" />
      </label>
      <label>
        Senha
        <input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="Digite sua senha" />
      </label>
      <button type="submit" id="login-submit" style="height:48px;border-radius:var(--radius);font-size:1rem;">
        Entrar na plataforma
      </button>
    </form>
    
    <div style="margin-top:24px;text-align:center;">
      <span style="font-size:0.75rem;color:var(--ink-muted);">
        Centro Veterinario Guarapiranga — v2.0
      </span>
    </div>
  </div>
</div>
<script>
  (function () {
    var form = document.getElementById('login-form');
    var errorEl = document.getElementById('login-error');
    var submitBtn = document.getElementById('login-submit');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      errorEl.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Autenticando...';

      var username = document.getElementById('login-username').value;
      var password = document.getElementById('login-password').value;

      try {
        var resp = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username: username, password: password }) });
        
        if (resp && resp.ok && resp.body && resp.body.accessToken) {
          setTokens(resp.body.accessToken, resp.body.refreshToken);
          window.location.assign('/');
        } else {
          throw new Error(resp.body?.message || resp.body?.error || 'Credenciais invalidas');
        }
      } catch (err) {
        errorEl.textContent = err.message || 'Erro ao autenticar';
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar na plataforma';
      }
    });
  })();
</script>
`;
}
