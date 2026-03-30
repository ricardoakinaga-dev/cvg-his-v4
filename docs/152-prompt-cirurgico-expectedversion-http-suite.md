# PROMPT CIRURGICO — FECHAMENTO DE EXPECTEDVERSION + TESTES HTTP CENTRAIS + SUITE AMPLA

Objetivo:
Executar uma rodada estritamente focada no projeto `cvg-his-v2` para fechar tres bloqueios criticos de prontidao:

1. completar `expectedVersion` com validacao real de conflito
2. expandir os testes HTTP de contrato dos modulos centrais
3. estabilizar a suite ampla da API ate ficar verde e reproduzivel

Esta tarefa NAO deve abrir novos escopos. Ela existe apenas para elevar a confiabilidade tecnica e aproximar o sistema do threshold `85+/100`.

Base obrigatoria:
- `/root/.openclaw/workspace/cvg-his-v2/docs/90-hardening-global.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/98-matriz-prontidao-producao-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/142-prompt-master-recuperacao-85-plus-producao-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/151-prompt-cirurgico-segunda-recuperacao-85-plus.md`

Contexto atual:
- nota estimada: `81-83/100`
- bloqueios mais pesados agora:
  - suite ampla da API ainda nao totalmente verde
  - cobertura HTTP insuficiente dos modulos centrais
  - `expectedVersion` incompleto ou parcial em updates sensiveis

Nao fazer:
- nao implementar observabilidade nesta rodada
- nao reabrir lifecycle transversal nesta rodada
- nao criar novos modulos
- nao mexer em frontend
- nao alterar UX
- nao refatorar arquitetura sem necessidade direta

Ordem obrigatoria:

## Bloco 1 — Completar expectedVersion

Objetivo:
Garantir que updates sensiveis falhem explicitamente em caso de conflito de versao.

Acoes obrigatorias:
- mapear quais modulos ainda estao sem validacao real de `expectedVersion`
- verificar especialmente:
  - `encounters`
  - `medical-records`
  - `prescriptions`
  - `discharges`
  - `inpatient`
  - qualquer outro modulo clinico que ja possua `version`/`versionNumber`
- implementar validacao de conflito explicita no service/update correspondente
- garantir que os contracts compartilhados exponham `expectedVersion` quando necessario
- garantir que testes cubram conflito e update valido

Resultado esperado:
- update com versao divergente retorna erro de conflito previsivel
- update com versao correta continua funcionando

## Bloco 2 — Expandir testes HTTP centrais

Objetivo:
Cobrir contratos HTTP principais dos modulos clinicos centrais que ainda faltam.

Arquivo prioritario:
- `apps/api/src/contract.http.test.ts`

Acoes obrigatorias:
- adicionar cobertura minima para:
  - `medical-records`
  - `prescriptions`
  - `diagnostics`
  - `inpatient`
  - `discharges`
- cobrir no minimo por modulo:
  - create
  - list ou list contextual
  - detail quando aplicavel
  - update ou transicao principal
- validar payloads enriquecidos usados pelo frontend quando isso ja fizer parte do contrato
- validar erro de autorizacao ou validacao minima ao menos nos caminhos criticos

Resultado esperado:
- contratos HTTP centrais ficam protegidos por testes diretos
- regressao de payload deixa de depender so da leitura manual do codigo

## Bloco 3 — Fechar suite ampla da API

Objetivo:
Eliminar os testes residuais que impedem o gate tecnico global de fechar.

Arquivos prioritarios:
- `apps/api/src/runtime.test.ts`
- `apps/api/src/server.ts`
- `apps/api/src/runtime.ts`

Acoes obrigatorias:
- executar a suite ampla
- identificar exatamente os casos restantes
- classificar cada falha:
  - falha real
  - fixture/setup
  - seed/auth
  - teardown
  - async residual
- corrigir cada caso com a menor mudanca possivel
- rerodar ate a suite ampla ficar verde e reproduzivel

Resultado esperado:
- suite ampla da API verde
- gate tecnico global utilizavel

Validacao continua obrigatoria:
- rodar `typecheck`
- rodar `build`
- rodar testes focados dos modulos tocados
- rodar `contract.http.test`
- rodar `runtime.test`
- nao avancar com erro aberto no bloco atual

Criterios de sucesso:
- `expectedVersion` validado nos modulos sensiveis restantes
- `contract.http.test` cobrindo os modulos centrais faltantes
- suite ampla da API verde
- nenhuma regressao funcional introduzida

Entrega final obrigatoria:
1. lista de arquivos alterados
2. lista de arquivos criados
3. resumo do bloco 1
4. resumo do bloco 2
5. resumo do bloco 3
6. resultado do `typecheck`
7. resultado do `build`
8. resultado dos testes HTTP
9. resultado da suite ampla
10. nota estimada atualizada
11. pendencias remanescentes, se houver
12. usar a confirmacao final exata apenas se os criterios forem atingidos:

`Fechamento cirurgico de expectedVersion + testes HTTP + suite ampla concluido`

Se os criterios nao forem atingidos:
- nao use a confirmacao acima
- informe com precisao o que ainda bloqueia o fechamento
