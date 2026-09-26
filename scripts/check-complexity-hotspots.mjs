import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function toPosix(path) {
  return path.split(sep).join('/');
}

const SUPPORTED_SCHEMA_VERSION = 3;
const REQUIRED_RISK_LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

export function countPhysicalLines(content) {
  if (!content) return 0;
  const lines = content.replace(/\r\n/g, '\n').split('\n').length;
  return content.endsWith('\n') || content.endsWith('\r\n') ? lines - 1 : lines;
}

function isWithin(parentPath, childPath) {
  const pathFromParent = relative(parentPath, childPath);
  return (
    pathFromParent === '' ||
    (!isAbsolute(pathFromParent) &&
      pathFromParent !== '..' &&
      !pathFromParent.startsWith(`..${sep}`))
  );
}

function inspectPathInsideRoot(
  rootPath,
  pathValue,
  kind,
  { requireCanonicalRelative = false } = {}
) {
  if (typeof pathValue !== 'string' || pathValue.trim() === '' || pathValue.includes('\\')) {
    return { error: 'invalid' };
  }
  const rawSegments = pathValue.split(/[\\/]/);
  if (rawSegments.some((segment) => segment === '.' || segment === '..')) {
    return { error: 'invalid' };
  }

  const absolutePath = isAbsolute(pathValue) ? resolve(pathValue) : resolve(rootPath, pathValue);
  if (!isWithin(rootPath, absolutePath)) return { error: 'outside' };

  const relativePath = toPosix(relative(rootPath, absolutePath));
  if (
    relativePath === '' ||
    relativePath === '.' ||
    relativePath
      .split('/')
      .some((segment) => segment === '' || segment === '.' || segment === '..') ||
    (requireCanonicalRelative && relativePath !== pathValue)
  ) {
    return { error: 'invalid' };
  }

  const segments = relativePath.split('/');
  let currentPath = rootPath;
  for (const [index, segment] of segments.entries()) {
    currentPath = resolve(currentPath, segment);
    let stat;
    try {
      stat = lstatSync(currentPath);
    } catch {
      return { error: 'missing' };
    }
    if (stat.isSymbolicLink()) return { error: 'symlink' };

    const finalSegment = index === segments.length - 1;
    if (!finalSegment && !stat.isDirectory()) return { error: 'type' };
    if (finalSegment && kind === 'directory' && !stat.isDirectory()) return { error: 'type' };
    if (finalSegment && kind === 'file' && !stat.isFile()) return { error: 'type' };
  }

  let canonicalPath;
  try {
    canonicalPath = realpathSync(currentPath);
  } catch {
    return { error: 'missing' };
  }
  if (!isWithin(rootPath, canonicalPath)) return { error: 'outside' };
  return { path: canonicalPath };
}

