---
document_status: historical
document_kind: backlog
effective_date: 2026-09-15
owner: Liderança técnica, Produto e Operações CVG-HIS
review_cycle: on-task-completion-or-blocker-change
superseded_by: docs/2026-09-20-backlog-nova-rodada-melhorias.md
---

# Backlog executável pós-checkpoint — State of Art / Triplo AAA

[Auditoria vigente](2026-09-15-auditoria-checkpoint-state-of-art-triplo-aaa.md) ·
[Plano executivo](2026-09-14-plano-executivo-state-of-art-triplo-aaa.md) ·
[Roadmap vigente](2026-09-15-roadmap-pos-checkpoint-state-of-art-triplo-aaa.md) ·
[Contratos detalhados de 14/09](2026-09-14-backlog-state-of-art-triplo-aaa.md)

## 1. Contrato e estado autoritativo

Este backlog preserva, por referência normativa, os 65 contratos, prioridades,
dependências e critérios de aceite publicados em 14/09. Não renumera nem reduz
o escopo. Este documento substitui a fila executiva e acrescenta as correções e
subtarefas descobertas em 15/09. Em conflito, `.agent/backlog.json` governa o
estado operacional e o contrato detalhado de 14/09 governa o aceite até que uma
alteração explícita seja aprovada.

Estado auditado dos 65 cartões PROD: **1 DONE, 16 BLOCKED, 48 TODO**. Os cinco
itens macro históricos presentes no controlador não fazem parte dessa contagem.

| Estado | Cartões |
|---|---|
| DONE | 001 (controle; não produto/release) |
| BLOCKED | 002, 003, 004, 005, 010, 011, 012, 013, 014, 019, 027, 048, 049, 052, 061, 062 |
| TODO | 006–009, 015–018, 020–026, 028–047, 050–051, 053–060, 063–065 |

Um subaceite ou uma fatia executável não muda automaticamente o cartão-pai.
`002-L`, os pacotes R2 e o gate local de 014 preservam as dependências integrais.
`PROD-045` é o único Go/No-Go do candidato; `PROD-046` é a entrada controlada.

## 2. Definition of Done comum

1. Entrada, dependências, autoridade, ambiente, WHAT/HOW e regra de rollback
   estão explícitos antes de BUILD.
2. Comportamento é demonstrado na fronteira pública com happy path, negativos,
   concorrência/restart e persistência quando aplicáveis; mock não homologa alvo.
3. Testes focais e regressão proporcional passam, com zero skip em obrigação
   crítica e sem reduzir threshold, denominador ou inventário.
4. Evidência é vinculada a fonte/build/config/schema/harness/alvo, contém exit,
   timestamps, hashes, limites e tentativa falha preservada; retenção é válida.
5. Crítico fresco e separado revisa o artefato real. Mudança material invalida
   a prova afetada; escritor não aprova a própria entrega.
6. Estado, ledger, ExecPlan e docs são atualizados depois da prova. DONE exige
   todos os bloqueios e decisões do cartão resolvidos por autoridade competente.

## 3. Fila P0 — próxima execução exata

