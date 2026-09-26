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

## 2. Solicitações do titular (DSR)

| Tipo | Comportamento | Código |
|---|---|---|
| Exportação, acesso, portabilidade | Pacote com dados coletados por provedor e evidência de retenção | `packages/modules/lgpd/src/service.ts` |
| Revogação de consentimento | Revoga **todos** os consentimentos ativos do titular e registra IDs e finalidades | idem |
| Eliminação e anonimização | Só são concluídas com evidência de um `erasureExecutor`. Sem executor, a API responde `409 DSR_ERASURE_EXECUTOR_UNAVAILABLE` e o pedido continua aberto | idem |
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
- O Pix vinculado ao atendimento só possui o provedor sintético, que é bloqueado
  em produção. Não há Pix real por atendimento até o item `R2-PAY-01`.

## 5. NFS-e

O startup de produção exige `NFSE_API_KEY`. Uma configuração que tenha somente
certificado é recusada, porque o emissor não tem assinatura XML e-CNPJ
(`apps/api/src/server.ts`, `packages/modules/fiscal/src/nfse-emitter.ts`).

## 6. Anexos

As chaves de armazenamento são endereçadas por conteúdo. A compensação de uma
gravação que falhou só remove o objeto quando nenhum anexo confirmado o
referencia; se a verificação não puder ser feita, o objeto é mantido
(`packages/modules/attachments/src/index.ts`).
