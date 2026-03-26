# ADR-006 - Repository Pattern para Persistencia

**Data**: 2026-03-25
**Status**: Aprovado
**Contexto**: Padronizar acesso a dados nos modulos do V2

---

## Decisao

O V2 adota o padrao Repository para abstrair o acesso a dados:

```
Modulo -> Repository -> (Database | Cache | External)
```

---

## Estrutura

Cada modulo que precisa de persistencia deve ter:

```
packages/modules/<module>/
  src/
    repositories/
      index.ts
      <entity>.repository.ts
      in-memory-<entity>.repository.ts
```

---

## Interface Base

```typescript
interface EntityRepository<T> {
  create(entity: T): Promise<void>;
  update(entity: T): Promise<void>;
  findById(id: string): Promise<T | null>;
  findByFilter(filter: Filter): Promise<readonly T[]>;
  delete(id: string): Promise<void>;
}
```

---

## Implementacoes

### 1. In-Memory (para desenvolvimento e testes)

- Usado durante desenvolvimento
- Usado em testes unitarios
- Nao persiste entre reinicios

### 2. Database (para producao)

- Implementa interface com queries reais
- Usa Drizzle ORM
- Trata concorrencia e transacoes

### 3. Cached (para performance)

- Redis para cache de sessoes
- Reduz carga no banco
- Cache de dados frequentemente acessados

---

## Repositories Implementados

### Auth Module

| Repository                | Status       | Interface                                                      |
| ------------------------- | ------------ | -------------------------------------------------------------- |
| SessionRepository         | Implementado | `packages/modules/auth/src/repositories/session.repository.ts` |
| InMemorySessionRepository | Implementado | Para dev/testes                                                |

---

## Transicao para Producao

1. **Fase 1**: Interfaces definidas, implementacao in-memory
2. **Fase 2**: Implementacao database via Drizzle
3. **Fase 3**: Cache Redis para sessoes
4. **Fase 4**: Concorrência e transacoes

---

## Beneficios

1. **Testabilidade**: Facilita testes com implementacao in-memory
2. **Troca de implementacao**: Possivel trocar Redis por Memcached sem alterar modulo
3. **Separacao de responsabilidades**: Modulo nao conhece detalhes de persistencia
4. **Evolucao**: Facilita migracao de Map/array para banco real

---

## Consequencias

### Positivas

- Codigo mais testavel
- Padronizacao entre modulos
- Preparacao para multi-tenancy

### Negativas

- Mais abstracao para implementar
- Necessidade de manter interfaces atualizadas
- Duplicacao potencial entre repositories

---

## Exemplos de Uso

### Auth Service

```typescript
export class AuthService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    // ...
  ) {}

  async login(input: LoginInput): Promise<Session> {
    const session = await this.sessionRepository.create({...});
    return session;
  }
}
```

### Teste Unitario

```typescript
const repository = new InMemorySessionRepository();
const auth = new AuthService(repository, ...);

// Login works same as in production
const session = await auth.login({...});
```
