import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));

export default {
  root: repositoryRoot,
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/infra/complexity-hotspots.test.ts'],
    pool: 'forks',
    maxWorkers: 1,
    setupFiles: []
  }
};
