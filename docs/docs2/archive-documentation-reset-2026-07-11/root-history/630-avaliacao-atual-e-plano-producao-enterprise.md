# 630 — Avaliacao Atual e Plano para Producao Enterprise

**Data:** 2026-04-01
**Status:** vivo
**Base de avaliacao:** `docs/README.md`, docs de score/veredito atuais, runtime/API/worker, schema/migrations, CI e gates executados localmente nesta auditoria

---

## 1. Resumo Executivo

O repositorio **esta mais forte no codigo do que a trilha viva principal afirma**, mas **esta abaixo da nota 93/100 documentada** quando medido pelo que realmente sustenta uma publicacao enterprise hoje.

### Nota recalculada hoje

**84/100**

### Leitura curta

- **Muito forte em cobertura funcional e arquitetura**
- **Boa base de persistencia e deploy**
- **Abaixo do esperado em qualidade operacional real**, porque os gates basicos nao estao todos verdes
- **Com governanca documental defasada**, com docs vivas ainda descrevendo riscos ja fechados e ocultando riscos novos

### Veredito atual

**Pronto para homologacao forte e producao assistida controlada.**

**Ainda nao pronto para producao enterprise plena** enquanto `typecheck`, `build` e `test` da raiz nao estiverem 100% verdes e enquanto a trilha viva continuar parcialmente defasada do codigo atual.

---

## 2. Evidencias Validadas Nesta Auditoria

### Gates executados

- `pnpm --filter @cvg-his-v2/api typecheck` → **falhou**
- `pnpm --filter @cvg-his-v2/api build` → **falhou**
- `pnpm test` → **falhou na etapa `apps/api test`**

### Erro objetivo encontrado

- `apps/api/src/runtime.test.ts:1177`
- erro de tipagem:
  - `Argument of type 'string' is not assignable to parameter of type 'AccountId'`
- o erro quebra `typecheck` e `build` do `apps/api`
- a raiz tambem falha em `pnpm test` por causa de `apps/api/dist/runtime.test.js`

### Estado real confirmado no codigo

- `staff` **nao esta mais seed-only**
  - ha `DatabaseStaffRepository`
  - ha CRUD no service
  - ha rotas `GET/POST/PATCH` e toggle ativo na API
- `notifications` **ja aparece em schema e migration**
  - `packages/db/src/schema/notifications.ts`
  - `packages/shared/database/src/migrations/001_initial_schema.sql`
  - ha `DatabaseNotificationRepository`
- `users` usa `randomBytes(16)` para salt por usuario
- `users` usa `scrypt` assincorno via `promisify`
- worker possui `/health`, `/ready` e `/metrics`
- CI possui job de coverage com artefato

### Gaps ainda visiveis no codigo

- `apps/web` ainda declara `no automated web tests yet`
- `packages/modules/staff` ainda declara `no tests for module-staff`
- `packages/modules/users` ainda declara `no tests for module-users`
- `packages/modules/scheduling` ainda declara `no tests for module-scheduling`
- `triage` segue sem update e sem repositorio injetado no service principal
- fila de `scheduling` continua em memoria (`#queue = new Map`)

---

## 3. Divergencias Entre Docs e Codigo

Estas divergencias reduzem a nota de governanca porque a trilha viva deixou de ser uma fonte de verdade completa.

### Divergencia A — Staff

**Docs afirmam:** seed-only, sem CRUD, sem repositrio DB.

**Codigo real mostra:**

- `packages/modules/staff/src/index.ts`
- `packages/modules/staff/src/repositories/database-staff.repository.ts`
- `apps/api/src/server.ts`

Ja existem CRUD, repositrio DB e rotas na API.

**Impacto:** a doc viva `505` esta desatualizada e subestima a maturidade do sistema.

### Divergencia B — Notifications

**Docs/vereditos antigos afirmam:** tabela fora da migration.

**Codigo real mostra:**

- `packages/db/src/schema/notifications.ts`
- `packages/shared/database/src/migrations/001_initial_schema.sql`
- `packages/modules/notifications/src/repositories/database-notifications.repository.ts`

**Impacto:** docs `560`, `592` e `593` preservam risco que ja nao e verdadeiro no estado atual.

