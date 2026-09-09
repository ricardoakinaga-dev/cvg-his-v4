---
document_status: current
document_kind: backlog
effective_date: 2026-09-07
owner: PMO, Produto e Liderança técnica CVG-HIS
review_cycle: weekly
---

# Backlog executivo — ERP State of Art / Triplo AAA

## Registro de execução — 07/09/2026

O backlog continua sendo a superfície de execução e não deve converter
`PASS_BOUNDED` em `DONE`. Nesta rodada foram implementados ou fortalecidos:

- modo estrito de banco (`REQUIRE_TEST_DB`) e guards de schema/policies/RLS
  forçado antes de expor repositórios persistentes da API e do worker;
- migration 0163 incremental para `FORCE RLS` no runtime persistente de
  relatórios, preservando a migration histórica 0048;
- migration 0164 para permitir a cascata legítima de itens de billing após a
  remoção do pai, preservando o bloqueio de mutações reservadas;
- migration 0162 e alocador transacional de numeração durável de vendas;
- regressão PostgreSQL para a cascata de encounter/billing e E2E SPA 9/9 contra
  PostgreSQL/Redis reais, com cleanup sem erro;
- regressões de bootstrap para schema incompleto e suíte completa local verde;
- navegação, scroll/foco e componentes compartilhados do frontend, com testes
  SPA/design system verdes.
- matriz visual SPA estabilizada e reproduzível em **29/29** casos; snapshots
  antigos foram substituídos somente após inspeção das diferenças e o vídeo
  decorativo do login foi tornado determinístico para a evidência;
- auditoria master de usabilidade em **299/299** casos, cobrindo 149 rotas em
  desktop e mobile mais o gate agregado, usando página nova por rota.
- lote crítico de jornadas, acessibilidade e superfícies enterprise em
  **40/40** casos, incluindo RBAC, internação, agenda, billing, axe,
  responsividade, relatórios e finanças.
- lote D de integração e UX em **40/40**, cobrindo NFS-e, setup, isolamento
  tenant, Vetus, webhooks e os 29 snapshots visuais reproduzíveis.

Esses resultados suportam parcialmente `AAA-002`, `AAA-005`, `AAA-011`,
`AAA-012`, `AAA-013`, `AAA-021`, `AAA-025`, `AAA-035` e `AAA-044`, mas não
fecham nenhum ticket de certificação. A atualização foi validada no mesmo
estado observado com `pnpm test`, `pnpm test:critical`, E2E scoped,
`pnpm typecheck`, `pnpm lint`, `pnpm build` e os validadores técnicos. O
`readiness:enterprise` permanece em 92/100 (exit 1) por paridade Vetus; banco
dedicado de target, providers, CI remoto, aceite humano e revisão independente
continuam bloqueadores.

**Programa:** [plano executivo](./2026-09-06-plano-executivo-erp-state-of-art-triplo-aaa.md)  
**Roadmap:** [roadmap AAA](./2026-09-06-roadmap-erp-state-of-art-triplo-aaa.md)  
**Baseline:** [relatório atual](./2026-09-06-relatorio-estado-atual-erp-cvg-his-v4.md) — 75/100  
**Continuidade:** os IDs `AAA-001` a `AAA-050` preservam a intenção dos `R05-001` a `R05-050` do backlog de consolidação de 05/09.

Este é o backlog de execução do programa. Implementação existente entra como `REVIEW` quando ainda falta prova do escopo; `PASS_BOUNDED` não equivale a `DONE`. Nenhum ticket fecha por presença de arquivo, endpoint, mock, screenshot isolado ou teste pulado.

## 1. Estados, prioridade e Definition of Ready

| Estado    | Significado                                                                               |
| --------- | ----------------------------------------------------------------------------------------- |
| `READY`   | escopo, owner, dependências, ambiente, fixtures e aceite estão definidos                  |
| `DOING`   | execução ativa com próxima ação registrada                                                |
| `REVIEW`  | implementação ou evidência bounded existe e aguarda revisão/integração/aceite             |
| `BLOCKED` | impedimento externo ou técnico explícito, com owner e data de revisão                     |
| `DONE`    | critério inteiro observado, evidência atual vinculada, revisão concluída e riscos aceitos |

