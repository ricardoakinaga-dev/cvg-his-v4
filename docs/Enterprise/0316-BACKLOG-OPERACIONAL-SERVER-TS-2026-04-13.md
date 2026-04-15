# 0316 - Backlog Operacional de Reducao de `server.ts`

**Status:** vivo  
**Data de validacao:** 2026-04-13  
**Escopo:** transformar o gap residual de `apps/api/src/server.ts` em execucao operacional por ondas  
**Relacionamento:** `IMP-003` em `0193`, Sprint 8 em `0194`, plano de acao `0300`, auditoria `0301`, alinhamento `0315`

---

## 1. Leitura objetiva do gap

Baseline operacional observado no repositorio:

- `apps/api/src/server.ts`: `5407` linhas no working tree atual;
- baseline documental mais recente: `5270` linhas em `0315`;
- `apps/api/src/bootstrap.ts`: `780` linhas;
- `apps/api/src/runtime.ts`: `601` linhas;
- `apps/api/src/server.test.ts`: `1757` linhas.

Leitura tecnica:

- o risco nao e apenas tamanho;
- `server.ts` concentra pipeline HTTP, composicao de runtime, auth, tenant context, tracing, helpers e varios dominios ainda inline;
- a extracao ja comecou em `routes/payments-routes.ts`, `routes/webhooks-routes.ts`, `routes/prescription-routes.ts`, `routes/laboratory-routes.ts`, `routes/scheduling-routes.ts` e `routes/soc2-routes.ts`;
- a proxima fase precisa atacar primeiro bootstraps e pipeline compartilhado, senao a extracao de dominios vira apenas redistribuicao de acoplamento.

---

## 2. Objetivo executivo

Desmontar `server.ts` em ondas pequenas, integraveis e testaveis, reduzindo o acoplamento estrutural sem quebrar contrato HTTP nem regredir gates.

Metas:

- Marco M1: `server.ts` abaixo de `4000` linhas;
- Marco M2: `server.ts` abaixo de `2500` linhas;
- Marco M3: nenhum dominio novo entra diretamente em `server.ts`;
- Marco M4: pipeline HTTP e bootstrap residual passam a morar fora de `server.ts`.

---

## 3. Regras operacionais

- PR pequeno e integravel; evitar refactor de tudo ao mesmo tempo;
- cada PR precisa reduzir responsabilidade real, nao apenas mover linhas;
- cada extracao precisa nascer com teste dedicado do modulo extraido;
- `server.test.ts` deve perder peso conforme os modulos ganham testes proprios;
- nenhum PR de feature pode acrescentar nova rota inline em `server.ts`;
- toda onda precisa fechar com evidencia em codigo, testes e documento.

---

## 4. Epicos

| Epico | Nome | Objetivo | Status |
|------|------|----------|--------|
| EP-01 | Pipeline HTTP | tirar de `server.ts` middleware, tracing, CORS, security headers, tenant resolution e roteamento operacional | TODO |
| EP-02 | Auth e Security Bootstrap | extrair rate limiter, OIDC, WebAuthn, MFA helpers e auth wiring | TODO |
| EP-03 | Dominios Clinicos | extrair blocos grandes clinicos ainda inline | TODO |
| EP-04 | Cadastro e Governanca | extrair owners, patients, users, staff, access-control, audit e api-keys | TODO |
| EP-05 | Financeiro e Operacional | extrair billing, inventory, quotes, products, services, internal events e residuos de webhooks | TODO |
| EP-06 | Bootstrap e Runtime | quebrar `bootstrap.ts` e `runtime.ts` em factories menores por responsabilidade | TODO |
| EP-07 | Testes e Evidencia | migrar cobertura do monolito para suites por modulo e registrar o fechamento por onda | TODO |

---

## 5. Ondas de execucao

### Onda 1 - Guardrails e pipeline

**Objetivo:** parar de usar `server.ts` como lugar de infraestrutura transversal.

**Status em `2026-04-13`:**

- `PR-01` concluido com inventario inicial em `0317-INVENTARIO-HOTSPOTS-SERVER-TS-2026-04-13.md`;
- `PR-02` concluido com extracao de middleware HTTP compartilhado;
- `server.ts` caiu de `5411` para `5077` linhas nesta execucao;
- validacoes executadas para `PR-02`: `pnpm --filter @cvg-his-v2/api typecheck`, `build` e `test`;
- `PR-03` e `PR-04` permanecem `TODO`.

**PRs planejados**

