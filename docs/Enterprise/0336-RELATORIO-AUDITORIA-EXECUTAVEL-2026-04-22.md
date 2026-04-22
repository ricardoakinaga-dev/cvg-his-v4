# 0336 - RELATORIO DE AUDITORIA EXECUTAVEL - 2026-04-22

**Taxonomia:** `CANONICO`
**Papel no sistema documental:** auditoria executavel do estado real do programa contra a linha mestra de `docs/Enterprise`
**Ler em conjunto com:** `README.md`, `0334-PLANO-EXECUTIVO-REALINHAMENTO-ENTERPRISE-2026-04-17.md`, `0335-RELATORIO-AUDITORIA-EXTREMA-WORKSPACE-2026-04-19.md`, `100-ROADMAP-VISAO-GERAL.md`, `200-BACKLOG-MASTER.md`, `0100-EXECUTION-TRACKER.md`

**Data UTC:** `2026-04-22`
**Objetivo:** registrar uma leitura defensavel do estado executavel atual do programa, usando `docs/Enterprise` como fonte de verdade declarada e confrontando essa declaracao com codigo, migrations, gates, runtime e stack oficial em producao local
**Escopo da rodada:** governanca documental, aderencia do codigo a linha mestra, stack oficial `apps/spa + apps/api + apps/worker`, migrations ativas, contratos OpenAPI, rotas clinicas e gates operacionais

---

## 0. Atualizacao executiva de remediacao - 2026-04-22

Este relatorio capturou gaps reais do executavel na primeira leitura da data. Esses gaps foram tratados na propria rodada e nao permanecem mais abertos como debito operacional ativo.

Fechamentos aplicados depois da auditoria inicial:

- o trilho canonico de banco recebeu `0019_medical_records_rls.sql` e `0020_medical_records_integrity.sql`, fechando isolamento RLS e integridade cross-account do prontuario;
- o schema de prontuario permaneceu ancorado no trilho oficial `packages/db/migrations`, com `0018`, `0019` e `0020` aplicados no banco oficial;
- a SPA passou a tratar sessao orfa `404 Session not found` como expiracao de sessao e a alinhar o contrato de triagem para `items` ou `records`;
- o contrato frontend/backend ganhou cobertura para rotas financeiras novas em `frontend-backend-contract.test.ts`;
- o nome legado `cvg-his-v2-web` deixou de vazar como app name padrao no config compartilhado.

Gates reexecutados apos a remediacao:

- `pnpm typecheck` -> `PASS`
- `pnpm build` -> `PASS`
- `pnpm test:integration` -> `PASS` (`75 arquivos`, `886 testes`)
- `pnpm test:smoke` -> `PASS` (`13 passed`)
- `node scripts/validate-openapi.js` -> `PASS` (`175 paths`, `33 tags`, `178 schemas`)
- `node infra/scripts/check-cutover-readiness.mjs` -> `PASS`

Releitura consolidada apos remediacao:

| Indicador | Nota | Leitura |
|---|---:|---|
| Qualidade tecnica geral do programa | 84/100 | A base executavel ficou coerente com os contratos e com o trilho oficial de schema |
| Qualidade da documentacao como fonte de verdade confiavel hoje | 80/100 | A linha mestra ativa foi atualizada para refletir o estado real validado |
| Prontidao operacional real da versao atual | 86/100 | Stack oficial, gates e fluxos criticos auditados fecharam verdes na rodada |

As secoes seguintes preservam a fotografia da auditoria inicial; onde houver leitura negativa sobre os gaps acima, ela deve ser interpretada como achado historico desta data, nao como pendencia ainda aberta depois da remediacao.

---

## 1. Resumo executivo

Conclusao objetiva:

- o programa e amplo, real e tecnicamente acima da media;
- a plataforma executavel nao esta estruturalmente quebrada;
- a documentacao enterprise esta mais otimista do que o runtime efetivamente sustentava nesta data;
- o maior gap real entre documento e execucao apareceu em **migrations/schema**, **contratos SPA/API** e **confianca documental**.

Leitura consolidada:

| Indicador | Nota | Leitura |
|---|---:|---|
| Qualidade tecnica geral do programa | 78/100 | Base ampla, modular e operavel, com debitos reais de coerencia operacional |
| Qualidade da documentacao como fonte de verdade confiavel hoje | 62/100 | Rica e util, mas acima do estado executavel em pontos criticos |
| Prontidao operacional real da versao atual | 72/100 | Stack oficial responde e gates importantes passam, mas abaixo do que a linha mestra sugere |

---

## 2. Fonte de verdade usada nesta auditoria

Documentos principais usados como ancora:

1. `README.md`
2. `0334-PLANO-EXECUTIVO-REALINHAMENTO-ENTERPRISE-2026-04-17.md`
3. `0335-RELATORIO-AUDITORIA-EXTREMA-WORKSPACE-2026-04-19.md`
4. `100-ROADMAP-VISAO-GERAL.md`
5. `200-BACKLOG-MASTER.md`
6. `0100-EXECUTION-TRACKER.md`

