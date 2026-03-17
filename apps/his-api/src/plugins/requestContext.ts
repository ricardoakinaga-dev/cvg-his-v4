import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import type { AuthActor } from '../modules/auth/service.js';
import { resolveActorFromHeaders } from '../modules/auth/service.js';

export type RequestContext = {
  requestId: string;
  actor?: AuthActor;
};

declare module 'fastify' {
  interface FastifyRequest {
    requestContext: RequestContext;
  }
}

const requestContextPluginImpl: FastifyPluginAsync = async (app) => {
  const parseAudience = (value: string | undefined): string[] =>
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const jwtSecret = app.hasDecorator('env') ? app.env.JWT_SECRET : (process.env.JWT_SECRET ?? '');
  const jwtIssuer = app.hasDecorator('env') ? app.env.JWT_ISSUER : (process.env.JWT_ISSUER ?? '');
  const jwtAudience = app.hasDecorator('env')
    ? parseAudience(app.env.JWT_AUDIENCE)
    : parseAudience(process.env.JWT_AUDIENCE);

  app.addHook('onRequest', async (request) => {
    request.requestContext = {
      requestId: request.id,
      actor: resolveActorFromHeaders(request.headers, {
        jwtSecret,
        jwtIssuer,
        jwtAudience
      })
    };
  });
};

export const requestContextPlugin = fp(requestContextPluginImpl, {
  name: 'request-context-plugin'
});
