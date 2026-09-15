---
document_status: supporting
document_kind: checkpoint
effective_date: 2026-09-15
owner: Liderança técnica CVG-HIS
review_cycle: on-resume
candidate_sha: 324099e5a54537ca1349f3310639c3a12afbae36
verdict: NOT_PROVEN
superseded_by: docs/2026-09-15-auditoria-checkpoint-state-of-art-triplo-aaa.md
---

# Checkpoint retomável — programa State of Art / Triplo AAA (15/09/2026)

Continuação de [baseline 14/09](2026-09-14-relatorio-completo-estado-construcao.md).
HEAD `324099e5` + worktree rev27 preservado; **nenhum commit**; release
`BLOCKED` / Triplo AAA `NOT PROVEN`. Este documento é handoff operacional,
não aceite de produto.

## 1. Executado/revalidado e comprovado no escopo (com crítico I1)

| Cartão | Escopo aceito | Evidência principal |
|---|---|---|
| PROD-001-R2 | Controle reconciliado à auditoria 14/09: 65 contratos, narrativa rev27/21, ação única; checker 11/11; I1 REJECT tratado + re-revisão APPROVE | `artifacts/state-of-art/PROD-001/attempt-20260914T000000Z-R2/` |
| PROD-002 002-L | Identidade local congelada (17/17, worktree-only declarado) + inventário restrito PROD-048 sem reproduzir valores pessoais | `artifacts/state-of-art/PROD-002/attempt-20260914T001300Z-L/` |
| PROD-003-R2 | Harness rev27 2× PG/Redis/API/SPA + tamper + teardown exclusivo | `artifacts/state-of-art/PROD-003/attempt-20260914T004500Z-R2/` |
| PROD-004-R2 | Revalidação 0172+consumidor sem contraprova (probe 8/8 + suites 19/19) | `artifacts/state-of-art/PROD-004/attempt-20260915T010600Z-R2/` |
| PROD-005-R2 | Revalidação guard/UoW + matriz HTTP (403 pós-revogação, count 1, 409s) | `artifacts/state-of-art/PROD-005/attempt-20260915T011000Z-R2/` |
| PROD-061 | ML 14/14 + raiz 239 arquivos PASS/1 skip + lab PostgreSQL separado 1/1 (efêmero dropado; incidente `.env` registrado, sem ACK externo) | `artifacts/state-of-art/PROD-061/attempt-20260914T021500Z/` |
| PROD-010-R2 | Matriz promoção 10/10 (5 good bound rev27, 5 bad rejeitados) | `artifacts/state-of-art/PROD-010/attempt-20260915T011200Z-R2/` |
| PROD-011-R2 | SQL especializado PASS rev27 (`ac70c6e3`), denominador 171+7; promoção deferida ao gate | `artifacts/state-of-art/PROD-011/attempt-20260915T011500Z-R2/` |
| PROD-012-R2 | Vue especializado PASS rev27 (`efa62a6f`, 25/25 rotas, consumer PASS); narrativa corrigida pós-REJECT | `artifacts/state-of-art/PROD-012/attempt-20260915T012000Z-R2/` |
| PROD-013-R2 | Semântica type-only 23/23 + contratos 3/3 e 42/42; checker FAIL21 metric-only | `artifacts/state-of-art/PROD-013/attempt-20260915T014500Z-R2/` |

Falhas preservadas: PROD-061 run contaminada (`.env`→dev DB); PROD-012 runs
1–5 (harness); PROD-012 REJECT editorial; PROD-014 instrumento
dual-representation. Nenhum DONE foi inflado: `PROD-001` está `DONE` somente
como controle; os outros nove cartões desta tabela seguem `BLOCKED`. A cadeia
bottom-up exige `PROD-002 DONE` antes de `PROD-003 DONE`.

## 2. Implementado ainda não aprovado

- Promoções canônicas de SQL/Vue: produtores rodaram (candidatos `ac70c6e3`,
  `efa62a6f`); **promoção no fluxo do gate (039/045)**, não feita.
- F2 (PROD-013): guarda de counters type-only estreita; hardening adiado a 017/018.
- PROD-014: baseline métrica reproduzida e plano S1/S2/D1/S3 registrado; elevação
  e coleta única **não executadas**.

## 3. Falhas e provas stale

- Manifestos/shards: os 5 shards promovidos estão bound rev27/`533b6df2` e
  PASSARAM no checker corrente; qualquer teste novo (S1/S2) os torna **stale**
  → janela única S3 obrigatória (refresh do manifesto + recoleta + promoção +
  checker + especializados).
- Incidente `.env` (PROD-061): exposição DML residual ao DB de dev não
  excluível por log; recomendação ao dono registrada internamente, sem prova de
  ACK, auditoria do DB ou encerramento.
- Auditoria 14/09: A01 (21 déficits), A02–A13 abertos; nenhum gate de release
  foi satisfeito.

## 4. Bloqueios e decisões necessárias

1. **Instrumento de cobertura (registrar para 018/045)**: o shard
   `critical-process` produz identidades de função não alinhadas às dos shards
   vitest/native (diferença agregada de 221 counters em auth; ex.
   `brute-force`: 44 no processo versus 24 na unidade). O pacote evidencia
   dupla representação, não correspondência identidade-a-identidade. O merge
   soma os counters. Decisões: (a) manter como normativo e cobrir os
   dois ambientes com testes reais (recomendado; instrumento intocado);
   (b) autorizar correção de unificação de identidade no conversor (muda
   denominador; estimativa preliminar sem procedimento/log preservado: auth
   74.44% f/71.85% b — não fecha sozinho). **Requer autoridade de release/QA.**