Documentos tematicos de apoio usados como criterio:

- `001-BLUEPRINT-ENTERPRISE.md`
- `0195-POLITICA-ROTACAO-DE-SEGREDOS-E-CREDENCIAIS.md`
- `0325-CATALOGO-FEATURE-FLAGS-OPERACIONAL.md`
- `301-RISK-REGISTER.md`

---

## 3. Evidencia executavel usada

Arquivos e trilhas confrontados contra a documentacao:

- `package.json`
- `apps/api/src/openapi.yaml`
- `infra/helm/cvg-his-v2/*`
- `infra/observability/*`
- `packages/db/migrations/*`
- `packages/modules/*`
- `apps/spa/src/pages/*`
- `tests/integration/*`
- `tests/unit/*`

Stack oficial validada nesta rodada:

- `cvg-his-v2-cvg-his-v2-spa-1`
- `cvg-his-v2-cvg-his-v2-api-1`
- `cvg-his-v2-cvg-his-v2-worker-1`
- `cvg-his-v2-postgres-1`
- `cvg-his-v2-redis-1`

Endpoints validados em runtime:

- `GET http://127.0.0.1:3003/health` -> `200`
- `GET http://127.0.0.1:3003/ready` -> `200`
- `GET http://127.0.0.1:3002/` -> `200`
- `GET https://his.centroveterinarioguarapiranga.com/` -> `200`
- `GET /patients` autenticado -> `200`
- `GET /triage` autenticado -> `200`
- `GET /medical-records` autenticado -> `200`
- `GET /flags` autenticado -> `200`

Gates reexecutados nesta rodada:

- `node scripts/validate-openapi.js` -> `PASS` com `175 paths`
- `node infra/scripts/check-cutover-readiness.mjs` -> `PASS`
- `pnpm typecheck` -> `PASS`
- `pnpm build` -> `PASS`
- `pnpm test:integration` -> `PASS` com `75 arquivos` e `886 testes`
- `pnpm test:smoke` -> `PASS` com `13 passed`

Evidencia de schema ativo:

- `drizzle_migrations` confirma `0018_medical_records_v2`
- `drizzle_migrations` confirma `0019_medical_records_rls`
- `drizzle_migrations` confirma `0020_medical_records_integrity`
- RLS habilitado em `medical_records`, `clinical_entries`, `clinical_timeline` e `entry_revisions`
- triggers ativos `trg_medical_record_integrity`, `trg_clinical_entry_integrity`, `trg_clinical_timeline_integrity` e `trg_entry_revision_integrity`

---

## 4. Matriz de notas por eixo

| Item analisado | Nota | Leitura objetiva |
|---|---:|---|
| Governanca documental `docs/Enterprise` | 62 | Melhor referencia disponivel, mas com drift real frente ao executavel |
| Aderencia do codigo a linha mestra | 68 | Boa estrutura, aderencia irregular em pontos operacionais reais |
| Arquitetura modular | 89 | Monorepo forte, modular e bem fatiado por dominio |
| Frontend SPA | 76 | Superficie ampla e viva, com debitos recentes de contrato e carregamento |
| Backend API | 84 | Ampla, modular e funcional, com falhas reais ja encontradas em runtime |
| OpenAPI / contrato | 88 | Spec robusta e validada; consumo SPA ainda mostrou drift em rotas ativas |
| Autenticacao e sessao | 72 | Boa fundacao, mas com handling incorreto de sessao orfa na SPA |
| MFA / OIDC / WebAuthn | 83 | Superficie real em codigo, rotas e testes, com boa maturidade estrutural |
| Autorizacao RBAC / ABAC | 78 | Base robusta, mas com necessidade de endurecimento operacional recente |
| Multi-tenancy / RLS | 82 | Fundacao real e testada; ainda depende de disciplina continua de schema e runtime |
| Banco e disciplina de migrations | 58 | Principal fragilidade da auditoria; houve drift real no trilho canonico de schema |
| Pacientes / cadastro clinico | 74 | Existe e responde, mas foi impactado por erro de sessao no frontend |
| Triagem | 70 | Dominio real, mas rota viva quebrou por divergencia de contrato SPA/API |
| Prontuario clinico | 64 | Hoje esta estavel, mas exigiu correcao estrutural de migration e fallback |
| Agenda / scheduling | 82 | Area forte, com fluxo rapido e recomendacao inteligente reais |
| Financeiro / billing / cash / PIX | 81 | Superficie profunda, sem ruptura equivalente as areas clinicas nesta rodada |
| Fiscal / backoffice | 77 | Volume funcional bom, maturidade ainda abaixo da ambicao documental |
| Integracoes notificacoes `email/sms/whatsapp` | 79 | Codigo e testes existem; prova operacional ponta a ponta ainda e desigual |
| Integracoes `Google Calendar / equipment` | 76 | Superficie implementada e auditavel, mas menos consolidada do que os docs vendem |
| AI/ML aplicado | 71 | Ha features reais, mas a maturidade operacional ainda nao acompanha a narrativa |
| Observabilidade | 84 | Stack, health, readiness, Prometheus, OTel e alerts existem de fato |
| Plataforma / Helm / deploy | 85 | Trilho operacional bom, com guardrails reais e alinhados ao runtime atual |
| Seguranca / segredos | 73 | Politica e scanning existem; a operacao ainda depende fortemente de `env` |
| QA / gates / testes | 80 | Projeto tem disciplina de gates, mas bugs reais recentes reduzem confianca |
| Prontidao real de release hoje | 72 | Melhor do que a media, mas abaixo dos `84/100` e `90/100` declarados |

