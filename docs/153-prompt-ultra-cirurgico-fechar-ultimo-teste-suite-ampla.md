# PROMPT ULTRA-CIRURGICO — FECHAR O ULTIMO TESTE DA SUITE AMPLA

Objetivo:
Fechar exclusivamente o ultimo teste restante da suite ampla da API no projeto `cvg-his-v2`, sem abrir nenhum outro escopo.

Estado atual conhecido:
- suite ampla da API: `51/52`
- unica falha restante:
  - `operational flow supports appointment, queue, encounter lifecycle, triage and timeline`
- erro observado:
  - `Invalid encounter status transition`
- contexto informado:
  - o teste tenta transicionar um `encounter` de `open -> waiting`
  - isso deveria ser valido pelo contrato atual

Missao:
Identificar a causa real dessa unica falha, corrigi-la com a menor mudanca possivel e rerodar a suite ampla ate ela fechar `52/52`.

Base obrigatoria:
- `/root/.openclaw/workspace/cvg-his-v2/docs/90-hardening-global.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/152-prompt-cirurgico-expectedversion-http-suite.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/142-prompt-master-recuperacao-85-plus-producao-enterprise.md`

Escopo permitido:
- `apps/api/src/runtime.test.ts`
- `apps/api/src/runtime.ts`
- `apps/api/src/server.ts`
- `packages/modules/encounters/src/index.ts`
- `packages/modules/encounters/src/repositories/database-encounter.repository.ts`
- helpers/fixtures estritamente necessarios

Nao fazer:
- nao mexer em frontend
- nao abrir novos testes que nao sejam necessarios para reproduzir/corrigir esse caso
- nao reabrir observabilidade
- nao reabrir lifecycle transversal inteiro
- nao refatorar modulos sem relacao com a falha
- nao alterar contratos de dominio sem necessidade direta

Hipoteses obrigatorias a investigar:
1. o `encounter` nao esta mais em `open` no momento da transicao
2. ha reuso indevido de fixture ou ID dentro do teste
3. `expectedVersion` esta interferindo no fluxo e produzindo estado intermediario inesperado
4. `normalizeEncounterStatus` ou logica equivalente nao esta normalizando como esperado
5. o teste executa uma transicao anterior no mesmo `encounter` e depois tenta repetir uma transicao invalida
6. persistencia ou leitura repository-first esta devolvendo estado mais atual que o teste nao esperava

Tarefas obrigatorias:

## Bloco 1 — Reproducao e diagnostico

- executar apenas o teste falho, se possivel, ou o menor subconjunto necessario
- instrumentar temporariamente o teste/fluxo para descobrir:
  - status do `encounter` antes da transicao
  - `version`/`expectedVersion`, se houver
  - ID exato do `encounter`
  - ordem real das transicoes no teste
- remover qualquer instrumentacao temporaria antes de encerrar, se nao for necessaria

## Bloco 2 — Correcao minima

- corrigir com a menor mudanca possivel
- preferir:
  - corrigir ordem do teste
  - isolar fixture
  - corrigir expectedVersion no teste
  - corrigir leitura do estado atual
- somente ajustar service/repository se a causa real estiver no codigo de producao

## Bloco 3 — Validacao final

- rerodar o teste isolado
- rerodar a suite ampla inteira
- rerodar `typecheck` da API
- rerodar `build` da API

Criterios de sucesso:
- teste falho passa
- suite ampla fecha `52/52`
- nenhuma regressao nova aparece
- `typecheck` e `build` da API continuam verdes

Entrega final obrigatoria:
1. lista de arquivos alterados
2. lista de arquivos criados
3. causa raiz encontrada
4. correcao aplicada
5. resultado do teste isolado
6. resultado da suite ampla
7. resultado do `typecheck`
8. resultado do `build`
9. nova nota estimada de prontidao
10. usar a confirmacao final exata apenas se a suite ampla fechar:

`Ultimo teste da suite ampla fechado`

Se a suite ampla nao fechar:
- nao use a confirmacao acima
- informe exatamente o bloqueio residual
