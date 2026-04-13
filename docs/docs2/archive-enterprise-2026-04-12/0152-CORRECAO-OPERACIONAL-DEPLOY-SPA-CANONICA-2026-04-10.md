# 0152 — CORRECAO OPERACIONAL DEPLOY SPA CANONICA — 2026-04-10

## Objetivo

Registrar a correcao operacional que evitou novo deploy do frontend errado e padronizar a SPA como frontend publico canonico do projeto.

## Problema Confirmado

O dominio publico estava servindo o frontend legado/alternativo (`apps/web`) em vez da SPA atual (`apps/spa`).

Isso ocorreu porque:

- `infra/docker/Caddyfile.v2` apontava `his.centroveterinarioguarapiranga.com` para `127.0.0.1:3004`
- em `docker-compose.v2.yml`, `3004` corresponde a `cvg-his-v2-web`
- a SPA atual estava exposta em `3002` via `cvg-his-v2-spa`

Resultado:

- a imagem nova podia ser buildada corretamente
- mas o dominio continuava servindo a interface errada

## Correcao Canonica

O frontend publico canonico do projeto deve ser:

- `apps/spa`
- servico `cvg-his-v2-spa`
- porta publica operacional correspondente ao proxy configurado para a SPA

O frontend `apps/web` nao deve ser publicado como dominio principal se a trilha oficial de produto/operacao estiver na SPA.

## Regras Operacionais Novas

1. O dominio principal deve apontar para a SPA
   - `his.centroveterinarioguarapiranga.com` deve servir `cvg-his-v2-spa`

2. O proxy reverso deve refletir isso explicitamente
   - revisar `infra/docker/Caddyfile.v2`
   - remover ambiguidade documental sobre `apps/web` como frontend principal

3. O compose operacional deve deixar clara a canonicidade da SPA
   - `cvg-his-v2-spa` tratado como frontend publico oficial
   - `cvg-his-v2-web` somente se houver uso secundario/administrativo explicitamente documentado

4. Toda validacao de deploy deve checar o frontend servido no dominio
   - nao basta validar que a imagem foi buildada
   - e obrigatorio validar qual container/porta o dominio publico esta servindo

## Arquivos Que Devem Ser Atualizados

- `infra/docker/Caddyfile.v2`
- `docker-compose.v2.yml`
- `docs/130-instalacao-publicacao-cvg-his-v2-real.md`
- `OPENCLAW_DEPLOY_DIRETRIZES.md`
- `docs/INSTALL-REPORT-2026-04-10.md`
- `docs/Enterprise/0100-EXECUTION-TRACKER.md`

## Ajustes Minimos Esperados

### Proxy

- o dominio principal deve apontar para a SPA
- a observacao que hoje declara `apps/web` como frontend publicado deve ser corrigida

### Documentacao de deploy

- a stack publica oficial deve listar `cvg-his-v2-spa` como frontend canonico
- `apps/web` deve sair da posicao de frontend principal, se ainda estiver descrito assim
- os exemplos de `docker compose build/up` devem refletir a trilha correta

### Validacao pos-deploy

Adicionar checklist explicito:

- confirmar imagem/tag correta do `cvg-his-v2-spa`
- confirmar container real servido no dominio
- confirmar que a UI entregue corresponde a `apps/spa`

## Criterio de Conclusao

So considerar esta correcao operacional encerrada se:

- o proxy publico estiver documentado para a SPA
- o compose e os guias de deploy nao induzirem novo publish de `apps/web` como frontend principal
- o tracker registrar a correcao para evitar regressao operacional

## Saida Esperada

- docs e config de deploy alinhados com a SPA como frontend publico canonico
- ambiguidade entre `apps/web` e `apps/spa` removida
