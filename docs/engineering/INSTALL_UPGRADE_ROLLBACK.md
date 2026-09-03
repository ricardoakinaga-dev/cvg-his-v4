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

Este ensaio comprova o mecanismo local/CI. OPS-003 e OPS-004 continuam exigindo
RPO/RTO, storage, configuração, cutover e rollback cronometrados no ambiente-alvo.
