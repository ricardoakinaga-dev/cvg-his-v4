# Fase 0 - Diagnóstico Atual do CVG-HIS

## Objetivo
Registrar o estado atual do projeto antes de qualquer alteração estrutural no módulo de identidade, autenticação, autorização e auditoria.

## Data de referência
- Data lógica da análise: 2026-03-19 20:52:19 -03

## Visão geral da base
- Monorepo TypeScript com `pnpm workspaces`.
- Backend em Fastify 5 (`apps/his-api`).
- Frontend em Next.js 14 (`apps/his-web`).
- Worker assíncrono com BullMQ (`apps/his-worker`).
- Persistência com PostgreSQL + Drizzle ORM (`packages/db`).
- Pacotes compartilhados relevantes:
  - `packages/rbac`
  - `packages/audit`
  - `packages/domain`
  - `packages/contracts`

## Estrutura já existente relevante para IAM

### Backend
- `apps/his-api/src/modules/auth`
  - já possui `POST /auth/login`
  - já possui `POST /auth/dev-login`
  - já possui `POST /auth/verify`
  - já possui `GET /auth/me`
- `apps/his-api/src/plugins/requestContext.ts`
  - resolve ator autenticado a partir de JWT Bearer
- `apps/his-api/src/middlewares/requirePermission.ts`
  - middleware simples para exigir permissão
- `apps/his-api/src/modules/audit/routes.ts`
  - leitura de trilha de auditoria
- boa parte dos módulos já usa `requirePermission(...)`

### Banco e schema
- Tabelas já existentes para a base de IAM:
  - `accounts`
  - `units`
  - `users`
  - `roles`
  - `permissions`
  - `user_roles`
  - `role_permissions`
  - `audit_events`
- Essas tabelas já existem desde a migration inicial e `audit_events` recebeu escopo por conta em `0010_audit_events_account_scope.sql`.

### Frontend
- Tela de login existente em `apps/his-web/src/app/login/page.tsx`
- Persistência de sessão em:
  - cookie httpOnly `his_token`
  - `localStorage` com metadados da sessão
- Proxy Next.js encaminha apenas o Bearer token e bloqueia headers de contexto manipuláveis.

## O que já está maduro e pode ser reaproveitado
- Estrutura multi-tenant por `accountId`.
- JWT próprio com validação de `alg`, `iss`, `aud` e `exp`.
- Middleware de autorização no backend.
- Auditoria append-only com `audit_events`.
- Grande parte das rotas de domínio já está protegida com permissões.
- Frontend já trata a autorização como espelho do backend, não como fonte de verdade.
- Seeds idempotentes para papéis e permissões já existem, embora precisem de reforço de segurança.

## Fragilidades e inconsistências encontradas

### 1. Autenticação ainda não está alinhada ao modelo relacional existente
- O login por e-mail consulta `users`, mas o payload emitido força `role: 'admin'` e `roles: ['admin']`.
- O fluxo atual não resolve os papéis reais via `user_roles` nem as permissões via `role_permissions`.
- Consequência:
  - o banco já modela RBAC relacional, mas a autenticação em runtime não o consome;
  - há risco de privilégio excessivo para qualquer usuário autenticado por e-mail.

### 2. Seed usa hash legado incompatível com o padrão mais seguro do login
- `packages/db/src/seed.ts` ainda gera senha com SHA-256 simples.
- `apps/his-api/src/modules/auth/routes.ts` já suporta `scrypt`.
- Consequência:
  - a base aceita hash forte, mas o seed padrão ainda cria credenciais legadas;
  - isso enfraquece o bootstrap do ambiente.

### 3. RBAC de runtime está parcialmente hardcoded em pacote
- `packages/rbac` define catálogo canônico de permissões e herança por role.
- Porém o banco também guarda `roles`, `permissions` e `role_permissions`.
- Consequência:
  - há duas fontes de definição de acesso;
  - hoje o JWT deriva permissões do pacote, não do banco.

### 4. Drift entre rotas novas e catálogo canônico de permissões
- Há rotas exigindo permissões que não aparecem no catálogo atual, por exemplo:
  - `alerts.write`
  - `partner.read`
  - `partner.write`
- Consequência:
  - papéis sem cobertura consistente;
  - seeds e catálogo podem ficar incompletos;
  - algumas rotas podem se tornar inalcançáveis ou incorretamente mapeadas.