`P0` bloqueia segurança, integridade financeira, isolamento ou o caminho crítico. `P1` bloqueia release amplo ou paridade. `P2` é evolução importante sem bloquear o primeiro release aprovado.

Antes de `READY`: owner nominal, revisor, escopo, dependências, ambiente, dados sanitizados, estimativa, risco e rollback. Antes de `DONE`: resultado positivo e negativo, regressão, SHA/digest, comando, artefato, limitações, revisão e atualização da matriz/dashboard.

## 2. F0/F1 — mobilização, evidência e fundação

| ID      | Ref.    | Pri. | Estado  | Owner          | Esforço | Dependências              | Entrega e critério de aceite                                                                                                                                                                                                                       |
| ------- | ------- | ---- | ------- | -------------- | ------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AAA-001 | R05-001 | P0   | REVIEW  | QA/LT          | S       | —                         | Congelar snapshot de partida: HEAD, worktree, versões, escopo e inventário de evidências. O relatório deve identificar o que é atual, supporting, histórico e inválido para promoção.                                                              |
| AAA-002 | R05-002 | P0   | REVIEW  | OPS/DB         | L       | AAA-001                   | Prover PostgreSQL e Redis dedicados, Docker ou equivalente. O equivalente local já passou no critical gate sem fallback, com logs e cleanup; target, capacidade e evidência remota ainda faltam.                                                   |
| AAA-003 | R05-003 | P0   | BLOCKED | Comitê/Produto | M       | AAA-001                   | Registrar escopo de release, providers, município fiscal, target, RPO/RTO, SLO, owners, aprovadores e janelas de homologação. Sem decisão, manter dependências bloqueadas.                                                                         |
| AAA-004 | R05-004 | P0   | REVIEW  | FIN/BE         | M       | AAA-003                   | Consolidar captura de cartão: payload inconsistente, pending/failed, timeout, replay, idempotência, auditoria e reconciliação não podem virar sucesso. O adapter atual corrigido deve passar sandbox real antes de promoção.                       |
| AAA-005 | R05-005 | P0   | REVIEW  | QA/PLAT        | M       | AAA-001                   | Reconciliar contrato de CI, coverage, critical gate e workflow. A mesma regra deve falhar em caso negativo, executar sem skip oculto e produzir artefatos ligados ao SHA.                                                                          |
| AAA-006 | R05-006 | P1   | READY   | LT/BE          | L       | AAA-001                   | Decompor `apps/api/src/server.ts` e composition roots por fronteira estável, preservando contratos e regressões. Reduzir concentração sem elevar o limite de complexidade para ficar verde.                                                        |
| AAA-007 | R05-007 | P1   | READY   | LT/FE          | L       | AAA-001                   | Decompor páginas SPA críticas, começando por PatientDetail e Agenda. Extrair estados/fluxos testáveis, manter acessibilidade e provar antes/depois sem regressão visual.                                                                           |
| AAA-008 | R05-008 | P1   | REVIEW  | SEC/QA         | M       | AAA-001                   | Classificar a superfície SOC2: separar controles executados de resultados demonstrativos. Nenhum `passed` sintético de DR/scanner pode aparecer como certificação; cada controle deve apontar para evidência real ou `NOT_RUN`.                    |
| AAA-009 | R05-009 | P0   | DOING   | QA/LT          | M       | AAA-001                   | Publicar mapa de cobertura por componente, risco e métrica, incluindo as 575 fontes ativas e cinco shards. Registrar exclusões, motivo e lacuna; preservar meta mínima de 85% no escopo crítico.                                                   |
| AAA-010 | R05-010 | P0   | BLOCKED | QA/BE          | L       | AAA-009                   | Integrar instrumentação semântica reproduzível para statement/function/branch, incluindo Euler/source maps, hashes, reinício, SIGKILL e budgets. Rejeitar fixtures adulteradas; não instrumentar produção.                                         |
| AAA-011 | R05-011 | P0   | REVIEW  | DB/SEC         | L       | AAA-002                   | Fechar roles e RLS no banco dedicado: `safe=true`, `NOBYPASSRLS`, grants mínimos, tenant A/B negativo, owner e `FORCE RLS`. O modo estrito deve permanecer obrigatório em promoção.                                                                |
| AAA-012 | R05-012 | P0   | REVIEW  | QA/DB          | L       | AAA-002, AAA-011          | Critical database/process gate local passou em schema limpo: 65 arquivos/594 testes e 10/10 processos, com cleanup. Repetição, SHA limpo, CI remoto e target ainda impedem `DONE`.                                                                 |
| AAA-013 | R05-013 | P0   | REVIEW  | QA/FE          | L       | AAA-002, AAA-011          | E2E scoped passou 9/9 contra API, PostgreSQL e Redis reais — personas hospitalares e Busca Mestre 360 — com cleanup sem erro. Completar internação/alta, financeiro amplo, estados, a11y, tenant A/B, target, CI e recertificação antes de `DONE`. |
| AAA-014 | R05-014 | P0   | READY   | QA/LT          | M       | AAA-005, AAA-012, AAA-013 | Produzir checkpoint técnico com SHA limpo, testes, artefatos, limitações e decisão `PASS_BOUNDED` ou `FAIL`. Não chamar checkpoint de release candidate.                                                                                           |
| AAA-015 | R05-015 | P0   | BLOCKED | PLAT/OPS       | M       | AAA-014                   | Provar CI remoto, proteção de `main`, artefato SHA/digest/SBOM, Helm executável e retenção. O mesmo SHA deve passar novamente após a verificação do manifest de release.                                                                           |
| AAA-016 | R05-016 | P1   | DOING   | PMO/LT         | M       | AAA-001                   | Manter índice canônico, precedência, status, owners e links. Rotular 02/09 e 05/09 como histórico/supporting sem apagar evidência; cada nota deve apontar para procedimento atual.                                                                 |

