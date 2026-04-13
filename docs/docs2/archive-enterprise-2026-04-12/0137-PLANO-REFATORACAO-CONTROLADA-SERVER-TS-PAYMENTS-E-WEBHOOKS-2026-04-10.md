# PLANO DE REFATORACAO CONTROLADA — `apps/api/src/server.ts` (PAYMENTS E WEBHOOKS)

**Data:** 10/04/2026
**Status:** PRONTO PARA EXECUCAO
**Escopo:** primeiro recorte seguro do `server.ts`
**Objetivo:** iniciar a reducao controlada do acoplamento em `apps/api/src/server.ts` extraindo o dominio de `payments` e `webhooks`

---

## 1. Estado de Entrada

Estado formal consolidado:

- `BLOCO 1 APROVADO`
- `BLOCO 2 APROVADO`
- `BLOCO 3 EM EXECUCAO`
- `PLANO 0133 EXECUTADO COM AVANCO REAL`

Estado tecnico relevante:

- `apps/api/src/server.ts` permanece excessivamente grande;
- a frente mais segura para iniciar a extracao e o recorte de `payments` e `webhooks`;
- esses dominios ja possuem superficie real, contratos definidos e validacao previa.

Conclusao:

**A proxima rodada nao deve refatorar o servidor inteiro.**
**A proxima rodada deve fazer um primeiro recorte pequeno, seguro e verificavel.**

---

## 2. Missao Desta Continuidade

Executar a primeira refatoracao controlada de `apps/api/src/server.ts`, extraindo o dominio de:

1. `payments`
2. `webhooks`

Objetivo principal:

- reduzir o tamanho e o acoplamento do arquivo principal;
- manter runtime, testes e OpenAPI coerentes;
- estabelecer um padrao replicavel para futuras extracoes.

---

## 3. Fonte de Verdade Obrigatoria

O executor deve usar obrigatoriamente:

- `docs/Enterprise/0134-EXECUCAO-TECNICA-ITENS-VIVOS-PLANO-0133-2026-04-10.md`
- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0114-PIX-INTEGRATION.md`
- `docs/Enterprise/1050-API-PREMIUM-OPENAPI.md`

Se a execucao mostrar estado diferente da documentacao:

- a execucao vence;
- os docs devem ser corrigidos no mesmo lote.

---

## 4. Escopo Permitido

Esta continuidade pode atuar em:

- `apps/api/src/server.ts`
- novos arquivos auxiliares de rotas/handlers para `payments`
- novos arquivos auxiliares de rotas/handlers para `webhooks`
- testes da API afetados
- OpenAPI/runtime, se exigido pela extracao
- documentacao operacional e tracker ligados a esta rodada

---

## 5. Escopo Proibido

Nao abrir nesta rodada:

- refatoracao ampla de todo o servidor;
- mudancas arquiteturais grandes no runtime;
- mudancas de contrato desnecessarias;
- novas frentes de frontend;
- refatoracoes em dominios nao relacionados a `payments` e `webhooks`.

---

## 6. Frentes Obrigatorias de Implementacao

### F1. Extracao de Payments

Objetivo:

- retirar do `server.ts` o primeiro conjunto viavel de handlers de pagamentos.

Entregas esperadas:

- arquivo dedicado para rotas/handlers de `payments`;
- ligacao clara com as dependencias de runtime;
- manutencao do comportamento atual e dos contratos existentes.

### F2. Extracao de Webhooks

Objetivo:

- retirar do `server.ts` o primeiro conjunto viavel de handlers de webhooks.

Entregas esperadas:

- arquivo dedicado para rotas/handlers de `webhooks`;
- manutencao dos fluxos administrativos ja implementados;
- integracao clara com servicos e runtime.

### F3. Padrao de Extracao

Objetivo:

- deixar o primeiro recorte como modelo para futuras refatoracoes do servidor.

Entregas esperadas:

- estrutura clara de imports/dependencias;
- nenhum drift de OpenAPI/runtime;
- testes passando apos a extracao.

---

## 7. Ordem Obrigatoria de Execucao

1. ler os docs de fonte de verdade
2. mapear no `server.ts` os blocos atuais de `payments`
3. extrair `payments`
4. mapear no `server.ts` os blocos atuais de `webhooks`
5. extrair `webhooks`
6. garantir coerencia de imports, runtime e OpenAPI
7. validar o que foi alterado
8. atualizar tracker e docs
9. emitir o estado final da rodada

---

## 8. Validacoes Minimas Obrigatorias

O executor deve usar validacao real sempre que possivel:

- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/api build`
- testes da API afetados
- `pnpm validate:openapi` se a extracao tocar a spec ou o runtime contratual

---

## 9. Criterio de Saida Desta Rodada

Esta rodada sera considerada bem-sucedida se houver evidência objetiva de:

- extracao real de `payments` e/ou `webhooks` para arquivos dedicados;
- reducao do acoplamento de `server.ts`;
- manutencao do comportamento e dos testes;
- documentacao coerente com o novo estado.

---

## 10. Resultado Esperado do Executor

Ao final, o executor deve devolver:

- quais blocos foram extraidos de `server.ts`;
- para quais arquivos eles foram movidos;
- como a coerencia com runtime/OpenAPI foi preservada;
- arquivos alterados;
- comandos executados;
- resultados reais;
- docs atualizados;
- decisao final:
  - `REFATORACAO CONTROLADA DO SERVER AVANCOU`
  - ou `REFATORACAO CONTROLADA DO SERVER SEM AVANCO SUFICIENTE`
