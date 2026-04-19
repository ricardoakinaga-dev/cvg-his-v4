# PLANO MESTRE — EXECUCAO INTEGRAL DO BLOCO 3

**Data:** 10/04/2026
**Status:** EM EXECUCAO — rodadas 1 a 6+ executadas
**Escopo:** construcao integral da etapa atual do projeto
**Objetivo:** orientar uma execucao completa, sequencial e verificavel do BLOCO 3 do programa CVG-HIS-V2 Enterprise

---

## 1. Contexto Oficial

O projeto entra neste plano com o seguinte estado formal:

- `BLOCO 1 APROVADO`
- `BLOCO 2 APROVADO`
- `BLOCO 3 EM EXECUCAO`

O BLOCO 3 corresponde operacionalmente a **Onda 3 — Integracoes**.

Esta etapa nao existe para remediar fundacao.
Esta etapa existe para construir capacidade externa real sobre a base enterprise ja estabilizada.

**Estado consolidado apos rodadas executadas:**
- Event Bus: outbox + retry/DLQ + subscriber pattern + catalogo de eventos
- Webhooks: endpoint de teste `POST /webhooks/{id}/test` + delivery com retry
- API Premium: OpenAPI com 112 paths, API keys, rate limiting
- PIX: intent + confirmacao + `payment.pix.confirmed` + handler PIX->Billing
- Billing: `settleByRecordId()` + `billing.status_changed` via event bus
- GAP Frontend/Backend: 5 rodadas executadas cobrindo a maioria das superficies
- GAP Remanescente: REDUZIDO MATERIALMENTE (attachments como fluxo embutido em encounters; mfa aprofundado em UserDetailPage)

- **PIX->Billing:** handler em `runtime.ts` (`eventBus.subscribe`) chama `BillingService.settleByRecordId()` move billing para `status='settled'` quando `payment.pix.confirmed` carrega `billingRecordId`

---

## 2. Missao do Plano

Executar integralmente a construcao do BLOCO 3 com foco em:

1. backbone assincrono e catalogo operacional de eventos;
2. webhooks confiaveis e superficie externa consistente;
3. API premium preparada para terceiros;
4. trilha inicial e segura de pagamentos com reflexo de dominio;
5. documentacao e tracker coerentes com o estado executado.

**Estado consolidado das rodadas executadas:**
- Rodada 1 (E3-01): event bus com subscriber pattern + retry/DLQ
- Rodada 2 (E3-05): webhooks + API premium com endpoint de teste
- Rodada 3 (E3-02 abertura): modulo PIX com intent e confirmacao
- Rodada 4 (E3-02 fechamento): PIX->Billing via eventBus.subscribe + settleByRecordId
- Rodadas de gap: 5 rodadas executadas cobrindo maioria das superficies SPA
- Revisao final gap: GAP REMANESCENTE REDUZIDO MATERIALMENTE
- Rodada 6 (E3-06): DLQ operabilidade — `POST /internal/events/:eventId/reprocess` fecha ciclo inspect+replay

**Proximo alvo:** continuidade estruturada do BLOCO 3 em frentes de valor incremental real (integracoes, operabilidade, frontend com valor direto comprovado)

---

## 3. Fonte de Verdade Obrigatoria

