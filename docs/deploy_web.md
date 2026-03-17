# Instruções de Deploy: apps/his-web (EasyPanel)

Este serviço foi convertido de Nixpacks para **Docker Nativo** para corrigir incompatibilidades com pnpm v10.

## 1. Configuração do Serviço (EasyPanel)

Acesse as configurações do serviço `cvg-his-web` e altere:

### Aba "Source"
*   **Build Type**: `Dockerfile` (NÃO use Nixpacks)
*   **Context**: `/` (Raiz do repositório)
    *   *Nota*: Se o EasyPanel reclamar, certifique-se de que o campo "Git Repository" aponta para a raiz.
*   **Dockerfile Path**: `apps/his-web/Dockerfile`

### Aba "Environment"
Adicione as seguintes variáveis de ambiente:

```env
NODE_ENV=production
PORT=80
NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy
HIS_API_BASE_URL=http://cvg-his-api:80
HIS_AUTH_COOKIE_DOMAIN=
HIS_AUTH_COOKIE_MAX_AGE_SECONDS=28800
```

### Aba "Build Variables" (ou Build Args)
Adicione:

```env
NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy
```

*Nota importante*: `NEXT_PUBLIC_HIS_API_BASE_URL` é variável **pública** e é embutida no bundle durante o `next build`.  
Se mudar esse valor, é obrigatório **rebuild/deploy** do `cvg-his-web` (restart simples não atualiza o cliente).

*Nota de arquitetura*: com `/api/proxy`, o navegador chama apenas o mesmo domínio do web; o proxy interno usa `HIS_API_BASE_URL` para alcançar o `his-api` pela rede interna.

*Nota de sessão HttpOnly*:
- O login grava o token em cookie `his_token` com `HttpOnly` no endpoint `POST /api/auth/session`.
- Em `NODE_ENV=production`, o cookie é enviado com `Secure`; sem HTTPS o navegador não persiste o cookie.
- Deixe `HIS_AUTH_COOKIE_DOMAIN` vazio para cookie host-only (mais seguro). Use domínio explícito apenas se precisar compartilhar sessão entre subdomínios.

## 2. Verificação de Sucesso

Após o deploy, verifique nos logs:
1.  O build deve mostrar passos do Docker (`FROM node:22-bookworm-slim`, `RUN pnpm install`, etc).
2.  **NÃO** deve aparecer menção a "Nixpacks".
3.  O container deve iniciar ouvindo na porta 80: `Listening on port 80`.

## 3. Checklist de Validação
- [ ] O `apps/his-web/Dockerfile` foi criado com sucesso? (Sim)
- [ ] O arquivo `next.config.js` tem `output: 'standalone'`? (Sim)
- [ ] O `.dockerignore` inclui `node_modules`? (Sim)
