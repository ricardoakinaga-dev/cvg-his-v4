---
document_status: historical
document_kind: backlog
effective_date: 2026-09-21
owner: Liderança técnica, Plataforma, Segurança, QA e Operações CVG-HIS
review_cycle: on-task-completion-or-blocker-change
superseded_by: docs/2026-09-26-backlog-rodada-2.md
---

# Backlog executável de remediação integral

[Auditoria](2026-09-21-auditoria-profunda-repositorio.md) ·
[Plano executivo](2026-09-21-plano-executivo-remediacao-integral.md) ·
[Roadmap](2026-09-21-roadmap-remediacao-integral.md) ·
[Prompt Codex](2026-09-21-prompt-codex-remediacao-integral.md)

## Contrato do backlog

Este documento transforma os achados `F-001...F-033` em tarefas executáveis
`REM-001...REM-055`. Ele define escopo, dependências e aceite, mas não deve se
tornar uma segunda fonte mutável de status. Ao iniciar a execução, o agente deve
reconciliar os IDs com `.agent/backlog.json`; o estado operacional e a próxima
ação ficam em `.agent`, com ledgers append-only.

Estados abaixo representam a condição inicial de planejamento:

- `TODO`: pode ser preparado localmente;
- `BLOCKED_HUMAN`: depende de autorização ou decisão humana;
- `BLOCKED_EXTERNAL`: depende de ambiente, credencial, provider ou registro
  externo;
- `VERIFY`: implementação existe, mas requer prova atual;
- `DONE`: proibido neste documento inicial; só pode existir após evidência.

## Definition of Ready

Uma tarefa entra em execução somente quando objetivo, superfície, contratos,
dependências, known-bad, teste focal e autoridade estão identificados. Alteração
destrutiva ou externa exige autorização explícita antes da ação, não depois.

## Definition of Done comum

1. Comportamento/artefato de aceite observado no boundary correto.
2. Teste focal e regressão proporcional em exit 0, sem reduzir thresholds.
3. Diff revisado para escopo, segurança, dados e contratos.
4. Evidência registra SHA, ambiente, procedimento, resultado e limitações.
5. Docs e artefatos gerados atualizados quando afetados.
6. Item movido para `VERIFY` antes de `DONE` no control plane.
7. Nenhum blocker ou aprovação humana pendente para itens `DONE`.

## P0 — preservação e gates locais

| ID | Achado | Estado inicial | Dependências | Entrega e aceite observável |
| --- | --- | --- | --- | --- |
| REM-001 | F-001 | TODO | — | Inventariar refs/blobs, criar backup recuperável fora da árvore-alvo, registrar hashes e demonstrar leitura/recuperação; produzir plano de history rewrite sem executá-lo |
| REM-002 | F-001/F-026 | BLOCKED_HUMAN | REM-001 | Com aprovação explícita, remover o blob proibido do intervalo a publicar, externalizar/ignorar estado gerado e provar que refs de push não contêm blob >100 MiB; sem perder commits |
| REM-003 | F-017 | TODO | — | Fixar/ativar Node 22.23.2 e pnpm 10.33.0 por mecanismo versionado; instalação frozen e comandos sem engine mismatch |
| REM-004 | F-018 | TODO | REM-003 | Atualizar mocks/expectativas de startup secrets para `METRICS_AUTH_TOKEN`; casos positivo, ausência e falha passam sem esconder requisito |
| REM-005 | F-019 | TODO | REM-003 | Congelar contrato 413 para payload excedido em erro, API e teste; teste antigo falha antes e contrato escolhido passa depois |
| REM-006 | F-002 | TODO | REM-004, REM-005 | Elevar branch coverage para ≥82% com testes comportamentais relevantes; proibido baixar threshold ou excluir nova superfície |
| REM-007 | F-003 | TODO | REM-003 | Criar comando canônico que execute testes raiz e workspaces, propagando falha; adicionar known-bad que prove que um teste raiz quebrado derruba o gate |
| REM-008 | F-017 | TODO | REM-003 | Reexecutar crypto/runtime no Node oficial, eliminar dependência acidental de comportamento experimental e documentar matriz suportada |
| REM-009 | F-002/F-003 | TODO | REM-006, REM-007, REM-008, REM-015, REM-026 | Executar gate local integrado em checkout limpo: install, build, typecheck, lint, test, coverage, critical bootstrap, complexity, security, docs e validadores, todos exit 0 |
| REM-010 | F-004/F-024 | TODO | REM-002, REM-009 | Congelar SHA local publicável e gerar identidade/snapshots sem promover CI, target ou autoridade inexistentes |
| REM-011 | F-024/F-025 | TODO | REM-010 | Reconciliar README, Quality Bar, fonte documental e scorecards ao mesmo SHA/status; conhecidos externos permanecem `NOT_PROVEN` |
| REM-012 | F-005 | TODO | REM-010, REM-011 | Atualizar registro P0 a partir de evidência atual, mantendo cada item aberto até o critério correspondente realmente passar |

