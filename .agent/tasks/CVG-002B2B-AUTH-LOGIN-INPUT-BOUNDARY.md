# CVG-002B2B — bounded login input boundary

## Estado do contrato

- Status: `COMPLETE_BOUNDED`; estágio `CLOSE` / `T4_CRITICAL`.
- Pai: `CVG-002B2B`; prioridade `P0`; risco `HIGH`; blast radius `AUTH_BOUNDARY`.
- Owner: root integrator; TDD, segurança, regressão afetada e revisão independente obrigatórios.
- Autoridade: `.agent/authority.jsonl#AUTH-CVG-002B2B-AUTH-LOGIN-INPUT-BOUNDARY-IR-001`.
- Gate de implementação: `.agent/gates/implementation-ready-CVG-002B2B-auth-login-input-boundary.json`.

## Gap confirmado

O handler `POST /auth/login` lê o corpo como `LoginRequest` antes de verificar
que o JSON é um objeto. Um corpo `null` ou um primitivo pode causar acesso de
propriedade fora da validação de rota. Além disso, username e senha chegam ao
serviço sem limites de entrada alinhados ao schema e ao limite de senha do
setup; uma entrada muito longa pode alcançar o driver PostgreSQL ou o scrypt
antes de ser rejeitada.

## Contrato congelado

1. O login aceita somente um objeto JSON.
2. `username` e `password` são strings não vazias, com no máximo 128
   caracteres; `accountId`, quando presente, é string não vazia com no máximo
   255 caracteres.
3. A validação acontece depois do rate limit por IP/identidade e antes de
   `AuthService.login`, sem executar consulta, verificação de senha ou criar
   sessão para payload inválido.
4. O erro continua sendo o envelope HTTP sanitizado existente, sem ecoar
   username, senha, token, corpo ou segredo; campos extras permanecem
   ignorados para compatibilidade.
5. O contrato cobre somente `POST /auth/login`, seus helpers e testes. Não muda
   login MFA, refresh, sessão, WebAuthn, OIDC, rate-limit distribuído,
   providers, target, produção, deployment, release ou promoção global.

## TDD e evidência exigida

### RED

- `null`, array/primitivo e username/senha/accountId acima do limite devem
  retornar `400` sem chamar `auth.login`.
- O RED deve executar contra o handler atual antes da implementação e falhar
  pela ausência da validação de objeto/tamanho.

### GREEN

- Adicionar uma única normalização/validação de login na borda da rota.
- Preservar rate limit, tratamento de erro, cookie HttpOnly e resposta de
  sucesso existentes.

### VERIFY

- Reexecutar a suíte de rotas de autenticação e as suítes do módulo auth/API.
- Rodar typecheck/build, lint direcionado, secret scan, OpenAPI, diff hygiene e
  uma revisão independente compatível quando disponível.
- Manter explicitamente o ERP global `IN_PROGRESS/PARTIAL` e a promoção
  `BLOCKED`.

## Próxima ação

Fatia encerrada localmente como `PASS_BOUNDED`. O RED intencional confirmou
`25/26` antes da implementação; o GREEN e a suíte final de rota passaram
`27/27`. O comando oficial `pnpm --filter @cvg-his-v2/api test:auth-route`
compila e executa `dist/routes/auth-routes.test.js`; a suíte completa da API
passou `522/522`, o módulo auth `46/46`, o typecheck workspace e o build da
API passaram, e a auditoria de segurança não encontrou advisories high,
critical ou moderate.

A revisão independente final retornou `APPROVE_BOUNDED`, após ampliar os
casos de tipos/campos/limites, asserções de não exposição e a descoberta do
teste compilado. O lint completo ainda mantém somente os dois erros
preexistentes e não relacionados em `packages/contracts/src/counterSales.ts`.

Se o contrato precisar mudar para incluir login por email, MFA ou account UUID
estrito, parar e revalidar esta autoridade em vez de ampliar a fatia
silenciosamente. O ERP global permanece `IN_PROGRESS/PARTIAL` e a promoção
permanece `BLOCKED`.
