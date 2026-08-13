import { spawnSync } from 'node:child_process';

const run = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

console.log('Running secret scan...');
run('pnpm', ['security:secrets']);

console.log('Checking dependency advisories at every severity...');
run('pnpm', ['audit', '--audit-level=low']);
