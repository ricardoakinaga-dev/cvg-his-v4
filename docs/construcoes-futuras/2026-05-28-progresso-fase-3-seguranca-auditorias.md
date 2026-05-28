# Progresso Fase 3 - F3-03 Seguranca e auditorias

## Objetivo

Endurecer os gates de seguranca do CVG-HIS v4 Premium Enterprise, reduzindo vulnerabilidades criticas/altas, formalizando uma auditoria executavel e impedindo que o CI trate SAST e CVE scan apenas como informativos.

## Entregas realizadas

- Criado o script `pnpm security:enterprise` em `scripts/run-security-audit.mjs`.
- O gate Enterprise executa:
  - `pnpm security:secrets`;
  - `pnpm audit --audit-level=high`;
  - resumo rastreavel das vulnerabilidades moderadas restantes.
- O CI passou a usar `pnpm security:enterprise` no job de dependency audit.
- O Semgrep no CI deixou de usar `continue-on-error`, tornando achados bloqueantes conforme severidade da action.
- Atualizadas dependencias e overrides para remover vulnerabilidades criticas e altas:
  - `drizzle-orm` para faixa corrigida `^0.45.2`;
  - OpenTelemetry `sdk-node` e `exporter-trace-otlp-http` para `^0.218.0`;
  - `vite` fixado em `6.4.2`;
  - `turbo` para `^2.9.14`;
  - overrides de `protobufjs`, `js-cookie`, `fast-uri`, `flatted`, `minimatch`, `picomatch`, `brace-expansion`, `postcss`, `rollup`, `serialize-javascript`, `ws` e plugin Babel vulneravel.
- Mantido o pin operacional de `vue-component-type-helpers` em `3.2.7` no lockfile.
- Ajustado o tipo compartilhado `DatabaseClient` para o cliente Drizzle novo (`NodePgClient`), evitando acoplamento incorreto a `pg.Pool`.

## Resultado do audit

Antes do endurecimento:

- `critical`: 1
- `high`: 23
- `moderate`: 20
- `low`: 1

Depois do endurecimento:

- `critical`: 0
- `high`: 0
- `moderate`: 3
- `low`: 0

As vulnerabilidades moderadas restantes estao concentradas em tooling:

- `esbuild` via `drizzle-kit` / `@esbuild-kit`;
- `ajv` via `eslint@8`.

Esses itens devem ser tratados em um incremento proprio de modernizacao de tooling, com migracao de `drizzle-kit` e ESLint para linhas que removam a dependencia vulneravel sem quebrar geracao de migrations e lint legado.

## Validacoes executadas

- `pnpm security:enterprise` - passou com `0 critical / 0 high`.
- `pnpm --filter @cvg-his-v2/shared-database build` - passou.
- `pnpm --filter @cvg-his/db build` - passou.
- `pnpm --filter @cvg-his-v2/api build` - passou.
- `pnpm --filter @cvg-his-v2/worker build` - passou.
- `pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit` - passou.
- `pnpm --filter @cvg-his-v2/spa build` - passou com PWA `v1.3.0`.

## Atualizacao RC

O incremento posterior `2026-05-28-progresso-rc-seguranca-sbom-sast-evidencias.md` adicionou `pnpm security:evidence`, geracao de SBOM CycloneDX, validacao da configuracao Semgrep/SARIF no CI e upload de artefato `security-evidence`.

## Impacto Enterprise

F3-03 fica atendido como criterio tecnico local de Release Candidate para vulnerabilidades `critical/high`, SBOM e SAST/SARIF. As 3 vulnerabilidades moderadas de tooling permanecem como divida controlada e nao bloqueante; a evidencia final de Semgrep real depende do CI remoto.
