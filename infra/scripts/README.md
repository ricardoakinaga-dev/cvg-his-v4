# Infra Scripts

Scripts operacionais para deployment, backup e validação do CVG-HIS V2.

## Scripts de Infraestrutura

| Script | Descrição |
|--------|-----------|
| `bootstrap-local.mjs` | Orienta subida local do workspace |
| `check-health.mjs` | Valida endpoint de health da API |
| `check-staging.mjs` | Valida env mínima de staging e opcionalmente consulta `STAGING_READY_URL` |
| `check-cutover-readiness.mjs` | Valida se compose, proxy, env example e docs vivas continuam alinhados ao `apps/spa` e ao runner canônico de migrations |
| `cutover-v2.sh` | Executa backup operacional, sobe `docker-compose.v2.yml`, valida `/health` e `/ready`, e grava evidência `cutover-readiness.json` + `cutover-report.json` |
| `prepare-test-db.mjs` | Prepara banco de dados de teste |
| `run-e2e-spa.sh` | Executa testes e2e da SPA |
| `serve-spa-e2e.mjs` | Sirve SPA local para testes e2e |
| `test-critical-bootstrap.mjs` | Valida migrations e bootstrap do banco |

## Scripts de Backup e Restore (Sprint 6 — Operacao Auditavel)

| Script | Descrição |
|--------|-----------|
| `backup-v2.sh` | Backup automatizado de PostgreSQL, storage e metadados com retenção e checksums |
| `restore-drill-v2.sh` | Restore drill real em Postgres descartável e workspace temporário de storage, com evidência ponta a ponta |
| `restore-backup.sh` | Restore manual/interativo legado; não é o fluxo oficial validado do bundle V2 |

### backup-v2.sh

Script principal de backup. Executa com `sudo` para garantir acesso a volumes Docker.

```bash
# Backup padrão (diretorio: /var/backups/cvg-his-v2, retenção: 7 dias)
sudo ./backup-v2.sh

# Backup customizado
sudo BACKUP_BASE_DIR=/mnt/backups/cvg-his-v2 BACKUP_RETENTION_DAYS=30 ./backup-v2.sh

# Pular storage (mais rápido, apenas DB)
sudo BACKUP_INCLUDE_STORAGE=false ./backup-v2.sh
```

**O que faz:**
1. `pg_dump` do PostgreSQL (formato custom, compressão 9)
2. `pg_dumpall --globals-only` para roles e configs
3. Tar do storage (`/srv/cvg-his-v2/storage`)
4. Metadados (compose-ps, volumes, env keys)
5. SHA256 checksums de todos os artefatos
6. Manifest JSON com restore hints
7. Limpeza de backups com mais de `RETENTION_DAYS` dias

**Estrutura do backup:**
```
/var/backups/cvg-his-v2/backup-{TIMESTAMP}/
  database/
    cvg_his_v2.dump      # pg_dump custom format
    postgres-globals.sql  # roles e settings
    backup.info           # metadados do backup
  storage/
    file-storage.tar.gz  # arquivos da aplicação
    file-storage.contents.txt
  meta/
    manifest.json         # hints de restore
    restore-hints.txt     # comandos de restore
    compose-ps.txt
    docker-volume-ls.txt
    env.keys.txt
  SHA256SUMS             # checksums
```

**Pré-requisitos:**
- `docker` e `docker compose` disponíveis
- `POSTGRES_PASSWORD` no `.env.v2`
- Acesso sudo para volumes Docker

### restore-drill-v2.sh

Script oficial do `IMP-208`. Executa um drill real de recuperação sem tocar a stack viva.

```bash
# Drill sobre o bundle mais recente
pnpm ops:restore:drill:v2

# Drill sobre um bundle específico
pnpm ops:restore:drill:v2 -- imp207-20260412T065850Z

# Drill preservando o runtime descartável para inspeção manual
KEEP_RUNTIME=true pnpm ops:restore:drill:v2 -- latest
```

**O que valida:**
1. `sha256sum -c` do bundle inteiro
2. `postgres-globals.sql` aplicado em Postgres descartável
3. restore real do `pg_dump` custom para banco temporário
4. contagem e listagem de tabelas públicas restauradas
5. restore do storage em workspace temporário
6. diff entre `file-storage.contents.txt` e o conteúdo realmente restaurado

**Saída principal:**
- diretório de evidência em `/tmp/cvg-his-v2-restore-drills/*`
- `restore-drill-report.txt`
- `restore-drill-report.json`
- `db-restore.log`
- `restored-public-tables.txt`
- `restored-storage.contents.txt`

### restore-backup.sh

Script interativo legado de restore. Mantido para suporte manual, mas o fluxo validado da Sprint 6 para bundle V2 é o `restore-drill-v2.sh`.

```bash
# Restaurar do backup mais recente
sudo ./restore-backup.sh latest

# Restaurar de um backup específico
sudo ./restore-backup.sh backup-20260412T143022Z

# Verificar integridade sem restaurar
sudo ./restore-backup.sh backup-20260412T143022Z --verify

# Dry run (mostrar o que faria)
sudo ./restore-backup.sh backup-20260412T143022Z --dry-run

# Restaurar só PostgreSQL
sudo ./restore-backup.sh backup-20260412T143022Z --skip-storage --skip-redis
```

**Opções:**
- `--verify` — Verifica integridade do backup (SHA256 checksums)
- `--dry-run` — Mostra o que faria sem executar
- `--skip-storage` — Pula restore do storage
- `--skip-redis` — Pula restore do Redis
- `--backup-dir DIR` — Diretório customizado de backups

### Exemplo de uso operacional

```bash
# 1. Parar serviços antes de restore
docker compose -p cvg-his-v2 stop api worker

# 2. Fazer backup antes de restaurar (precaução)
sudo ./backup-v2.sh

# 3. Listar backups disponíveis
ls /var/backups/cvg-his-v2/

# 4. Executar restore drill real sobre o bundle
pnpm ops:restore:drill:v2 -- backup-20260412T143022Z

# 5. Revisar a evidência produzida
ls /tmp/cvg-his-v2-restore-drills/

# 6. Se for necessário restore manual depois do drill, usar o script legado
sudo ./restore-backup.sh backup-20260412T143022Z
```

### Configurar backup automático (cron)

```bash
# Adicionar ao crontab - backup diário às 3h da manhã
sudo crontab -e

# 0 3 * * * cd /root/.openclaw/workspace/cvg-his-v2 && ./infra/scripts/backup-v2.sh >> /var/log/cvg-his-v2-backup.log 2>&1
```

### Restaurar sem o script (manual)

```bash
# 1. Identificar o backup
BACKUP_DIR=/var/backups/cvg-his-v2/backup-20260412T143022Z

# 2. Verificar checksums
cd "$BACKUP_DIR" && sha256sum -c SHA256SUMS

# 3. Restaurar PostgreSQL
PGPASSWORD=xxx pg_restore -h localhost -U postgres -d cvg_his_v2 --clean --if-exists --no-owner database/cvg_his_v2.dump

# 4. Restaurar storage
tar -C /srv/cvg-his-v2/storage -xzf storage/file-storage.tar.gz

# 5. Validar
curl http://localhost:3003/health
```
### cutover-v2.sh

Fluxo oficial de readiness e cutover do runtime V2. Além dos logs já existentes, agora grava evidência estruturada:

- `cutover-readiness.json` com o resultado machine-readable do guardrail `check-cutover-readiness.mjs --json`
- `cutover-report.json` com endpoints validados, arquivos usados e flags operacionais do cutover
