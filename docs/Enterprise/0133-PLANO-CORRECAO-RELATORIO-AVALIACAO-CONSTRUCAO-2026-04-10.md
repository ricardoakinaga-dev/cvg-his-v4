# PLANO DE CORRECAO — RELATORIO DE AVALIACAO DE CONSTRUCAO 2026-04-10

**Data:** 10/04/2026
**Base auditada:** `docs/RELATORIO-AVALIACAO-CONSTRUCAO-2026-04-10.md`
**Objetivo:** verificar os itens citados no relatorio contra o estado real do repositório e definir um plano de correção confiável para todos os pontos relevantes

---

## 1. Leitura Executiva

O relatorio auditado foi gerado sobre o commit atual (`ca2fa1c`), mas ele mistura:

1. problemas que ainda sao reais;
2. problemas que ja foram corrigidos no proprio estado atual do repositório;
3. recomendacoes de evolucao que nao sao bugs, e sim backlog estrutural.

Conclusao:

- o relatorio nao deve ser tratado como lista literal de bugs abertos;
- ele deve ser tratado como entrada de auditoria que precisa ser reclassificada;
- este plano faz essa reclassificacao e organiza a correcao por prioridade real.

---

## 2. Verificacao Item a Item

### 2.1 Itens do relatorio que JA ESTAO SUPERADOS

#### A. Turbo build falhando por `pipeline` obsoleto

**Relatorio:** build falha porque `turbo.json` usa `pipeline` obsoleto.

**Verificacao real:**

- `turbo.json` hoje contem `tasks` configurado corretamente;
- ainda existe um bloco `pipeline` residual;
- o problema descrito como “build falhando por isso” nao se sustenta por si so.

**Status real:** `SUPERADO PARCIALMENTE / LIMPEZA PENDENTE`

**Acao:**

- remover o bloco `pipeline` residual para eliminar ambiguidade;
- manter apenas `tasks`.

#### B. Typecheck falhando por `@cvg-his-v2/shared-auth-sdk`

**Relatorio:** typecheck falha porque o pacote nao resolve.

**Verificacao real:**

- `vitest.config.ts` resolve explicitamente `@cvg-his-v2/shared-auth-sdk`;
- `shared-auth-sdk` aparece compilando em `pnpm typecheck`;
- o problema descrito nao se reproduz como falha estrutural atual.

**Status real:** `SUPERADO`

**Acao:**

- nenhuma correcao funcional urgente;
- apenas manter vigilancia sobre aliases/exports se novos pacotes forem adicionados.

#### C. `accountId = 'pending'` persistindo na borda HTTP

**Relatorio:** problema critico ainda persistente.

**Verificacao real:**

- nao ha ocorrencia desse fallback no runtime principal pesquisado;
- as ocorrencias atuais de `'pending'` encontradas estao em testes de rate limiting, nao na borda HTTP do produto.

**Status real:** `SUPERADO NO RUNTIME / RESIDUAL EM TESTES`

**Acao:**

- revisar testes que usam `'pending'` para deixar claro que e valor de teste, nao comportamento do runtime;
- opcionalmente trocar por constante de fixture mais explicita.

#### D. Storybook nao configurado

**Relatorio:** Storybook nao configurado/documentado.

**Verificacao real:**

- `packages/design-system/package.json` tem `storybook` e `build-storybook`;
- `.storybook/` existe;
- stories existem;
- docs enterprise registram `build-storybook PASS`.

**Status real:** `SUPERADO`

**Acao:**

- nenhuma correcao estrutural imediata;
- apenas manter docs sincronizados.

#### E. 22 modulos sem frontend / products services staff sem SPA

**Relatorio:** frontend muito atras do backend nesses modulos.

**Verificacao real:**

- varias rodadas do programa ja reduziram isso materialmente;
- `products`, `services`, `staff`, `quotes`, `pix`, `cash`, `diagnostics`, `prescriptions`, `surgery`, etc. ja foram incorporados na SPA;
- o gap residual atual e muito menor e ja esta reclassificado no doc `0127`.

