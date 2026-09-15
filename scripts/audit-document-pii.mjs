import { writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

import { auditDocumentPii, DEFAULT_DOCUMENT_PII_SCOPES } from './lib/document-pii-audit.mjs';

function parseArguments(argv) {
  const scopes = [];
  let root = process.cwd();
  let output;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--root') root = argv[++index];
    else if (argument === '--scope') scopes.push(argv[++index]);
    else if (argument === '--output') output = argv[++index];
    else if (argument === '--help') {
      console.log('Usage: node scripts/audit-document-pii.mjs [--root PATH] [--scope PATH]... [--output PATH]');
      process.exit(0);
    }
  }

  return { root, scopes: scopes.length > 0 ? scopes : DEFAULT_DOCUMENT_PII_SCOPES, output };
}

const options = parseArguments(process.argv.slice(2));
const report = auditDocumentPii(options);

if (options.output) {
  const outputPath = resolve(options.root, options.output);
  const rootPath = resolve(options.root);
  const rootPrefix = rootPath.endsWith(sep) ? rootPath : rootPath + sep;
  if (outputPath !== rootPath && !outputPath.startsWith(rootPrefix)) {
    throw new RangeError('Output escapes audit root');
  }
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
}

console.log(JSON.stringify({
  status: report.summary.status,
  fileCount: report.summary.fileCount,
  findingCount: report.summary.findingCount,
  reviewRequiredCount: report.summary.reviewRequiredCount,
  missingScopeCount: report.summary.missingScopeCount,
  readErrorCount: report.summary.readErrorCount,
}, null, 2));

if (report.summary.status !== 'PASS') process.exitCode = 1;
