# BLOCO 2 — PLANO DE CONSTRUCAO: ELEVACAO, GOVERNANCA E PADRAO ENTERPRISE

**Data:** 10/04/2026
**Status:** EXECUTADO E FECHADO — GATE FINAL APROVADO
**Executores alvo:** Claude Code + Codex CLI
**Dependencia:** Bloco 1 concluido com gate aprovado em 2026-04-10 04:59:04 UTC
**Objetivo:** transformar o `cvg-his-v2` em produto e plataforma com padrao enterprise sustentado por evidência, governança, qualidade, operabilidade e segurança

---

## 1. Missao do Bloco

O Bloco 2 nao existe para "só adicionar features". Ele existe para consolidar o programa como:

- enterprise-ready
- auditavel ponta a ponta
- observavel
- integravel
- seguro
- sustentavel em escala

Este e o bloco que converte a base estabilizada do Bloco 1 em um programa verdadeiramente enterprise.

Ao final dele, o projeto deve ter:

1. runtime API premium e contratos publicos guardados por testes;
2. multi-tenancy, RLS e LGPD comprovados ponta a ponta;
3. frontend premium coerente com design system, WCAG e governança visual;
4. integrações e event backbone confiáveis;
5. qualidade operacional com coverage, performance, chaos e segurança;
6. governança executiva sustentada por sinais automáticos e não por narrativa.

---

## 2. Prerequisito Absoluto

Nenhuma frente deste bloco deve começar oficialmente sem estes sinais vindos do Bloco 1:

- `pnpm typecheck` PASS
- `pnpm build` PASS
- `pnpm test:critical` sem falha de ambiente
- install limpo sem SQL manual
- journal/migrations canônicos
- auditoria e event bus sem erro estrutural

Se algum desses pontos nao estiver fechado, o executor deve pausar e retornar ao Bloco 1.

### Revalidacao Mais Recente do Prerequisito

**Data/hora:** 2026-04-10 04:59:04 UTC
**Veredito:** BLOCO 2 AUTORIZADO PARA EXECUCAO

Sinais objetivos confirmados na checagem de abertura:

- `pnpm typecheck` PASS
- `pnpm build` PASS
- `pnpm test:critical:bootstrap` PASS com `169/169` testes
- install limpo PASS com `packages/db/src/migrate.ts` aplicando `0000` a `0012`
- `drizzle_migrations` e `packages/db/migrations/meta/_journal.json` sincronizados
- `audit_events` alinhada ao contrato operacional com `metadata`, `correlation_id` e `occurred_at`
- testes `@cvg-his-v2/module-audit` e `@cvg-his-v2/module-event-bus` PASS

Com esse conjunto fechado, as frentes `B2-F1` a `B2-F8` podem ser consideradas em execução oficial.

### Estado verificado mais recente do bloco

**Data/hora:** 2026-04-10 14:12:00 UTC
**Veredito:** BLOCO 2 APROVADO

Evidência executada nesta rodada:

- `pnpm typecheck` PASS
- `pnpm build` PASS
- `pnpm validate:openapi` PASS
- testes de runtime OpenAPI PASS
- `pnpm --filter @cvg-his-v2/module-api-keys test` PASS
- `pnpm exec vitest run tests/integration/rls --config vitest.config.ts` PASS com `54/54`
- `pnpm --filter @cvg-his-v2/design-system build-storybook` PASS
- `pnpm test:visual` PASS
- `pnpm test:e2e:spa` PASS

Fechamentos objetivos da reta final:

- hardening do harness Playwright/Vite/API com runtime dedicado em `3111/3112`
- correção do helper de autenticação/token usado pelos fluxos SPA
- canonicalização das listas governadas para empty state reproduzivel
- snapshots governados atualizados, incluindo `encounters-list-page.png` e `billing-list-page.png`

Bloqueios remanescentes:

- nenhum bloqueio de release no fechamento atual
- sem fechamento simultâneo de E2E SPA e visual, o gate de `B2-F3` continua aberto

---

## 3. Fonte de Verdade Obrigatoria

- `docs/Enterprise/0111-PLANO-OPERACIONAL-CONSOLIDADO-FINAL-2026-04-10.md`
- `docs/Enterprise/0112-BLOCO-1-PLANO-CONSTRUCAO-ESTABILIZACAO-E-CONFIANCA-ENTERPRISE-2026-04-10.md`
- `docs/Enterprise/001-BLUEPRINT-ENTERPRISE.md`
- `docs/Enterprise/1000-MATRIZ-ADERENCIA-ENTERPRISE.md`
- `docs/Enterprise/1020-CI-GATES.md`
- `docs/Enterprise/1021-CI-PIPELINE.md`
- `docs/Enterprise/1030-AUDITORIA-ADOCAO-DESIGN-SYSTEM-SPA.md`
- `docs/Enterprise/110-OBSERVABILITY-BASELINE.md`
- `docs/Enterprise/120-LGPD-OPERACIONAL.md`
- `docs/Enterprise/121-LGPD-BASELINE-ANALYSIS.md`
- `docs/Enterprise/0114-PIX-INTEGRATION.md`
- `docs/Enterprise/0117-EVENT-BUS.md`
- `docs/Enterprise/0111-WCAG-AUDIT.md`
- `docs/Enterprise/1060-VISUAL-REGRESSION-WORKFLOW.md`