## 3. F2/F3 — produto, finanças, relatórios e paridade

| ID      | Ref.    | Pri. | Estado  | Owner        | Esforço | Dependências              | Entrega e critério de aceite                                                                                                                                                                                                            |
| ------- | ------- | ---- | ------- | ------------ | ------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AAA-017 | R05-017 | P1   | READY   | PROD/QA      | M       | AAA-012, AAA-016          | Converter a paridade Vetus em matriz comportamental por domínio: cenário, dados, permissão, persistência, erro, reconciliação, evidência e aceite. Arquivo existente sozinho não conta.                                                 |
| AAA-018 | R05-018 | P1   | READY   | PROD/REPORTS | M       | AAA-017                   | Inventariar relatórios requeridos, existentes e novos, com campos, fonte, período UTC, filtros, volume, totais e amostra esperada. Separar relatório cancelado, cheque, antecipado e personalizado.                                     |
| AAA-019 | R05-019 | P1   | REVIEW  | BE/QA        | M       | AAA-012, AAA-018          | Certificar histórico de cancelamentos em banco: `audit_events`, autor, motivo, instante, valores congelados, API, CSV, worker, limite de 10.000, busca, A/B e recusa de snapshot incompleto.                                            |
| AAA-020 | R05-020 | P1   | READY   | BE/FE/PROD   | L       | AAA-018, AAA-019          | Completar famílias históricas e personalizadas por subtarefa, reusando fontes válidas. Negócio reconcilia linhas/totais; export é auditável, UTF-8, decimal seguro e declara limites.                                                   |
| AAA-021 | R05-021 | P1   | BLOCKED | BE/OPS       | L       | AAA-003, AAA-019, AAA-020 | Homologar relatório agendado e entrega externa: lease, concorrência, timeout, retry, restart/SIGKILL, não duplicidade, falha terminal e rastreio por conta/chave. Simulação é apenas pré-teste.                                         |
| AAA-022 | R05-022 | P0   | BLOCKED | FIN/BE       | L       | AAA-003, AAA-004, AAA-011 | Homologar cartão e split no sandbox aprovado: criação, autorização, captura, rejeição, consulta, timeout, repasse e reconciliação no ledger, com replay seguro e estados finais explícitos.                                             |
| AAA-023 | R05-023 | P0   | BLOCKED | FIN/BE       | L       | AAA-003, AAA-011          | Homologar PIX/settlement: cobrança, callback assinado, adulteração, replay, evento atrasado, retry/DLQ, concorrência, uma aplicação e reconciliação de saldo/valor.                                                                     |
| AAA-024 | R05-024 | P0   | BLOCKED | FIN/BE       | L       | AAA-022, AAA-023          | Fechar estorno e conciliação não-caixa: refund total/parcial quando suportado, rejeição, timeout, divergência, compensação, auditoria e valor original preservado. Caso não suportado bloqueia claramente.                              |
| AAA-025 | R05-025 | P1   | REVIEW  | FIN/BE       | M       | AAA-012, AAA-024          | Reconciliar caixa, contas a receber/pagar, antecipados, bancos, máquinas, split, comissões e export após restart. Cadastros existentes são revalidados, não declarados prontos por presença.                                            |
| AAA-026 | R05-026 | P1   | REVIEW  | INV/PROD     | M       | AAA-012                   | Certificar compras, fornecedores, recebimento, lote/validade, transferência, cancelamento/compensação e consumo clínico no ledger, com concorrência, A/B e diferença explícita para livro fiscal.                                       |
| AAA-027 | R05-027 | P1   | READY   | PROD/QA      | L       | AAA-013, AAA-025, AAA-026 | Executar roteiros de tutor/paciente, agenda/fila/triagem, atendimento/prontuário, prescrição, cirurgia, internação/alta, serviços, venda, orçamento/pacote/fidelidade e RH/comissões. Registrar cobertura, permissões, retry e efeitos. |
| AAA-028 | R05-028 | P1   | REVIEW  | BE/SEC       | M       | AAA-011, AAA-013          | Certificar API keys, webhooks e notificações internas: assinatura, rotação/revogação, autorização, outbox, timeout/retry, isolamento, persistência e recuperação distribuída.                                                           |