## P1 — qualidade local, CI e supply chain

| ID | Achado | Estado inicial | Dependências | Entrega e aceite observável |
| --- | --- | --- | --- | --- |
| REM-013 | F-021 | TODO | REM-003 | Definir lint semântico mínimo, adicionar scripts aos nove pacotes faltantes e separar claramente lint de typecheck; gate cobre todos os pacotes aplicáveis |
| REM-014 | F-022 | TODO | REM-007 | Inventariar skips, criar shards obrigatórios para Redis/PostgreSQL/diagnósticos e política allowlist; skip não autorizado falha CI |
| REM-015 | F-020 | TODO | REM-003 | Fixar versão Helm, executar lint/template real em dev/staging/prod e known-bads de values/schema; validação estática permanece complementar |
| REM-016 | F-023 | TODO | REM-003 | Implementar harness local de install/upgrade/mixed-version/lock/rollback com banco descartável e dados sintéticos representativos |
| REM-017 | F-011 | TODO | REM-003 | Validar localmente pipeline de SBOM, scan, digest, assinatura/attestation em modo seguro; known-bads detectam imagem trocada e rebuild |
| REM-018 | F-004/F-024 | TODO | REM-009–REM-017 | Freeze final do candidato local; worktree limpo, identidade única e toda evidência local vinculada ao SHA |
| REM-019 | F-004 | BLOCKED_HUMAN | REM-018 | Com autorização de push/branch, publicar o SHA e obter todos os required checks terminais verdes no mesmo SHA |
| REM-020 | F-011 | BLOCKED_EXTERNAL | REM-019 | Construir/publicar API, worker e SPA uma única vez; gerar digest, SBOM e scan do artefato publicado sem HIGH/CRITICAL não aceito |
| REM-021 | F-011 | BLOCKED_EXTERNAL | REM-020 | Assinar, emitir/verificar attestations e executar release encadeado sem rebuild; manifest, `ci_sha` e `release_sha` convergem |

## P0 target — dados, recuperação e desempenho

| ID | Achado | Estado inicial | Dependências | Entrega e aceite observável |
| --- | --- | --- | --- | --- |
| REM-022 | F-006 | BLOCKED_EXTERNAL | REM-021 | No target aprovado, provar isolamento de leitura/escrita cross-tenant com roles runtime, owner e `FORCE RLS`; qualquer vazamento reprova |
| REM-023 | F-007 | BLOCKED_EXTERNAL | REM-021 | Interromper/reiniciar worker no target e provar lease, fencing, redelivery, idempotência e uma única materialização de efeitos |
| REM-024 | F-009 | BLOCKED_HUMAN | REM-021 | Executar backup/restore/rollback representativo, verificar hashes/contagens/RLS e medir RPO/RTO contra limites previamente aprovados |
| REM-025 | F-010 | BLOCKED_HUMAN | REM-021 | Executar carga e soak aprovados; registrar p50/p95/p99, erro, fila, CPU/memória/conexões, SLO e resposta dos alertas |
| REM-030 | F-023 | BLOCKED_HUMAN | REM-016, REM-021 | Executar install/upgrade/mixed-version, locks e rollback no target; nenhuma migration destrutiva sem plano e autoridade |
| REM-031 | F-008 | BLOCKED_EXTERNAL | REM-022, REM-023, REM-030 | Executar golden path clínico candidate-bound do cadastro ao atendimento/internação/comanda/recebimento/auditoria |
| REM-032 | F-008 | BLOCKED_EXTERNAL | REM-031 | Provar invariantes de autoria, timestamps, tenant, imutabilidade/retificação e trilha de auditoria clínica |

