# Triple-A — 03 Clinical Assurance

**Status:** PARTIAL / TARGET AND UAT OPEN

## Problema

Fluxos P0 clínicos precisam de invariantes negativas, persistência, isolamento
de tenant, autorização, auditoria, concorrência e recuperação. Unit tests ou
uma tela funcionando isoladamente não encerram essa obrigação.

## Estado e decisão

A matriz de criticidade e os invariantes estão documentados. A jornada clínica
canônica e a jornada de internação cobrem admissão, leito, evolução, handover,
alta, timeline e invariantes de tenant. O resultado local é bounded; não é
promovido para UAT ou ambiente alvo.

## Arquivos e evidências

- [`docs/clinical/CLINICAL_CRITICALITY_MATRIX.md`](../clinical/CLINICAL_CRITICALITY_MATRIX.md)
- [`docs/clinical/CLINICAL_SAFETY_INVARIANTS.md`](../clinical/CLINICAL_SAFETY_INVARIANTS.md)
- `e2e/tests/jornada-clinica-canonica.spec.ts`
- `e2e/tests/jornada-internacao-canonica.spec.ts`
- `tests/critical` e `tests/integration` para banco, RLS e processos.

## Verificação

As duas jornadas canônicas passaram localmente em PostgreSQL/Redis, e o CI
`#135` concluiu os passos clínicos e a validação de usabilidade com sucesso.
Os testes não substituem aceite hospitalar, execução em target nem autoridade
de release.

## Risco residual

RLS runtime no target, UAT humano, providers externos e envelopes de
concorrência/recovery publicados continuam `NOT PROVEN`.

## Registro obrigatório do prompt

| Campo              | Registro                                                                         |
| ------------------ | -------------------------------------------------------------------------------- |
| Problema           | Garantir que caminhos P0 clínicos preservem segurança, tenant e auditoria.       |
| Estado anterior    | Matriz e testes existiam, mas aceitação integral não estava ligada ao candidato. |
| Decisão            | Tratar E2E local como bounded e exigir CI/target/UAT separados.                  |
| Implementação      | Matriz de criticidade, invariantes e jornadas canônicas.                         |
| Arquivos alterados | `docs/clinical`, `e2e/tests/jornada-*`, `tests/critical`, `tests/integration`.   |
| Testes             | Critical `66/615`; E2E clínico local `2/2`; CI #135 clínico verde.               |
| Evidências         | Artefatos locais e job E2E do CI #135, vinculados ao SHA.                        |
| Riscos residuais   | RLS target, providers, concorrência externa, recovery e UAT humano.              |

## Atualização do candidato funcional — 2026-09-12T02:53:43Z

A implementação foi avaliada no SHA funcional `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689`. O [CI #137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200) terminou verde com 16/16 jobs, mas o gate local estrito permaneceu `BLOCKED`, score `54`, critical `54`, `16` P0 e claim `NOT PROVEN`. O pacote `artifacts/triple-a` continua fail-closed; provas de target, autoridade humana, UAT e produção só serão promovidas com envelopes vinculados e verificáveis.
