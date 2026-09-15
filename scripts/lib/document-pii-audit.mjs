import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve, sep } from 'node:path';

export const DEFAULT_DOCUMENT_PII_SCOPES = Object.freeze([
  'docs/vetus',
  'legado/docs/vetus',
]);

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu;
const CPF_CNPJ_PATTERN = /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b|\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s-]?\d{4}[-\s]?\d{2}\b/gu;
const PHONE_PATTERN = /(?:\+?55[\s-]?)?\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}\b/gu;
const SECRET_ASSIGNMENT_PATTERN = /['"]?(?:token|password|senha|apikey|api_key|authorization|accessToken|refreshToken)['"]?\s*[:=]\s*['"]?(?:Bearer\s+)?[A-Za-z0-9._~+/=-]{12,}/giu;
const CPF_CONTEXT_PATTERN = /\b(?:cpf|cnpj|cpfcnpj|taxid|documento|document)\b/iu;
const PHONE_CONTEXT_PATTERN = /\b(?:phone|cellphone|telefone|celular|mobile|whatsapp)\b/iu;

function walkFiles(directory, files, walkErrors, symlinks) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    walkErrors.push({ path: directory, code: error.code ?? 'READ_ERROR' });
    return;
  }

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walkFiles(path, files, walkErrors, symlinks);
    else if (entry.isFile()) files.push(path);
    else if (entry.isSymbolicLink()) symlinks.push(path);
  }
}

function digits(value) {
  return value.replace(/\D/gu, '');
}

function allSame(value) {
  return value.length > 0 && /^(.)\1*$/u.test(value);
}

function validCpf(value) {
  const number = digits(value);
  if (number.length !== 11 || allSame(number)) return false;

  let sum = 0;
  for (let index = 0; index < 9; index += 1) sum += Number(number[index]) * (10 - index);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(number[9])) return false;

  sum = 0;
  for (let index = 0; index < 10; index += 1) sum += Number(number[index]) * (11 - index);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === Number(number[10]);
}

