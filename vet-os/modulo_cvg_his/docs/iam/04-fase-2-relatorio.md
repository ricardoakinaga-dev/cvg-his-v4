# Fase 2 - Login, Sessão e Segurança Básica

## Objetivo da fase
Implementar autenticação funcional e segura com sessão controlada no backend, logout revogável e validações básicas de segurança operacional.

## Status
- Concluída com fluxo principal funcional.

## Fluxo de login implementado
- `POST /auth/login`
  - valida payload com Zod
  - autentica por e-mail + senha
  - resolve usuário/roles/permissões pelo banco
  - cria sessão persistida em `auth_sessions`
  - emite JWT com `sessionId`
  - registra `auth.login.success`
- falha de login para usuário conhecido:
  - incrementa contador de tentativas
  - pode bloquear temporariamente a conta
  - registra `auth.login.failed`
- `POST /auth/verify`
  - valida token assinado
- `GET /auth/me`
  - retorna ator autenticado
  - retorna estado da sessão atual quando houver `sessionId`
- `POST /auth/logout`
  - revoga a sessão persistida atual
  - registra `auth.logout`

## Política de sessão adotada
- access token JWT assinado com expiração de 8 horas
- sessão persistida no backend por `auth_sessions`
- rotas protegidas validam:
  - se a sessão existe
  - se a sessão não foi revogada
  - se a sessão não expirou
- em caso de sessão válida, `last_seen_at` é atualizado

## Itens concluídos
- inclusão de `sessionId` no ator autenticado e no JWT
- criação de leitura/validação de sessão ativa no backend
- criação de revogação de sessão por logout
- reforço do middleware `requirePermission` para rejeitar:
  - sessão revogada
  - sessão expirada
- ativação prática do lockout inicial:
  - contador de tentativas falhas
  - bloqueio temporário após repetição
- sincronização mínima do frontend:
  - sessão cacheada agora armazena `sessionId`
  - `clearAuthSession()` tenta revogar a sessão no backend antes de limpar cookie/localStorage

## Itens não concluídos
- refresh token não foi implementado
- endpoint formal de recuperação/reset de senha ainda não foi implementado
- rate limit por IP/rede reversa ainda não foi implementado
- revogação global de todas as sessões de um usuário ainda não foi implementada
- sessões por dispositivo ainda não têm tela administrativa

## Decisões técnicas
- a validação de sessão ativa foi colocada no middleware de permissão para proteger imediatamente os endpoints já cobertos por `requirePermission`;
- o frontend foi mantido compatível com o cookie httpOnly atual, apenas adicionando revogação no fluxo de logout local;
- o bloqueio por tentativas ficou inicialmente acoplado ao usuário conhecido, sem introduzir nova infraestrutura de rate-limit nesta fase.

## Estruturas criadas ou alteradas
- `apps/his-api/src/modules/iam/service.ts`
- `apps/his-api/src/middlewares/requirePermission.ts`
- `apps/his-api/src/modules/auth/routes.ts`
- `apps/his-api/src/modules/auth/routes.test.ts`
- `apps/his-api/src/middlewares/requirePermission.security.test.ts`
- `apps/his-web/src/lib/auth.ts`

## Arquivos modificados
- `apps/his-api/src/modules/iam/service.ts`
- `apps/his-api/src/middlewares/requirePermission.ts`
- `apps/his-api/src/modules/auth/routes.ts`
- `apps/his-api/src/modules/auth/routes.test.ts`
- `apps/his-api/src/middlewares/requirePermission.security.test.ts`
- `apps/his-web/src/lib/auth.ts`

## Migrações criadas
- nenhuma nova migration nesta fase

## Seeds criadas ou alteradas
- nenhuma seed alterada nesta fase

## Endpoints criados ou alterados
- alterado:
  - `POST /auth/login`
  - `POST /auth/verify`
  - `GET /auth/me`
- criado:
  - `POST /auth/logout`

## Telas criadas ou alteradas
- alterado indiretamente o fluxo de sessão em `apps/his-web/src/lib/auth.ts`
- nenhuma nova tela criada nesta fase

## Testes criados
- ampliado:
  - `apps/his-api/src/modules/auth/routes.test.ts`
  - `apps/his-api/src/middlewares/requirePermission.security.test.ts`

## Validação executada
- `corepack pnpm --filter @cvg-his/his-api exec vitest run src/modules/auth/routes.test.ts src/middlewares/requirePermission.security.test.ts` ✅
- `corepack pnpm --filter @cvg-his/his-api build` ✅
- `corepack pnpm --filter @cvg-his/his-web build` ✅

## Limitações atuais
- rotas sem `requirePermission` ainda não se beneficiam automaticamente da validação de sessão ativa;
- o lockout existe no backend, mas ainda falta estratégia completa para usuário inexistente e rate-limit por IP;
- a auditoria de falha de login para usuário inexistente continua limitada pela ausência de entidade autenticada e de canal específico para eventos anônimos.

## Riscos
- se algum endpoint sensível não estiver protegido por `requirePermission`, ele ainda não fará validação de sessão revogada automaticamente;
- sessões emitidas por `dev-login` e API key continuam fora do ciclo completo de sessão persistida;
- o fluxo de logout do frontend é best-effort: se a rede falhar, o cookie/localStorage ainda são limpos localmente, mas a sessão backend pode permanecer ativa.

## O que ainda falta para autorização completa
- aplicar proteção uniforme de autenticação obrigatória para todo endpoint sensível;
- resolver autorização por escopo hospitalar;
- fechar lacunas entre permissões definidas e proteção efetiva de todos os módulos;
- iniciar adaptação visual do frontend ao contexto real de permissões e sessão atual.

## Dependências da próxima fase
- mapear endpoints ainda não protegidos
- aplicar validação centralizada e helpers de autorização
- começar a usar escopos na decisão de acesso
- alinhar frontend ao `/auth/me` e ao contexto de sessão real

## Próximos passos
- iniciar Fase 3 com autorização granular e proteção uniforme das rotas
- identificar módulos ainda sem cobertura consistente de permissão
- preparar leitura de escopos e helpers de autorização reutilizáveis
