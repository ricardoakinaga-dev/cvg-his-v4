# Relatório de Auditoria — Bugs, Inconsistências e Falhas de Segurança

**Projeto:** cvg-his-v4 (HIS veterinário, monorepo pnpm)
**Branch:** `agent/sync-v4-full-program`
**Data:** 2026-08-10
**Escopo:** `apps/api`, `apps/spa`, `apps/worker`, `packages/**`, configuração de testes e CI

---

## 1. Sumário executivo

Foram identificados e tratados **12 problemas**, sendo 7 de segurança (2 críticos, 3 altos e 2 médios), 2 bugs funcionais e 3 falhas de infraestrutura de testes que mascaravam cobertura. Essa contagem corresponde às subseções 2.1–2.7, 3.1–3.2 e 4.1–4.3 deste relatório.

O achado original mais grave foi a geração de identificadores de sessão com `Math.random()`, que tornava sessões autenticadas previsíveis. O segundo foi um *fail-open* que habilitava contas administrativas com senhas publicadas quando `NODE_ENV` não estava definido.

Também foi descoberto que **22 arquivos de teste unitário nunca executavam** por um mapa de aliases incompleto, e que **2 arquivos de teste — um deles de segurança — estavam em quarentena** no config principal em vez de corrigidos.

### Estado da validação no worktree atual

As correções estruturais descritas abaixo podem ser inspecionadas no código, mas a reexecução conclusiva dos gates ainda está em andamento. Este relatório **não declara a suíte principal, a API, o typecheck ou os gates de segurança como verdes** no worktree atual.

| Verificação | Evidência estática disponível | Estado da execução atual |
|---|---|---|
| `vitest.config.ts` | aliases compartilhados e arquivos antes em quarentena reintegrados ao include geral | Pendente de conclusão |
| `vitest.unit.config.ts` | usa o mesmo `createWorkspaceAliases(root)` da suíte principal | Pendente de conclusão |
| `pnpm --filter @cvg-his-v2/api test` | scripts declaram `NODE_ENV=test` explicitamente | Pendente de conclusão |
| `pnpm typecheck` | comando permanece como gate do workspace | Pendente de conclusão |
| `pnpm security:secrets` | comando permanece como gate de segredos | Pendente de conclusão |
| `pnpm security:enterprise` | comando permanece como gate de dependências e segurança | Pendente de conclusão |

Até que as saídas desses comandos sejam registradas para a revisão corrente, não há base para afirmar ausência de regressões ou publicar contagens finais de testes.

---

## 2. Achados de segurança

### 2.1 CRÍTICO — Identificadores de sessão gerados com `Math.random()`

**Arquivos:** `packages/shared/utils/src/index.ts`, `packages/modules/auth/src/index.ts`

`createCorrelationId()` usava `Math.random().toString(36).slice(2, 10)` — 8 caracteres base36 de um gerador **não criptográfico**. Essa função alimentava diretamente:

- `sessionId` (`createCorrelationId('sess')`) — a chave que identifica a sessão autenticada;
- `refreshNonce` (`createCorrelationId('rnonce')`) — o valor que ancora a rotação do refresh token.

O `Math.random()` do V8 usa xorshift128+, cujo estado interno é recuperável a partir de poucas saídas observadas. Como IDs de correlação circulam em respostas e cabeçalhos (`x-correlation-id`), um atacante pode observar saídas do mesmo gerador e **prever identificadores de sessão de outros usuários**. Em um sistema com dados clínicos e de tutores sob LGPD, isso é sequestro de sessão.

**Correção:**
- `createCorrelationId()` passou a usar `randomBytes()` no sufixo e conserva o formato temporal `prefixo_timestamp_random`.
- `createSecureId()` foi adicionada com **256 bits** de entropia e aplicada a `sessionId` e `refreshNonce`.
- `createSecureId()` não inclui timestamp: sua saída atual é `prefixo_randomhex`, com 32 bytes aleatórios codificados em hexadecimal.

### 2.2 CRÍTICO — Contas administrativas com senha conhecida quando `NODE_ENV` está ausente

