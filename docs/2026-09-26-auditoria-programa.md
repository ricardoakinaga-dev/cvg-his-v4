---
document_status: historical
document_kind: baseline
effective_date: 2026-09-26
owner: Liderança técnica CVG-HIS
review_cycle: none
superseded_by: docs/2026-09-26-auditoria-completa-sistema.md
---

# Auditoria do programa — CVG-HIS V4

**Data:** 26 de setembro de 2026
**Objeto:** workspace local `/home/ricardo/cvg-his-v4` (HEAD `ad2f0373` + 185 arquivos modificados e 482 não rastreados, não commitados)
**Nota geral:** **69/100** (média ponderada 68,67)
**Parecer:** sistema funcionalmente amplo, com base técnica sólida (tipagem, testes, multi-tenant com RLS), mas **não apto para produção hospitalar** enquanto não forem corrigidos os defeitos de pagamentos, LGPD, anexos, MFA e fiscal descritos abaixo.

> A nota mede maturidade demonstrada, não "percentual pronto". Uma média alta não compensa um defeito grave: os itens marcados como **bloqueantes** precisam de correção individual independentemente da nota geral.

---

## 1. Método

1. **Execução real dos gates** (Node 22.23.2, pnpm 10.33.0), nesta sessão.
2. **Inspeção de código** dos caminhos críticos (auth, pagamentos, anexos, LGPD, fiscal, notificações, auditoria, worker, Helm), com verificação manual de cada achado da auditoria de 25/09 em vez de reaproveitá-lo.
3. **Métricas estáticas**: tamanho, complexidade, avisos, cobertura existente, estado do Git.

Não foram executados nesta rodada: E2E Playwright, suíte de integração com PostgreSQL (`test:critical`), carga, restore real e CI remoto. Onde a nota depende disso, está indicado.

### Resultados executados

| Gate | Resultado |
|---|---|
| `pnpm typecheck` | ✅ passou (0 erros) |
| `pnpm lint` | ✅ 0 erros, **161 avisos** (event-bus 44, SPA 32, notifications 25, api 17) |
| `pnpm test:root` | ✅ **3.149 passaram**, 3 skipped (302 arquivos, 280 s) |
| Testes SPA | ✅ **1.959/1.959** (240 arquivos) |
| `pnpm audit --prod` | ✅ nenhuma vulnerabilidade conhecida |
| `validate:rls` | ✅ 171/172 tabelas tenant protegidas (1 exceção documentada) |
| `validate:openapi` | ✅ 431 paths, 527 schemas, estrutura válida |
| `complexity:check` | ✅ dentro do orçamento declarado |
| Cobertura (último `coverage-final.json`, 25/09 23:21, recorte de 176 arquivos) | 87,3% statements · 82,1% branches · 89,5% funções |

### Números do repositório

| Métrica | Valor |
|---|---|
| Módulos de domínio | 46 (`packages/modules/*`) |
| Código-fonte (sem testes) | API ~60 mil linhas · SPA ~131 mil · módulos ~81 mil · worker ~9 mil |
| Migrações SQL | 183 (82 habilitam RLS; 54 ocorrências de `FORCE ROW LEVEL SECURITY`) |
| Arquivos mais extensos | `PatientDetailPage.vue` 4.007 linhas · `server.ts` 3.473 · `MedicalRecordsDetailPage.vue` 3.002 · `DashboardPage.vue` 2.860 · `AppLayout.vue` 2.803 |
| Estado Git | 79 commits locais **não enviados** para `origin/main`; 185 modificados + 482 não rastreados |
| Volume fora do Git | `docs/` 2,4 GB (18.355 arquivos), `artifacts/` 54 GB |

---

## 2. Quadro de notas