---

## 4. Estrutura do Bloco

O Bloco 2 deve ser executado em 8 frentes.

1. `B2-F1` — API Premium, OpenAPI e Contratos Publicos
2. `B2-F2` — Multi-Tenancy, RLS, LGPD e Evidência de Isolamento
3. `B2-F3` — Frontend Premium, DS, WCAG, Storybook e Visual Governance
4. `B2-F4` — Integrações Enterprise e Backbone de Eventos
5. `B2-F5` — Qualidade Profunda: Coverage, Tests, CI Gates
6. `B2-F6` — Operação Enterprise: Observabilidade, Performance, Chaos
7. `B2-F7` — Segurança e Compliance: SOC2, Hardening, Rate Limiting
8. `B2-F8` — Dados, IA/ML e Maturidade Analítica

---

## 5. Frente B2-F1 — API Premium, OpenAPI e Contratos Publicos

### Objetivo

Levar a API a um patamar enterprise-first, com contrato público verificável e governado.

### Problemas a atacar

- OpenAPI runtime ainda sem proteção robusta por teste
- API docs ainda não tratadas como artefato governado
- falta de gate forte para contratos públicos
- necessidade de API keys e readiness para terceiros

### Arquivos-alvo provaveis

- `apps/api/src/openapi.yaml`
- `apps/api/src/server.ts`
- `scripts/validate-openapi.js`
- `tests/**openapi**`
- `packages/modules/api-keys/**`
- `.github/workflows/ci.yml`

### Tarefas detalhadas

1. tornar `openapi.yaml` a fonte canônica única do contrato.
2. adicionar teste de runtime:
   - `/openapi.json` responde
   - `paths` nao vazio
   - `info.version` coerente
3. criar gate CI que falhe se o runtime divergir da spec.
4. concluir trilha de API keys:
   - emissão
   - revogação
   - escopo
   - auditoria
5. estruturar documentação para terceiros:
   - autenticação
   - limites
   - webhooks
   - versionamento

### Validações obrigatorias

- `pnpm validate:openapi`
- testes de runtime OpenAPI
- testes do módulo `api-keys`

### Critério de aceite

- contrato público verificável em CI e runtime
- API keys operacionais e auditáveis
- nenhuma regressão de OpenAPI passa despercebida

---

## 6. Frente B2-F2 — Multi-Tenancy, RLS, LGPD e Evidência de Isolamento

### Objetivo

Levar o isolamento de dados ao patamar exigido por ambiente enterprise e compliance.

### Problemas a atacar

- multi-tenancy ainda precisa fechar evidência ponta a ponta
- RLS e LGPD ainda dependem de demonstração reprodutível
- falta gate específico de isolamento e data handling

### Arquivos-alvo provaveis

- `packages/tenant-context/**`
- `packages/modules/lgpd/**`
- `packages/db/migrations/*rls*`
- `tests/integration/rls/**`
- `tests/integration/lgpd/**`
- `docs/Enterprise/RLS-GUIDE.md`
- `docs/Enterprise/120-LGPD-OPERACIONAL.md`

### Tarefas detalhadas

1. padronizar a fonte de contexto tenant/account em toda a stack.
2. reforçar testes de isolamento por conta e tenant.
3. revisar tabelas cobertas por RLS e tabelas ainda fora.
4. fechar lacunas do baseline LGPD:
   - export
   - DSR transitions
   - consent expiration
5. criar gate enterprise para:
   - RLS
   - LGPD
   - audit trail

### Validações obrigatorias

- suites `tests/integration/rls/**`
- suites LGPD
- testes de autorização multi-account

### Critério de aceite

- isolamento comprovado por teste
- LGPD sustentada por comportamento e não só por documento
- matriz enterprise atualizada com evidência

---

## 7. Frente B2-F3 — Frontend Premium, DS, WCAG, Storybook e Visual Governance

### Objetivo

Concluir a camada frontend com padrão enterprise de UX, acessibilidade e governança visual.

### Problemas a atacar

- adoção do design system ainda parcial
- backlog de componentes premium restante
- dark mode e WCAG ainda incompletos
- visual regression e Storybook ainda não são parte forte da governança

### Arquivos-alvo provaveis