2. Autoridades externas: SSO/IdP (019–021), dados PII (048), SLO/RPO/RTO
   (036–038), trust roots (039/040), UAT (035/046), retenção externa (002).
3. Sem PII real, sem deploy, sem push — limites mantidos.

## 5. Recursos próprios (estado)

- Nenhum processo próprio ativo. Clusters PG privados parados com
  `pg_ctl stop -m fast` (dados descartáveis em `/tmp/opencode/prod061-*`).
- ATENÇÃO ao retomar: a máquina hospeda runtime do usuário (PG/Redis em
  5432/6379 via systemd --user) e clusters órfãos de outros programas
  (`/tmp/cvg-phase11-*`, `/tmp/cvg-aaa-runs/*`); conferir portas antes de
  subir qualquer recurso e nunca derrubar o que não é próprio.
- Receita de reprovisionamento: `apt-get download postgresql-16 libpq5
  redis-server redis-tools liblzf1 libjemalloc2` + `dpkg-deb -x` em
  `/tmp/opencode/prod003r2-{pgroot,redisroot}` (sem root), exportar
  `NATIVE_POSTGRES_*`/`REDIS_*` (ver
  `artifacts/remediation/PROD-003/attempt-20260913T160500Z-R1/TRANSCRIPT.md`).
- Nenhum serviço do usuário foi morto; `test:db:stop`/`fuser -k` não usados.

## 6. Próxima ação exata

**PROD-014 S1** — ampliar testes unitários da representação `.ts`:
`apps/api/src/routes/auth-routes.ts` (handlers/negativos: 40 funções unit-side;
diagnosticar antes por que o teste existente `auth-dispatch-contract.test.ts` +
`apps/api/src/routes/auth-routes.test.ts` cobrem só 10/50 no shard unit),
`auth/index` (9), `oidc` (1), `webauthn` (3), `in-memory-*` (4),
`setup-token` (2), `auth-helpers` (3), `database-provider` (9), branches de
`totp`/`crypto`. Em seguida S2 (cenários HTTP no processo para as cópias
`.js`: brute-force lockout, MFA challenge, sessão, OIDC, access-control) e
**D1**: decisão QA/release da semântica do instrumento; depois **S3**: refresh
do manifesto → recoleta + promoção dos 5 shards → especializados → checker
(alvo: auth f/b ≥85, roles-rls b ≥85) → revisão I1.

Critério de saída do programa: PROD-045 com todos os gates e autoridades —
não declarar AAA antes disso.

## 7. Atualização operacional — PROD-014-S1 (15/09/2026)

O slice unitário foi executado no candidato local e ficou `PASS` condicionado:
Auth 70/70, MFA 66/66, feature flags 61/61, rotas 47/47, helpers 7/7,
setup-token 9/9 e Vitest focal 258/258. O shard `vitest-unit`
`5b8c12b1-0eef-4262-b88e-1e010dc6641a` passou com 241 arquivos e
`missingTests=[]`; o known-bad da remoção da checagem de permissão falhou no
assert esperado. Evidência completa:
`artifacts/state-of-art/PROD-014/attempt-20260915T122300Z-S1/REPORT.md`.

O cartão PROD-014 permanece `BLOCKED`: não houve crítica fresh independente
válida (`UNAVAILABLE_TIMEOUT_SHUTDOWN`), o checker agregado continua abaixo do
limiar (37 erros, incluindo Auth functions 71,94%), e S2 (PG/Redis/processos
privados), D1 (identidade dual) e S3 (recoleta dos cinco shards) permanecem
abertos. Nenhuma conclusão de DONE ou Triple-A foi atribuída.

## 8. Atualização após crítica fresh — PROD-014-S2 (15/09/2026)

O crítico independente `Copernicus` concluiu parecer read-only fresh e aprovou
S1 apenas de forma condicionada: não há defeito adicional inequívoco, mas não
há autorização para `DONE`, promoção ou AAA. O checker reexecutado permanece
`FAIL` (24 erros; Auth functions 72,28%), com thresholds e denominadores
intactos. A próxima ação singular registrada no controlador é S2 em stack
privada, com PG/Redis/processos HTTP reais e sem uso de `.env`; D1 e S3 seguem
posteriores. Evidência: `artifacts/state-of-art/PROD-014/attempt-20260915T122300Z-S1/`.

## 9. Atualização após S2 — D1 pendente (15/09/2026)

S2 passou localmente em stack privada: PostgreSQL socket-only, Redis e
processos API/worker reais, 11 suítes e 45 testes, com teardown completo. A
crítica fresh `Boyle` aprovou o slice condicionado e preservou como P2 a
observação V8 não coberta e o `skipIf` do fixture. O pedido D1 foi criado em
`artifacts/state-of-art/PROD-014/attempt-20260915T125600Z-D1/` para decisão
QA/release entre merge normativo multiambiente e unificação versionada. Nenhuma
decisão foi inferida; S3, promoção, DONE e AAA continuam bloqueados.

## 10. Checker pós-S2

Após S2, o checker corrente é `FAIL19`, agora somente por métricas: os
mismatches de input desapareceram. Auth permanece em functions 72,28%;
roles/RLS está acima de 85 em lines/statements/functions/branches. O snapshot
está em `artifacts/state-of-art/PROD-014/attempt-20260915T125600Z-D1/logs/checker-post-s2-summary.json`.
