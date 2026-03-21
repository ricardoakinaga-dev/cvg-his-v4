#!/usr/bin/env -S node --import tsx

import {
  buildSmokeEndpoints,
  parseSmokeJson,
  resolveSmokeAuth,
  resolveSmokeBaseUrl,
  validateAuthMePayload
} from '../src/lib/iamOps.js';

async function main(): Promise<void> {
  const baseUrl = resolveSmokeBaseUrl(process.env);
  const auth = resolveSmokeAuth(process.env);
  const endpoints = buildSmokeEndpoints(baseUrl);

  console.log(`IAM smoke base: ${baseUrl}`);
  console.log(`IAM smoke auth source: ${auth.source}`);

  let hasFailure = false;

  for (const endpoint of endpoints) {
    const headers = new Headers({
      accept: 'application/json',
      [auth.headerName]: auth.headerValue
    });

    const response = await fetch(endpoint.url, {
      method: 'GET',
      headers,
      redirect: 'manual'
    });

    const bodyText = await response.text();
    console.log(`[${response.status}] GET ${endpoint.url}`);

    if (!response.ok) {
      hasFailure = true;
      console.error(`  resposta inesperada para ${endpoint.name}: ${bodyText.slice(0, 400)}`);
      continue;
    }

    if (endpoint.name === 'auth/me') {
      const parsed = parseSmokeJson(bodyText);
      if (!parsed) {
        hasFailure = true;
        console.error('  /auth/me não retornou JSON válido.');
        continue;
      }

      const authMePayload = (parsed as any).actor || parsed;
      const issues = validateAuthMePayload(authMePayload);
      if (issues.length > 0) {
        hasFailure = true;
        for (const issue of issues) {
          console.error(`  ${issue.field}: ${issue.message}`);
          if (issue.hint) {
            console.error(`  acao: ${issue.hint}`);
          }
        }
        continue;
      }

      console.log('  /auth/me validado com accountId, roles, permissions e sessionId.');
    }
  }

  if (hasFailure) {
    process.exitCode = 1;
    console.error('IAM smoke finalizado com falhas.');
    return;
  }

  console.log('IAM smoke finalizado com sucesso.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`IAM smoke falhou: ${message}`);
  process.exitCode = 1;
});
