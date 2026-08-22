# CVG-002B — Jornada durável de estoque e pagamentos não-caixa

## Contrato

- Status: `IN_PROGRESS`; `CVG-002B1` está verificado e os marcos posteriores continuam sem gate de implementação
- Estágio/atividade: `BUILD` / `IMPLEMENT`
- Responsável: root integrator, com implementação TDD e crítica independente
- Origem: `PLAT-001/002/003`, `BILL-001/002`, `INV-001`, `PAY-001`, `E2E-001/002/003/006` e `QB-CORE-01`, `QB-SEC-02`, `QB-DATA-01`, `QB-REL-01`
- Base do checkpoint: `0fa3ac43ad62039748ccf504dc361518d266ef35`
- Tier/risco/raio: `T4_CRITICAL` / `CRITICAL` / `CROSS_SYSTEM`

## Objetivo e resultado esperado

Estender o recebimento em dinheiro já comprovado para uma jornada agendada e uma jornada avulsa que convergem em um atendimento canônico, geram charge e consumo de estoque rastreáveis, e liquidam por PIX/cartão através de uma saga durável. PostgreSQL deve ser atômico em cada comando local; nenhum lock pode atravessar chamada de rede; retry, callback duplicado, concorrência, reinício e tentativa cross-tenant não podem duplicar nem esconder efeitos.

## Baseline confirmado

- `CVG-002A` já prova recebimento integral em dinheiro com billing, recebível, pagamento, caixa, journal, recibo, auditoria e outbox em uma transação PostgreSQL.
- Administração clínica, estoque e cobrança são hoje comandos independentes; o consumo por reserva não cria a prova clínica completa nem revalida validade do lote.
- PIX chama o provedor antes de persistir a cadeia local; não existe callback real. A SPA usa autenticação e nomes de campos incompatíveis com a API.
- Cartão e sua reconciliação são apenas memória; um reinício perde o estado.
- Os consumidores `payments`, `billing` e `webhooks` são registrados na API, que não processa a outbox durável; o worker processa a outbox, mas não registra esses consumidores.
- Billing e inventory mantêm mapas mutáveis além do PostgreSQL; rollback externo pode contaminar o processo. Os novos comandos críticos devem ser DB-first, sem cache como autoridade.
- O E2E de billing tenta selecionar `settled`, estado deliberadamente removido da UI pública, e os demais testes atravessam apenas fragmentos da jornada com atalhos HTTP.

## Arquitetura congelada

1. `FinalizeEncounterForPayment`: comando PostgreSQL tenant-scoped que materializa charges idempotentes, consome reservas FEFO, registra consumo/movimento/proveniência, congela o total financeiro e publica auditoria/outbox.
2. `RequestEncounterPayment`: comando local que persiste uma tentativa provider-neutral em `pending_dispatch` com valor em centavos e chave estável; não chama rede.
3. Dispatcher durável: adquire lease curto, commita, chama o adapter fora da transação com chave idempotente, e persiste o resultado em nova UoW.
4. `ApplyConfirmedPayment`: inbox por evento do provider e comando PostgreSQL que valida tenant/moeda/valor/estado e cria exatamente um pagamento, journal, prova append-only, auditoria e outbox.
5. Falha após sucesso externo permanece reconciliável. Cartão autorizado ainda não liquida; captura liquida; void/refund/reversal são compensações append-only. PIX/cartão nunca movimentam saldo físico de caixa.

Ordem de locks: idempotência/inbox; billing; encounter; conta financeira; recebíveis por parcela/ID; inventory items por ID; lotes por item/validade/ID; reservas por ID; tentativa de pagamento; inserts de payment/journal/proof/audit/outbox por último.

## Marcos e autorização

### `CVG-002B1` — núcleo de liquidação PIX confirmada

Este é o único marco autorizado pelo gate inicial. Implementar primeiro um comando DB-only executado diretamente sob a UoW tenant-scoped; a fronteira HTTP/provider assinada pertence explicitamente a `CVG-002B2`. O comando:

- aceita identificadores tenant/provider, `providerEventId`, `transactionId`, `billingRecordId`, moeda `BRL`, valor inteiro em centavos e instante de confirmação;
- exige transação PIX durável e concluída, billing `open`, atendimento concluído, total e saldo exatos e pertencimento integral ao mesmo tenant;
- grava inbox/CAS da transação, conta/recebível/pagamento, billing `settled`, journal debitando `1.1.02-bancos-pix`, prova não-caixa append-only, auditoria e outbox na mesma UoW;
- possui unicidade tenant-safe para evento do provider, referência externa do pagamento, journal e prova;
- nunca cria movimento de caixa nem marca `skipped_no_open_register` como conciliação positiva;
- devolve replay canônico para payload idêntico e conflito para reutilização divergente;
- coloca valor/moeda/tenant/ID divergente em falha explícita sem liquidar o atendimento.