O executor deve usar obrigatoriamente:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0111-PLANO-OPERACIONAL-CONSOLIDADO-FINAL-2026-04-10.md`
- `docs/Enterprise/0117-PLANO-CONTINUIDADE-POS-BLOCO-2-E-ABERTURA-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`
- `docs/Enterprise/103-ONDA-3-INTEGRACOES-API.md`
- `docs/Enterprise/0117-EVENT-BUS.md`
- `docs/Enterprise/1050-API-PREMIUM-OPENAPI.md`
- `docs/Enterprise/0114-PIX-INTEGRATION.md`
- `docs/Enterprise/200-BACKLOG-MASTER.md`
- `docs/Enterprise/203-BACKLOG-ONDA-3.md`

Se houver conflito entre documento antigo e evidencia executavel recente:

- a evidencia vence;
- a documentacao deve ser corrigida no mesmo lote.

---

## 4. Escopo Permitido

Esta execucao pode atuar em:

- `packages/modules/event-bus/**`
- `packages/modules/webhooks/**`
- `packages/modules/api-keys/**`
- `apps/api/**`
- `apps/worker/**`
- contratos OpenAPI ligados a integracoes
- adaptadores e abstrações iniciais de pagamentos
- testes de integracao, runtime e contrato associados
- documentacao operacional e tracker ligados ao BLOCO 3

---

## 5. Escopo Proibido

Nao abrir nesta execucao:

- remediacoes antigas de Bloco 1 ou 2 sem evidência nova;
- redesign amplo de frontend;
- expansao ampla de LGPD/RLS fora do que for tocado por integracoes;
- expansao ampla de IA/ML;
- escolha irreversivel de gateway de pagamento sem camada de abstracao;
- documentacao inflada sem validacao real.

---

## 6. Frentes Obrigatorias do BLOCO 3

### F1. Event Bus e Arquitetura Assincrona

Objetivo:

- consolidar o backbone de eventos como trilha operacional real entre API, banco e worker.

Entregas esperadas:

- contratos minimos de eventos definidos;
- publicacao e consumo documentados no codigo;
- persistencia/outbox coerente com o runtime;
- catalogo minimo de eventos desta etapa;
- testes de integracao do backbone.

### F2. Webhooks e Superficie Externa

Objetivo:

- transformar a trilha de webhooks em capacidade externa verificavel.

Entregas esperadas:

- fluxos de registro, entrega, retry ou reprocessamento quando aplicavel;
- contrato minimo de payload e status;
- revalidacao do modulo `webhooks`;
- ligacao clara entre evento interno e entrega externa;
- cobertura de testes do fluxo principal.

### F3. API Premium para Terceiros

Objetivo:

- tornar a superficie de integracao externa previsivel, contratual e auditavel.

Entregas esperadas:

- OpenAPI atualizada se necessario;
- endpoints/contratos de integracao refletidos no runtime;
- autenticacao/escopo coerentes para terceiros;
- validacao do contrato publico e do uso com API keys.

### F4. Pagamentos — Trilha Inicial Segura

Objetivo:

- abrir a capacidade de pagamentos sem acoplamento prematuro ao provedor final.

Entregas esperadas:

- leitura e aplicacao de `0114-PIX-INTEGRATION.md`;
- definicao de uma abstracao de provider/gateway;
- primeira superficie executavel de pagamento ou intent;
- pontos de integracao com eventos e webhooks onde fizer sentido;
- teste minimo do adapter/contrato inicial.

### F5. Governanca Operacional do BLOCO 3

Objetivo:

- deixar o estado do bloco rastreavel e verificavel no tracker e nos planos.

Entregas esperadas:

- tracker atualizado;
- docs do bloco atualizados;
- relato fiel do que foi implementado e do que ainda ficou aberto.
- Rodada 3 do gap frontend/backend (cluster clinico expandido): `diagnostics`, `prescriptions`, `prescription-executions`, `discharges` e `surgery` ganharam superficies reais na SPA; todos integrados via servicos existentes; gates SPA verdes (typecheck PASS, test 497/497 PASS, visual 9/9 PASS, e2e 22/22 PASS).

---

## 7. Ordem Obrigatoria de Execucao

1. ler os docs de fonte de verdade;
2. confirmar o estado de entrada do BLOCO 3;
3. consolidar `F1` Event Bus;
4. consolidar `F2` Webhooks;
5. consolidar `F3` API Premium;
6. abrir `F4` Pagamentos com abstracao segura;
7. validar tudo o que foi alterado;
8. atualizar tracker e docs;
9. emitir o estado final desta rodada do BLOCO 3.

---

## 8. Validacoes Minimas Obrigatorias

O executor deve usar validacao real sempre que possivel:

- `pnpm typecheck`
- `pnpm build`
- testes dos modulos alterados
- testes de `event-bus`
- testes de `webhooks`
- testes ou validacoes de runtime/contrato da API
- `pnpm validate:openapi` se houver alteracao contratual

Se pagamentos ganharem implementacao executavel:

- incluir pelo menos 1 teste ou validacao objetiva da abstracao inicial.

---

## 9. Criterio de Saida Desta Execucao

Esta execucao sera considerada bem-sucedida se houver evidência objetiva de:

- avancos reais e verificaveis em Event Bus;
- avancos reais e verificaveis em Webhooks/API premium;
- abertura concreta e segura da trilha inicial de Pagamentos;
- documentacao coerente com o estado executado.

Nao e necessario concluir o BLOCO 3 inteiro em uma unica rodada.
E necessario iniciar e materializar o BLOCO 3 de forma real.

---

## 10. Resultado Esperado do Executor

Ao final, o executor deve devolver:

- leitura consolidada do estado de entrada;
- o que foi implementado em cada frente;
- arquivos alterados;
- comandos executados;
- resultados reais;
- docs atualizados;
- decisao final:
  - `BLOCO 3 EM EXECUCAO`
  - ou `BLOCO 3 NAO INICIADO`
