# Mini-fase técnica — cobertura aprofundada de LGPD

Data: 2026-04-22
Status: implementado
Escopo: bateria comportamental para `LgpdHubPage.vue`

## 1. Objetivo

Avançar na mini-fase de estabilização + cobertura pelo terceiro alvo prioritário do bloco enterprise:
- `lgpd`

Foco desta entrega:
- consentimentos
- DSR
- estados
- ações

## 2. Arquivo de teste criado

- `apps/spa/src/pages/lgpd/__tests__/LgpdHubPage.test.ts`

## 3. Cobertura adicionada

### 3.1 Estado inicial e alertas
Foi coberto o carregamento inicial da página com consentimentos e solicitações.

Verificações:
- renderização de `LGPD`
- alerta `Consentimento clínico pendente`
- alerta `DSRs pendentes`
- KPI de total de solicitações
- chamadas iniciais para:
  - `getConsentStatus('user-1', 'user')`
  - `listDsrRequests()`

### 3.2 Ações de consentimento
Foi coberta a trilha de concessão e revogação de consentimento.

Verificações:
- clique em `Conceder`
- chamada para `grantConsent(...)`
- recarregamento do estado
- clique em `Revogar`
- chamada para `revokeConsent(...)`

### 3.3 Validação da criação de DSR
Foi coberta a validação mínima do formulário de solicitação.

Verificação:
- sem `subjectId`, a submissão não acontece
- mensagem exibida:
  - `ID do titular é obrigatório`

### 3.4 Criação de DSR + filtro por status
Foi coberta a submissão válida do formulário de DSR.

Verificações:
- preenchimento de `subjectId`
- seleção de `subjectType`
- seleção de `requestType`
- preenchimento de observação
- chamada para `createDsrRequest(...)`
- uso do filtro por status para exibir apenas solicitações `completed`

### 3.5 Ações de completar e rejeitar DSR
Foi coberta a trilha operacional da tabela de solicitações.

Verificações:
- clique em `Completar`
- chamada para `completeDsrRequest('dsr-1')`
- clique em `Rejeitar`
- chamada para `rejectDsrRequest('dsr-1', 'Solicitação rejeitada pelo operador')`

## 4. Estratégia técnica usada

A suíte usa mocks explícitos para:
- `lgpdService.getConsentStatus`
- `lgpdService.grantConsent`
- `lgpdService.revokeConsent`
- `lgpdService.listDsrRequests`
- `lgpdService.createDsrRequest`
- `lgpdService.completeDsrRequest`
- `lgpdService.rejectDsrRequest`
- `useAuthStore`

Isso permitiu validar o comportamento da página com isolamento suficiente e sem dependência do backend real.

## 5. Validação executada

### Suíte focada
Comando:

```bash
cd apps/spa
npm test -- src/pages/lgpd/__tests__/LgpdHubPage.test.ts
```

Resultado:
- `Test Files 1 passed (1)`
- `Tests 5 passed (5)`

### Validação ampliada com a base recente
Comando:

```bash
npm test -- src/stores/__tests__/auth.test.ts src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts src/pages/access-control/__tests__/AccessControlPage.test.ts src/pages/api-keys/__tests__/ApiKeysPage.test.ts src/pages/lgpd/__tests__/LgpdHubPage.test.ts
```

Resultado:
- `Test Files 7 passed (7)`
- `Tests 43 passed (43)`

## 6. Leitura executiva do impacto

Antes desta entrega:
- `LgpdHubPage` era uma superfície funcionalmente sensível, mas sem cobertura comportamental dedicada.

Depois desta entrega:
- o domínio LGPD passou a ter proteção melhor sobre:
  - carga inicial
  - trilha de consentimento
  - formulário DSR
  - filtragem
  - ações de completar e rejeitar

Isso reduz regressão silenciosa numa área de alta sensibilidade operacional e regulatória.

## 7. Próximo passo recomendado

Seguindo a ordem combinada, o próximo item natural agora é:
- `master-search`

Focos sugeridos:
- busca vazia
- busca com resultados
- limpeza
- agrupamento de resultados

## 8. Conclusão

A mini-fase técnica continua consistente.

Depois do auth store, de `access-control` e de `api-keys`, a cobertura de `lgpd` foi aprofundada com sucesso, reforçando o bloco enterprise com mais robustez comportamental.