# Progresso RC - Cutover Rehearsal Local

Data: 2026-05-28

## Objetivo

Reduzir a pendencia de deploy/cutover real criando um ensaio local reexecutavel da superficie Docker Compose canonica, sem publicar portas e sem tocar a stack principal.

## Entrega

- Criado `infra/scripts/cutover-rehearsal-local.mjs`.
- Criado o comando `pnpm deploy:rehearsal:local`.
- O readiness passou a exigir a existencia do comando.
- O pacote `pnpm rc:evidence` passou a executar o rehearsal local.

## Evidencia executada

Primeira execucao encontrou uma condicao real de ambiente:

```text
Bind for :::5432 failed: port is already allocated
```

O rehearsal foi ajustado para usar um override Compose temporario sem portas publicadas para Postgres/Redis e rede isolada por projeto.

Comando aprovado:

```bash
pnpm deploy:rehearsal:local
```

Artefato gerado:

```text
/tmp/cvg-his-v2-cutover-rehearsals/20260528T130955Z-1414576/cutover-rehearsal-report.json
```

Resumo:

```json
{
  "projectName": "cvg-his-v2-rehearsal-1414576",
  "servicesStarted": ["postgres", "redis"],
  "postgresStatus": "healthy",
  "redisStatus": "healthy"
}
```

## Impacto no RC

O deploy/cutover deixa de depender apenas de validacao estatica. Agora existe um ensaio local que:

- valida `check-cutover-readiness`;
- renderiza `docker compose config`;
- sobe dependencias canonicas em projeto isolado;
- valida healthcheck de Postgres e Redis;
- gera `cutover-rehearsal-report.json`;
- derruba volumes e containers ao final.

Isso nao substitui o cutover final no ambiente alvo, mas antecipa falhas de compose, secrets minimos, rede, healthcheck e runtime base.