## 4. F4 — providers, migração e storage

| ID      | Ref.    | Pri. | Estado  | Owner     | Esforço | Dependências                       | Entrega e critério de aceite                                                                                                                                                           |
| ------- | ------- | ---- | ------- | --------- | ------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AAA-029 | R05-029 | P1   | BLOCKED | LAB/BE    | L       | AAA-003, AAA-011, AAA-017          | Homologar laboratório/Live Lab: equipamento, referência, pedido, coleta, resultado, laudo, assinatura, revisão, sync, atraso, duplicidade, erro e reconciliação no sandbox.            |
| AAA-030 | R05-030 | P1   | BLOCKED | FISCAL/BE | L       | AAA-003, AAA-011                   | Homologar NFS-e no município definido: secret/certificado, emissão, consulta, rejeição, cancelamento, timeout, retry, XML/PDF e auditoria reconciliados. Simulador não fecha o ticket. |
| AAA-031 | R05-031 | P1   | BLOCKED | MKT/BE    | L       | AAA-003, AAA-028                   | Homologar e-mail, SMS e WhatsApp por canal: consentimento, envio, callback, bounce, opt-out, rate limit, retry e bloqueio de envio sem consentimento.                                  |
| AAA-032 | R05-032 | P1   | BLOCKED | PROD/BE   | L       | AAA-003, AAA-028                   | Homologar Live Pet: contrato de entidades, sync, duplicidade, conflito, erro, retry e reconciliação no sandbox autorizado; dividir por entidade se necessário.                         |
| AAA-033 | R05-033 | P1   | BLOCKED | DB/PROD   | L       | AAA-017, AAA-026, AAA-029, AAA-032 | Homologar importação Vetus no destino com dados sanitizados: contagens/checksums, rejeitados, retomada, idempotência, concorrência, rollback e reconciliação clínica/financeira.       |
| AAA-034 | R05-034 | P1   | BLOCKED | OPS/SEC   | M       | AAA-003, AAA-011                   | Provar storage e scanner reais: conteúdo permitido, rejeição, indisponibilidade fail-closed, acesso A/B, auditoria e inclusão no backup/restore.                                       |

## 5. F5 — operação, segurança e conformidade