| # | Item analisado | Nota | Peso | Resumo |
|---|---|---:|---:|---|
| 1 | Arquitetura e modularidade | **76** | 4 | Monorepo bem fatiado; composição e telas concentradas em arquivos gigantes. |
| 2 | Qualidade de código e manutenibilidade | **70** | 4 | TS estrito, quase sem `any`; 161 avisos e arquivos de 3–4 mil linhas. |
| 3 | Build, tipagem e dependências | **90** | 3 | Typecheck limpo, audit limpo, overrides de segurança ativos. |
| 4 | Testes automatizados | **82** | 6 | 5.108 testes verdes; E2E/integração não reexecutados nesta rodada. |
| 5 | API e contratos (OpenAPI) | **82** | 4 | 431 paths validados; `server.ts` monolítico. |
| 6 | Banco, migrações e multi-tenant (RLS) | **87** | 6 | RLS 171/172, FORCE RLS, fail-closed sem DATABASE_URL em produção. |
| 7 | Autenticação, MFA e sessão | **68** | 6 | Sessão bem feita; **MFA voluntário ignorado no login** (bloqueante). |
| 8 | Autorização e segurança aplicacional | **84** | 6 | CORS/CSRF, headers, cookie HttpOnly/SameSite, sem `v-html`. |
| 9 | Módulos clínicos (prontuário, internação, prescrição) | **74** | 7 | Fluxos completos; **sem checagem de alergia/dose** na prescrição. |
| 10 | Agenda, recepção e notificações | **55** | 4 | Lembrete WhatsApp é fire-and-forget, sem outbox nem retry. |
| 11 | Faturamento, caixa e estoque | **78** | 5 | Regras e persistência testadas; homologação real pendente. |
| 12 | Pagamentos (Pix e cartão) | **45** | 6 | **Pix sem idempotência**; Pix por atendimento só com provedor sintético (bloqueante). |
| 13 | Fiscal / NFS-e | **38** | 3 | Guard de startup incoerente com o emissor; sem assinatura XML (bloqueante). |
| 14 | Anexos e armazenamento | **60** | 4 | **Compensação pode apagar arquivo já confirmado** (bloqueante). |
| 15 | LGPD e privacidade | **45** | 5 | **Exclusão/anonimização marcada como concluída sem efeito** (bloqueante). |
| 16 | Trilha de auditoria | **75** | 3 | Imutável no banco via trigger; persistência assíncrona e cache sem limite. |
| 17 | Worker, eventos e outbox | **74** | 4 | Claims/leases corretos; readiness não detecta loop travado. |
| 18 | Frontend, UX e acessibilidade | **76** | 5 | 1.959 testes, axe no E2E; páginas monolíticas. |
| 19 | Observabilidade e alertas | **58** | 4 | 22 regras Prometheus sem destino de entrega configurado. |
| 20 | Deploy, infraestrutura e backup | **62** | 5 | Helm/Compose sólidos; restore real e RPO/RTO não demonstrados. |
| 21 | CI/CD e processo de release | **55** | 3 | Pipeline rico, mas 79 commits não enviados e árvore suja há dias. |
| 22 | Documentação e governança | **58** | 3 | Governança explícita, porém volume e churn excessivos. |
| | **Nota geral ponderada** | **69** | 100 | Σ(nota × peso)/100 = 68,67 |

Faixas de leitura: **85+** maduro · **70–84** bom com ressalvas · **55–69** lacunas relevantes · **< 55** insuficiente para produção.

---

## 3. Análise detalhada por item

### 1. Arquitetura e modularidade — 76/100
**Pontos fortes:** separação clara `apps/{api,spa,worker}` + 46 módulos de domínio + pacotes transversais (`db`, `rbac`, `tenant-context`, `contracts`, `security`). Fronteiras de namespace validadas por script (`validate:namespaces`). Repositórios com implementação em memória e em banco, permitindo testes rápidos.
**Pontos fracos:** composição concentrada em `apps/api/src/server.ts` (3.473 linhas) e `runtime.ts` (1.532); vários módulos guardam estado em `Map` de instância mesmo quando há repositório (ex.: `scheduling/src/index.ts:549-552`), o que é frágil com múltiplas réplicas.

