# 0207 - Backlog Derivado ERP Enterprise Premium Vetus-Based

**Status:** canônico  
**Data:** 2026-04-12  
**Fonte da verdade obrigatória:** `docs/Enterprise`  
**Base:** `0206`, `0196`, `0193`, `0204`, `0205`

---

## 1. Objetivo

Transformar o plano mestre `0206` em backlog executável por domínio, com foco em:

- fechar produção real;
- fechar profundidade funcional de ERP veterinário;
- preservar a arquitetura premium do CVG;
- evitar narrativa inflada sem backend, persistência ou testes reais.

---

## 2. Regras do backlog

- nenhum item fecha sem evidência executável ou documental verificável;
- UI publicada sem backend real não conta como domínio fechado;
- toda entrega relevante deve atualizar `docs/Enterprise`;
- prioridade `P0` fecha lacuna estrutural ou funcional crítica;
- prioridade `P1` aprofunda o ERP e reduz gap frente ao Vetus;
- prioridade `P2` amplia escala, performance e estrutura de longo prazo.

---

## 3. Onda prioritária ativa

Esta onda é a execução imediata derivada de `0206`.

### Sequência obrigatória

1. `ERP-001` Qualidade e produção real
2. `ERP-010` Fiscal real
3. `ERP-020` Laboratório real
4. `ERP-030` Agenda premium
5. `ERP-040` Tutores completos
6. `ERP-050` Animais completos

### Atualização executada em `2026-04-12`

- `ERP-001` foi fechado: `pnpm test:coverage` passou a medir somente suites compatíveis e reproduzíveis do produto, sem ruído de `node_modules` aninhados.
- `ERP-002` foi fechado em `2026-04-13`: o drift entre `packages/modules/scheduling/package.json` e `pnpm-lock.yaml` permanece corrigido, o build Docker `spa-e2e` segue passando com `--frozen-lockfile` e os antigos blockers de portas, shell/orquestração e login/bootstrap deixaram de reproduzir.
- a revalidação final no runner real também fechou o bloco funcional/visual da suíte SPA: seletores Playwright em strict mode foram alinhados ao DOM atual, o fluxo visual passou a criar owner temporário sem `409 CONFLICT`, e os snapshots foram realinhados contra o ambiente Docker canônico do gate.
- `pnpm build`, `pnpm test:e2e:spa:docker` e `pnpm release:check` ficaram verdes em `2026-04-13`; `ERP-002` agora é `DONE`.
- `ERP-003` foi fechado no corte crítico: produção-like agora exige `DATABASE_URL`, o bootstrap principal removeu hardcode de `acc_cvg_demo` e o runtime repo-backed não pré-carrega seeds demo.
- `ERP-004` foi fechado com o mapa de módulos híbridos remanescentes publicado em `0196`.
- após `ERP-003` e `ERP-004`, `session` e `encounterTimeline` deixaram de ser fallback puro em memória em modo DB saudável; o residual crítico agora está concentrado em warm cache de auth e nos módulos `cache hydrated` classificados em `0196`.

---

## 4. Backlog por épico

## EP01 - Produção Real e Gates Confiáveis

| ID | Prioridade | Item | Saída esperada | Dependências | Status |
| --- | --- | --- | --- | --- | --- |
| ERP-001 | P0 | Corrigir escopo de `pnpm test:coverage` | gate mede produto real, não dependências aninhadas | nenhuma | DONE |
| ERP-002 | P0 | Revalidar `release:check` com gate honesto | caminho de entrega defensável | ERP-001 | DONE |
| ERP-003 | P0 | Reduzir `acc_cvg_demo`, seeds e `in-memory` críticos | baseline mais próxima de produção real | ERP-002 | DONE |
| ERP-004 | P1 | Mapear módulos ainda híbridos entre DB e memória | relatório operacional por domínio | ERP-003 | DONE |

## EP02 - Fiscal API-Backed

| ID | Prioridade | Item | Saída esperada | Dependências | Status |
| --- | --- | --- | --- | --- | --- |
| ERP-010 | P0 | Criar API fiscal dedicada mínima | contratos HTTP reais para o domínio fiscal | ERP-002 | DONE |
| ERP-011 | P0 | Migrar `apps/spa/src/services/fiscal.ts` para HTTP | SPA deixa de depender de serviço frontend-local | ERP-010 | DONE |
| ERP-012 | P0 | Ajustar páginas fiscais ao backend real | UI sem links falsos nem profundidade fake | ERP-011 | DONE |
| ERP-013 | P1 | Ampliar cobertura de tabelas fiscais prioritárias | ICMS, PIS/COFINS, CFOP, NFS-e, matriz ICMS | ERP-012 | IN PROGRESS |

## EP03 - Laboratório Backend-First

| ID | Prioridade | Item | Saída esperada | Dependências | Status |
| --- | --- | --- | --- | --- | --- |
| ERP-020 | P0 | Criar backbone de API laboratorial | pedidos, resultados e catálogos reais | ERP-002 | DONE |
| ERP-021 | P0 | Migrar `laboratory.ts` para consumo de backend real | reduzir fallback derivado/local | ERP-020 | DONE |
| ERP-022 | P0 | Persistir equipamentos, tipos de laudo e referências | catálogos saem da SPA | ERP-020 | DONE |
| ERP-023 | P1 | Definir o papel final de `/diagnostics` como ponte ou hub | taxonomia laboratorial coerente | ERP-021 | IN PROGRESS |

## EP04 - Agenda Premium Enterprise

