import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REQUIRED_CURRENT_KINDS = ['baseline', 'plan', 'roadmap', 'backlog'];
const REQUIRED_METADATA = [
  'document_status',
  'document_kind',
  'effective_date',
  'owner',
  'review_cycle',
];

function toPosix(path) {
  return path.split(sep).join('/');
}

export function parseDocumentFrontmatter(content) {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return null;

  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) return null;

  const metadata = {};
  for (const line of normalized.slice(4, end).split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    metadata[key] = value;
  }
  return metadata;
}

function walkMarkdown(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkMarkdown(fullPath));
    if (entry.isFile() && entry.name.endsWith('.md')) files.push(fullPath);
  }
  return files;
}

function extractLocalLinks(content) {
  const links = [];
  const markdownLink = /!?\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownLink.exec(content)) !== null) {
    let destination = match[1].trim();
    if (destination.startsWith('<')) {
      const end = destination.indexOf('>');
      destination = end === -1 ? destination : destination.slice(1, end);
    } else {
      destination = destination.replace(/\s+(?:["'][^"']*["']|\([^)]*\))\s*$/, '');
    }
    if (
      !destination ||
      destination.startsWith('#') ||
      destination.startsWith('//') ||
      /^[a-z][a-z\d+.-]*:/i.test(destination) ||
      destination.includes('{{')
    ) {
      continue;
    }
    links.push(destination);
  }
  return links;
}

function resolveLocalLink(rootDir, sourcePath, destination) {
  const pathOnly = destination.split('#', 1)[0].split('?', 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(pathOnly);
  } catch {
    decoded = pathOnly;
  }
  return decoded.startsWith('/')
    ? resolve(rootDir, decoded.slice(1))
    : resolve(dirname(sourcePath), decoded);
}