| ID      | Ref.    | Pri. | Estado  | Owner    | Esforço | Dependências                                                  | Entrega e critério de aceite                                                                                                                                                                     |
| ------- | ------- | ---- | ------- | -------- | ------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AAA-035 | R05-035 | P0   | BLOCKED | OPS/PLAT | M       | AAA-015, AAA-003                                              | Publicar artefatos imutáveis com SHA/digest/SBOM/provenance; Helm executável em dev/staging/prod e probes no target. Fallback estático reprova o gate obrigatório.                               |
| AAA-036 | R05-036 | P1   | READY   | DB/OPS   | M       | AAA-011, AAA-015                                              | Ensaiar instalação vazia, seed idempotente, drift de checksum, upgrade compatível e rollback por digest. Nunca editar migration aplicada nem usar SQL destrutivo automático.                     |
| AAA-037 | R05-037 | P0   | BLOCKED | DB/OPS   | L       | AAA-002, AAA-003, AAA-034, AAA-036                            | Aprovar RPO/RTO antes do drill; restaurar globals, banco, storage e configuração representativos, verificar hashes/contagens/RLS e medir tempos reais.                                           |
| AAA-038 | R05-038 | P1   | READY   | PROD/OPS | S       | AAA-003                                                       | Fixar perfil de capacidade, volume, crescimento, concorrência e SLO. Usar referência p95 <200 ms, p99 <500 ms e 5xx <0,1% até decisão formal diferente.                                          |
| AAA-039 | R05-039 | P1   | BLOCKED | OPS/QA   | L       | AAA-027, AAA-035, AAA-038                                     | Executar carga e endurance com dados/tenants descartáveis, login e writes reais, recursos registrados, percentis por jornada e margem acordada. Falha de setup invalida benchmark.               |
| AAA-040 | R05-040 | P0   | BLOCKED | SRE/BE   | L       | AAA-021, AAA-028, AAA-029, AAA-030, AAA-031, AAA-032, AAA-035 | Provar trace/correlation SPA→API→DB/Redis→worker→provider; game day de API, banco, Redis, worker, rede e provider com alerta acionável, recuperação medida e zero duplicação.                    |
| AAA-041 | R05-041 | P1   | REVIEW  | SEC/OPS  | M       | AAA-015, AAA-035                                              | Executar scan atual de dependências, SAST, segredos, SBOM e supply chain; exercitar rotação/revogação, break-glass e auditoria no target. Scan antigo não vale como estado atual.                |
| AAA-042 | R05-042 | P0   | BLOCKED | SEC/DPO  | M       | AAA-027, AAA-034, AAA-035                                     | Obter aceite independente de roles/MFA, A/B, DSR, exportação, correção, retenção, anonimização, mascaramento e acesso privilegiado no tenant autorizado. Não presumir conformidade por endpoint. |
| AAA-043 | R05-043 | P1   | BLOCKED | SEC/OPS  | M       | AAA-008, AAA-037, AAA-040, AAA-041, AAA-042                   | Ligar controles de conformidade a scanner, revisão, incidentes e DR reais com data/ambiente/owner; detectar evidência ausente/vencida/simulada e declarar que não é certificação SOC2 Type II.   |

## 6. F6/F7 — experiência, certificação e decisão

| ID      | Ref.    | Pri. | Estado  | Owner          | Esforço | Dependências                                    | Entrega e critério de aceite                                                                                                                                                                                     |
| ------- | ------- | ---- | ------- | -------------- | ------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AAA-044 | R05-044 | P0   | BLOCKED | PROD/QA/UX     | L       | AAA-027, AAA-029–034, AAA-042                   | Congelar candidato e executar UAT, revisão visual e a11y: funções hospitalares e domínios do release, 375/768/1440, light/dark, estados, teclado, foco e leitor de tela. Revisão independente e zero bloqueador. |
| AAA-045 | R05-045 | P0   | BLOCKED | QA/OPS         | L       | AAA-010, AAA-015, AAA-017, AAA-020–043, AAA-044 | Recertificar mesmo SHA em checkout limpo: todos os gates, três rodadas Playwright integrais, browsers críticos e 20 repetições sem retry oculto, skip ambiental, falha ou flaky.                                 |
| AAA-046 | R05-046 | P0   | BLOCKED | OPS/PROD       | M       | AAA-036, AAA-037, AAA-040, AAA-045              | Ensaiar cutover e rollback cronometrados no target, com reconciliação, plantão, checkpoints, gatilhos de abortar e retorno de serviço/dados dentro das metas. Ensaio não é corte de produção.                    |
| AAA-047 | R05-047 | P0   | BLOCKED | Comitê/LT/PROD | S       | AAA-042, AAA-043, AAA-044, AAA-045, AAA-046     | Reauditar os mesmos 67 itens, publicar dossiê, score ≥95, dimensões ≥90, nenhum crítico <85 e zero gate obrigatório aberto. Registrar go/no-go, exceções e autoridade.                                           |

## 7. F8 — evolução e manutenção

