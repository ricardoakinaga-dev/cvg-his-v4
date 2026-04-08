#!/usr/bin/env node
/**
 * OpenAPI spec validation — pragmatic consistency checks.
 *
 * Checks:
 * 1. Valid YAML parsing
 * 2. OpenAPI version present (3.x)
 * 3. Info block complete (title, version)
 * 4. Paths object present and non-empty
 * 5. All referenced tags are declared
 * 6. No duplicate operationIds
 * 7. All paths have valid HTTP methods
 * 8. Schema references resolve to defined schemas
 *
 * Usage: node scripts/validate-openapi.js [path]
 */

import { readFileSync } from 'fs';
import { parse } from 'yaml';

const VALID_HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

const path = process.argv[2] || 'apps/api/src/openapi.yaml';

let errors = [];

try {
  const content = readFileSync(path, 'utf-8');
  const doc = parse(content, { prettyErrors: true });

  // 1. OpenAPI version
  if (!doc.openapi) {
    errors.push('Missing "openapi" field (expected 3.x)');
  } else if (!doc.openapi.startsWith('3.')) {
    errors.push(`Unsupported OpenAPI version: ${doc.openapi}`);
  }

  // 2. Info block
  if (!doc.info || !doc.info.title || !doc.info.version) {
    errors.push('Missing info.title or info.version');
  }

  // 3. Paths
  if (!doc.paths || typeof doc.paths !== 'object') {
    errors.push('Missing "paths" object');
  } else {
    const pathCount = Object.keys(doc.paths).length;
    console.log(`✅ OpenAPI valid: ${doc.info?.title} v${doc.info?.version} (${pathCount} paths)`);

    // 4. Valid HTTP methods per path
    for (const [pathStr, pathObj] of Object.entries(doc.paths)) {
      if (typeof pathObj !== 'object') continue;
      for (const [method, operation] of Object.entries(pathObj)) {
        if (method === 'parameters') continue;
        if (!VALID_HTTP_METHODS.includes(method)) {
          errors.push(`Invalid HTTP method "${method}" in path ${pathStr}`);
        }
        // 5. operationId uniqueness
        if (operation?.operationId) {
          // Check for duplicate operationIds
          const allOps = Object.values(doc.paths).flatMap((p) =>
            Object.entries(p)
              .filter(([m]) => VALID_HTTP_METHODS.includes(m))
              .map(([, o]) => o?.operationId)
          );
          const opId = operation.operationId;
          if (allOps.filter((id) => id === opId).length > 1) {
            errors.push(`Duplicate operationId: "${opId}"`);
          }
        }
        // 6. Tag existence
        if (operation?.tags && Array.isArray(operation.tags)) {
          const declaredTags = new Set((doc.tags || []).map((t) => t.name));
          for (const tag of operation.tags) {
            if (!declaredTags.has(tag)) {
              errors.push(`Undefined tag "${tag}" used in ${method.toUpperCase()} ${pathStr}`);
            }
          }
        }
      }
    }
  }

  // 7. Schema reference validation (basic)
  const definedSchemas = new Set(Object.keys(doc.components?.schemas || {}));
  const schemaRefRegex = /#\/components\/schemas\/([A-Za-z0-9_]+)/g;
  const yamlContent = content;

  // Extract all $ref from specs (from the structured doc)
  const extractRefs = (obj, refs = []) => {
    if (!obj || typeof obj !== 'object') return refs;
    if (obj.$ref && typeof obj.$ref === 'string') {
      const match = obj.$ref.match(/#\/components\/schemas\/([A-Za-z0-9_]+)/);
      if (match) refs.push(match[1]);
    }
    if (Array.isArray(obj)) {
      obj.forEach((item) => extractRefs(item, refs));
    } else {
      Object.values(obj).forEach((val) => extractRefs(val, refs));
    }
    return refs;
  };

  const allRefs = extractRefs(doc);
  for (const ref of allRefs) {
    if (!definedSchemas.has(ref)) {
      errors.push(`Referenced schema "${ref}" is not defined in components.schemas`);
    }
  }

  // Summary
  const pathCount = Object.keys(doc.paths || {}).length;
  const tagCount = (doc.tags || []).length;
  const schemaCount = definedSchemas.size;

  console.log(`   Paths: ${pathCount} | Tags: ${tagCount} | Schemas: ${schemaCount}`);

  if (errors.length > 0) {
    console.error('\n❌ OpenAPI validation failed:');
    errors.forEach((e) => console.error(`   - ${e}`));
    process.exit(1);
  }

  console.log('✅ All structural checks passed');
  process.exit(0);
} catch (err) {
  console.error('❌ Failed to parse OpenAPI spec:', err.message);
  process.exit(1);
}