**Arquivo:** `packages/modules/users/src/index.ts`

```ts
function isSeedEnvironment(): boolean {
  const env = process.env.NODE_ENV;
  return !env || env === 'development' || env === 'test';   // fail-open
}
```

O `!env` fazia com que **ambiente desconhecido fosse tratado como desenvolvimento**. Essa função controla dois comportamentos ao mesmo tempo:

1. o carregamento dos usuários seed (`admin`, `vet`, `reception`, `auditor`, `nurse`);
2. a aceitação da senha literal desses usuários (`seed_admin`, `seed_vet`, ...) em `comparePassword`.

Um deploy de produção que simplesmente esqueça de definir `NODE_ENV` ganha um usuário `admin` funcional com senha publicada no repositório. O schema de configuração (`packages/shared/config`) aplica *default* `'development'` ao seu próprio parse, mas o módulo de usuários lê `process.env.NODE_ENV` diretamente — o *default* não o protege.

**Correção:** a função passou a exigir `development` ou `test` explícitos (*fail-closed*). Ambiente desconhecido não habilita mais seed.

> **Ação recomendada para a equipe:** confirmar que todos os ambientes implantados definem `NODE_ENV` explicitamente, e rotacionar credenciais de qualquer ambiente que possa ter rodado sem a variável.

### 2.3 ALTO — Escopo de tenant (RLS) definível por cabeçalho em requisição não autenticada

**Arquivos:** `packages/tenant-context/src/middleware.ts`, `apps/api/src/server.ts`

`resolveTenantFromRequest` resolvia a conta assim:

```ts
const accountId = options.fallbackAccountId ?? request.headers['x-account-id'];
```

O `fallbackAccountId` vem do token verificado. Quando **não há token válido**, o `??` cai para o cabeçalho `x-account-id`, controlado pelo cliente. Esse valor alimenta o `TenantContext`, que por sua vez define `app.current_account_id` no PostgreSQL — ou seja, **a variável de sessão que governa as políticas de RLS**.

A defesa primária (`requirePrincipal` por rota) continuava válida, então não há exploração direta conhecida; mas a defesa em profundidade estava invertida: qualquer rota que consultasse o banco sem passar por `requirePrincipal` executaria sob a conta escolhida pelo atacante. O próprio pacote já tinha um teste chamado *"does not let request headers override authenticated identity fallbacks"* — que só cobria o caso **com** identidade autenticada, deixando o caso sem identidade descoberto.

**Correção:**
- Identidade por cabeçalho passou a ser **opt-in** via `allowHeaderIdentity` (padrão `false`), com o motivo documentado no tipo.
- `apps/api/src/server.ts` — único chamador de produção — não passa a flag, portanto agora ignora `x-tenant-id`/`x-account-id`/`x-user-id`.
- Adicionados testes de regressão em ambos os arquivos de teste cobrindo exatamente o caso não autenticado.

### 2.4 ALTO — Enumeração de usuários pela mensagem de bloqueio

**Arquivo:** `packages/modules/auth/src/index.ts`

Com a conta bloqueada por força bruta, o login respondia `"Account temporarily locked due to too many failed attempts"`, enquanto credenciais inválidas respondiam `"Invalid username or password"`. A diferença **confirma a existência do usuário** e ainda informa que ele está sob bloqueio.

Havia um teste explícito exigindo o comportamento correto — `locked account returns same error message to prevent enumeration` — mas ele estava **excluído da suíte principal** (ver §4.2), então a regressão passou despercebida.

**Correção:** a mensagem passou a ser genérica e idêntica à de credencial inválida. O motivo real permanece registrado na trilha de auditoria (`login_blocked_locked`, `riskLevel: high`), que é o local apropriado.

### 2.5 ALTO — Comparação de assinatura de token não constante no tempo

**Arquivo:** `packages/modules/auth/src/index.ts`

A verificação da assinatura HMAC do token de acesso/refresh usava comparação de string com `===`:

```ts
return providedSignature === expectedSignature;
```