function resolveExistingLocalLink(rootDir, sourcePath, destination) {
  const target = resolveLocalLink(rootDir, sourcePath, destination);
  if (existsSync(target)) return target;

  // Repository documents also use Codex/GitHub-style `path:line[:column]` links.
  const withoutLocation = destination.replace(/:\d+(?::\d+)?(?=[#?]|$)/, '');
  if (withoutLocation !== destination) {
    const sourceTarget = resolveLocalLink(rootDir, sourcePath, withoutLocation);
    if (existsSync(sourceTarget)) return sourceTarget;
  }
  return target;
}

function validateMetadata(errors, label, metadata) {
  if (!metadata) {
    errors.push(`${label}: metadata frontmatter ausente`);
    return;
  }
  for (const field of REQUIRED_METADATA) {
    if (!metadata[field]) errors.push(`${label}: metadata obrigatória ausente: ${field}`);
  }
  if (
    metadata.effective_date &&
    !/^\d{4}-\d{2}-\d{2}$/.test(metadata.effective_date)
  ) {
    errors.push(`${label}: effective_date deve usar YYYY-MM-DD`);
  }
}

export function validateDocumentation({
  rootDir = resolve(fileURLToPath(new URL('..', import.meta.url))),
  manifestPath = resolve(rootDir, 'docs/document-governance.json'),
} = {}) {
  const errors = [];
  if (!existsSync(manifestPath)) {
    return [`${toPosix(relative(rootDir, manifestPath))}: manifesto documental ausente`];
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    return [`${toPosix(relative(rootDir, manifestPath))}: JSON inválido (${error.message})`];
  }

  if (manifest.schema_version !== 1) {
    errors.push('docs/document-governance.json: schema_version deve ser 1');
  }

  const currentDocuments = manifest.current_documents ?? {};
  const historicalDocuments = manifest.historical_documents ?? [];
  const governedPaths = new Set();
  const currentPaths = new Set();

  for (const kind of REQUIRED_CURRENT_KINDS) {
    const entry = currentDocuments[kind];
    if (!entry?.path) {
      errors.push(`manifesto: documento vigente ausente para ${kind}`);
      continue;
    }
    if (currentPaths.has(entry.path)) {
      errors.push(`manifesto: o mesmo arquivo está vigente para mais de um tipo: ${entry.path}`);
    }
    currentPaths.add(entry.path);
    governedPaths.add(entry.path);

    const absolutePath = resolve(rootDir, entry.path);
    if (!existsSync(absolutePath)) {
      errors.push(`${entry.path}: documento vigente não existe`);
      continue;
    }
    const metadata = parseDocumentFrontmatter(readFileSync(absolutePath, 'utf8'));
    validateMetadata(errors, entry.path, metadata);
    if (!metadata) continue;
    if (metadata.document_status !== 'current') {
      errors.push(`${entry.path}: document_status deve ser current`);
    }
    if (metadata.document_kind !== kind) {
      errors.push(`${entry.path}: document_kind deve ser ${kind}`);
    }
    if (metadata.effective_date !== entry.effective_date) {
      errors.push(`${entry.path}: effective_date diverge do manifesto`);
    }
  }

  for (const entry of historicalDocuments) {
    if (!entry?.path) {
      errors.push('manifesto: entrada histórica sem path');
      continue;
    }
    governedPaths.add(entry.path);
    const absolutePath = resolve(rootDir, entry.path);
    if (!existsSync(absolutePath)) {
      errors.push(`${entry.path}: documento histórico não existe`);
      continue;
    }
    const metadata = parseDocumentFrontmatter(readFileSync(absolutePath, 'utf8'));
    validateMetadata(errors, entry.path, metadata);
    if (!metadata) continue;
    if (metadata.document_status !== 'historical') {
      errors.push(`${entry.path}: document_status deve ser historical`);
    }
    if (!metadata.superseded_by) {
      errors.push(`${entry.path}: metadata obrigatória ausente: superseded_by`);
    } else if (metadata.superseded_by !== entry.superseded_by) {
      errors.push(`${entry.path}: superseded_by diverge do manifesto`);
    }
    if (!currentPaths.has(entry.superseded_by)) {
      errors.push(`${entry.path}: superseded_by não aponta para documento vigente`);
    }
  }

  const activeByKind = new Map();
  for (const absolutePath of walkMarkdown(resolve(rootDir, 'docs'))) {
    const metadata = parseDocumentFrontmatter(readFileSync(absolutePath, 'utf8'));
    if (metadata?.document_status !== 'current' || !metadata.document_kind) continue;
    const paths = activeByKind.get(metadata.document_kind) ?? [];
    paths.push(toPosix(relative(rootDir, absolutePath)));
    activeByKind.set(metadata.document_kind, paths);
  }
  for (const kind of REQUIRED_CURRENT_KINDS) {
    const paths = activeByKind.get(kind) ?? [];
    if (paths.length !== 1) {
      errors.push(`document_kind ${kind}: esperado 1 documento current, encontrados ${paths.length} (${paths.join(', ')})`);
    } else if (!currentPaths.has(paths[0])) {
      errors.push(`document_kind ${kind}: documento current não corresponde ao manifesto (${paths[0]})`);
    }
  }

  for (const indexPath of manifest.linked_indexes ?? []) governedPaths.add(indexPath);
  for (const governedPath of governedPaths) {
    const absolutePath = resolve(rootDir, governedPath);
    if (!existsSync(absolutePath)) {
      errors.push(`${governedPath}: arquivo governado não existe`);
      continue;
    }
    for (const destination of extractLocalLinks(readFileSync(absolutePath, 'utf8'))) {
      const target = resolveExistingLocalLink(rootDir, absolutePath, destination);
      if (!existsSync(target)) {
        errors.push(`${governedPath}: link local quebrado: ${destination}`);
      } else if (statSync(target).isDirectory() && !existsSync(resolve(target, 'README.md'))) {
        errors.push(`${governedPath}: diretório vinculado não possui README.md: ${destination}`);
      }
    }
  }

  return [...new Set(errors)].sort();
}

const invokedAsScript = process.argv[1]
  ? import.meta.url === pathToFileURL(isAbsolute(process.argv[1]) ? process.argv[1] : resolve(process.argv[1])).href
  : false;

if (invokedAsScript) {
  const errors = validateDocumentation();
  if (errors.length > 0) {
    console.error(`Documentação inválida (${errors.length} problema(s)):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('Documentação válida: baseline, plano, roadmap, backlog, histórico e links locais conferidos.');
  }
}
