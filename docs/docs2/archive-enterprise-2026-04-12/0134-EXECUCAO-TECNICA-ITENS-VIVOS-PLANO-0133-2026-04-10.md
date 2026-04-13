# EXECUCAO TECNICA — ITENS VIVOS DO PLANO 0133

**Data:** 10/04/2026
**Status:** PRONTO PARA EXECUCAO
**Escopo:** proxima rodada tecnica do programa, focada exclusivamente nos itens ainda vivos do plano `0133`
**Objetivo:** sair da consolidacao documental e voltar a implementar correcoes estruturais reais no codigo

---

## 1. Estado de Entrada

Estado formal consolidado:

- `BLOCO 1 APROVADO`
- `BLOCO 2 APROVADO`
- `BLOCO 3 EM EXECUCAO`
- `PIX -> BILLING FECHADO`
- `EVENT BUS OPERAVEL COM DLQ + REPROCESS`
- `GAP FRONTEND/BACKEND MAJORITARIAMENTE SOB CONTROLE`
- `SNAPSHOT EXECUTIVO CONSOLIDADO`

Conclusao:

**A proxima rodada nao deve criar nova camada de planejamento.**
**A proxima rodada deve executar apenas as correcoes tecnicas ainda vivas do plano `0133`.**

---

## 2. Fonte de Verdade Obrigatoria

O executor deve usar obrigatoriamente:

- `docs/Enterprise/0133-PLANO-CORRECAO-RELATORIO-AVALIACAO-CONSTRUCAO-2026-04-10.md`
- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0132-SNAPSHOT-EXECUTIVO-PROGRAMA-POS-OPERABILIDADE-EVENT-BUS-2026-04-10.md`

Se a execucao mostrar estado diferente da documentacao:

- a execucao vence;
- os docs devem ser corrigidos no mesmo lote.

---

## 3. Itens Vivos Confirmados do Plano 0133

Os itens a atacar nesta rodada sao somente estes:

1. remover o bloco `pipeline` residual de `turbo.json`
2. limpar exemplos sensiveis/preditivos em OpenAPI e docs expostas
3. endurecer headers de seguranca com:
   - `Content-Security-Policy`
   - `Strict-Transport-Security` condicional a HTTPS
4. validar o estado real de coverage e corrigir qualquer problema de output/reporting
5. elevar thresholds de coverage de forma segura e progressiva
6. iniciar o fatiamento de `apps/api/src/server.ts` no recorte mais viavel

Itens fora deste conjunto nao devem ser reabertos nesta rodada.

---

## 4. Escopo Permitido

Esta rodada pode atuar em:

- `turbo.json`
- `apps/api/src/openapi.yaml`
- `apps/api/src/server.ts`
- arquivos auxiliares extraidos de `server.ts`
- configuracao de headers HTTP da API
- `vitest.config.ts`
- scripts e docs de coverage
- documentacao executiva e operacional diretamente afetada

---

## 5. Escopo Proibido

Nao abrir nesta rodada:

- novas frentes de frontend
- novas frentes de pagamentos
- novas frentes de event bus/webhooks fora do necessario para este plano
- OpenTelemetry, dashboards ou Vault, exceto se forem estritamente necessarios para um dos itens vivos acima
- qualquer reabertura de Bloco 1/2 ou gap frontend/backend sem evidência nova

---

## 6. Frentes Obrigatorias de Implementacao

### F1. Limpeza Estrutural de Build/Tooling

Objetivo:

- remover ambiguidade residual do tooling.

Entregas esperadas:

- `turbo.json` sem o bloco `pipeline` legado;
- manutencao do comportamento atual de build/typecheck.

### F2. Higiene de Exemplos Sensiveis

Objetivo:

- parar de expor exemplos preditivos ou inadequados em OpenAPI/docs publicas.

Entregas esperadas:

- exemplos de credenciais substituidos por placeholders neutros;
- docs alinhadas com o novo padrao.

### F3. Headers de Seguranca

Objetivo:

- endurecer a borda HTTP com controles minimos modernos.

Entregas esperadas:

- `Content-Security-Policy` minima e segura;
- `Strict-Transport-Security` condicional ao ambiente HTTPS;
- manutencao dos headers ja existentes.

### F4. Coverage Confiavel

Objetivo:

- transformar coverage novamente em sinal real e compreensivel.

Entregas esperadas:

- verificacao do output de coverage;
- correcao de qualquer problema de formato/reporting encontrado;
- thresholds elevados com cuidado, sem quebrar artificialmente a base atual.

### F5. Primeiro Corte de Fatiamento do `server.ts`

Objetivo:

- iniciar a reducao do acoplamento do arquivo monolitico sem reescrever o servidor inteiro.

Entregas esperadas:

- extrair um recorte viavel de rotas/handlers auxiliares para arquivo proprio;
- manter runtime, testes e OpenAPI coerentes;
- deixar um padrao claro para proximas extracoes.

---

## 7. Ordem Obrigatoria de Execucao

1. ler o plano `0133`
2. remover `pipeline` residual do `turbo.json`
3. limpar exemplos sensiveis em OpenAPI/docs
4. endurecer headers de seguranca
5. validar/corrigir coverage e ajustar thresholds
6. extrair o primeiro recorte viavel de `server.ts`
7. validar o que foi alterado
8. atualizar tracker e docs
9. emitir o estado final da rodada

---

## 8. Validacoes Minimas Obrigatorias

O executor deve usar validacao real sempre que possivel:

- `pnpm typecheck`
- `pnpm build`
- `pnpm test:coverage`
- testes da API afetados
- `pnpm validate:openapi` se a spec mudar

Se o fatiamento de `server.ts` tocar fluxos operacionais:

- incluir teste adicional ou rerun especifico da API correspondente.

---

## 9. Criterio de Saida Desta Rodada

Esta rodada sera considerada bem-sucedida se houver evidência objetiva de:

- limpeza do tooling residual;
- exemplos sensiveis removidos;
- headers de seguranca endurecidos;
- coverage mais confiavel ou melhor documentado;
- primeiro recorte real de `server.ts` efetuado sem regressao;
- documentacao coerente com o estado executado.

---

## 10. Resultado Esperado do Executor

Ao final, o executor deve devolver:

- quais itens vivos do plano `0133` foram implementados;
- arquivos alterados;
- comandos executados;
- resultados reais;
- docs atualizados;
- decisao final:
  - `PLANO 0133 EXECUTADO COM AVANCO REAL`
  - ou `PLANO 0133 PARCIALMENTE EXECUTADO`
