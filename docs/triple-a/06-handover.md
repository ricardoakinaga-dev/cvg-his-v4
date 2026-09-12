# Triple-A — 06 Handover

**Status:** IMPLEMENTED LOCALLY / UAT OPEN

O domínio de passagem de plantão usa entidades persistentes de handover e
itens, contexto de paciente/encounter, pendências e reconhecimento. A matriz
clínica trata handover como caminho P0; o protocolo de UAT define os cenários
de recebimento e reconhecimento.

Fontes principais: `packages/db/src/schema/shift_handovers.ts`,
`packages/db/src/schema/shift_handover_items.ts`,
[`docs/operations/HOSPITAL_UAT_PROTOCOL.md`](../operations/HOSPITAL_UAT_PROTOCOL.md)
e os testes clínicos de persistência/tenant.

Os contratos e testes locais passam. A aceitação humana, a execução em target,
alertas de atraso e a prova de continuidade entre turnos continuam
`NOT PROVEN`.

## Registro obrigatório do prompt

| Campo              | Registro                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Problema           | Passagem de plantão precisa preservar contexto e pendências sem texto solto.                                        |
| Estado anterior    | Schema e protocolo existiam, porém sem aceite humano corrente.                                                      |
| Decisão            | Manter handover persistente e tenant-scoped, com reconhecimento auditável.                                          |
| Implementação      | Entidades de handover/items, workflow e protocolo UAT.                                                              |
| Arquivos alterados | `packages/db/src/schema/shift_handovers.ts`, `shift_handover_items.ts`, `docs/operations/HOSPITAL_UAT_PROTOCOL.md`. |
| Testes             | Testes de persistência, tenant, workflow e E2E clínico.                                                             |
| Evidências         | Jornada clínica local `2/2` e CI #135 E2E verde.                                                                    |
| Riscos residuais   | UAT, target, alertas de atraso e continuidade entre turnos.                                                         |

## Atualização do candidato funcional — 2026-09-12T02:53:43Z

A implementação foi avaliada no SHA funcional `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689`. O [CI #137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200) terminou verde com 16/16 jobs, mas o gate local estrito permaneceu `BLOCKED`, score `54`, critical `54`, `16` P0 e claim `NOT PROVEN`. O pacote `artifacts/triple-a` continua fail-closed; provas de target, autoridade humana, UAT e produção só serão promovidas com envelopes vinculados e verificáveis.