### 2. Qualidade de código e manutenibilidade — 70/100
**Fortes:** TypeScript estrito; só 10 arquivos de produção com `any`, 1 `@ts-expect-error`, 9 `eslint-disable`, 0 TODO/FIXME, 7 `console.log`.
**Fracos:** 161 avisos de lint tolerados (44 só no event-bus); cinco componentes Vue acima de 2.800 linhas (`PatientDetailPage.vue` com 4.007) — difíceis de revisar e testar; código morto: `BruteForceProtection` é importado em `apps/api/src/runtime.ts:10` mas nunca instanciado (a proteção efetiva vem do rate limiter, ver item 7).

### 3. Build, tipagem e dependências — 90/100
Typecheck de todos os pacotes passou; `pnpm audit --prod` sem vulnerabilidades; lockfile versionado; `overrides` fixando versões corrigidas (protobufjs, undici, vite etc.); Renovate configurado; Node fixado em `engines`. Desconto: o shell padrão usa Node 24, diferente do exigido (22.23.2) — risco de "funciona na minha máquina".

### 4. Testes automatizados — 82/100
5.108 testes unitários/contrato verdes nesta rodada (3.149 root + 1.959 SPA), apenas 3 skips e 31 pontos de `skip/skipIf` no repositório, governados por `validate:test-skips`. Cobertura do último recorte: 87% statements / 82% branches, com pontos fracos em `api-keys` (74%), `staff` (74%), `db` (74%) e `commercial` (77%).
**Desconto:** E2E Playwright e integração PostgreSQL não foram reexecutados hoje; a cobertura disponível é de um recorte de 176 arquivos, não do monorepo inteiro. Os defeitos dos itens 7, 12, 14 e 15 passam com a suíte verde, ou seja, faltam testes negativos nesses caminhos.

### 5. API e contratos — 82/100
OpenAPI com 431 paths e 527 schemas, validado estruturalmente; testes de contrato de rotas. Desconto por concentração em `server.ts` e rotas muito longas (`reports-routes.ts` 1.859 linhas, `laboratory-routes.ts` 1.639).

### 6. Banco de dados, migrações e multi-tenant — 87/100
183 migrações sequenciais com verificação de integridade (`migration-integrity.ts`), preflight e reconciliação de roles de runtime. RLS em 171 de 172 tabelas tenant, com `FORCE ROW LEVEL SECURITY`. A API **recusa subir em produção sem `DATABASE_URL`** (`apps/api/src/bootstrap.ts:1149`). Triggers de imutabilidade para auditoria e evidência clínica (migração 0177).
Desconto: upgrade a partir da última release e restore sobre banco externo não demonstrados.

### 7. Autenticação, MFA e sessão — 68/100 · ⚠️ bloqueante
**Fortes:** access token só em memória no SPA e refresh em cookie `HttpOnly; SameSite=Strict` (`auth-routes.ts:440`); desafio MFA assinado, com TTL, limite de tentativas e repositório persistente; mensagens de erro genéricas que não revelam existência de usuário; rate limit por IP **e** por identidade (`auth-routes.ts:611-620`), com Redis obrigatório em produção.
**Defeito confirmado:** o login só pede MFA se o usuário tiver papel `admin`, `finance` ou `auditor` (`packages/modules/auth/src/index.ts:195`, `mfa/src/service.ts:40,73`). Um veterinário que **ativou MFA voluntariamente** entra só com a senha — a proteção que o usuário acredita ter não existe.
**Menor:** auditoria de login anônimo gravada no tenant fixo `acc_cvg_demo` (`auth/src/index.ts:153,175`), misturando eventos de clientes diferentes.

### 8. Autorização e segurança aplicacional — 84/100
CORS por lista, CSRF por origem, headers de segurança (`http/security-headers.ts` e nginx do Helm), RBAC dedicado, isolamento por tenant verificado por testes RLS, nenhum `v-html` no SPA, scanner de anexos ClamAV em produção, validação de magic bytes. Secretlint e Semgrep no CI; `.env` e `.env.v2` corretamente fora do Git.
Desconto: storage S3/scanner e enforcement externo não homologados no alvo.

