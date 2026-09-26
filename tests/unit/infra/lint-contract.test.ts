import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const workspaceRoots = [join(repositoryRoot, 'apps'), join(repositoryRoot, 'packages')];

function findPackageManifests(root: string): string[] {
  const manifests: string[] = [];
  for (const entry of readdirSync(root)) {
    const absolute = join(root, entry);
    if (entry === 'node_modules' || entry === 'dist') continue;
    if (statSync(absolute).isDirectory()) {
      const manifest = join(absolute, 'package.json');
      if (statSync(absolute).isDirectory() && (() => {
        try {
          return statSync(manifest).isFile();
        } catch {
          return false;
        }
      })()) {
        manifests.push(manifest);
      }
      manifests.push(...findPackageManifests(absolute));
    }
  }
  return manifests;
}

describe('workspace lint contract', () => {
  const manifests = workspaceRoots.flatMap(findPackageManifests).sort();
  const packages = manifests.map((manifest) => ({
    manifest,
    relative: relative(repositoryRoot, manifest),
    packageJson: JSON.parse(readFileSync(manifest, 'utf8')) as {
      scripts?: Record<string, string>;
    }
  }));

  it('gives every workspace an explicit semantic lint and typecheck boundary', () => {
    expect(packages).toHaveLength(68);
    for (const workspace of packages) {
      const lint = workspace.packageJson.scripts?.lint;
      const typecheck = workspace.packageJson.scripts?.typecheck;
      expect(lint, workspace.relative).toContain('run-semantic-lint.mjs');
      expect(typecheck, workspace.relative).toBeTruthy();
      expect(lint, workspace.relative).not.toContain('tsc');
      expect(lint, workspace.relative).not.toContain('vue-tsc');
      expect(lint, workspace.relative).not.toBe(typecheck);
    }
  });

  it('keeps root lint and typecheck as separate workspace gates', () => {
    const root = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(root.scripts.lint).toContain('run lint');
    expect(root.scripts.typecheck).toContain('run typecheck');
    expect(root.scripts.lint).not.toBe(root.scripts.typecheck);
  });

  it('freezes the minimum semantic rules used by every workspace', () => {
    const config = readFileSync(join(repositoryRoot, '.eslintrc.semantic.cjs'), 'utf8');
    expect(config).toContain("'no-debugger': 'error'");
    expect(config).toContain("'no-unreachable': 'error'");
    expect(config).toContain("'no-unsafe-finally': 'error'");
    expect(config).toContain("'@typescript-eslint/no-explicit-any': 'warn'");
  });
});