**Status real:** `SUPERADO EM GRANDE PARTE`

**Acao:**

- manter `0127` como fonte de verdade;
- nao usar mais o numero “22 modulos nao migrados” como diagnostico atual.

#### F. PIX nao integrado ao billing

**Relatorio:** PIX parcial, sem integracao ao billing.

**Verificacao real:**

- `PIX -> Billing` foi fechado em rodada posterior;
- `payment.pix.confirmed` aciona `BillingService.settleByRecordId()`.

**Status real:** `SUPERADO`

**Acao:**

- atualizar a leitura executiva dos docs que ainda insinuarem essa lacuna.

#### G. Webhooks sem retry/DLQ

**Relatorio:** lacuna pendente.

**Verificacao real:**

- o event bus ja possui retry + DLQ + inspect + reprocess;
- a observacao ainda pode continuar parcialmente valida para a camada especifica de webhooks, mas nao mais como ausencia total de backbone operacional.

**Status real:** `SUPERADO NO BACKBONE / PARCIAL NA CAMADA DE WEBHOOK`

**Acao:**

- focar na operabilidade especifica de webhooks, nao mais em “nao ha retry/DLQ no sistema”.

---

### 2.2 Itens do relatorio que AINDA SAO VALIDOS

#### A. `server.ts` excessivamente grande

**Status real:** `VALIDO`

**Plano de correcao:**

- fatiar `apps/api/src/server.ts` por dominios e rotas administrativas;
- comecar por rotas de integracoes, pagamentos, webhooks e internal ops;
- manter compatibilidade de OpenAPI e testes.

**Prioridade:** `P1`

#### B. Credenciais seed previsiveis / exemplos sensiveis

**Status real:** `VALIDO PARCIALMENTE`

**Evidencia:**

- seeds e testes ainda usam `seed_admin`, `seed_reception`, etc.;
- OpenAPI ainda expõe exemplo `admin@cvg.com` / `mypassword123`.

**Plano de correcao:**

- substituir exemplos de OpenAPI por placeholders neutros;
- revisar politica de seeds de desenvolvimento e docs associadas;
- manter compatibilidade de testes, mas reduzir exposição desnecessária em docs/runtime examples.

**Prioridade:** `P0`

#### C. Coverage e sinal de QA abaixo do desejado

**Status real:** `VALIDO PARCIALMENTE`

**Evidencia:**

- `vitest.config.ts` tem coverage configurado;
- a conclusao “0% por JSON mal formatado” nao esta comprovada;
- mesmo assim os thresholds continuam muito baixos (`lines: 5`, `statements: 5`).

**Plano de correcao:**

- validar o artefato de coverage gerado na pratica;
- confirmar se o problema e formato de output ou apenas threshold baixo;
- elevar thresholds de forma progressiva;
- transformar coverage novamente em sinal confiavel e depois em gate mais forte.

**Prioridade:** `P1`

#### D. OpenTelemetry / traces ausentes

**Status real:** `VALIDO`

**Plano de correcao:**

- introduzir instrumentacao minima de tracing nas apps `api` e `worker`;
- propagar `correlationId` como base do trace;
- comecar com instrumentacao local/exporter simples antes de stack completa.

**Prioridade:** `P2`

#### E. Grafana dashboards / alerting ausentes

**Status real:** `VALIDO`

**Plano de correcao:**

- primeiro definir SLOs e queries minimas;
- depois materializar dashboards e alert rules;
- nao comecar por ferramenta sem antes fechar a semantica dos sinais.

**Prioridade:** `P2`

#### F. Security headers ainda incompletos

**Status real:** `VALIDO PARCIALMENTE`

**Evidencia:**

- existem `x-content-type-options`, `x-frame-options`, `referrer-policy`;
- nao apareceu evidencia atual de `Content-Security-Policy` nem `Strict-Transport-Security`.

