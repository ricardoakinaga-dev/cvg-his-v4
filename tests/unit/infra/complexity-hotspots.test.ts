import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  checkComplexityHotspots,
  countPhysicalLines
} from '../../../scripts/check-complexity-hotspots.mjs';

const repositoryRoot = resolve(import.meta.dirname, '../../..');
const syntheticDiscovery = {
  threshold_lines: 2,
  roots: ['src'],
  extensions: ['.ts'],
  ignored_directories: []
};

function syntheticManifest(discovery = syntheticDiscovery, hotspots = []) {
  return {
    schema_version: 3,
    measurement: 'physical_lines_including_blanks',
    policy: {
      current_lines_must_match_measurement: true,
      max_lines_must_not_increase: true,
      risk_order: 'ascending_risk_rank'
    },
    owner_registry: { A: 'Synthetic owner' },
    discovery,
    hotspots
  };
}

function syntheticHotspot(path, riskRank) {
  return {
    path,
    owner: 'A',
    risk_rank: riskRank,
    risk_level: 'MEDIUM',
    risk_reason: 'synthetic path validation case',
    current_lines: 1,
    previous_max_lines: 1,
    max_lines: 1,
    decomposition_plan: 'keep the path inside the repository'
  };
}

describe('complexity hotspot budget', () => {
  it('keeps the repository hotspots within their frozen line budgets', () => {
    expect(checkComplexityHotspots({ rootDir: repositoryRoot })).toEqual([]);
  });

  it('counts files consistently with wc -l when they end in a newline', () => {
    expect(countPhysicalLines('one\ntwo\nthree\n')).toBe(3);
    expect(countPhysicalLines('one\ntwo')).toBe(2);
  });

  it('fails when a hotspot grows or loses ownership metadata', () => {
    const rootDir = mkdtempSync(resolve(tmpdir(), 'cvg-complexity-'));
    mkdirSync(resolve(rootDir, 'docs/engineering'), { recursive: true });
    mkdirSync(resolve(rootDir, 'src'), { recursive: true });
    writeFileSync(resolve(rootDir, 'src/hotspot.ts'), 'one\ntwo\nthree\n');
    writeFileSync(
      resolve(rootDir, 'docs/engineering/complexity-hotspots.json'),
      JSON.stringify({
        schema_version: 3,
        measurement: 'physical_lines_including_blanks',
        policy: {
          current_lines_must_match_measurement: true,
          max_lines_must_not_increase: true,
          risk_order: 'ascending_risk_rank'
        },
        owner_registry: { A: 'Synthetic owner' },
        discovery: syntheticDiscovery,
        hotspots: [
          {
            path: 'src/hotspot.ts',
            owner: '',
            risk_rank: 2,
            risk_level: 'HIGH',
            risk_reason: 'synthetic known-bad',
            current_lines: 2,
            previous_max_lines: 2,
            max_lines: 2,
            decomposition_plan: 'Extract responsibilities.'
          }
        ]
      })
    );

    expect(checkComplexityHotspots({ rootDir })).toEqual([
      'src/hotspot.ts: 3 linhas excedem o limite 2',
      'src/hotspot.ts: current_lines 2 não corresponde à medição 3',
      'src/hotspot.ts: owner ausente',
      'src/hotspot.ts: risk_rank 2 deve seguir a ordem do manifesto (1)'
    ]);
  });

  it('fails when a budget grows or risk ordering is not canonical', () => {
    const rootDir = mkdtempSync(resolve(tmpdir(), 'cvg-complexity-order-'));
    mkdirSync(resolve(rootDir, 'docs/engineering'), { recursive: true });
    mkdirSync(resolve(rootDir, 'src'), { recursive: true });
    writeFileSync(resolve(rootDir, 'src/first.ts'), 'one\n');
    writeFileSync(resolve(rootDir, 'src/second.ts'), 'one\ntwo\n');
    writeFileSync(
      resolve(rootDir, 'docs/engineering/complexity-hotspots.json'),
      JSON.stringify({
        schema_version: 3,
        measurement: 'physical_lines_including_blanks',
        policy: {
          current_lines_must_match_measurement: true,
          max_lines_must_not_increase: true,
          risk_order: 'ascending_risk_rank'
        },
        owner_registry: { A: 'First synthetic owner', B: 'Second synthetic owner' },
        discovery: syntheticDiscovery,
        hotspots: [
          {
            path: 'src/second.ts',
            owner: 'B',
            risk_rank: 2,
            risk_level: 'MEDIUM',
            risk_reason: 'second',
            current_lines: 2,
            previous_max_lines: 2,
            max_lines: 3,
            decomposition_plan: 'extract'
          },
          {
            path: 'src/first.ts',
            owner: 'A',
            risk_rank: 1,
            risk_level: 'MEDIUM',
            risk_reason: 'first',
            current_lines: 1,
            previous_max_lines: 1,
            max_lines: 1,
            decomposition_plan: 'extract'
          }
        ]
      })
    );

    expect(checkComplexityHotspots({ rootDir })).toEqual([
      'src/first.ts: risk_rank 1 deve seguir a ordem do manifesto (2)',
      'src/second.ts: max_lines 3 excede previous_max_lines 2',
      'src/second.ts: risk_rank 2 deve seguir a ordem do manifesto (1)'
    ]);
  });

  it('requires every discovered file above the threshold to have an owner and line budget', () => {
    const rootDir = mkdtempSync(resolve(tmpdir(), 'cvg-complexity-discovery-'));
    mkdirSync(resolve(rootDir, 'docs/engineering'), { recursive: true });
    mkdirSync(resolve(rootDir, 'src'), { recursive: true });
    writeFileSync(resolve(rootDir, 'src/known.ts'), 'one\n');
    writeFileSync(resolve(rootDir, 'src/unregistered.ts'), 'one\ntwo\nthree\n');
    const manifestPath = resolve(rootDir, 'docs/engineering/complexity-hotspots.json');
    const manifest = {
      schema_version: 3,
      measurement: 'physical_lines_including_blanks',
      policy: {
        current_lines_must_match_measurement: true,
        max_lines_must_not_increase: true,
        risk_order: 'ascending_risk_rank'
      },
      owner_registry: { A: 'Known synthetic owner', B: 'Registered source owner' },
      discovery: syntheticDiscovery,
      hotspots: [
        {
          path: 'src/known.ts',
          owner: 'A',
          risk_rank: 1,
          risk_level: 'MEDIUM',
          risk_reason: 'known',
          current_lines: 1,
          previous_max_lines: 1,
          max_lines: 1,
          decomposition_plan: 'keep small'
        }
      ]
    };
    writeFileSync(manifestPath, JSON.stringify(manifest));

    expect(checkComplexityHotspots({ rootDir })).toContain(
      'src/unregistered.ts: 3 linhas excedem o discovery.threshold_lines sem owner e orçamento registrados'
    );

    manifest.hotspots.push({
      path: 'src/unregistered.ts',
      owner: 'B',
      risk_rank: 2,
      risk_level: 'HIGH',
      risk_reason: 'large synthetic source',
      current_lines: 3,
      previous_max_lines: 3,
      max_lines: 3,
      decomposition_plan: 'extract'
    });
    writeFileSync(manifestPath, JSON.stringify(manifest));

    expect(checkComplexityHotspots({ rootDir })).toEqual([]);
  });

  it('rejects an owner code without a registered responsibility', () => {
    const rootDir = mkdtempSync(resolve(tmpdir(), 'cvg-complexity-owner-'));
    mkdirSync(resolve(rootDir, 'docs/engineering'), { recursive: true });
    mkdirSync(resolve(rootDir, 'src'), { recursive: true });
    writeFileSync(resolve(rootDir, 'src/hotspot.ts'), 'one\n');
    writeFileSync(
      resolve(rootDir, 'docs/engineering/complexity-hotspots.json'),
      JSON.stringify({
        schema_version: 3,
        measurement: 'physical_lines_including_blanks',
        policy: {
          current_lines_must_match_measurement: true,
          max_lines_must_not_increase: true,
          risk_order: 'ascending_risk_rank'
        },
        owner_registry: { A: 'Registered responsibility' },
        discovery: syntheticDiscovery,
        hotspots: [
          {
            path: 'src/hotspot.ts',
            owner: 'B',
            risk_rank: 1,
            risk_level: 'MEDIUM',
            risk_reason: 'known',
            current_lines: 1,
            previous_max_lines: 1,
            max_lines: 1,
            decomposition_plan: 'extract'
          }
        ]
      })
    );

    expect(checkComplexityHotspots({ rootDir })).toContain(
      'src/hotspot.ts: owner B não consta no owner_registry'
    );
  });

  it('rejects symlinked components in discovery roots', () => {
    const rootDir = mkdtempSync(resolve(tmpdir(), 'cvg-complexity-symlink-root-'));
    const outsideDir = mkdtempSync(resolve(tmpdir(), 'cvg-complexity-symlink-outside-'));
    mkdirSync(resolve(rootDir, 'docs/engineering'), { recursive: true });
    mkdirSync(resolve(rootDir, 'src'), { recursive: true });
    mkdirSync(resolve(outsideDir, 'child'));
    writeFileSync(resolve(rootDir, 'src/known.ts'), 'one\n');
    writeFileSync(resolve(outsideDir, 'child/large.ts'), 'one\ntwo\nthree\n');
    symlinkSync(outsideDir, resolve(rootDir, 'src/external'), 'dir');
    const manifest = syntheticManifest({ ...syntheticDiscovery, roots: ['src/external/child'] }, [
      syntheticHotspot('src/known.ts', 1)
    ]);
    writeFileSync(
      resolve(rootDir, 'docs/engineering/complexity-hotspots.json'),
      JSON.stringify(manifest)
    );

    expect(checkComplexityHotspots({ rootDir })).toContain(
      'src/external/child: raiz de descoberta deve ser diretório regular dentro da raiz, sem symlinks'
    );

    writeFileSync(
      resolve(rootDir, 'docs/engineering/complexity-hotspots.json'),
      JSON.stringify(
        syntheticManifest({ ...syntheticDiscovery, roots: ['src/../src'] }, [
          syntheticHotspot('src/known.ts', 1)
        ])
      )
    );
    expect(checkComplexityHotspots({ rootDir })).toContain(
      'src/../src: raiz de descoberta deve ser diretório regular dentro da raiz, sem symlinks'
    );
  });

  it('rejects registered files that traverse or use symlinks outside the repository', () => {
    const rootDir = mkdtempSync(resolve(tmpdir(), 'cvg-complexity-hotspot-path-'));
    const outsideDir = mkdtempSync(resolve(tmpdir(), 'cvg-complexity-hotspot-outside-'));
    mkdirSync(resolve(rootDir, 'docs/engineering'), { recursive: true });
    mkdirSync(resolve(rootDir, 'src'), { recursive: true });
    writeFileSync(resolve(outsideDir, 'secret.ts'), 'one\ntwo\nthree\n');
    symlinkSync(resolve(outsideDir, 'secret.ts'), resolve(rootDir, 'src/linked.ts'), 'file');
    const traversalPath = relative(rootDir, resolve(outsideDir, 'secret.ts')).split('\\').join('/');
    const manifest = syntheticManifest(syntheticDiscovery, [
      syntheticHotspot('src/linked.ts', 1),
      syntheticHotspot(traversalPath, 2)
    ]);
    writeFileSync(
      resolve(rootDir, 'docs/engineering/complexity-hotspots.json'),
      JSON.stringify(manifest)
    );

    expect(checkComplexityHotspots({ rootDir })).toEqual([
      `${traversalPath}: hotspot path deve apontar para arquivo regular dentro da raiz, sem symlinks`,
      'src/linked.ts: hotspot path deve apontar para arquivo regular dentro da raiz, sem symlinks'
    ]);
  });

  it('rejects a symlinked hotspot manifest before reading it', () => {
    const rootDir = mkdtempSync(resolve(tmpdir(), 'cvg-complexity-manifest-root-'));
    const outsideDir = mkdtempSync(resolve(tmpdir(), 'cvg-complexity-manifest-outside-'));
    mkdirSync(resolve(rootDir, 'docs/engineering'), { recursive: true });
    writeFileSync(resolve(outsideDir, 'manifest.json'), '{ invalid JSON');
    symlinkSync(
      resolve(outsideDir, 'manifest.json'),
      resolve(rootDir, 'docs/engineering/complexity-hotspots.json'),
      'file'
    );

    expect(checkComplexityHotspots({ rootDir })).toEqual([
      'manifesto: caminho deve ser arquivo regular dentro da raiz, sem symlinks'
    ]);
    expect(
      checkComplexityHotspots({
        rootDir,
        manifestPath: resolve(outsideDir, 'manifest.json')
      })
    ).toEqual(['manifesto: caminho deve ser arquivo regular dentro da raiz, sem symlinks']);

    const insideAbsolutePath = resolve(rootDir, 'docs/engineering/invalid.json');
    writeFileSync(insideAbsolutePath, '{ invalid JSON');
    expect(checkComplexityHotspots({ rootDir, manifestPath: insideAbsolutePath })).toEqual([
      'manifesto: caminho deve ser arquivo regular dentro da raiz, sem symlinks'
    ]);

    expect(
      checkComplexityHotspots({
        rootDir,
        manifestPath: relative(rootDir, resolve(outsideDir, 'manifest.json'))
      })
    ).toEqual(['manifesto: caminho deve ser arquivo regular dentro da raiz, sem symlinks']);
  });
});
