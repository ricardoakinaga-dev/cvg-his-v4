# CVG-002B2B — MFA login input boundary — 2026-08-30

## Resultado

`POST /auth/login/mfa` está fechado como `COMPLETE_BOUNDED` / `PASS_BOUNDED`.
O resultado é limitado ao boundary HTTP local e mantém o ERP global
`IN_PROGRESS/PARTIAL`, com promoção `BLOCKED`. Não há aprovação independente
de reviewer representada: os agentes disponíveis foram incompatíveis ou
atingiram o limite da conta, e essa limitação permanece explícita no gate.

## Escopo implementado

- `apps/api/src/routes/auth-routes.ts` agora exige objeto JSON, valida
  `userId`, `token` e `challengeId` como strings não vazias e limita os campos a
  128, 128 e 512 caracteres.
- A validação ocorre depois dos buckets de rate limit por IP/identidade e
  antes de `AuthService.completeMfaLogin`.
- O rate limit recebe somente IP e `userId` normalizável; token, challenge e
  corpo não entram no bucket nem nos logs.
- O payload entregue ao serviço é uma nova projeção imutável; campos extras
  são ignorados. A resposta de erro usa o envelope sanitizado existente e não
  ecoa credenciais.
- Challenge, lockout, TOTP, sessão, cookie e enrollment não foram redesenhados.

## Evidência TDD e regressão

- RED intencional: 28/29 passaram e `null` reproduziu o `TypeError` por acesso
  a `payload.userId` antes da fronteira.
- GREEN fonte: `node --import tsx --test` passou 30/30, incluindo matriz de
  shape/tipo/branco/tamanho, limites inclusivos, ordem do rate limit e não
  exposição de token/challenge.
- Runner oficial compilado: `pnpm --filter @cvg-his-v2/api test:auth-route`
  passou 30/30 e compilou a API.
- Regressão completa da API: `pnpm --filter @cvg-his-v2/api test` passou
  525/525.
- Módulo de autenticação: `pnpm --filter @cvg-his-v2/module-auth test` passou
  46/46, com PostgreSQL efêmero removido.
- Cobertura V8 focal: 83,91% linhas, 70,76% branches e 88,24% funções no
  arquivo completo de rota; os caminhos novos do parser MFA são exercitados
  pela matriz dedicada.

## Qualidade e segurança

- `pnpm typecheck`: passou nos 70/71 projetos do workspace.
- Segurança enterprise e secretlint: sem vulnerabilidades/advisories
  críticos, altos ou moderados.
- OpenAPI: 354 paths, 40 tags, 413 schemas; RLS: 165/166 tabelas tenant com
  exceção documentada; namespace validator passou.
- ESLint direcionado, Prettier e `git diff --check`: passaram.
- O lint global continua falhando somente no baseline preexistente de
  `packages/contracts/src/counterSales.ts:38,77` (`no-control-regex`); nenhum
  erro foi introduzido nos arquivos MFA.

## Revisão e limitações

A revisão adversarial local confirmou: guard de objeto antes do acesso,
validação de tipos/tamanhos, normalização sem mutação, rate limit antes da
validação, ausência dos campos secretos em rate-limit/log/resposta, preservação
do caminho de sucesso e cobertura negativa/positiva.

Foi tentado um reviewer especializado, mas o modelo configurado foi rejeitado
pela conta. Um agente default permaneceu sem veredito após três janelas e foi
encerrado; a tentativa exploradora read-only atingiu o limite de uso do modelo.
Nenhuma dessas tentativas editou o repositório. Portanto, o gate registra
`VFY-...-REVIEW-UNAVAILABLE-001` como `CONDITIONAL`, sem inferir
`APPROVE_BOUNDED`.

Este artifact não certifica a matriz MFA completa, WebAuthn, enrollment,
Redis/distribuição, providers, target/RLS operacional, produção, deployment,
backup/restore, acessibilidade, LGPD, parity, release ou prontidão global do
ERP.

## Checkpoint de commit

O slice foi commitado localmente como `233d3ed9 fix: enforce MFA login input
boundary`. Após o commit, não há arquivos staged; o único caminho dirty é o
`packages/design-system/tsconfig.vue.tsbuildinfo` pré-existente e fora do
escopo. Não houve push, deploy, operação em target ou promoção.
