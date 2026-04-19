# 0208 - Prompts Completos dos Executores ERP Enterprise Premium

**Status:** canônico  
**Data:** 2026-04-12  
**Fonte da verdade obrigatória:** `docs/Enterprise`  
**Base:** `0206`, `0207`, `0193`, `0194`, `0196`, `0204`, `0205`

---

## 1. Objetivo

Este documento consolida o catálogo oficial de prompts executores para implementar o plano do:

- `0206-PLANO-MESTRE-CONSTRUCAO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`

Ele substitui o uso de prompts soltos e passa a ser a referência única para:

- ordem de execução
- escopo por executor
- critérios de aceite
- obrigações documentais
- formato de devolução

---

## 2. Regras comuns para todos os executores

Antes de qualquer edição:

- ler `docs/Enterprise`, porque essa pasta é a fonte da verdade;
- não tratar UI existente como domínio concluído sem backend real;
- não reintroduzir nada em `apps/web`;
- não reverter trabalho anterior sem pedido explícito;
- atualizar a documentação no mesmo lote se a entrega mudar o estado real do programa.

Todo executor deve devolver:

- resumo curto;
- arquivos alterados;
- validações executadas;
- documentação atualizada em `docs/Enterprise`;
- pendências reais;
- riscos remanescentes.

Validação mínima padrão:

- `pnpm typecheck`
- `pnpm build`
- `pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit`
- testes focados do write scope, se existirem

---

## 3. Ordem oficial de execução

Sequência derivada de `0207`:

1. `ERP-001` a `ERP-004` — produção real e gates confiáveis
2. `ERP-010` a `ERP-013` — fiscal real
3. `ERP-020` a `ERP-023` — laboratório real
4. `ERP-030` a `ERP-033` — agenda premium enterprise
5. `ERP-040` a `ERP-042` — hub de tutores completo
6. `ERP-050` a `ERP-052` — hub de animais completo
7. `ERP-060` a `ERP-064` — financeiro administrativo profundo
8. `ERP-070` a `ERP-072` — RH, comissões e marketing
9. `ERP-080` a `ERP-082` — relatórios por área

---

## 4. Prompt do Orquestrador

```text
Você é o orquestrador da execução do plano `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`.

Objetivo:
quebrar o plano em ondas executáveis, garantindo que cada executor:
- leia `docs/Enterprise` antes de editar;
- não trate UI como domínio fechado sem backend real;
- atualize docs no mesmo lote;
- rode validações mínimas;
- devolva pendências e riscos reais.

Ordem obrigatória:
1. ERP-001 a ERP-004
2. ERP-010 a ERP-013
3. ERP-020 a ERP-023
4. ERP-030 a ERP-033
5. ERP-040 a ERP-042
6. ERP-050 a ERP-052
7. ERP-060 a ERP-064
8. ERP-070 a ERP-072
9. ERP-080 a ERP-082

Sua saída deve conter:
- sequência de execução;
- dependências;
- critérios de aceite por bloco;
- risco de cada bloco;
- definição objetiva de pronto.
```

---

## 5. Executor EP01 - Produção Real e Gates

### Missão

Fechar a base de qualidade e produção real antes de aprofundar mais domínios ERP.

### Prompt

```text
Você está no repositório `/root/.openclaw/workspace/cvg-his-v2`.

REGRA CENTRAL:
`docs/Enterprise` é a fonte da verdade.
Se o estado real mudar, atualize `docs/Enterprise` no mesmo lote.

Leia primeiro:
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md`
- `docs/Enterprise/0206-PLANO-MESTRE-CONSTRUCAO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/Enterprise/0204-AUDITORIA-COMPARATIVA-DOCS-ENTERPRISE-VS-CODIGO-2026-04-12.md`

Missão:
Fechar `ERP-001`, `ERP-002`, `ERP-003` e `ERP-004`.

