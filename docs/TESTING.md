# Guia de Testes - CVG-HIS

> **Última Atualização:** 2026-02-24
> **Versão:** 0.1.0

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Estrutura de Testes](#estrutura-de-testes)
3. [Ferramentas](#ferramentas)
4. [Executando Testes](#executando-testes)
5. [Escrevendo Testes](#escrevendo-testes)
6. [Cobertura](#cobertura)
7. [Melhores Práticas](#melhores-práticas)

---

## Visão Geral

O CVG-HIS utiliza **Vitest** como framework de testes principal, com suporte a testes unitários e de integração.

### Estatísticas Atuais

| Métrica | Valor |
|---------|-------|
| Arquivos de Teste | 33 |
| Framework | Vitest 3.0+ |
| Cobertura Estimada | ~15-20% |

---

## Estrutura de Testes

### Organização

```
apps/
├── his-api/
│   └── src/
│       ├── modules/
│       │   ├── __tests__/
│       │   │   └── crossTenant.test.ts
│       │   ├── medicationOrders/
│       │   │   ├── routes.test.ts
│       │   │   └── service.test.ts
│       │   └── ...
│       ├── hooks/
│       │   └── auditHook.test.ts
│       └── middlewares/
│           └── requirePermission.security.test.ts
│
├── his-web/
│   └── src/
│       ├── lib/
│       │   ├── api.test.ts
│       │   ├── auth.test.ts
│       │   └── theme.test.ts
│       ├── components/
│       │   ├── auth/Can.test.tsx
│       │   └── MedAdminActionModal.test.tsx
│       └── features/
│           ├── encounter/__tests__/
│           ├── patientContext/__tests__/
│           └── inpatientStays/__tests__/
│
└── his-worker/
    └── src/
        └── workers/
            └── lockRetry.test.ts

packages/
├── domain/
│   └── src/
│       ├── doseDueLogic.test.ts
│       ├── medicationSlots.test.ts
│       └── index.test.ts
│
└── contracts/
    └── src/
        └── __tests__/
            └── contracts.test.ts
```

---

## Ferramentas

### Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
```

### Testing Library (Frontend)

```typescript
// Para testes de componentes React
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```

---

## Executando Testes

### Comandos

```bash
# Executar todos os testes
pnpm test

# Executar testes de um pacote específico
pnpm --filter @cvg-his/his-api test

# Executar com coverage
pnpm test -- --coverage

# Executar em modo watch
pnpm test -- --watch

# Executar arquivo específico
pnpm test -- medicationOrders.service.test.ts
```

### Scripts do package.json

```json
{
  "scripts": {
    "test": "corepack pnpm -r run test",
    "test:coverage": "corepack pnpm -r run test -- --coverage"
  }
}
```

---

## Escrevendo Testes

### Teste de Serviço

```typescript
// apps/his-api/src/modules/medicationOrders/service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

describe('MedicationOrdersService', () => {
  let service: MedicationOrdersService;
  let mockRepo: MockRepo;
  let mockDb: MockDb;

  beforeEach(() => {
    mockRepo = createMockRepo();
    mockDb = createMockDb();
    service = createMedicationOrdersService(
      { db: mockDb, requestContext: mockContext },
      { repo: mockRepo }
    );
  });

  describe('create', () => {
    it('should create medication order with valid input', async () => {
      const input = {
        patientId: 'patient-uuid',
        medicationName: 'Amoxicilina',
        doseValue: 500,
        doseUnit: 'mg',
        route: 'VO',
        frequencyType: 'q8h',
        startAt: new Date().toISOString()
      };

      const result = await service.create(input);

      expect(result.kind).toBe('created');
      expect(result.order.medicationName).toBe('Amoxicilina');
    });

    it('should return patient_not_found for invalid patient', async () => {
      mockRepo.findPatientInAccount.mockResolvedValue(null);

      const result = await service.create({ ...input, patientId: 'invalid' });

      expect(result.kind).toBe('patient_not_found');
    });
  });
});
```

### Teste de Cross-Tenant

```typescript
// apps/his-api/src/modules/__tests__/crossTenant.test.ts
import { describe, it, expect } from 'vitest';
import { requireTenantMatch, TenantMismatchError } from '../../lib/tenantGuardrail.js';

describe('Cross-Tenant Access Prevention', () => {
  it('should throw TenantMismatchError on cross-tenant access', async () => {
    const mockRequest = {
      requestContext: {
        actor: {
          userId: 'user-1',
          accountId: 'tenant-a',
          roles: ['user'],
          permissions: ['read']
        }
      }
    } as any;

    expect(() => requireTenantMatch(mockRequest, 'tenant-b'))
      .toThrow(TenantMismatchError);
  });

  it('should not throw when tenant matches', async () => {
    const mockRequest = {
      requestContext: {
        actor: {
          accountId: 'tenant-a'
        }
      }
    } as any;

    expect(() => requireTenantMatch(mockRequest, 'tenant-a'))
      .not.toThrow();
  });
});
```

### Teste de Componente React

```typescript
// apps/his-web/src/components/auth/Can.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Can } from './Can';

// Mock do hook usePermission
vi.mock('../../lib/rbac', () => ({
  usePermission: (permission: string) => permission === 'patient.delete'
}));

describe('Can', () => {
  it('should render children when permission is granted', () => {
    render(
      <Can permission="patient.delete">
        <button>Delete</button>
      </Can>
    );

    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should not render children when permission is denied', () => {
    render(
      <Can permission="admin.manage">
        <button>Admin</button>
      </Can>
    );

    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });
});
```

### Teste de Domínio

```typescript
// packages/domain/src/doseDueLogic.test.ts
import { describe, it, expect } from 'vitest';
import { calculateNextDueTime } from './doseDueLogic.js';

describe('Dose Due Logic', () => {
  it('should calculate next due time for q8h frequency', () => {
    const lastAdministered = new Date('2026-02-24T08:00:00Z');
    const result = calculateNextDueTime(lastAdministered, 'q8h');

    expect(result.toISOString()).toBe('2026-02-24T16:00:00Z');
  });

  it('should handle fixed times schedule', () => {
    const times = ['08:00', '16:00', '00:00'];
    const result = calculateNextDueFromTimes(times, currentTime);

    expect(result).toBeDefined();
  });
});
```

---

## Cobertura

### Relatório de Cobertura

```bash
# Gerar relatório
pnpm test -- --coverage

# Output
% Coverage report from v8
--------------------------|---------|----------|---------|---------|
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
All files                 |   18.5  |   12.3   |   15.2  |   19.1  |
 modules/medicationOrders |   45.2  |   38.1   |   42.0  |   46.5  |
 modules/patients         |   12.1  |    5.2   |   10.0  |   13.2  |
 modules/inpatient        |   32.5  |   28.4   |   30.1  |   33.8  |
--------------------------|---------|----------|---------|---------|
```

### Metas de Cobertura

| Módulo | Atual | Meta |
|--------|-------|------|
| medicationOrders | 45% | 80% |
| patients | 12% | 70% |
| inpatient | 32% | 70% |
| auth | 25% | 90% |
| admin | 15% | 80% |

---

## Melhores Práticas

### 1. Isolamento

```typescript
// Use mocks para dependências externas
const mockRepo = {
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
};

const service = createService({ db: mockDb }, { repo: mockRepo });
```

### 2. Arrange-Act-Assert

```typescript
it('should update medication order', async () => {
  // Arrange
  const input = { doseValue: 750 };
  mockRepo.findById.mockResolvedValue(existingOrder);

  // Act
  const result = await service.update('order-id', input);

  // Assert
  expect(result.kind).toBe('updated');
  expect(result.order.doseValue).toBe(750);
});
```

### 3. Testes Descritivos

```typescript
// Bom
it('should return order_not_found when order does not exist', async () => {
  // ...
});

// Evite
it('returns error', async () => {
  // ...
});
```

### 4. Cobertura de Casos de Borda

```typescript
describe('MedicationAdministration validation', () => {
  it('should require reason when status is refused', () => {
    // ...
  });

  it('should require reason when status is delayed', () => {
    // ...
  });

  it('should require delayedUntil when status is delayed', () => {
    // ...
  });

  it('should not allow reason when status is administered', () => {
    // ...
  });
});
```

### 5. Testes de Integração

```typescript
describe('Medication Flow Integration', () => {
  it('should create order, generate schedules, and record administration', async () => {
    // 1. Criar ordem
    const order = await medicationOrdersService.create(orderInput);
    
    // 2. Verificar schedules gerados
    const schedules = await schedulesService.list({ orderId: order.id });
    
    // 3. Registrar administração
    const admin = await administrationsService.record({
      orderId: order.id,
      scheduledFor: schedules[0].nextDueAt,
      status: 'administered'
    });
    
    // 4. Verificar estado final
    expect(admin.status).toBe('administered');
  });
});
```

---

## Módulos Sem Testes

Os seguintes módulos precisam de cobertura de testes:

| Módulo | Prioridade | Tipo Recomendado |
|--------|------------|------------------|
| alerts | Alta | Unitário |
| beds | Alta | Unitário |
| wards | Alta | Unitário |
| imaging | Média | Integração |
| laboratory | Média | Integração |
| agenda | Média | Integração |
| stock | Baixa | Unitário |
| invoices | Baixa | Unitário |

---

## CI/CD

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test -- --coverage
      - uses: codecov/codecov-action@v3
```

---

## Próximos Passos

1. **Aumentar cobertura** para 60%+ nos módulos críticos
2. **Adicionar testes E2E** com Playwright
3. **Implementar mutation testing** com Stryker
4. **Configurar testes de carga** com k6
5. **Adicionar testes de contrato** para APIs

---

*Documentação atualizada em 2026-02-24*