| Ordem | Subtarefa / cartão | Estado | Owner | Entrada e HOW | Aceite observável / prova |
|---:|---|---|---|---|---|
| 1 | DOC-15-AUDIT → 001 | DONE nesta atualização | Lead | Confrontar checkpoint, pacotes, ledgers, status e checker | Auditoria vigente; status 1/10/54; linguagem de subaceite; docs/checker validados |
| 2 | PROD-014-S1 | READY dentro de cartão BLOCKED | Backend auth + QA | Gate local de 014; ampliar testes unit/TS de auth-routes, index, OIDC, WebAuthn, MFA, repos in-memory, setup-token, helpers e database-provider | Testes falham nos caminhos não exercitados antes; negativos reais; delta por arquivo; sem mudança no instrumento |
| 3 | PROD-014-S2 | TODO após S1 | Backend auth + QA | Stack própria; cenários HTTP/processo para brute-force, MFA/TOTP/crypto, sessão/refresh/revogação, OIDC e access-control | Representação compilada exercitada; efeitos/negações observados; recursos e teardown próprios |
| 4 | PROD-014-D1 → 013/014/018/045 | BLOCKED por autoridade | QA + release authority | Julgar união multiambiente vigente versus unificação versionada; usar diferença agregada 221 e reproduzir a estimativa preliminar 74,44/71,85 com procedimento preservado | Decisão assinada, regra/versão/denominador/known-bads/migração definidos; nenhuma edição silenciosa |
| 5 | PROD-014-S3 | TODO após S1/S2/D1 | Lead + QA | Congelar bytes; refresh do manifesto; recolher e promover os cinco shards; renovar SQL/Vue; checker e crítica | Zero stale/mismatch; cada métrica obrigatória de auth/roles-RLS ≥85; pacote durável; crítico fresco |
| 6 | PROD-002-R1 | BLOCKED externo | Segurança/SRE | Selecionar destino de evidência; ACL, retenção, integridade, restauração e sanitização | Restore amostral e acesso negativo; referência durável; 002 pode seguir para VERIFY/DONE |
| 7 | PROD-061-R2-INCIDENT | BLOCKED por dono | Dono DB dev + Segurança | Inspecionar auditoria do DB sem divulgar `.env`/PII; delimitar DML/efeitos e contenção | Decisão de incidente, efeitos reconciliados e evidência restrita; rotação/contenção se aplicável |

S1 e S2 podem avançar enquanto D1/002-R1/incidente aguardam pessoas. S3 não
começa sem D1, freeze e janela exclusiva. Fechar D1 não transforma coverage em
PASS; a alternativa medida também falha.

## 4. Backlog mestre por resultado

Os critérios específicos completos estão no backlog detalhado de 14/09 e são
cumulativos com a DoD acima.

| Resultado | Cartões | Estado atual | Próximo gate |
|---|---|---|---|
| Controle, identidade e retenção | 001, 002, 010, 039, 047, 048, 049, 062 | 001 DONE; 002/010 BLOCKED; demais TODO | Evidência durável e anti-forgery; tratamento PII/ambiente; autoridade de trust root |
| Harness, dados e invariantes | 003–005, 011–013, 024, 061 | 003–005/011–013/061 BLOCKED; 024 TODO | Fechamento bottom-up após 002; promoção especializada e DB/jornadas integrais |
| Financeiro e consistência | 006–009, 030, 052, 053, 065 | 052 BLOCKED; demais TODO | Contratos aprovados, HTTP/UI/DB/worker/provider e subledger reconciliados |
| Coverage e engenharia de testes | 014–018, 060 | 014 BLOCKED; demais TODO | D1 + S1/S2/S3; zero métrica <85; lint semântico; CI do candidato |
| IAM, SSO, privacidade e logs | 019–023, 033, 048 | TODO | Jornada SSO completa, tenant/MFA/RLS, DSR/retenção e logs saneados |
| Worker e resiliência | 025, 043, 050, 051 | TODO | Job pendurado isolado, cancelamento/fencing, crash/retry/DLQ e entrega durável |
| Jornadas e paridade | 026–034, 063–065 | TODO | Onze áreas, datasets oracle, persistência/restart e homologações externas |
| UX, visual e acessibilidade | 035, 042, 054–059 | TODO | Matriz 375/721/768/1024/1440, estados, AA/manual/AT, UAT e crítico ≥95/HIGH |
| Arquitetura | 041–043 | TODO | Hotspots caracterizados e extraídos por responsabilidade sem regressão |
| Operação e recuperação | 036–038, 044, 049 | TODO | Metas aprovadas, target, 24/72h quando contratado, alerta/restore/deploy/rollback |
| Release e sustentação | 040, 045–047 | TODO | Required checks, 97/95/0, gates PASS, Go formal, rollout e recertificação |

## 5. Inventário completo dos 65 contratos