`===` em strings faz curto-circuito no primeiro byte divergente, expondo um canal lateral de temporização para forja de assinatura. O restante do código já fazia o correto (`timingSafeEqual` em `whatsapp-routes.ts`, `attachment-download-token.ts`, `api-keys.service.ts`, `users`), o que torna este ponto uma inconsistência isolada — justamente no caminho mais sensível.

**Correção:** substituída por `timingSafeEqual` com verificação prévia de comprimento (obrigatória, pois `timingSafeEqual` lança exceção em buffers de tamanhos diferentes).

### 2.6 MÉDIO — Hash legado sem sal e comparado em tempo variável

**Arquivo:** `packages/modules/users/src/index.ts`

O caminho de compatibilidade aceita hashes SHA-256 puros (sem sal) e os comparava com `===`. Também a verificação de senha seed usava `===`.

**Correção:** ambas as comparações passaram a usar um auxiliar `timingSafeEqualString`. Foi adicionado comentário registrando que SHA-256 sem sal **não é um hash de senha aceitável** e que esses registros devem ser migrados para scrypt no próximo login bem-sucedido.

> **Ação recomendada:** implementar a reidratação para scrypt no login, ou confirmar via consulta ao banco que não restam hashes no formato legado.

### 2.7 MÉDIO — Dados de paciente em log não estruturado

**Arquivo:** `apps/api/src/consumers/inpatient.consumer.ts`

```ts
console.log('[InpatientEventHandlers] Patient admitted:', ctx);
```

O `ctx` é o payload completo do evento de internação/alta, contendo identificadores de paciente e tutor. Ia para o stdout via `console.log`, fora do logger estruturado — sem redação, sem nível, sem correlação, e fora de qualquer política de retenção. Para um sistema sob LGPD isso é vazamento de dado pessoal em log.

**Correção:** substituído pelo logger estruturado do projeto (`createLogger`), registrando apenas referências não identificadoras (`eventId`, `eventType`, `accountId`, `correlationId`). O detalhe clínico permanece na trilha de auditoria, que é o local com controle de acesso adequado.

---

## 3. Bugs funcionais

### 3.1 Métrica de requisições em voo sempre zerada

**Arquivos:** `apps/api/src/metrics.ts`, `apps/api/src/server.ts`

O handler de `/metrics` chamava `updateAppMetrics({ ..., activeRequests: 0, ... })` com **zero fixo**. Como `updateAppMetrics` fazia `appActiveRequests.set(options.activeRequests)`, cada *scrape* do Prometheus sobrescrevia o gauge com 0 — anulando por completo o rastreamento feito por `incrementActiveRequests`/`decrementActiveRequests`. Na prática, `app_active_requests` **nunca refletiu a realidade** em produção.

Havia ainda um segundo defeito: `decrementActiveRequests()` chamava `.dec()` sem piso. Um decremento desbalanceado (requisição que falha antes do incremento, ou caminho de erro que decrementa duas vezes) empurraria o gauge para valores negativos permanentes.

**Correção:**
- `activeRequests` tornou-se opcional em `updateAppMetrics` e só é aplicado quando fornecido explicitamente; a propriedade do gauge fica com as funções de incremento/decremento.
- Removido o `activeRequests: 0` do handler de `/metrics`.
- Introduzido espelho interno do contador com piso em zero (`Math.max(0, ...)`).

### 3.2 Rota protegida sem credencial retornava 500 em vez de 401

**Arquivo:** `apps/api/src/server.ts`

Sem token válido, `resolveTenantFromRequest` lançava um `Error` comum. Como `toErrorResponse` só mapeia `AppError` para status HTTP, tudo o mais vira **500 `INTERNAL_ERROR`**. Requisições não autenticadas a rotas protegidas eram, portanto, contabilizadas como erro do servidor — poluindo *error budgets* e SLOs, e confundindo clientes.

**Correção:** como `/health`, `/metrics` e OpenAPI já retornam antes desse ponto, tudo que chega ali é rota com escopo de tenant. Adicionada verificação explícita que lança `AuthenticationError` (401) quando não há conta verificada.

---

