# Triple-A — 07 Clinical Timeline

**Status:** IMPLEMENTED LOCALLY / TARGET OPEN

O sistema mantém timelines soberanas de encounter e prontuário e as expõe
como projeções operacionais; elas não substituem os módulos donos dos dados.
Os repositórios `encounterTimeline` e `clinicalTimeline` persistem eventos com
tenant, paciente/encounter, ator, timestamp e referências de correlação.

Fontes: `packages/db/src/schema`, `apps/api/src/bootstrap.ts`,
`apps/api/src/server.ts`, [`docs/architecture/EVENT_GOVERNANCE.md`](../architecture/EVENT_GOVERNANCE.md)
e `docs/triple-a/17-workflow-event-order.md`.

Testes unitários, de persistência e a jornada clínica passam localmente. Ainda
faltam envelope de target, retenção/privacidade validada em produção e UAT
hospitalar; portanto a fase integral permanece `NOT PROVEN`.

## Registro obrigatório do prompt

| Campo              | Registro                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Problema           | Unificar eventos operacionais sem substituir os bancos soberanos dos módulos.                                             |
| Estado anterior    | Timelines existiam, mas a documentação de governança e o target ainda eram incompletos.                                   |
| Decisão            | Usar projeções tenant-scoped com eventos versionados e referências seguras.                                               |
| Implementação      | Repositórios encounter/clinical timeline, API e migrations de governança.                                                 |
| Arquivos alterados | `apps/api/src/bootstrap.ts`, `apps/api/src/server.ts`, `packages/db/src/schema`, `docs/architecture/EVENT_GOVERNANCE.md`. |
| Testes             | Runtime, persistência, restart e jornadas clínicas locais.                                                                |
| Evidências         | Testes vinculados ao SHA e E2E clínico do CI #135.                                                                        |
| Riscos residuais   | Retenção/privacidade e envelope de produção/target.                                                                       |
