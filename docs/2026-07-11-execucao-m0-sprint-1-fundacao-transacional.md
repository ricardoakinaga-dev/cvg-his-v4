# Execucao M0 Sprint 1 - fundacao transacional

**Data:** 2026-07-11
**Fonte de escopo:** `2026-07-11-backlog-premium-executavel.md`
**Tickets:** PLAT-001 e PLAT-002
**Estado:** parcial, com fundacao validada e integracao operacional pendente

## Resultado entregue

- `TenantUnitOfWork` tenant-aware com uma conexao PostgreSQL, `BEGIN/COMMIT/ROLLBACK`, contexto RLS verificado e escopo por `AsyncLocalStorage`;
- reutilizacao da mesma conexao por `runInTenantTransaction`, `withTenantQueryExplicit`, consultas do pool instrumentado e cliente Drizzle escopado;
- protecao contra troca de tenant, troca de pool, uso do escopo apos encerramento e comando idempotente aninhado;
- idempotencia persistente por tenant/operacao/chave, hash canonico, replay e conflito de payload;
- outbox, inbox e auditoria disponiveis na mesma transacao da operacao;
- migracao `0076_delivery_guarantees.sql` com RLS e `FORCE ROW LEVEL SECURITY` para `idempotency_requests` e `inbox_events`;
- leitura de eventos pendentes separada do claim, evitando mutacao em requisicao GET;
- UoW exposta no bootstrap/runtime da API quando a estrutura de banco esta disponivel;
- validacao runtime contra JSON nao finito, circular, nao plano, excessivamente profundo ou complexo;
- conexao descartada quando commit/rollback deixam o estado da sessao incerto.

## Evidencias executadas

| Evidencia | Resultado |
|---|---|
| testes unitarios do UoW | 13/13 |
| integracao PostgreSQL do UoW | 10/10 |
| concorrencia com mesma chave | um comando executado e um replay |
| helper tenant legado | mesmo `pg_backend_pid()` e `txid_current()` da UoW |
| papel restrito | `cvg_test_rls`, `rolbypassrls=false`, tenant B invisivel |
| testes do event bus | 17/17 |
| testes do worker | 31/31 |
| cobertura RLS | 119/119 tabelas tenant protegidas |
| typecheck API e dependencias | verde |
| lint global | verde |
| security enterprise | vermelho: 10 vulnerabilidades, sendo 2 criticas, 3 altas, 3 moderadas e 2 baixas |
| API local | `http://127.0.0.1:3111/health` verde, modo database |
| SPA local | `http://127.0.0.1:3112/` HTTP 200 |
| worker local | `http://127.0.0.1:3113/health` verde, modo database |

## Bloqueios que impedem concluir os tickets

1. Nenhuma rota critica usa `unitOfWork.execute`; a atomicidade ainda nao protege uma jornada HTTP real.
2. O worker chama o event bus sem registrar os consumidores que hoje sao compostos somente na API.
3. `inbox.claim` ainda nao envolve cada handler e seu efeito local; retry parcial pode repetir handler ja concluido.
4. O claim do outbox usa lease fixa sem owner/version/heartbeat/CAS de conclusao.
5. Falta teste PostgreSQL de dois workers disputando claim, expiracao e retomada da lease.
6. Falta limpeza operacional e metrica de retencao para idempotency/inbox.
7. O bootstrap ainda deve falhar fechado em producao quando as garantias de entrega nao estiverem disponiveis.

## Proxima fatia obrigatoria

1. Introduzir claim do outbox com `lease_owner`, `lease_version`, expiracao, renovacao e conclusao por CAS.
2. Mover a composicao dos consumidores para superficie compartilhada e registrar os consumidores obrigatorios no worker.
3. Executar cada consumidor com inbox e efeito local na mesma UoW tenant-aware.
4. Migrar a primeira mutacao critica HTTP, preferencialmente laboratorio, exigindo `Idempotency-Key` e erro 409 padronizado.
5. Adicionar testes de dois workers, retry parcial por consumidor, falha injetada e restart.

PLAT-001 e PLAT-002 so mudam para `concluido` quando esses bloqueios tiverem codigo executavel e evidencia verde. Esta entrega nao altera a nota global nem homologa dominio funcional.

## Avanco PLAT-002 - 2026-07-12

### Entregue e comprovado

- migracao `0077_outbox_delivery_leases.sql` com owner, token UUID, versao monotona, expiracao por relogio do banco, heartbeat e constraints de estado;
- claim concorrente com `FOR UPDATE SKIP LOCKED`, uma lease por vez, takeover apenas apos expiracao e transicoes de conclusao/retry/DLQ protegidas por CAS;
- payload tenant canonico em `payload.accountId` e `payload._meta.accountId`, incluindo backfill dos eventos existentes;
- filtros `account_id` explicitos em todas as leituras e mutacoes do outbox, inclusive sob conexao PostgreSQL privilegiada;
- consumidores nomeados com receipt em `inbox_events`; efeito PostgreSQL e receipt sao confirmados na mesma UoW;
- retry parcial ignora consumidor ja confirmado e takeover apos perda da conclusao nao repete efeito confirmado;
- reprocessamento administrativo atomico, sem janela TOCTOU;
- contrato de repositorio declara persistencia duravel ou efemera; persistencia duravel exige guard transacional;
- bootstrap valida tabelas, cinco colunas de lease, seis constraints, tres policies e `ENABLE/FORCE RLS` antes de liberar garantias;
- readiness do worker falha fechada quando banco, schema, guard ou qualquer consumidor obrigatorio nao esta pronto;
- recuperacao do loop limpa erro transitorio anterior, sem exigir restart para recuperar readiness.

### Evidencias desta fatia

| Evidencia | Resultado |
|---|---|
| event bus unitario | 24/24 |
| integracao PostgreSQL outbox + UoW | 18/18 |
| worker | 31/31 |
| health contract do worker | 4/4 |
| typecheck event bus, worker e API | verde |
| cobertura RLS | 119/119 |
| security enterprise | verde: critical=0, high=0, moderate=0 |
| auditoria de dependencias de producao | zero vulnerabilidades conhecidas |
| secretlint | verde |
| disputa concorrente | claims disjuntos, sem captura cross-tenant |
| fencing | owner stale nao renova nem conclui |
| janela receipt/conclusao | takeover conclui sem repetir efeito |

### Bloqueios ainda abertos

1. O worker ainda nao compoe consumidores reais `payments`, `billing` e `webhooks`; readiness permanece corretamente indisponivel.
2. Os consumidores atuais dependem de repositorios montados na API; cartao ainda nao possui repositorio PostgreSQL que permita mover a composicao com seguranca.
3. Webhooks e outros efeitos externos precisam gerar child outbox transacional e usar idempotency key no dispatcher; HTTP externo nao pode ser atomico com PostgreSQL.
4. A primeira mutacao HTTP critica ainda precisa usar `unitOfWork.execute`, com `Idempotency-Key`, 409 por conflito e prova dominio/audit/outbox atomicos.
5. Retencao, metricas, alertas e operacao assistida de DLQ/inbox/idempotencia continuam pendentes.

`PLAT-002` permanece `parcial`. A nota global e a homologacao funcional nao mudam nesta fatia.
