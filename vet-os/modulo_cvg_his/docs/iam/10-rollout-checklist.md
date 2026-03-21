# Rollout Operacional - IAM CVG-HIS

## Objetivo
Executar rollout seguro do módulo IAM em ambiente real, na ordem:
1. `migrate`
2. `seed`
3. bootstrap do admin
4. smoke manual

## Premissas
- ambiente com Postgres acessível em `DATABASE_URL`;
- variáveis JWT configuradas no backend;
- build das aplicações já validado;
- janela de mudança acordada;
- backup lógico do banco disponível antes da mudança.

## Pré-check

### 1. Confirmar variáveis obrigatórias
- backend:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_ISSUER`
  - `JWT_AUDIENCE`
- seed inicial:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`

### 2. Confirmar estratégia de migration
- recomendado:
  - rodar migration fora do boot da API
- deixar `RUN_MIGRATIONS_ON_BOOT=0` no deploy normal
- usar job/controlador dedicado para migration

### 3. Confirmar backup
- gerar backup/snapshot do banco antes da execução
- registrar horário e identificador do backup

### 4. Confirmar risco operacional
- perfis sem `medical_record.read` passarão a receber `403` em endpoints clínicos detalhados
- `seed` é idempotente, mas pode adicionar papéis/permissões novos ao catálogo

## Sequência segura

## Etapa 1 - Migrate

### Comando
```bash
corepack pnpm db:migrate
```

### Critério de sucesso
- comando termina sem erro;
- migration `0029_iam_foundation.sql` aplicada;
- tabelas esperadas disponíveis:
  - `auth_sessions`
  - `access_scopes`
  - `user_scope_assignments`
- colunas adicionais em `users` disponíveis:
  - `username`
  - `must_change_password`
  - `failed_login_attempts`
  - `locked_until`
  - `last_login_at`
  - `password_changed_at`

### Verificação rápida sugerida
```sql
select * from auth_sessions limit 1;
select username, must_change_password, failed_login_attempts from users limit 1;
```

### Se falhar
- não avançar para seed;
- revisar erro de migration;
- se necessário, restaurar backup ou corrigir migração antes de novo intento.

## Etapa 2 - Seed

### Comando
```bash
ADMIN_EMAIL='admin@exemplo.local' \
ADMIN_PASSWORD='trocar-imediatamente' \
corepack pnpm db:seed
```

### Critério de sucesso
- comando termina com `Seed concluído com sucesso.`;
- permissões canônicas presentes;
- papéis hospitalares presentes;
- usuário admin inicial criado ou reaproveitado;
- vínculo do admin com `admin` e `superadmin` presente.

### Verificação rápida sugerida
```sql
select name from roles where name in (
  'admin',
  'superadmin',
  'diretoria',
  'gestao',
  'coordenacao_medica',
  'veterinario',
  'residente',
  'enfermagem',
  'recepcao',
  'laboratorio',
  'radiologia',
  'ultrassonografia',
  'farmacia',
  'estoque',
  'financeiro',
  'administrativo',
  'banho_tosa'
);

select email, username, is_active
from users
where email = '<ADMIN_EMAIL>';
```

### Cuidados
- usar senha temporária forte;
- trocar a senha do admin assim que o primeiro login for validado;
- não manter `ADMIN_PASSWORD` exposto em histórico de shell/CI sem proteção adequada.

### Se falhar
- não subir operação administrativa do IAM;
- revisar constraint/duplicidade/dados obrigatórios;
- corrigir e reexecutar, já que o seed foi desenhado para ser idempotente.

## Etapa 3 - Bootstrap do Admin

### Objetivo
Validar que a conta administrativa inicial consegue autenticar, consultar sessão e acessar a superfície de gestão IAM.

### Checklist
- subir backend com JWT e banco corretos;
- subir frontend ou usar cliente HTTP autenticado;
- efetuar login com `ADMIN_EMAIL`;
- confirmar retorno de sessão em `/auth/me`;
- acessar:
  - `/settings/users`
  - `/settings/roles`
- criar ou editar usuário de teste não privilegiado;
- confirmar que mudanças geram auditoria.

### Critério de sucesso
- login funciona;
- `/auth/me` retorna `accountId`, `roles`, `permissions` e `sessionId`;
- páginas administrativas carregam;
- é possível listar usuários, papéis e permissões;
- reset de senha e revogação de sessão funcionam para usuário de teste.

## Etapa 4 - Smoke Manual

### 4.1 Autenticação
- login com admin funciona
- logout funciona
- `/auth/me` reflete sessão ativa
- tentativa inválida de login retorna erro sem vazar credencial

### 4.2 Administração IAM
- listar usuários
- criar usuário de teste
- editar usuário de teste
- trocar papéis do usuário de teste
- resetar senha do usuário de teste
- listar sessões do usuário de teste
- revogar sessão do usuário de teste

### 4.3 Privilégio e bloqueio
- usuário sem permissão administrativa recebe `403` em `/admin/iam/*`
- perfil sem `medical_record.read` recebe `403` em:
  - `/patients/:id/summary`
  - `/encounters/:id`
  - `/patient-context/by-patient/:patientId`

### 4.4 Auditoria
- verificar eventos recentes para:
  - `auth.login.success`
  - `auth.logout`
  - `user.created`
  - `user.roles.updated`
  - `user.password.reset`
  - `session.revoked`
- se viável, validar também uma leitura sensível auditada

### 4.5 Perfis hospitalares
- recepção:
  - acessa agenda/cadastro
  - não acessa prontuário detalhado
- veterinário:
  - acessa prontuário detalhado
  - não acessa relatório financeiro estratégico
- financeiro:
  - acessa contas/recebíveis
  - não acessa prontuário detalhado
- residente:
  - acessa escrita clínica
  - não assina prontuário final

## Sequência recomendada de execução real
1. Backup do banco.
2. `corepack pnpm db:migrate`
3. Verificação SQL rápida.
4. `corepack pnpm db:seed`
5. Verificação SQL rápida.
6. Subir backend.
7. Subir frontend.
8. Login com admin inicial.
9. Smoke manual de autenticação.
10. Smoke manual de IAM administrativo.
11. Smoke manual de perfis hospitalares.
12. Registrar evidências e encerrar a janela.

## Evidências a registrar
- horário de início/fim;
- versão/commit implantado;
- logs do migrate;
- logs do seed;
- captura do `/auth/me` do admin sem expor token;
- evidência de criação de usuário de teste;
- evidência de um `403` esperado;
- evidência de um evento de auditoria.

## Rollback prático

### Se falhar antes de subir a aplicação
- restaurar banco a partir do backup;
- corrigir falha de migration/seed;
- replanejar rollout.

### Se falhar depois de subir a aplicação
- retirar tráfego ou voltar para release anterior;
- avaliar se a falha é:
  - só de aplicação
  - de schema/dados
- se envolver schema incompatível, rollback de banco deve seguir política do ambiente e backup prévio.

## Observações operacionais
- a API já informa que migrations não devem rodar automaticamente no boot, salvo decisão explícita por `RUN_MIGRATIONS_ON_BOOT=1`;
- a suíte de `patientContext` ainda tem ruído de Redis/BullMQ mockado em ambiente de teste, então a validação operacional real deve olhar comportamento funcional e logs reais do ambiente;
- após o primeiro acesso do admin seed, é recomendado:
  - trocar a senha
  - criar um segundo admin nomeado
  - evitar conta compartilhada
