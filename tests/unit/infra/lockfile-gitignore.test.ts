import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trimEnd();
}

describe('tracked pnpm lockfile policy', () => {
  it('keeps new and modified lockfiles visible to Git in a clean checkout', () => {
    const lockfile = 'pnpm-lock.yaml';
    const ignore = readFileSync(join(root, '.gitignore'), 'utf8');

    expect(git(root, 'ls-files', '--error-unmatch', lockfile)).toBe(lockfile);
    expect(ignore.split(/\r?\n/)).not.toContain(lockfile);

    const repository = mkdtempSync(join(tmpdir(), 'cvg-lockfile-policy-'));
    try {
      writeFileSync(join(repository, '.gitignore'), ignore);
      git(repository, 'init', '-q');
      git(repository, 'config', 'user.name', 'Lockfile Policy Test');
      git(repository, 'config', 'user.email', 'lockfile-policy@example.invalid');
      git(repository, 'add', '.gitignore');
      git(repository, 'commit', '-qm', 'baseline');

      writeFileSync(join(repository, lockfile), "lockfileVersion: '9.0'\n");
      expect(git(repository, 'status', '--short', '--', lockfile)).toBe(`?? ${lockfile}`);
      expect(
        spawnSync('git', ['check-ignore', '--no-index', lockfile], {
          cwd: repository,
          encoding: 'utf8'
        }).status
      ).toBe(1);

      git(repository, 'add', lockfile);
      git(repository, 'commit', '-qm', 'track lockfile');
      writeFileSync(join(repository, lockfile), "lockfileVersion: '9.0'\nsettings: {}\n");
      expect(git(repository, 'status', '--short', '--', lockfile)).toBe(` M ${lockfile}`);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});

describe('generated local state policy', () => {
  it('keeps the externalized state out of status without hiding normal source files', () => {
    const ignore = readFileSync(join(root, '.gitignore'), 'utf8');
    expect(ignore.split(/\r?\n/)).toContain('.gauntlet/state.json');

    // Exercise the rule in an isolated fixture; never inspect the real local state path.
    const repository = mkdtempSync(join(tmpdir(), 'cvg-generated-state-ignore-'));
    try {
      writeFileSync(join(repository, '.gitignore'), ignore);
      git(repository, 'init', '-q');
      mkdirSync(join(repository, '.gauntlet'));
      writeFileSync(join(repository, '.gauntlet', 'state.json'), '{"fixture":true}\n');
      writeFileSync(join(repository, 'source.ts'), 'export {};\n');

      const ignored = spawnSync(
        'git',
        ['check-ignore', '--no-index', '--quiet', '.gauntlet/state.json'],
        { cwd: repository, encoding: 'utf8' }
      );
      expect(ignored.status, ignored.stderr).toBe(0);
      expect(
        git(
          repository,
          'status',
          '--porcelain=v1',
          '--untracked-files=all',
          '--',
          '.gauntlet/state.json'
        )
      ).toBe('');
      expect(
        git(repository, 'status', '--porcelain=v1', '--untracked-files=all', '--', 'source.ts')
      ).toBe('?? source.ts');
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});
