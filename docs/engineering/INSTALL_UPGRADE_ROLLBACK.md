# Instalação, upgrade e rollback

**Vigente desde:** 2026-09-02  
**Owner:** Plataforma/DBA  
**Comando reproduzível:** `pnpm ops:install-upgrade:drill`

O ensaio cria dois bancos PostgreSQL descartáveis com nomes gerados e nunca
reutiliza o banco informado na URL administrativa:

1. instalação vazia até `HEAD`, seed controlado executado duas vezes e nova
   execução idempotente das migrations;
2. instalação até a penúltima migration, inclusão de dado sentinela, upgrade até
   `HEAD`, nova execução idempotente e probes de compatibilidade em tenants,
   accounts, users e patients.

O relatório JSON registra SHA de destino, número de migrations e duração de cada
fase. A URL deve apontar para uma role com `CREATEDB`; os dois bancos gerados são
encerrados e removidos mesmo quando o ensaio falha.

## Política de rollback

Migrations canônicas são **forward-only**. O rollback operacional reimplanta o
digest anterior da aplicação sobre o schema já atualizado, somente se os probes
de compatibilidade daquela versão estiverem verdes. Não se executa SQL destrutivo
automático para “desmigrar” produção.

Se uma migration remover/renomear coluna, alterar semântica ou impedir a versão
anterior de iniciar, ela deve usar expand/migrate/contract:

1. expandir o schema de forma compatível;
2. migrar/backfill com reconciliação;
3. promover e observar a nova aplicação;
4. remover a superfície antiga apenas em release posterior, depois do fim da
   janela de rollback.

Falha de upgrade mantém a aplicação anterior e aciona restore conforme o runbook.
Restore do banco só é usado para perda/corrupção ou incompatibilidade aprovada no
go/no-go; deve restaurar também anexos e configuração do mesmo ponto de corte.

## Migration 0175: access-control change versions

Migration `0175_access_control_change_versions` adds an account version ledger,
tenant-scoped RLS, functions and triggers. It has no down migration. An
application rollback must keep the additive schema and redeploy the prior
application digest; do not drop the ledger or its dependent objects. A new
application version that reads the ledger requires migration 0175 first. An
older version is expected to ignore the added objects, but mixed-version
behavior with the exact release binaries is **not proven** until the candidate
rehearsal passes.

A local disposable proof passed on 2026-09-23 with a synthetic restricted login,
private Unix socket, no container network or published port, schema/tenant
isolation checks and an idempotent rerun. Its operational record is kept in the
repository's internal evidence ledger and is not part of this runbook. The proof
does not approve a production login, credential channel, target or rollback
rehearsal.
Before release, bind the approved migration identity and secret source to the
candidate SHA, verify its role flags and grants, and exercise upgrade, old/new
application compatibility and application rollback while preserving the
additive schema. No schema-down operation is part of the rollback path.

Este ensaio comprova o mecanismo local/CI. OPS-003 e OPS-004 continuam exigindo
RPO/RTO, storage, configuração, cutover e rollback cronometrados no ambiente-alvo.