function discoverLargeFiles(rootDir, discovery) {
  const errors = [];
  const discovered = [];
  const threshold = discovery?.threshold_lines;
  const roots = discovery?.roots;
  const extensions = discovery?.extensions;
  const ignoredDirectories = discovery?.ignored_directories ?? [];

  if (!isPositiveInteger(threshold)) {
    errors.push('manifesto: discovery.threshold_lines deve ser inteiro positivo');
  }
  if (!Array.isArray(roots) || roots.length === 0) {
    errors.push('manifesto: discovery.roots deve conter ao menos uma raiz');
  }
  if (
    !Array.isArray(extensions) ||
    extensions.length === 0 ||
    extensions.some(
      (extension) => typeof extension !== 'string' || !/^\.[a-z0-9]+$/i.test(extension)
    )
  ) {
    errors.push('manifesto: discovery.extensions deve listar extensões com ponto inicial');
  }
  if (
    !Array.isArray(ignoredDirectories) ||
    ignoredDirectories.some((directory) => typeof directory !== 'string' || directory.length === 0)
  ) {
    errors.push('manifesto: discovery.ignored_directories deve conter nomes de diretório válidos');
  }
  if (errors.length > 0) return { discovered, errors };

  const canonicalRoot = rootDir;
  const allowedExtensions = new Set(extensions.map((extension) => extension.toLowerCase()));
  const ignored = new Set(ignoredDirectories);

  const visit = (directoryPath, rootLabel) => {
    let entries;
    try {
      entries = readdirSync(directoryPath, { withFileTypes: true });
    } catch {
      errors.push(`${rootLabel}: diretório de descoberta não pode ser lido`);
      return;
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const entryPath = resolve(directoryPath, entry.name);
      if (entry.isDirectory()) {
        if (!ignored.has(entry.name)) visit(entryPath, rootLabel);
        continue;
      }
      if (!entry.isFile() || !allowedExtensions.has(extname(entry.name).toLowerCase())) continue;

      let stat;
      try {
        stat = lstatSync(entryPath);
      } catch {
        errors.push(
          `${toPosix(relative(canonicalRoot, entryPath))}: arquivo de descoberta indisponível`
        );
        continue;
      }
      if (!stat.isFile() || stat.isSymbolicLink()) continue;

      let content;
      try {
        content = readFileSync(entryPath, 'utf8');
      } catch {
        errors.push(
          `${toPosix(relative(canonicalRoot, entryPath))}: arquivo de descoberta não pode ser lido`
        );
        continue;
      }
      const lines = countPhysicalLines(content);
      if (lines > threshold) {
        discovered.push({
          path: toPosix(relative(canonicalRoot, entryPath)),
          lines
        });
      }
    }
  };

  for (const root of roots) {
    if (typeof root !== 'string' || root.trim() === '' || root.includes('\\')) {
      errors.push('manifesto: discovery.roots deve conter caminhos POSIX não vazios');
      continue;
    }
    const rootInspection = inspectPathInsideRoot(canonicalRoot, root, 'directory', {
      requireCanonicalRelative: true
    });
    if (rootInspection.error) {
      if (rootInspection.error === 'missing') {
        errors.push(`${root}: raiz de descoberta não existe`);
      } else {
        errors.push(
          `${root}: raiz de descoberta deve ser diretório regular dentro da raiz, sem symlinks`
        );
      }
      continue;
    }
    const rootPath = rootInspection.path;
    if (!rootPath) {
      errors.push(`manifesto: discovery root insegura (${root})`);
      continue;
    }
    visit(rootPath, root);
  }

  return { discovered, errors };
}

