/**
 * API error code catalog (R2-UX-01, API side).
 *
 * Every `code` the API can put in an error response body is listed here with
 * its HTTP status and a Portuguese (pt-BR) message suitable for end users.
 * The SPA maps `body.code` (plus `details.field` / `details.reason` for
 * validation errors) to these messages and never shows the English
 * `body.message`, which stays a developer-facing string.
 *
 * Contract:
 *   - `code` is stable; renaming one is a breaking API change.
 *   - `tests/unit/api/error-code-catalog.test.ts` scans the API, worker and
 *     module sources and fails when a code is emitted but not catalogued.
 *   - `docs/engineering/API_ERROR_CODES.md` is generated from this file.
 */

export type ErrorCodeCategory =
  | 'validation'
  | 'auth'
  | 'not_found'
  | 'conflict'
  | 'state'
  | 'unavailable'
  | 'limit'
  | 'integration'
  | 'internal';

export interface ErrorCodeEntry {
  /** HTTP status the API uses with this code. */
  readonly httpStatus: number;
  readonly category: ErrorCodeCategory;
  /** Message for end users, pt-BR, no technical jargon. */
  readonly ptBR: string;
  /** Short developer note. */
  readonly note?: string;
}

/**
 * Structured reason attached to `details.reason` by the shared validation
 * helpers, so the SPA can build a precise message per field.
 */
export const VALIDATION_REASONS = [
  'required',
  'invalid_type',
  'invalid_enum',
  'invalid_format',
  'out_of_range',
  'too_long',
  'too_short',
  'mismatch'
] as const;
export type ValidationReason = (typeof VALIDATION_REASONS)[number];

export const VALIDATION_REASON_PT_BR: Readonly<Record<ValidationReason, string>> = {
  required: 'Campo obrigatório.',
  invalid_type: 'Valor em formato inválido.',
  invalid_enum: 'Valor não permitido para este campo.',
  invalid_format: 'Formato inválido.',
  out_of_range: 'Valor fora do intervalo permitido.',
  too_long: 'Texto muito longo.',
  too_short: 'Texto muito curto.',
  mismatch: 'Os valores informados não conferem.'
};

export interface ValidationErrorDetails {
  readonly field?: string;
  readonly reason?: ValidationReason;
  readonly allowed?: readonly string[];
  readonly expected?: string;
  readonly value?: unknown;
  readonly correlationId?: string;
}

const NOT_FOUND = 'O registro solicitado não foi encontrado.';
const UNAVAILABLE = 'Este recurso está temporariamente indisponível. Tente novamente em instantes.';
const TRY_AGAIN = 'Não foi possível concluir a operação. Tente novamente.';
const REPORT_FILTER = 'Os filtros do relatório são inválidos. Revise os parâmetros e tente novamente.';
const REPORT_LIMIT = 'O relatório excede o limite de linhas. Restrinja o período ou os filtros.';
const REPORT_TENANT = 'O relatório solicitado não pertence a esta clínica.';
const REPORT_SOURCE = 'A fonte de dados do relatório está indisponível no momento.';
const REPORT_ROW = 'Um registro do relatório está inconsistente e foi bloqueado. Contate o suporte.';

