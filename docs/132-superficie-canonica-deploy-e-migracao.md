# 132 - Superficie Canonica de Deploy e Migracao

**Status:** vivo  
**Data de validacao:** 2026-04-12

## Objetivo

Este documento existe para remover ambiguidade operacional. Ele define, sem margem de interpretacao, quais artefatos participam do deploy e da migration oficiais e quais permanecem apenas como legado, suporte residual ou referencia historica.

## Fonte de verdade obrigatoria

### Runtime oficial

- `docker-compose.v2.yml`
- `apps/api`
- `apps/worker`
- `apps/spa`
- `.env.v2`
- `.env.v2.example`
- `infra/docker/Caddyfile.v2`
- `infra/scripts/cutover-v2.sh`
- `infra/scripts/check-cutover-readiness.mjs`

### Precedência por ambiente — PROD-049

Esta lista define a superfície host-based de Compose para desenvolvimento,
rehearsal e cutover. Ela não significa que Compose seja o alvo primário de
staging ou produção. A matriz vinculante por ambiente está em
docs/engineering/environment-runtime-matrix.json e no documento
docs/049-matriz-ambiente-runtime.md:

- desenvolvimento local: docker-compose.dev.yml;
- CI/E2E: docker-compose.e2e.yml em runner efêmero;
- staging e produção: infra/helm/cvg-his-v2 com values do ambiente;
- docker-compose.v2.yml: rehearsal/cutover host-based, nunca substituto do
  alvo Kubernetes de staging/produção.

ADR-011 define Kubernetes/Helm como plataforma dos alvos de staging e
produção; os documentos 130/131 continuam descrevendo a trilha host-based.
Até que Platform e Release owner confirmem alvo, janela e autoridade, a
matriz permanece PROPOSED_PENDING_AUTHORITY.

### Persistencia e migration oficiais

- `packages/db/migrations/*.sql`
- `packages/db/src/migrate.ts`
- `packages/db/src/seed.ts`

## Artefatos tolerados, mas fora da trilha oficial

### Legado de frontend

- `apps/web`
- servico `cvg-his-v2-web` em `docker-compose.v2.yml`

Regra:

- pode existir no repositorio;
- pode existir como `profile legacy`;
- nao entra no build, no `up`, no proxy principal nem no checklist de cutover oficial.

### SQL historico

- `packages/shared/database/src/migrations/*`

Regra:

- permanece apenas como referencia historica;
- nao participa do deploy atual;
- nao deve ser reutilizado em script de migration, checklist ou runbook vivo.

### Compose auxiliares

- `docker-compose.dev.yml`
- `docker-compose.test.yml`
- `docker-compose.e2e.yml`

Regra:

- sao compose de desenvolvimento, teste e automacao;
- nao sao surface de publicacao de producao.

## Artefatos que causam ambiguidade se aparecerem em docs vivas

Se qualquer documento vivo ou script de cutover mandar:

- buildar `cvg-his-v2-web`;
- subir `cvg-his-v2-web` como parte do runtime oficial;
- usar `packages/shared/database/src/migrations/*.sql` como migration principal;
- publicar o dominio principal fora da SPA;
- manter `.env.v2.example` em `NODE_ENV=development` para deploy;

o documento deve ser considerado incorreto e precisa ser corrigido imediatamente.

## Guardrails executaveis

### Validacao documental e operacional

```bash
pnpm deploy:check
```

Esse guardrail valida:

- compose;
- proxy;
- `.env.v2.example`;
- docs vivas de deploy;
- isolamento do legado;
- runner canonico de migrations.

### Cutover oficial

```bash
pnpm deploy:cutover:v2
```

O cutover oficial:

- carrega `.env.v2`;
- falha se `NODE_ENV` nao for production-like, salvo override explicito;
- falha se segredos estiverem em placeholder;
- valida a superficie canonica antes de subir qualquer servico.

## Observacao sobre artefatos gerados

O repositorio ainda possui varios artefatos gerados e historicos fora da trilha minima ideal, como:

- `dist/`
- `coverage/`
- `test-results/`
- `tsconfig.tsbuildinfo`
- capturas e relatorios historicos

Eles nao entram no deploy oficial quando a equipe segue a superficie canonica acima. A limpeza fisica desses itens deve ser tratada como tarefa separada de hygiene de repositorio, para nao misturar hardening operacional com remocao destrutiva em worktree sujo.