| Faixa | Resultado principal | IDs preservados |
|---|---|---|
| Continuidade e reparos conhecidos | Controle, evidência, harness, envelope, replay, financeiro e produtores especializados | PROD-001–013 |
| Cobertura e fechamento do checker | Auth/roles-RLS, clínica/financeiro, módulos restantes, instrumentos e CI | PROD-014–018 |
| Identidade, dados e plataforma base | SSO, segurança/logs, runtime, dados e worker | PROD-019–025 |
| Produto e paridade | Jornadas clínicas, paridade, laboratório, fiscal, pagamentos, marketing, relatórios, DSR/importação e UAT | PROD-026–035 |
| Operação, arquitetura e release | Performance, recovery, observabilidade, supply chain, repo policy, hotspots, target, Go/No-Go, rollout e freshness | PROD-036–047 |
| Lacunas adicionais da auditoria 14/09 | PII, deploy surface, job pendurado, notificações, pontos, UX, a11y, lint, ML, verificadores e domínios restantes | PROD-048–065 |

Nenhum ID está implicitamente concluído pelo agrupamento. Cartões G precisam ser
decompostos em fatias comportamentais antes de despacho, mantendo o ID-pai.

### 5.1 Contrato P0 de recuperação operacional

O critério de recuperação permanece explícito no backlog vigente e é validado
junto com a superfície de backup/restore. A execução continua bloqueada até que
as metas, o alvo descartável e a autoridade de operação estejam definidos.

| ID | Prioridade / owner / esforço | Dependências | Resultado | Critério de aceite |
|---|---|---|---|---|
| PROD-037 | P0 / Dados + SRE / G | 004, 024, 025, 033, 049 | Backup, restore, corrupção e mismatch | Restaurar DB/objetos/config/chaves necessárias, checksums/relações/saldos; provar corrupção detectada e recuperação; cumprir RPO/RTO aprovados. Alvo descartável autorizado, cronômetro e relatório; nunca restaurar sobre produção por padrão |

## 6. Achado → backlog de fechamento

| Achado vigente | Cartões/subtarefas | Fechamento exigido |
|---|---|---|
| A15-01/02 narrativa e status | DOC-15-AUDIT, 001 | Documentos e controlador coerentes; nenhum “implementado/DONE” além da prova |
| A15-03 identidades de coverage | 013, 014-D1/S1/S2/S3, 018, 045 | Decisão normativa + testes nos ambientes + coleta atual sem manipulação |
| A15-04 retenção local | 002-R1, 039, 047 | Repositório de evidência durável, restrito, restaurável e com freshness/revogação |
| A15-05 incidente `.env` | 061-R2-INCIDENT, 048/049 conforme decisão | Efeito delimitado, contenção e prova restrita; ambiente fail-closed |
| A15-06 drift do ExecPlan | 001 | Passos singulares, histórico preservado e marker/state/backlog coerentes |
| A15-07 crítica escopada | 014-S3, 035, 044, 045 | Reexecução fresca nos gates materiais e autoridades/target reais |
| A15-08 REJECT Vue sem parecer bruto | 012, 039/045 | Próximas críticas preservadas antes do rework, com hash, timestamp e pacote imutável |
| A15-09 limites de ambiente | 003, 061 | Build integral a partir do snapshot congelado; logs enumerativos e evento de teardown próprio |
| A01 coverage original | 010–018 | Cinco shards + SQL/Vue atuais e zero métrica obrigatória abaixo de 85 |
| A02–A13 da baseline | 019–065 conforme matriz de 14/09 | Evidência específica, comportamento real e autoridade; nada fechado por associação textual |

## 7. Sequência após S3

1. Encerrar bottom-up 002 → 003 → 004/005/061 → 010–013 onde os aceites
   integrais realmente estiverem satisfeitos; não converter espera de gate em
   DONE por lote.
2. Completar 015/016, hardening 017 e integração/CI 018; qualquer mudança exige
   recolher apenas a evidência afetada antes da promoção.
3. Executar 019–025 e 048–053/060–062 por risco de segurança, dados e worker.
4. Fechar jornadas 026–034/063–065 e UX 035/054–059 com UAT e providers.
5. Executar target/operação 036–040/044/047/049; então congelar 045.
6. Somente Go explícito de 045 autoriza 046. Sem autoridade ou evidência:
   registrar `BLOCKED`, avançar uma fatia independente e não declarar AAA.

