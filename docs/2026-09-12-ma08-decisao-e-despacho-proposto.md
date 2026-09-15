---
document_status: proposed
document_kind: dispatch_proposal
effective_date: 2026-09-12
owner: Engenharia
review_cycle: on-authorization
---

# MA-08 — decisão e despacho proposto

Atualização de coordenação em 12/09/2026: MA-03-R3 recebeu APPROVE independente I1 local e aguarda integração/registro pelo Lead; o handoff de MA-04/R1 está pronto para o aceite do Lead (`artifacts/remediation/MA-04/integration-20260912T2245Z-324099e5/HANDOFF.md`). Nenhum slice MA-08 está autorizado. A avaliação isolada de B1 exige contrato T1, aceite MA-04 e recursos/locks disponíveis, não obrigatoriamente todas as escolhas dos slices seguintes. Registros de convite/JIT devem exigir vínculo explícito a tenant, identidade elegível e permissões internas; email_verified isolado não autoriza vínculo ou acesso.

> **PROPOSTA — NÃO AUTORIZA IMPLEMENTAÇÃO.**
> Este documento consolida o contrato de MA-08 depois de D1 registrada. **Nenhum slice
> está autorizado em bloco**: a implementação depende de allowlist, locks e das decisões
> contratuais ainda abertas (§3.2). Não altera código, testes, dependências, flags,
> configuração runtime, contrato OpenAPI, manifesto crítico ou gate. O Agente 1 permanece
> o único escritor dos controles canônicos. Não substitui o ledger canônico nem cria novo
> backlog de status.

Referências: [roadmap MA-04/MA-08](2026-09-12-roadmap-backlog-multiagente-release-triplo-aaa.md),
[avaliação profunda](2026-09-12-avaliacao-profunda-release-triplo-aaa.md),
[handoff MA-04/R1](2026-09-12-ma04-status-e-proxima-tarefa.md),
pacotes `artifacts/remediation/MA-04/attempt-20260912T1937Z-324099e5/` e
`attempt-20260912T1948Z-324099e5/`, e as fontes citadas com `arquivo:linha`.

## 1. Decisão D1 — registrada

- Decisão: **o próximo release oferece login corporativo SSO/OIDC** (Alternativa B).
- Procedência: resposta direta do operador do repositório (autoridade de produto) à
  pergunta de despacho do Agente 2, em 2026-09-12; consolidação solicitada pelo Agente 1
  em 2026-09-12.
- Responsável pela decisão: autoridade de produto (operador do repositório). O registro
  da decisão nos controles canônicos é do Lead, único escritor de `.agent/**`.
- Limite: D1 responde apenas à oferta do recurso. **Não** torna MA-08
  IMPLEMENTATION_READY globalmente, **não** dispensa nenhum requisito de segurança (§3.1)
  e **não** autoriza slices: a autorização é individual, com contrato, dependências,
  allowlist, locks e evidência de aceite definidos.

## 2. Estado observado (baseline desta proposta)

Observado com HEAD `324099e5a54537ca1349f3310639c3a12afbae36`; revalidar no despacho.