## P1 — arquitetura e concentração

| ID | Achado | Estado inicial | Dependências | Entrega e aceite observável |
| --- | --- | --- | --- | --- |
| REM-026 | F-015 | TODO | REM-003 | Extrair de `server.ts` uma fatia coerente de composição/infraestrutura, reduzir abaixo do limite sem elevar o teto e preservar API/testes |
| REM-027 | F-016 | TODO | REM-009 | Atualizar inventário de hotspots com owners, limites decrescentes e ordem por risco; gate rejeita crescimento não aprovado |
| REM-028 | F-016 | TODO | REM-027 | Dividir páginas SPA de pacientes, vendas, prontuário, relatórios, agenda, dashboard e layout por domínio/estado, preservando UX e a11y |
| REM-029 | F-016 | TODO | REM-027 | Decompor módulo de relatórios e runner do worker em boundaries testáveis, preservando concorrência, retries e contratos públicos |

## P1 — paridade e integrações

| ID | Achado | Estado inicial | Dependências | Entrega e aceite observável |
| --- | --- | --- | --- | --- |
| REM-033 | F-014 | BLOCKED_HUMAN | REM-018 | Congelar matriz 11/11, fixtures, owners e critérios por área; presença de tela/endpoint não conta como paridade |
| REM-034 | F-014 | BLOCKED_EXTERNAL | REM-033 | Homologar laboratório externo: pedido, coleta, envio, resultado estruturado, falha/retry, reconciliação e auditoria |
| REM-035 | F-014 | BLOCKED_EXTERNAL | REM-033 | Homologar fiscal: sandbox/município/certificado, emissão, rejeição, cancelamento, contingência e auditoria |
| REM-036 | F-014 | BLOCKED_EXTERNAL | REM-033 | Homologar cartão/PIX: criação, liquidação, conciliação, timeout, duplicidade, estorno e falha parcial sem efeito financeiro duplicado |
| REM-037 | F-014 | BLOCKED_EXTERNAL | REM-033 | Homologar marketing/provider: consentimento, envio, bounce, opt-out, retry e trilha LGPD |
| REM-038 | F-014 | TODO | REM-033 | Completar família de relatórios Vetus acordada, com semântica de datas, filtros, totais, exportação e autorização tenant-scoped |
| REM-039 | F-014 | BLOCKED_HUMAN | REM-033 | Fechar usuários/acessos/LGPD: least privilege, consentimento, retenção, acesso/correção/exclusão e aprovação DPO |
| REM-040 | F-014 | BLOCKED_EXTERNAL | REM-033 | Homologar Live Pet, Live Lab e Vetus: autenticação, idempotência, replay, indisponibilidade e reconciliação |

## P0 humano — acessibilidade, UAT e release

| ID | Achado | Estado inicial | Dependências | Entrega e aceite observável |
| --- | --- | --- | --- | --- |
| REM-041 | F-012 | BLOCKED_HUMAN | REM-031, REM-033–REM-040 | Executar browser matrix, teclado, leitor de tela, contraste, foco, zoom e erros; corrigir blockers WCAG definidos pelo programa |
| REM-042 | F-012 | BLOCKED_HUMAN | REM-031, REM-041 | Conduzir UAT com recepção, clínica, internação, caixa, estoque e gestão; registrar cenários, defeitos, reteste e aceite reais |
| REM-043 | F-013 | BLOCKED_HUMAN | REM-021–REM-025, REM-030–REM-042 | Obter decisões vinculadas ao SHA de Product/Clinical, Security/DPO, Operations/SRE e Release authority |

## P2/P3 — sustentabilidade e higiene

