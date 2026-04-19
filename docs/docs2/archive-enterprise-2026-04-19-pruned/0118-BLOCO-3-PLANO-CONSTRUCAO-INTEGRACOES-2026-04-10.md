# BLOCO 3 — PLANO DE CONSTRUCAO: INTEGRACOES, EVENTOS E SUPERFICIE EXTERNA

**Data:** 10/04/2026
**Status:** EM EXECUCAO
**Dependencia:** Bloco 2 aprovado
**Objetivo:** iniciar a fase de integracoes do programa sobre a base enterprise ja estabilizada

---

## 1. Missao do Bloco

O `BLOCO 3` existe para transformar a base estabilizada em uma plataforma efetivamente integravel por eventos, contratos externos e provedores.

Este bloco nao reabre remediacoes de base.
Este bloco inicia construcao de capacidade externa.

Ao final dele, o programa deve avancar materialmente em:

1. backbone assincrono baseado em eventos;
2. trilha operacional de webhooks;
3. superficie de API premium pronta para terceiros;
4. base arquitetural segura para integracoes de pagamento.

---

## 2. Estado de Entrada

Pre-condicoes ja consolidadas:

- `BLOCO 1 APROVADO`
- `BLOCO 2 APROVADO`
- `pnpm typecheck` PASS
- `pnpm build` PASS
- `pnpm test:critical` PASS
- OpenAPI runtime PASS
- RLS/LGPD PASS
- `pnpm test:e2e:spa` PASS
- `pnpm test:visual` PASS

Conclusao:

**O programa entra no BLOCO 3 com base tecnica utilizavel e gates de confianca fechados.**

---

## 3. Fonte de Verdade Obrigatoria

