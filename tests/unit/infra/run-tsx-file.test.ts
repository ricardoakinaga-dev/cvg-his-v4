import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runTsxFileSync } from '../../helpers/run-tsx-file.js';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('runTsxFileSync', () => {
  it('runs a script whose path and argument contain spaces and Unicode', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cvg-his caminho ç '));
    temporaryDirectories.push(directory);
    const scriptPath = join(directory, 'entrada com espaço.ts');
    const outputPath = join(directory, 'saída.json');
    writeFileSync(
      scriptPath,
      "import { writeFileSync } from 'node:fs'; writeFileSync(process.argv[2]!, JSON.stringify(process.argv.slice(3)));\n",
      'utf8'
    );

    runTsxFileSync(scriptPath, [outputPath, 'olá mundo'], { stdio: 'pipe' });

    expect(JSON.parse(readFileSync(outputPath, 'utf8'))).toEqual(['olá mundo']);
  });
});