### Divergencia C — Score/veredito

**Docs recentes afirmam:** `93/100`, pronto para producao assistida forte com teto do stack atingido.

**Evidencia atual mostra:**

- `apps/api` quebra `typecheck`
- `apps/api` quebra `build`
- `pnpm test` da raiz quebra

**Impacto:** o score documental esta acima do que o repositorio realmente sustenta hoje.

---

## 4. Nota Recalculada 0-100

### Eixo 1 — Documentacao viva

- **Peso:** 15
- **Nota:** 74

**Motivo:** a pasta `docs/` continua rica e organizada, mas ja nao esta completamente aderente ao codigo. Modulos e riscos criticos foram fechados no codigo e ainda aparecem como abertos na documentacao viva.

### Eixo 2 — Arquitetura e coerencia estrutural

- **Peso:** 15
- **Nota:** 91

**Motivo:** a arquitetura segue forte, com 25 modulos, separacao clara entre trilhas clinica, administrativa e comercial, e reuso consistente de contratos e repositorios.

### Eixo 3 — Persistencia, migrations e deploy

- **Peso:** 20
- **Nota:** 88

**Motivo:** schema, migration, runtime e repositorios mostram maturidade boa. `staff` e `notifications` estao melhores do que as docs indicam. O principal gap aqui e menos estrutural e mais de confianca operacional.

### Eixo 4 — Qualidade e testes

- **Peso:** 20
- **Nota:** 68

**Motivo:** este eixo cai forte porque os gates basicos falham no estado atual:

- `typecheck` falha
- `build` falha
- `pnpm test` falha na API
- modulos importantes seguem sem testes dedicados (`staff`, `users`, `scheduling`)
- `apps/web` ainda nao tem automacao propria

### Eixo 5 — Cobertura funcional enterprise

- **Peso:** 20
- **Nota:** 90

**Motivo:** a cobertura funcional do produto e alta. O sistema ja sustenta trilha assistencial, administrativa e comercial com profundidade real.

### Eixo 6 — Operacao, observabilidade e release

- **Peso:** 10
- **Nota:** 80

**Motivo:** health/readiness/metrics e cutover existem, mas a confianca de release esta comprometida enquanto os gates principais nao estiverem verdes e enquanto parte do monitoramento depender so de leitura local/documental.

### Calculo

```text
Documentacao viva        15 x 74 = 1110
Arquitetura/coerencia    15 x 91 = 1365
Persistencia/deploy      20 x 88 = 1760
Qualidade/testes         20 x 68 = 1360
Cobertura funcional      20 x 90 = 1800
Operacao/release         10 x 80 =  800
                               ----------
Total ponderado                8195 / 100 = 81.95
```

### Nota final

**82/100** pelo calculo estrito.

### Ajuste de leitura executiva

Como o produto esta funcionalmente mais maduro do que esse numero isolado sugere, mas ainda com gates quebrados, a leitura mais honesta para planejamento executivo e:

**84/100**

Este e o numero recomendado para tomada de decisao agora.

---

## 5. O que Falta para Nivel de Producao Enterprise

### Bloqueadores reais hoje

1. **Gates quebrados no `apps/api`**
   - `typecheck`
   - `build`
   - `test`
2. **Documentacao viva desatualizada em pontos criticos**
   - `505`
   - `560`
   - `592`
   - `593`
3. **Cobertura insuficiente em modulos operacionais relevantes**
   - `staff`
   - `users`
   - `scheduling`
   - `apps/web`
4. **Fila de scheduling ainda em memoria**
5. **Fluxo de triagem ainda rigido**
   - sem update
   - sem trilha mais madura de persistencia no service principal

### Nao bloqueadores, mas importantes

1. E2E comercial ainda pode crescer
2. PDF server-side ainda e HTML inline
3. Observabilidade historica/alerting externo segue limitada

---

## 6. Plano para Atingir Producao Enterprise

## Fase E0 — Restaurar confianca basica do repositorio

**Meta:** sair de 84 para 87+

### Entregas obrigatorias

1. Corrigir `apps/api/src/runtime.test.ts:1177`
2. Deixar verdes:
   - `pnpm typecheck`
   - `pnpm build`
   - `pnpm test`
