import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

try {
  mkdirSync(resolve(process.cwd(), 'coverage/.tmp'), { recursive: true, mode: 0o777 });
} catch (err: unknown) {
  // Ignore if already exists or no permission — vitest will handle
}