## 4. Falhas na infraestrutura de testes

Estas são as mais insidiosas: não quebravam o build, mas **reduziam silenciosamente a cobertura real**.

### 4.1 Suíte do `apps/api` dependia do próprio fail-open corrigido

O script `test` de `apps/api` executava `node --test` **sem definir `NODE_ENV`**, e o passo "Run unit tests" do CI roda `pnpm test` igualmente sem a variável. Os testes autenticavam com `login(server, 'admin', 'seed_admin')` e só funcionavam porque `!env` habilitava os usuários seed — isto é, **a suíte dependia exatamente da falha de segurança descrita em §2.2**.

Após o *fail-closed*, uma execução sem `NODE_ENV=test` explícito expôs a dependência dos testes em relação ao comportamento inseguro. Definir o ambiente de teste isolou essa causa durante o diagnóstico, mas esse diagnóstico não substitui a reexecução completa do worktree atual.

**Correção:** `NODE_ENV=test` declarado explicitamente nos scripts `test`, `test:db` e `test:all` de `apps/api/package.json`, e no passo de CI correspondente. Testes agora **declaram** seu ambiente em vez de depender de um *default* implícito e inseguro.

**Validação atual:** a configuração está presente no código; o resultado conclusivo da suíte da API permanece pendente.

### 4.2 22 arquivos de teste unitário nunca executavam

`vitest.unit.config.ts` declarava **2 aliases**, enquanto `vitest.config.ts` declarava cerca de 40. Rodar a suíte por aquele config produzia 22 falhas de resolução do tipo `Cannot find package '@cvg-his-v2/...'` — os testes não rodavam, apenas quebravam na coleta.

**Correção:** o mapa de aliases foi extraído para `vitest.alias.ts` (`createWorkspaceAliases(root)`) e é consumido pelos dois configs, eliminando a divergência na origem. Também foi acrescentado o alias `module-counter-sales`, que faltava em ambos.

### 4.3 Dois arquivos de teste em quarentena, um deles de segurança

`vitest.config.ts` excluía da suíte:

```ts
'tests/unit/auth/hardening.test.ts',
'tests/unit/observability/metrics.test.ts'
```

Ou seja, **40 testes — incluindo os de proteção contra força bruta e anti-enumeração — não eram aplicados**. As falhas reais eram:

- `hardening.test.ts`: 1 falha por regressão de produto (§2.4) e 2 por testes desatualizados — chamavam `completeMfaLogin({ userId, token })` sem o `challengeId` que a API passou a exigir.
- `metrics.test.ts`: 2 falhas por chamadas desatualizadas a `updateAppMetrics` (campos obrigatórios adicionados depois) e 1 falha legítima expondo o bug de piso do §3.1.

**Correção:** produto e testes foram ajustados conforme §2.4 e §3.1, e as duas exclusões foram **removidas** do `vitest.config.ts`. Com isso, esses arquivos voltam a ser coletados pela configuração principal; o resultado da execução completa e a contagem final permanecem pendentes.

---

## 5. Superfícies inspecionadas na auditoria original

As observações abaixo registram a inspeção realizada na rodada original. Elas não equivalem a um gate verde para o worktree atual; a revalidação automatizada completa permanece pendente.

- **Injeção de SQL** — nenhuma interpolação em queries; uso consistente de Drizzle com parâmetros.
- **XSS** — nenhuma ocorrência de `v-html`, `innerHTML`, `eval` ou `new Function` no código de aplicação.
- **Cabeçalhos de segurança** (`http/security-headers.ts`) — CSP restritiva, `nosniff`, `frame-options: DENY`, `referrer-policy`, `permissions-policy`, HSTS condicionado a produção + conexão segura.
- **CORS** (`http/cors.ts`) — allowlist estrita com normalização de origem, `Vary` correto, sem *wildcard* nem reflexão de origem arbitrária.
- **Cookie de refresh** — `HttpOnly`, `SameSite=Strict` e `Secure` condicional.
- **Armazenamento de token no SPA** — tokens não são mais persistidos em `localStorage`; as chaves antigas só são lidas para remoção.
- **Token de download de anexo** — HMAC com `timingSafeEqual`, validação de expiração e de tipos dos claims.
- **Chaves de API** — geradas com `randomUUID`, armazenadas como hash, verificadas em tempo constante, com rate limit por chave.
- **TOTP/MFA** — implementação conforme RFC 6238; segredos e códigos de recuperação via `randomBytes`.
- **Webhook do WhatsApp** — segredo verificado com `timingSafeEqual`, rejeitando segredo não configurado.
- **ReDoS / injeção de regex** — entradas dinâmicas devidamente escapadas antes de compor `RegExp`.
- **Segredos e dependências** — os gates `pnpm security:secrets` e `pnpm security:enterprise` devem ser reexecutados antes de publicar o estado da revisão atual.