| Fato | Evidência |
| --- | --- |
| Config OIDC vem de 4 vars (`OIDC_ISSUER/CLIENT_ID/CLIENT_SECRET/REDIRECT_URI`); endpoints Keycloak fixos e escopo fixo | `apps/api/src/server.ts:4102-4120` |
| `validateOIDCConfig` é exportado e nunca chamado no boot | `packages/modules/auth/src/index.ts:1262`; ausência de uso |
| `jwksUri` e `requestTimeoutMs` existem no tipo e não são configurados | `packages/modules/auth/src/oidc.ts:22-23` |
| Flag `auth.oidc.enabled` default false, escopos environment/account, expira 2026-12-31 | `apps/api/src/feature-flags.ts:19-27`, `:202` |
| Login/callback: flag desabilitada → 403; config nula → 501 | `apps/api/src/routes/auth-routes.ts:1160-1194` |
| Callback: UserInfo opcional (falha → `null` + HTTP 200); sem verificação de ID token, `iss/aud/nonce`; sem sessão ERP; sem auditoria | `apps/api/src/routes/auth-routes.ts:1185-1243` |
| Logout: checa apenas `oidcConfig`, **não** a flag; redireciona ao provider se configurado | `apps/api/src/routes/auth-routes.ts:1245-1264` |
| `x-oidc-redirect-uri` é aceito e guardado no state; não é usado no exchange | `apps/api/src/routes/auth-routes.ts:1169-1177`, `:1226-1229` |
| Timeout é por chamada (`AbortSignal.timeout`, 5 s padrão, 1–30 s), sem orçamento total nem propagação do cancelamento do cliente | `packages/modules/auth/src/oidc.ts:93-101`, `:148-156`, `:232-238` |
| Sem cliente OIDC/SSO na SPA; sem e2e OIDC; sem `OIDC_*` em `.env.*`/docs | busca no repositório |
| Sem biblioteca JWT (`jose`/`jsonwebtoken` ausentes) | `package.json` |
| `packages/modules/auth/src/oidc.ts` e `apps/api/src/routes/auth-routes.ts` são fontes hash-bound no manifesto | `docs/engineering/critical-coverage-scope.json` |

## 3. Requisitos obrigatórios, contrato a fechar e decisões técnicas

### 3.1 Requisitos obrigatórios (não dispensáveis)

| ID | Requisito | Natureza |
| --- | --- | --- |
| R1 | Verificação da identidade autenticada: ancoragem no provider (JWKS) e claims `iss`, `aud`, `exp`, `nonce`; **nenhuma sessão sem verificação** | Segurança |
| R2 | Isolamento de tenant/conta: identidade externa nunca cruza tenant; vínculo explícito e auditável | Segurança |
| R3 | Autorização: permissões vêm do RBAC/access-control interno após o vínculo, nunca do provider | Segurança |
| R4 | Binding do fluxo: `state` de uso único + PKCE + `nonce`; replay rejeitado | Segurança |
| R5 | Redirect URI controlada pelo servidor: allowlist por ambiente; valor fornecido pelo cliente não é aceito sem validação; `x-oidc-redirect-uri` tratado como entrada não confiável | Segurança |
| R6 | Proibição de vínculo por coincidência de email: associação exige chave `(issuer, sub)` persistida e ato explícito de provisionamento/vínculo | Segurança |

### 3.2 Contrato a fechar com os responsáveis

| ID | Item | Responsável | Estado |
| --- | --- | --- | --- |
| C1 | UserInfo obrigatório ou opcional documentado | Segurança | Pendente |
| C2 | Provisionamento prévio vs JIT, vínculo de contas e papéis | Produto + Segurança | Pendente |
| C3 | Logout: revogação local + end-session; tratamento de `id_token_hint` | Segurança | Pendente |
| C4 | Política e gestão da allowlist de redirect URI | Segurança + Ops | Pendente |
| C5 | Provider e ambiente de homologação (sandbox) | Segurança + Plataforma | Pendente |
| C6 | Kill-switch, expiração da flag e critério de desligamento | Segurança + Ops | Pendente |

### 3.3 Decisões técnicas dentro do contrato aprovado

| ID | Escolha | Critério |
| --- | --- | --- |
| T1 | Orçamento total/cancelamento: valor dentro de 1–30 s e propagação | Comportamento observável exigido; valor é escolha do implementador |
| T2 | Mecanismo de verificação: `node:crypto` + JWKS já existentes **ou** biblioteca vetted nova | Depende das capacidades existentes; se lib, exige lock DEPENDENCIES/MA-06 e aceite de Segurança. **R1 nunca é dispensado** por essa escolha |
| T3 | Organização interna, cache JWKS e mapeamento de erros | Dentro dos contratos públicos preservados |