export const ERROR_CATALOG: Readonly<Record<string, ErrorCodeEntry>> = {
  // ── generic ────────────────────────────────────────────────────────────
  VALIDATION_ERROR: { httpStatus: 400, category: 'validation', ptBR: 'Há dados inválidos no formulário. Revise os campos destacados.' },
  BAD_REQUEST: { httpStatus: 400, category: 'validation', ptBR: 'A solicitação está mal formada.' },
  INVALID_REQUEST: { httpStatus: 400, category: 'validation', ptBR: 'A solicitação está mal formada.' },
  INVALID_JSON_BODY: { httpStatus: 400, category: 'validation', ptBR: 'O conteúdo enviado não pôde ser lido.' },
  AUTHENTICATION_ERROR: { httpStatus: 401, category: 'auth', ptBR: 'Faça login para continuar.' },
  AUTHENTICATION_FAILED: { httpStatus: 401, category: 'auth', ptBR: 'Usuário ou senha inválidos.' },
  UNAUTHORIZED: { httpStatus: 401, category: 'auth', ptBR: 'Acesso não autorizado.' },
  SESSION_NOT_FOUND: { httpStatus: 404, category: 'auth', ptBR: 'Sua sessão expirou. Faça login novamente.' },
  FORBIDDEN: { httpStatus: 403, category: 'auth', ptBR: 'Você não tem permissão para esta ação.' },
  NOT_FOUND: { httpStatus: 404, category: 'not_found', ptBR: NOT_FOUND },
  CONFLICT: { httpStatus: 409, category: 'conflict', ptBR: 'A operação conflita com o estado atual do registro.' },
  VERSION_CONFLICT: { httpStatus: 409, category: 'conflict', ptBR: 'O registro foi alterado por outra pessoa. Recarregue e tente novamente.' },
  PAYLOAD_TOO_LARGE: { httpStatus: 413, category: 'limit', ptBR: 'O conteúdo enviado é grande demais.' },
  METHOD_NOT_ALLOWED: { httpStatus: 405, category: 'validation', ptBR: 'Operação não suportada neste endereço.' },
  RATE_LIMITED: { httpStatus: 429, category: 'limit', ptBR: 'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.' },
  RATE_LIMIT_EXCEEDED: { httpStatus: 429, category: 'limit', ptBR: 'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.' },
  RATE_LIMIT_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  NOT_IMPLEMENTED: { httpStatus: 501, category: 'unavailable', ptBR: 'Este recurso ainda não está disponível nesta instalação.' },
  NOT_CONFIGURED: { httpStatus: 501, category: 'unavailable', ptBR: 'Este recurso não está configurado nesta instalação.' },
  SERVICE_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  PERSISTENCE_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  DATABASE_PERSISTENCE_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  TRANSACTION_REQUIRED: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  INTERNAL_ERROR: { httpStatus: 500, category: 'internal', ptBR: 'Ocorreu um erro inesperado. Nossa equipe foi notificada.' },
  FLAG_DISABLED: { httpStatus: 404, category: 'unavailable', ptBR: 'Este recurso está desativado nesta clínica.' },
  CORS_ORIGIN_DENIED: { httpStatus: 403, category: 'auth', ptBR: 'Origem da solicitação não permitida.' },
  CSRF_ORIGIN_DENIED: { httpStatus: 403, category: 'auth', ptBR: 'Origem da solicitação não permitida.' },
  METRICS_AUTH_REQUIRED: { httpStatus: 401, category: 'auth', ptBR: 'Acesso não autorizado.' },
  CHAOS_MUTATIONS_DISABLED: { httpStatus: 403, category: 'state', ptBR: 'Operações de teste de resiliência estão desativadas.' },
  EVIDENCE_FAILED: { httpStatus: 500, category: 'internal', ptBR: TRY_AGAIN },
  SCORE_FAILED: { httpStatus: 500, category: 'internal', ptBR: TRY_AGAIN },
  TENANT_COMMAND_RECOVERY_FAILED: { httpStatus: 500, category: 'internal', ptBR: 'A operação não foi confirmada. Verifique o registro antes de repetir.' },
  TENANT_COMMAND_COMMIT_RECOVERY_FAILED: { httpStatus: 500, category: 'internal', ptBR: 'A operação não foi confirmada. Verifique o registro antes de repetir.' },
  ACCESS_CONTROL_CACHE_RECOVERY_FAILED: { httpStatus: 500, category: 'internal', ptBR: TRY_AGAIN },
  ACCESS_CONTROL_ROLLBACK_FAILED: { httpStatus: 500, category: 'internal', ptBR: TRY_AGAIN },
  ACCESS_CONTROL_STATE_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  AUDIT_COVERAGE_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  AUTHENTICATION_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: 'O serviço de login está indisponível. Tente novamente em instantes.' },
  WORKFLOW_TASK_PERSISTENCE_REQUIRED: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  WORKFLOW_TASK_SCHEMA_NOT_READY: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  NOT_DEFINED: { httpStatus: 400, category: 'validation', ptBR: 'Item do catálogo não definido.' },
  CONS_CLIN: { httpStatus: 400, category: 'validation', ptBR: 'Configuração de agenda inválida.' },

  // ── auth / MFA / SSO / setup ───────────────────────────────────────────
  INVALID_CHALLENGE: { httpStatus: 400, category: 'auth', ptBR: 'O desafio de autenticação é inválido. Recomece o login.' },
  CHALLENGE_EXPIRED: { httpStatus: 400, category: 'auth', ptBR: 'O desafio de autenticação expirou. Recomece o login.' },
  INVALID_STATE: { httpStatus: 400, category: 'auth', ptBR: 'O login externo não pôde ser validado. Tente novamente.' },
  STATE_EXPIRED: { httpStatus: 400, category: 'auth', ptBR: 'O login externo expirou. Tente novamente.' },
  INVALID_CALLBACK: { httpStatus: 400, category: 'auth', ptBR: 'O retorno do provedor de login é inválido.' },
  TOKEN_EXCHANGE_FAILED: { httpStatus: 502, category: 'integration', ptBR: 'O provedor de login não respondeu corretamente. Tente novamente.' },
  OIDC_ERROR: { httpStatus: 502, category: 'integration', ptBR: 'O provedor de login retornou um erro.' },
  REGISTRATION_FAILED: { httpStatus: 400, category: 'auth', ptBR: 'Não foi possível registrar o dispositivo de segurança.' },
  SETUP_DISABLED: { httpStatus: 403, category: 'state', ptBR: 'A configuração inicial está desativada.' },
  SETUP_ALREADY_COMPLETED: { httpStatus: 409, category: 'state', ptBR: 'A configuração inicial já foi concluída.' },
  SETUP_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: 'A configuração inicial está indisponível no momento.' },
  SETUP_STATUS_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: 'A configuração inicial está indisponível no momento.' },
  SETUP_FAILED: { httpStatus: 500, category: 'internal', ptBR: 'A configuração inicial falhou. Nenhuma alteração foi aplicada.' },
  SETUP_PAYLOAD_TOO_LARGE: { httpStatus: 413, category: 'limit', ptBR: 'O conteúdo enviado é grande demais.' },
  INVALID_SETUP_PAYLOAD: { httpStatus: 400, category: 'validation', ptBR: 'Os dados da configuração inicial são inválidos.' },
  PASSWORD_POLICY_VIOLATION: { httpStatus: 400, category: 'validation', ptBR: 'A senha não atende à política: use ao menos 12 caracteres, sem senhas comuns ou vazadas e sem conter seu nome de usuário.' },
  PASSWORD_RESET_REQUIRED: { httpStatus: 403, category: 'auth', ptBR: 'Sua senha precisa ser redefinida por um administrador antes de continuar.' },
  PASSWORD_BREACH_CHECK_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: 'A verificação de senhas vazadas está indisponível. Tente novamente em instantes.' },
  INVALID_SETUP_TOKEN: { httpStatus: 401, category: 'auth', ptBR: 'O token de configuração inicial é inválido.' },

  // ── registry / LGPD ────────────────────────────────────────────────────
  SUBJECT_NOT_FOUND: { httpStatus: 404, category: 'not_found', ptBR: 'Titular não encontrado nesta clínica.' },
  ALLERGY_ACKNOWLEDGEMENT_REQUIRED: { httpStatus: 409, category: 'state', ptBR: 'O medicamento coincide com uma alergia registrada do paciente. Informe a justificativa clínica para prosseguir.' },
  ALLERGY_ANAPHYLAXIS_CONFIRMATION_REQUIRED: { httpStatus: 409, category: 'state', ptBR: 'O medicamento coincide com uma alergia com risco de anafilaxia. Confirme o risco e informe uma justificativa detalhada.' },
  PATIENT_WEIGHT_REQUIRED: { httpStatus: 409, category: 'state', ptBR: 'A posologia é por peso e o paciente não tem peso registrado. Registre o peso antes de prescrever.' },
  DSR_NOT_OPEN: { httpStatus: 409, category: 'state', ptBR: 'Esta solicitação do titular já foi encerrada e não pode mudar de estado.' },
  DSR_ERASURE_EXECUTOR_UNAVAILABLE: { httpStatus: 409, category: 'unavailable', ptBR: 'A eliminação de dados não pode ser concluída agora. A solicitação continua aberta.' },
  DSR_ERASURE_NOT_EXECUTED: { httpStatus: 409, category: 'state', ptBR: 'A eliminação de dados não foi executada. A solicitação continua aberta.' },

  // ── attachments ────────────────────────────────────────────────────────
  ATTACHMENT_NOT_AVAILABLE: { httpStatus: 404, category: 'not_found', ptBR: 'O anexo não está disponível.' },

  // ── billing / cash / payments / PIX ────────────────────────────────────
  BILLING_RECORD_NOT_FOUND: { httpStatus: 404, category: 'not_found', ptBR: 'Fatura não encontrada.' },
  BILLING_SETTLEMENT_IRREVERSIBLE: { httpStatus: 409, category: 'state', ptBR: 'Esta fatura já foi liquidada e não pode ser alterada.' },
  BILLING_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: 'O faturamento está indisponível no momento.' },
  MANUAL_SETTLEMENT_DISABLED: { httpStatus: 403, category: 'state', ptBR: 'A baixa manual está desativada nesta clínica.' },
  PRICE_SOURCE_REQUIRED: { httpStatus: 400, category: 'validation', ptBR: 'Informe a origem do preço do item.' },
  CASH_RECEIPT_NOT_FOUND: { httpStatus: 404, category: 'not_found', ptBR: 'Recibo de caixa não encontrado.' },
  CASH_RECEIPT_CONTEXT_MISMATCH: { httpStatus: 409, category: 'conflict', ptBR: 'O recibo não pertence a este atendimento.' },
  CASH_RECEIPT_REVERSAL_REQUIRED: { httpStatus: 409, category: 'state', ptBR: 'É preciso estornar o recibo antes desta operação.' },
  CASH_RECEIPT_REVERSAL_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: 'O estorno de recibo está indisponível no momento.' },
  CASH_RECEIPT_REVERSAL_TRANSACTION_REQUIRED: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  CASH_RECEIPT_TRANSACTION_REQUIRED: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  CARD_CAPTURE_IN_PROGRESS: { httpStatus: 409, category: 'state', ptBR: 'A captura do cartão já está em andamento.' },
  CARD_CAPTURE_RECONCILIATION_REQUIRED: { httpStatus: 409, category: 'state', ptBR: 'A captura do cartão precisa de conciliação manual antes de continuar.' },
  CARD_INTENT_RECONCILIATION_REQUIRED: { httpStatus: 409, category: 'state', ptBR: 'A intenção de pagamento precisa de conciliação manual antes de continuar.' },
  CARD_CREATION_BILLING_CONFLICT: { httpStatus: 409, category: 'conflict', ptBR: 'Já existe um pagamento com cartão para esta fatura.' },
  CARD_CREATION_KEY_CONFLICT: { httpStatus: 409, category: 'conflict', ptBR: 'Esta solicitação de pagamento já foi enviada. Aguarde a confirmação.' },
  PAYMENT_ALREADY_CAPTURED: { httpStatus: 409, category: 'state', ptBR: 'Este pagamento já foi capturado.' },
  PAYMENT_ALREADY_SETTLED: { httpStatus: 409, category: 'state', ptBR: 'Este pagamento já foi liquidado.' },
  PAYMENT_NOT_COMPLETED: { httpStatus: 409, category: 'state', ptBR: 'O pagamento ainda não foi concluído.' },
  LEGACY_BILLING_PIX_DISABLED: { httpStatus: 403, category: 'state', ptBR: 'O Pix por fatura foi substituído pelo Pix por atendimento.' },
  LEGACY_PIX_CONFIRMATION_DISABLED: { httpStatus: 403, category: 'state', ptBR: 'A confirmação manual de Pix está desativada.' },
  ENCOUNTER_PAYMENT_RESERVED: { httpStatus: 409, category: 'state', ptBR: 'Já existe uma cobrança Pix em andamento para este atendimento.' },
  PIX_PAYMENT_ATTEMPT_NOT_FOUND: { httpStatus: 404, category: 'not_found', ptBR: 'Cobrança Pix não encontrada.' },
  PIX_PAYMENT_ATTEMPT_CONTEXT_MISMATCH: { httpStatus: 409, category: 'conflict', ptBR: 'A cobrança Pix não pertence a este atendimento.' },
  PIX_PAYMENT_ATTEMPT_LOOKUP_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: 'A consulta de cobranças Pix está indisponível no momento.' },
  PIX_PAYMENT_ATTEMPT_TRANSACTION_REQUIRED: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  PIX_PROVIDER_ATTEMPT_CONFLICT: { httpStatus: 409, category: 'conflict', ptBR: 'O provedor Pix já registrou esta cobrança.' },
  PIX_PROVIDER_EVENT_CONFLICT: { httpStatus: 409, category: 'conflict', ptBR: 'Este evento do provedor Pix já foi processado.' },
  PIX_PROVIDER_EVENT_INVALID_INPUT: { httpStatus: 400, category: 'validation', ptBR: 'O evento do provedor Pix é inválido.' },
  PIX_PROVIDER_CONFIGURATION_MISMATCH: { httpStatus: 500, category: 'integration', ptBR: 'A configuração do provedor Pix está inconsistente. Contate o suporte.' },
  PIX_PROVIDER_OUTCOME_AMBIGUOUS: { httpStatus: 502, category: 'integration', ptBR: 'O provedor Pix não confirmou a cobrança. Ela será reconciliada automaticamente.' },
  PIX_PROVIDER_SUCCESS_PERSISTENCE_FAILED: { httpStatus: 500, category: 'internal', ptBR: 'A cobrança Pix foi criada, mas não pôde ser registrada. Ela será reconciliada automaticamente.' },
  PIX_SETTLEMENT_DLQ_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: 'A fila de liquidação Pix está indisponível no momento.' },
  PIX_WEBHOOK_BODY_TOO_LARGE: { httpStatus: 413, category: 'limit', ptBR: 'O conteúdo enviado é grande demais.' },
  PIX_WEBHOOK_CONFLICT: { httpStatus: 409, category: 'conflict', ptBR: 'Esta notificação Pix já foi processada.' },
  PIX_WEBHOOK_INVALID_PAYLOAD: { httpStatus: 400, category: 'validation', ptBR: 'A notificação Pix é inválida.' },
  PIX_WEBHOOK_INVALID_REQUEST: { httpStatus: 400, category: 'validation', ptBR: 'A notificação Pix é inválida.' },
  PIX_WEBHOOK_PROVIDER_LOOKUP_FAILED: { httpStatus: 502, category: 'integration', ptBR: 'Não foi possível confirmar a notificação com o provedor Pix.' },
  PIX_WEBHOOK_RATE_LIMITED: { httpStatus: 429, category: 'limit', ptBR: 'Muitas notificações em pouco tempo.' },
  PIX_WEBHOOK_UNAUTHORIZED: { httpStatus: 401, category: 'auth', ptBR: 'Notificação Pix não autorizada.' },
  PIX_WEBHOOK_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: 'O recebimento de notificações Pix está indisponível no momento.' },
  SYNTHETIC_PIX_PROVIDER_DISABLED: { httpStatus: 403, category: 'state', ptBR: 'O provedor Pix de testes está desativado neste ambiente.' },
  SYNTHETIC_REJECTED: { httpStatus: 502, category: 'integration', ptBR: 'A cobrança foi rejeitada pelo provedor de testes.' },
  SYNTHETIC_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: 'O provedor de testes está indisponível.' },
  CONFIRMED_PIX_CONTEXT_MISMATCH: { httpStatus: 409, category: 'conflict', ptBR: 'A confirmação Pix não pertence a este atendimento.' },
  CONFIRMED_PIX_TRANSACTION_REQUIRED: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  ADVANCE_PAYMENT_ALLOCATION_PERSISTENCE_FAILED: { httpStatus: 500, category: 'internal', ptBR: 'O adiantamento não pôde ser aplicado. Nenhuma alteração foi feita.' },
  ADVANCE_PAYMENT_INVALID_STATUS: { httpStatus: 409, category: 'state', ptBR: 'O adiantamento não está em um estado que permita esta operação.' },
  ADVANCE_PAYMENT_PERSISTENCE_FAILED: { httpStatus: 500, category: 'internal', ptBR: 'O adiantamento não pôde ser registrado. Nenhuma alteração foi feita.' },
  ADVANCE_PAYMENT_REPOSITORY_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: 'Os adiantamentos estão indisponíveis no momento.' },
  ADVANCE_PAYMENT_RESULT_LIMIT: { httpStatus: 400, category: 'limit', ptBR: REPORT_LIMIT },
  ADVANCE_PAYMENT_TRANSACTION_REQUIRED: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  ADVANCE_PAYMENT_UNSAFE_AMOUNT: { httpStatus: 400, category: 'validation', ptBR: 'O valor do adiantamento é inválido.' },
  ADVANCE_PAYMENT_UNSUPPORTED_CURRENCY: { httpStatus: 400, category: 'validation', ptBR: 'Moeda não suportada.' },

  // ── expenses / finance catalog ─────────────────────────────────────────
  COST_CENTER_IN_USE: { httpStatus: 409, category: 'conflict', ptBR: 'O centro de custo está em uso e não pode ser removido.' },
  DUPLICATE_COST_CENTER_CODE: { httpStatus: 409, category: 'conflict', ptBR: 'Já existe um centro de custo com este código.' },
  DUPLICATE_CATALOG_CODE: { httpStatus: 409, category: 'conflict', ptBR: 'Já existe um item do catálogo com este código.' },
  FINANCE_CATALOG_DB_REQUIRED: { httpStatus: 503, category: 'unavailable', ptBR: 'O catálogo financeiro está indisponível no momento.' },
  INVALID_FINANCE_CATALOG_TYPE: { httpStatus: 400, category: 'validation', ptBR: 'Tipo de item do catálogo inválido.' },

  // ── fiscal / NFS-e ─────────────────────────────────────────────────────
  CFOP_NOT_FOUND: { httpStatus: 404, category: 'not_found', ptBR: 'CFOP não encontrado.' },
  COFINS_TABLE_NOT_FOUND: { httpStatus: 404, category: 'not_found', ptBR: 'Tabela de COFINS não encontrada.' },
  PIS_TABLE_NOT_FOUND: { httpStatus: 404, category: 'not_found', ptBR: 'Tabela de PIS não encontrada.' },
  ICMS_TABLE_NOT_FOUND: { httpStatus: 404, category: 'not_found', ptBR: 'Tabela de ICMS não encontrada.' },
  IPI_TABLE_NOT_FOUND: { httpStatus: 404, category: 'not_found', ptBR: 'Tabela de IPI não encontrada.' },
  IBS_CBS_TABLE_NOT_FOUND: { httpStatus: 404, category: 'not_found', ptBR: 'Tabela de IBS/CBS não encontrada.' },
  NFSE_DOCUMENT_NOT_FOUND: { httpStatus: 404, category: 'not_found', ptBR: 'Nota fiscal não encontrada.' },
  NFSE_LAYOUT_NOT_FOUND: { httpStatus: 404, category: 'not_found', ptBR: 'Layout de NFS-e não encontrado.' },
  NFSE_PROVIDER_ERROR: { httpStatus: 502, category: 'integration', ptBR: 'A prefeitura ou o provedor de NFS-e retornou um erro. Tente novamente mais tarde.' },
  INVALID_DOCUMENT_STATE: { httpStatus: 409, category: 'state', ptBR: 'A nota fiscal não está em um estado que permita esta operação.' },

  // ── laboratory integration ─────────────────────────────────────────────
  LABORATORY_PROVIDER_AUDIT_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: UNAVAILABLE },
  LABORATORY_PROVIDER_INGRESS_CONFLICT: { httpStatus: 409, category: 'conflict', ptBR: 'Este resultado de laboratório já foi recebido.' },
  LABORATORY_PROVIDER_INGRESS_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: 'O recebimento de resultados de laboratório está indisponível.' },
  LABORATORY_PROVIDER_INVALID_REQUEST: { httpStatus: 400, category: 'validation', ptBR: 'O resultado de laboratório enviado é inválido.' },
  LABORATORY_PROVIDER_UNAUTHORIZED: { httpStatus: 401, category: 'auth', ptBR: 'Laboratório não autorizado.' },
  LABORATORY_RETRY_REQUIRES_HUMAN_REVIEW: { httpStatus: 409, category: 'state', ptBR: 'Este resultado precisa de revisão humana antes de ser reprocessado.' },

  // ── reports ────────────────────────────────────────────────────────────
  COMMISSION_CALCULATIONS_REPORT_INVALID_FILTER: { httpStatus: 400, category: 'validation', ptBR: REPORT_FILTER },
  COMMISSION_CALCULATIONS_REPORT_RESULT_LIMIT: { httpStatus: 400, category: 'limit', ptBR: REPORT_LIMIT },
  COMMISSION_CALCULATIONS_REPORT_TENANT_MISMATCH: { httpStatus: 403, category: 'auth', ptBR: REPORT_TENANT },
  FINANCE_CATALOG_REPORT_INVALID_FILTER: { httpStatus: 400, category: 'validation', ptBR: REPORT_FILTER },
  FINANCE_CATALOG_REPORT_INVALID_STATE: { httpStatus: 409, category: 'state', ptBR: REPORT_ROW },
  FINANCE_CATALOG_REPORT_RESULT_LIMIT: { httpStatus: 400, category: 'limit', ptBR: REPORT_LIMIT },
  FINANCE_CATALOG_REPORT_TENANT_MISMATCH: { httpStatus: 403, category: 'auth', ptBR: REPORT_TENANT },
  FINANCIAL_RECEIVABLE_INVALID_FILTER: { httpStatus: 400, category: 'validation', ptBR: REPORT_FILTER },
  FINANCIAL_RECEIVABLE_RESULT_LIMIT: { httpStatus: 400, category: 'limit', ptBR: REPORT_LIMIT },
  FINANCIAL_RECEIVABLE_TENANT_MISMATCH: { httpStatus: 403, category: 'auth', ptBR: REPORT_TENANT },
  INVENTORY_INVOICES_REPORT_INVALID_FILTER: { httpStatus: 400, category: 'validation', ptBR: REPORT_FILTER },
  INVENTORY_INVOICES_REPORT_INVALID_ROW: { httpStatus: 500, category: 'internal', ptBR: REPORT_ROW },
  INVENTORY_INVOICES_REPORT_RESULT_LIMIT: { httpStatus: 400, category: 'limit', ptBR: REPORT_LIMIT },
  INVENTORY_INVOICES_REPORT_SOURCE_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: REPORT_SOURCE },
  INVENTORY_INVOICES_REPORT_TENANT_MISMATCH: { httpStatus: 403, category: 'auth', ptBR: REPORT_TENANT },
  INVENTORY_MOVEMENTS_REPORT_INVALID_FILTER: { httpStatus: 400, category: 'validation', ptBR: REPORT_FILTER },
  INVENTORY_MOVEMENTS_REPORT_INVALID_ROW: { httpStatus: 500, category: 'internal', ptBR: REPORT_ROW },
  INVENTORY_MOVEMENTS_REPORT_RESULT_LIMIT: { httpStatus: 400, category: 'limit', ptBR: REPORT_LIMIT },
  INVENTORY_MOVEMENTS_REPORT_SOURCE_UNAVAILABLE: { httpStatus: 503, category: 'unavailable', ptBR: REPORT_SOURCE },
  INVENTORY_MOVEMENTS_REPORT_TENANT_MISMATCH: { httpStatus: 403, category: 'auth', ptBR: REPORT_TENANT },
  INVENTORY_PRODUCTS_REPORT_INVALID_FILTER: { httpStatus: 400, category: 'validation', ptBR: REPORT_FILTER },
  INVENTORY_PRODUCTS_REPORT_RESULT_LIMIT: { httpStatus: 400, category: 'limit', ptBR: REPORT_LIMIT },
  INVENTORY_PRODUCTS_REPORT_TENANT_MISMATCH: { httpStatus: 403, category: 'auth', ptBR: REPORT_TENANT },
  INVENTORY_STOCK_REPORT_INVALID_ROW: { httpStatus: 500, category: 'internal', ptBR: REPORT_ROW },
  INVENTORY_STOCK_REPORT_RESULT_LIMIT: { httpStatus: 400, category: 'limit', ptBR: REPORT_LIMIT },
  INVENTORY_STOCK_REPORT_TENANT_MISMATCH: { httpStatus: 403, category: 'auth', ptBR: REPORT_TENANT },
  INVENTORY_STOCK_REPORT_UNSAFE_NUMBER: { httpStatus: 500, category: 'internal', ptBR: REPORT_ROW },
  OWNERS_REPORT_INVALID_FILTER: { httpStatus: 400, category: 'validation', ptBR: REPORT_FILTER },
  OWNERS_REPORT_RESULT_LIMIT: { httpStatus: 400, category: 'limit', ptBR: REPORT_LIMIT },
  OWNERS_REPORT_TENANT_MISMATCH: { httpStatus: 403, category: 'auth', ptBR: REPORT_TENANT },
  PATIENTS_REPORT_INVALID_FILTER: { httpStatus: 400, category: 'validation', ptBR: REPORT_FILTER },
  PATIENTS_REPORT_RESULT_LIMIT: { httpStatus: 400, category: 'limit', ptBR: REPORT_LIMIT },
  PATIENTS_REPORT_TENANT_MISMATCH: { httpStatus: 403, category: 'auth', ptBR: REPORT_TENANT },
  SERVICES_REPORT_INVALID_FILTER: { httpStatus: 400, category: 'validation', ptBR: REPORT_FILTER },
  SERVICES_REPORT_RESULT_LIMIT: { httpStatus: 400, category: 'limit', ptBR: REPORT_LIMIT },
  SERVICES_REPORT_TENANT_MISMATCH: { httpStatus: 403, category: 'auth', ptBR: REPORT_TENANT }
};

export type ErrorCode = keyof typeof ERROR_CATALOG;

export function isKnownErrorCode(code: unknown): code is ErrorCode {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(ERROR_CATALOG, code);
}

/**
 * Resolves the user-facing message for an error body. Validation errors are
 * refined by `details.reason`; unknown codes fall back to a generic message
 * so technical text never reaches the screen.
 */
export function resolveUserMessage(body: {
  readonly code?: unknown;
  readonly details?: unknown;
}): string {
  const code = body.code;
  const details = (body.details ?? {}) as ValidationErrorDetails;
  if (code === 'VALIDATION_ERROR' && details.reason && details.reason in VALIDATION_REASON_PT_BR) {
    return VALIDATION_REASON_PT_BR[details.reason];
  }
  if (isKnownErrorCode(code)) {
    return ERROR_CATALOG[code].ptBR;
  }
  return ERROR_CATALOG.INTERNAL_ERROR.ptBR;
}