### 9. Módulos clínicos — 74/100
Prontuário, internação, cirurgia, alta, prescrição e execução de medicação implementados com persistência, revisões e testes de jornada.
**Lacuna de segurança do paciente:** o módulo de prescrição não cruza alergias registradas do paciente nem valida dose por peso/espécie ou interações (`packages/modules/prescriptions/src/index.ts` só usa o peso para impressão, linha 621). Em um HIS, isso é suporte à decisão clínica esperado. Telas clínicas monolíticas (3–4 mil linhas) aumentam risco de regressão. UAT com equipe clínica não realizada.

### 10. Agenda, recepção e notificações — 55/100
Agenda, fila e transferências funcionam e são testadas.
**Defeito confirmado:** o "lembrete" de WhatsApp é disparado no momento do agendamento, com `void appointmentReminderWorkflow.onAppointmentScheduled(...)` (`apps/api/src/runtime.ts:503`) — sem outbox, sem retry e sem agendamento relativo à data da consulta. Se o provedor falhar ou o processo reiniciar, a mensagem é perdida e só fica um registro de auditoria. Configurações de canal e nome da clínica têm implementações em memória (`notifications-whatsapp/src/index.ts:195,324`).

### 11. Faturamento, caixa e estoque — 78/100
Faturamento, caixa, venda de balcão, comissões e estoque com regras de negócio, persistência e testes (cobertura 81–85%). Pendentes: fechamento conciliado com provedores reais e aceite com dados de migração.

### 12. Pagamentos (Pix e cartão) — 45/100 · ⚠️ bloqueante
**Cartão:** trilha durável com classificador autoritativo e chave de idempotência (`payment-gateway.ts:519-555`) — bom.
**Pix direto (Pagar.me):** `createPixIntent` (`apps/api/src/payment-gateway.ts:408-436`) chama o provedor **sem chave de idempotência** e só persiste **depois** da resposta. Um retry do cliente ou timeout gera cobrança duplicada; uma falha do banco após a chamada deixa uma cobrança órfã no provedor. Há também um `Map` em memória de intents (`#pixIntents`).
**Pix vinculado ao atendimento:** o dispatcher do worker só existe com o provedor sintético `LocalPixPaymentDispatchProvider` (`apps/worker/src/bootstrap.ts:273-280`). É corretamente bloqueado fora de ambiente sintético, mas significa que **não há Pix real por atendimento**.

### 13. Fiscal / NFS-e — 38/100 · ⚠️ bloqueante
Ciclo de documento, cálculo de tributos e tabela CFOP existem.
**Defeito confirmado:** o verificador de startup aceita configuração **apenas com certificado** (`apps/api/src/server.ts:583`: `!nfseApiKey && !nfseCertificate`), mas o emissor rejeita exatamente esse caso (`packages/modules/fiscal/src/nfse-emitter.ts:389-392`: "PFX certificate signing is unavailable"). O sistema sobe "saudável" e falha na primeira emissão. Não há assinatura XML com e-CNPJ, que o padrão ABRASF exige na maioria dos municípios. Sem homologação em nenhum município.

### 14. Anexos e armazenamento — 60/100 · ⚠️ bloqueante
Validação de metadados, magic bytes, limite de tamanho, checksum, chave com escopo de tenant e scanner — bons controles.
**Defeito confirmado:** a chave de armazenamento é determinística (`conta/entidade/sha256[0..12]_nome`, `file-storage.ts:147,365`). Se o mesmo arquivo for reenviado para a mesma entidade e o `repository.create` falhar, a compensação (`attachments/src/index.ts:508-511`) **apaga o objeto que já pertence ao anexo anterior**, deixando um registro confirmado apontando para um arquivo inexistente — perda de documento clínico.
**Menor:** `this.#attachments.unshift(attachment)` (`index.ts:516`) acumula todos os uploads em memória mesmo com repositório.

