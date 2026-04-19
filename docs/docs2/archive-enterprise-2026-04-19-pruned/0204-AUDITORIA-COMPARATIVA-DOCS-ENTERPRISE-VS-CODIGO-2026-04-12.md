# 0204 - Auditoria Comparativa Docs Enterprise vs Código

**Status:** canônico  
**Data:** 2026-04-12  
**Escopo:** leitura dos `46` arquivos de `docs/Enterprise`, comparação com o repositório atual e atualização dos documentos vivos  
**Nota global do produto:** `78/100`

---

## 1. Objetivo

Este documento registra a comparação direta entre:

- o que `docs/Enterprise` promete
- o que o código realmente entrega hoje
- quais documentos precisaram ser atualizados por drift

Documentos atualizados nesta auditoria:

- `0191-RELATORIO-EXECUTIVO-AVALIACAO-REAL-2026-04-12.md`
- `0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md`
- `0200-MATRIZ-CONSTRUCAO-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
- `0202-DOMINIO-LABORATORIO-ESTOQUE-FISCAL.md`
- este próprio `0204`

---

## 2. Metodologia

### 2.1 Leitura documental

Todos os `46` arquivos em `docs/Enterprise` foram revisados. A leitura foi agrupada em quatro blocos:

- **master e blueprint:** `000`, `001`, `0190`
- **implementação atual:** `0191` a `0196`
- **reorganização Vetus-aligned:** `0197` a `0203`
- **ondas históricas e futuras:** `0100`, `0114`, `0117`, `0118`, `0119`, `100`, `103`, `104`, `105`, `200`, `203`, `204`, `205`, `301`, `302`, `313`, `313.4`, `314`, `315`, `PLANO-F3-AI-ML`, `PLANO-F4-EXCELENCIA`

### 2.2 Evidência real usada

- inspeção de `apps/api`, `apps/spa`, `apps/worker`, `packages/modules`, `packages/shared`
- verificação de shell, router e services do SPA
- execução de `pnpm typecheck`
- execução de `pnpm build`
- execução de `pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit`
- execução curta de `timeout 20s pnpm test:coverage`

---

## 3. Evidência objetiva consolidada

| Comando / artefato | Resultado | Leitura |
| --- | --- | --- |
| `pnpm typecheck` | PASS | monorepo fecha hoje |
| `pnpm build` | PASS | API, worker, packages e SPA compilam |
| `pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit` | PASS | páginas novas de laboratório/fiscal não quebram mais tipagem |
| `pnpm --filter @cvg-his-v2/module-fiscal test` | PASS | serviço fiscal mínimo do backend tem teste focado |
| `node --test apps/api/dist/routes/fiscal-routes.test.js` | PASS | rotas fiscais mínimas publicadas e validadas |
| `timeout 20s pnpm test:coverage` | FAIL / inválido como gate | o runner executa suites em `packages/shared/config/node_modules/zod/**` e dependências aninhadas como `packages/modules/inventory/node_modules/**` |
| `apps/api/src/server.ts` | `5544` linhas | risco estrutural ainda aberto |
| `apps/spa/src/navigation.ts` | `47` entradas | shell Vetus-aligned materializado |
| `apps/spa/src/router/routes.ts` | `93` rotas | profundidade do produto é real |
| `packages/modules` | `36` módulos | base de domínio é substancial |
| `apps/spa/src/pages` | `83` páginas | SPA já é superfície grande e operacional |

---

## 4. Drift documental encontrado

### 4.1 Itens que os docs antigos estavam subestimando

- typecheck e build do monorepo agora passam
- laboratório já aparece no menu oficial com profundidade real
- estoque já expõe movimentações e validade/lotes
- o router fiscal já contém PIS/COFINS, CFOP, NCM e matriz ICMS
- o fiscal agora já publica API dedicada mínima e a SPA deixou de depender do `dist` compilado do módulo

### 4.2 Itens que os docs antigos estavam superestimando

- qualidade final ainda não está fechada
- `test:coverage` não é gate confiável hoje
- PIX ainda não está pronto em integração vendor real
- runtime distribuído, secrets manager e AI/ML continuam parciais ou futuros

---

## 5. Relatório com nota 0-100 por item construído

### 5.1 Macrotrilhas enterprise

| Item | Nota | Status | Base da nota |
| --- | --- | --- | --- |
| Produto Premium core SPA | `91/100` | `DONE` | SPA canônica, extensa e compilando |
| Core de domínios de negócio | `88/100` | `DONE` | módulos reais cobrindo áreas centrais |
| Corte do legado web para SPA | `93/100` | `DONE` | evolução concentrada em `apps/spa` |
| Governance / access-control / auditoria / MFA | `86/100` | `DONE` | código, endpoints e UI reais |
| LGPD / compliance funcional | `84/100` | `DONE` | baseline sólido, ainda não máxima maturidade operacional |
| Multi-tenancy / RLS baseline | `72/100` | `PARTIAL` | baseline real existe, mas ainda há dependências de demo/seed e modos `in-memory` relevantes para produção |
| Event bus + webhooks | `87/100` | `DONE` | operação assíncrona com retry e DLQ |
| PIX | `61/100` | `PARTIAL` | intenção e fluxos existem; adapter vendor real não |
| Config baseline / fail-fast | `94/100` | `DONE` | stack de configuração madura |
| Security baseline | `88/100` | `DONE` | allowlists, secret scan e SAST reais |
| Observabilidade / métricas / tracing / SLO | `80/100` | `DONE` | baseline técnico forte |
| Operação auditável / backup / restore / SOC2 | `85/100` | `DONE` | artefatos e scripts reais |
| Quality gates de base | `63/100` | `PARTIAL` | build/typecheck verdes; coverage ainda inválido como gate |
| Modularização da API | `58/100` | `PARTIAL` | já começou, mas `server.ts` segue grande demais |
| Runtime premium distribuído | `28/100` | `TODO` | sem rate limiting distribuído real |
| Plataforma premium de longo prazo | `20/100` | `TODO` | trilha ainda não materializada |
| Secrets manager dedicado | `22/100` | `TODO` | rotação existe; manager dedicado não |
| Governança event-driven enterprise | `58/100` | `PARTIAL` | bus pronto, governança final ainda não |
| AI/ML e analytics enterprise | `32/100` | `PARTIAL` | módulo existe, integração de produto não |
| Excelência final e certificação | `44/100` | `PARTIAL` | sem fechamento final de cobertura/performance/chaos |

### 5.2 Reorganização Vetus-aligned

| Item | Nota | Status | Base da nota |
| --- | --- | --- | --- |
| Arquitetura de informação | `92/100` | `REVIEW` | taxonomia principal publicada |
| Shell / navbar | `90/100` | `REVIEW` | grupos e console enterprise funcionais |
| Início + Atendimento | `76/100` | `IN PROGRESS` | jornada forte, ainda não totalmente contínua |
| Laboratório | `68/100` | `IN PROGRESS` | UI forte, backend parcial |
| Estoque | `78/100` | `REVIEW` | domínio já sustentado por API real |
| Fiscal | `66/100` | `IN PROGRESS` | UI forte, API mínima real publicada; domínio ainda read-only e raso |
| Financeiro | `63/100` | `PARTIAL` | grupo coerente, profundidade ainda curta |
| Marketing | `52/100` | `PARTIAL` | pouco além de notificações |
| RH | `57/100` | `PARTIAL` | organização inicial publicada |
| Relatórios | `42/100` | `PARTIAL` | área ainda subdesenvolvida |
| Console enterprise | `84/100` | `REVIEW` | separação clara e útil do ERP principal |

---

## 6. Principais achados por domínio

### 6.1 Laboratório

- já é um grupo de primeira classe no menu
- todas as rotas principais existem
- build e typecheck passam
- a service layer ainda depende parcialmente de fallback derivado

### 6.2 Estoque

- menu e rotas publicadas
- links principais alinhados a `/quotes`
- endpoints reais de inventário já existem na API

### 6.3 Fiscal

- as páginas existem e o router está mais profundo do que a documentação anterior dizia
- a service layer da SPA agora consome `/api/fiscal/*`
- o domínio agora possui API fiscal mínima dedicada
- o gap remanescente mudou para persistência, emissão e profundidade operacional

### 6.4 Qualidade

- `typecheck/build` hoje são green
- `test:coverage` precisa ser tratado como defeito de gate
- o problema evidenciado não é só cobertura baixa: o runner está medindo suites erradas

---

## 7. Conclusão

O código real está **mais avançado** do que parte da documentação dizia em shell, laboratório, estoque, fiscal, typecheck e build. Ao mesmo tempo, a documentação também superestimava o fechamento final de qualidade e de algumas trilhas enterprise.

Leitura executiva final:

- **produto construído:** sim
- **baseline enterprise construído:** sim, mas ainda não fechado para produção em multi-tenancy e persistência operacional
- **gates finais confiáveis:** não
- **nota global atual:** `78/100`

O caminho correto agora é fechar **gates de qualidade reais**, **reduzir o monólito residual da API** e **materializar as trilhas enterprise ainda só parciais**.