Objetivos concretos:
1. Corrigir o escopo de `pnpm test:coverage` para medir o produto, não dependências aninhadas.
2. Revalidar `release:check` com gate honesto.
3. Reduzir dependências demo e `in-memory` críticas para produção.
4. Mapear módulos ainda híbridos entre banco e memória.

Escopo permitido:
- `vitest.config.ts`
- `package.json`
- scripts e testes de qualidade
- runtime/módulos estritamente necessários para remover modo demo/in-memory crítico
- docs relacionadas em `docs/Enterprise`

Escopo proibido:
- não abrir novas features de produto
- não mexer em navegação, `AppLayout` ou `apps/web`

Atualizações documentais obrigatórias:
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md`
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
```

---

## 6. Executor EP02 - Fiscal Real

### Missão

Fechar o maior descompasso inicial entre UI publicada e backend real, entregando um domínio fiscal API-backed mínimo, honesto e utilizável.

### Prompt

```text
Você está no repositório `/root/.openclaw/workspace/cvg-his-v2`.

REGRA CENTRAL:
`docs/Enterprise` é a fonte da verdade.
Se o estado real mudar, atualize `docs/Enterprise` no mesmo lote.

Leia primeiro:
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md`
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0205-RELATORIO-GAP-VETUS-PLANO-CODIGO-2026-04-12.md`
- `docs/Enterprise/0206-PLANO-MESTRE-CONSTRUCAO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/Enterprise/0202-DOMINIO-LABORATORIO-ESTOQUE-FISCAL.md`

Inspecione:
- `apps/spa/src/services/fiscal.ts`
- `apps/spa/src/pages/fiscal/**`
- `apps/api/src/server.ts`
- `apps/api/src/routes/**`
- `packages/modules/fiscal/**`
- `packages/shared/contracts/**` se necessário

Missão:
- Fechar `ERP-010`, `ERP-011` e `ERP-012`.
- Avançar `ERP-013` se houver espaço.
- Tirar o fiscal do estado frontend-local.

Objetivos concretos:
1. Criar endpoints fiscais mínimos e coerentes com a profundidade já publicada no router.
2. Migrar `apps/spa/src/services/fiscal.ts` para backend real.
3. Ajustar páginas fiscais para o contrato disponível.
4. Remover, esconder ou rebaixar CTAs/links que ainda não tenham backend real.
5. Não usar mock permanente para maquiar ausência de backend.

Escopo permitido:
- `apps/api/src/server.ts`
- `apps/api/src/routes/**`
- `packages/modules/fiscal/**`
- `packages/shared/contracts/**` se necessário
- `apps/spa/src/services/fiscal.ts`
- `apps/spa/src/pages/fiscal/**`
- testes focados dessas áreas
- docs relacionadas em `docs/Enterprise`

Escopo proibido:
- não editar `apps/spa/src/navigation.ts`
- não editar `apps/spa/src/layouts/AppLayout.vue`
- não mexer em laboratório, atendimento, RH ou financeiro fora do necessário ao fiscal

Atualizações documentais obrigatórias:
- `docs/Enterprise/0202-DOMINIO-LABORATORIO-ESTOQUE-FISCAL.md`
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md` se status/nota mudar
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
```

---

## 7. Executor EP03 - Laboratório Real

### Missão

Fechar o domínio laboratorial como backend-first, removendo a dependência principal de fallback derivado e catálogos locais na SPA.

### Prompt

```text
Você está no repositório `/root/.openclaw/workspace/cvg-his-v2`.

REGRA CENTRAL:
`docs/Enterprise` é a fonte da verdade.
Se o estado real mudar, atualize `docs/Enterprise` no mesmo lote.

Leia primeiro:
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md`
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0205-RELATORIO-GAP-VETUS-PLANO-CODIGO-2026-04-12.md`
- `docs/Enterprise/0206-PLANO-MESTRE-CONSTRUCAO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/Enterprise/0202-DOMINIO-LABORATORIO-ESTOQUE-FISCAL.md`

Inspecione:
- `apps/spa/src/services/laboratory.ts`
- `apps/spa/src/pages/laboratory/**`
- `apps/spa/src/pages/clinical/DiagnosticsPage.vue`
- `apps/api/src/server.ts`
- `apps/api/src/routes/**`
- `packages/modules/diagnostics/**`
- módulos laboratoriais relacionados, se existirem

Missão:
- Fechar `ERP-020`, `ERP-021` e `ERP-022`.
- Avançar `ERP-023`.

Objetivos concretos:
1. Criar backbone mínimo de API laboratorial.
2. Migrar `laboratory.ts` para consumo de backend real.
3. Tirar equipamentos, tipos de laudo e valores de referência da condição de coleção local da SPA.
4. Decidir o papel de `/diagnostics` como ponte ou entrada coerente.
5. Não manter fallback local como solução final.

Escopo permitido:
- `apps/api/src/server.ts`
- `apps/api/src/routes/**`
- `packages/modules/diagnostics/**`
- módulos laboratoriais relacionados
- `apps/spa/src/services/laboratory.ts`
- `apps/spa/src/pages/laboratory/**`
- `apps/spa/src/pages/clinical/DiagnosticsPage.vue`
- testes focados
- docs relacionadas em `docs/Enterprise`

Escopo proibido:
- não editar `navigation.ts`
- não editar `AppLayout.vue`
- não mexer em fiscal, financeiro ou RH fora do necessário

Atualizações documentais obrigatórias:
- `docs/Enterprise/0202-DOMINIO-LABORATORIO-ESTOQUE-FISCAL.md`
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md` se nota/status mudar
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
```

---

## 8. Executor EP04 - Agenda Premium Enterprise

### Missão

Transformar a agenda do CVG em cockpit multiprofissional premium, com criação rápida, filtros fortes e integração operacional real com fila e atendimento.

### Prompt

```text
Você está no repositório `/root/.openclaw/workspace/cvg-his-v2`.

REGRA CENTRAL:
`docs/Enterprise` é a fonte da verdade.
Se o estado real mudar, atualize `docs/Enterprise` no mesmo lote.

Leia primeiro:
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md`
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0206-PLANO-MESTRE-CONSTRUCAO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/vetus/guides/10-modulo-agenda.md`
- `docs/vetus/guides/12-modulo-cadastros-animais-clientes.md`

Inspecione:
- `apps/spa/src/pages/appointments/**`
- `apps/spa/src/pages/scheduling/**`
- `apps/spa/src/pages/queue/**` se existir
- `apps/spa/src/services/**` relacionados a agenda
- `apps/api/src/server.ts`
- `apps/api/src/routes/**`
- módulos de scheduling/appointments relacionados

Missão:
- Fechar `ERP-030`, `ERP-031` e `ERP-032`.
- Preparar `ERP-033`.

Objetivos concretos:
1. Fortalecer visões dia/semana/mês e cockpit multiprofissional.
2. Criar painel lateral funcional com filtros operacionais fortes.
3. Entregar contrato real de disponibilidade/conflito/bloqueio.
4. Criar fluxo rápido de agendamento com tutor/paciente inline quando necessário.
5. Preparar integração limpa com check-in, no-show e fila.

Escopo permitido:
- `apps/spa/src/pages/appointments/**`
- `apps/spa/src/pages/scheduling/**`
- componentes compartilhados estritamente necessários à agenda
- serviços SPA relacionados
- `apps/api/src/server.ts`
- `apps/api/src/routes/**`
- módulos de scheduling/appointments relacionados
- testes focados
- docs relacionadas em `docs/Enterprise`

Escopo proibido:
- não editar `navigation.ts`
- não editar `AppLayout.vue`
- não expandir tutores/animais além do estritamente necessário ao fluxo de agenda
- não reintroduzir UX de legado

Atualizações documentais obrigatórias:
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md` se nota/status mudar
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
```

---

## 9. Executor EP05 - Hub de Tutores Completo

### Missão

Transformar o tutor em hub de relacionamento, agenda, faturamento e comunicação.

### Prompt

```text
Você está no repositório `/root/.openclaw/workspace/cvg-his-v2`.

REGRA CENTRAL:
`docs/Enterprise` é a fonte da verdade.
Se o estado real mudar, atualize `docs/Enterprise` no mesmo lote.

Leia primeiro:
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md`
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0206-PLANO-MESTRE-CONSTRUCAO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/vetus/guides/12-modulo-cadastros-animais-clientes.md`

Inspecione:
- `apps/spa/src/pages/owners/**`
- `apps/spa/src/services/**` de owners/billing/appointments/notifications
- `apps/api/src/server.ts`
- `apps/api/src/routes/**`
- `packages/modules/owners/**`
- módulos relacionados a vínculo com pacientes, agenda e faturamento

Missão:
- Fechar `ERP-040`.
- Avançar `ERP-041` e `ERP-042`.

Objetivos concretos:
1. Transformar tutor em hub de relacionamento e faturamento.
2. Criar busca avançada e filtros operacionais de tutores.
3. Integrar tutor com agenda, billing e comunicação.

Escopo proibido:
- não expandir animal além do necessário ao vínculo com tutor
- não mexer em shell global

Atualizações documentais obrigatórias:
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md` se nota/status mudar
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
```

---

## 10. Executor EP06 - Hub de Animais Completo

### Missão

Transformar o animal em hub clínico longitudinal, com visão rica de histórico, exames, internações, prescrições e alertas.

### Prompt

```text
Você está no repositório `/root/.openclaw/workspace/cvg-his-v2`.

REGRA CENTRAL:
`docs/Enterprise` é a fonte da verdade.
Se o estado real mudar, atualize `docs/Enterprise` no mesmo lote.

Leia primeiro:
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md`
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0206-PLANO-MESTRE-CONSTRUCAO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/vetus/guides/12-modulo-cadastros-animais-clientes.md`

Inspecione:
- `apps/spa/src/pages/patients/**`
- `apps/spa/src/pages/medical-records/**`
- `apps/api/src/server.ts`
- `apps/api/src/routes/**`
- `packages/modules/patients/**`
- `packages/modules/medical-records/**`
- `packages/modules/encounters/**`

Missão:
- Fechar `ERP-050`.
- Avançar `ERP-051` e `ERP-052`.

Objetivos concretos:
1. Transformar animal em hub clínico longitudinal.
2. Integrar timeline clínica real ao hub.
3. Integrar vacinas, peso, anexos e alertas operacionais.

Atualizações documentais obrigatórias:
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md` se nota/status mudar
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
```

---

## 11. Executor EP07 - Financeiro Administrativo Profundo

### Missão

Sair do financeiro operacional básico e entregar profundidade administrativa real de ERP.

### Prompt

```text
Você está no repositório `/root/.openclaw/workspace/cvg-his-v2`.

REGRA CENTRAL:
`docs/Enterprise` é a fonte da verdade.
Se o estado real mudar, atualize `docs/Enterprise` no mesmo lote.

Leia primeiro:
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md`
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0205-RELATORIO-GAP-VETUS-PLANO-CODIGO-2026-04-12.md`
- `docs/Enterprise/0206-PLANO-MESTRE-CONSTRUCAO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/vetus/guides/13-modulo-financeiro.md`
- `docs/vetus/guides/14-modulo-estoque-fiscal.md`

Inspecione:
- `apps/spa/src/pages/finance/**`
- `apps/spa/src/pages/billing/**`
- `apps/api/src/server.ts`
- `apps/api/src/routes/**`
- `packages/modules/billing/**`
- `packages/modules/cash/**`
- `packages/modules/pix/**`
- `packages/modules/quotes/**`

Missão:
- Fechar `ERP-060` a `ERP-064`.

Objetivos concretos:
1. Criar contas a receber.
2. Criar contas a pagar.
3. Criar fluxo de caixa gerencial e linha do tempo.
4. Criar bancos, formas de pagamento e centros de custo.
5. Criar DRE operacional.

Escopo proibido:
- não mexer em fiscal além do estritamente necessário à integração
- não mexer em RH/marketing

Atualizações documentais obrigatórias:
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md` se nota/status mudar
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
```

---

## 12. Executor EP08 - RH, Comissões e Marketing

### Missão

Materializar RH administrativo clássico e marketing operacional além de notificações básicas.

### Prompt

```text
Você está no repositório `/root/.openclaw/workspace/cvg-his-v2`.

REGRA CENTRAL:
`docs/Enterprise` é a fonte da verdade.
Se o estado real mudar, atualize `docs/Enterprise` no mesmo lote.

Leia primeiro:
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md`
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0205-RELATORIO-GAP-VETUS-PLANO-CODIGO-2026-04-12.md`
- `docs/Enterprise/0206-PLANO-MESTRE-CONSTRUCAO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/vetus/guides/15-modulo-rh.md`
- `docs/vetus/guides/16-modulo-marketing-relacionamento.md`

Inspecione:
- `apps/spa/src/pages/staff/**`
- `apps/spa/src/pages/users/**`
- `apps/spa/src/pages/notifications/**`
- `apps/api/src/server.ts`
- `apps/api/src/routes/**`
- `packages/modules/staff/**`
- `packages/modules/notifications/**`
- `packages/modules/notifications-whatsapp/**`

Missão:
- Fechar `ERP-070`, `ERP-071` e `ERP-072`.

Objetivos concretos:
1. Criar regras e cálculo de comissões.
2. Criar folgas, profissões e departamentos.
3. Criar campanhas e templates por canal.

Escopo proibido:
- não alterar governança enterprise fora do necessário
- não mexer em navegação global

Atualizações documentais obrigatórias:
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md` se nota/status mudar
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
```

---

## 13. Executor EP09 - Relatórios por Área

### Missão

Criar hubs de relatórios por macroárea com dados reais e contratos claros, sem relatório fake ou link farm.

### Prompt

```text
Você está no repositório `/root/.openclaw/workspace/cvg-his-v2`.

REGRA CENTRAL:
`docs/Enterprise` é a fonte da verdade.
Se o estado real mudar, atualize `docs/Enterprise` no mesmo lote.

Leia primeiro:
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md`
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0205-RELATORIO-GAP-VETUS-PLANO-CODIGO-2026-04-12.md`
- `docs/Enterprise/0206-PLANO-MESTRE-CONSTRUCAO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`

Inspecione:
- `apps/spa/src/pages/commercial-reports/**`
- páginas e serviços com dados operacionais relevantes
- `apps/api/src/server.ts`
- `apps/api/src/routes/**`
- módulos de billing, appointments, encounters, inventory e audit

Missão:
- Fechar `ERP-080` e `ERP-081`.
- Preparar `ERP-082`.

Objetivos concretos:
1. Criar hub de relatórios por macroárea.
2. Integrar relatórios financeiros e de produção.
3. Preparar relatórios de plataforma, auditoria e LGPD.

Atualizações documentais obrigatórias:
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md` se nota/status mudar
- `docs/Enterprise/0207-BACKLOG-DERIVADO-ERP-ENTERPRISE-PREMIUM-VETUS-BASED-2026-04-12.md`
```

---

## 14. Resultado esperado

Ao usar este catálogo:

- cada executor parte do backlog real e não de interpretação solta;
- a ordem de ataque permanece alinhada ao `0207`;
- `docs/Enterprise` continua sendo atualizada como memória viva do projeto;
- o programa reduz o principal risco atual: shell bom com profundidade irregular.

Próxima recomendação operacional:

1. usar o prompt do orquestrador para fatiar a onda ativa;
2. disparar o executor do bloco atual da ordem oficial;
3. só avançar para o próximo bloco quando o documento de status refletir a mudança real.
