# Matriz visual local cross-browser — 2026-09-18

## Procedimento

A execução foi feita no worktree candidate-bound em
`0d230b65d41cfc3f227c0815bb821369241dcbb7`, com PostgreSQL e Redis descartáveis
isolados, usando as mesmas imagens pinadas do job visual do CI:

- PostgreSQL na porta `5434`, digest `sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685`;
- Redis na porta `6380`, digest `sha256:ff02b58f971e7d7d156a1267e283fcbbeee91773b6aa36c49dac28ecfe28eadf`;
- migrações aplicadas por `infra/scripts/prepare-test-db.mjs` e seed do workflow executado com sucesso;
- `E2E_BROWSER=all pnpm exec playwright test --config playwright-spa.config.ts e2e/spa/visual/visual-regression.spec.ts`.

A primeira tentativa com o ambiente genérico da configuração SPA foi interrompida
porque a API em memória não ficou saudável em 30 segundos. Isso foi uma falha de
preparação do ambiente, não uma promoção de resultado visual. A execução válida
foi repetida com persistência explícita e a API ficou saudável com
`persistence=database` e `productionReady=true`. O log registrou repetidamente
que o papel `cvg_installer` não existe no banco descartável; esse aviso foi
preservado e não foi convertido em sucesso silencioso.

## Resultado

Foram executados `87` casos (`29` por engine):

| Engine | Resultado |
| --- | --- |
| Chromium | `29/29` pass — baseline existente |
| Firefox | `0/29` pass; `29` falhas de comparação |
| WebKit | `0/29` pass; `29` falhas de comparação |

O total foi `29` pass e `58` falhas. As falhas de Firefox e WebKit são diffs
contra snapshots Chromium; o primeiro caso Firefox, por exemplo, registrou
`1949` pixels diferentes. Nenhum snapshot foi atualizado para mascarar a
divergência. Os relatórios temporários em `playwright-report/` e
`test-results/` são ignorados pelo repositório e não foram publicados como
evidência de release; os containers foram encerrados e removidos ao final.

## Decisão

O lane visual Chromium local permanece `PASS` apenas no escopo dos `29` casos
existentes. A matriz cross-browser não está aprovada. A ausência de UAT humano,
NVDA/VoiceOver, perfis de acessibilidade e aprovação visual independente
continua bloqueando a aceitação Triple-A; não há autorização para substituir os
baselines ou declarar cobertura visual completa.