## 4. Alternativa B — SSO incluído no release (selecionada)

### 4.1 Resultado observável

Login corporativo ponta a ponta com os requisitos §3.1 satisfeitos (verificação de
identidade R1, isolamento R2, autorização R3, binding R4/R5/R6), item §3.2 fechados
(UserInfo, provisionamento/vínculo, logout, redirect, provider, kill-switch) e T1–T3
decididos pelo implementador dentro do contrato. Test doubles provam contratos locais;
homologação real exige provider em ambiente autorizado (B7), fora desta proposta.

### 4.2 Pré-condições

- D1 registrada (§1); requisitos §3.1 fixados; itens §3.2 fechados; T1–T3 decididos.
- MA-04/R1 aceito pelo Lead (pré-condição do roadmap).
- Provider de homologação e credenciais autorizadas para B7 (não prometidas aqui).
- Janela estável sem instalação/update concorrente e sem colisão com a frente
  MA-03 (R3 aprovada localmente; integração pelo Lead).

### 4.3 Slices (ordem de dependência)

| Slice | Entrega | Arquivos candidatos | Depende | Observável |
| --- | --- | --- | --- | --- |
| B1 | Orçamento único propagado (handler→provider→DB) e cancelamento do cliente; timeout não cria sessão nem duplica efeito | `packages/modules/auth/src/oidc.ts`, `packages/modules/auth/src/oidc.test.ts`, `apps/api/src/routes/auth-routes.ts`, `apps/api/src/routes/auth-routes.test.ts`, novo `tests/unit/api/oidc-deadline-contract.test.ts` | T1 | abort observado; erro canônico; nenhum cookie/sessão |
| B2 | Config no boot com validação fail-closed (parcial nunca ativa) | `apps/api/src/server.ts`, novo `tests/unit/api/oidc-boot-config.test.ts`, `apps/api/src/feature-flags.ts` (se C6 exigir), `.env.example` (**aprovação explícita de config/DX**) | C6 | boot recusa config parcial; log claro; segredo não vaza |
| B3 | **Verificação obrigatória da identidade (R1)**: assinatura/ancoragem JWKS + `iss/aud/exp/nonce` e nonce no fluxo; nenhuma sessão sem verificação | `packages/modules/auth/src/oidc.ts`, novo `packages/modules/auth/src/id-token.ts`, novo `packages/modules/auth/src/id-token.test.ts`, `packages/modules/auth/src/index.ts`; `package.json`/`pnpm-lock.yaml` **somente se T2 concluir que as capacidades existentes não bastam** (lock DEPENDENCIES/MA-06) | R1, R4, T2 | token válido aceito; `iss/aud/exp/nonce/replay` rejeitados |
| B4 | Mapeamento/provisionamento identidade→usuário/tenant/permissões e auditoria | `packages/modules/auth/src/index.ts`, `packages/modules/users/src/index.ts`, `packages/modules/users/src/repositories/database-users.repository.ts`, `packages/modules/staff/src/index.ts`, `packages/modules/staff/src/repositories/database-staff.repository.ts`, `packages/modules/access-control/src/index.ts`, `apps/api/src/server.ts` + testes | C2, R2, R3, R6 | usuário ativo resolve tenant/permissões; inativo/ambíguo nega |
| B5 | Sessão local, logout e revogação | `apps/api/src/routes/auth-routes.ts`, `apps/api/src/routes/auth-routes.test.ts`, `packages/modules/auth/src/index.ts`, `packages/modules/auth/src/auth.test.ts`, `apps/api/src/openapi.yaml` (se respostas mudarem) | C3, R5 | cookie e `/auth/session`; logout revoga localmente |
| B6 | Jornada SPA (caminho ofertado) | `apps/spa/src/pages/LoginPage.vue`, novo `apps/spa/src/pages/auth/OidcCallbackPage.vue`, `apps/spa/src/stores/auth.ts`, `apps/spa/src/services/api.ts`, `apps/spa/src/router/public-routes.ts`, testes correspondentes | B1–B5 | redireciona, volta autenticado, trata erro/expiração |
| B7 | Homologação com provider real e negativos de identidade | nenhuma fonte de produto; configuração e evidência no ambiente autorizado | B1–B6, C5, autoridade | requests/claims sanitizados; replay/expiração/aud errados rejeitados |