O executor deve usar obrigatoriamente:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0111-PLANO-OPERACIONAL-CONSOLIDADO-FINAL-2026-04-10.md`
- `docs/Enterprise/0113-BLOCO-2-PLANO-CONSTRUCAO-ELEVACAO-E-PADRAO-ENTERPRISE-2026-04-10.md`
- `docs/Enterprise/0117-PLANO-CONTINUIDADE-POS-BLOCO-2-E-ABERTURA-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/103-ONDA-3-INTEGRACOES-API.md`
- `docs/Enterprise/0117-EVENT-BUS.md`
- `docs/Enterprise/1050-API-PREMIUM-OPENAPI.md`
- `docs/Enterprise/0114-PIX-INTEGRATION.md`
- `docs/Enterprise/200-BACKLOG-MASTER.md`
- `docs/Enterprise/203-BACKLOG-ONDA-3.md`

---

## 4. Frentes Iniciais do BLOCO 3

As frentes de entrada deste bloco sao:

1. `E3-01` — Event Bus e arquitetura assincrona
2. `E3-05` — Webhooks e API premium
3. `E3-02` — Integracao de pagamentos

Ordem pratica recomendada:

1. Event Bus
2. Webhooks/API Premium
3. Pagamentos

Motivo:

- Event Bus e Webhooks consolidam o backbone externo;
- API premium fecha a superficie publica de integracao;
- pagamentos devem entrar depois que a arquitetura de eventos e contratos estiver mais firme.

---

## 5. Escopo Permitido

Esta etapa pode atuar em:

- modulos de event bus;
- modulos de webhooks;
- contratos OpenAPI e API premium ligados a integracoes;
- runtime/API/worker que sustentam essas integracoes;
- adaptadores e infraestrutura de pagamento em nivel inicial;
- documentacao operacional e tracker ligados a essas frentes.

---

## 6. Escopo Proibido

Nao abrir nesta etapa:

- regressao de Bloco 1 ou 2 sem evidência nova;
- redesign de frontend;
- expansao ampla de IA/ML;
- expansao ampla de compliance fora do necessario para integracoes;
- integracoes externas sem contrato ou sem validacao minima.

---

## 7. Tarefas de Construcao

### T1. Consolidar Event Bus

Objetivo:

- transformar o event backbone existente em trilha operacional clara e utilizavel por integracoes.

Trabalho esperado:

- revisar o modulo `event-bus` e seu uso real em API/Worker;
- definir contratos minimos de publicacao e consumo;
- validar persistencia, dispatch e observabilidade basica dos eventos;
- registrar o catalogo minimo de eventos usados nesta fase.

### T2. Consolidar Webhooks e API Premium

Objetivo:

- transformar a superficie externa ja iniciada em capacidade integravel verificavel.

Trabalho esperado:

- revalidar e completar o modulo `webhooks`;
- reforcar contrato externo via OpenAPI quando necessario;
- alinhar autenticacao, escopo e trilha de auditoria para uso por terceiros;
- garantir comportamento previsivel de entrega e reentrega quando aplicavel.

### T3. Abrir a trilha inicial de pagamentos

Objetivo:

- iniciar a base arquitetural de integracao de pagamentos sem acoplamento prematuro a um provedor final.

Trabalho esperado:

- ler `0114-PIX-INTEGRATION.md`;
- identificar a abstração de gateway/pagamento adequada;
- definir a primeira superficie executavel de pagamentos;
- evitar dependencia irreversivel de implementacao fiscal ou vendor-specific antes da base estar pronta.

---

## 8. Progresso Executado Nesta Rodada

- `E3-01` Event Bus: outbox operacional no runtime da API, eventos de dominio publicados na API e drenados pelo worker; testes de event bus e runtime passaram.
- `E3-05` Webhooks e API Premium: rota de teste de webhook, rotas de `api-keys`, catalogo premium e superficie `X-API-Key` documentadas e executando.
- `E3-02` Pagamentos: abstracao segura `LocalPixPaymentGateway` aberta e primeira intent PIX executavel em `POST /payments/pix/intents`.
- Lote SPA de apoio ao bloco: `api-keys`, `auth` / `mfa` e `notifications` foram materializados como superficie real para reduzir o gap frontend/backend, com testes e gates da SPA passando.
- Rodada 2 do gap frontend/backend: `notifications-whatsapp`, `pix`, `cash`, `counter-sales` e `quotes` passaram a ter superficie SPA real; o shell recebeu navegação correspondente e os gates da SPA permaneceram verdes.
- Rodada 3 do gap frontend/backend (cluster clinico expandido): `diagnostics`, `prescriptions`, `prescription-executions`, `discharges` e `surgery` ganharam superficies reais na SPA; todos integrados via servicos existentes; gates SPA verdes (typecheck PASS, test 497/497 PASS, visual 9/9 PASS, e2e 22/22 PASS).

---

## 9. Ordem Obrigatoria de Execucao

1. ler tracker e plano consolidado
2. ler docs de Onda 3 e frentes de integracao
3. consolidar `E3-01` Event Bus
4. consolidar `E3-05` Webhooks e API premium
5. abrir `E3-02` Pagamentos com superficie inicial segura
6. validar o que foi implementado
7. atualizar tracker e docs afetados
8. emitir estado final do BLOCO 3 parcial

---

## 10. Validacoes Minimas Obrigatorias

O executor deve usar validacao real sempre que possivel, incluindo:

- `pnpm typecheck`
- `pnpm build`
- testes dos modulos afetados
- testes/integracoes de event bus
- testes/integracoes de webhooks
- validacao de OpenAPI, se contratos forem alterados

Se pagamentos ganharem implementacao executavel nesta etapa:

- incluir teste minimo de contrato, adapter ou fluxo inicial

---

## 11. Criterio de Saida Desta Etapa

Esta etapa sera considerada bem-sucedida se houver evidência objetiva de:

- avancos reais em `E3-01`
- avancos reais em `E3-05`
- abertura concreta e segura de `E3-02`
- documentacao coerente com o estado executado

Nao e necessario declarar o BLOCO 3 inteiro concluido nesta primeira rodada.
E necessario deixar o BLOCO 3 oficialmente em execucao real, com entregas verificaveis.

---

## 12. Resultado Esperado do Executor

O executor deve devolver:

- leitura consolidada da entrada do BLOCO 3;
- o que foi implementado em Event Bus;
- o que foi implementado em Webhooks/API premium;
- o que foi aberto em Pagamentos;
- validacoes executadas;
- docs atualizados;
- decisao final:
  - `BLOCO 3 EM EXECUCAO`
  - ou `BLOCO 3 NAO INICIADO`
