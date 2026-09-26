# Catálogo de códigos de erro da API

**Fonte:** `packages/shared/errors/src/catalog.ts` · **Gerado por:** `node scripts/generate-error-code-catalog-doc.mjs` · não edite à mão.

Toda resposta de erro da API tem o formato `{ code, message, details?, correlationId }`.
O SPA mapeia `code` (e, em `VALIDATION_ERROR`, `details.field` + `details.reason`) para a mensagem
em português desta tabela; `message` é texto técnico em inglês e nunca vai para a tela (R2-UX-01).

## Motivos de validação (`details.reason`)

| reason | Mensagem |
|---|---|
| `required` | Campo obrigatório. |
| `invalid_type` | Valor em formato inválido. |
| `invalid_enum` | Valor não permitido para este campo. |
| `invalid_format` | Formato inválido. |
| `out_of_range` | Valor fora do intervalo permitido. |
| `too_long` | Texto muito longo. |
| `too_short` | Texto muito curto. |
| `mismatch` | Os valores informados não conferem. |

## Códigos (180)

| Código | HTTP | Categoria | Mensagem ao usuário |
|---|---:|---|---|
| `ACCESS_CONTROL_CACHE_RECOVERY_FAILED` | 500 | Erro interno | Não foi possível concluir a operação. Tente novamente. |
| `ACCESS_CONTROL_ROLLBACK_FAILED` | 500 | Erro interno | Não foi possível concluir a operação. Tente novamente. |
| `ACCESS_CONTROL_STATE_UNAVAILABLE` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
| `ADVANCE_PAYMENT_ALLOCATION_PERSISTENCE_FAILED` | 500 | Erro interno | O adiantamento não pôde ser aplicado. Nenhuma alteração foi feita. |
| `ADVANCE_PAYMENT_INVALID_STATUS` | 409 | Estado inválido | O adiantamento não está em um estado que permita esta operação. |
| `ADVANCE_PAYMENT_PERSISTENCE_FAILED` | 500 | Erro interno | O adiantamento não pôde ser registrado. Nenhuma alteração foi feita. |
| `ADVANCE_PAYMENT_REPOSITORY_UNAVAILABLE` | 503 | Indisponível | Os adiantamentos estão indisponíveis no momento. |
| `ADVANCE_PAYMENT_RESULT_LIMIT` | 400 | Limite | O relatório excede o limite de linhas. Restrinja o período ou os filtros. |
| `ADVANCE_PAYMENT_TRANSACTION_REQUIRED` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
| `ADVANCE_PAYMENT_UNSAFE_AMOUNT` | 400 | Validação | O valor do adiantamento é inválido. |
| `ADVANCE_PAYMENT_UNSUPPORTED_CURRENCY` | 400 | Validação | Moeda não suportada. |
| `ALLERGY_ACKNOWLEDGEMENT_REQUIRED` | 409 | Estado inválido | O medicamento coincide com uma alergia registrada do paciente. Informe a justificativa clínica para prosseguir. |
| `ALLERGY_ANAPHYLAXIS_CONFIRMATION_REQUIRED` | 409 | Estado inválido | O medicamento coincide com uma alergia com risco de anafilaxia. Confirme o risco e informe uma justificativa detalhada. |
| `ATTACHMENT_NOT_AVAILABLE` | 404 | Não encontrado | O anexo não está disponível. |
| `AUDIT_COVERAGE_UNAVAILABLE` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
| `AUTHENTICATION_ERROR` | 401 | Autenticação e autorização | Faça login para continuar. |
| `AUTHENTICATION_FAILED` | 401 | Autenticação e autorização | Usuário ou senha inválidos. |
| `AUTHENTICATION_UNAVAILABLE` | 503 | Indisponível | O serviço de login está indisponível. Tente novamente em instantes. |
| `BAD_REQUEST` | 400 | Validação | A solicitação está mal formada. |
| `BILLING_RECORD_NOT_FOUND` | 404 | Não encontrado | Fatura não encontrada. |
| `BILLING_SETTLEMENT_IRREVERSIBLE` | 409 | Estado inválido | Esta fatura já foi liquidada e não pode ser alterada. |
| `BILLING_UNAVAILABLE` | 503 | Indisponível | O faturamento está indisponível no momento. |
| `CARD_CAPTURE_IN_PROGRESS` | 409 | Estado inválido | A captura do cartão já está em andamento. |
| `CARD_CAPTURE_RECONCILIATION_REQUIRED` | 409 | Estado inválido | A captura do cartão precisa de conciliação manual antes de continuar. |
| `CARD_CREATION_BILLING_CONFLICT` | 409 | Conflito | Já existe um pagamento com cartão para esta fatura. |
| `CARD_CREATION_KEY_CONFLICT` | 409 | Conflito | Esta solicitação de pagamento já foi enviada. Aguarde a confirmação. |
| `CARD_INTENT_RECONCILIATION_REQUIRED` | 409 | Estado inválido | A intenção de pagamento precisa de conciliação manual antes de continuar. |
| `CASH_RECEIPT_CONTEXT_MISMATCH` | 409 | Conflito | O recibo não pertence a este atendimento. |
| `CASH_RECEIPT_NOT_FOUND` | 404 | Não encontrado | Recibo de caixa não encontrado. |
| `CASH_RECEIPT_REVERSAL_REQUIRED` | 409 | Estado inválido | É preciso estornar o recibo antes desta operação. |
| `CASH_RECEIPT_REVERSAL_TRANSACTION_REQUIRED` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
| `CASH_RECEIPT_REVERSAL_UNAVAILABLE` | 503 | Indisponível | O estorno de recibo está indisponível no momento. |
| `CASH_RECEIPT_TRANSACTION_REQUIRED` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
| `CFOP_NOT_FOUND` | 404 | Não encontrado | CFOP não encontrado. |
| `CHALLENGE_EXPIRED` | 400 | Autenticação e autorização | O desafio de autenticação expirou. Recomece o login. |
| `CHAOS_MUTATIONS_DISABLED` | 403 | Estado inválido | Operações de teste de resiliência estão desativadas. |
| `COFINS_TABLE_NOT_FOUND` | 404 | Não encontrado | Tabela de COFINS não encontrada. |
| `COMMISSION_CALCULATIONS_REPORT_INVALID_FILTER` | 400 | Validação | Os filtros do relatório são inválidos. Revise os parâmetros e tente novamente. |
| `COMMISSION_CALCULATIONS_REPORT_RESULT_LIMIT` | 400 | Limite | O relatório excede o limite de linhas. Restrinja o período ou os filtros. |
| `COMMISSION_CALCULATIONS_REPORT_TENANT_MISMATCH` | 403 | Autenticação e autorização | O relatório solicitado não pertence a esta clínica. |
| `CONFIRMED_PIX_CONTEXT_MISMATCH` | 409 | Conflito | A confirmação Pix não pertence a este atendimento. |
| `CONFIRMED_PIX_TRANSACTION_REQUIRED` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
| `CONFLICT` | 409 | Conflito | A operação conflita com o estado atual do registro. |
| `CONS_CLIN` | 400 | Validação | Configuração de agenda inválida. |
| `CORS_ORIGIN_DENIED` | 403 | Autenticação e autorização | Origem da solicitação não permitida. |
| `COST_CENTER_IN_USE` | 409 | Conflito | O centro de custo está em uso e não pode ser removido. |
| `CSRF_ORIGIN_DENIED` | 403 | Autenticação e autorização | Origem da solicitação não permitida. |
| `DATABASE_PERSISTENCE_UNAVAILABLE` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
| `DSR_ERASURE_EXECUTOR_UNAVAILABLE` | 409 | Indisponível | A eliminação de dados não pode ser concluída agora. A solicitação continua aberta. |
| `DSR_ERASURE_NOT_EXECUTED` | 409 | Estado inválido | A eliminação de dados não foi executada. A solicitação continua aberta. |
| `DSR_NOT_OPEN` | 409 | Estado inválido | Esta solicitação do titular já foi encerrada e não pode mudar de estado. |
| `DUPLICATE_CATALOG_CODE` | 409 | Conflito | Já existe um item do catálogo com este código. |
| `DUPLICATE_COST_CENTER_CODE` | 409 | Conflito | Já existe um centro de custo com este código. |
| `ENCOUNTER_PAYMENT_RESERVED` | 409 | Estado inválido | Já existe uma cobrança Pix em andamento para este atendimento. |
| `EVIDENCE_FAILED` | 500 | Erro interno | Não foi possível concluir a operação. Tente novamente. |
| `FINANCE_CATALOG_DB_REQUIRED` | 503 | Indisponível | O catálogo financeiro está indisponível no momento. |
| `FINANCE_CATALOG_REPORT_INVALID_FILTER` | 400 | Validação | Os filtros do relatório são inválidos. Revise os parâmetros e tente novamente. |
| `FINANCE_CATALOG_REPORT_INVALID_STATE` | 409 | Estado inválido | Um registro do relatório está inconsistente e foi bloqueado. Contate o suporte. |
| `FINANCE_CATALOG_REPORT_RESULT_LIMIT` | 400 | Limite | O relatório excede o limite de linhas. Restrinja o período ou os filtros. |
| `FINANCE_CATALOG_REPORT_TENANT_MISMATCH` | 403 | Autenticação e autorização | O relatório solicitado não pertence a esta clínica. |
| `FINANCIAL_RECEIVABLE_INVALID_FILTER` | 400 | Validação | Os filtros do relatório são inválidos. Revise os parâmetros e tente novamente. |
| `FINANCIAL_RECEIVABLE_RESULT_LIMIT` | 400 | Limite | O relatório excede o limite de linhas. Restrinja o período ou os filtros. |
| `FINANCIAL_RECEIVABLE_TENANT_MISMATCH` | 403 | Autenticação e autorização | O relatório solicitado não pertence a esta clínica. |
| `FLAG_DISABLED` | 404 | Indisponível | Este recurso está desativado nesta clínica. |
| `FORBIDDEN` | 403 | Autenticação e autorização | Você não tem permissão para esta ação. |
| `IBS_CBS_TABLE_NOT_FOUND` | 404 | Não encontrado | Tabela de IBS/CBS não encontrada. |
| `ICMS_TABLE_NOT_FOUND` | 404 | Não encontrado | Tabela de ICMS não encontrada. |
| `INTERNAL_ERROR` | 500 | Erro interno | Ocorreu um erro inesperado. Nossa equipe foi notificada. |
| `INVALID_CALLBACK` | 400 | Autenticação e autorização | O retorno do provedor de login é inválido. |
| `INVALID_CHALLENGE` | 400 | Autenticação e autorização | O desafio de autenticação é inválido. Recomece o login. |
| `INVALID_DOCUMENT_STATE` | 409 | Estado inválido | A nota fiscal não está em um estado que permita esta operação. |
| `INVALID_FINANCE_CATALOG_TYPE` | 400 | Validação | Tipo de item do catálogo inválido. |
| `INVALID_JSON_BODY` | 400 | Validação | O conteúdo enviado não pôde ser lido. |
| `INVALID_REQUEST` | 400 | Validação | A solicitação está mal formada. |
| `INVALID_SETUP_PAYLOAD` | 400 | Validação | Os dados da configuração inicial são inválidos. |
| `INVALID_SETUP_TOKEN` | 401 | Autenticação e autorização | O token de configuração inicial é inválido. |
| `INVALID_STATE` | 400 | Autenticação e autorização | O login externo não pôde ser validado. Tente novamente. |
| `INVENTORY_INVOICES_REPORT_INVALID_FILTER` | 400 | Validação | Os filtros do relatório são inválidos. Revise os parâmetros e tente novamente. |
| `INVENTORY_INVOICES_REPORT_INVALID_ROW` | 500 | Erro interno | Um registro do relatório está inconsistente e foi bloqueado. Contate o suporte. |
| `INVENTORY_INVOICES_REPORT_RESULT_LIMIT` | 400 | Limite | O relatório excede o limite de linhas. Restrinja o período ou os filtros. |
| `INVENTORY_INVOICES_REPORT_SOURCE_UNAVAILABLE` | 503 | Indisponível | A fonte de dados do relatório está indisponível no momento. |
| `INVENTORY_INVOICES_REPORT_TENANT_MISMATCH` | 403 | Autenticação e autorização | O relatório solicitado não pertence a esta clínica. |
| `INVENTORY_MOVEMENTS_REPORT_INVALID_FILTER` | 400 | Validação | Os filtros do relatório são inválidos. Revise os parâmetros e tente novamente. |
| `INVENTORY_MOVEMENTS_REPORT_INVALID_ROW` | 500 | Erro interno | Um registro do relatório está inconsistente e foi bloqueado. Contate o suporte. |
| `INVENTORY_MOVEMENTS_REPORT_RESULT_LIMIT` | 400 | Limite | O relatório excede o limite de linhas. Restrinja o período ou os filtros. |
| `INVENTORY_MOVEMENTS_REPORT_SOURCE_UNAVAILABLE` | 503 | Indisponível | A fonte de dados do relatório está indisponível no momento. |
| `INVENTORY_MOVEMENTS_REPORT_TENANT_MISMATCH` | 403 | Autenticação e autorização | O relatório solicitado não pertence a esta clínica. |
| `INVENTORY_PRODUCTS_REPORT_INVALID_FILTER` | 400 | Validação | Os filtros do relatório são inválidos. Revise os parâmetros e tente novamente. |
| `INVENTORY_PRODUCTS_REPORT_RESULT_LIMIT` | 400 | Limite | O relatório excede o limite de linhas. Restrinja o período ou os filtros. |
| `INVENTORY_PRODUCTS_REPORT_TENANT_MISMATCH` | 403 | Autenticação e autorização | O relatório solicitado não pertence a esta clínica. |
| `INVENTORY_STOCK_REPORT_INVALID_ROW` | 500 | Erro interno | Um registro do relatório está inconsistente e foi bloqueado. Contate o suporte. |
| `INVENTORY_STOCK_REPORT_RESULT_LIMIT` | 400 | Limite | O relatório excede o limite de linhas. Restrinja o período ou os filtros. |
| `INVENTORY_STOCK_REPORT_TENANT_MISMATCH` | 403 | Autenticação e autorização | O relatório solicitado não pertence a esta clínica. |
| `INVENTORY_STOCK_REPORT_UNSAFE_NUMBER` | 500 | Erro interno | Um registro do relatório está inconsistente e foi bloqueado. Contate o suporte. |
| `IPI_TABLE_NOT_FOUND` | 404 | Não encontrado | Tabela de IPI não encontrada. |
| `LABORATORY_PROVIDER_AUDIT_UNAVAILABLE` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
| `LABORATORY_PROVIDER_INGRESS_CONFLICT` | 409 | Conflito | Este resultado de laboratório já foi recebido. |
| `LABORATORY_PROVIDER_INGRESS_UNAVAILABLE` | 503 | Indisponível | O recebimento de resultados de laboratório está indisponível. |
| `LABORATORY_PROVIDER_INVALID_REQUEST` | 400 | Validação | O resultado de laboratório enviado é inválido. |
| `LABORATORY_PROVIDER_UNAUTHORIZED` | 401 | Autenticação e autorização | Laboratório não autorizado. |
| `LABORATORY_RETRY_REQUIRES_HUMAN_REVIEW` | 409 | Estado inválido | Este resultado precisa de revisão humana antes de ser reprocessado. |
| `LEGACY_BILLING_PIX_DISABLED` | 403 | Estado inválido | O Pix por fatura foi substituído pelo Pix por atendimento. |
| `LEGACY_PIX_CONFIRMATION_DISABLED` | 403 | Estado inválido | A confirmação manual de Pix está desativada. |
| `MANUAL_SETTLEMENT_DISABLED` | 403 | Estado inválido | A baixa manual está desativada nesta clínica. |
| `METHOD_NOT_ALLOWED` | 405 | Validação | Operação não suportada neste endereço. |
| `METRICS_AUTH_REQUIRED` | 401 | Autenticação e autorização | Acesso não autorizado. |
| `NFSE_DOCUMENT_NOT_FOUND` | 404 | Não encontrado | Nota fiscal não encontrada. |
| `NFSE_LAYOUT_NOT_FOUND` | 404 | Não encontrado | Layout de NFS-e não encontrado. |
| `NFSE_PROVIDER_ERROR` | 502 | Integração externa | A prefeitura ou o provedor de NFS-e retornou um erro. Tente novamente mais tarde. |
| `NOT_CONFIGURED` | 501 | Indisponível | Este recurso não está configurado nesta instalação. |
| `NOT_DEFINED` | 400 | Validação | Item do catálogo não definido. |
| `NOT_FOUND` | 404 | Não encontrado | O registro solicitado não foi encontrado. |
| `NOT_IMPLEMENTED` | 501 | Indisponível | Este recurso ainda não está disponível nesta instalação. |
| `OIDC_ERROR` | 502 | Integração externa | O provedor de login retornou um erro. |
| `OWNERS_REPORT_INVALID_FILTER` | 400 | Validação | Os filtros do relatório são inválidos. Revise os parâmetros e tente novamente. |
| `OWNERS_REPORT_RESULT_LIMIT` | 400 | Limite | O relatório excede o limite de linhas. Restrinja o período ou os filtros. |
| `OWNERS_REPORT_TENANT_MISMATCH` | 403 | Autenticação e autorização | O relatório solicitado não pertence a esta clínica. |
| `PASSWORD_BREACH_CHECK_UNAVAILABLE` | 503 | Indisponível | A verificação de senhas vazadas está indisponível. Tente novamente em instantes. |
| `PASSWORD_POLICY_VIOLATION` | 400 | Validação | A senha não atende à política: use ao menos 12 caracteres, sem senhas comuns ou vazadas e sem conter seu nome de usuário. |
| `PASSWORD_RESET_REQUIRED` | 403 | Autenticação e autorização | Sua senha precisa ser redefinida por um administrador antes de continuar. |
| `PATIENTS_REPORT_INVALID_FILTER` | 400 | Validação | Os filtros do relatório são inválidos. Revise os parâmetros e tente novamente. |
| `PATIENTS_REPORT_RESULT_LIMIT` | 400 | Limite | O relatório excede o limite de linhas. Restrinja o período ou os filtros. |
| `PATIENTS_REPORT_TENANT_MISMATCH` | 403 | Autenticação e autorização | O relatório solicitado não pertence a esta clínica. |
| `PATIENT_WEIGHT_REQUIRED` | 409 | Estado inválido | A posologia é por peso e o paciente não tem peso registrado. Registre o peso antes de prescrever. |
| `PAYLOAD_TOO_LARGE` | 413 | Limite | O conteúdo enviado é grande demais. |
| `PAYMENT_ALREADY_CAPTURED` | 409 | Estado inválido | Este pagamento já foi capturado. |
| `PAYMENT_ALREADY_SETTLED` | 409 | Estado inválido | Este pagamento já foi liquidado. |
| `PAYMENT_NOT_COMPLETED` | 409 | Estado inválido | O pagamento ainda não foi concluído. |
| `PERSISTENCE_UNAVAILABLE` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
| `PIS_TABLE_NOT_FOUND` | 404 | Não encontrado | Tabela de PIS não encontrada. |
| `PIX_PAYMENT_ATTEMPT_CONTEXT_MISMATCH` | 409 | Conflito | A cobrança Pix não pertence a este atendimento. |
| `PIX_PAYMENT_ATTEMPT_LOOKUP_UNAVAILABLE` | 503 | Indisponível | A consulta de cobranças Pix está indisponível no momento. |
| `PIX_PAYMENT_ATTEMPT_NOT_FOUND` | 404 | Não encontrado | Cobrança Pix não encontrada. |
| `PIX_PAYMENT_ATTEMPT_TRANSACTION_REQUIRED` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
| `PIX_PROVIDER_ATTEMPT_CONFLICT` | 409 | Conflito | O provedor Pix já registrou esta cobrança. |
| `PIX_PROVIDER_CONFIGURATION_MISMATCH` | 500 | Integração externa | A configuração do provedor Pix está inconsistente. Contate o suporte. |
| `PIX_PROVIDER_EVENT_CONFLICT` | 409 | Conflito | Este evento do provedor Pix já foi processado. |
| `PIX_PROVIDER_EVENT_INVALID_INPUT` | 400 | Validação | O evento do provedor Pix é inválido. |
| `PIX_PROVIDER_OUTCOME_AMBIGUOUS` | 502 | Integração externa | O provedor Pix não confirmou a cobrança. Ela será reconciliada automaticamente. |
| `PIX_PROVIDER_SUCCESS_PERSISTENCE_FAILED` | 500 | Erro interno | A cobrança Pix foi criada, mas não pôde ser registrada. Ela será reconciliada automaticamente. |
| `PIX_SETTLEMENT_DLQ_UNAVAILABLE` | 503 | Indisponível | A fila de liquidação Pix está indisponível no momento. |
| `PIX_WEBHOOK_BODY_TOO_LARGE` | 413 | Limite | O conteúdo enviado é grande demais. |
| `PIX_WEBHOOK_CONFLICT` | 409 | Conflito | Esta notificação Pix já foi processada. |
| `PIX_WEBHOOK_INVALID_PAYLOAD` | 400 | Validação | A notificação Pix é inválida. |
| `PIX_WEBHOOK_INVALID_REQUEST` | 400 | Validação | A notificação Pix é inválida. |
| `PIX_WEBHOOK_PROVIDER_LOOKUP_FAILED` | 502 | Integração externa | Não foi possível confirmar a notificação com o provedor Pix. |
| `PIX_WEBHOOK_RATE_LIMITED` | 429 | Limite | Muitas notificações em pouco tempo. |
| `PIX_WEBHOOK_UNAUTHORIZED` | 401 | Autenticação e autorização | Notificação Pix não autorizada. |
| `PIX_WEBHOOK_UNAVAILABLE` | 503 | Indisponível | O recebimento de notificações Pix está indisponível no momento. |
| `PRICE_SOURCE_REQUIRED` | 400 | Validação | Informe a origem do preço do item. |
| `RATE_LIMITED` | 429 | Limite | Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente. |
| `RATE_LIMIT_EXCEEDED` | 429 | Limite | Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente. |
| `RATE_LIMIT_UNAVAILABLE` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
| `REGISTRATION_FAILED` | 400 | Autenticação e autorização | Não foi possível registrar o dispositivo de segurança. |
| `SCORE_FAILED` | 500 | Erro interno | Não foi possível concluir a operação. Tente novamente. |
| `SERVICES_REPORT_INVALID_FILTER` | 400 | Validação | Os filtros do relatório são inválidos. Revise os parâmetros e tente novamente. |
| `SERVICES_REPORT_RESULT_LIMIT` | 400 | Limite | O relatório excede o limite de linhas. Restrinja o período ou os filtros. |
| `SERVICES_REPORT_TENANT_MISMATCH` | 403 | Autenticação e autorização | O relatório solicitado não pertence a esta clínica. |
| `SERVICE_UNAVAILABLE` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
| `SESSION_NOT_FOUND` | 404 | Autenticação e autorização | Sua sessão expirou. Faça login novamente. |
| `SETUP_ALREADY_COMPLETED` | 409 | Estado inválido | A configuração inicial já foi concluída. |
| `SETUP_DISABLED` | 403 | Estado inválido | A configuração inicial está desativada. |
| `SETUP_FAILED` | 500 | Erro interno | A configuração inicial falhou. Nenhuma alteração foi aplicada. |
| `SETUP_PAYLOAD_TOO_LARGE` | 413 | Limite | O conteúdo enviado é grande demais. |
| `SETUP_STATUS_UNAVAILABLE` | 503 | Indisponível | A configuração inicial está indisponível no momento. |
| `SETUP_UNAVAILABLE` | 503 | Indisponível | A configuração inicial está indisponível no momento. |
| `STATE_EXPIRED` | 400 | Autenticação e autorização | O login externo expirou. Tente novamente. |
| `SUBJECT_NOT_FOUND` | 404 | Não encontrado | Titular não encontrado nesta clínica. |
| `SYNTHETIC_PIX_PROVIDER_DISABLED` | 403 | Estado inválido | O provedor Pix de testes está desativado neste ambiente. |
| `SYNTHETIC_REJECTED` | 502 | Integração externa | A cobrança foi rejeitada pelo provedor de testes. |
| `SYNTHETIC_UNAVAILABLE` | 503 | Indisponível | O provedor de testes está indisponível. |
| `TENANT_COMMAND_COMMIT_RECOVERY_FAILED` | 500 | Erro interno | A operação não foi confirmada. Verifique o registro antes de repetir. |
| `TENANT_COMMAND_RECOVERY_FAILED` | 500 | Erro interno | A operação não foi confirmada. Verifique o registro antes de repetir. |
| `TOKEN_EXCHANGE_FAILED` | 502 | Integração externa | O provedor de login não respondeu corretamente. Tente novamente. |
| `TRANSACTION_REQUIRED` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
| `UNAUTHORIZED` | 401 | Autenticação e autorização | Acesso não autorizado. |
| `VALIDATION_ERROR` | 400 | Validação | Há dados inválidos no formulário. Revise os campos destacados. |
| `VERSION_CONFLICT` | 409 | Conflito | O registro foi alterado por outra pessoa. Recarregue e tente novamente. |
| `WORKFLOW_TASK_PERSISTENCE_REQUIRED` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
| `WORKFLOW_TASK_SCHEMA_NOT_READY` | 503 | Indisponível | Este recurso está temporariamente indisponível. Tente novamente em instantes. |