**Status de autorização:** nenhum slice B1–B7 está autorizado por este documento e não há
liberaão em bloco. B1 pode ser avaliado separadamente pelo Lead quando MA-03-R3 e o aceite
de MA-04/R1 estiverem resolvidos, com lock/janela e contrato de T1; os demais permanecem
bloqueados pelos itens §3.2 e pela ordem de dependência. Requisitos §3.1 não são
negociáveis por conveniência de prazo.

### 4.4 Allowlist consolidada (proposta)

Somente os arquivos listados por slice. Proibido por implicação: `apps/api/**`, `tests/**`,
`packages/**` como categorias, `.agent/**`, manifesto, gate, CI e configuração global.

### 4.5 Locks

- **API-COMPOSITION** para B1–B5 (auth/server/wiring).
- **SPA-SYSTEM** para B6.
- **DEPENDENCIES** para B3 apenas se T2 concluir que `node:crypto` + JWKS existentes não
  bastam (hoje não há biblioteca JWT no repositório).
- **IDENTITY** para refresh do manifesto após alterar fontes hash-bound (`oidc.ts`, `auth-routes.ts` e demais).
- **CI-CONFIG** se novo check obrigatório for criado.

### 4.6 Contratos públicos a preservar

OpenAPI das 11 operações críticas (incluindo `security: []` de OIDC), cookie
`cvg_his_refresh`, `/auth/session`, login/refresh/logout humanos, isolamento tenant/RLS,
formato de auditoria e erros canônicos (`AppError`/`toErrorResponse`).

### 4.7 Critérios positivos e negativos

- Positivos: token+userinfo válidos criam sessão auditada; login redireciona com
  `state`+PKCE; logout encerra.
- Negativos: `iss/aud/exp/nonce` inválidos, replay de `state`/`code`, UserInfo obrigatório
  ausente, timeout/abort, erro do provider, usuário inativo, vínculo ambíguo, email
  coincidente (R6) e redirect fora da allowlist (R5) **não** criam sessão nem cookie;
  config parcial não inicia; flag desligada recusa login, callback e logout.

### 4.8 Verificação e ambiente

- Unit + handler dispatch com doubles de provider e servidor HTTP local para
  timeout/cancelamento (padrão já usado na reauditoria RA-04).
- Sessão/persistência exigem PostgreSQL isolado (MA-11) e browser para B6 (MA-11/MA-26).
- B7 exige provider sandbox autorizado; nenhuma homologação real ou UAT é prometida aqui.

### 4.9 Rollback e desativação

Flag environment/account + remoção de config desabilita login/callback/logout; revogar
sessões OIDC emitidas se necessário; sem rollback destrutivo de dados. O estado atual do
logout (que ignora a flag) é um gap a fechar em B5 para que o rollback seja efetivo.

### 4.10 Manifesto e freshness

Alterar `packages/modules/auth/src/oidc.ts`, `apps/api/src/routes/auth-routes.ts`,
`apps/api/src/server.ts` ou `apps/api/src/feature-flags.ts` invalida shards de coverage
crítica e exige refresh de identidade (MA-02) e reexecução dos contratos de MA-04
(`tests/integration/openapi-runtime.test.ts`, `tests/unit/api/auth-dispatch-contract.test.ts`)
quando o dispatch mudar. Nenhuma evidência antiga deve ser reancorada. O aceite/registro
de MA-04/R1 é tratado separadamente pelo Lead; alterações posteriores em auth/OIDC exigem
regressão e revisão explícita de freshness.

### 4.11 Recomendações aos responsáveis (não aprovadas)

