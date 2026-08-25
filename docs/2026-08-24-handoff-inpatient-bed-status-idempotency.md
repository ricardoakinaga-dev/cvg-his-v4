# Handoff — idempotência de leito e status da internação

Data: 2026-08-24<br>
Task: `CVG-002C6`<br>
Quality Bar: [`../.agent/artifacts/CVG-002C6-inpatient-bed-status-idempotency-2026-08-24.md`](../.agent/artifacts/CVG-002C6-inpatient-bed-status-idempotency-2026-08-24.md)

## Resultado

Assignment, transfer e update-status inpatient agora passam pelo command seam
tenant-scoped. Cada mutação valida o stay/bed dentro do comando, aguarda a
persistência do domínio, aguarda auditoria durable e só então responde. A
transferência também espera a projeção de mudança de status no prontuário. Em
falha pós-comando, a rota reidrata a cache inpatient/audit para não deixar uma
réplica quente expondo estado que a unidade de trabalho reverteu.

## Evidência nova

- RED: os três novos testes de seam falharam com zero invocações do command
  runner; o teste de status também expôs que o callback não era aguardado.
- GREEN: build da API e suíte do handler inpatient — 22/22.
- HTTP/PostgreSQL descartável, duas APIs, dois tenants e roles reais
  `LOGIN NOSUPERUSER NOBYPASSRLS` — 5/5. A jornada comprovou replay/conflict
  cross-instance de assignment, status e transfer, uma linha durável por
  idempotency key, uma timeline `inpatient_transferred` e liberação dos três
  leitos após a alta.
- Prettier focado — verde.

Os 409 observados nos logs são os conflitos divergentes esperados pela matriz
de replay. A evidência autoritativa está no Quality Bar e na reconciliação SQL
do teste vertical.

## Continuação verificada — failpoint cross-domain e recuperação

O failpoint real de projeção em `clinical_timeline` foi exercitado em
PostgreSQL. A primeira atualização de status retornou 500 e deixou o stay
`admitted`, sem timeline, auditoria ou idempotência concluída. A reidratação
de `MedicalRecordsService` removeu o registro/index criado apenas em memória;
depois de remover a constraint temporária, o retry com a mesma chave retornou
200 e reconciliou exatamente uma timeline, uma auditoria e uma linha de
idempotência. O Quality Bar executável está em
[`../.agent/artifacts/CVG-002C6-inpatient-cross-domain-failpoint-recovery-2026-08-24.md`](../.agent/artifacts/CVG-002C6-inpatient-cross-domain-failpoint-recovery-2026-08-24.md).

O harness de processo agora também despacha `inpatient.status.update`: a
matriz pública de SIGKILL passou 2/2 nos checkpoints `after_claim` e
`after_domain_command_before_cas`, e a regressão vertical completa passou 9/9.

## Continuação verificada — failpoints de leito/auditoria e restart

A matriz de failpoints PostgreSQL agora cobre cinco cenários: close, projeção
em `clinical_timeline`, ocupação de leito em assignment, ocupação do leito de
destino em transfer e gravação de auditoria. O teste de transferência confirma
que o leito anterior permanece ocupado e o destino disponível durante a falha;
após remover a constraint temporária, o retry com a mesma chave libera o
anterior, ocupa o destino e produz uma única timeline, auditoria e idempotência.

O fixture de processo passou a semear setor e dois leitos no PostgreSQL e a
ligar explicitamente `SectorBedService` ao `DatabaseClient`. Assignment e
transfer passaram 4/4 nos checkpoints `after_claim` e
`after_domain_command_before_cas`; a regressão completa de processo passou
10/10, incluindo inventory, status e stale-owner.

## Próxima fronteira

O próximo P0 é reconciliar esta evidência no gate clínico-financeiro pai e
selecionar a próxima lacuna com fonte autoritativa. Permanecem abertos os
gates globais de produção/cluster/Secrets, Redis/providers, RLS/FORCE RLS
global, DR/RPO, paridade Vetus completa, WCAG, cobertura, operações e release.
Este checkpoint não promove o ERP global.
