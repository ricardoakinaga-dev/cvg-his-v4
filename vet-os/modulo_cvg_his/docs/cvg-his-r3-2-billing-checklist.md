# CVG-HIS — R3.2 billing clínico básico checklist operacional

Data: 2026-03-17

## Objetivo do corte atual
Entregar o primeiro corte viável de billing clínico básico no encounter com quatro pilares:

1. consolidação do encounter em um resumo único de cobrança
2. fechamento operacional via `encounter.status = closed`
3. bloqueio de alterações de billing após fechamento
4. exposição web mínima para o frontend consumir sem acoplamento excessivo

---

## Status executivo

### Já entregue neste corte
- [x] modelagem mínima de billing por item faturável no encounter já existente e reutilizada
- [x] endpoint de resumo consolidado do billing do encounter
- [x] cálculo consolidado de subtotal, descontos, total e contagem por tipo de item
- [x] bloqueio de create/update/delete de billing item quando o encounter está fechado
- [x] cobertura de testes de service e routes para resumo e bloqueio pós-fechamento
- [x] atualização do contrato compartilhado para exposição web mínima

### Ainda pendente para fechar R3.2/R3.3 completo
- [ ] fechamento financeiro explícito da conta/comanda separado do fechamento clínico do encounter
- [ ] persistência de snapshot de fechamento financeiro
- [ ] status financeiro dedicado (`pending | partial | paid`)
- [ ] conta a receber simples gerada automaticamente quando houver saldo aberto
- [ ] ação/tela de fechamento no his-web
- [ ] proteção de UI para esconder ações de edição após fechamento

---

## Checklist operacional detalhado

### A. Domínio e regras
- [x] confirmar que billing do encounter usa `encounter_billing_items`
- [x] manter billing no nível do encounter, sem abrir escopo para caixa/fiscal/contas a pagar
- [x] usar `encounter.status` como trava operacional do primeiro corte
- [ ] decidir se o fechamento financeiro definitivo ficará no próprio encounter ou em entidade `account_receivable`/`encounter_account`

### B. Backend
- [x] expor `GET /encounters/:encounterId/billing-summary`
- [x] retornar itens + totais consolidados no mesmo payload
- [x] validar tenant/account em todas as leituras
- [x] impedir `POST /encounters/:encounterId/billing-items` em encounter fechado
- [x] impedir `PATCH /encounter-billing-items/:id` em encounter fechado
- [x] impedir `DELETE /encounter-billing-items/:id` em encounter fechado
- [ ] criar endpoint explícito de fechamento financeiro da conta do atendimento
- [ ] registrar snapshot de fechamento e responsável pelo fechamento financeiro

### C. Contratos compartilhados
- [x] adicionar schema de resumo consolidado
- [x] adicionar endpoint no `encounterBillingContract`
- [x] atualizar metadata de endpoints para contrato global

### D. Frontend / exposição web mínima
- [x] disponibilizar payload suficiente para bloco de resumo no frontend
- [ ] criar card/section no encounter com subtotal, descontos e total
- [ ] desabilitar ações de billing quando `encounterStatus = closed`
- [ ] incluir CTA de fechamento da conta no his-web quando o fluxo financeiro estiver pronto

### E. Testes e validação
- [x] teste de service para resumo consolidado
- [x] teste de service para bloqueio pós-fechamento
- [x] teste de route para `GET /encounters/:encounterId/billing-summary`
- [x] teste de route para conflito `409` em create/update/delete após fechamento
- [ ] teste integrado com banco real cobrindo fechamento + resumo final
- [ ] teste de frontend consumindo resumo consolidado

---

## Decisões de implementação deste corte

### 1. Fechamento operacional primeiro, fechamento financeiro depois
Optei por não inventar uma conta/comanda completa agora. O sistema já possui `encounter.close`; então o primeiro corte usa esse estado para congelar billing e dar previsibilidade operacional.

### 2. Resumo consolidado como API mínima principal
Em vez de espalhar cálculos entre frontend e backend, o backend agora entrega um resumo único por encounter contendo:
- itens
- quantidade total de itens
- quantidade por tipo (`service`, `product`)
- subtotal bruto
- desconto total
- total líquido
- status atual do encounter

### 3. Travamento pós-fechamento
Depois de `encounter.status = closed`, billing vira somente leitura. Isso reduz divergência entre prontuário encerrado e conta em edição.

---

## API mínima resultante

### Novo endpoint
`GET /encounters/:encounterId/billing-summary`

### Resposta esperada
- `encounterId`
- `accountId`
- `encounterStatus`
- `totals.itemCount`
- `totals.serviceItemCount`
- `totals.productItemCount`
- `totals.subtotal`
- `totals.discountTotal`
- `totals.total`
- `items[]`

### Regras de erro
- `404` se o encounter não existir no tenant
- `409` para mutações de billing quando o encounter já estiver fechado

---

## Próximo passo recomendado
A sequência mais coerente agora é abrir o R3.3 em cima desta base:

1. criar entidade/registro de fechamento financeiro simples
2. persistir snapshot do resumo no momento do fechamento
3. registrar situação financeira (`pending`, `partial`, `paid`)
4. gerar pendência simples para saldo aberto
5. plugar isso na UI do encounter