## 8. Atualização de execução — PROD-014-S1 (15/09/2026)

S1 foi implementado e verificado localmente com evidência em
`artifacts/state-of-art/PROD-014/attempt-20260915T122300Z-S1/REPORT.md`:
Auth 70/70, MFA 66/66, feature flags 61/61, rotas 47/47, helpers 7/7,
setup-token 9/9, Vitest focal 258/258 e shard unitário corrente sem
`missingTests`. O known-bad da remoção de autorização foi rejeitado pelo teste.

O status permanece `BLOCKED`/`PASS local condicionado` porque a crítica fresh
independente ficou indisponível, o checker agregado ainda tem 37 erros e os
gates S2 real (PG/Redis/processos), D1 e S3 continuam pendentes. Não alterar
thresholds, denominadores ou inventário para promover este resultado.

## 9. Atualização após crítica fresh — despacho S2

`Copernicus` concluiu a crítica fresh read-only e aprovou S1 local de forma
condicionada, sem findings adicionais inequívocos. O cartão permanece
`BLOCKED`: o checker corrente é `FAIL` com 24 erros e Auth functions 72,28%,
enquanto S2 em stack privada, D1 e S3 ainda não foram aceitos. O controlador
despacha `PROD-014:PROD-014-S2-20260915`; thresholds, denominadores e inventário
não foram alterados.

## 10. Atualização após S2 — D1 bloqueante

O slice S2 tem 45 testes de processo PASS e crítica fresh condicionada, com
evidência em `artifacts/state-of-art/PROD-014/attempt-20260915T124300Z-S2/`.
O backlog despacha D1 como `WAIT` até autoridade QA/release registrar a opção
de identidade; S3 e a promoção dos cinco shards não podem começar antes disso.

## 11. Checker pós-S2

O checker atual é `FAIL19` somente por déficits métricos; não há mais mismatch
de input. Essa melhora não é promoção: D1 continua `WAIT`, Auth functions está
72,28% e S3 permanece bloqueada.

## 12. Estado corrente de PROD-048

PROD-048 está BLOCKED na ação PROD-048:PROD-048-DPO-OWNER-20260915. A
execução R1 produziu inventário restrito de 67 arquivos e 28/28 candidatos em
revisão obrigatória, com uma raiz legada ausente; valores não foram publicados
e os documentos não foram modificados. O pacote local, o manifesto de fontes e
os sete checksums listados conferem; testes 4/4 e lint passaram.

O REJECT de Locke foi preservado como STALE e as duas tentativas fresh
posteriores terminaram sem veredito. O desbloqueio exige owner Segurança/DPO,
decisão de tratamento dos candidatos, exemplos sintéticos, ACL, retenção,
restauração e destino durável, seguida de revisão independente atual. O
controlador está reconciliado em PASS 11/11, mas o release segue BLOCKED /
Triplo AAA NOT PROVEN.

## 13. PROD-049 — matriz ambiente → runtime

O backlog moveu PROD-049 para BLOCKED com a ação única
PROD-049:PROD-049-PLATFORM-RELEASE-OWNER-20260915. O pacote local cobre cinco ambientes,
precedência Compose/Helm, runbook, smoke não mutante, identidade de release e
oito decisões PENDING_AUTHORITY. Testes good/bad, validadores, guards,
documentação e hashes estão registrados no pacote R1.

O aceite integral continua bloqueado: a revisão independente fresh, o binário
Helm v3.15.4, os alvos e owners reais, origins, digests, provider de secrets,
migration aplicada, contrato de health do worker, CI remoto, UAT e rollback
não foram provados. A matriz não autoriza deploy nem altera o Triplo AAA.

## 14. PROD-019 — contrato de identidade corporativa

O backlog moveu PROD-019 para BLOCKED com a ação única
PROD-019:PROD-019-PRODUCT-SECURITY-OWNER-20260915. O pacote R1 implementa
contrato JSON, documento, validador e testes good/bad para C1-C6, R1-R6,
critérios temporais, threat model e FAIL-001 a FAIL-012. Recomendações não são
decisões, issuer + sub é a chave externa e email não vincula identidade.

