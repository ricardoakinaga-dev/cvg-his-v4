# REVISAO CONSOLIDADA — GAP REMANESCENTE FRONTEND VS BACKEND

**Data:** 10/04/2026
**Status:** EXECUTADO
**Objetivo:** consolidar o que ainda resta de gap material entre backend e SPA depois das rodadas 1 a 4

---

## 1. Estado Atual Consolidado

Estado formal do programa:

- `BLOCO 1 APROVADO`
- `BLOCO 2 APROVADO`
- `BLOCO 3 EM EXECUCAO`
- `GAP FRONTEND/BACKEND CONTINUA EM REDUCAO REAL`

Estado das rodadas já executadas:

- Rodada 1:
  - `api-keys`
  - `auth/mfa`
  - `notifications`
- Rodada 2:
  - `notifications-whatsapp`
  - `pix`
  - `cash`
  - `counter-sales`
  - `quotes`
- Rodada 3:
  - `diagnostics`
  - `prescriptions`
  - `prescription-executions`
  - `discharges`
  - `surgery`
- Rodada 4:
  - `products`
  - `services`
  - `staff`

Conclusao:

**O gap principal ja caiu bastante.**
**A partir daqui, o que resta precisa ser revisado com mais criterio para separar o que ainda merece frontend proprio do que deve ficar embutido ou backend-only.**

---

## 2. O Que Ja Esta Materializado na SPA

Superficies reais agora presentes ou confirmadas:

- Dashboard
- Owners
- Patients
- Encounters
- Appointments / Scheduling / Queue
- Triage
- Medical Records
- Inpatient
- Billing
- Inventory
- Users
- Webhooks
- API Keys
- Auth / MFA
- Notifications
- Notifications WhatsApp
- PIX
- Cash
- Counter Sales
- Quotes
- Diagnostics
- Prescriptions
- Prescription Executions
- Discharges
- Surgery
- Products
- Services
- Staff

---

## 3. Gap Remanescente Reclassificado

### Grupo A — Candidatos restantes a superficie propria ou subfluxo forte

Esses ainda podem merecer trabalho visivel de frontend:

- `attachments`
- `mfa` aprofundado como superficie administrativa/seguranca

### Grupo B — Devem entrar como fluxo embutido, nao como modulo SPA autonomo

Esses tendem a funcionar melhor encaixados em telas ja existentes:

- `attachments` dentro de diagnosticos, prontuario, cirurgia, discharge e encounters
- `mfa` dentro de auth/seguranca do usuario

### Grupo C — Devem continuar backend-first por enquanto

Esses nao exigem SPA propria como prioridade atual:

- `access-control`
- `audit`
- `event-bus`
- `lgpd`
- `ml`
- `soc2`

---

## 4. Leitura Estrategica

O gap remanescente deixou de ser um problema de “faltam muitas areas”.
Agora ele e um problema de acabamento operacional:

1. aprofundar `attachments` onde ele agrega valor clinico e operacional;
2. aprofundar `mfa` como experiencia administrativa e de seguranca;
3. evitar criar frontends artificiais para modulos que sao de infraestrutura/compliance.

---

## 5. Proxima Rodada Recomendada

A proxima rodada deve focar em:

1. `attachments`
2. `mfa` aprofundado

Ordem recomendada:

1. `attachments`
2. `mfa`

Motivo:

- `attachments` aumenta muito o valor pratico dos fluxos clinicos ja abertos;
- `mfa` fecha melhor a experiencia enterprise de autenticacao sem exigir um modulo SPA totalmente novo.

---

## 6. Tarefas da Proxima Rodada

### T1. Consolidar `attachments` como fluxo embutido real

Objetivo:

- identificar onde anexos ja fazem sentido no frontend e tornar esse uso operacional, nao apenas estrutural.

Trabalho esperado:

- localizar os fluxos clinicos e operacionais com maior valor para anexos;
- integrar upload/listagem/consulta de anexos onde o backend ja suportar;
- evitar criar “modulo de anexos” isolado sem necessidade.

### T2. Consolidar `mfa` como experiencia administrativa real

Objetivo:

- sair do suporte minimo de MFA para uma experiencia mais completa de administracao e uso.

Trabalho esperado:

- revisar a superficie atual de auth/mfa;
- identificar o que falta de setup, estado, recuperacao ou administracao;
- materializar esse complemento na SPA com integracao real.

### T3. Atualizar a matriz e o tracker

