# Fase 3 - Autorização Granular e Proteção de Rotas

## Objetivo da fase
Implementar controle de acesso mais granular no backend, endurecer a exigência de autenticação nas rotas sensíveis e alinhar o frontend ao novo catálogo de permissões.

## Status
- Concluída com avanço real na granularidade de autorização.

## Estratégia adotada
- separação explícita entre:
  - autenticação obrigatória
  - checagem de permissão
- introdução de helper reutilizável `requireAuthenticated`
- reaproveitamento de `requirePermission` como composição de:
  - sessão válida
  - permissão exigida
- substituição de permissões temporárias/genéricas em módulos-chave por permissões mais específicas de domínio

## Itens concluídos

### 1. Middleware/guard de autenticação obrigatória
- criado `apps/his-api/src/middlewares/requireAuthenticated.ts`
- o helper valida:
  - ator presente no request context
  - sessão ativa quando existir `sessionId`
  - sessão não revogada
  - sessão não expirada

### 2. Middleware/guard de permissão reforçado
- `requirePermission` passou a compor `ensureAuthenticated`
- toda rota protegida por permissão agora exige autenticação válida antes da autorização

### 3. Granularidade de permissões ampliada
- novas permissões adicionadas ao catálogo:
  - `build.read`
  - `notification_template.read`
  - `notification_template.write`
  - `notification.read`
  - `notification.write`
  - `notification_settings.read`
  - `notification_settings.write`
  - `exam_order.read`
  - `exam_order.create`
  - `exam_order.update`
  - `exam_result.read`
  - `exam_result.create`
  - `exam_result.update`

### 4. Endpoints críticos remapeados para permissões mais corretas

#### Notificações
- antes:
  - `system.health.read` temporário
- agora:
  - templates: `notification_template.read` / `notification_template.write`
  - notificações: `notification.read` / `notification.write`
  - settings: `notification_settings.read` / `notification_settings.write`

#### Exames
- antes:
  - `appointment.read` / `appointment.write`
- agora:
  - pedidos: `exam_order.read` / `exam_order.create` / `exam_order.update`
  - resultados: `exam_result.read` / `exam_result.create` / `exam_result.update`

#### Estoque
- antes:
  - `product.read` / `product.write`
- agora:
  - leitura: `inventory.read`
  - alteração/movimentação: `inventory.adjust`

#### Relatórios e dashboard
- antes:
  - mistura de `appointment.read`, `financial_account.read` e `system.health.read`
- agora:
  - relatórios operacionais/dashboard: `reports.read`
  - relatórios financeiros: `financial_reports.read`
  - dashboard de estoque: `inventory.read`

#### Build metadata
- `GET /build` passou a exigir `build.read`

### 5. Rotas de sessão atual endurecidas
- `POST /auth/logout` agora usa `requireAuthenticated`
- `GET /auth/me` agora usa `requireAuthenticated`

### 6. Reflexo no frontend
- navegação principal atualizada para refletir novas permissões:
  - dashboard inicial por `reports.read`
  - estoque por `inventory.read`
  - exames por `exam_order.read`
  - protocolos por `protocol.read`
- `Topbar` deixou de exibir atalhos hardcoded sem checagem:
  - tutores protegidos por `owner.read`
  - pacientes protegidos por `patient.read`

### 7. Seeds e catálogo compartilhado atualizados
- `packages/rbac/src/permissions.ts`
- `packages/db/src/seed.ts`

## Itens não concluídos
- nem todos os módulos do sistema receberam revisão fina por escopo hospitalar ainda;
- não foi implementada ainda a checagem de escopos no middleware;
- ainda faltam CRUDs administrativos de usuários/papéis/permissões para exploração prática da matriz completa;
- ainda não há varredura automatizada cobrindo 100% das rotas com assertiva de proteção.

## Decisões técnicas
- manter nomes de permissão como strings simples preservou compatibilidade com a base atual;
- granularidade foi priorizada onde havia maior desalinhamento entre domínio e autorização real;
- `health` permaneceu público por ser endpoint operacional de infraestrutura;
- `build` foi protegido por expor metadados internos de rastreabilidade.

