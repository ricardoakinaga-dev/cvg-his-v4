# CVG-002B2B — bounded MFA login input boundary

## Estado do contrato

- Status: `COMPLETE_BOUNDED`; estágio `CLOSE`; prioridade `P0`.
- Pai: `CVG-002B2B`; owner: root integrator with TDD and security review.
- Autoridade: `.agent/authority.jsonl#AUTH-CVG-002B2B-AUTH-MFA-LOGIN-INPUT-BOUNDARY-IR-001`.
- Gate de implementação: `.agent/gates/implementation-ready-CVG-002B2B-auth-mfa-login-input-boundary.json`.

## Gap confirmado

`POST /auth/login/mfa` lê `payload.userId` depois de fazer cast do JSON
arbitrário para um objeto tipado. Um corpo `null` causa acesso de propriedade
fora da validação de rota; arrays, primitivos e campos com tipos errados não
possuem uma fronteira HTTP explícita. O serviço valida strings quando chamado,
mas o route handler pode falhar antes dessa camada e a entrada de tamanho
ilimitado pode alcançar assinatura, repositório de challenge e TOTP.

## Contrato congelado

1. A rota aceita somente um objeto JSON com `userId`, `token` e `challengeId`
   como strings não vazias.
2. `userId` e `token` têm no máximo 128 caracteres; `challengeId` tem no máximo
   512 caracteres. Esses limites comportam os UUIDs, códigos TOTP/recovery e o
   challenge assinado atual sem alterar o protocolo.
3. A validação ocorre depois do rate limit por IP/identidade e antes de
   `AuthService.completeMfaLogin`. Para payload inválido, nenhum challenge,
   TOTP, sessão ou auditoria de autenticação é executado.
4. O rate limit recebe apenas um `userId` string normalizável; corpo, token e
   challenge nunca entram no bucket. A resposta inválida usa o envelope
   sanitizado existente e não ecoa token, challenge, corpo ou marcador secreto.
5. Campos extras continuam ignorados. O sucesso, cookie HttpOnly, MFA
   challenge, lockout e semântica de sessão permanecem inalterados.
6. O corte cobre somente `POST /auth/login/mfa`, seu helper de parsing e testes.
   Não altera TOTP, WebAuthn, enrollment, refresh, sessão, rate-limit backend,
   providers, target, produção, deployment, release ou promoção global.

## TDD e evidência exigida

### RED

- `null`, array/primitivo, campos ausentes/nulos/não-string, strings em branco
  e valores acima dos limites devem ser rejeitados sem chamar o serviço MFA.
- O RED deve reproduzir a falha de shape atual antes da implementação.

### GREEN

- Adicionar uma única validação local de payload e um tratamento de erro
  sanitizado para a rota, preservando a ordem do rate limit.
- Cobrir limites inclusivos, rate limit por identidade e não exposição de
  marcadores em resposta/log.
- Rodar suite compilada da rota, API/auth, build, typecheck, segurança, lint
  direcionado, OpenAPI/RLS/namespace e revisão independente compatível.

## Limitações e não-claims

Este slice prova apenas a entrada HTTP local do login MFA. Não fecha a matriz
completa de principal/login/cache/MFA, a política TOTP, enrollment, WebAuthn,
Redis distribuído, target RLS/roles, providers, parity, acessibilidade,
produção, deployment, remote CI, backup/restore, release ou ERP global.
O ERP permanece `IN_PROGRESS/PARTIAL` e a promoção permanece `BLOCKED`.

## Evidência esperada

- `.agent/verification.jsonl#VFY-SCOUT-CVG-002B2B-AUTH-MFA-LOGIN-INPUT-BOUNDARY-001`
- `.agent/verification.jsonl#VFY-CVG-002B2B-AUTH-MFA-LOGIN-INPUT-BOUNDARY-RED-001`
- `.agent/verification.jsonl#VFY-CVG-002B2B-AUTH-MFA-LOGIN-INPUT-BOUNDARY-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-002B2B-AUTH-MFA-LOGIN-INPUT-BOUNDARY-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-002B2B-AUTH-MFA-LOGIN-INPUT-BOUNDARY-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-002B2B-AUTH-MFA-LOGIN-INPUT-BOUNDARY-REVIEW-UNAVAILABLE-001`
- `.agent/verification.jsonl#VFY-CVG-002B2B-AUTH-MFA-LOGIN-INPUT-BOUNDARY-FINAL-001`
- `.agent/gates/verified-CVG-002B2B-auth-mfa-login-input-boundary.json`
- `.agent/artifacts/CVG-002B2B-auth-mfa-login-input-boundary-2026-08-30.md`
- `apps/api/src/routes/auth-routes.ts`
- `apps/api/src/routes/auth-routes.test.ts`
- `apps/api/package.json`

## Decisão de parada

Se a correção exigir mudança no protocolo do challenge, política de lockout,
TOTP, sessão, provider, target ou qualquer comportamento de produção, parar e
revalidar esta autoridade em vez de ampliar a fatia silenciosamente.

## Fechamento bounded — 2026-08-30

O slice foi implementado e fechado como `COMPLETE_BOUNDED` / `PASS_BOUNDED`.
Fonte e runner compilado passaram 30/30; a API completa passou 525/525; o
módulo de autenticação passou 46/46 com banco efêmero limpo; typecheck,
segurança enterprise, secretlint, OpenAPI, RLS, namespaces, ESLint
direcionado, Prettier e diff hygiene passaram. A cobertura V8 do arquivo de
rota foi 83,91% linhas, 70,76% branches e 88,24% funções.

O lint global continua com apenas o baseline não relacionado em
`packages/contracts/src/counterSales.ts:38,77`. A revisão adversarial local
não encontrou defeito adicional, mas a revisão independente de agente ficou
indisponível por incompatibilidade/limite da conta; isso está registrado como
`CONDITIONAL`, sem inferir `APPROVE_BOUNDED`. O ERP global continua
`IN_PROGRESS/PARTIAL` e a promoção continua `BLOCKED`.