### 15. LGPD e privacidade — 45/100 · ⚠️ bloqueante
Consentimentos, exportação de dados por provedor e política de retenção por tipo de dado existem.
**Defeito confirmado:** `completeDsrRequest` (`packages/modules/lgpd/src/service.ts:336-357`) marca a solicitação como `completed` com base em `buildErasureDisposition` (linhas 435-460), que só **descreve** um plano ("anonimização ... fica condicionada ao fim da janela legal"). Não há job no worker que execute a anonimização depois. A revogação de consentimento apenas lista candidatos (linhas 477-486), sem revogar. Também não há validação de transição de estado — uma solicitação rejeitada pode ser "concluída". Isso gera evidência de cumprimento sem o efeito, o que é pior do que uma pendência visível.

### 16. Trilha de auditoria — 75/100
Linhas imutáveis no banco (triggers `audit_events_immutable_rows` e `_truncate`), correlação por request, cache recarregado do banco após rollback.
Riscos: `write()` é síncrono e a persistência é assíncrona em filas (`audit/src/index.ts:255-305`) — só 6 chamadas usam `writeAndWait`; se o banco falhar fora de transação, o erro é guardado e o evento pode se perder. O cache `#events` cresce sem limite no processo (linha 272).

### 17. Worker, eventos e outbox — 74/100
Consumidores duráveis, leases, retries, guarda de entrega e conta limitada de contas por ciclo. Readiness exige banco, consumidores e executores.
Lacuna: o readiness não considera a idade de `lastTickAt` (`apps/worker/src/health.ts:65-75`); um loop travado sem erro continua "ready" e não é reiniciado pelo orquestrador.

### 18. Frontend, UX e acessibilidade — 76/100
1.959 testes de componentes verdes, testes axe no Playwright, fluxo de recuperação de chunk, PWA. A última execução Playwright local registrada passou.
Descontos: páginas monolíticas (5 acima de 2.800 linhas); falha do fechamento do menu compacto observada em 25/09 e não reverificada; E2E não reexecutado hoje.

### 19. Observabilidade e alertas — 58/100
OpenTelemetry (tracing), métricas Prometheus, dashboard Grafana e 22 regras de alerta.
Lacunas: não há Alertmanager/receivers configurados em `infra/observability` nem no Helm — os alertas não chegam a ninguém; retenção de traces remota não definida; readiness do worker (item 17) não alimenta alerta de estagnação.

### 20. Deploy, infraestrutura e backup — 62/100
Dockerfiles não-root com sistema de arquivos somente leitura, Helm com schema de valores, `existingSecret` obrigatório em produção, job de migração como hook pre-install/upgrade restrito a banco externo, PDBs, scripts de backup/restore e drills com fixture.
Lacunas: restore real com PostgreSQL gerenciado + S3, RPO/RTO medidos, deploy em namespace limpo e upgrade a partir de release anterior não demonstrados.

### 21. CI/CD e processo de release — 55/100
`ci.yml` com ~1.960 linhas cobrindo typecheck, lint, SAST, secret-scan, OpenAPI, contratos, integração, cobertura crítica, visual e auditoria de dependências; workflows de soak, game-day e performance.
Problema de processo: **79 commits locais não enviados** (`origin/main` parado em 21/09) e **667 alterações não commitadas** há dias. Nada disso foi validado pelo CI remoto, e a identidade do que está sendo testado não é reproduzível por outra pessoa. É o maior risco operacional que não aparece no código.

### 22. Documentação e governança — 58/100
README claro sobre a fonte de verdade de deploy; ADRs, runbooks, SOC2, régua de qualidade e validadores de documentação.
Excesso: 18.355 arquivos e 2,4 GB em `docs/`, 54 GB em `artifacts/`, 21 revisões de inventário do mesmo dia em `.agent/evidence/` e 157 scripts, muitos só para gerar e validar evidências. O custo de manutenção da governança compete com a correção dos defeitos reais; os bloqueantes deste relatório já estavam descritos em 25/09 e continuam presentes.