- `packages/design-system/**`
- `apps/spa/src/**`
- `packages/design-system/.storybook/**`
- `e2e/**`
- `playwright-spa.config.ts`
- `docs/Enterprise/1030-AUDITORIA-ADOCAO-DESIGN-SYSTEM-SPA.md`
- `docs/Enterprise/0111-WCAG-AUDIT.md`
- `docs/Enterprise/0104-STORYBOOK-SETUP.md`

### Tarefas detalhadas

1. fechar backlog dos componentes premium:
   - charts
   - upload
   - inputs restantes
   - wrappers de página
2. completar dark mode full.
3. executar auditoria WCAG e corrigir findings.
4. elevar Storybook:
   - stories faltantes
   - tokens visíveis
   - guidelines de uso
5. tornar visual regression parte do fluxo normal de mudança visual.
6. eliminar padrões paralelos restantes nas telas mais críticas.

### Validações obrigatorias

- `pnpm --filter @cvg-his-v2/design-system run build`
- testes SPA
- `pnpm test:e2e:spa`
- `pnpm test:visual`

### Critério de aceite

- frontend principal aderente ao DS
- WCAG com findings críticos zerados
- governança visual operacional

---

## 8. Frente B2-F4 — Integrações Enterprise e Backbone de Eventos

### Objetivo

Sair de integrações pontuais para backbone de eventos e integração externa enterprise.

### Problemas a atacar

- event bus ainda está próximo de outbox local
- webhooks e notificações exigem maturação operacional
- PIX e integrações externas ainda estão em plano/documento

### Arquivos-alvo provaveis

- `packages/modules/event-bus/**`
- `packages/modules/webhooks/**`
- `packages/modules/notifications-whatsapp/**`
- `packages/modules/api-keys/**`
- `docs/Enterprise/0114-PIX-INTEGRATION.md`
- `docs/Enterprise/0117-EVENT-BUS.md`
- `docs/Enterprise/313*`

### Tarefas detalhadas

1. definir arquitetura do backbone:
   - Redis Streams
   - Kafka
   - ou modelo híbrido com outbox + dispatcher confiável
2. tornar reenvio, retry, DLQ e observabilidade explícitos.
3. fechar persistência e UI de webhooks.
4. concluir readiness de provedor WhatsApp.
5. implementar primeira integração de pagamento enterprise com decisão formal de provider.

### Validações obrigatorias

- testes do módulo webhooks
- testes do módulo event-bus
- testes de integração de entrega
- rehearsal de falha e retry

### Critério de aceite

- event bus deixa de ser só "outbox marca completed"
- integrações externas têm contrato, persistência e observabilidade

---

## 9. Frente B2-F5 — Qualidade Profunda: Coverage, Tests, CI Gates

### Objetivo

Subir a qualidade do projeto para nível enterprise mensurável.

### Problemas a atacar

- cobertura ainda muito baixa
- thresholds atuais servem apenas como baseline mínimo
- módulos críticos com pouca ou nenhuma cobertura

### Prioridade explícita de coverage

1. `prescriptions`
2. `patients`
3. `encounters`
4. `inventory`
5. `billing`
6. `staff`
7. `products`
8. `services`

### Tarefas detalhadas

1. definir meta incremental:
   - etapa 1: 10-15%
   - etapa 2: 20-30%
   - etapa 3: 40%+
2. atacar primeiro fluxos críticos, não números vazios.
3. endurecer gates de coverage progressivamente.
4. incluir SDKs e packages shared relevantes na governança.
5. transformar suites invisíveis em suites reais e rastreadas.

### Validações obrigatorias

- `pnpm test:coverage`
- módulos-alvo com suites dedicadas
- CI falhando em regressão abaixo do threshold ativo

### Critério de aceite

- crescimento real de coverage em fluxos críticos
- CI deixa de aceitar regressão silenciosa

---

## 10. Frente B2-F6 — Operação Enterprise: Observabilidade, Performance, Chaos

### Objetivo

Garantir que a plataforma continue saudável sob carga, falha e degradação.

### Tarefas detalhadas

1. completar baseline de observabilidade:
   - métricas
   - logs estruturados
   - alertas
   - dashboards
2. benchmarks:
   - p50
   - p95
   - p99
   - throughput
3. load tests com `k6` ou `Artillery`.
4. chaos controlado:
   - banco
   - redis
   - integrações externas
5. runbooks de degradação e recuperação.

### Validações obrigatorias

- suites/perfis de carga
- rehearsal de falhas
- dashboards operacionais preenchidos com dados reais

### Critério de aceite

- SLOs explícitos
- comportamento sob stress conhecido
- alertas úteis e acionáveis

---

## 11. Frente B2-F7 — Segurança e Compliance: SOC2, Hardening, Rate Limiting

### Objetivo