| ID | Achado | Estado inicial | Dependências | Entrega e aceite observável |
| --- | --- | --- | --- | --- |
| REM-044 | F-026 | TODO | REM-002 | Expirar refs/objetos seguros e medir `.git`; manter rollback preservado pelo prazo aprovado e evitar estado gerado massivo |
| REM-045 | F-027 | TODO | REM-001 | Classificar artefatos, definir TTL/quota/ACL, implementar limpeza dry-run e impedir exclusão de evidência legal/ativa |
| REM-046 | F-028 | TODO | REM-007 | Reduzir builds duplicados/logs ruidosos, falhar pelo primeiro erro útil e tratar warnings JSDOM esperados sem ocultar inesperados |
| REM-047 | F-029 | TODO | REM-013 | Adicionar testes ao pacote chaos; documentar e testar contratos runtime de shared/contracts/types quando aplicável |
| REM-048 | F-030 | TODO | REM-013 | Inventariar `any`, priorizar fronteiras clínicas/financeiras/externas e reduzir sem casts cosméticos; typecheck e testes passam |
| REM-049 | F-031 | TODO | REM-003 | Eliminar warning ESM do validador OpenAPI por extensão/configuração coerente; validação continua passando |
| REM-050 | F-032 | TODO | REM-003 | Corrigir política de `.gitignore` para lockfile, adicionar teste de clean checkout e provar que mudança do lock aparece no Git |
| REM-051 | F-033 | TODO | REM-007 | Corrigir geração dos nomes de testes FK para exibir tabela/coluna/referência reais; known-bad gera diagnóstico acionável |
| REM-052 | F-024/F-025 | TODO | REM-011, REM-012 | Automatizar verificação de identidade, contagens P0, freshness e links nos índices documentais |

## Fechamento

| ID | Achado | Estado inicial | Dependências | Entrega e aceite observável |
| --- | --- | --- | --- | --- |
| REM-053 | F-005/F-024/F-025 | TODO | REM-021–REM-052 | Reconciliar identidade, P0 registry, Quality Bar, docs, backlog/control plane e evidências; nenhuma contradição material |
| REM-054 | F-001–F-033 | TODO | REM-053 | Reauditoria completa em checkout limpo, com score 0–100, lista residual, crítica separada e evidência fresca |
| REM-055 | F-013 | BLOCKED_HUMAN | REM-043, REM-054 | Autoridades realizam go/no-go; agente registra decisão exata sem inferir aprovação |

## Matriz de cobertura dos achados

| Achado | Tarefas de remediação |
| --- | --- |
| F-001 | REM-001, REM-002 |
| F-002 | REM-004–REM-006, REM-009 |
| F-003 | REM-007, REM-009 |
| F-004 | REM-010, REM-018, REM-019 |
| F-005 | REM-012, REM-053 |
| F-006 | REM-022 |
| F-007 | REM-023 |
| F-008 | REM-031, REM-032 |
| F-009 | REM-024 |
| F-010 | REM-025 |
| F-011 | REM-017, REM-020, REM-021 |
| F-012 | REM-041, REM-042 |
| F-013 | REM-043, REM-055 |
| F-014 | REM-033–REM-040 |
| F-015 | REM-026 |
| F-016 | REM-027–REM-029 |
| F-017 | REM-003, REM-008 |
| F-018 | REM-004 |
| F-019 | REM-005 |
| F-020 | REM-015 |
| F-021 | REM-013 |
| F-022 | REM-014 |
| F-023 | REM-016, REM-030 |
| F-024 | REM-010, REM-011, REM-052, REM-053 |
| F-025 | REM-011, REM-052, REM-053 |
| F-026 | REM-002, REM-044 |
| F-027 | REM-045 |
| F-028 | REM-046 |
| F-029 | REM-047 |
| F-030 | REM-048 |
| F-031 | REM-049 |
| F-032 | REM-050 |
| F-033 | REM-051 |

## Ordem imediata

1. Selecionar `REM-001` e preservar o trabalho.
2. Preparar `REM-002`, mas pausar antes da reescrita até autorização humana.
3. Em paralelo seguro, executar `REM-003–REM-008`.
4. Executar `REM-013–REM-017` e `REM-026` para satisfazer `REM-009`.
5. Somente depois congelar `REM-018` e solicitar autorização de push.

## Política de bloqueio

Quando uma tarefa externa/humana chegar ao seu boundary, o agente deve:

1. concluir tudo que for local, reversível e independente da decisão;
2. registrar evidência e a ação exata que falta;
3. marcar `BLOCKED` no control plane sem inventar dependência concluída;
4. avançar para outra tarefa `READY` que não dependa do blocker;
5. nunca substituir aceite por documentação ou mock.
