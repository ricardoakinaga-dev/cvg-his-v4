import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import {
  VUE_SPECIALIZED_BUILD_KIND,
  VUE_SPECIALIZED_SCHEMA_VERSION,
  sha256,
  sourceSetDigest
} from './vue-specialized-evidence.mjs';

function normalizeId(id) {
  return id.replaceAll('\\', '/').replace(/^\0+/, '');
}

function withoutQuery(id) {
  return normalizeId(id).split('?')[0];
}

function asRelativeSource(root, id) {
  const absolute = withoutQuery(id);
  if (!isAbsolute(absolute)) return null;
  const path = relative(root, absolute).replaceAll('\\', '/');
  if (!path || path.startsWith('../') || path === '..') return null;
  return path;
}

function bundleBytes(asset) {
  if (asset.type === 'chunk') return Buffer.from(asset.code);
  if (typeof asset.source === 'string') return Buffer.from(asset.source);
  return Buffer.from(asset.source);
}

/**
 * Vite build-only producer for the specialized Vue evidence contract.
 *
 * The plugin is opt-in and never runs in an ordinary development/production
 * build. It records the SFC source hash at transform time, the transformed
 * module digest, and the emitted bundle bytes that contain that module. It
 * also injects a browser-only mounted hook used by the Playwright evidence
 * test; it does not add Istanbul/V8 counters or change application behavior
 * outside the evidence build.
 */
export function createVueSpecializedBuildEvidencePlugin({ root, manifest, contract, head, runId }) {
  const pending = new Map(
    (manifest.files ?? [])
      .filter(
        (file) =>
          file?.path?.endsWith('.vue') &&
          file.applicability === 'pending-specialized-instrumentation'
      )
      .map((file) => [file.path, file])
  );
  const records = new Map();

  const getRecord = (sourcePath) => {
    let record = records.get(sourcePath);
    if (!record) {
      const manifestEntry = pending.get(sourcePath);
      const sourceBytes = readFileSync(resolve(root, sourcePath));
      record = {
        sourceSha256: sha256(sourceBytes),
        transformedModules: [],
        outputFiles: [],
        manifestSha256: manifestEntry?.sha256
      };
      records.set(sourcePath, record);
    }
    return record;
  };

  return {
    name: 'cvg-vue-specialized-build-evidence',
    enforce: 'post',
    transform(code, id) {
      const sourcePath = asRelativeSource(root, id);
      if (!sourcePath || !pending.has(sourcePath)) return null;

      const record = getRecord(sourcePath);
      const normalizedId = normalizeId(id);
      const transformed = {
        id: normalizedId,
        codeSha256: sha256(code)
      };
      if (!record.transformedModules.some((item) => item.id === transformed.id))
        record.transformedModules.push(transformed);

      // The main SFC module produced by @vitejs/plugin-vue either declares or
      // imports _sfc_main, depending on whether the script is inlined. The
      // main module is the only safe place to register the actual component;
      // query submodules are recorded but never instrumented.
      if (!id.includes('?') && code.includes('_sfc_main')) {
        const hook = `\nif (typeof globalThis.__CVG_VUE_SPECIALIZED_REGISTER__ === 'function') globalThis.__CVG_VUE_SPECIALIZED_REGISTER__(${JSON.stringify(sourcePath)}, _sfc_main);\n`;
        if (!code.includes('__CVG_VUE_SPECIALIZED_REGISTER__')) {
          const instrumented = `${code}${hook}`;
          transformed.codeSha256 = sha256(instrumented);
          return instrumented;
        }
      }
      return null;
    },
    generateBundle(_outputOptions, bundle) {
      const outputByModule = new Map();
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type !== 'chunk') continue;
        for (const moduleId of Object.keys(asset.modules)) {
          const sourcePath = asRelativeSource(root, moduleId);
          if (!sourcePath || !pending.has(sourcePath)) continue;
          const list = outputByModule.get(sourcePath) ?? [];
          if (!list.includes(fileName)) list.push(fileName);
          outputByModule.set(sourcePath, list);
        }
      }

      const sources = {};
      for (const [sourcePath, record] of records) {
        const outputFiles = outputByModule.get(sourcePath) ?? [];
        record.outputFiles = outputFiles.map((file) => ({
          file,
          sha256: sha256(bundleBytes(bundle[file]))
        }));
        record.transformedModules.sort((a, b) => a.id.localeCompare(b.id));
        record.outputFiles.sort((a, b) => a.file.localeCompare(b.file));
        sources[sourcePath] = record;
      }

      const missing = [...pending.keys()].filter((path) => !sources[path]);
      const unbundled = Object.entries(sources)
        .filter(([, record]) => !record.outputFiles.length)
        .map(([path]) => path);
      if (missing.length || unbundled.length) {
        throw new Error(
          `Vue specialized build is incomplete (missing=${missing.join(',') || 'none'}; unbundled=${unbundled.join(',') || 'none'})`
        );
      }

      const sourceEntries = [...pending.entries()].map(([path, file]) => ({
        path,
        sha256: file.sha256
      }));
      const evidence = {
        schemaVersion: VUE_SPECIALIZED_SCHEMA_VERSION,
        kind: VUE_SPECIALIZED_BUILD_KIND,
        runId,
        head,
        contractKind: contract.kind,
        sourceSetSha256: sourceSetDigest(sourceEntries),
        sources
      };
      this.emitFile({
        type: 'asset',
        fileName: 'vue-specialized-build-evidence.json',
        source: `${JSON.stringify(evidence, null, 2)}\n`
      });
    }
  };
}
