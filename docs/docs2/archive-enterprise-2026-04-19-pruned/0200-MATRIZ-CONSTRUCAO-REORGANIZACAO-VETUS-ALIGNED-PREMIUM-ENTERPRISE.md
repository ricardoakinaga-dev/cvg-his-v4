# 0200 - Matriz de Construção Reorganização Vetus-Aligned Premium Enterprise

**Status:** ativo  
**Data de atualização:** 2026-04-12  
**Objetivo:** acompanhar a reorganização Vetus-aligned do produto real, sem perder os upgrades Premium Enterprise

**Documentos-base:**

- `0197-PLANO-GERAL-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
- `0198-ROADMAP-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
- `0199-BACKLOG-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
- `0202-DOMINIO-LABORATORIO-ESTOQUE-FISCAL.md`
- `0204-AUDITORIA-COMPARATIVA-DOCS-ENTERPRISE-VS-CODIGO-2026-04-12.md`

---

## 1. Scoreboard executivo da reorganização

| Eixo | Nota | Status real | Leitura objetiva |
| --- | --- | --- | --- |
| Arquitetura de informação | `92/100` | `REVIEW` | taxonomia principal publicada no shell e refletida no router |
| Shell e navbar | `90/100` | `REVIEW` | `8` grupos principais + `Console Enterprise`; laboratório e estoque já têm profundidade publicada |
| Início + Atendimento | `76/100` | `IN PROGRESS` | narrativa principal está visível, mas ainda não fecha toda a jornada operacional |
| Laboratório | `68/100` | `IN PROGRESS` | domínio publicado no menu e no router; gap principal é backend e acabamento operacional |
| Estoque | `78/100` | `REVIEW` | menu e rotas já expõem inventário, movimentações e validade/lotes |
| Fiscal | `66/100` | `IN PROGRESS` | superfícies, rotas e API mínima real existem; o domínio ainda é raso e só parte da profundidade aparece no menu |
| Financeiro | `63/100` | `PARTIAL` | caixa, faturamento, PIX, orçamentos e vendas assistidas já estão organizados |
| Marketing | `52/100` | `PARTIAL` | grupo existe, mas ainda está centrado em notificações operacionais |
| RH | `57/100` | `PARTIAL` | grupo existe, porém ainda com pouca profundidade além de usuários e equipe |
| Relatórios | `42/100` | `PARTIAL` | grupo publicado, mas ainda muito concentrado em relatórios comerciais |
| Console enterprise | `84/100` | `REVIEW` | governança, integrações e utilidades estão separados do ERP principal |

---

## 2. Matriz por macrofase

| Fase | Nome | Status real | % | Leitura objetiva | Próximo passo |
| --- | --- | --- | --- | --- | --- |
| F0 | Arquitetura de Informação | `REVIEW` | 95 | taxonomia Vetus-aligned já dirige shell, breadcrumbs e router | consolidar nomenclatura residual em documentação e telas |
| F1 | Shell e Navbar | `REVIEW` | 90 | menu principal e console enterprise publicados e utilizáveis | fechar contexto operacional de unidade no topo |
| F2 | Início e Atendimento | `IN PROGRESS` | 76 | atendimento já organiza agenda, fila, prontuário, cirurgia e internação | fechar narrativa ponta a ponta entre recepção, atendimento e faturamento assistencial |
| F3 | Laboratório, Estoque e Fiscal | `IN PROGRESS` | 71 | laboratório e estoque já têm presença real; fiscal ganhou backend mínimo dedicado | aprofundar persistência e operações além do baseline de consulta |
| F4 | Financeiro, Marketing e RH | `PARTIAL` | 57 | grupos existem no shell, mas a profundidade administrativa ainda é limitada | abrir backlog de profundidade funcional por domínio |
| F5 | Relatórios e Console Enterprise | `PARTIAL` | 58 | console enterprise está claro; relatórios por área ainda não estão fechados | criar hubs analíticos por domínio |
| F6 | Hardening e Rollout | `PARTIAL` | 35 | typecheck/build já fecharam; UAT e coverage ainda não | corrigir gate de cobertura e ampliar validação orientada a fluxo |

---

## 3. Correções importantes desta atualização

### 3.1 O shell está mais avançado do que a matriz anterior dizia

O estado real de `apps/spa/src/navigation.ts` hoje é:

- laboratório já expõe `Pedidos de Exame`, `Resultados`, `Equipamentos`, `Tipos de Laudo` e `Valores de Referência`
- estoque já expõe `Movimentações` e `Validade e Lotes`
- financeiro já centraliza `Caixa`, `Faturamento`, `PIX`, `Orçamentos` e `Vendas Assistidas`
- console enterprise está publicado e separado do ERP principal

### 3.2 O laboratório não está mais quebrando o typecheck

Esta era uma afirmação antiga da trilha. No estado atual:

- `pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit` passa
- `pnpm typecheck` passa
- `pnpm build` passa

O risco do laboratório mudou de natureza:

- antes: quebra técnica de build
- agora: integração parcial com backend e uso de fallback/local state em parte do domínio

### 3.3 Fiscal saiu do estágio frontend-local

O router já expõe:

- `/fiscal`
- `/fiscal/icms`
- `/fiscal/pis-cofins`
- `/fiscal/cfop`
- `/fiscal/nfse`
- `/fiscal/ncm`
- `/fiscal/icms-matrix`

O gap real hoje é outro:

- o menu principal ainda expõe só parte dessa profundidade
- a SPA já consome `/api/fiscal/*`, mas o domínio segue read-only
- ainda faltam persistência, emissão e backoffice fiscal de fato

---

## 4. Epics prioritárias em aberto

| Epic | Status | Leitura objetiva | Próximo passo |
| --- | --- | --- | --- |
| E02-A - Sidebar principal | `REVIEW` | estrutura principal já está publicada e navegável | concluir contexto de topo e pequenos ajustes de descoberta |
| E03/E04 - Jornada de Atendimento | `IN PROGRESS` | há narrativa operacional forte, mas ainda não totalmente contínua | alinhar CTA, breadcrumbs e estados vazios fim a fim |
| E05 - Laboratório | `IN PROGRESS` | UI publicada e navegável; backend parcial e fallback ainda presentes | integrar dados reais de domínio e fechar CRUDs especializados |
| E06 - Estoque + Fiscal | `IN PROGRESS` | estoque está mais maduro; fiscal já tem API mínima dedicada, mas segue raso | aprofundar fiscal além do catálogo/read-only e expandir ERP |
| E09 - Relatórios por área | `PARTIAL` | analytics por domínio ainda não fecharam a nova taxonomia | criar hubs por área operacional e administrativa |
| E10 - Hardening | `PARTIAL` | build/typecheck já verdes | corrigir `test:coverage`, ampliar testes de navegação e UAT |

---

## 5. Evidência objetiva usada nesta revisão

| Evidência | Resultado |
| --- | --- |
| `apps/spa/src/navigation.ts` | `47` entradas de navegação e shell Vetus-aligned materializado |
| `apps/spa/src/router/routes.ts` | `93` rotas declaradas |
| `pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS |
| `0202` | atualizado para refletir o estado real de laboratório, estoque e fiscal |

---

## 6. Veredito operacional corrente

O programa de reorganização não está mais em fase de descoberta. Ele já produziu shell, taxonomia, grupos operacionais e domínios visíveis no produto real. O que falta agora é **profundidade funcional e fechamento técnico**, sobretudo em:

- fiscal
- relatórios por área
- jornada ponta a ponta de atendimento
- hardening final de testes e rollout
