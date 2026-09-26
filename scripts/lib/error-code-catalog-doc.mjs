/** Renders docs/engineering/API_ERROR_CODES.md from the shared error catalog. */
const CATEGORY_LABEL = {
  validation: 'Validação',
  auth: 'Autenticação e autorização',
  not_found: 'Não encontrado',
  conflict: 'Conflito',
  state: 'Estado inválido',
  unavailable: 'Indisponível',
  limit: 'Limite',
  integration: 'Integração externa',
  internal: 'Erro interno'
};

export function renderErrorCodeCatalogMarkdown(catalog) {
  const codes = Object.keys(catalog).sort();
  const lines = [
    '# Catálogo de códigos de erro da API',
    '',
    '**Fonte:** `packages/shared/errors/src/catalog.ts` · **Gerado por:** `node scripts/generate-error-code-catalog-doc.mjs` · não edite à mão.',
    '',
    'Toda resposta de erro da API tem o formato `{ code, message, details?, correlationId }`.',
    'O SPA mapeia `code` (e, em `VALIDATION_ERROR`, `details.field` + `details.reason`) para a mensagem',
    'em português desta tabela; `message` é texto técnico em inglês e nunca vai para a tela (R2-UX-01).',
    '',
    '## Motivos de validação (`details.reason`)',
    '',
    '| reason | Mensagem |',
    '|---|---|',
    '| `required` | Campo obrigatório. |',
    '| `invalid_type` | Valor em formato inválido. |',
    '| `invalid_enum` | Valor não permitido para este campo. |',
    '| `invalid_format` | Formato inválido. |',
    '| `out_of_range` | Valor fora do intervalo permitido. |',
    '| `too_long` | Texto muito longo. |',
    '| `too_short` | Texto muito curto. |',
    '| `mismatch` | Os valores informados não conferem. |',
    '',
    `## Códigos (${codes.length})`,
    '',
    '| Código | HTTP | Categoria | Mensagem ao usuário |',
    '|---|---:|---|---|'
  ];
  for (const code of codes) {
    const entry = catalog[code];
    lines.push(`| \`${code}\` | ${entry.httpStatus} | ${CATEGORY_LABEL[entry.category] ?? entry.category} | ${entry.ptBR} |`);
  }
  lines.push('');
  return lines.join('\n');
}
