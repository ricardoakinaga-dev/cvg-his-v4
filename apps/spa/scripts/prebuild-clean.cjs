const { rmSync, existsSync } = require('node:fs');

for (const dir of ['dist', 'dev-dist']) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log('Cleaned dist/ and dev-dist/ successfully.');