---

## 5. Achados criticos

### 5.1 Governanca documental acima do executavel

- `0335` ainda descrevia coexistencia com `apps/web`, mas o runtime oficial atual ja foi consolidado em `apps/spa`
- a linha mestra continua util, mas nao pode ser lida como espelho fiel do runtime sem revalidacao

### 5.2 Drift real entre migration canonica e schema exigido pelo modulo de prontuario

- o trilho ativo do projeto e `packages/db/migrations`
- o modulo de prontuario dependia de tabelas ausentes nesse trilho
- a correcao estrutural exigiu adicionar `0018_medical_records_v2.sql`
- isso reduz materialmente a nota de banco, migrations e prontidao de release

### 5.3 Drift real de contrato frontend/backend em rotas clinicas

- sessao orfa gerava `404 Session not found` na API e a SPA so tratava `401`
- triagem consumia `response.records`, enquanto o backend respondia `items`
- prontuario explodia com `500` antes do alinhamento de schema

### 5.4 Plataforma e observabilidade estao melhores do que o bloco clinico-operacional

- `validate:openapi` passa
- `deploy:check` passa
- `/health` e `/ready` respondem corretamente
- Helm, Prometheus, OTel e chart validation existem e estao alinhados

---

## 6. Leitura por area

### 6.1 O que esta forte

- arquitetura modular
- OpenAPI
- plataforma e Helm
- observabilidade
- base de seguranca e MFA
- financeiro/fiscal em volume de superficie

### 6.2 O que esta mediano

- frontend SPA
- autenticacao/sessao
- tenancy/RLS
- integracoes externas
- AI/ML aplicado

### 6.3 O que esta fraco

- confianca documental como espelho do estado real
- disciplina de migrations e alinhamento de schema
- robustez clinica ponta a ponta em pacientes, triagem e prontuario

---

## 7. Decisao executiva

O programa nao deve mais ser vendido documentalmente como se toda a ambicao enterprise ja estivesse comprovada em runtime.

Leitura defensavel desta data:

- a base e forte e real;
- o runtime oficial esta operacional;
- a governanca documental precisa ser rebaixada de "fonte plenamente confiavel" para "fonte principal, sujeita a revalidacao executavel";
- o proximo passo correto e transformar esta auditoria em checklist formal do `200-BACKLOG-MASTER.md`, com evidencia, debito, nota e status por requisito.

---

## 8. Proximo passo recomendado

Produzir uma auditoria formal item a item do `200-BACKLOG-MASTER.md`, com este formato minimo:

| Item | Nota | Status | Evidencia | Debito |
|---|---:|---|---|---|
| `ENT-001` | 0-100 | `cumpre` / `cumpre parcial` / `nao cumpre` | provas em codigo, testes, runtime e docs | gap objetivo restante |

Status aceitos:

- `cumpre`
- `cumpre parcial`
- `nao cumpre`

Esse checklist passa a ser o artefato correto para reancorar roadmap, tracker e release readiness ao estado executavel real.

---

## 9. Fechamento da rodada 2026-04-22

Status dos gaps materiais detectados nesta auditoria:

| Gap auditado | Status final | Evidencia objetiva |
|---|---|---|
| Drift entre modulo de prontuario e trilho canonico de migrations | `fechado` | `0018`, `0019` e `0020` no trilho oficial e aplicadas no banco |
| Falta de RLS e integridade cross-account no prontuario V2 | `fechado` | `tests/integration/rls/rls-medical-records.test.ts` verde (`14/14`) |
| Drift de sessao `404` vs `401` na SPA | `fechado` | suite `apps/spa/src/services/__tests__/api.test.ts` verde |
| Drift de contrato de triagem `records` vs `items` | `fechado` | suite `TriageListPage.test.ts` verde e rota autenticada `GET /triage` em `200` |
| Drift residual de rotas frontend/backend no financeiro | `fechado` | `tests/integration/frontend-backend-contract.test.ts` verde (`2/2`) |
| Resquicio legado `cvg-his-v2-web` em config compartilhado | `fechado` | default app name alterado para `cvg-his-v2-spa` |

Nao restou pendencia operacional aberta desta auditoria dentro do escopo executado nesta rodada. Qualquer proximo passo passa a ser evolucao adicional ou auditoria de novos requisitos, nao correcao de gap conhecido e reproduzido aqui.
