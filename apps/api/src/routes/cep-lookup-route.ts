import type { IncomingMessage, ServerResponse } from 'node:http';
import type { URL } from 'node:url';

import type { CorrelationId } from '@cvg-his-v2/shared-types';

export interface CepLookupRouteHandlers {
  readonly fetcher: typeof fetch;
}

export async function handleCepLookupRoute(
  pathname: string,
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: CorrelationId | string,
  handlers: CepLookupRouteHandlers
): Promise<boolean> {
  if (pathname !== '/cep/lookup' || request.method !== 'GET') {
    return false;
  }

  const cep = url.searchParams.get('cep');
  if (!cep) {
    response.statusCode = 400;
    response.end(
      JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: 'CEP parameter required',
        correlationId
      })
    );
    return true;
  }

  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    response.statusCode = 400;
    response.end(
      JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: 'CEP must have 8 digits',
        correlationId
      })
    );
    return true;
  }

  try {
    const viaCepResponse = await handlers.fetcher(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      signal: AbortSignal.timeout(5000)
    });
    const viaCepData = (await viaCepResponse.json()) as Record<string, unknown>;
    if (viaCepData.erro) {
      response.statusCode = 404;
      response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'CEP not found', correlationId }));
      return true;
    }

    response.statusCode = 200;
    response.end(
      JSON.stringify({
        cep: viaCepData.cep,
        street: viaCepData.logradouro,
        complement: viaCepData.complemento,
        district: viaCepData.bairro,
        city: viaCepData.localidade,
        state: viaCepData.uf,
        ibge: viaCepData.ibge,
        found: true
      })
    );
  } catch {
    response.statusCode = 502;
    response.end(
      JSON.stringify({
        code: 'SERVICE_UNAVAILABLE',
        message: 'CEP service unavailable',
        correlationId
      })
    );
  }
  return true;
}
