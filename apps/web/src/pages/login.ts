export function renderLogin(): string {
  return `
<div style="min-height:100vh;padding:32px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at top left, rgba(20,184,166,0.18), transparent 28%),radial-gradient(circle at bottom right, rgba(15,23,42,0.14), transparent 30%),linear-gradient(135deg,#f4f8fb 0%,#edf6f5 45%,#f8fbfd 100%);">
  <div style="width:min(1120px,100%);display:grid;grid-template-columns:minmax(0,1.15fr) minmax(360px,420px);border-radius:28px;overflow:hidden;background:rgba(255,255,255,0.76);border:1px solid rgba(148,163,184,0.20);box-shadow:0 32px 90px rgba(15,23,42,0.16);backdrop-filter:blur(16px);">
    <section style="position:relative;padding:56px;color:#e2f7f4;background:linear-gradient(160deg,rgba(15,23,42,0.96) 0%,rgba(15,118,110,0.96) 100%);">
      <div style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,0.10);color:#99f6e4;font-size:0.78rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Plataforma Enterprise</div>
      <h1 style="margin:22px 0 10px;font-size:clamp(2.4rem,5vw,4.3rem);line-height:0.94;letter-spacing:-0.05em;color:#fff;">CVG-<span style="display:block;color:#7dd3fc;">HIS</span></h1>
      <p style="margin:0;max-width:520px;color:rgba(226,247,244,0.88);font-size:1.04rem;line-height:1.7;">Um ambiente mais claro, moderno e confiável para conduzir a operação clínica, assistencial e administrativa do hospital veterinário.</p>
      <div style="margin-top:28px;display:grid;gap:10px;">
        <strong style="font-size:0.9rem;color:#99f6e4;text-transform:uppercase;letter-spacing:0.08em;">Institucional</strong>
        <div style="font-size:1.08rem;color:#fff;font-weight:600;">Centro Veterinário Guarapiranga</div>
      </div>
      <div style="margin-top:32px;display:grid;gap:14px;color:rgba(255,255,255,0.88);font-size:0.95rem;line-height:1.55;">
        <div>• Integra dados clínicos, atendimento e operação em uma única trilha canônica.</div>
        <div>• Organiza o acesso com mais previsibilidade para recepção, assistência e gestão.</div>
        <div>• Entrega uma base visual mais profissional para a transição definitiva ao V2.</div>
      </div>
    </section>
    <section style="padding:44px 40px;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(255,255,255,0.94) 0%,rgba(247,250,252,0.96) 100%);">
      <div style="width:100%;max-width:360px;">
        <h2 style="margin:0 0 8px;font-size:2rem;color:#0f172a;letter-spacing:-0.04em;">Acesse sua conta</h2>
        <p style="margin:0 0 24px;color:#475569;font-size:0.98rem;line-height:1.55;">Entre com suas credenciais para continuar no ambiente oficial do CVG-HIS V2.</p>
        <div id="login-error" class="hidden" style="margin-bottom:16px;padding:12px 14px;border-radius:14px;border:1px solid rgba(239,68,68,0.20);background:rgba(254,226,226,0.92);color:#b91c1c;font-size:0.92rem;line-height:1.45;"></div>
        <form id="login-form" style="display:grid;gap:16px;">
          <label style="display:grid;gap:8px;color:#0f172a;font-size:0.92rem;font-weight:700;">Usuario<input id="login-username" name="username" value="admin" autocomplete="username" style="height:52px;padding:0 16px;border-radius:16px;border:1px solid rgba(148,163,184,0.42);background:rgba(255,255,255,0.96);color:#0f172a;font-size:1rem;" /></label>
          <label style="display:grid;gap:8px;color:#0f172a;font-size:0.92rem;font-weight:700;">Senha<input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="Senha" style="height:52px;padding:0 16px;border-radius:16px;border:1px solid rgba(148,163,184,0.42);background:rgba(255,255,255,0.96);color:#0f172a;font-size:1rem;" /></label>
          <button type="submit" id="login-submit" style="height:54px;border:0;border-radius:16px;background:linear-gradient(135deg,#0f766e 0%,#155e75 100%);color:#fff;font-size:1rem;font-weight:800;letter-spacing:0.01em;box-shadow:0 18px 34px rgba(15,118,110,0.24);">Entrar na plataforma</button>
        </form>
      </div>
    </section>
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
          var target = next || '/';

          if (isLoggedIn()) {
            window.location.replace(target);
            return;
          }

          errorEl.textContent = 'Autenticacao recebida, mas a sessao local nao foi validada. Atualize a pagina e tente novamente.';
          errorEl.classList.remove('hidden');
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