function validCnpj(value) {
  const number = digits(value);
  if (number.length !== 14 || allSame(number)) return false;

  const calculate = (length) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, index) => total + Number(number[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculate(12) === Number(number[12]) && calculate(13) === Number(number[13]);
}

function isReservedExampleEmail(value) {
  const [localPart = ''] = value.toLowerCase().split('@');
  const domain = value.toLowerCase().split('@').at(-1) ?? '';
  const genericLocalPart = /^(?:example|test|demo|fixture|user|usuario|email|nome|contato|admin|cliente|paciente|owner|patient)(?:[._-]|$)/u.test(localPart);
  return genericLocalPart && (domain === 'example.com'
    || domain === 'example.org'
    || domain === 'example.net'
    || domain.endsWith('.example')
    || domain.endsWith('.invalid')
    || domain.endsWith('.test'));
}

function isObviousPlaceholder(value) {
  const number = digits(value);
  return allSame(number)
    || /^(?:0|1|9){4,}$/u.test(number)
    || /^123456789(?:0|9)*$/u.test(number)
    || /^987654321(?:0|9)*$/u.test(number);
}

function classifyNumber(category, value) {
  if (isObviousPlaceholder(value)) return 'obvious-placeholder';
  if (category === 'cpf-or-cnpj-shaped' && (validCpf(value) || validCnpj(value))) {
    return 'valid-checksum';
  }
  return category === 'cpf-or-cnpj-shaped' ? 'contextual-shape' : 'contextual-phone-shape';
}

function addFinding(findings, root, file, lineNumber, column, category, value, classification, reviewRequired, fileSha256) {
  findings.push({
    path: relative(root, file).split('\\').join('/'),
    line: lineNumber,
    column,
    category,
    classification,
    reviewRequired,
    length: value.length,
    sha256: createHash('sha256').update(value).digest('hex'),
    fileSha256,
  });
}

function lineColumn(text, index) {
  const previousNewline = text.lastIndexOf('\n', index - 1);
  return {
    line: text.slice(0, index).split('\n').length,
    column: index - previousNewline,
  };
}

function contextAround(text, index, length) {
  return text.slice(Math.max(0, index - 200), Math.min(text.length, index + length + 200));
}

function scanText(text, root, file, findings, fileSha256) {
  const recordMatch = (category, match, classification, reviewRequired) => {
    const value = match[0];
    const location = lineColumn(text, match.index ?? 0);
    addFinding(
      findings,
      root,
      file,
      location.line,
      location.column,
      category,
      value,
      classification,
      reviewRequired,
      fileSha256,
    );
  };

  for (const match of text.matchAll(EMAIL_PATTERN)) {
    const value = match[0];
    const safeExample = isReservedExampleEmail(value);
    recordMatch('email', match, safeExample ? 'reserved-example-domain' : 'non-reserved-domain', !safeExample);
  }

  for (const match of text.matchAll(CPF_CNPJ_PATTERN)) {
    if (!CPF_CONTEXT_PATTERN.test(contextAround(text, match.index ?? 0, match[0].length))) continue;
    recordMatch(
      'cpf-or-cnpj-shaped',
      match,
      classifyNumber('cpf-or-cnpj-shaped', match[0]),
      true,
    );
  }

  for (const match of text.matchAll(PHONE_PATTERN)) {
    if (!PHONE_CONTEXT_PATTERN.test(contextAround(text, match.index ?? 0, match[0].length))) continue;
    recordMatch(
      'phone-shaped',
      match,
      classifyNumber('phone-shaped', match[0]),
      true,
    );
  }

  for (const match of text.matchAll(SECRET_ASSIGNMENT_PATTERN)) {
    recordMatch('secret-assignment-shaped', match, 'assignment-shaped', true);
  }
}

function isTextBuffer(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  if (sample.includes(0)) return false;
  if (buffer.toString('utf8').includes('\uFFFD')) return false;

  let controlBytes = 0;
  for (const byte of sample) {
    if ((byte < 7) || (byte > 13 && byte < 32)) controlBytes += 1;
  }
  return sample.length === 0 || controlBytes / sample.length < 0.01;
}

function inspectScope(root, scope) {
  const absoluteScope = resolve(root, scope);
  const rootPrefix = root.endsWith(sep) ? root : root + sep;
  if (absoluteScope !== root && !absoluteScope.startsWith(rootPrefix)) {
    throw new RangeError('Scope escapes audit root');
  }
  const files = [];
  const exists = existsSync(absoluteScope);
  const walkErrors = [];
  const symlinks = [];
  if (exists) walkFiles(absoluteScope, files, walkErrors, symlinks);
  const scopeRecord = {
    path: scope,
    exists,
    fileCount: files.length,
    textFileCount: 0,
    binaryFileCount: 0,
    symlinkCount: symlinks.length,
    walkErrorCount: walkErrors.length,
  };
  return {
    files,
    scopeRecord,
    walkErrors: walkErrors.map((error) => ({
      path: relative(root, error.path).split('\\').join('/'),
      code: error.code,
    })),
  };
}

export function auditDocumentPii({ root = process.cwd(), scopes = DEFAULT_DOCUMENT_PII_SCOPES } = {}) {
  const absoluteRoot = resolve(root);
  const findings = [];
  const scopeRecords = [];
  const fileManifest = [];
  const errors = [];

  for (const scope of scopes) {
    let inspected;
    try {
      inspected = inspectScope(absoluteRoot, scope);
    } catch (error) {
      if (error instanceof RangeError) throw error;
      errors.push({ path: String(scope), code: error.code ?? 'SCOPE_ERROR' });
      continue;
    }
    scopeRecords.push(inspected.scopeRecord);
    errors.push(...inspected.walkErrors);
    for (const file of inspected.files) {
      let buffer;
      try {
        buffer = readFileSync(file);
      } catch (error) {
        const path = relative(absoluteRoot, file).split('\\').join('/');
        errors.push({ path, code: error.code ?? 'READ_ERROR' });
        fileManifest.push({ path, readable: false });
        continue;
      }

      const path = relative(absoluteRoot, file).split('\\').join('/');
      const fileSha256 = createHash('sha256').update(buffer).digest('hex');
      const text = isTextBuffer(buffer);
      if (!text) {
        inspected.scopeRecord.binaryFileCount += 1;
        fileManifest.push({ path, readable: true, text: false, byteLength: buffer.length, sha256: fileSha256 });
        continue;
      }

      inspected.scopeRecord.textFileCount += 1;
      fileManifest.push({ path, readable: true, text: true, byteLength: buffer.length, sha256: fileSha256 });
      scanText(buffer.toString('utf8'), absoluteRoot, file, findings, fileSha256);
    }
  }

  const reviewRequiredFindings = findings.filter((finding) => finding.reviewRequired);
  const missingScopes = scopeRecords.filter((scope) => !scope.exists);
  const status = reviewRequiredFindings.length === 0 && missingScopes.length === 0 && errors.length === 0
    ? 'PASS'
    : 'REVIEW_REQUIRED';

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scopeRecords,
    fileManifest,
    summary: {
      status,
      fileCount: scopeRecords.reduce((total, scope) => total + scope.fileCount, 0),
      textFileCount: scopeRecords.reduce((total, scope) => total + scope.textFileCount, 0),
      binaryFileCount: scopeRecords.reduce((total, scope) => total + scope.binaryFileCount, 0),
      findingCount: findings.length,
      reviewRequiredCount: reviewRequiredFindings.length,
      missingScopeCount: missingScopes.length,
      readErrorCount: errors.length,
    },
    findings,
    errors,
    redaction: {
      candidateValuesIncluded: false,
      candidateValuesHashed: true,
      lineContentIncluded: false,
      note: 'Digestes are for restricted correlation only; a digest does not authorize a value as synthetic or safe.',
    },
  };
}
