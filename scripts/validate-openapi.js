#!/usr/bin/env node
/**
 * Backward-compatible entrypoint for the canonical ESM OpenAPI validator.
 *
 * Keep this CommonJS shim for historical commands and document links; the
 * package/CI entrypoint is scripts/validate-openapi.mjs.
 */

import('./validate-openapi.mjs').catch((error) => {
  console.error(`❌ Failed to load OpenAPI validator: ${error?.stack ?? error?.message ?? error}`);
  process.exitCode = 1;
});
