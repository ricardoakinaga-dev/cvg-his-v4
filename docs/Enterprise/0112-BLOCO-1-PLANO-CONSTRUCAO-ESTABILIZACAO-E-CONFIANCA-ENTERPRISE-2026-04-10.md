# BLOCO 1 — PLANO DE CONSTRUCAO: ESTABILIZACAO, CONFIANCA E OPERACAO LIMPA

**Data:** 10/04/2026
**Status:** CONCLUIDO COM GATE DE SAIDA APROVADO
**Executores alvo:** Claude Code + Codex CLI
**Dependencia:** nenhuma
**Objetivo:** levar o `cvg-his-v2` de "workspace que compila" para "plataforma confiavel, instalavel, auditavel e repetivel"

---

## 1. Missao do Bloco

Este bloco existe para fechar tudo o que ainda impede chamar o programa de enterprise do ponto de vista de confiabilidade operacional.

Ao final deste bloco, o projeto deve:

1. instalar de forma limpa e repetivel em ambiente novo;
2. aplicar migrations sem ajustes manuais;
3. executar `pnpm typecheck` e `pnpm build` com evidencia recente;
4. executar `pnpm test:critical` sem ruido de ambiente;
5. isolar o que ainda for falha real de dominio;
6. servir runtime HTTP, OpenAPI, auth e multi-tenancy com comportamento verificavel;
7. manter documentacao enterprise coerente com o estado real.

Este e o bloco que transforma "codigo entregue" em "base enterprise confiavel".

### Fechamento executado em 2026-04-10 04:59:04 UTC

- `pnpm typecheck` PASS
- `pnpm build` PASS
- `pnpm test:critical:bootstrap` PASS com `169/169`
- install limpo PASS via `packages/db/src/migrate.ts`
- journal canonico PASS com `0000` ate `0012_audit_events_alignment`
- auditoria e event bus PASS com schema alinhado e suites estruturais verdes

**Gate de saida:** `BLOCO 1 APROVADO`

---

## 2. Fonte de Verdade Obrigatoria

Executores devem tratar como referencia principal:

- `docs/Enterprise/0111-PLANO-OPERACIONAL-CONSOLIDADO-FINAL-2026-04-10.md`
- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/1011-RELATORIO-AUDITORIA-CODEX-2026-04-09.md`
- `docs/Enterprise/1012-PLANO-REMEDIACAO-PRIORIZADO-2026-04-09.md`
- `docs/INSTALL-REPORT-2026-04-10.md`
- `README.md`
- `OPENCLAW_DEPLOY_DIRETRIZES.md`
- `INSTALACAO_V2_OPENCLAW.md`
- `docker-compose.v2.yml`
- `infra/scripts/cutover-v2.sh`
- `infra/docker/Caddyfile.v2`

Documentos tecnicos auxiliares:

- `docs/Enterprise/1010-AUTH-HARDENING.md`
- `docs/Enterprise/1020-CI-GATES.md`
- `docs/Enterprise/1021-CI-PIPELINE.md`
- `docs/Enterprise/1090-TEST-INVENTORY.md`
- `docs/Enterprise/1000-MATRIZ-ADERENCIA-ENTERPRISE.md`

---

## 3. Regras de Execucao

1. Nenhuma task deste bloco pode assumir que "PASS historico" continua valido sem rerun.
2. Toda correção deve terminar com validacao por comando.
3. Toda mudança estrutural precisa atualizar `0100-EXECUTION-TRACKER.md`.
4. Nenhum fix de install pode depender de SQL manual recorrente.
5. Nenhuma migration nova pode ser adicionada sem garantir rastreabilidade em `packages/db/migrations/meta/_journal.json` ou no mecanismo canonico equivalente.
6. Nenhum ambiente novo deve depender de artefato legado.
7. Se houver conflito entre documentacao antiga e evidência executavel recente, vence a evidência e a documentacao deve ser corrigida no mesmo lote.

---

## 4. Estado Inicial Consolidado do Bloco

### 4.1 O que ja esta bom

- `pnpm typecheck` passa
- `pnpm build` passa
- API, Web, SPA e Worker sobem na stack V2
- `cutover-v2.sh` e `Caddyfile.v2` ja foram alinhados ao compose atual
- storage keys SPA/SDK estao unificadas
- OpenAPI runtime ja tenta servir o arquivo real
- `accountId` hardcoded do fluxo principal de patients foi removido

### 4.2 O que foi fechado neste bloco

- harness de testes DB padronizado no Postgres isolado `localhost:5433`
- `global-setup` agora falha cedo quando a suite exige banco
- `pnpm test:critical` deixou de mascarar falha de ambiente e passou integralmente no bootstrap oficial
- `ICT-010` foi corrigido no fluxo de billing com chamadas assíncronas aguardadas
- `packages/db/src/migrate.ts` passou a aplicar migrations canônicas do filesystem e registrar `drizzle_migrations`
- `_journal.json` foi sincronizado até `0012_audit_events_alignment`
- `audit_events` recebeu `metadata`, `correlation_id` e `occurred_at`
- `outbox_events` e `api_keys` entram no install limpo sem SQL manual
- a SPA passou a propagar `x-account-id` usando o contrato atualizado de autenticação

---

## 5. Estrutura do Bloco

Este bloco deve ser executado em 7 frentes.

1. `B1-F1` — Test Harness e Banco de Testes
2. `B1-F2` — Migrations Canonicas e Journal Drizzle
3. `B1-F3` — Integridade de Auditoria e Event Bus Operacional
4. `B1-F4` — Testes Criticos e Falhas Reais de Dominio
5. `B1-F5` — Multi-Tenancy de Borda e Contrato Cliente
6. `B1-F6` — Instalacao Limpa, Rebuild e Rehearsal de Deploy
7. `B1-F7` — Revalidacao Documental e Gate de Saida

---

## 6. Frente B1-F1 — Test Harness e Banco de Testes

### Objetivo

Eliminar todo ruido de ambiente do `pnpm test:critical`.

### Problemas a atacar

- senha do Postgres divergente do ambiente de teste
- `global-setup` permissivo demais
- suites DB-dependent executando sem infraestrutura valida
- bootstrap local e CI com comportamento divergente

### Arquivos-alvo provaveis

- `tests/setup/global-setup.ts`
- `tests/setup/env.ts`
- `tests/helpers/db-helpers.ts`
- `docker-compose.test.yml`
- `infra/scripts/test-critical-bootstrap.mjs`
- `package.json`
- `.github/workflows/ci.yml`

### Tarefas detalhadas

1. mapear todas as origens de `DATABASE_URL`, `PG*`, `POSTGRES_*` e portas de teste.
2. definir um unico contrato de ambiente para testes DB:
   - host
   - porta
   - database
   - user
   - password
3. ajustar `global-setup` para:
   - falhar cedo quando a suite escolhida exige DB
   - nao mascarar erro de credencial como warning inocuo
4. ajustar bootstrap para:
   - subir o banco correto
   - aguardar readiness real
   - imprimir instrucoes objetivas em caso de falha
5. revisar `test:critical` para usar o bootstrap oficial ou falhar com mensagem clara.

### Validações obrigatorias

- `pnpm test:critical:bootstrap`
- `pnpm test:db`
- `pnpm test:critical`

### Critério de aceite

- `pnpm test:critical` nao falha mais por `password authentication failed for user "postgres"`
- falha de banco, se existir, e bloqueante e explicita
- ambiente local e CI usam o mesmo contrato operacional

---

## 7. Frente B1-F2 — Migrations Canonicas e Journal Drizzle

### Objetivo

Garantir que a instalacao seja fluida, limpa e 100% reproduzivel sem SQL manual de correção.

### Problemas a atacar

- `_journal.json` so registra a migration `0000`
- `0011_outbox_events.sql` precisou ser aplicada manualmente
- install real nao deixa trilha canonica de quais migrations foram efetivamente aplicadas
- risco de ambiente novo subir schema incompleto

### Arquivos-alvo provaveis

- `packages/db/migrations/meta/_journal.json`
- `packages/db/migrate.ts`
- `packages/db/migrations/0000_vengeful_pet_avengers.sql`
- `packages/db/migrations/0001...0011*.sql`
- possivel tabela `drizzle_migrations` ou mecanismo equivalente
- `docs/INSTALL-REPORT-2026-04-10.md`

### Tarefas detalhadas

1. inventariar o estado real das migrations no filesystem e no banco.
2. decidir o mecanismo canonico:
   - journal Drizzle oficial
   - tabela de controle
   - regeneracao segura
3. tornar `packages/db/src/migrate.ts` capaz de aplicar do zero:
   - `0000` ate `0011`
   - sem intervenção manual
4. garantir que `0011_outbox_events.sql` entre no fluxo canônico.
5. rodar teste de install limpo em banco vazio.
6. documentar o caminho oficial e remover necessidade de workaround manual.

### Validações obrigatorias

- banco vazio + `npx tsx packages/db/src/migrate.ts`
- verificação de existencia de `outbox_events`
- verificação da tabela de controle/journal
- `pnpm test:db`

### Critério de aceite

- install limpo aplica todas as migrations automaticamente
- `outbox_events` existe sem SQL manual
- journal/tabela de migracoes reflete o estado real
- proximo deploy nao precisa de correção manual no schema

---

## 8. Frente B1-F3 — Integridade de Auditoria e Event Bus Operacional

### Objetivo

Fechar as duas lacunas operacionais detectadas em produção: auditoria quebrada e event bus incompleto no banco novo.

### Problemas a atacar

- codigo tenta gravar `audit_events.metadata`
- schema atual nao possui essa coluna
- event bus depende de `outbox_events` em runtime real

### Arquivos-alvo provaveis

- `packages/modules/audit/**`
- `packages/db/migrations/*.sql`
- `packages/db/schema/**`
- `packages/modules/event-bus/**`
- `apps/api/src/runtime.ts`
- `apps/worker/src/**`

### Tarefas detalhadas

1. decidir a solucao de auditoria:
   - remover uso da coluna `metadata` no codigo
   - ou adicionar coluna via migration canonica
2. alinhar schema, repositorio e testes do modulo audit.
3. revisar uso real de `outbox_events` por API e Worker.
4. criar teste de integracao minimo que prove:
   - evento de auditoria persiste
   - `outbox_events` existe e recebe evento
   - worker consome sem crash estrutural

### Validações obrigatorias

- testes do modulo audit
- teste do module event-bus
- logs limpos da API
- logs limpos do worker

### Critério de aceite

- logs da API nao mostram mais erro `column "metadata" does not exist`
- event bus funciona em banco recem-criado
- worker nao depende de intervenção manual de schema

---

## 9. Frente B1-F4 — Testes Criticos e Falhas Reais de Dominio

### Objetivo

Depois de remover o ruido de ambiente, zerar as falhas reais remanescentes da suite foundational.

### Problema real ja identificado

- `ICT-010 — Billable/Consumption -> Module Reflex`
- `estimate.encounterId` vem `undefined`

### Arquivos-alvo provaveis

- `tests/integration/foundational.test.ts`
- `packages/modules/billing/**`
- `packages/modules/encounters/**`
- `packages/modules/inventory/**`
- `packages/modules/scheduling/**`

### Tarefas detalhadas

1. reproduzir `ICT-010` isoladamente.
2. identificar se a falha e:
   - bug de dominio
   - bug de fixture
   - expectativa do teste desatualizada
3. corrigir o reflexo no billing sem quebrar inventory.
4. rerodar a suite foundational inteira.
5. revisar se existem outros defeitos reais escondidos pelo ruido de DB.

### Validações obrigatorias

- `pnpm test:critical`
- execução isolada de `tests/integration/foundational.test.ts`
- testes dos módulos alterados

### Critério de aceite

- foundational verde
- `pnpm test:critical` falha zero ou somente por gaps explicitamente identificados e priorizados no mesmo lote

---

## 10. Frente B1-F5 — Multi-Tenancy de Borda e Contrato Cliente

### Objetivo

Fechar o isolamento de conta/tenant na camada HTTP e no cliente.

### Problemas a atacar

- SPA ainda nao envia `x-account-id`
- tenant-context exige esse header em certos caminhos
- API ainda usa fallback `accountId: 'pending'` quando nao ha principal
- falta teste ponta a ponta de account isolation

### Arquivos-alvo provaveis

- `apps/spa/src/services/api.ts`
- `apps/spa/src/stores/auth.ts`
- `apps/api/src/server.ts`
- `packages/tenant-context/**`
- `tests/integration/rls/**`
- `tests/integration/**tenant**`

### Tarefas detalhadas

1. decidir a politica oficial:
   - derivar `accountId` sempre do JWT
   - ou exigir `x-account-id` do cliente autenticado
2. remover ambiguidade entre middleware e borda HTTP.
3. se o header continuar obrigatório, fazer SPA enviá-lo.
4. se o JWT for a fonte de verdade, adaptar middleware e testes para isso.
5. adicionar teste de isolamento:
   - request autenticado com account A nao acessa recursos de account B
   - owner-patient links respeitam a conta correta

### Validações obrigatorias

- testes de tenant-context
- testes de RLS / isolation
- smoke de requests autenticados na SPA/API

### Critério de aceite

- nao existe mais caminho "meio-JWT meio-header" sem definicao
- nenhum request autenticado opera com contexto ambiguo
- existe teste de regressao para account isolation

---

## 11. Frente B1-F6 — Instalacao Limpa, Rebuild e Rehearsal de Deploy

### Objetivo

Transformar o install real em procedimento enterprise repetivel e auditavel.

### Problemas a atacar

- install atual foi "parcialmente concluido"
- dependencias operam, mas exigiram correções manuais
- falta rehearsal com schema realmente limpo

### Arquivos-alvo provaveis

- `docker-compose.v2.yml`
- `.env.v2.example`
- `infra/scripts/cutover-v2.sh`
- `infra/docker/Caddyfile.v2`
- `docs/INSTALL-REPORT-2026-04-10.md`

### Tarefas detalhadas

1. preparar rehearsal em ambiente limpo.
2. subir stack usando somente fluxo canonico.
3. validar:
   - postgres
   - redis
   - api
   - web
   - spa
   - worker
4. executar migration e seed no fluxo canonico.
5. confirmar que nenhuma correção manual foi necessária.
6. gerar novo install report com resultado atualizado.

### Validações obrigatorias

- `docker compose --env-file .env.v2 -f docker-compose.v2.yml config`
- `infra/scripts/cutover-v2.sh`
- health checks reais em 3003/3004/3002
- logs de API/worker sem erros estruturais

### Critério de aceite

- install limpo e completo
- zero SQL manual
- zero passo “corrigir depois”
- relatório final de instalação com veredito `CONCLUÍDA`

---

## 12. Frente B1-F7 — Revalidacao Documental e Gate de Saida

### Objetivo

Fechar o bloco com documentação e governança coerentes.

### Documentos a atualizar

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0111-PLANO-OPERACIONAL-CONSOLIDADO-FINAL-2026-04-10.md`
- `docs/Enterprise/1090-TEST-INVENTORY.md`
- `docs/Enterprise/1000-MATRIZ-ADERENCIA-ENTERPRISE.md`
- `docs/INSTALL-REPORT-2026-04-10.md` ou novo relatório sucessor

### Tarefas detalhadas

1. registrar o que passou por comando executado.
2. recalibrar claims remanescentes.
3. marcar claramente o que foi resolvido e o que migra para o Bloco 2.
4. consolidar evidências de:
   - build
   - typecheck
   - testes criticos
   - install limpo
   - multi-tenancy
   - auditoria/event bus

### Critério de aceite

- nenhum documento-chave repete estado antigo
- o bloco fecha com evidência executável recente

---

## 13. Ordem Exata de Execucao

1. `B1-F1` — corrigir harness e credenciais do banco de testes
2. `B1-F2` — consertar journal/migrations/install canônico
3. `B1-F3` — corrigir auditoria e event bus operacional
4. `B1-F4` — resolver falhas reais de domínio restantes
5. `B1-F5` — fechar multi-tenancy de borda e contrato cliente
6. `B1-F6` — executar rehearsal de install limpo
7. `B1-F7` — atualizar documentos e fechar bloco

Regra:

- `B1-F4` so pode ser considerado concluido depois de `B1-F1`
- `B1-F6` so pode ser considerado concluido depois de `B1-F2` e `B1-F3`

---

## 14. O que Claude Code deve assumir como escopo ideal

Claude Code deve ser usado preferencialmente para:

- rehearsals de install
- validações multi-serviço
- reexecução de compose/cutover
- atualização de documentação operacional
- testes que exigem encadeamento mais procedural

---

## 15. O que Codex CLI deve assumir como escopo ideal

Codex CLI deve ser usado preferencialmente para:

- correções finas de TypeScript
- ajustes em repositorios, services e testes
- refactors localizados
- sincronização de schema e código
- endurecimento de testes automatizados

---

## 16. Entregaveis Mandatorios do Bloco

1. `pnpm typecheck` PASS com evidência recente
2. `pnpm build` PASS com evidência recente
3. `pnpm test:critical` sem falhas de ambiente
4. `ICT-010` resolvido
5. install limpo sem SQL manual
6. event bus e auditoria sem erro estrutural
7. documentação enterprise atualizada
8. relatório final do bloco com:
   - comandos
   - arquivos alterados
   - resultados
   - pendências remanescentes

---

## 17. Criterio de Conclusao do Bloco 1

O Bloco 1 so esta concluido quando:

- o programa e confiavel para instalar, rebuildar e validar;
- os testes criticos falham apenas se houver defeito real;
- o schema e canônico e reproduzível;
- a governança documental reflete exatamente esse estado.

Sem isso, o Bloco 2 nao deve ser tratado como "elevação enterprise"; seria apenas expansão sobre base instável.

### Revalidacao Executavel do Gate de Saida

**Data/hora:** 2026-04-10 03:51:36 UTC
**Resultado:** BLOCO 1 NAO APROVADO

Comandos e sinais revalidados:

- `pnpm typecheck` -> PASS
- `pnpm build` -> PASS
- `pnpm test:critical:bootstrap` -> FAIL por autenticacao do PostgreSQL em `localhost:5432` para usuario `postgres`
- `pnpm test:critical` -> FAIL com 158 falhas; 157 por ambiente (`28P01`) e 1 falha real remanescente em `ICT-010`
- install limpo -> FAIL; [docs/INSTALL-REPORT-2026-04-10.md](/root/.openclaw/workspace/cvg-his-v2/docs/INSTALL-REPORT-2026-04-10.md) registra SQL manual para `0011_outbox_events.sql`
- journal/migrations -> FAIL; `packages/db/migrations/meta/_journal.json` continua com apenas a entrada `0000`
- auditoria/event bus -> FAIL estrutural; `audit_events.metadata` segue ausente no schema operacional enquanto o repositório de auditoria tenta escrever campos não presentes, e o event bus depende de `outbox_events` fora do fluxo canônico

Decisao:

- o Bloco 1 permanece aberto
- o Bloco 2 permanece bloqueado
- o retorno obrigatório é para `B1-F1`, `B1-F2` e `B1-F3` antes de qualquer frente de elevação enterprise