---

## 6. Arquivos alterados

| Arquivo | Natureza |
|---|---|
| `packages/shared/utils/src/index.ts` | CSPRNG + `createSecureId` (§2.1) |
| `packages/modules/auth/src/index.ts` | IDs seguros, `timingSafeEqual`, mensagem anti-enumeração (§2.1, §2.4, §2.5) |
| `packages/modules/users/src/index.ts` | Fail-closed de seed, comparações em tempo constante (§2.2, §2.6) |
| `packages/tenant-context/src/middleware.ts` | Identidade por cabeçalho como opt-in (§2.3) |
| `apps/api/src/server.ts` | 401 em vez de 500; remoção do `activeRequests` fixo (§3.1, §3.2) |
| `apps/api/src/metrics.ts` | Gauge com piso zero e propriedade corrigida (§3.1) |
| `apps/api/src/consumers/inpatient.consumer.ts` | Log estruturado sem dados pessoais (§2.7) |
| `apps/api/package.json` | `NODE_ENV=test` nos scripts de teste (§4.1) |
| `.github/workflows/ci.yml` | `NODE_ENV=test` no passo de testes unitários (§4.1) |
| `vitest.alias.ts` *(novo)* | Fonte única dos aliases de workspace (§4.2) |
| `vitest.config.ts` | Consome aliases compartilhados; quarentena removida (§4.2, §4.3) |
| `vitest.unit.config.ts` | Consome aliases compartilhados (§4.2) |
| `packages/tenant-context/src/index.test.ts` | Regressão de spoofing de tenant (§2.3) |
| `tests/unit/tenant-context/middleware.test.ts` | Regressão de spoofing de tenant (§2.3) |
| `tests/unit/auth/hardening.test.ts` | Atualização para o contrato de `challengeId` (§4.3) |
| `tests/unit/observability/metrics.test.ts` | Atualização para o contrato de `updateAppMetrics` (§4.3) |

---

## 7. Recomendações não implementadas

Ficam fora do escopo desta correção, mas merecem decisão da equipe:

1. **Rotação de credenciais** — se algum ambiente implantado já rodou sem `NODE_ENV`, as contas seed eram válidas. Confirmar e rotacionar.
2. **Migração dos hashes legados** — reidratar SHA-256 sem sal para scrypt no login, e depois remover o caminho de compatibilidade em `comparePassword`.
3. **Proteção contra replay de TOTP** — `verifyTOTP` aceita a mesma janela de 30s mais de uma vez. Registrar o último contador usado por usuário eliminaria a reutilização do código.
4. **Sessões em memória** — `AuthService` mantém sessões em um `Map` de processo, com `hydrateFromRepository` apenas na inicialização. Em execução com múltiplas instâncias, uma sessão criada em uma instância não é reconhecida pelas demais. Convém validar se o estado distribuído (`RUNTIME_DISTRIBUTED_STATE_ENABLED`) cobre esse caminho antes de escalar horizontalmente.
5. **`INSECURE_DEFAULT_SECRET`** — `AUTH_SECRET` tem *default* inseguro que só é rejeitado em ambientes production-like. Como `NODE_ENV` ausente já se mostrou um risco real (§2.2), vale exigir o segredo explicitamente em qualquer ambiente que não seja `test`.
