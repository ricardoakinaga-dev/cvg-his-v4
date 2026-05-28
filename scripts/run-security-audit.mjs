import { spawnSync } from 'node:child_process';

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: false,
  });

  if (!options.allowFailure && result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
};

console.log('Running secret scan...');
run('pnpm', ['security:secrets']);

console.log('Checking high and critical dependency advisories...');
run('pnpm', ['audit', '--audit-level=high']);

console.log('Collecting moderate dependency advisory summary...');
const audit = run('pnpm', ['audit', '--audit-level=moderate', '--json'], {
  allowFailure: true,
  capture: true,
});

if (!audit.stdout.trim()) {
  console.log('No moderate dependency advisory payload returned.');
  process.exit(0);
}

const report = JSON.parse(audit.stdout);
const vulnerabilities = report.metadata?.vulnerabilities ?? {};
const advisories = Object.values(report.advisories ?? {});
const moderateAdvisories = advisories.filter((advisory) => advisory.severity === 'moderate');

console.log(
  `Dependency audit summary: critical=${vulnerabilities.critical ?? 0}, high=${vulnerabilities.high ?? 0}, moderate=${vulnerabilities.moderate ?? 0}`,
);

if (moderateAdvisories.length > 0) {
  console.log('Moderate advisories kept as tracked dependency debt:');
  for (const advisory of moderateAdvisories) {
    console.log(`- ${advisory.module_name}: ${advisory.title}`);
  }
}