### 5. Ausência de modelo estruturado para sessões persistidas
- Existe JWT e cookie, mas não há tabela de sessões emitidas/revogáveis.
- Não há rastreio por dispositivo, revogação seletiva ou inventário de sessões ativas.

### 6. Ausência de modelo explícito para escopos hospitalares
- Existe `unitId` no ator e na tabela `users`, mas não há modelagem completa para:
  - setores
  - unidade assistencial
  - escopos por módulo/contexto
  - concessões contextuais

### 7. Ausência de fluxo de recuperação de senha e controle de tentativas
- Não há tabela de reset de senha.
- Não há rate limit ou lockout persistido por usuário/IP.

### 8. Auditoria existe, mas ainda não cobre todos os eventos de IAM
- Há boa base técnica para auditoria.
- Porém ainda faltam eventos específicos de IAM:
  - login bem-sucedido
  - login falho
  - logout
  - criação/edição/desativação de usuário
  - alteração de roles/permissões
  - reset de senha
  - revogação de sessão

### 9. Catálogo atual de roles é insuficiente para o cenário hospitalar solicitado
- Hoje a base canônica trabalha essencialmente com:
  - `admin`
  - `vet`
  - `enfermagem`
  - `recepcao`
- O escopo hospitalar pedido exige expansão para perfis como:
  - superadmin
  - diretoria/gestão
  - coordenação médica
  - residente
  - laboratório
  - imagem
  - farmácia/estoque
  - financeiro
  - administrativo

### 10. Frontend ainda carrega heranças da fase anterior
- A tela de login ainda mantém fluxo `dev-login`.
- A sessão do frontend confia em metadados de `localStorage` para UX, embora a segurança real esteja no backend.
- Isso é aceitável como espelho de interface, mas precisa ser mantido estritamente sincronizado com o backend.

## Estado atual por eixo

### Autenticação
- Existe: JWT HS256, login por e-mail, login por API key, dev-login, `/auth/me`.
- Falta:
  - resolver papéis do banco
  - sessões persistidas
  - logout real com revogação
  - lockout/rate limit
  - reset de senha
  - base concreta para MFA

### Autorização
- Existe:
  - middleware `requirePermission`
  - proteção de muitas rotas de domínio
  - pacote compartilhado de permissões
- Falta:
  - fonte única de verdade entre banco e pacote
  - papéis hospitalares completos
  - permissões faltantes do catálogo
  - escopos por setor/unidade/contexto
  - concessões especiais por usuário, quando necessário

### Auditoria
- Existe:
  - tabela append-only
  - hook reaproveitável
  - auditoria já aplicada em vários módulos
- Falta:
  - cobertura completa de IAM
  - visualização administrativa dedicada
  - classificação de eventos sensíveis de leitura

## Mapeamento funcional preliminar do HIS
- Assistencial:
  - pacientes
  - atendimentos
  - notas clínicas
  - documentos
  - internação
  - medicação
  - handover
  - protocolos
  - exames
- Administrativo/operacional:
  - agenda
  - catálogo de produtos/serviços
  - billing
  - financeiro
  - caixa
  - estoque
  - parceiros
  - relatórios
  - dashboard
- Observação:
  - o prontuário clínico já tem componentes importantes espalhados entre `encounters`, `clinicalNotes`, `documents`, `timeline`, `medication*` e `inpatient`.
  - isso favorece um modelo de permissão por recurso/ação.

## Diagnóstico conclusivo
- O CVG-HIS não parte do zero em IAM.
- A base atual já possui:
  - tabelas fundamentais
  - middleware de permissão
  - JWT válido
  - auditoria reutilizável
- O problema central não é ausência completa de arquitetura, e sim desalinhamento entre:
  - schema do banco
  - pacote canônico de RBAC
  - emissão de tokens
  - proteção das rotas mais novas
- A estratégia recomendada é evolutiva:
  - preservar a arquitetura existente;
  - transformar o backend na fonte única de verdade;
  - migrar a resolução de acesso para o modelo relacional;
  - ampliar a modelagem para contexto hospitalar;
  - reforçar auditoria e sessões sem quebrar o que já funciona.

## Itens que devem orientar a Fase 1
- Reusar `users`, `roles`, `permissions`, `user_roles`, `role_permissions` como base.
- Corrigir o seed para hash seguro.
- Resolver roles/permissões reais a partir do banco no login.
- Introduzir tabelas complementares para:
  - sessões
  - escopos
  - eventualmente grants especiais e credenciais auxiliares
- Normalizar catálogo de permissões para cobrir rotas existentes e o cenário hospitalar alvo.