| PR | Escopo | Arquivos alvo | Saida esperada |
|----|--------|---------------|----------------|
| PR-01 | inventario de rotas e hotspots | `apps/api/src/server.ts`, `apps/api/src/server.test.ts`, `docs/Enterprise/0316-*` | mapa objetivo dos blocos ainda inline e baseline de linhas |
| PR-02 | extracao de middleware HTTP compartilhado | `apps/api/src/server.ts`, novo `apps/api/src/http/*` | CORS, security headers, response defaults e helpers de request fora de `server.ts` |
| PR-03 | extracao de operacionais publicos | `apps/api/src/server.ts`, novo `apps/api/src/routes/operational-routes.ts` | `health`, `live`, `ready`, `metrics`, docs/OpenAPI em fluxo unico sem duplicacao |
| PR-04 | extracao de tenant/tracing request pipeline | `apps/api/src/server.ts`, novo `apps/api/src/http/request-pipeline.ts` | resolucao de tenant, trace context e envelope principal fora do arquivo central |

**Criterio de aceite da onda**

- nao existe duplicacao de `health`/`metrics`/`openapi` em dois pontos do pipeline;
- `server.ts` passa a orquestrar chamadas em vez de concentrar implementacao de middleware;
- `server.ts` cai para algo proximo de `4500` linhas ou menos;
- testes de smoke da API continuam verdes.

### Onda 2 - Auth, MFA e bootstrap de seguranca

**Objetivo:** remover o bloco mais sensivel e transversal do arquivo.

**PRs planejados**

| PR | Escopo | Arquivos alvo | Saida esperada |
|----|--------|---------------|----------------|
| PR-05 | extracao do auth rate limiter bootstrap | `apps/api/src/server.ts`, novo `apps/api/src/bootstrap/auth-rate-limiter.ts` | configuracao de limiter fora do composition root HTTP |
| PR-06 | extracao de helpers de autenticacao/autorizacao | `apps/api/src/server.ts`, `apps/api/src/helpers/auth-helpers.ts` | `requirePrincipal`, `requireApiKey`, sanitizacao e contratos comuns reutilizaveis |
| PR-07 | extracao de OIDC e WebAuthn routes | `apps/api/src/server.ts`, novos `apps/api/src/routes/oidc-routes.ts`, `apps/api/src/routes/webauthn-routes.ts` | blocos grandes de auth avancado fora do monolito |
| PR-08 | extracao de MFA/LGPD bootstrap relacionado | `apps/api/src/server.ts`, novos `apps/api/src/routes/mfa-routes.ts`, `apps/api/src/routes/lgpd-routes.ts` | MFA e LGPD fora do arquivo central com dependencias explicitas |

**Criterio de aceite da onda**

- todo o bloco de auth avancado deixa de ficar inline em `server.ts`;
- rate limiter deixa de ser construindo dentro do fluxo principal de request;
- `server.ts` fica abaixo de `4000` linhas;
- suites de auth/MFA/LGPD passam de `server.test.ts` para testes dedicados.

### Onda 3 - Dominios clinicos pesados

**Objetivo:** desmontar os maiores blocos de negocio que ainda travam manutencao.

**PRs planejados**

| PR | Escopo | Arquivos alvo | Saida esperada |
|----|--------|---------------|----------------|
| PR-09 | extracao de medical-records | `apps/api/src/server.ts`, novo `apps/api/src/routes/medical-records-routes.ts` | CRUD, revisions e timeline fora do monolito |
| PR-10 | extracao de attachments e notifications | `apps/api/src/server.ts`, novos `apps/api/src/routes/attachments-routes.ts`, `apps/api/src/routes/notifications-routes.ts` | handlers independentes com auditoria explicita |
| PR-11 | extracao de encounters | `apps/api/src/server.ts`, novo `apps/api/src/routes/encounters-routes.ts` | open, read, transition, close e timeline fora do arquivo central |
| PR-12 | extracao de triage e inpatient | `apps/api/src/server.ts`, novos `apps/api/src/routes/triage-routes.ts`, `apps/api/src/routes/inpatient-routes.ts` | fluxos clinicos centrais separados e testados |

**Criterio de aceite da onda**

- dominios clinicos principais deixam de ficar inline em `server.ts`;
- cada dominio extraido possui suite propria;
- `server.ts` cai para algo proximo de `3000` linhas ou menos;
- nao ha regressao em fluxos de encounter, triage, prontuario e anexos.

### Onda 4 - Cadastro, governanca e financeiro residual

**Objetivo:** fechar o que restou de CRUDs administrativos e fluxos de suporte.

**PRs planejados**