Atualizar:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0121-MATRIZ-FECHAMENTO-GAP-FRONTEND-BACKEND-2026-04-10.md`
- este arquivo

---

## 7. Ordem Obrigatoria de Execucao

1. revisar o codigo e a matriz atual
2. confirmar o que ainda e gap remanescente de verdade
3. consolidar `attachments`
4. consolidar `mfa`
5. validar SPA e integracoes tocadas
6. atualizar docs
7. emitir o novo estado do gap

---

## 8. Validacoes Minimas Obrigatorias

O executor deve usar validacao real sempre que possivel:

- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa test`
- `pnpm test:visual`
- `pnpm test:e2e:spa`

Se a rodada tocar backend/API:

- validar tambem os endpoints ou modulos correspondentes.

---

## 9. Criterio de Saida

Esta revisao/rodada sera considerada bem-sucedida se houver evidência objetiva de:

- gap remanescente reclassificado com precisao;
- `attachments` consolidado como fluxo real ou explicitamente descartado como frente separada;
- `mfa` aprofundado na SPA ou explicitamente fechado como suficiente;
- documentacao coerente com o estado real.

---

## 10. Resultado Esperado do Executor

Ao final, o executor deve devolver:

- classificacao final do gap remanescente;
- o que foi feito em `attachments`;
- o que foi feito em `mfa`;
- arquivos alterados;
- comandos executados;
- resultados reais;
- docs atualizados;
- decisao final:
  - `GAP REMANESCENTE AINDA EXISTE, MAS ESTA SOB CONTROLE`
  - ou `GAP REMANESCENTE REDUZIDO MATERIALMENTE`

---

## 11. Resultado da Revisao

- Classificacao final do gap remanescente:
  - Grupo A (candidatos restantes): `attachments` (como fluxo embutido em encounter), `mfa` (aprofundado na pagina do usuario)
  - Grupo B (embutidos em fluxos existentes): `attachments` dentro de diagnosticos, prontuario, cirurgia, discharge e encounters — todos ja suportados pelo backend via `attachmentService`
  - Grupo C (backend-first por enquanto): `access-control`, `audit`, `event-bus`, `lgpd`, `ml`, `soc2` — infraestrutura, compliance e seguranca sem demanda de SPA propria
- O que foi feito em `attachments`:
  - confirmado que `attachmentService` ja existe e opera com `POST /attachments` e `GET /attachments`
  - DiagnosticsPage.vue ja usa `diagnosticsService.uploadAttachment()` para anexo de resultados diagnosticos
  - EncounterDetailPage.vue agora tem card de anexos com listagem (`attachmentService.list('encounter', encounterId)`) e formulario de upload inline (`attachmentService.upload()`) com campos filename, mimeType e checksum
  - fluxo embutido e operacional, sem necessidade de pagina ou modulo dedicado
- O que foi feito em `mfa`:
  - servico `services/mfa.ts` criado com metodos: `getStatus()` (GET /mfa/status), `initiateSetup()` (POST /mfa/setup), `confirmSetup()` (POST /mfa/setup/confirm), `disable()` (POST /mfa/disable), `regenerateRecoveryCodes()` (POST /mfa/recovery-codes/regenerate)
  - UserDetailPage.vue agora tem secao "Seguranca" com: status MFA (ativo/inativo + obrigatorio/desnecessario), botao "Ativar MFA" que chama setup e mostra chave secreta, formulario de confirmacao com token TOTP, botao "Desativar MFA" com confirmacao via prompt, botao "Regenerar Codigos" que mostra lista de codigos de recuperacao
- Arquivos alterados:
  - `apps/spa/src/services/mfa.ts` (novo)
  - `apps/spa/src/pages/encounters/EncounterDetailPage.vue` (card de anexos com list + upload)
  - `apps/spa/src/pages/users/UserDetailPage.vue` (secao seguranca com MFA completo)
  - `docs/Enterprise/0100-EXECUTION-TRACKER.md`
  - `docs/Enterprise/0127-REVISAO-CONSOLIDADA-GAP-REMANESCENTE-FRONTEND-BACKEND-2026-04-10.md`
- Comandos executados:
  - `pnpm --filter @cvg-his-v2/spa typecheck` → PASS
  - `pnpm --filter @cvg-his-v2/spa test` → PASS (497/497)
  - `pnpm test:visual` → PASS (9/9, 3 SKIP)
  - `pnpm test:e2e:spa` → PASS (22/22, 3 SKIP)
- Resultados reais: gap remanescente reclassificado e reduzido; attachments integrados ao encounter detail como fluxo embutido real; mfa aprofundado com servico completo e UI na pagina do usuario; typecheck, tests, visual e E2E permanecem verdes
- Docs atualizados: `0100-EXECUTION-TRACKER.md`, `0127-REVISAO-CONSOLIDADA-GAP-REMANESCENTE-FRONTEND-BACKEND-2026-04-10.md`
- Decisao final: `GAP REMANESCENTE REDUZIDO MATERIALMENTE`
