# 0162 - Classificacao de Referencias Web Remanescentes

**Status:** vivo
**Data:** 2026-04-11
**Objetivo:** separar as referencias restantes a `apps/web` e `cvg-his-v2-web` em tres grupos: legado aceitavel, historico e residuo operacional.

## 1. Leitura executiva

O frontend oficial alvo do programa agora e `apps/spa`.

As referencias restantes a `apps/web` e `cvg-his-v2-web` no repositorio estao concentradas em:

- documentos que registram o estado historico anterior da arquitetura
- documentos e scripts operacionais que agora marcam `web` como legado

Nao foi encontrado, nesta varredura final, nenhum documento vivo que ainda deva ser interpretado como instrucao para publicar `apps/web` como frontend principal.

## 2. Referencias que permanecem por necessidade de legado

Esses arquivos ainda podem mencionar `web`, mas a leitura correta e historica/legada:

- [README.md](/root/.openclaw/workspace/cvg-his-v2/README.md)
- [OPENCLAW_DEPLOY_DIRETRIZES.md](/root/.openclaw/workspace/cvg-his-v2/OPENCLAW_DEPLOY_DIRETRIZES.md)
- [docs/README.md](/root/.openclaw/workspace/cvg-his-v2/docs/README.md)
- [docs/112-target-architecture.md](/root/.openclaw/workspace/cvg-his-v2/docs/112-target-architecture.md)
- [docs/114-frontend-architecture.md](/root/.openclaw/workspace/cvg-his-v2/docs/114-frontend-architecture.md)
- [docs/130-instalacao-publicacao-cvg-his-v2-real.md](/root/.openclaw/workspace/cvg-his-v2/docs/130-instalacao-publicacao-cvg-his-v2-real.md)
- [docs/401-auditoria-critica-cvg-his-v2.md](/root/.openclaw/workspace/cvg-his-v2/docs/401-auditoria-critica-cvg-his-v2.md)
- [docs/410-matriz-aderencia-documental.md](/root/.openclaw/workspace/cvg-his-v2/docs/410-matriz-aderencia-documental.md)
- [docs/470-politica-migracao-e-deploy.md](/root/.openclaw/workspace/cvg-his-v2/docs/470-politica-migracao-e-deploy.md)
- [infra/docker/Caddyfile.v2](/root/.openclaw/workspace/cvg-his-v2/infra/docker/Caddyfile.v2)
- [infra/scripts/cutover-v2.sh](/root/.openclaw/workspace/cvg-his-v2/infra/scripts/cutover-v2.sh)

## 3. Classificacao por impacto

### 3.1 Legado aceitavel

Referencias que podem permanecer, desde que estejam claramente rotuladas:

- `README.md`
- `OPENCLAW_DEPLOY_DIRETRIZES.md`
- `docs/README.md`
- `docs/112-target-architecture.md`
- `docs/114-frontend-architecture.md`
- `docs/401-auditoria-critica-cvg-his-v2.md`
- `docs/410-matriz-aderencia-documental.md`
- `docs/470-politica-migracao-e-deploy.md`
- `infra/docker/Caddyfile.v2`
- `infra/scripts/cutover-v2.sh`

Motivo:

- registram a migracao
- deixam claro que `web` e legado
- evitam apagar o historico operacional que ainda e util para rollback e auditoria

### 3.2 Historico puro

Esses arquivos ainda falam de `web`, mas isso e correto apenas como documento de epoca:

- relatórios e auditorias antigas em `docs/`
- documentos de validação de fases antigas
- artefatos em `docs/Enterprise/` anteriores ao corte SPA

Motivo:

- servem como trilha de audicao e comparacao
- nao devem ser usados como instrucao de deploy atual

### 3.3 Residuo operacional

Nao restou residuo operacional ativo do `web` na trilha Systemd.

## 4. Conclusao

O repositorio ja esta coerente com a decisao:

- `apps/spa` e o frontend oficial alvo
- `apps/web` ficou como legado de transicao
- referencias restantes a `web` agora estao majoritariamente em contexto historico

Se aparecer nova referencia a `apps/web` em documento vivo, a regra e simples:

1. se for deploy, trocar para `apps/spa`
2. se for comparacao historica, marcar explicitamente como legado
3. se for runtime, remover ou converter em fallback documentado