---

## 4. Achados bloqueantes (ordem de prioridade)

| # | Achado | Local | Impacto | Correção sugerida |
|---|---|---|---|---|
| B1 | Pix direto sem idempotência e persistido após o provedor | `apps/api/src/payment-gateway.ts:408` | Cobrança duplicada ou órfã | Gravar tentativa `pending` antes; enviar `Idempotency-Key` derivada do id da tentativa; reconciliar órfãos |
| B2 | DSR de exclusão/anonimização concluída sem efeito | `packages/modules/lgpd/src/service.ts:336` | Descumprimento da LGPD com evidência falsa de cumprimento | Estado `scheduled`; job no worker que anonimiza e só então marca `completed`; validar transições |
| B3 | Compensação de upload apaga arquivo de anexo existente | `packages/modules/attachments/src/index.ts:508` | Perda de documento clínico | Chave única por upload (id do anexo) ou checar referência antes de apagar |
| B4 | MFA voluntário ignorado no login | `packages/modules/auth/src/index.ts:195` | Falsa sensação de segurança | `isMfaRequired(roles) \|\| isMfaActive(user)` |
| B5 | Startup aceita NFS-e só com certificado; emissor recusa | `apps/api/src/server.ts:583` × `nfse-emitter.ts:389` | Emissão fiscal falha em produção | Alinhar guard ao emissor e implementar assinatura XML ou exigir API key |
| B6 | Sincronizar repositório | Git | Nada do trabalho recente passou pelo CI remoto | Commitar, enviar e rodar o CI completo |

## 5. Achados importantes (não bloqueantes)

1. Lembretes WhatsApp sem outbox/retry e enviados no agendamento, não antes da consulta (`runtime.ts:503`).
2. Prescrição sem checagem de alergia, dose por peso e interações.
3. Readiness do worker não detecta estagnação (`worker/src/health.ts:65`).
4. Alertas sem destino de entrega.
5. Caches em memória sem limite (auditoria, anexos) em processos de longa duração.
6. Auditoria de login anônimo gravada no tenant `acc_cvg_demo`.
7. `BruteForceProtection` morto; remover ou ligar.
8. Quebrar `server.ts` e as cinco maiores páginas Vue.
9. Zerar os 161 avisos de lint, começando pelo event-bus.
10. Podar `docs/`, `artifacts/` e o histórico de inventários em `.agent/evidence/`.

## 6. Comparação com a auditoria de 25/09

O código-fonte **não mudou** desde a auditoria anterior (mesmo HEAD; só arquivos de evidência foram tocados). Esta rodada reexecutou os gates e reverificou os achados diretamente no código. Todos os bloqueantes de 25/09 foram **confirmados**. Os achados novos desta rodada são: ausência de suporte à decisão clínica na prescrição, caches sem limite, auditoria anônima no tenant demo, `BruteForceProtection` sem uso e os 79 commits não enviados. A nota geral coincide (**69**), apesar de o recorte de itens ser diferente — um sinal de que a avaliação é estável.

## 7. Conclusão

O CVG-HIS V4 tem uma base de engenharia acima da média: tipagem limpa, mais de 5 mil testes verdes, multi-tenant com RLS forçado, guards de produção fail-closed e contratos de API validados. O que impede a produção não é a falta de funcionalidade, e sim um conjunto pequeno e bem localizado de defeitos de integridade (pagamento, LGPD, anexos, MFA, fiscal), além de um processo de release em que o código recente não chegou ao CI remoto. Corrigindo B1–B6 com testes de regressão negativos, a nota estimada sobe para a faixa de **78–80**. O passo seguinte seria homologação externa (provedores, restore, UAT clínica).

---

## 8. Correções aplicadas (26/09, mesma sessão)

