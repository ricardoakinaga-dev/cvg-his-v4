# Guia de Contribuição - CVG-HIS

> **Última Atualização:** 2026-02-24
> **Versão:** 0.1.0

---

## Sumário

1. [Código de Conduta](#código-de-conduta)
2. [Como Contribuir](#como-contribuir)
3. [Ambiente de Desenvolvimento](#ambiente-de-desenvolvimento)
4. [Padrões de Código](#padrões-de-código)
5. [Processo de Pull Request](#processo-de-pull-request)
6. [Estrutura de Commits](#estrutura-de-commits)

---

## Código de Conduta

### Nossos Compromissos

- Respeitar opiniões divergentes
- Aceitar críticas construtivas
- Focar no que é melhor para a comunidade
- Mostrar empatia com outros membros

### Comportamentos Inaceitáveis

- Uso de linguagem ou imagens sexualizadas
- Trolling, insultos ou comentários depreciativos
- Assédio público ou privado
- Publicar informações privadas sem permissão

---

## Como Contribuir

### Reportando Bugs

1. Verifique se o bug já foi reportado
2. Crie uma issue com:
   - Título descritivo
   - Passos para reproduzir
   - Comportamento esperado
   - Comportamento atual
   - Screenshots (se aplicável)
   - Ambiente (OS, Node version, etc)

### Sugerindo Melhorias

1. Abra uma issue com tag `enhancement`
2. Descreva a melhoria proposta
3. Explique por que seria útil
4. Se possível, forneça exemplos

### Submetendo Código

1. Fork o repositório
2. Crie uma branch para sua feature
3. Faça suas alterações
4. Execute os testes
5. Abra um Pull Request

---

## Ambiente de Desenvolvimento

### Pré-requisitos

- Node.js 22+
- pnpm 10+
- PostgreSQL 15+
- Redis 7+
- Docker (opcional)

### Setup Inicial

```bash
# Clone o repositório
git clone https://github.com/your-org/cvg-his.git
cd cvg-his

# Instale as dependências
pnpm install

# Configure o ambiente
cp .env.example .env
# Edite .env com suas configurações

# Execute as migrações
pnpm db:migrate

# (Opcional) Execute o seed
pnpm db:seed

# Inicie o desenvolvimento
pnpm dev:up
```

### Estrutura de Branches

```
main           # Código de produção
├── develop    # Código de desenvolvimento
│   ├── feature/xxx    # Novas features
│   ├── fix/xxx        # Correções de bugs
│   ├── refactor/xxx   # Refatorações
│   └── docs/xxx       # Documentação
```

### Comandos Úteis

```bash
# Desenvolvimento
pnpm dev              # Inicia API
pnpm dev:up           # Inicia tudo (API, Web, Worker)

# Testes
pnpm test             # Todos os testes
pnpm test -- --watch  # Modo watch
pnpm test -- --coverage # Com cobertura

# Linting
pnpm lint             # Verifica código

# Build
pnpm build            # Build de produção

# Banco de dados
pnpm db:generate      # Gera migration
pnpm db:migrate       # Aplica migrations
pnpm db:seed          # Dados iniciais
```

---

## Padrões de Código

### TypeScript

- **Strict mode** sempre habilitado
- **Tipos explícitos** para funções públicas
- **Evite `any`** - use `unknown` quando necessário
- **Prefer interfaces** para objetos públicos

```typescript
// Bom
interface PatientCreateInput {
  name: string;
  species: string;
  ownerId: string;
}

function createPatient(input: PatientCreateInput): Promise<Patient> {
  // ...
}

// Evite
function createPatient(input: any): any {
  // ...
}
```

### Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Arquivos | camelCase | `patientService.ts` |
| Classes | PascalCase | `PatientService` |
| Funções | camelCase | `createPatient()` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |
| Interfaces | PascalCase | `PatientRepository` |
| Tipos | PascalCase | `PatientCreateInput` |
| Enums | PascalCase | `PatientStatus` |

### Organização de Arquivos

```
module/
├── routes.ts        # Definição de rotas
├── service.ts       # Lógica de negócio
├── repo.ts          # Acesso a dados
├── types.ts         # Tipos e interfaces
├── routes.test.ts   # Testes de rotas
├── service.test.ts  # Testes de serviço
└── repo.test.ts     # Testes de repository
```

### Padrão de Módulo

```typescript
// types.ts
export type ModuleInput = { ... };
export type ModuleOutput = { ... };
export type ModuleRecord = { ... };

// repo.ts
export function createModuleRepo(db: DbClient) {
  return {
    findById(accountId: string, id: string): Promise<ModuleRecord | null>,
    list(params: ListParams): Promise<Paginated<ModuleRecord>>,
    create(data: CreateData): Promise<ModuleRecord>,
    update(params: UpdateParams): Promise<ModuleRecord | null>
  };
}

// service.ts
export function createModuleService(context: ServiceContext) {
  const repo = createModuleRepo(context.db);
  
  return {
    getById(id: string): Promise<ModuleRecord | null>,
    list(query: ListQuery): Promise<Paginated<ModuleRecord>>,
    create(input: ModuleInput): Promise<CreateResult>,
    update(id: string, patch: UpdateInput): Promise<UpdateResult>
  };
}

// routes.ts
export const moduleRoutes: FastifyPluginAsync = async (app) => {
  app.get('/modules', {
    preHandler: requirePermission('module.read')
  }, async (request) => {
    const service = createModuleService({ db: request.db, requestContext: request.requestContext });
    return service.list(request.query);
  });
};
```

### Tratamento de Erros

```typescript
// Use erros customizados
export class ModuleNotFoundError extends Error {
  statusCode = 404;
  code = 'MODULE_NOT_FOUND';
}

// Lance erros apropriados
if (!module) {
  throw new ModuleNotFoundError('Module not found');
}

// Result types para operações que podem falhar
export type CreateResult =
  | { kind: 'created'; module: ModuleRecord }
  | { kind: 'validation_error'; message: string }
  | { kind: 'conflict'; message: string };
```

### Validação com Zod

```typescript
// Defina schemas reutilizáveis
const requiredTextSchema = z.string().min(1);

export const ModuleCreateSchema = z.object({
  name: requiredTextSchema,
  description: z.string().optional()
});

// Use nas rotas
app.post('/modules', {
  schema: { body: ModuleCreateSchema }
}, handler);
```

### Auditoria

```typescript
// Sempre registre operações de escrita
await appendAudit({
  accountId: actor.accountId,
  actorUserId: actor.userId,
  roles: actor.roles,
  action: 'ModuleCreated',
  entityType: 'module',
  entityId: module.id,
  beforeJson: null,
  afterJson: module,
  requestId: context.requestContext.requestId
});
```

---

## Processo de Pull Request

### Checklist

- [ ] Código segue os padrões do projeto
- [ ] Testes foram adicionados/atualizados
- [ ] Documentação foi atualizada
- [ ] Commits seguem a convenção
- [ ] Branch está atualizada com develop
- [ ] Todos os testes passam
- [ ] Lint não reporta erros

### Template de PR

```markdown
## Descrição
Breve descrição das alterações.

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Documentação

## Como Testar
1. Passos para testar
2. ...

## Screenshots
Se aplicável.

## Issues Relacionadas
Closes #123
```

### Code Review

- Seja respeitoso e construtivo
- Foque no código, não na pessoa
- Explique o "porquê" das sugestões
- Aprove PRs pequenos e focados

---

## Estrutura de Commits

### Conventional Commits

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Tipos

| Tipo | Descrição |
|------|-----------|
| feat | Nova feature |
| fix | Correção de bug |
| docs | Documentação |
| style | Formatação |
| refactor | Refatoração |
| test | Testes |
| chore | Manutenção |

### Exemplos

```bash
feat(medication): add medication order scheduling
fix(auth): correct JWT expiration validation
docs(api): update OpenAPI specification
refactor(patient): extract validation to domain layer
test(medication): add cross-tenant access tests
chore(deps): update dependencies
```

### Scope Comuns

- `api` - Backend API
- `web` - Frontend
- `worker` - Worker assíncrono
- `db` - Banco de dados
- `auth` - Autenticação
- `medication` - Módulo de medicação
- `patient` - Módulo de paciente
- `agenda` - Módulo de agenda

---

## Recursos

- [Documentação de Arquitetura](./ARCHITECTURE.md)
- [Guia de Segurança](./SECURITY.md)
- [Guia de Testes](./TESTING.md)
- [Runbook Operacional](./RUNBOOK.md)

---

*Documentação atualizada em 2026-02-24*
