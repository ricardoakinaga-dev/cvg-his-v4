# Auditoria Crítica e Criteriosa - CVG-HIS V2

**Data:** 05 de Abril de 2026
**Objetivo:** Levantar defeitos arquiteturais, anti-padrões de codificação e riscos técnicos incorporados na construção V2 até a presente data, conforme solicitados.

**Nota de leitura atual:** este texto registra o estado da auditoria na epoca em que `apps/web` ainda era tratado como GUI canônico. A trilha oficial atual do frontend foi deslocada para `apps/spa`.

Apesar de o projeto ter excelentes fundações técnicas baseadas em Monorepo/Turborepo e uma separação de domínio louvável em `packages/modules`, uma investigação aprofundada na base de código revelou dívidas técnicas crônicas que representam riscos reais para a escalabilidade, manutenção e evolução do time.

---

## 1. O "God File" de Roteamento (`apps/api/src/server.ts`)

### 🔴 Defeito Crítico (Severidade Alta)
O arquivo principal do servidor (`apps/api/src/server.ts`) possui **mais de 3.500 linhas**. O roteamento de absolutamente **todos os módulos HTTP do ERP** está unificado neste único arquivo em uma cadeia colossal e interminável de blocos `if/else` (ex: `if (pathname === '/auth/login' && request.method === 'POST')`).

- **Problema de Manutenção:** Qualquer adição, correção de bug ou feature nova requer intervenção nesse gigantesco arquivo, transformando-o num ímã perpétuo de *merge conflicts* em fluxos multi-time.
- **Violação de Boas Práticas:** Isso fere mortalmente os princípios SOLID (especialmente Responsabilidade Única - SRP, e Aberto/Fechado - OCP). Além disso, a injeção do contexto, CORS, e auditoria estão fixados hardcoded nesses ifs massivos ao invés de através de middlewares genéricos e composicionais.
- **Risco:** Quedas bruscas na velocidade de desenvolvimento, alta barreira de entrada para novos Devs na Squad, e provável refatoração obrigatória traumatizante nos próximos meses.

---

## 2. Pobreza e Deslocamento Absoluto na Pirâmide de Testes (Unit Tests Austes no Domínio)

### 🟠 Defeito Arquitetural (Severidade Média/Alta)
Todo código canônico de regra de negócio habita os pacotes localizados em `packages/modules/*`. Contudo, ao inspecionar fisicamente esses pacotes isolados, verificou-se a **completa ausência de suítes de testes de unidade co-localizados** (exemplo sem `*.spec.ts` ou `*.test.ts` dentro dos pacotes). 

- **Diagnóstico:** A segurança do projeto atualmente descansa de forma irresponsável e quase unilateral sobre um teste gigante de integração consolidado em `apps/api/src/db-persistence.test.ts`.
- **Risco:** Testar regras ricas de domínio — como orlação de preços de faturamento (`billing`), regras LGPD, restrições de horários de resgate (`scheduling`) — apenas através de portas HTTP (integração de banco de dados e rotas) gera baterias que são lentas e propensas a interrupções (Flaky). Se um domínio sofrer regressão isolada, o feedback CI demorará demais e será confuso para debugar. 

---

## 3. Discrepâncias de Schema e Acoplamento Inseguro do Repositório (Multi-Tenancy Flakiness)

### 🟡 Defeito Potencial (Severidade Média)
Em varreduras e cruzamentos dos artefatos (p. ex. `packages/modules/patients/src/repositories/database-patient.repository.ts`), encontram-se *workarounds*/"marretas" no mapeamento do banco de dados documentados implicitamente via comentários de Type-Casting:
```typescript
accountId: 'acc_cvg_demo' as AccountId, // TODO: Add accountId to schema
```
- **Diagnóstico:** A aplicação alega ter uma arquitetura pronta para Multi-Tenancy massivo / Contextos Isolados (`accountId`, `tenantId`, `branchId` vistos no header parsing do server.ts), mas não força a verificação e integridade rígidas disso na base de dados (Schema). Confiar no `TODO` em lógicas fundamentais de Tenant Data-Segregation resultará, fatalmente, em vazamento de dados entre clínicas (um usuário de uma conta VET operando dados de outra por falha transacional/routing error).

---

## 4. Frontend Arquiteturalmente Estagnado vs Requisitos Premium

### 🟡 Dívida de Oportunidade (Severidade Média)
A arquitetura documentada para o GUI canônico naquele momento (`docs/114-frontend-architecture.md`) decretava o modelo operante de `apps/web`: *Roteamento Server-Side com Server Render e HTML/JS inlines injetados*.

- **Análise Crítica:** Construir sistemas de gestão hospitalar ricos (onde profissionais da saúde usam visualizações dinâmicas, mapas interativos, abas concomitantes, filas sendo atualizadas em tempo real e odontogramas) com injeção procedural server-side Node.js e vanilla client é viável apenas numa "versão alpha/MVP". 
- **O Risco:** Assim que o volume operacional aumentar e as áreas médicas pedirem UX reativo e fluidos assíncronos (Micro-animações, estados e off-line/local-first), essa base frontend irá desmoronar para um acoplamento macarrônico semelhante a velhos projetos jQuery da década passada.

---

## Conclusão e Próximos Passos Sugeridos:

1. **Desmontar o `server.ts`:** Adotar imediatamente um HTTP Router declarativo (Hono, Express, Fastify) e fatiar a injeção em "Controllers/Routers" injetados programaticamente.
2. **Aplicar Unit Tests Locais:** Impor no CI cobertura primária e isolada de domínio DENTRO dos pacotes do Turborepo, libertando os testes de integração das verificações puras de `If/Else` negocial.
3. **Consolidar os Contratos do Repositório de Banco de Dados:** Eliminar as falhas da coluna `accountId` no ORM/SQL em favor de um modelo fechado que impessa a compilação ou o insert na DB caso o AccountID esteja omitido. 
