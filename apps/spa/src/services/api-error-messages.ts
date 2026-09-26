import { isKnownErrorCode, resolveUserMessage } from '@cvg-his-v2/shared-errors';

/**
 * User-facing wording for API errors (R2-UX-01). The API keeps stable error
 * codes; the SPA owns the Portuguese copy. A server message is shown only when
 * it is already Portuguese: technical English text (for example
 * "Field 'encounterId' must be a valid UUID") never reaches the screen.
 */

const CODE_MESSAGES: Readonly<Record<string, string>> = {
  AUTHENTICATION_ERROR: 'Não foi possível confirmar sua identidade. Entre novamente.',
  FORBIDDEN: 'Você não tem permissão para realizar esta ação.',
  NOT_FOUND: 'O registro solicitado não foi encontrado ou não está mais disponível.',
  CONFLICT: 'Esta ação conflita com o estado atual do registro. Atualize a página e tente novamente.',
  VALIDATION_ERROR: 'Alguns dados informados são inválidos. Revise o formulário e tente novamente.',
  PAYLOAD_TOO_LARGE: 'O conteúdo enviado é maior do que o permitido.',
  RATE_LIMITED: 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.',
  NOT_IMPLEMENTED: 'Este recurso ainda não está disponível nesta instalação.',
  NOT_CONFIGURED: 'Este recurso ainda não foi configurado para a clínica.',
  FLAG_DISABLED: 'Este recurso está desativado para a clínica.',
  PERSISTENCE_UNAVAILABLE: 'O armazenamento de dados está indisponível no momento. Tente novamente em instantes.',
  INTERNAL_ERROR: 'Ocorreu um erro inesperado. Tente novamente; se persistir, acione o suporte.',
  AUTHENTICATION_UNAVAILABLE: 'O serviço de autenticação está indisponível no momento.',
  ALLERGY_ACKNOWLEDGEMENT_REQUIRED:
    'O medicamento coincide com uma alergia registrada do paciente. Informe a justificativa clínica.',
  DSR_NOT_OPEN: 'Esta solicitação do titular já foi encerrada.',
  DSR_ERASURE_NOT_EXECUTED: 'A eliminação de dados de usuários do sistema é feita pela administração de acesso.',
  DSR_ERASURE_EXECUTOR_UNAVAILABLE: 'A eliminação de dados ainda não está disponível nesta instalação.',
  SYNTHETIC_PIX_PROVIDER_DISABLED: 'O Pix não está configurado para esta instalação.',
  CASH_RECEIPT_REVERSAL_REQUIRED:
    'Este atendimento já foi recebido. Faça o estorno financeiro antes de continuar.',
  WORKFLOW_TASK_PERSISTENCE_REQUIRED: 'As tarefas clínicas estão indisponíveis no momento.',
  FINANCE_CATALOG_DB_REQUIRED:
    'O cadastro financeiro exige o banco de dados configurado nesta instalação.'
};

const STATUS_MESSAGES: Readonly<Record<number, string>> = {
  400: CODE_MESSAGES.VALIDATION_ERROR!,
  401: CODE_MESSAGES.AUTHENTICATION_ERROR!,
  403: CODE_MESSAGES.FORBIDDEN!,
  404: CODE_MESSAGES.NOT_FOUND!,
  409: CODE_MESSAGES.CONFLICT!,
  413: CODE_MESSAGES.PAYLOAD_TOO_LARGE!,
  422: CODE_MESSAGES.VALIDATION_ERROR!,
  429: CODE_MESSAGES.RATE_LIMITED!
};

const GENERIC_SERVER_MESSAGE =
  'Não foi possível concluir a operação agora. Tente novamente em instantes.';

// Words that only show up in Portuguese copy; English technical messages
// ("must", "invalid", "not found") never match.
const PORTUGUESE_HINT =
  /[ãõçáéíóúâêôà]|\b(não|nao|informe|obrigat[oó]ri[oa]|inv[aá]lid[oa]|deve|campo|paciente|tutor|atendimento|registro|solicita[cç][aã]o|permiss[aã]o|dados)\b/i;

export function isPortugueseMessage(message: string): boolean {
  return PORTUGUESE_HINT.test(message);
}

export interface ApiErrorBody {
  readonly code?: unknown;
  readonly message?: unknown;
  readonly details?: unknown;
}

/**
 * Message to show for an API error response. Order: the shared API error
 * catalog (code + details.reason), then a server message that is already
 * Portuguese, then local copy for codes the catalog does not know yet, then
 * the HTTP status. Raw English server text is never returned.
 */
export function resolveApiErrorMessage(status: number, body: ApiErrorBody | null | undefined): string {
  const code = typeof body?.code === 'string' ? body.code : '';
  if (code && isKnownErrorCode(code)) {
    return resolveUserMessage({ code, details: body?.details });
  }
  const serverMessage = typeof body?.message === 'string' ? body.message.trim() : '';
  if (serverMessage && isPortugueseMessage(serverMessage)) return serverMessage;
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code]!;
  return STATUS_MESSAGES[status] ?? GENERIC_SERVER_MESSAGE;
}