| PR | Escopo | Arquivos alvo | Saida esperada |
|----|--------|---------------|----------------|
| PR-13 | extracao de owners, patients e owner-patient-links | `apps/api/src/server.ts`, novos `apps/api/src/routes/owners-routes.ts`, `patients-routes.ts` | cadastro fora do monolito |
| PR-14 | extracao de users, staff e access-control | `apps/api/src/server.ts`, novos `apps/api/src/routes/users-routes.ts`, `staff-routes.ts`, `access-control-routes.ts` | governanca separada do transport root |
| PR-15 | extracao de billing, products, services e quotes | `apps/api/src/server.ts`, novos handlers por dominio | financeiro administrativo e catalogo fora do monolito |
| PR-16 | extracao de inventory, audit, api-keys e internal-events | `apps/api/src/server.ts`, novos handlers por dominio | bloco operacional residual separado |

**Criterio de aceite da onda**

- `server.ts` fica abaixo de `2500` linhas;
- cadastro, governanca e financeiro deixam de depender de blocos inline;
- regras de autorizacao ficam centralizadas em contratos reutilizaveis;
- `server.test.ts` perde cenarios redundantes substituidos por suites modulares.

### Onda 5 - Bootstrap/runtime final e consolidacao

**Objetivo:** fechar a reducao de acoplamento estrutural, nao apenas rotas.

**PRs planejados**

| PR | Escopo | Arquivos alvo | Saida esperada |
|----|--------|---------------|----------------|
| PR-17 | quebrar `bootstrap.ts` por factories | `apps/api/src/bootstrap.ts`, novo `apps/api/src/bootstrap/*` | infraestrutura separada por concern |
| PR-18 | quebrar `runtime.ts` por composicao de dominio | `apps/api/src/runtime.ts`, novo `apps/api/src/runtime/*` | runtime modular e com wiring por area |
| PR-19 | consolidar composition root final | `apps/api/src/server.ts`, `apps/api/src/index.ts` | `server.ts` como entrypoint fino |
| PR-20 | limpeza final de testes e documentos | `apps/api/src/server.test.ts`, `docs/Enterprise/0193`, `0194`, `0301`, `0316` | evidencia final e backlog atualizado |

**Criterio de aceite da onda**

- `server.ts` deixa de carregar bootstraps de infraestrutura e factories grandes;
- `bootstrap.ts` e `runtime.ts` passam a ter fronteiras menores e reutilizaveis;
- entrypoint da API fica defensavel como composition root fino;
- documentacao e backlog master refletem o novo estado.

---

## 6. Ordem recomendada por dependencia

1. PR-01 a PR-04
2. PR-05 a PR-08
3. PR-09 a PR-12
4. PR-13 a PR-16
5. PR-17 a PR-20

Bloqueios:

- Onda 2 depende do pipeline limpo da Onda 1;
- Onda 3 depende da estabilizacao dos helpers de auth e auditoria;
- Onda 4 depende do padrao de extracao consolidado em dominios clinicos;
- Onda 5 depende de o mapa residual de rotas inline estar suficientemente pequeno.

---

## 7. Definition of Done por PR

Todo PR deste backlog so fecha quando cumprir todos os itens abaixo:

- reduz responsabilidade real do `server.ts`;
- adiciona ou ajusta testes do modulo extraido;
- mantem contrato HTTP existente, salvo mudanca explicitamente documentada;
- nao introduz nova duplicacao de helper ou bootstrap;
- atualiza este documento com status `DONE`, `PARTIAL` ou `TODO`;
- deixa evidencias executaveis claras no diff.

---

## 8. Evidence pack por onda

Ao fechar cada onda, registrar:

- `wc -l` de `server.ts`, `bootstrap.ts`, `runtime.ts` e `server.test.ts`;
- lista de novos arquivos `routes/*`, `bootstrap/*`, `runtime/*` criados;
- suites executadas;
- riscos residuais que sobraram para a onda seguinte.

Comandos minimos:

```bash
wc -l apps/api/src/server.ts apps/api/src/bootstrap.ts apps/api/src/runtime.ts apps/api/src/server.test.ts
pnpm --filter @cvg-his-v2/api test
pnpm typecheck
pnpm build
```

---

## 9. Resultado esperado

Ao fim da trilha:

- `server.ts` deixa de ser gargalo arquitetural dominante;
- a API passa a ter um composition root pequeno e defensavel;
- rotas ficam organizadas por dominio real;
- bootstrap e runtime deixam de ser extensoes ocultas do monolito;
- o `IMP-003` deixa de ser `PARTIAL` e passa a ser fechavel com evidencia objetiva.