| ID | Prioridade | Item | Saída esperada | Dependências | Status |
| --- | --- | --- | --- | --- | --- |
| ERP-030 | P0 | Criar cockpit de agenda multiprofissional premium | dia/semana/mês com filtros laterais fortes | ERP-002 | DONE |
| ERP-031 | P0 | Entregar contrato real de disponibilidade e bloqueio | slot availability e conflitos previsíveis | ERP-030 | DONE |
| ERP-032 | P0 | Criar fluxo rápido de agendamento com tutor/paciente inline | modal/drawer sem ruptura operacional | ERP-031 | DONE |
| ERP-033 | P1 | Integrar agenda com check-in, no-show e fila | jornada agenda -> fila -> atendimento | ERP-032 | DONE |

## EP05 - Hub de Tutores Completo

| ID | Prioridade | Item | Saída esperada | Dependências | Status |
| --- | --- | --- | --- | --- | --- |
| ERP-040 | P0 | Transformar tutor em hub de relacionamento e faturamento | hub completo e denso | ERP-002 | TODO |
| ERP-041 | P1 | Criar busca avançada e filtros operacionais de tutores | recuperação rápida de cadastro | ERP-040 | TODO |
| ERP-042 | P1 | Integrar tutor com agenda, billing e comunicação | costura real entre domínios | ERP-040 | TODO |

## EP06 - Hub de Animais Completo

| ID | Prioridade | Item | Saída esperada | Dependências | Status |
| --- | --- | --- | --- | --- | --- |
| ERP-050 | P0 | Transformar animal em hub clínico longitudinal | detalhe clínico completo | ERP-002 | TODO |
| ERP-051 | P1 | Integrar timeline clínica real ao hub do animal | consultas, exames, internações e prescrições | ERP-050 | TODO |
| ERP-052 | P1 | Integrar vacinas, peso, anexos e alertas operacionais | visão clínica contínua | ERP-050 | TODO |

## EP07 - Financeiro Administrativo Profundo

| ID | Prioridade | Item | Saída esperada | Dependências | Status |
| --- | --- | --- | --- | --- | --- |
| ERP-060 | P1 | Criar contas a receber | domínio financeiro mais profundo | ERP-002 | TODO |
| ERP-061 | P1 | Criar contas a pagar | domínio financeiro mais profundo | ERP-060 | TODO |
| ERP-062 | P1 | Criar fluxo de caixa gerencial e linha do tempo | backoffice financeiro forte | ERP-060 | TODO |
| ERP-063 | P1 | Criar bancos, formas de pagamento e centros de custo | cadastros financeiros estruturantes | ERP-060 | TODO |
| ERP-064 | P1 | Criar DRE operacional | visão gerencial de diretoria | ERP-062 | TODO |

## EP08 - RH, Comissões e Marketing

| ID | Prioridade | Item | Saída esperada | Dependências | Status |
| --- | --- | --- | --- | --- | --- |
| ERP-070 | P1 | Criar regras e cálculo de comissões | domínio clássico do Vetus materializado no CVG | ERP-002 | TODO |
| ERP-071 | P1 | Criar folgas, profissões e departamentos | RH administrativo real | ERP-002 | TODO |
| ERP-072 | P1 | Criar campanhas e templates por canal | marketing operacional e não só notificações | ERP-002 | TODO |

## EP09 - Relatórios por Área

| ID | Prioridade | Item | Saída esperada | Dependências | Status |
| --- | --- | --- | --- | --- | --- |
| ERP-080 | P1 | Criar hub de relatórios por macroárea | agenda, atendimento, cadastros, estoque, financeiro | ERP-002 | TODO |
| ERP-081 | P1 | Integrar relatórios financeiros e de produção | portfólio analítico real | ERP-080 | TODO |
| ERP-082 | P2 | Criar relatórios de plataforma, auditoria e LGPD | dupla leitura operacional e enterprise | ERP-080 | TODO |

---

## 5. Primeiros 3 executores

| Ordem | Executor | Foco | Itens principais |
| --- | --- | --- | --- |
| 1 | Executor Fiscal | fechar domínio fiscal real | `ERP-010`, `ERP-011`, `ERP-012` |
| 2 | Executor Laboratório | fechar domínio laboratorial real | `ERP-020`, `ERP-021`, `ERP-022` |
| 3 | Executor Agenda Premium | fechar agenda enterprise | `ERP-030`, `ERP-031`, `ERP-032` |

**Fila seguinte recomendada:** tutores (`ERP-040`) e animais (`ERP-050`).

---

## 6. Critério de aceite da onda

Esta onda só será considerada cumprida quando houver:

- fiscal API-backed de forma minimamente real;
- laboratório com backend real e catálogos persistidos;
- agenda premium funcional com contrato real;
- gates de release mais honestos;
- documentação atualizada em `docs/Enterprise`.

---

## 7. Resultado esperado

Ao fechar esta onda, o `cvg-his-v2` deixa de ter o principal gap atual do programa:

- shell bom com profundidade irregular.

E passa a sustentar:

- shell bom
- domínios ERP centrais fechando com backend real
- trilha executável para tutores, animais e financeiro profundo.

## 8. Atualização real da agenda premium em `2026-04-12`

Evidência implementada no repositório:

- cockpit real em `apps/spa/src/pages/appointments/AppointmentsListPage.vue` com leituras `dia/semana/mês`, filtros laterais e modal de agendamento rápido;
- fluxo rápido reutilizável em `apps/spa/src/components/appointments/AppointmentQuickCreateForm.vue` com criação inline de tutor e paciente;
- contrato backend extraído para `apps/api/src/routes/scheduling-routes.ts`;
- overview real em `/api/scheduling/overview`;
- disponibilidade real em `/api/scheduling/availability`;
- metadados de agenda e conflito no módulo `packages/modules/scheduling`;
- `ERP-033` fechado com `overview` operacional agregado, agenda refletindo fila/triagem/atendimento, fila abrindo encounter real e CTA de detalhe rebaixado para a etapa operacional honesta.
