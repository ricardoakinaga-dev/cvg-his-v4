# CONTINUIDADE — RODADA 2 DO GAP FRONTEND VS BACKEND

**Data:** 10/04/2026
**Status:** EXECUTADO - lote 2 concluido
**Objetivo:** executar o segundo lote de reducao material do gap entre os modulos do backend e a cobertura real da SPA

---

## 1. Estado de Entrada

Estado formal consolidado:

- `BLOCO 1 APROVADO`
- `BLOCO 2 APROVADO`
- `BLOCO 3 EM EXECUCAO`
- `GAP FRONTEND/BACKEND EM REDUCAO REAL`

Estado da rodada anterior desta frente:

- `api-keys` ganhou superficie real
- `auth/mfa` ganhou fluxo real
- `notifications` ganhou superficie real
- SPA permaneceu valida em `typecheck`, `test`, `build`, `test:visual` e `test:e2e:spa`

Conclusao:

**A primeira rodada fechou o lote administrativo inicial.**
**A segunda rodada deve avancar o proximo lote com maior valor operacional imediato.**

---

## 2. Lote Desta Rodada

Lote recomendado para execucao:

1. `notifications-whatsapp`
2. `cash`
3. `counter-sales`
4. `pix`
5. `quotes`

Ordem pratica recomendada:

1. `notifications-whatsapp`
2. `pix`
3. `cash`
4. `counter-sales`
5. `quotes`

Motivo:

- `notifications-whatsapp` e o encaixe mais natural apos `notifications`;
- `pix` conversa diretamente com o BLOCO 3 de integracoes e pagamentos;
- `cash`, `counter-sales` e `quotes` expandem a camada comercial/financeira em sequencia.

---

## 3. Fonte de Verdade Obrigatoria

O executor deve usar obrigatoriamente:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0121-MATRIZ-FECHAMENTO-GAP-FRONTEND-BACKEND-2026-04-10.md`
- `docs/Enterprise/0114-PIX-INTEGRATION.md`
- `docs/Enterprise/1050-API-PREMIUM-OPENAPI.md`
- `docs/Enterprise/203-BACKLOG-ONDA-3.md`

Se a execucao mostrar estado diferente da documentacao:

- a execucao vence;
- os docs devem ser corrigidos no mesmo lote.

---

## 4. Escopo Permitido

Esta rodada pode atuar em:

- novas rotas da SPA;
- novas paginas list/detail/form quando fizer sentido;
- servicos de integracao da SPA com API real;
- ajustes de navegacao e shell da SPA;
- testes unitarios, visuais e E2E ligados ao novo lote;
- documentacao operacional e tracker ligados a esta rodada.

---

## 5. Escopo Proibido

Nao abrir nesta rodada:

- redesign amplo da SPA;
- remediacoes de Bloco 1 ou 2 sem evidência nova;
- expansao ampla de modulos backend-only como `audit`, `event-bus`, `ml`, `soc2`;
- novas frentes fora do lote desta rodada.

---

## 6. Tarefas de Construcao

### T1. Fechar `notifications-whatsapp`

Objetivo:

- criar a superficie operacional complementar ao modulo `notifications`.

Trabalho esperado:

- rotas e pagina real;
- leitura de configuracoes/status quando aplicavel;
- acao operacional coerente com o backend existente;
- integracao real com API.

### T2. Fechar `pix`

Objetivo:

- levar a trilha inicial de pagamentos para a SPA.

Trabalho esperado:

- rota e pagina real para intents/operacoes PIX;
- integracao com a superficie aberta no BLOCO 3;
- exibicao do estado minimo do fluxo financeiro;
- coerencia com a abstracao segura de pagamentos.

### T3. Abrir `cash` e `counter-sales`

Objetivo:

- iniciar a camada operacional de caixa e venda assistida.

Trabalho esperado:

- identificar a menor superficie util de cada modulo;
- criar paginas reais, mesmo que o primeiro corte seja enxuto;
- evitar mock estrutural sem backend real.

### T4. Abrir `quotes`

Objetivo:

- iniciar a trilha comercial de orcamentos.

Trabalho esperado:

- rota e pagina inicial;
- integracao com API real quando houver;
- encaixe coerente na navegacao e no shell.

### T5. Atualizar documentacao operacional

Atualizar:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0121-MATRIZ-FECHAMENTO-GAP-FRONTEND-BACKEND-2026-04-10.md`
- este arquivo

---

## 7. Ordem Obrigatoria de Execucao

1. ler os docs de fonte de verdade
2. confirmar o lote desta rodada no codigo
3. construir `notifications-whatsapp`
4. construir `pix`
5. abrir `cash`
6. abrir `counter-sales`
7. abrir `quotes`
8. validar SPA e integracoes
9. atualizar docs
10. emitir o estado final da rodada

---

## 8. Validacoes Minimas Obrigatorias

O executor deve usar validacao real sempre que possivel:

- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa test`
- `pnpm --filter @cvg-his-v2/spa build`
- `pnpm test:visual`
- `pnpm test:e2e:spa`

Se o lote tocar contratos/API:

- validar tambem os endpoints ou modulos correspondentes do backend.

---

## 9. Criterio de Saida Desta Rodada

Esta rodada sera considerada bem-sucedida se houver evidência objetiva de:

- `notifications-whatsapp` com superficie real;
- `pix` com superficie real;
- avancos materiais em `cash`, `counter-sales` e `quotes`;
- SPA continuando verde nos gates principais;
- documentacao coerente com o estado executado.

---

## 10. Resultado Esperado do Executor

Ao final, o executor deve devolver:

- lote executado;
- o que foi implementado em cada modulo;
- rotas e paginas criadas;
- arquivos alterados;
- comandos executados;
- resultados reais;
- docs atualizados;
- decisao final:
  - `GAP FRONTEND/BACKEND CONTINUA EM REDUCAO REAL`
  - ou `RODADA 2 SEM AVANCO MATERIAL`

---

## 11. Resultado da Rodada

- Lote executado: `notifications-whatsapp`, `pix`, `cash`, `counter-sales`, `quotes`
- O que foi implementado: inbound WhatsApp real em `/notifications/whatsapp`; intent PIX real em `/pix`; entrada de caixa operacional em `/cash`; conversão real de orçamento em venda assistida em `/counter-sales`; workspace operacional de orçamentos em `/quotes`
- Rotas e páginas criadas: `/notifications/whatsapp`, `/pix`, `/cash`, `/counter-sales`, `/quotes`
- Arquivos alterados: SPA, testes unitários, nav do shell, serviços novos, tracker e docs de bloco/gap
- Comandos executados: `pnpm --filter @cvg-his-v2/spa typecheck`, `pnpm --filter @cvg-his-v2/spa test`, `pnpm --filter @cvg-his-v2/spa build`, `pnpm test:visual`, `pnpm test:e2e:spa`
- Resultados reais: `PASS` em typecheck, test, build, visual e e2e
- Docs atualizados: `0100-EXECUTION-TRACKER.md`, `0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`, `0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`, `0121-MATRIZ-FECHAMENTO-GAP-FRONTEND-BACKEND-2026-04-10.md`
- Decisão final: `GAP FRONTEND/BACKEND CONTINUA EM REDUCAO REAL`