## Endpoints protegidos ou remapeados nesta fase
- `GET /build`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /notification-templates`
- `GET /notification-templates`
- `GET /notification-templates/:id`
- `PATCH /notification-templates/:id`
- `POST /notifications`
- `GET /notifications`
- `GET /notifications/:id`
- `GET /notification-settings`
- `PUT /notification-settings`
- `POST /exam-orders`
- `GET /exam-orders/:id`
- `GET /exam-orders`
- `PATCH /exam-orders/:id`
- `POST /exam-results`
- `GET /exam-results/:id`
- `GET /exam-results`
- `PATCH /exam-results/:id`
- `GET /stock/items`
- `GET /stock/summary`
- `GET /stock/items/:id`
- `PATCH /stock/items/:id`
- `GET /stock/lots`
- `POST /stock/lots`
- `GET /stock/movements`
- `POST /stock/movements`
- `GET /reports/appointments-summary`
- `GET /reports/exams-pending`
- `GET /reports/exams-summary`
- `GET /reports/financial-summary`
- `GET /dashboard`
- `GET /dashboard/appointments`
- `GET /dashboard/financial`
- `GET /dashboard/stock`

## Arquivos modificados
- `apps/his-api/src/middlewares/requireAuthenticated.ts`
- `apps/his-api/src/middlewares/requirePermission.ts`
- `apps/his-api/src/modules/auth/routes.ts`
- `apps/his-api/src/modules/auth/routes.test.ts`
- `apps/his-api/src/modules/build/routes.ts`
- `apps/his-api/src/modules/dashboard/routes.ts`
- `apps/his-api/src/modules/exams/routes.ts`
- `apps/his-api/src/modules/notifications/routes.ts`
- `apps/his-api/src/modules/reports/routes.ts`
- `apps/his-api/src/modules/stock/routes.ts`
- `apps/his-api/src/middlewares/requirePermission.security.test.ts`
- `packages/rbac/src/permissions.ts`
- `packages/db/src/seed.ts`
- `apps/his-web/src/config/navigation.ts`
- `apps/his-web/src/components/layout/Topbar.tsx`

## Migrações criadas
- nenhuma nova migration nesta fase

## Seeds criadas ou alteradas
- alterado:
  - `packages/db/src/seed.ts`

## Telas criadas ou alteradas
- alterado:
  - navegação e visibilidade de atalhos no frontend

## Testes criados ou ajustados
- `apps/his-api/src/modules/auth/routes.test.ts`
- `apps/his-api/src/middlewares/requirePermission.security.test.ts`

## Validação executada
- `corepack pnpm --filter @cvg-his/his-api exec vitest run src/modules/auth/routes.test.ts src/middlewares/requirePermission.security.test.ts` ✅
- `corepack pnpm --filter @cvg-his/his-api build` ✅
- `corepack pnpm --filter @cvg-his/his-web test -- --runInBand src/components/auth/Can.test.tsx` ✅
  - observação: o comando disparou a suíte web inteira por comportamento do script, e ela passou
- `corepack pnpm --filter @cvg-his/his-web build` ✅

## Limitações do escopo atual
- o sistema ainda não toma decisões por setor/unidade/contexto no middleware;
- exames ainda estão granulares por recurso, não por subtipo laboratorial versus imagem em runtime;
- dashboards agregados ainda não separam visões por perfil clínico vs administrativo além das permissões de relatório.

## Riscos
- como os seeds mudaram, ambientes já semeados precisarão reaplicar seed/migration conscientemente para absorver as novas permissões;
- módulos ainda não revisados podem continuar usando permissões herdadas antigas que merecem refinamento posterior;
- a ausência de enforcement de escopo significa que um papel com permissão ainda pode operar fora do setor esperado até a próxima fase.

## Dependências da próxima fase
- construir CRUD administrativo de usuários, papéis e permissões;
- impedir autoelevação indevida;
- atribuir papéis e permissões com auditoria forte;
- começar a usar escopos hospitalares de forma efetiva.

## Próximos passos
- iniciar Fase 4 com gestão administrativa de usuários, papéis e permissões
- expor matriz administrativa e detalhamento de usuário
- preparar revisão fina da matriz por perfil hospitalar para a Fase 5