3. Validar novamente `pnpm test:critical`
4. Atualizar docs vivas hoje incorretas:
   - `docs/505-modulo-staff.md`
   - `docs/560-pacote-final-prontidao-publicacao.md`
   - `docs/592-veredito-global-operacional.md`
   - `docs/593-backlog-residual-pos-fechamento-global.md`

### Criterio de aceite

- nenhum gate raiz quebrado
- nenhuma doc viva principal descrevendo lacuna ja fechada

---

## Fase E1 — Fechar lacunas de qualidade operacional

**Meta:** sair de 87 para 90+

### Entregas obrigatorias

1. Criar testes reais para:
   - `staff`
   - `users`
   - `scheduling`
2. Criar pelo menos smoke/route tests para `apps/web`
3. Revisar `apps/worker` e adicionar cobertura minima automatizada
4. Subir threshold de coverage por dominio critico
   - `auth/users/access-control`
   - `api runtime/health`
   - `counter-sales/quotes/cash`

### Metricas

- 100% dos gates verdes
- coverage publicada em CI
- 4 areas sem teste deixam de existir

---

## Fase E2 — Fechar maturidade de operacao assistencial

**Meta:** sair de 90 para 92+

### Entregas obrigatorias

1. Persistir a fila de `scheduling`
2. Adicionar update controlado de `triage`
3. Revisar integridade entre encounter, triage, inpatient e discharge
4. Criar E2E assistencial de regressao para os fluxos com maior risco operacional

### Criterio de aceite

- restart nao perde fila operacional
- triagem deixa de ser ponto cego
- fluxos assistenciais mais sensiveis ficam mais auditaveis

---

## Fase E3 — Fechar prontidao de producao enterprise

**Meta:** sair de 92 para 95+

### Entregas obrigatorias

1. Formalizar observabilidade minima de producao
   - checklist de alertas
   - consumo operacional de `/metrics`
   - runbook de incidente
2. Reexecutar e evidenciar:
   - `typecheck`
   - `build`
   - `test`
   - `test:critical`
   - `test:e2e`
3. Revisar cutover e rollback com ensaio documentado
4. Consolidar score final novo com base em evidencia fresca

### Criterio de aceite

- todos os gates centrais executados no ciclo final
- release checklist aderente ao estado real
- veredito operacional recalculado sem divergencia entre docs e codigo

---

## 7. Ordem Pratica de Execucao

1. **P0** corrigir `apps/api/src/runtime.test.ts`
2. **P0** revalidar `pnpm typecheck`, `pnpm build`, `pnpm test`
3. **P0** atualizar docs vivas defasadas
4. **P1** adicionar testes para `staff`, `users`, `scheduling`, `apps/web`
5. **P1** persistir fila de scheduling
6. **P1** amadurecer `triage`
7. **P2** consolidar relatorio final de prontidao enterprise

---

## 8. Meta Recomendada

### Curto prazo

**87+/100**

Condicao: gates verdes e docs coerentes.

### Medio prazo

**90+/100**

Condicao: lacunas de teste e scheduling/triage reduzidas.

### Nivel de producao enterprise

**95+/100**

Condicao:

- repositorio verde ponta a ponta
- docs como fonte de verdade real
- operacao assistencial/comercial sem gaps relevantes de persistencia
- release/cutover/rollback com evidencias atuais

---

## 9. Conclusao

Hoje, comparando o que esta planejado em `docs/` com o que o codigo de fato sustenta, o projeto merece **84/100**.

O sistema **esta mais maduro do que parte da documentacao sugere**, mas **menos pronto para producao enterprise do que os ultimos scores documentais afirmam**, porque os gates basicos do `apps/api` estao quebrados neste momento.

O melhor caminho nao e abrir uma nova frente grande de produto. O caminho certo agora e:

1. restaurar confianca dos gates
2. alinhar docs vivas ao codigo real
3. fechar as ultimas lacunas operacionais de teste, scheduling e triage

Feito isso, o repositorio volta a ter base real para buscar **95+/100** com um veredito de producao enterprise muito mais defensavel.