Contrato, testes 7/7, lint, documentação, guards, matriz runtime, superfície de
deploy, deploy-check 12/12 e SHA256SUMS passaram localmente. O aceite integral
continua bloqueado: Epicurus não produziu crítica fresh dentro de mais de 120
segundos; Product/Security ainda precisam decidir o contrato e autorizar
provider, discovery/JWKS, sessão ERP, tenant/RBAC, MFA, browser/API/DB/SPA,
UAT, logout e recuperação. PROD-020/021 não são liberados e o Triplo AAA
permanece NOT PROVEN.

## 15. PROD-052 — contrato de expiração de pontos

PROD-052-R1 foi estacionado BLOCKED após implementação local do contrato
comparativo de expiresAt. O pacote registra C1-C6, R1-R6, alternativas,
impactos, invariantes, observações do código, casos temporais, legado,
concorrência e restituição. Nenhum saldo, migration ou decisão de
Product/Financeiro foi alterado ou inferido.

O guard do contrato e os testes good/bad passaram 8/8; release-gate 53/53,
lint, docs, matriz runtime, deploy surface, deploy-check 12/12, diff, SHA e
checker 11/11 também passaram. A crítica fresh Hegel foi encerrada após mais
de 120 segundos sem veredito. O próximo passo único é obter crítica
independente current ou substituto autorizado e decisão Product/Financeiro
sobre C1-C6/R1-R6 antes de PROD-053; o release continua BLOCKED / Triplo AAA
NOT PROVEN.

## 16. PROD-027 — matriz comportamental das 11 áreas

PROD-027-R1 foi replanejado como preparação contratual local enquanto PROD-003
permanece BLOCKED. O contrato cobre as 11 áreas e o inventário atual de 46
módulos, preserva a narrativa baseline de 45 como divergência pendente, separa
manifesto de comportamento e exige cenários positivos, negativos, permissões,
persistência e reconciliação.

Os tracks COM-001 a COM-004 mantêm pacotes/fidelidade, cotações,
vendas/comanda e serviços como jornadas próprias. Guard, testes good/bad 9/9,
lint, documentação, release-gate, diff e checker 11/11 passaram. Erdos ficou
indisponível após três janelas sem veredito; o registro fresh está no pacote
R1. O cartão não é DONE: falta PROD-003, decisão Product/QA/domínio, fixtures
sintéticas, execução pública, dataset Vetus autorizado e revisão fresh atual ou
substituto autorizado; o release continua BLOCKED / Triplo AAA NOT PROVEN.

## 17. PROD-062 — verificadores por família

O cartão foi movido para BLOCKED na ação
`PROD-062:PROD-062-FRESH-CRITIC-AUTHORITY-20260915`, com escopo explícito
`CONTRACT_ONLY_PREPARATION`. A implementação local inventaria os 13 critérios
genéricos e os roteia para sete famílias: testes, RLS, backup, UAT, deploy,
proteção de branch e autoridade.

Cada envelope exige tipo/versão/critério/família exatos, bytes e digest,
issuer/workflow confiáveis, alvo, conjunto de medições gate-owned e frescor.
Hash, issuer, target, status, limite, duplicidade, byte mismatch e autoridade
falsos falham fechado. Política de produção e attestation real permanecem
pendentes; sem raiz de confiança o resultado é `PARTIAL`, sem auto-PASS por
flag. O caso bom é somente sintético, com verificador e política aprovados
injetados nos testes.

Artefatos: inventário em
`docs/triple-a/19-prod-062-family-verifier-inventory.md`, implementação em
`scripts/run-triple-a-release-gate.mjs`, integração em
`scripts/generate-triple-a-evidence-package.mjs`, teste em
`tests/unit/infra/prod-062-family-evidence.test.ts` e pacote R1 em
`artifacts/state-of-art/PROD-062/attempt-20260915T161317Z-R1/`. Permanecem
bloqueadores PROD-010, CI/provider/target remoto, proteção efetiva, restore,
UAT, autoridade de release e crítica fresh; o cartão não é DONE e o release
continua BLOCKED / Triplo AAA NOT PROVEN.
