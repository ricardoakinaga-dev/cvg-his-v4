import { appendFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relative, resolve } from 'node:path';
import { config } from '@vue/test-utils';

type VueComponentOptions = {
  __file?: unknown;
};

type VitestState = {
  testPath?: string;
  currentTestName?: string;
};

const root = resolve(process.env.CVG_REPO_ROOT || process.cwd());
const outputPath = process.env.CVG_VUE_SPECIALIZED_VITEST_OUTPUT?.trim();
const selectedSources = new Set(
  (process.env.CVG_VUE_SPECIALIZED_SOURCES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

function repositoryPath(value: string): string | null {
  const absolute = resolve(value);
  const path = relative(root, absolute).replaceAll('\\', '/');
  return path && path !== '..' && !path.startsWith('../') ? path : null;
}

function currentVitestState(): VitestState {
  const candidate = (
    globalThis as typeof globalThis & {
      expect?: { getState?: () => VitestState };
    }
  ).expect?.getState?.();
  return candidate || {};
}

function sourcePathFromComponent(options: VueComponentOptions): string | null {
  if (typeof options.__file !== 'string') return null;
  return repositoryPath(options.__file);
}

if (outputPath && selectedSources.size > 0) {
  config.global.mixins = [
    ...(config.global.mixins || []),
    {
      mounted(this: { $options: VueComponentOptions; $el: Element }) {
        const sourcePath = sourcePathFromComponent(this.$options);
        if (!sourcePath || !selectedSources.has(sourcePath)) return;

        const state = currentVitestState();
        const testFile = state.testPath ? repositoryPath(state.testPath) : null;
        const testName = state.currentTestName?.trim() || '';
        if (!testFile || !testName) return;

        const sourceBytes = readFileSync(resolve(root, sourcePath));
        const testBytes = readFileSync(resolve(root, testFile));
        const renderedHtml = this.$el?.outerHTML || '';
        appendFileSync(
          outputPath,
          `${JSON.stringify({
            sourcePath,
            sourceSha256: sha256(sourceBytes),
            renderer: '@vue/test-utils.mount',
            mounted: true,
            domFabricated: false,
            domMutations: 0,
            renderedHtmlSha256: sha256(renderedHtml),
            testFile,
            testFileSha256: sha256(testBytes),
            testName
          })}\n`
        );
      }
    }
  ];
}
