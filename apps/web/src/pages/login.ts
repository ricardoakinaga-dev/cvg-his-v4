export function renderLogin(): string {
  return `
<div style="display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 120px);">
  <div class="card" style="width:100%;max-width:400px;">
    <h2 style="text-align:center;margin-bottom:24px;">Entrar</h2>
    <div id="login-error" class="alert-error hidden"></div>
    <form id="login-form" style="display:grid;gap:16px;">
      <label>
        Usuario
        <input id="login-username" name="username" value="admin" autocomplete="username" />
      </label>
      <label>
        Senha
        <input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="Senha" />
      </label>
      <button type="submit" id="login-submit">Entrar</button>
    </form>
  </div>
</div>
<script>
  (function () {
    var form = document.getElementById('login-form');
    var errorEl = document.getElementById('login-error');
    var submitBtn = document.getElementById('login-submit');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      errorEl.classList.add('hidden');
      errorEl.textContent = '';
      submitBtn.disabled = true;

      var username = document.getElementById('login-username').value;
      var password = document.getElementById('login-password').value;

      try {
        var result = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: username, password: password }),
        });

        if (result.ok && result.body && result.body.accessToken) {
          setTokens(result.body.accessToken, result.body.refreshToken);
          var next = new URLSearchParams(window.location.search).get('next');
          window.location.assign(next || '/');
        } else {
          var msg = (result.body && (result.body.message || result.body.error)) || 'Credenciais invalidas.';
          errorEl.textContent = msg;
          errorEl.classList.remove('hidden');
        }
      } catch (err) {
        errorEl.textContent = 'Erro de conexao. Tente novamente.';
        errorEl.classList.remove('hidden');
      } finally {
        submitBtn.disabled = false;
      }
    });
  })();
</script>`;
}