### Marcos posteriores, ainda não autorizados para escrita significativa

- `CVG-002B2`: tentativa/dispatcher PIX fora de transação de rede, callback assinado, consumers reais no worker e SPA PIX coerente.
- `CVG-002B3`: persistência de cartão, autorização/captura/reversão e ledger `cartões a receber`.
- `CVG-002B4`: charge + reserva/consumo clínico atômico, FEFO, validade, concorrência e provenance.
- `CVG-002B5`: E2E PostgreSQL/browser para agendado+cash, avulso+PIX e agendado+card sem atalhos clínicos.

Cada marco exige novo checkpoint/crítica; uma evidência parcial não autoriza marcar `CVG-002`, `QB-CORE-01`, `PAY-001` ou provider homologation como concluído.

## Contrato RED de `CVG-002B1`

1. PostgreSQL real, migrations completas e role `NOBYPASSRLS`.
2. Primeiro teste falha porque não existe comando/prova atômica de pagamento não-caixa.
3. Caso feliz atravessa diretamente a UoW tenant-scoped e confirma uma liquidação PIX integral; a travessia HTTP/provider é aceitação de `CVG-002B2`.
4. Failpoint após cada escrita e erro de constraint diferida revertem toda a cadeia local.
5. Replay sequencial e dois despachos UoW concorrentes resultam em um payment, um journal e uma prova.
6. Reinício entre callback e processamento permanece aceitação obrigatória de `CVG-002B2`, onde a boundary e o worker realmente existem.
7. Payload divergente, valor/moeda incorretos, billing já liquidado e tenant B são negados sem side effect.
8. Queries finais reconciliam transaction, billing, financial account, receivable, payment, journal, proof, audit, inbox e outbox; `cash_movements` permanece inalterada.
9. Regressão `CVG-002A`, API, módulos financeiros, worker, contratos, typecheck/lint e cobertura global/alterada >=80% permanecem verdes.

## Segurança, privacidade e limites

- Em `CVG-002B2`, a callback/provider boundary valida assinatura, freshness e replay antes de despachar o comando; o teste pode usar segredo sintético descartável.
- Nenhum card token, segredo, payload sensível ou credencial entra em idempotência, outbox, log, auditoria ou control-plane.
- Novas tabelas usam FKs compostas tenant-safe, `ENABLE/FORCE RLS` e policies exercitadas sob role sem bypass.
- Produção falha fechada quando provider/consumer/capability não estiver pronto; nenhum mock simula sucesso em produção.
- Provider real, credenciais, taxas, homologação, NFS-e, validade fiscal do recibo, go-live e risco residual permanecem autoridade humana/external.

## Fora do recorte local atual

Pagamento parcial/misto, parcelamento/troco, compra/NF/transferência/multiestoque, internação completa, laboratório, fiscal, comunicações, SLO/DR/Game Day, WCAG integral e homologação de provider. Esses itens continuam no programa e não são dispensados.

## Resultado e evidência

- Mapeamento independente: documentos/requisitos, pagamentos, inventory/charge, SPA/E2E e arquitetura transacional.
- `CVG-002B1` verificado: 14/14 casos PostgreSQL do comando direto, incluindo replay canônico, concorrência, isolamento tenant/RLS, divergências e rollback em cada uma das 13 fronteiras de escrita; nenhum movimento de caixa é criado.
- Regressão: API 306/306, PIX+cash 22/22, rotas financeiras/administrativas 8/8, repositório PIX 5/5, consumer 5/5 e cobertura global 1.520/1.520 com 84,11% de linhas e 80,14% de branches.
- Segurança e qualidade: typecheck/lint focal, secret scan, auditoria de dependências e `git diff --check` passaram; a revisão independente final não encontrou achados CRITICAL/HIGH/MEDIUM no recorte.
- Limite preservado: a verificação é exclusiva do núcleo DB-only. Callback assinado, provider/worker, reinício entre callback e processamento, dispatch, SPA, cartão, inventory, E2E amplo e produção continuam fora do PASS.
- Próxima ação: congelar contrato e gate próprios para `CVG-002B2` antes de qualquer escrita na fronteira HTTP/provider/worker/SPA.

## Revisão de contrato 1 — 2026-08-22

- A crítica independente detectou que a redação original atribuía a fronteira HTTP/provider simultaneamente a `CVG-002B1` e `CVG-002B2`, embora o gate inicial autorizasse apenas o núcleo DB-first sem callback de rede.
- A redação foi esclarecida sem remover a obrigação do programa: `CVG-002B1` aceita o comando transacional direto; callback assinada, freshness, replay externo, worker e reinício entre callback/processamento permanecem aceitação obrigatória de `CVG-002B2`.
- O gate `GATE-CVG-002B1-IR-002` revalida o recorte antes de novos testes/alterações. Nenhuma evidência do núcleo será usada para alegar callback, provider real, worker, SPA, produto completo, paridade ou produção.
