# Controles de privacidade, autenticação e pagamentos

**Atualizado em:** 2026-09-26
**Owner:** Segurança/DPO, Backend
**Revisão:** a cada mudança em LGPD, autenticação, pagamentos ou NFS-e

Este documento registra o comportamento vigente dos controles corrigidos na
auditoria de 26/09/2026 ([relatório](../2026-09-26-auditoria-completa-sistema.md)).
Cada item aponta o código e o teste que o sustentam.

## 1. Retenção de dados do tutor (decisão de produto)

Decisão do responsável pelo produto em 26/09/2026:

- O cadastro do tutor é **mantido por padrão**, sem expurgo por tempo ou por
  inatividade, porque tem valor comercial de relacionamento.
- Dados só são eliminados quando a lei obriga. Na prática, isso acontece quando
  o **titular pede a eliminação** (LGPD art. 18, VI). Mesmo assim, ficam
  preservados os dados que outra obrigação legal manda guardar (art. 16): notas
  fiscais, prontuário e trilha de auditoria.
- Quando o titular se opõe ao marketing ou revoga o consentimento, o sistema
  **para de usar os dados para marketing** e mantém o cadastro.

A validação jurídica do prazo de guarda do prontuário veterinário está pendente:
a tabela de retenção usa 20 anos, prazo que parece vir da medicina humana (Lei
13.787/2018). Ver o item `R2-LGPD-03` do [backlog](../2026-09-26-backlog-rodada-2.md).

**Tabela de retenção entregue ao titular (R2-LGPD-02, 26/09/2026):** a tabela
`DATA_PROVIDER_RETENTION` em `packages/modules/lgpd/src/service.ts` e o campo
`retentionPolicy` do pacote de exportação descrevem exatamente o comportamento
acima. Toda linha usa `disposition: retain`; nenhuma promete anonimização ou
expurgo automático ao fim de um prazo, porque o sistema não faz isso. Os prazos
de 20 anos do prontuário aparecem marcados como pendentes de validação
jurídica até a conclusão de `R2-LGPD-03`. Teste:
`packages/modules/lgpd/src/lgpd.test.ts` ("LGPD retention evidence").

## 2. Solicitações do titular (DSR)

| Tipo | Comportamento | Código |
|---|---|---|
| Exportação, acesso, portabilidade | Pacote com dados coletados por provedor e evidência de retenção | `packages/modules/lgpd/src/service.ts` |
| Revogação de consentimento | Revoga **todos** os consentimentos ativos do titular e registra IDs e finalidades | idem |
| Eliminação e anonimização | Executor da API (`apps/api/src/lgpd-erasure-executor.ts`). **Tutor:** apaga contatos, perfil e observações e revoga os consentimentos; mantém nome, CPF e endereço, prontuário, registros financeiros e auditoria, com o motivo legal de cada item. **Paciente animal:** nada é apagado, porque o animal não é titular; o pedido deve ser feito em nome do tutor. **Usuário do sistema:** recusado com `409 DSR_ERASURE_NOT_EXECUTED` (tratado na administração de acesso) | `lgpd-owner-erasure-postgres.test.ts` |
| Qualquer tipo já concluído ou rejeitado | Não muda de estado: `409 DSR_NOT_OPEN` | idem |

O `resultJson` enviado pelo cliente nunca substitui o efeito de eliminação ou
de revogação. Testes: `packages/modules/lgpd/src/lgpd.test.ts`.

## 3. Autenticação e MFA

- O MFA é obrigatório para os papéis `admin`, `finance` e `auditor`, e também é
  exigido de **qualquer usuário que o tenha ativado voluntariamente**
  (`packages/modules/auth/src/index.ts`).
- O access token fica só em memória no SPA. O refresh token vai em cookie
  `HttpOnly; SameSite=Strict`.
- O rate limit de autenticação é aplicado por IP e por identidade, com Redis
  obrigatório em produção.

## 4. Pagamentos

- `POST /payments/pix/intents` exige `Idempotency-Key` em runtime
  production-like. O gateway envia ao Pagar.me a chave
  `cvg:pix:intent:v1:sha256(conta + chave)` e, quando o provedor devolve uma
  cobrança já persistida, responde com ela; cobrança de outra conta é recusada
  (`apps/api/src/payment-gateway.ts`).
- **Pix por atendimento (R2-PAY-01):** com as credenciais do Pagar.me, a
  tentativa usa o provedor `pagarme`. O worker cria o QR com a chave
  idempotente da tentativa e grava, como metadados da cobrança, a conta e a
  tentativa (`cvg_account_id`, `cvg_attempt_id`). O webhook público
  `/webhooks/pix/pagarme/v1` usa o corpo recebido só para obter o ID: a API
  **reconsulta a cobrança no Pagar.me** e só registra o recebimento se ela estiver
  paga e tiver os metadados da instalação. O consumidor de liquidação em modo
  externo não aceita recebimentos sintéticos. Cadeia testada no PostgreSQL
  (`pix-pagarme-encounter-flow-postgres.test.ts`); o contrato da API do
  Pagar.me (campos, `status: paid`, eco de `metadata`) **ainda precisa ser
  confirmado no sandbox** antes do go-live.

## 5. NFS-e

O startup de produção exige `NFSE_API_KEY`. Uma configuração que tenha somente
certificado é recusada, porque o emissor não tem assinatura XML e-CNPJ
(`apps/api/src/server.ts`, `packages/modules/fiscal/src/nfse-emitter.ts`).

## 6. Anexos

As chaves de armazenamento são endereçadas por conteúdo. A compensação de uma
gravação que falhou só remove o objeto quando nenhum anexo confirmado o
referencia; se a verificação não puder ser feita, o objeto é mantido
(`packages/modules/attachments/src/index.ts`).

## 7. Lembretes de consulta (WhatsApp)

- A API mantém **uma tarefa durável por consulta** (`clinical_workflow_tasks`, tipo `appointment_reminder.whatsapp`, modo worker), com vencimento 24 h antes da consulta ou imediato se a consulta for marcada dentro dessa janela. Consultas a menos de 1 h não recebem lembrete (`apps/api/src/appointment-reminder-scheduler.ts`).
- Remarcação reagenda a tarefa; cancelamento, check-in ou conclusão cancelam a tarefa.
- O worker relê consulta, paciente e tutor no momento do envio. Consulta cancelada ou passada, ou tutor sem telefone (por exemplo, após eliminação LGPD), conclui a tarefa sem envio. Falha do provedor aciona retry com backoff e, depois de 5 tentativas, DLQ (`apps/worker/src/jobs/appointment-reminder-handler.ts`).
- A entrega é *at-least-once*: se o worker cair depois de o provedor aceitar a mensagem e antes de concluir a tarefa, o lembrete pode ser reenviado uma vez.
- O relatório `GET /whatsapp/appointments/:id/report` passa a derivar o status da tarefa. Para lembretes enviados pelo worker, ainda não exibe o provedor nem o ID da mensagem.

