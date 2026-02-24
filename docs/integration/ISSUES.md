# Integration Issues (Diagnosis)

## 1.1 Endpoints chamados no web que NÃO existem na API (404)

Após cruzar `docs/integration/CALLS_WEB.md` com `docs/integration/ROUTES_API.md`, não há chamadas web para paths inexistentes no `his-api`.

Observação crítica: existe quebra no proxy antes de chegar no `his-api` para auth (ver P0-1).

## 1.2 Endpoints da API que o web não usa (backlog / risco de drift)

Endpoints atualmente não consumidos pelo `his-web` (amostra mais relevante):

- `POST /alerts/:alertId/acknowledge` (`apps/his-api/src/modules/alerts/routes.ts:81`)
- `POST /alerts/:alertId/resolve` (`apps/his-api/src/modules/alerts/routes.ts:108`)
- `POST /alerts/batch/acknowledge` (`apps/his-api/src/modules/alerts/routes.ts:135`)
- `POST /alerts/batch/resolve` (`apps/his-api/src/modules/alerts/routes.ts:161`)
- `POST /alerts/scan` (`apps/his-api/src/modules/alerts/routes.ts:55`)
- `POST /encounters/:id/close` (`apps/his-api/src/modules/encounters/routes.ts:79`)
- `GET /documents/:id` (`apps/his-api/src/modules/documents/routes.ts:60`)
- `GET /patient-context/*` (`apps/his-api/src/modules/patientContext/routes.ts:19`, `:45`, `:71`, `:97`)
- `GET/POST/PATCH /protocol-versions*` e `POST /protocol-versions/:versionId/publish` (`apps/his-api/src/modules/protocolVersions/routes.ts:32`, `:50`, `:69`, `:87`; `apps/his-api/src/modules/protocolPublish/routes.ts:23`)
- `GET/POST/DELETE /protocols/:id/references*` (`apps/his-api/src/modules/protocolReferences/routes.ts:52`, `:73`, `:99`, `:128`)
- `GET /rbac/catalog` (`apps/his-api/src/modules/rbac/routes.ts:32`)
- `POST /system/ping-job` (`apps/his-api/src/modules/system/routes.ts:49`)
- `POST/PATCH /wards*` (`apps/his-api/src/modules/wards/routes.ts:31`, `:44`)
- `GET /build` (`apps/his-api/src/modules/build/routes.ts:7`)

## 1.3 Erros de rede prováveis

### P0-1: Login quebra no proxy (`/auth` bloqueado)

- Frontend chama `POST /api/proxy/auth/login` (`apps/his-web/src/lib/auth.ts:121`) e `POST /api/proxy/auth/dev-login` (`apps/his-web/src/lib/auth.ts:198`).
- Proxy allowlist não inclui prefixo `/auth` (`apps/his-web/src/app/api/proxy/[...path]/route.ts:10`).
- Resultado: `PROXY_PATH_BLOCKED` (403) no login, aparentando “travado na tela de login”.

### P1-1: Docs de deploy indicam env legado para web

- Checklist atual usa `NEXT_PUBLIC_API_URL` (`docs/EASYPANEL_CHECKLIST.md:68`).
- Código requer `NEXT_PUBLIC_HIS_API_BASE_URL` (`apps/his-web/src/lib/publicEnv.ts:18`, `:75`).
- Risco: deploy com env incorreta, base URL inesperada e falha de integração.

### P1-2: Falha hard em produção sem `HIS_API_INTERNAL_URL`

- Proxy exige `HIS_API_INTERNAL_URL` em produção (`apps/his-web/src/lib/publicEnv.ts:114`).
- Sem essa variável, requests de proxy não sobem corretamente.

### P2-1: Cobertura parcial de caminhos no proxy

- Proxy bloqueia qualquer path fora de `ALLOWED_PATH_PREFIXES` (`apps/his-web/src/app/api/proxy/[...path]/route.ts:152`).
- Isso é desejável para segurança, mas requer manutenção rigorosa ao adicionar módulos (drift operacional).

## 1.4 Drift de contrato (request/response)

### P1-3: `packages/contracts` diverge dos summaries reais

- `ownerSummaryResponseSchema` espera `{ owner, patients, stats }` (`packages/contracts/src/owners.ts:131`).
- API retorna `{ owner, auditTrail, encounters, documents }` (`apps/his-api/src/modules/owners/summary.ts:17`, `:89`).
- `patientSummaryResponseSchema` espera `{ patient, owner, stats, recentEncounters }` (`packages/contracts/src/patients.ts:124`).
- API retorna `{ patient, auditTrail, encounters, documents }` (`apps/his-api/src/modules/patients/summary.ts:27`, `:110`).

### P1-4: `openapi-lite` (web local) diverge de endpoints reais

- Note create local exige `encounterId` no body (`apps/his-web/src/contracts/openapi-lite.ts:248`), backend usa param de rota (`apps/his-api/src/modules/clinicalNotes/routes.ts:22`, `:42`).
- BedMap local define shape/enum diferentes (`apps/his-web/src/contracts/openapi-lite.ts:276`, `:371`) do retorno real (`apps/his-api/src/modules/bedmap/service.ts:17`, `:88`).
- Medication route enum do frontend local é mais restrito (`apps/his-web/src/contracts/openapi-lite.ts:319`) que o domínio/backend (`packages/domain/src/medication.ts:45`).

### P2-2: Tipagem de listagem de encounters no web perde metadados

- Contrato compartilhado é paginado (`packages/contracts/src/encounters.ts:95`).
- `listEncounters` no web tipa só `{ data }` (`apps/his-web/src/lib/api.ts:852`).

