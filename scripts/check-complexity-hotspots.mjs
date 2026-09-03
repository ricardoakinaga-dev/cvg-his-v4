import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function toPosix(path) {
  return path.split(sep).join('/');
}

export function countPhysicalLines(content) {
  if (!content) return 0;
  const lines = content.replace(/\r\n/g, '\n').split('\n').length;
  return content.endsWith('\n') || content.endsWith('\r\n') ? lines - 1 : lines;
}

export function checkComplexityHotspots({
  rootDir = resolve(fileURLToPath(new URL('..', import.meta.url))),
  manifestPath = resolve(rootDir, 'docs/engineering/complexity-hotspots.json'),
} = {}) {
  if (!existsSync(manifestPath)) {
    return [`${toPosix(relative(rootDir, manifestPath))}: manifesto de hotspots ausente`];
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    return [`${toPosix(relative(rootDir, manifestPath))}: JSON inválido (${error.message})`];
  }

  const errors = [];
  if (manifest.schema_version !== 1) errors.push('manifesto: schema_version deve ser 1');
  if (manifest.measurement !== 'physical_lines_including_blanks') {
    errors.push('manifesto: measurement deve ser physical_lines_including_blanks');
  }

  const seen = new Set();
  for (const hotspot of manifest.hotspots ?? []) {
    const label = hotspot.path || '<path ausente>';
    if (!hotspot.path) {
      errors.push('hotspot: path ausente');
      continue;
    }
    if (seen.has(hotspot.path)) errors.push(`${label}: hotspot duplicado`);
    seen.add(hotspot.path);
    if (!hotspot.owner) errors.push(`${label}: owner ausente`);
    if (!hotspot.decomposition_plan) errors.push(`${label}: decomposition_plan ausente`);
    if (!Number.isInteger(hotspot.max_lines) || hotspot.max_lines <= 0) {
      errors.push(`${label}: max_lines deve ser inteiro positivo`);
      continue;
    }

    const absolutePath = resolve(rootDir, hotspot.path);
    if (!existsSync(absolutePath)) {
      errors.push(`${label}: arquivo não existe`);
      continue;
    }
    const actualLines = countPhysicalLines(readFileSync(absolutePath, 'utf8'));
    if (actualLines > hotspot.max_lines) {
      errors.push(`${label}: ${actualLines} linhas excedem o limite ${hotspot.max_lines}`);
    }
  }

  if (seen.size === 0) errors.push('manifesto: nenhum hotspot registrado');
  return errors.sort();
}

const invokedAsScript = process.argv[1]
  ? import.meta.url === pathToFileURL(isAbsolute(process.argv[1]) ? process.argv[1] : resolve(process.argv[1])).href
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