Classificação: recomendações técnicas/de segurança para decisão dos responsáveis; **não
foram aprovadas nem registradas como decisão** e não substituem §3.1.

- **Vínculo de contas (C2/R6):** manter pré-provisionamento com vínculo administrativo
  explícito usando chave persistida `(issuer, sub)` como padrão. Se JIT for adotado,
  exigir convite/provisionamento prévio e `email_verified`; **nunca** vincular por
  coincidência de email.
- **Redirect (C4/R5):** allowlist server-side por ambiente, validada em login e callback;
  não aceitar valor arbitrário do cliente; remover ou validar `x-oidc-redirect-uri` contra
  a allowlist.
- **UserInfo (C1):** usar como enriquecimento opcional; autenticidade vem do ID token
  verificado; falha de UserInfo não relaxa R1.
- **Logout (C3):** revogar a sessão local e então redirecionar ao end-session; resposta
  idempotente.
- **Deadline (T1):** um orçamento único por callback; abort do cliente cancela o trabalho;
  timeout não cria sessão nem duplica efeito.
- **Biblioteca (T2):** preferir `node:crypto` + JWKS se cobrir R1 com testes; caso
  contrário, biblioteca vetted com lock DEPENDENCIES e aceite de Segurança.
- **Kill-switch (C6):** flag desligada recusa login, callback **e** logout, com evidência
  de que nenhum tráfego ao provider ocorre.

## 5. Alternativa A — SSO explicitamente desativado (contingência)

Mantida como plano de contingência/rollback. Resultado: login/callback/logout recusam de
forma uniforme e documentada; nenhum tráfego a provider; nenhuma sessão/cookie; config
parcial nunca ativa. Slices: fechar o bypass do logout pela flag (`auth-routes.ts` +
teste); boot fail-closed para config parcial (`server.ts` + teste novo); matriz sem
tráfego ao provider (novo teste de contrato); documentação de “não ofertado”. Default
`false` isolado **não** prova desativação completa — a verificação exige os testes
negativos acima e a ausência de `OIDC_*` no ambiente. Locks: API-COMPOSITION/IDENTITY.

## 6. Riscos e hipóteses

- O callback público, sozinho, **não** é vulnerabilidade demonstrada; o header
  `x-oidc-redirect-uri` hoje é armazenado e não usado no exchange.
- Não há prova de bypass; o achado da auditoria é incompletude de SSO, não exploração.
- Riscos abertos: logout ignora a flag; config parcial silenciosa; flag expira em
  2026-12-31; ausência de verificação de identidade no caminho ofertado — agora requisito
  obrigatório R1 (§3.1), ainda não implementado.

## 7. Próxima ação única e responsáveis

**Próxima ação singular:** o Lead registra D1 nos controles canônicos e convoca Segurança
e Produto para fechar os itens §3.2 (C1–C6), com os requisitos §3.1 já fixados; só então
avaliar isoladamente a autorização do B1. Nenhum slice B1–B7 está autorizado por este
documento.

Responsáveis pelas decisões restantes:

- **Produto:** C2 (provisionamento, vínculo de contas e papéis).
- **Segurança:** C1, C3, C4 e C6; e aceite do mecanismo de verificação de identidade em T2.
- **Ops/Plataforma:** C4/C5/C6 na parte de allowlist, sandbox e kill-switch.
- **Lead:** registro canônico de D1, aceite/registro de MA-04/R1 e autorização por slice.
- **Implementador (Agente 2):** T1–T3 dentro do contrato aprovado; **sem escrita de código
  de autenticação até autorização expressa**.

Coordenação: MA-03-R3 recebeu APPROVE independente I1 local e aguarda
integração/registro pelo Lead; nenhuma
alteração de autenticação deve colidir com MA-03-R3, com o aceite de MA-04/R1 ou com
MA-06/coverage. MA-08 **não** é IMPLEMENTATION_READY globalmente por causa de D1.
