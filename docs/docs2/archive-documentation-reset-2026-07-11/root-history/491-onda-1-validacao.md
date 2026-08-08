# 491 - Relatorio de Validacao da Onda 1

**Data:** 2026-03-31
**Onda:** 1 — Coerencia de base
**Status:** CONCLUIDA

## Entregas concluidas

### B001 - Trilha oficial de migrations declarada

**Decisao:** Drizzle ORM e a trilha oficial de persistencia e migracao.

**Arquivos alterados:**

- `docs/470-politica-migracao-e-deploy.md` — reescrito com decisao oficial
- `docs/130-instalacao-publicacao-cvg-his-v2-real.md` — atualizado para Drizzle
- `docs/131-checklist-cutover-servidor.md` — banco agora referencia Drizzle
- `infra/scripts/cutover-v2.sh` — `apply_v2_schema()` agora usa `tsx packages/db/src/migrate.ts` + `tsx packages/db/src/seed.ts`

**Evidencia:**

- Migration Drizzle `0000_vengeful_pet_avengers.sql` contem 45 tabelas, 28 ENUMs, 126 FKs
- Seed Drizzle popula roles, permissions, account, unit
- Cutover script aplica Drizzle, nao SQL legacy

### B002 - Portas alinhadas

**Correcao:** Caddyfile.v2 tinha as portas invertidas.

**Antes:**

- `his.domain.com` → `127.0.0.1:3000` (API — errado)
- `his-api.domain.com` → `127.0.0.1:3001` (Web — errado)

**Depois:**

- `his.domain.com` → `127.0.0.1:3001` (Web — correto)
- `his-api.domain.com` → `127.0.0.1:3000` (API — correto)

**Arquivos alterados:**

- `infra/docker/Caddyfile.v2` — portas corrigidas + comentarios explicativos
- `docs/130-instalacao-publicacao-cvg-his-v2-real.md` — tabela de portas + proxy documentado

**Evidencia:**

- Compose: API `3000:3001`, Web `3001:3000`
- Caddyfile: Web `:3001`, API `:3000`
- Docs: coerente com compose e Caddyfile

### B003 - READMEs dos apps revisados

**Arquivos alterados:**

- `apps/api/README.md` — reescrito com superficie funcional completa (27 rotas documentadas)
- `apps/worker/README.md` — reescrito com responsabilidades reais e comportamento do loop
- `docs/115-backend-architecture.md` — lacunas atualizadas (4 modulos sem DB injection, dual RBAC)

**apps/web/README.md** ja estava aderente ao estado real — sem alteracoes necessarias.

**apps/api/README.md** antes dizia "Skeleton estrutural aberto na Fase 1". Agora documenta todas as rotas, stack, variaveis de ambiente e comandos de execucao.

**apps/worker/README.md** antes dizia "Skeleton estrutural aberto na Fase 1". Agora documenta responsabilidades, superficie funcional, comportamento do loop e dependencias.

## Metricas da onda 1

| Metrica                                        | Meta | Resultado   |
| ---------------------------------------------- | ---- | ----------- |
| divergencias criticas banco/deploy/docs        | 0    | 0           |
| historias de migrations tratadas como oficiais | 1    | 1 (Drizzle) |
| documentos operacionais divergentes            | 0    | 0           |
| apps com README aderente ao estado real        | 3/3  | 3/3         |
| portas alinhadas entre compose, proxy e docs   | sim  | sim         |

## Impacto na nota

| Eixo                  | Antes | Depois | Delta |
| --------------------- | ----- | ------ | ----- |
| Documentacao viva     | 85    | 90     | +5    |
| Persistencia/deploy   | 65    | 82     | +17   |
| Arquitetura/coerencia | 80    | 85     | +5    |

## Proximo passo

Onda 2 — Gates e repetibilidade (B005, B006, B007, B008)
