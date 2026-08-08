# 898 - Walkthrough Operacional do Fluxo Principal

Data: 2026-05-01
Status: executado; P0-OP-001 corrigido; walkthrough completo aprovado; HOFF-MIN-1 implementado e validado
Origem: `890-plano-validacao-operacional.md`, `897-estado-real-ux-operacional-2026-05-01.md`

## 1. Escopo validado

Walkthrough operacional do fluxo:

`Início -> Recepção -> Agenda/Esteira -> Atendimento -> Prontuário -> Comanda/Billing`

Objetivo: validar o fluxo principal já construído antes de abrir uma fatia real de handoff clínico.

Papel simulado:

- Recepção: localizar paciente, preparar check-in, colocar na esteira e chamar.
- Veterinário/triagem: abrir atendimento a partir da esteira.
- Financeiro/recepção: validar apenas como checkpoint de comanda/billing.

## 2. Evidência técnica

Artefato criado:

- `e2e/spa/operational-walkthrough.spec.ts`

Comandos executados:

- `pnpm --filter @cvg-his-v2/api --filter @cvg-his-v2/spa run build`
- `npx playwright test --config playwright-spa.config.ts e2e/spa/operational-walkthrough.spec.ts --project=chromium`

Resultado da build:

- API: build concluída.
- SPA: `vue-tsc --noEmit` e `vite build` concluídos.

Resultado inicial do walkthrough:

- Falhou por bloqueio operacional real ao abrir triagem pela esteira.
- O runtime E2E subiu com API e SPA em `127.0.0.1:3111/3112`.
- O runtime informou banco saudável, mas usou persistência `in-memory` por guardrail de compatibilidade de IDs legados. Portanto, este walkthrough valida fluxo de produto/runtime HTTP, mas não substitui validação de banco real.

Resultado após correção:

- `P0-OP-001` foi corrigido no módulo de scheduling.
- O walkthrough foi reexecutado e passou até `Atendimento -> Prontuário -> Comanda/Billing`.
- Billing permaneceu como checkpoint: a tela abriu sem criar cobrança automaticamente.

Resultado após HOFF-MIN-1:

- O walkthrough foi estendido para validar `Atendimento -> Enviar para recepção -> Recepção -> Confirmar recebimento`.
- A tela de Atendimento enviou o handoff com resumo e instrução mínimos.
- A Recepção exibiu o caso enviado e executou `Confirmar recebimento`.
- A API confirmou a transição `sent_to_reception -> acknowledged_by_reception`.
- O Atendimento recarregado exibiu `Recebido pela recepcao`.
- Billing permaneceu sem criação automática de cobrança/comanda.

## 3. Passos executados

| Etapa                                          | Resultado                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| Preparar tutor/paciente/agendamento controlado | OK                                                                                |
| Início                                         | OK. Dashboard carregou com `Início`, `Agenda e lembretes` e `Comandas abertas`.   |
| Agenda                                         | OK. Agenda carregou o paciente agendado no dia corrente.                          |
| Recepção                                       | OK. Busca por paciente retornou o cadastro e exibiu `Preparar check-in`.          |
| Esteira - check-in                             | OK. Contexto `Check-in preparado pela recepção` abriu modal e concluiu check-in.  |
| Esteira - chamar paciente                      | OK. Linha mudou para `Chamado`.                                                   |
| Esteira - abrir triagem                        | OK após correção. Navegou para `/encounters/:id`.                                 |
| Atendimento                                    | OK. Cockpit de atendimento clínico carregou.                                      |
| HOFF-MIN-1 - enviar para recepção              | OK. Handoff criado em `sent_to_reception` com resumo e instrução mínimos.         |
| HOFF-MIN-1 - ACK recepção                      | OK. Recepção confirmou e API retornou `acknowledged_by_reception`.                |
| Prontuário                                     | OK. Abriu prontuário pelo CTA `Continuar prontuário`.                             |
| Comanda/Billing                                | OK. Comanda abriu com contexto e Billing abriu sem persistir cobrança na leitura. |

## 4. Bloqueios P0

### P0-OP-001 - Esteira não conseguia abrir triagem a partir de entrada chamada

Status: corrigido em 2026-05-01.

