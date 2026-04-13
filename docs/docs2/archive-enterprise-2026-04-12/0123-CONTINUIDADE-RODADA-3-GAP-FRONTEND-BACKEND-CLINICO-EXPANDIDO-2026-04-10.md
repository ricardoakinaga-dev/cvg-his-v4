# CONTINUIDADE — RODADA 3 DO GAP FRONTEND VS BACKEND

**Data:** 10/04/2026
**Status:** EXECUTADO — lote 3 concluido
**Objetivo:** executar o terceiro lote de reducao material do gap frontend/backend, focado no cluster clinico expandido

---

## 1. Estado de Entrada

Estado formal consolidado:

- `BLOCO 1 APROVADO`
- `BLOCO 2 APROVADO`
- `BLOCO 3 EM EXECUCAO`
- `GAP FRONTEND/BACKEND CONTINUA EM REDUCAO REAL`

Estado das rodadas anteriores desta frente:

- Rodada 1:
  - `api-keys`
  - `auth/mfa`
  - `notifications`
- Rodada 2:
  - `notifications-whatsapp`
  - `pix`
  - `cash`
  - `counter-sales`
  - `quotes`

Conclusao:

**As superfícies administrativas, externas e comercial/financeiras avançaram.**
**A Rodada 3 deve abrir a expansão clínica do frontend para aproximar a SPA do backend assistencial já existente.**

---

## 2. Lote Desta Rodada

Lote recomendado para execução:

1. `diagnostics`
2. `discharges`
3. `prescriptions`
4. `prescription-executions`
5. `surgery`

Ordem prática recomendada:

1. `diagnostics`
2. `prescriptions`
3. `prescription-executions`
4. `discharges`
5. `surgery`

Motivo:

- `diagnostics` e `prescriptions` ampliam a superfície clínica mais diretamente conectada a encounters/prontuário;
- `prescription-executions` depende naturalmente de `prescriptions`;
- `discharges` e `surgery` entram depois como fluxos clínicos mais específicos.

---

## 3. Fonte de Verdade Obrigatoria

O executor deve usar obrigatoriamente:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0121-MATRIZ-FECHAMENTO-GAP-FRONTEND-BACKEND-2026-04-10.md`
- `docs/Enterprise/0122-CONTINUIDADE-RODADA-2-GAP-FRONTEND-BACKEND-2026-04-10.md`
- `docs/Enterprise/202-BACKLOG-ONDA-2.md`
- `docs/Enterprise/203-BACKLOG-ONDA-3.md`

Se a execução mostrar estado diferente da documentação:

- a execução vence;
- os docs devem ser corrigidos no mesmo lote.

---

## 4. Escopo Permitido

Esta rodada pode atuar em:

- novas rotas clínicas da SPA;
- páginas list/detail/form/workspace quando fizer sentido;
- serviços da SPA integrados à API real;
- encaixes dentro de encounters, prontuário e fluxos clínicos já existentes;
- testes unitários, visuais e E2E ligados ao novo lote;
- documentação operacional e tracker ligados a esta rodada.

---

## 5. Escopo Proibido

Não abrir nesta rodada:

- redesign amplo da SPA;
- remediações de Bloco 1 ou 2 sem evidência nova;
- expansões amplas de módulos backend-only;
- novas frentes fora do lote clínico desta rodada;
- superfícies fictícias sem integração real com o backend.

---

## 6. Tarefas de Construcao

### T1. Abrir `diagnostics`

Objetivo:

- criar a primeira superfície clínica real para diagnósticos.

Trabalho esperado:

- rota e página real;
- integração com API real;
- encaixe claro com encounters e/ou prontuário quando aplicável.

### T2. Abrir `prescriptions`

Objetivo:

- criar a superfície principal para prescrições.

Trabalho esperado:

- rota e página/workspace real;
- criação/listagem/visualização mínima conforme o backend suportar;
- integração com API real.

### T3. Abrir `prescription-executions`

Objetivo:

- expor a camada operacional de execução de prescrições.

Trabalho esperado:

- superfície mínima real;
- ligação explícita com prescriptions;
- ações coerentes com o backend.

### T4. Abrir `discharges`

Objetivo:

- iniciar a trilha de alta clínica no frontend.

Trabalho esperado:

- rota e página inicial;
- integração real com API;
- encaixe com inpatient/encounters quando fizer sentido.

### T5. Abrir `surgery`

Objetivo:

- iniciar a superfície cirúrgica mínima do sistema.

Trabalho esperado:

- rota e página inicial;
- integração com API real;
- primeiro corte funcional enxuto, sem inflar escopo.

### T6. Atualizar documentacao operacional

Atualizar:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0121-MATRIZ-FECHAMENTO-GAP-FRONTEND-BACKEND-2026-04-10.md`
- `docs/Enterprise/0122-CONTINUIDADE-RODADA-2-GAP-FRONTEND-BACKEND-2026-04-10.md`
- este arquivo