**Plano de correcao:**

- adicionar CSP minima segura;
- adicionar HSTS condicionado a ambiente HTTPS;
- revisar headers de seguranca de forma centralizada no bootstrap HTTP.

**Prioridade:** `P1`

#### G. OpenAPI nao gerada automaticamente do codigo

**Status real:** `VALIDO COMO DECISAO ARQUITETURAL/DEBT`

**Plano de correcao:**

- decidir explicitamente entre:
  - manter YAML canonico com validacao forte;
  - ou migrar para geracao a partir de codigo/fonte tipada.
- enquanto isso, reforcar o gate de divergencia entre runtime e spec.

**Prioridade:** `P2`

#### H. Deploy/Secrets ainda pouco maduros

**Status real:** `VALIDO`

**Plano de correcao:**

- manter Docker Compose como baseline atual;
- abrir backlog separado para Vault/Kubernetes/Terraform apenas quando a operacao pedir isso;
- nao tratar isso como bug imediato de entrega do produto.

**Prioridade:** `P3`

---

### 2.3 Itens do relatorio que precisam ser RECLASSIFICADOS COMO BACKLOG, NAO COMO BUG

- `ML` “esbocado”:
  - ja ha implementacao acima de esboço, mas ainda nao e trilha production-grade.
- `SOC2` “esboçado”:
  - ha modulo e testes, mas maturidade de compliance segue incompleta.
- `WhatsApp vendor prep apenas`:
  - tratar como trilha de integracao em evolucao, nao como regressao da base.
- `Sem Kubernetes / Terraform / Vault / ArgoCD`:
  - backlog de maturidade operacional, nao defeito imediato do produto.
- `Sem WebSocket real-time`:
  - melhoria de experiencia/capacidade, nao bug estrutural atual.

---

## 3. Plano de Correcao Consolidado

### P0 — Corrigir agora

1. Limpar exemplos sensiveis/preditivos em OpenAPI e docs publicas.
2. Atualizar o proprio relatorio auditado com nota de desatualizacao ou criar doc espelho com estado corrigido.
3. Consolidar a fonte de verdade para gap frontend/backend em `0127` e snapshots executivos, evitando diagnosticos antigos.

### P1 — Corrigir na proxima rodada curta

1. Remover o bloco `pipeline` residual de `turbo.json`.
2. Endurecer security headers com CSP + HSTS condicional.
3. Validar coverage real e corrigir qualquer problema de output/reporting.
4. Subir thresholds de coverage de forma progressiva.
5. Iniciar fatiamento de `apps/api/src/server.ts` por dominios.

### P2 — Evolucao estrutural de curto/medio prazo

1. Instrumentar tracing/OpenTelemetry minimo.
2. Materializar operabilidade especifica de webhooks, usando o backbone ja endurecido.
3. Definir estrategia de longo prazo para OpenAPI: YAML canonico vs geracao automatica.
4. Definir SLOs e dashboards minimos.

### P3 — Backlog de maturidade

1. Vault / secrets management avancado.
2. Kubernetes / Terraform / GitOps.
3. Evolucao production-grade de ML.
4. Evolucao production-grade de SOC2.

---

## 4. Ordem Recomendada de Execucao

1. corrigir docs/exemplos sensiveis e limpar diagnosticos desatualizados;
2. remover `pipeline` residual do `turbo.json`;
3. endurecer headers de seguranca;
4. validar e corrigir coverage/reporting;
5. iniciar fatiamento de `server.ts`;
6. abrir trilha minima de tracing e dashboards.

---

## 5. Decisao Final

Leitura final do relatorio:

- **nao** deve ser seguido literalmente como estado atual do projeto;
- **deve** ser usado como auditoria historica parcialmente valida;
- o plano correto e corrigir primeiro os itens ainda vivos e desinflar os itens que ja foram superados.

Decisao executiva:

- `RELATORIO RECLASSIFICADO`
- `PLANO DE CORRECAO DEFINIDO`