## 1.5 Tenancy/Auth inconsistentes

### P1-5: Mensagens de erro de auth ainda citam headers client-controlled

- Exemplo: `Provide x-account-id header` (`apps/his-api/src/modules/documents/service.ts:62`) e `Provide x-user-id header` (`apps/his-api/src/modules/documents/service.ts:72`).
- Arquitetura atual deriva actor via JWT no request context (`apps/his-api/src/plugins/requestContext.ts:34`).
- Não é falha de segurança direta, mas gera operação/confusão em troubleshooting.

### P2-3: Login email/api-key usa actor fixo (tenant estático)

- `/auth/login` emite payload com `accountId` hardcoded (`apps/his-api/src/modules/auth/routes.ts:94`, `:108`).
- Para multi-tenant real, precisa derivar tenant/user da base.

## 1.6 Falta de seed/dados que deixa UI “vazia”

### P1-6: seed inicial não cria dados operacionais clínicos

- Seed atual cria conta/unidade/perfis/permissões/admin (`packages/db/src/seed.ts:90`, `:131`, `:179`).
- Não cria wards/beds/owners/patients/encounters.
- Impacto: telas como bedmap/MAR/cadastros ficam vazias em ambiente novo.

---

## Lista Priorizada (P0/P1/P2)

### P0

1. **Auth via proxy bloqueada por allowlist sem `/auth`**
   - Causa raiz: `ALLOWED_PATH_PREFIXES` incompleta no proxy.
   - Evidência: `apps/his-web/src/lib/auth.ts:121`, `apps/his-web/src/app/api/proxy/[...path]/route.ts:10`.
   - Correção: incluir `/auth` na allowlist do proxy (PR-1).

2. **MAR pode quebrar em runtime por shape errado de BedMap**
   - Causa raiz: `MarConsole` usa `data.wards.flatMap` mas API retorna `{ ward, beds }`.
   - Evidência: `apps/his-web/src/features/mar/MarConsole.tsx:49`, `apps/his-web/src/lib/api.ts:366`, `apps/his-api/src/modules/bedmap/service.ts:67`.
   - Correção: alinhar consumo para `data.beds` (PR-3).

### P1

3. **Drift de contratos de summary (owners/patients)**
   - Causa raiz: `packages/contracts` e respostas reais evoluíram em direções diferentes.
   - Evidência: `packages/contracts/src/owners.ts:131` vs `apps/his-api/src/modules/owners/summary.ts:89`; `packages/contracts/src/patients.ts:124` vs `apps/his-api/src/modules/patients/summary.ts:110`.
   - Correção: unificar schemas e contract tests (PR-2).

4. **Rotas de protocolos apontam para páginas inexistentes**
   - Causa raiz: navegação criada sem páginas `/protocols/new` e `/protocols/[id]`.
   - Evidência: `apps/his-web/src/app/protocols/page.tsx:93`, `apps/his-web/src/app/protocols/page.tsx:202`; apenas `apps/his-web/src/app/protocols/page.tsx` existe.
   - Correção: criar páginas mínimas ou ajustar navegação (PR-3).

5. **Env de deploy documentada de forma inconsistente**
   - Causa raiz: docs ainda orientam variável legada.
   - Evidência: `docs/EASYPANEL_CHECKLIST.md:68` vs `apps/his-web/src/lib/publicEnv.ts:18`.
   - Correção: atualizar checklist EasyPanel (PR-1/Deploy docs).

6. **Ambiente novo fica sem dados clínicos mínimos**
   - Causa raiz: seed sem wards/beds/patients/owners.
   - Evidência: `packages/db/src/seed.ts:90-230`.
   - Correção: seed opcional de demo operacional + runbook (PR-3/P4 docs).

### P2

7. **Endpoints de API sem consumidor web atual**
   - Causa raiz: backlog funcional/feature flag parcial.
   - Evidência: seção 1.2 + `docs/integration/ROUTES_API.md`.
   - Correção: priorização de roadmap ou remoção controlada.

8. **Tipagem de listEncounters incompleta no frontend**
   - Causa raiz: tipo local reduzido.
   - Evidência: `packages/contracts/src/encounters.ts:95` vs `apps/his-web/src/lib/api.ts:852`.
   - Correção: alinhar tipo ao contrato paginado (PR-2).

---

## Status Após PR-0..PR-4

- `P0-1` Auth bloqueada por proxy allowlist: **RESOLVIDO** (`apps/his-web/src/app/api/proxy/[...path]/route.ts:11`).
- `P0-2` MAR quebrando por shape de bedmap: **RESOLVIDO** (`apps/his-web/src/features/mar/MarConsole.tsx:49`).
- `P1-3` Drift summaries owners/patients: **RESOLVIDO** (`packages/contracts/src/owners.ts:150`, `packages/contracts/src/patients.ts:141`).
- `P1-4` Drift openapi-lite (notes/bedmap/med route enum): **RESOLVIDO** (`apps/his-web/src/contracts/openapi-lite.ts:256`, `:283`, `:323`).
- `P1-5` Mensagens referenciando headers client-controlled: **RESOLVIDO** (ex.: `apps/his-api/src/modules/documents/service.ts:62`).
- `P1-6` Rotas web de protocolos inexistentes: **RESOLVIDO** (`apps/his-web/src/app/protocols/new/page.tsx:1`, `apps/his-web/src/app/protocols/[id]/page.tsx:1`).
- Seed operacional mínima (dados clínicos para ambiente novo): **PENDENTE** (backlog operacional).
