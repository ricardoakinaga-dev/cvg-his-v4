import type { IncomingMessage, ServerResponse } from 'node:http';

export async function handleCepRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string
): Promise<boolean> {
  if (pathname !== '/cep/lookup' || request.method !== 'GET') {
    return false;
  }

  const url = new URL(request.url ?? pathname, 'http://localhost');
  const cep = url.searchParams.get('cep');
  if (!cep) {
    response.statusCode = 400;
    response.end(JSON.stringify({
      code: 'VALIDATION_ERROR',
      message: 'CEP parameter required',
      correlationId
    }));
    return true;
  }

  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    response.statusCode = 400;
    response.end(JSON.stringify({
      code: 'VALIDATION_ERROR',
      message: 'CEP must have 8 digits',
      correlationId
    }));
    return true;
  }

  try {
    const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      signal: AbortSignal.timeout(5000)
    });
    const data = (await viaCepResponse.json()) as Record<string, unknown>;
    if (data.erro) {
      response.statusCode = 404;
      response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'CEP not found', correlationId }));
      return true;
    }

    response.statusCode = 200;
    response.end(JSON.stringify({
      cep: data.cep,
      street: data.logradouro,
      complement: data.complemento,
      district: data.bairro,
      city: data.localidade,
      state: data.uf,
      ibge: data.ibge,
      found: true
    }));
  } catch {
    response.statusCode = 502;
    response.end(JSON.stringify({
      code: 'SERVICE_UNAVAILABLE',
      message: 'CEP service unavailable',
      correlationId
    }));
  }
  return true;
}
