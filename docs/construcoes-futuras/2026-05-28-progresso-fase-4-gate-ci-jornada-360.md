# Progresso Fase 4 - Gate CI da jornada 360

Data: 2026-05-28

## Objetivo

Promover as evidencias E2E da jornada 360 para gate automatizado, conectando o checklist Premium Enterprise a validacao recorrente em CI/release.

## Entregue

- Novo script `pnpm test:e2e:spa:360`.
- O script executa explicitamente:
  - `e2e/spa/master-search-360-reception.spec.ts`;
  - `e2e/spa/master-search-360-mobile.spec.ts`.
- O job `test-e2e-spa` do CI passou a semear admin com as mesmas credenciais usadas pelo Playwright.
- O job `test-e2e-spa` inicia a API com `API_DISABLE_INCOMPATIBLE_DB_REPOS=0`, exigindo repositórios reais quando o PostgreSQL do job esta disponivel.
- O passo `Run SPA E2E tests` deixou de usar `continue-on-error`, tornando a jornada 360 um gate bloqueante.
- O gate foi expandido com `e2e/spa/enterprise-surfaces-gate.spec.ts`, protegendo Dashboard Executivo Premium e Motor Enterprise de Relatorios.

## Evidencia tecnica

- `package.json`
- `.github/workflows/ci.yml`
- `e2e/spa/master-search-360-reception.spec.ts`
- `e2e/spa/master-search-360-mobile.spec.ts`
- `e2e/spa/enterprise-surfaces-gate.spec.ts`
- `playwright-spa.config.ts`

## Validacao executada

- `pnpm test:e2e:spa:360` - 5/5 testes passando localmente.
- `pnpm test:e2e:spa:enterprise` - 7/7 testes passando localmente.
- `node -e "const fs=require('fs'); const YAML=require('yaml'); YAML.parse(fs.readFileSync('.github/workflows/ci.yml','utf8')); console.log('ci yaml ok')"` - workflow YAML parseado com sucesso.

## Impacto Premium Enterprise

O fluxo `Busca Mestre -> cockpit 360 -> recepcao -> cockpit 360 -> esteira` deixa de ser apenas uma evidencia manual/local e passa a ser bloqueio de regressao no pipeline. Isso fortalece o item P0 `Criar E2E dos fluxos criticos` e aproxima o marco `Enterprise Release Candidate`.

## Proximos passos recomendados

- Executar o pipeline remoto e anexar artefatos/sumarios ao relatorio de release candidate.
- Criar relatorio consolidado de readiness com os gates locais e CI.