| Achado | Correção | Regressão |
|---|---|---|
| B1 Pix | `POST /payments/pix/intents` exige `Idempotency-Key` em runtime production-like; o gateway envia ao Pagar.me uma chave derivada `sha256(conta + chave)` e reaproveita o registro persistido quando o provedor devolve a mesma cobrança (recusa cobrança de outra conta). O SPA envia a chave; o OpenAPI documenta o header. | `payment-gateway.test.ts`, `payments-routes.test.ts`, `pix.test.ts` (SPA) |
| B2 LGPD | Exclusão e anonimização só são concluídas com evidência de um `erasureExecutor`; sem ele, a API responde 409 `DSR_ERASURE_EXECUTOR_UNAVAILABLE`. A revogação de consentimento revoga de fato. Solicitações fechadas não mudam de estado (409 `DSR_NOT_OPEN`). O `resultJson` enviado pelo cliente não substitui efeitos. | `lgpd.test.ts` (4 casos novos) |
| B3 Anexos | A limpeza só apaga o objeto se nenhum anexo confirmado o referenciar; se a checagem falhar, o objeto é preservado. O cache em memória só é usado sem repositório. | `attachments.test.ts` |
| B4 MFA | O login exige o segundo fator para papéis críticos **e** para quem ativou MFA voluntariamente. | `auth.test.ts` |
| B5 NFS-e | O guard de produção exige `NFSE_API_KEY`; configuração só com certificado é recusada no startup, como o emissor já fazia. | `production-provider-readiness.test.ts` |
| Worker | Readiness e liveness (HTTP 503) detectam loop sem tick concluído (`WORKER_LOOP_STALLED_AFTER_MS`, padrão `max(10×intervalo, 15 min)`), para o orquestrador reiniciar o pod. | `health.test.ts` (worker) |
| Auditoria | Cache em memória limitado a 50 mil eventos quando há repositório durável. | `audit.test.ts` |
| Limpeza | Removido o import não usado de `BruteForceProtection`. | — |
| Alergia × prescrição | A regra compartilhada (`shared-contracts/clinical-allergy.ts`) compara medicamento e alergia registrada, ignorando acentos, apresentação e negativas ("Nenhuma"). A API responde 409 `ALLERGY_ACKNOWLEDGEMENT_REQUIRED` sem justificativa (mínimo de 10 caracteres). Com justificativa, grava "Alerta de alergia confirmado" na prescrição e `allergy_override` na auditoria. A tela mostra uma faixa de alergia de até 2 linhas e, só quando há coincidência, abre a justificativa ao lado do medicamento. Nunca bloqueia. | `clinical-allergy.test.ts`, `prescription-routes.test.ts`, `PrescriptionsPage.test.ts`, integração 71/71 |

**Verificação pós-correção:** typecheck ✅ · lint ✅ (158 avisos, 0 erros) · root 3.155/3.158 ✅ (3 skipped) · SPA 1.959/1.959 ✅ · API (node:test) ✅ · worker ✅ · integração PostgreSQL (MFA, RLS/LGPD, Pix, rotas, auditoria) 60/60 ✅ · OpenAPI ✅ · complexidade ✅.

**Continua pendente (não é só código):**
- **Executor de eliminação LGPD:** depende da decisão do DPO/jurídico sobre quais campos anonimizar e quando, dado o prazo de guarda do prontuário. Até lá, pedidos de exclusão ficam abertos, com 409 explícito.
- **Pix real por atendimento:** falta um provedor real no dispatcher do worker; hoje só existe o sintético, bloqueado em produção.
- **NFS-e com certificado e-CNPJ:** falta assinatura XML, além de homologação por município.
- **Lembretes WhatsApp:** faltam outbox, retry e envio agendado antes da consulta.
- **Alergia por classe e dose por peso (fase 2):** exige alergias estruturadas e princípio ativo e classe no catálogo de produtos.
- **Operação:** receivers de alerta, restore real com RPO/RTO, CI remoto, UAT clínica e homologação dos provedores.