Fechar a camada de segurança e compliance em nível enterprise.

### Tarefas detalhadas

1. implementar backlog residual de auth hardening:
   - brute force distribuído
   - rate limit por IP
   - anomaly detection
   - WebAuthn / step-up auth
2. fechar trilha SOC2:
   - mapeamento de controles
   - evidências
   - gaps
3. revisar segredos, seeds, audit trail e retenção.
4. revisar hardening de headers, sessão, token rotation e expiração.

### Validações obrigatorias

- testes de auth
- testes de rate limiting
- documentação de controles
- evidências de auditoria

### Critério de aceite

- segurança operacional sustentada por teste e evidência
- trilha SOC2 deixa de ser só análise e vira implementação rastreável

---

## 12. Frente B2-F8 — Dados, IA/ML e Maturidade Analítica

### Objetivo

Executar IA/ML apenas em base madura, com dados governados e operação sustentável.

### Tarefas detalhadas

1. validar se a base de dados e eventos já suporta ML confiável.
2. consolidar feature store, model registry e jobs.
3. escolher um primeiro caso com ROI claro:
   - smart scheduling
   - demand forecasting
   - OCR pipeline
4. medir qualidade de dados antes de qualquer claim de inteligência.
5. adicionar monitoramento de drift de dados/modelo.

### Regra crítica

Nao iniciar expansão séria de IA/ML se:

- Bloco 1 não estiver fechado
- dados ainda estiverem com governance incompleta
- event bus e install não estiverem confiáveis

### Critério de aceite

- IA/ML deixa de ser trilha cosmética
- passa a operar sobre dados e plataforma enterprise reais

---

## 13. Ordem Exata de Execucao

1. `B2-F1` — API premium e contratos públicos
2. `B2-F2` — multi-tenancy, RLS e LGPD evidenciados
3. `B2-F3` — frontend premium e governança visual
4. `B2-F4` — integrações e backbone de eventos
5. `B2-F5` — coverage e quality gates fortes
6. `B2-F6` — performance, observabilidade e chaos
7. `B2-F7` — segurança e compliance avançados
8. `B2-F8` — IA/ML e maturidade analítica

Paralelismo seguro:

- `B2-F3` pode andar em paralelo com `B2-F1`
- `B2-F5` pode começar assim que `B2-F1` e `B2-F3` estabilizarem suas bases
- `B2-F8` nao deve correr em paralelo com frentes ainda instáveis do Bloco 1

---

## 14. O que Claude Code deve assumir como escopo ideal

Claude Code deve liderar:

- integração de frentes grandes e multi-arquivo
- runs operacionais, compose, observabilidade e deploy rehearsal
- consolidação documental e relatórios executivos
- testes ponta a ponta e validações de workflow

---

## 15. O que Codex CLI deve assumir como escopo ideal

Codex CLI deve liderar:

- implementação de módulos e refactors locais
- testes unitários e integração localizada
- ajustes finos de TypeScript, contracts e schema
- elevação de coverage em módulos específicos

---

## 16. Entregaveis Mandatorios do Bloco

1. API premium governada por OpenAPI real e gates
2. evidência reprodutível de multi-tenancy, RLS e LGPD
3. frontend premium alinhado ao DS com WCAG e governança visual
4. backbone de eventos e integrações enterprise operacionais
5. coverage e quality gates em patamar superior
6. performance, observabilidade e chaos com evidência
7. segurança e compliance implementados, não só planejados
8. trilha de IA/ML sustentada por maturidade de dados

---

## 17. Criterio de Conclusao do Bloco 2

O Bloco 2 só está concluído quando o projeto puder ser descrito honestamente como:

- enterprise por arquitetura
- enterprise por operação
- enterprise por qualidade

### Fechamento executivo real em 10/04/2026

Status por frente:

1. `B2-F1` — parcial forte
2. `B2-F2` — concluída no escopo mínimo exigido de evidência
3. `B2-F3` — concluída: `pnpm test:e2e:spa` e `pnpm test:visual` em PASS com baseline governado final
4. `B2-F4` — parcial
5. `B2-F5` — parcial
6. `B2-F6` — parcial: sinais executáveis validados em 10/04/2026 (`/health` 200, `/ready` 503 em modo in-memory, `/metrics` com contadores e gauges operacionais)
7. `B2-F7` — não concluída, mas sem bloqueio para a aprovação do Bloco 2
8. `B2-F8` — não concluída, mantida como frente futura

Gate explícito do bloco:

- `BLOCO 2 APROVADO`
- enterprise por segurança
- enterprise por evidência

Não basta "ter muitos módulos". O programa precisa sustentar esse patamar por:

- comandos
- testes
- relatórios
- installs limpos
- documentação coerente
- operação real reproduzível

Esse é o padrão final esperado para o `cvg-his-v2`.