export function checkComplexityHotspots({
  rootDir = resolve(fileURLToPath(new URL('..', import.meta.url))),
  manifestPath
} = {}) {
  let canonicalRoot;
  try {
    canonicalRoot = realpathSync(rootDir);
  } catch {
    return ['raiz do repositório indisponível'];
  }

  const selectedManifestPath = manifestPath ?? 'docs/engineering/complexity-hotspots.json';
  const manifestLabel = toPosix(String(selectedManifestPath));
  const manifestInspection = inspectPathInsideRoot(canonicalRoot, selectedManifestPath, 'file', {
    requireCanonicalRelative: true
  });
  if (manifestInspection.error) {
    if (manifestInspection.error === 'missing') {
      return [`${manifestLabel}: manifesto de hotspots ausente`];
    }
    return ['manifesto: caminho deve ser arquivo regular dentro da raiz, sem symlinks'];
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestInspection.path, 'utf8'));
  } catch (error) {
    return [
      `${toPosix(relative(canonicalRoot, manifestInspection.path))}: JSON inválido (${error.message})`
    ];
  }

  const errors = [];
  if (manifest.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    errors.push(`manifesto: schema_version deve ser ${SUPPORTED_SCHEMA_VERSION}`);
  }
  if (manifest.measurement !== 'physical_lines_including_blanks') {
    errors.push('manifesto: measurement deve ser physical_lines_including_blanks');
  }

  if (manifest.policy?.current_lines_must_match_measurement !== true) {
    errors.push('manifesto: policy.current_lines_must_match_measurement deve ser true');
  }
  if (manifest.policy?.max_lines_must_not_increase !== true) {
    errors.push('manifesto: policy.max_lines_must_not_increase deve ser true');
  }
  if (manifest.policy?.risk_order !== 'ascending_risk_rank') {
    errors.push('manifesto: policy.risk_order deve ser ascending_risk_rank');
  }
  const ownerRegistry = manifest.owner_registry;
  if (
    !ownerRegistry ||
    typeof ownerRegistry !== 'object' ||
    Array.isArray(ownerRegistry) ||
    Object.entries(ownerRegistry).some(
      ([owner, description]) =>
        owner.trim() === '' || typeof description !== 'string' || description.trim() === ''
    )
  ) {
    errors.push('manifesto: owner_registry deve mapear cada owner a uma descrição não vazia');
  }

  const discovery = discoverLargeFiles(canonicalRoot, manifest.discovery);
  errors.push(...discovery.errors);

  const seen = new Set();
  const seenRiskRanks = new Set();
  const hotspots = Array.isArray(manifest.hotspots) ? manifest.hotspots : [];
  if (!Array.isArray(manifest.hotspots)) {
    errors.push('manifesto: hotspots deve ser uma lista');
  }
  for (const [index, hotspot] of hotspots.entries()) {
    const label = hotspot?.path || '<path ausente>';
    if (!hotspot || typeof hotspot !== 'object') {
      errors.push(`${label}: hotspot deve ser objeto`);
      continue;
    }
    if (!hotspot.path) {
      errors.push('hotspot: path ausente');
      continue;
    }
    if (seen.has(hotspot.path)) errors.push(`${label}: hotspot duplicado`);
    seen.add(hotspot.path);
    if (!hotspot.owner) {
      errors.push(`${label}: owner ausente`);
    } else if (
      ownerRegistry &&
      typeof ownerRegistry === 'object' &&
      !Array.isArray(ownerRegistry) &&
      typeof ownerRegistry[hotspot.owner] !== 'string'
    ) {
      errors.push(`${label}: owner ${hotspot.owner} não consta no owner_registry`);
    }
    if (!hotspot.decomposition_plan) errors.push(`${label}: decomposition_plan ausente`);
    if (!isPositiveInteger(hotspot.risk_rank)) {
      errors.push(`${label}: risk_rank deve ser inteiro positivo`);
    } else {
      if (seenRiskRanks.has(hotspot.risk_rank)) {
        errors.push(`${label}: risk_rank duplicado ${hotspot.risk_rank}`);
      }
      seenRiskRanks.add(hotspot.risk_rank);
      if (hotspot.risk_rank !== index + 1) {
        errors.push(
          `${label}: risk_rank ${hotspot.risk_rank} deve seguir a ordem do manifesto (${index + 1})`
        );
      }
    }
    if (!REQUIRED_RISK_LEVELS.has(hotspot.risk_level)) {
      errors.push(`${label}: risk_level inválido`);
    }
    if (!hotspot.risk_reason) errors.push(`${label}: risk_reason ausente`);
    if (!isPositiveInteger(hotspot.current_lines)) {
      errors.push(`${label}: current_lines deve ser inteiro positivo`);
    }
    if (!isPositiveInteger(hotspot.previous_max_lines)) {
      errors.push(`${label}: previous_max_lines deve ser inteiro positivo`);
    }
    if (!isPositiveInteger(hotspot.max_lines)) {
      errors.push(`${label}: max_lines deve ser inteiro positivo`);
      continue;
    }
    if (
      isPositiveInteger(hotspot.previous_max_lines) &&
      hotspot.max_lines > hotspot.previous_max_lines
    ) {
      errors.push(
        `${label}: max_lines ${hotspot.max_lines} excede previous_max_lines ${hotspot.previous_max_lines}`
      );
    }

    const fileInspection = inspectPathInsideRoot(canonicalRoot, hotspot.path, 'file', {
      requireCanonicalRelative: true
    });
    if (fileInspection.error) {
      errors.push(
        fileInspection.error === 'missing'
          ? `${label}: arquivo não existe`
          : `${label}: hotspot path deve apontar para arquivo regular dentro da raiz, sem symlinks`
      );
      continue;
    }
    const actualLines = countPhysicalLines(readFileSync(fileInspection.path, 'utf8'));
    if (isPositiveInteger(hotspot.current_lines) && actualLines !== hotspot.current_lines) {
      errors.push(
        `${label}: current_lines ${hotspot.current_lines} não corresponde à medição ${actualLines}`
      );
    }
    if (actualLines > hotspot.max_lines) {
      errors.push(`${label}: ${actualLines} linhas excedem o limite ${hotspot.max_lines}`);
    }
  }

  if (seen.size === 0) errors.push('manifesto: nenhum hotspot registrado');
  if (seenRiskRanks.size !== hotspots.length) {
    errors.push('manifesto: cada hotspot deve possuir risk_rank único');
  }
  for (const file of discovery.discovered) {
    if (!seen.has(file.path)) {
      errors.push(
        `${file.path}: ${file.lines} linhas excedem o discovery.threshold_lines sem owner e orçamento registrados`
      );
    }
  }
  return errors.sort();
}

const invokedAsScript = process.argv[1]
  ? import.meta.url ===
    pathToFileURL(isAbsolute(process.argv[1]) ? process.argv[1] : resolve(process.argv[1])).href
  : false;

if (invokedAsScript) {
  const errors = checkComplexityHotspots();
  if (errors.length > 0) {
    console.error(`Orçamento de complexidade inválido (${errors.length} problema(s)):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('Orçamento de complexidade válido: hotspots, owners e limites conferidos.');
  }
}