Sintoma no walkthrough:

- Ao clicar em `Abrir triagem`, a SPA permaneceu em `/queue?...`.
- A API retornou `400 ValidationError: Invalid queue entry status transition`.
- A expectativa correta seria navegar para `/encounters/:id`.

Evidência de código:

- `QueuePage.vue` cria um `Encounter` para entrada `called` sem `encounterId`, depois chama transição do atendimento para `in_triage`.
- `apps/api/src/server.ts` anexa o encounter à queue via `scheduling.attachEncounter(...)`.
- `attachEncounter(...)` já altera a queue para `in_triage`.
- Em seguida, `syncQueueWithEncounter(..., 'in_triage')` tenta aplicar `in_triage -> in_triage`, mas `transitionQueueForEncounter(...)` exige uma transição estritamente permitida e rejeita a transição idempotente.

Impacto:

- Bloqueia o fluxo principal Recepção/Esteira -> Atendimento.
- Impede validar Prontuário, Comanda e Billing na travessia completa.
- Bloqueia qualquer handoff clínico real, porque a jornada ainda falha antes do atendimento.

Correção aplicada:

- `transitionQueueForEncounter(...)` agora aceita sincronização idempotente para estados de encounter (`in_triage`, `in_care`, `observation`) quando a fila já está no mesmo status.
- Foi adicionado teste unitário cobrindo `called -> attachEncounter -> in_triage` seguido de sync idempotente para `in_triage`.
- O E2E foi ajustado para aceitar IDs reais em UUID e para usar o CTA contextual `Comanda` do prontuário atual.

## 5. Bloqueios P1/P2

| Prioridade | Bloqueio                                                                                | Impacto                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| P1         | Cleanup E2E de `appointment` retorna `503` em `DELETE /appointments/:id`.               | Não bloqueia operação, mas deixa ruído na validação automatizada. A API parece ter cancelamento, não delete real. |
| P1         | Playwright SPA depende de `dist`; primeira execução usou bundle antigo até rodar build. | Antes de validar UX atual, precisa reconstruir API/SPA.                                                           |
| P1         | Runtime E2E cai para `in-memory` mesmo com banco saudável por compatibilidade de IDs.   | A evidência do walkthrough é operacional HTTP/UI, não persistência real.                                          |
| P2         | Agenda atual não tem mais `#referenceDate`; usa mini-calendário/cockpit.                | Testes antigos que dependem desse seletor estão defasados.                                                        |

## 6. Estado real após walkthrough

O programa está mais avançado que discovery, mas o fluxo principal ainda não está fechado.

Estado correto:

- `Início`, `Agenda`, `Recepção`, check-in da `Esteira`, `Atendimento`, `Prontuário`, `Comanda` e `Billing` estão navegáveis no walkthrough.
- A passagem `Esteira -> Atendimento` não está mais bloqueada pelo erro de transição idempotente.
- `HOFF-MIN-1` foi implementado após este walkthrough: envio mínimo para recepção e ACK, sem inbox completa e sem automação financeira.
- `HOFF-MIN-1` também ganhou persistência SQL em `clinical_handoffs`, com RLS e hidratação pós-restart validadas em banco real.
- A Recepção evoluiu para inbox mínima de handoffs com contadores, filtro simples aguardando/recebidos, ACK e atalhos operacionais sem link financeiro.

## 7. Próximo passo lógico

Próximo passo imediato após a implementação:

**HOFF-MIN-1 foi validado no walkthrough operacional.**

Próximo passo lógico:

**Validar RH/governança de acesso antes de expandir o pós-atendimento.**

A decisão `899` corrige o escopo: o fluxo operacional deve dizer o caminho do atendimento; permissões e capacidades devem ser customizadas em RH/governança.

Escopo mínimo implementado:

- registrar `sent_to_reception` para um atendimento em andamento;
- incluir resumo mínimo do caso e pendências;
- recepção assumir/confirmar recebimento;
- auditar ator e horário;
- exibir o caso na inbox mínima da recepção;
- não criar cobrança nem comanda automaticamente.

Lacuna intencional restante:

- não há inbox completa;
- não há automação financeira;
- não há devolução clínica, envio ao financeiro, conclusão ou cancelamento do handoff.
