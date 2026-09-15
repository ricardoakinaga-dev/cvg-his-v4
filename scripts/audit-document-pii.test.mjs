import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { auditDocumentPii } from './lib/document-pii-audit.mjs';

function cpfFromNineDigits(prefix) {
  const digits = String(prefix).padStart(9, '0').slice(-9);
  let sum = 0;
  for (let index = 0; index < 9; index += 1) sum += Number(digits[index]) * (10 - index);
  let first = (sum * 10) % 11;
  if (first === 10) first = 0;
  const withFirst = `${digits}${first}`;
  sum = 0;
  for (let index = 0; index < 10; index += 1) sum += Number(withFirst[index]) * (11 - index);
  let second = (sum * 10) % 11;
  if (second === 10) second = 0;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}-${first}${second}`;
}

test('returns only restricted metadata and flags non-reserved candidates', () => {
  const root = mkdtempSync(join(tmpdir(), 'document-pii-audit-'));
  mkdirSync(join(root, 'docs/vetus/guides'), { recursive: true });
  const identifier = cpfFromNineDigits('246813579');
  const source = [
    `  "cpfCnpj": "${identifier}",`,
    '  "email": "fixture@example.invalid",',
    '  "phone": "(11) 98888-7766",',
    '  "apiKey": "not-a-real-secret"',
  ].join('\n');
  writeFileSync(join(root, 'docs/vetus/guides/example.json'), source);

  const report = auditDocumentPii({ root, scopes: ['docs/vetus'] });
  const serialized = JSON.stringify(report);

  assert.equal(report.summary.status, 'REVIEW_REQUIRED');
  assert.equal(report.summary.fileCount, 1);
  assert.ok(report.summary.reviewRequiredCount >= 2);
  assert.equal(serialized.includes(identifier), false);
  assert.equal(serialized.includes('fixture@example.invalid'), false);
  assert.ok(report.findings.every((finding) => !('value' in finding)));
  assert.ok(report.findings.every((finding) => /^[a-f0-9]{64}$/u.test(finding.sha256)));
  assert.ok(report.findings.every((finding) => /^[a-f0-9]{64}$/u.test(finding.fileSha256)));
  assert.equal(report.fileManifest.length, 1);
  assert.equal(report.fileManifest[0].byteLength, Buffer.byteLength(source));
  assert.ok(report.findings.some((finding) => finding.category === 'secret-assignment-shaped'));
});

test('passes a reserved example and reports missing related roots without reading values', () => {
  const root = mkdtempSync(join(tmpdir(), 'document-pii-audit-safe-'));
  mkdirSync(join(root, 'docs/vetus'), { recursive: true });
  writeFileSync(join(root, 'docs/vetus/README.md'), 'owner@example.invalid\n');

  const report = auditDocumentPii({ root, scopes: ['docs/vetus', 'legado/docs/vetus'] });

  assert.equal(report.summary.status, 'REVIEW_REQUIRED');
  assert.equal(report.summary.reviewRequiredCount, 0);
  assert.equal(report.summary.missingScopeCount, 1);
  assert.equal(report.findings[0].classification, 'reserved-example-domain');
});

test('rejects scopes that escape the declared audit root', () => {
  const root = mkdtempSync(join(tmpdir(), 'document-pii-audit-boundary-'));

  assert.throws(
    () => auditDocumentPii({ root, scopes: ['../outside'] }),
    /Scope escapes audit root/u,
  );
});

test('finds a contextual candidate split across lines and excludes binary content', () => {
  const root = mkdtempSync(join(tmpdir(), 'document-pii-audit-boundary-'));
  mkdirSync(join(root, 'docs/vetus'), { recursive: true });
  writeFileSync(join(root, 'docs/vetus/wrapped.json'), '"phone":\n"(11)\n98888-7766"\n');
  writeFileSync(join(root, 'docs/vetus/image.bin'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  const report = auditDocumentPii({ root, scopes: ['docs/vetus'] });

  assert.equal(report.summary.binaryFileCount, 1);
  assert.equal(report.summary.textFileCount, 1);
  assert.ok(report.findings.some((finding) => finding.category === 'phone-shaped' && finding.line === 2));
  assert.equal(report.findings.some((finding) => finding.path.endsWith('image.bin')), false);
});