| ID      | Ref.    | Pri. | Estado | Owner       | Esforço | Dependências              | Entrega e critério de aceite                                                                                                                                                                 |
| ------- | ------- | ---- | ------ | ----------- | ------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AAA-048 | R05-048 | P2   | READY  | PROD/BE/SEC | L       | AAA-017, AAA-027          | Validar ML/OCR/anomalias com finalidade, baseline, dataset sanitizado, métricas, erro, generalização, limites e revisão clínica. Sem prova, manter experimental e fora de decisões críticas. |
| AAA-049 | R05-049 | P2   | READY  | LT/FE/BE    | L       | AAA-006, AAA-007, AAA-014 | Reduzir hotspots restantes por extrações incrementais em API, SPA, reports, vendas e worker, preservando contratos, ownership e testes. Não elevar orçamento para acomodar crescimento.      |
| AAA-050 | R05-050 | P2   | DOING  | PMO/LT/QA   | M       | AAA-016, AAA-017, AAA-043 | Instituir revisão mensal de evidência/documentação: risco, owner, vencimento, SHA, retenção de artefatos, duplicações e nova nota somente com prova fresca.                                  |

## 8. Dependências, bloqueios e regra de fechamento

| Bloqueio                                                | Tickets afetados           | Ação para desbloquear                                                                             |
| ------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------- |
| Runtime local disponível; target/CI/capacidade ausentes | AAA-013, 035–040           | OPS/DB registrar o equivalente local e prover target/CI com versões, acesso, cleanup e autoridade |
| Providers, certificados e credenciais                   | AAA-003, 022–024, 029–034  | Comitê decidir escopo e owners; provider entregar sandbox e janela de homologação                 |
| Worktree misto e SHA não congelado                      | AAA-001, 014, 015, 044–047 | congelar candidato, gerar manifest e renovar evidências afetadas                                  |
| Cobertura crítica não integrada                         | AAA-009, 010, 012, 045     | aprovar instrumentação, manter 575 fontes/5 shards/85% e conectar ao gate                         |
| Aceite humano e DPO                                     | AAA-042, 044, 047          | nomear revisores e executar roteiros, não substituir por contrato de pacote                       |

Os tickets grandes devem ser decompostos em subtarefas sem reduzir seu critério pai. A transição para `DONE` exige evidência atual, review independente quando aplicável, limitações e links para [matriz de requisitos](./engineering/REQUIREMENT_EVIDENCE_MATRIX.md) e [dashboard](./engineering/EVIDENCE_RISK_DASHBOARD.md). Uma alteração material após a evidência reabre o ticket afetado.

## 8.1 Revalidação executiva — 2026-09-07

O [registro do critical gate](engineering/CRITICAL_GATE_2026-09-07.md) fecha
`pnpm test:critical` com exit 0 em runtime local efêmero: 65/65 arquivos e
594/594 testes na perna de banco/setup, além de 10/10 cenários de processo.
O [E2E SPA](engineering/E2E_SPA_2026-09-07.md) passou 9/9 contra
API/PostgreSQL/Redis reais e limpou os dados sem erro; a matriz visual passou
29/29 e a auditoria master 299/299. Por isso `AAA-002`, `AAA-012` e `AAA-013`
ficam em `REVIEW`, não `DONE`: ainda dependem de target, CI/SHA de release,
matriz completa de jornadas, roles/grants finais, providers, a11y independente
e repetição de recertificação.

## 9. Próxima fila recomendada

1. `AAA-002`, `AAA-003` e `AAA-001`: ambiente, decisões e snapshot.
2. `AAA-004`, `AAA-005`, `AAA-011` e `AAA-012`: dinheiro, CI, roles e critical gate.
3. `AAA-014` e `AAA-015`: candidato e release imutável.
4. `AAA-017` a `AAA-028`: paridade, relatórios e ciclo financeiro.
5. `AAA-029` a `AAA-043`: providers, operação e conformidade.
6. `AAA-044` a `AAA-047`: certificação somente depois dos gates anteriores.

O estado inicial de acompanhamento do checkpoint anterior (`R05`: 31 REVIEW, 3 DOING, 16 BLOCKED, 0 DONE) é preservado como referência histórica; a execução corrente deve atualizar os estados `AAA-*` com evidência, não inferi-los por equivalência de nomes.