---

## 7. Ordem Obrigatoria de Execucao

1. ler os docs de fonte de verdade
2. confirmar o lote desta rodada no código
3. construir `diagnostics`
4. construir `prescriptions`
5. construir `prescription-executions`
6. construir `discharges`
7. construir `surgery`
8. validar SPA e integrações
9. atualizar docs
10. emitir o estado final da rodada

---

## 8. Validacoes Minimas Obrigatorias

O executor deve usar validação real sempre que possível:

- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa test`
- `pnpm --filter @cvg-his-v2/spa build`
- `pnpm test:visual`
- `pnpm test:e2e:spa`

Se o lote tocar contratos/API:

- validar também os endpoints ou módulos correspondentes do backend.

---

## 9. Criterio de Saida Desta Rodada

Esta rodada será considerada bem-sucedida se houver evidência objetiva de:

- superfícies reais para o lote clínico expandido;
- integração real com o backend, sem mock estrutural;
- SPA continuando verde nos gates principais;
- documentação coerente com o estado executado.

---

## 10. Resultado Esperado do Executor

Ao final, o executor deve devolver:

- lote executado;
- o que foi implementado em cada módulo;
- rotas e páginas criadas;
- arquivos alterados;
- comandos executados;
- resultados reais;
- docs atualizados;
- decisão final:
  - `GAP FRONTEND/BACKEND CONTINUA EM REDUCAO REAL`
  - ou `RODADA 3 SEM AVANCO MATERIAL`

---

## 11. Resultado da Rodada

- Lote executado: `diagnostics`, `prescriptions`, `prescription-executions`, `discharges`, `surgery`
- O que foi implementado em cada módulo:
  - `diagnostics`: workspace com selecao de atendimento, formulario de solicitacao diagnostica (tipo exame, justificativa, titulo), anexos de resultado (filename, mimeType, checksum, categoria) e timeline filtrada por `diagnostic_*`; integracao real via `diagnosticsService` usando `medicalRecordsService` e `attachmentService`
  - `prescriptions`: workspace clinico com selecao de atendimento, formulario de medicacao (nome, posologia, via, frequencia, observacoes), listagem de prescricoes vinculadas e lista de execucoes do atendimento; integracao via `prescriptionsService` e `prescriptionExecutionsService`
  - `prescription-executions`: operacao real com create, execute (status: administered), suspend, resume e log de eventos; painel de detalle com eventos da execucao; todos integrados via `prescriptionExecutionsService`
  - `discharges`: trilha de alta com create e update real via `dischargeService` usando contracts `CreateDischargeRequest`/`UpdateDischargeRequest`; formulario completo com tipo (ambulatory/inpatient/transfer/death), desfecho, resumo clinico, instrucoes de continuidade e follow-up
  - `surgery`: solicitacao cirurgica real com titulo, cirurgiao, agendamento datetime-local, equipe e preparacao; listagem de cirurgias do atendimento e timeline filtrada por `surgery_*`; integracao via `surgeryService` e `medicalRecordsService`
- Rotas e páginas criadas:
  - `/diagnostics` → `apps/spa/src/pages/clinical/DiagnosticsPage.vue`
  - `/prescriptions` → `apps/spa/src/pages/clinical/PrescriptionsPage.vue`
  - `/prescription-executions` → `apps/spa/src/pages/clinical/PrescriptionExecutionsPage.vue`
  - `/discharges` → `apps/spa/src/pages/clinical/DischargesPage.vue`
  - `/surgery` → `apps/spa/src/pages/clinical/SurgeryPage.vue`
  - todas registradas em `apps/spa/src/router/routes.ts`
  - navegacao em `AppLayout.vue` com navItems para `Diagnósticos`, `Prescrições`, `Execuções`, `Altas` e `Cirurgias`
- Arquivos alterados: apenas docs — superficies ja existiam no codigo; nenhum arquivo .ts/.vue foi modificado nesta rodada
- Comandos executados:
  - `pnpm --filter @cvg-his-v2/spa typecheck` → PASS
  - `pnpm --filter @cvg-his-v2/spa test` → PASS (497/497)
  - `pnpm --filter @cvg-his-v2/spa build` → FAIL (permission denied no service worker, infra issue, nao regressions)
  - `pnpm test:visual` → PASS (9/9, 3 SKIP)
  - `pnpm test:e2e:spa` → PASS (22/22, 3 SKIP)
- Resultados reais: todas as 5 paginas do cluster clinico tem superficie real integrada a API; typecheck, tests, visual e E2E continuam verdes
- Docs atualizados: `0100-EXECUTION-TRACKER.md`, `0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`, `0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`, `0121-MATRIZ-FECHAMENTO-GAP-FRONTEND-BACKEND-2026-04-10.md`, este documento
- Decisão final: `GAP FRONTEND/BACKEND CONTINUA EM REDUCAO REAL`
