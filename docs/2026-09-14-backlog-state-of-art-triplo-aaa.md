---
document_status: historical
document_kind: backlog
effective_date: 2026-09-14
owner: Liderança técnica, Produto e Operações CVG-HIS
review_cycle: on-task-completion
superseded_by: docs/2026-09-20-backlog-nova-rodada-melhorias.md
---

# Backlog executável — melhorias integrais State of Art / Triplo AAA

[Baseline](2026-09-14-relatorio-completo-estado-construcao.md) · [Plano executivo](2026-09-14-plano-executivo-state-of-art-triplo-aaa.md) · [Roadmap](2026-09-14-roadmap-state-of-art-triplo-aaa.md)

## 1. Contrato de execução e estados

**65 contratos: PROD-001–047 preservados; PROD-048–065 acrescentados. Nenhum novo DONE nesta publicação.** Os IDs mantêm rastreabilidade com o [backlog histórico de 13/09](2026-09-13-backlog-prontidao-producao.md), inclusive MA/REM/R1 ali registrados. Os aceites abaixo atualizam o trabalho necessário sem apagar evidência ou converter reparos já existentes em novos defeitos.

Este documento é canônico para escopo, prioridades, dependências e aceites. `.agent/backlog.json` é canônico para estado operacional, depois da reconciliação PROD-001. O estado de publicação dos cartões é **PLANEJADO / REVALIDAÇÃO NECESSÁRIA**, não uma substituição em massa dos estados anteriores. PROD-001 é o único despacho inicial: recuperar e reconciliar. Para 004/005/011/012/013/018, começar pela revalidação do que já existe, não pela reimplementação.

Estados de execução a registrar no controlador conforme seu contrato: TODO → READY → IN_PROGRESS → VERIFY → DONE; BLOCKED com causa/dono/condição de desbloqueio, sem apagar progresso. Um cartão só fica READY com WHAT/HOW suficientes, dependências, ambiente e autoridades aplicáveis disponíveis. G exige decomposição em fatias comportamentais antes de despacho. R1/R2 ou subtarefas não renumeram o cartão.

### Definition of Done comum, cumulativa com cada linha

1. Contrato esperado e reprodução/baseline registrados; alterações na allowlist e integração completas.
2. Aceite específico da linha observado no caminho público, com casos negativos e invariantes aplicáveis. Mock só prova contrato local, não persistência ou homologação.
3. Testes focais e regressão proporcional aprovados; zero skip em requisito crítico. Falha ambiental explícita não vira PASS.
4. Evidência por tentativa vinculada a fonte/build/config/schema/harness e ambiente, com stdout/stderr saneados, timestamp, exit, hashes e limites; retenção aprovada quando exigida.
5. Crítico separado read-only aprova o escopo material; Lead confere sentinela e integração. Mudança posterior invalida prova afetada.
6. Contratos/docs/estado atualizados em ordem; risco residual aceito por quem tem autoridade. Aceite externo obrigatório ausente mantém o cartão aberto.

P/M/G são tamanho relativo, não dias: P = uma fronteira bem conhecida; M = uma fatia com múltiplos componentes; G = programa de fatias que precisa detalhamento. Donos são papéis a atribuir, não pessoas fictícias aprovando. Nas dependências, números representam PROD-NNN. **002-L** é exclusivamente o subaceite local de identidade; permite o harness avançar sem concluir a retenção externa de PROD-002. **019-L** é especificação local pronta para revisão, não permite implementar regras pendentes de aprovação. Nenhum outro sufixo autoriza ignorar dependência integral.

## 2. Continuidade, ambiente e preservação de reparos — R0/R1

| ID | Prioridade / dono / porte | Depende de | Fronteira e resultado esperado | Aceite específico e prova exigida |
|---|---|---|---|---|
| PROD-001 | P0 / Lead / M | — | `.agent`, documentos canônicos e matriz PROD; reconciliar auditoria de 14/09 com controlador antigo | Os 65 contratos rastreados sem inventar DONE; active task/action/primeiro passo/gate/log coerentes; histórico preservado; checker do controlador + revisão semântica independente |
| PROD-002 | P0 / Lead + Segurança/SRE / M | 001 | Identidade de trabalho, pacote e armazenamento de provas | 002-L: bytes/fontes/config/lock/schema/harness, recursos e run-id congelados; completo: destino controlado aprovado, ACL/retention/integridade/restauração verificadas. Hash errado e prova expirada rejeitados; sem PII nos logs publicados |
| PROD-003 | P0 / Plataforma + QA / M | 001, 002-L | `scripts/run-exclusive-stack.mjs`, build e stack privada | Duas execuções independentes sob recursos próprios; SPA/API/worker/PG/Redis ligados aos mesmos bytes; tamper-negative falha; teardown encerra só recursos próprios; nenhum `fuser -k` indiscriminado |
| PROD-004 | P0 / Dados + Backend / M | 003 | Migração 0172 e consumidor de envelope legado | Executar clean install e upgrade com envelopes completos/parciais/nulos/corrompidos; preservar válidos e metadados; worker real consome as mesmas linhas reparadas sem duplicar efeitos. Logs SQL/worker/restart e reconciliação; não editar 0170/0171 aplicadas |
| PROD-005 | P0 / Backend + Segurança / M | 003 | `idempotency-authorization`, tenant UoW e rotas protegidas | Primeira execução/replay de relatórios com body/path/envelope e permissão dinâmica; revogação, tenant estranho, idempotency-key conflitante e cache não autorizado negados. HTTP+DB multi-instância; preservar guard atual se passar |
| PROD-006 | P0 / Frontend + Financeiro / M | 003 | BillingList, API financeira, paginação/vencimento | Dataset maior que uma página, limites de datas, troca de filtros e retorno; total/páginas/consulta concordam sem perdas/duplicatas. API+DB e browser real; não afirmar bug antigo sem reprodução |
| PROD-007 | P0 / Produto financeiro + Backend / P | 006 | Semântica de títulos cancelados | Contrato aprovado de visibilidade/status; filtro individual/combinado e total concordam na API e UI; caso cancelado não reaparece como aberto. Prova de matriz de filtros |
| PROD-008 | P0 / Financeiro + Frontend / M | 006, 007 | Saldos e cartões/resumos financeiros | Após filtros, pagamento parcial, cancelamento e recarga, saldo/totais batem no subledger; leitura obsoleta não sobrescreve nova. Teste concorrente + UI/DB; sem arredondamento divergente |
| PROD-009 | P1 / Frontend + Produto / M | 008 | Erro/vazio/retry de tutores/financeiro e ação avulsa | Erro de rede/403/5xx distinto de vazio, retry recupera, foco correto; ação avulsa tem contrato explícito e efeito real ou indisponibilidade honesta. Browser e request/estado persistido |
| PROD-010 | P0 / QA de ferramentas / M | 002-L | Promoção e identidade de evidência | Bytes autenticados são os consumidos; fonte/config/teste alterados após coleta, shard errado/ausente ou artefato adulterado impedem promoção. Known-good/bad de scripts de identidade, coleta e promoção |
| PROD-011 | P0 / Dados + QA / M | 004, 010 | Evidência SQL especializada existente | Revalidar denominador de SQL ativos/históricos e runner de migrações; missing migration, schema mismatch e resultado de outro candidato falham. Não substituir execução por presença de arquivo; conservar prova anterior como histórica |
| PROD-012 | P0 / Frontend + QA / M | 003, 010 | Evidência Vue especializada existente | Build/SFC/rotas/testes coerentes com manifesto; mudança de componente/harness invalida prova; validar known-good/bad e renovar evidência no candidato. Não confundir 25 SFC com toda UX |
| PROD-013 | P0 / QA + Arquitetura / M | 010 | Classificação type-only/reexports e instrumentação | AST/emit confirmam exclusão legítima; módulo runtime com counters vazios é rejeitado; novos arquivos/testes entram no inventário. Testes de semântica e descoberta; sem excluir código executável para elevar nota |

## 3. Cobertura, segurança e confiança — R2/R4

| ID | Prioridade / dono / porte | Depende de | Fronteira e resultado esperado | Aceite específico e prova exigida |
|---|---|---|---|---|
| PROD-014 | P0 / Backend + QA segurança / G | 005, 011, 013, 020, 024 | auth e roles/RLS | Linhas/statements/funções/branches ≥85 em cada componente, mais cenários de bypass/negação/MFA/tenant/replay relevantes. Shards instrumentados e testes negativos reais; contagem não substitui adequação |
| PROD-015 | P0 / Backend + QA clínico/financeiro / G | 004, 005, 011, 013, 024, 026 | billing-cash, inpatient, records, prescriptions | As quatro métricas ≥85 em cada área; concorrência, versões, cancelamento e transação parcial testados pela fronteira pública. Dumps/reconciliação e cobertura do mesmo candidato |
| PROD-016 | P0 / Backend + QA integração / G | 010, 011, 013, 024, 025 | http-routes, repositories, pix, webhooks | As quatro métricas ≥85; auth/tenant/erro/retry/restart e idempotência nos casos críticos; especial atenção a repositories 60,46% funções e webhooks 65,73%. Prova de processo/DB, não só mocks |
| PROD-017 | P0 / DX + QA / G | 012, 013, 060, 061 | Gate global, dependências e higiene de suítes | Threshold global vigente ≥82 nas métricas contratadas, build/tipos/lint/testes atuais, skips críticos zero; nenhum exclusion novo sem justificativa semântica. Log completo e matriz de suites/inventário |
| PROD-018 | P0 / Plataforma + QA / M | 014, 015, 016, 017 | CI critical coverage já existente | Integrar cinco shards atuais e especializados, checker PASS sem déficit/proveniência inválida; inventário de jobs inclui o job real e falha propaga. Contrato CI local e run remoto no fechamento; configuração remota em 040 |
| PROD-019 | P0 / Produto + Segurança / M | 001 | Especificação de identidade corporativa | Decidir issuer, tenant/sub, vínculo, provisionamento, MFA, PKCE/state/nonce, sessão, retorno seguro, refresh/revogação/logout e flags; threat model e casos de falha. Contrato assinado por dono antes de 020; 019-L apenas rascunho revisável |
| PROD-020 | P0 / Backend IAM / G | 003, 005, 019 | OAuth/OIDC → identidade interna → sessão ERP | Validar assinatura/claims/issuer/audience/nonce conforme protocolo contratado, rotação JWKS, replay, cancelamento/deadline e erros; nenhum token sensível vazando. Sessão/RBAC/tenant internos e logout integrados, provados com IdP de teste e API/DB |
| PROD-021 | P0 / Frontend IAM + Segurança / G | 020 | Jornada SSO SPA e provider homologado | Login/retorno/erro/flag off/logout funcionam sem open redirect ou sessão órfã; vínculo multi-tenant e revogação demonstrados. Browser+API/DB e sandbox do issuer aprovado; segredo só por mecanismo autorizado |
| PROD-022 | P1 / Backend + DPO/Segurança / M | 003 | Minimização de logs, retenção e acesso | Política de identificadores aprovada, correlação pseudonimizada quando requerida, token/PII fora de erros/logs; retenção e acesso verificáveis. Captura de eventos brute-force/SSO/worker com dados sintéticos e testes de redaction |
| PROD-023 | P1 / Plataforma + Segurança / M | 022, 049 | Edge, headers, diagnóstico e acesso privilegiado | Política por ambiente de CORS/CSP/cookies/TLS/rate limit e health/metrics; APIs internas não expostas indevidamente; testes positivos/negativos no runtime alvo e scanner; sem quebrar primeiro acesso/SSO |
| PROD-024 | P0 / Dados + Segurança / G | 004, 005, 011, 003 | DB/RLS/UoW/auditoria e upgrade | Roles reais sem bypass, isolamento entre tenants em leitura/escrita, rollback, locks e retries; clean/upgrade/restauração; auditoria durável e envelopes coerentes. PostgreSQL real, duas instâncias e reconciliação, zero skip |
| PROD-025 | P0 / Backend worker / G | 004, 005, 024, 050, 051 | Outbox/inbox, leases, fencing e recovery | Duplicatas/ordem/restart/SIGKILL/expiração de lease não duplicam efeito; stuck job não interrompe outros tenants; DLQ/retry/redrive preservam identidade. Processos reais e mesmo DB; testes independentes do in-memory |

## 4. Jornadas e homologação — R3/R5

Cada G de homologação deve ser dividido em `CONTRATO`, `LOCAL` e `ALVO` antes de execução. A prova LOCAL permite continuar trabalho dependente explicitamente replanejado, mas não satisfaz a dependência integral nem o DONE de ALVO. Registrar alterações de dependência no controlador; não assumir esse relaxamento silenciosamente.

| ID | Prioridade / dono / porte | Depende de | Fronteira e resultado esperado | Aceite específico e prova exigida |
|---|---|---|---|---|
| PROD-026 | P0 / Backend + responsável clínico/QA / G | 005, 024, 025, 027 | Triagem, encontro, prontuário, receita/administração, cirurgia, internação/alta | Matriz clínica aprovada; autoria/versão, transições inválidas, leito concorrente, alta/faturamento e restrições profissionais; nenhuma regra clínica inventada. Jornada pública persistida, negativos, auditoria e aceite do responsável |
| PROD-027 | P0 / Produto + QA / M | 001, 003 | Matriz comportamental de 11 áreas e inventário dos 45 módulos | Cada jornada tem dono, fonte contratual, telas/API/persistência/risco/teste/aceite; lacunas e diferenças Vetus explícitas; cobertura de todas áreas e nenhum módulo sem classificação. Aprovação de escopo; arquivo presente não equivale a paridade |
| PROD-028 | P1 / Laboratório + Backend / G | 024, 025, 026, 027 | Diagnósticos, equipamentos, Live Lab | Pedido/coleta/resultado estruturado/correção e rastreabilidade; unidades/referências/rejeições aprovadas; duplicata/timeout tratados. E2E local e sandbox/equipamento autorizado, aceite do laboratório |
| PROD-029 | P1 / Fiscal + Backend / G | 024, 027 | Emissão/cancelamento/rejeição fiscal | Município/provider/certificado definidos; payload/documento e valores corretos, rejeição recuperável e idempotência. XML/PDF aplicáveis, API/DB e sandbox real; homologação fiscal por autoridade, não pelo agente |
| PROD-030 | P0 / Financeiro + Backend/QA / G | 005, 009, 024, 025, 027 | Caixa/PIX/cartão/split/estorno/conciliação | Totais, taxas e estados reconciliados; estorno parcial/total, timeout/webhook duplicado/fora de ordem e chargeback quando contratado. Sandbox externo autorizado e subledger; adapter mock não fecha cartão |
| PROD-031 | P1 / Marketing + Backend / G | 022, 025, 027 | Consentimento, campanhas e canais | Opt-out impede envio inclusive em fila/retry; bounce/rejeição/entrega e tenant auditáveis. Contrato local + sandbox/provider homologado com destinatários de teste; zero contato com clientes reais sem ordem |
| PROD-032 | P1 / Relatórios + Backend/Frontend / G | 024, 025, 027 | Famílias de relatórios, exportação e agendamento | Totais e formatos aplicáveis batem nas fontes; paginação/truncamento explícitos; permissão dinâmica, timezone, cancelamento, retry e entrega reconciliados. Dataset oracle aprovado + UI/API/DB/worker/provider; equivalência personalizada tratada |
| PROD-033 | P0 / Segurança + DPO/Backend / G | 005, 022, 023, 024, 027, 048 | Acesso, DSR e ciclo de dados | Sete perfis/MFA/endpoints/flags e isolamento; retenção/expurgo/exportação/backup coerentes com decisão do dono. Provas em tenant-alvo com dados sintéticos e aceite operacional; sem certificação jurídica automática |
| PROD-034 | P1 / Dados + Produto / G | 024, 025, 027, 028, 029, 030, 031, 032, 033 | Importação Vetus e conectores transversais | Fingerprint/idempotência/rejeitados/retomada, concorrência e rollback/roll-forward; contagens, relações e saldos reconciliados. Browser→API→PG multi-instância e homologação do alvo; Live Pet/Live Lab mapeados sem supor equivalência |
| PROD-035 | P0 / UX + QA + usuários responsáveis / G | 021, 026, 028, 029, 030, 031, 032, 033, 034, 042, 057, 059, 063, 064, 065 | UAT integral e aceite de UX | Matriz 11 áreas concluída por perfis reais em ambiente autorizado; tarefas/erros/tempos registrados, zero blocker essencial; todos problemas materiais resolvidos e retestados. Usuários/aceites identificados + crítico visual novo, ≥95/HIGH; simulação não substitui UAT |

## 5. Operação, arquitetura e release — R4/R7

| ID | Prioridade / dono / porte | Depende de | Fronteira e resultado esperado | Aceite específico e prova exigida |
|---|---|---|---|---|
| PROD-036 | P0 / SRE + Performance/Produto / G | 024, 025, 038, 041, 042, 043, 049 | API/DB/Redis/worker/storage/frontend sob carga e endurance | Workload/metas/concorrência/dataset aprovados antes do run; p95/p99, erro, saturação, memória/filas e margem; 24h/72h reais conforme contrato. Artefatos target-bound, duração física e limites preservados, com dono |
| PROD-037 | P0 / Dados + SRE / G | 004, 024, 025, 033, 049 | Backup, restore, corrupção e mismatch | Restaurar DB/objetos/config/chaves necessárias, checksums/relações/saldos; provar corrupção detectada e recuperação; cumprir RPO/RTO aprovados. Alvo descartável autorizado, cronômetro e relatório; nunca restaurar sobre produção por padrão |
| PROD-038 | P0 / SRE + Backend / G | 022, 024, 025, 049 | Traces, métricas, alertas e resposta | Falha sintética percorre detecção→alerta recebido→resposta por responsável; perda de telemetria visível; correlação útil sem PII. Prova de entrega/ack/runbook em alvo aprovado, produtor autenticado |
| PROD-039 | P0 / Plataforma + Segurança / G | 002, 010, 017, 062 | SBOM, proveniência, assinatura, scans e intake | Digest consumido e assinatura verificados; dependências/imagens analisadas; quarentena/ACL/retenção/revogação testadas. Evidência remota autêntica e semanticamente suficiente; não confiar em declared_status |
| PROD-040 | P0 / Admin repo + Lead / M | 018, 039 | Required checks e autoridade de promoção | Nomes de jobs/workflow/SHA corretos; branch policy, bypasses/roles e run terminal verde confirmados; alteração remota só autorizada. Consulta autenticada atual + registro de decisão; checker local não prova política remota |
| PROD-041 | P1 / Arquitetura + Backend / G | 020, 023, 024 | `apps/api/src/server.ts` e composição | Caracterizar despacho/erro/auth/replay/tenant; extrair responsabilidades reais com interfaces e boundary tests; reduzir concentração sem novo god module. Diff estrutural, regressão HTTP/DB e budget não ampliado |
| PROD-042 | P1 / Frontend + UX / G | 009, 021, 032 | Router, PatientDetail e composição SPA | Extrair por responsabilidade preservando URLs, permissões, retorno, scroll/foco/contexto e lazy-loading; sem drift de tokens. Testes navegação + browser persistente e render novo; não aceitar snapshots automaticamente |
| PROD-043 | P1 / Backend worker / G | 025, 038 | `apps/worker/src/runner.ts` e composição | Separar descoberta/config/runtime/políticas sem duplicação; preservar leases, fencing, idempotência e correlação. Contratos nativos e processos reais com restart/falha; sem simples deslocamento de linhas |
| PROD-044 | P0 / Plataforma + Dados/SRE / G | 023, 024, 035, 036, 037, 038, 039, 040, 049 | Instalação, upgrade, deploy e reversão em alvo de ensaio | Artefato por digest inicia corretamente, readiness e smoke clínico-financeiro passam; upgrade e abort/reversão/roll-forward preservam dados. Runbook executado por operador, alvos exclusivos e autoridade |
| PROD-045 | P0 / Lead + QA + crítico + release owner / G | 001–044, 047–065 | Candidato congelado e Go/No-Go | Todos pré-requisitos integrais, cinco shards atuais, 11 áreas aceitas, CI terminal verde, gates obrigatórios PASS, scorecard ≥97/críticas≥95/P0=0; revisão final nova e autorização do alvo. Mudança material reabre provas; não gerar aprovação sintética |
| PROD-046 | P0 / Release owner + SRE/Produto / G | 045 | Entrada controlada em produção | Autorização explícita de SHA/digest/config/alvo/janela; rollout progressivo compatível, abort triggers, telemetria e reconciliação; observação encerrada pelo dono. Prova operacional real, não mera execução de script |
| PROD-047 | P1 / Lead + QA/SRE / M | 001, 018 | Freshness, revogação e sustentação | Mudança/expiração invalida evidência; calendário de restore/rotação/acesso/UAT/regressão, owner e escalation definidos. Conhecido-ruim stale/revoked rejeitado; rotina de operação aceita, execução recorrente após rollout |

## 6. Lacunas explícitas acrescentadas pela auditoria — PROD-048–065

| ID | Prioridade / dono / porte | Depende de | Fronteira e resultado esperado | Aceite específico e prova exigida |
|---|---|---|---|---|
| PROD-048 | P0 / Segurança/DPO + documentação / M | 001 | PII em `docs/vetus/guides` e cópias relacionadas | Inventário restrito sem valores expostos, exemplos substituídos por sintéticos quando autorizado, scan e revisão; avaliar histórico/acesso/retencão com dono. Sem reescrever Git ou apagar cópias indiscriminadamente; preservar prova de tratamento sem reproduzir PII |
| PROD-049 | P0 / Plataforma + release owner / M | 001 | Docs 132, ADR-011, RELEASE_IDENTITY e runbooks | Matriz ambiente→Compose/Helm→runbook→alvo/owner coerente e aprovada; validar superficie e smoke por runtime aplicável. Não remover Helm ou inventar produção sem decisão |
| PROD-050 | P0 / Backend worker / M | 003, 024 | `account-job-runner.ts`, timeout e isolamento | Reproduzir job que nunca resolve; prazo cancelável/fencing impede efeitos tardios e permite próximo tenant; abort, lease e recursos limpos. Teste de processo/DB e latência de progresso sob limite declarado; Promise.race sozinho não prova cancelamento |
| PROD-051 | P0 / Backend notificações / M | 003, 024 | `notifications/src/index.ts`, job e entrega | Reproduzir falha entre processed/update/hook; conclusão durável, retry/DLQ/redrive e idempotência compatíveis. Crash/restart e webhook duplicado sem perda nem entrega indevida; estado SQL e efeitos reconciliados |
| PROD-052 | P1 / Produto + Financeiro / P | 001 | Contrato de pontos e `expiresAt` | Decidir vencimento, timezone, corte temporal, ordem de consumo, saldo legado e restituição; alternativas/impacto aprovados. Probe atual como observação, não violação presumida; não alterar saldos nesta tarefa |
| PROD-053 | P1 / Backend comercial + QA / M | 024, 052 | Saldo/resgate de fidelidade conforme contrato | Implementar decisão aprovada consistentemente em memória/DB/API; fronteiras temporais, resgates concorrentes, expiração e estorno. Relógio controlado, SQL e API multi-instância; migração/legado somente se contrato exigir |
| PROD-054 | P1 / Frontend + UX / M | 003, 012 | AppPageHeader e Agenda tablet | Primeira consulta útil visível em viewport nominal 768×900 e matriz intermediária com dataset fixado; filtros/KPIs/CTA acessíveis, sem clipping/overflow. Teste geométrico falha no layout antigo e vale também >390; temas/teclado e screenshots antes/depois |
| PROD-055 | P1 / Frontend + Produto / M | 003, 012 | OwnerFormPage e essenciais mobile | Nome+contato obrigatório antes dos opcionais; ação de salvar alcançável sem perder entrada; erro/foco/diálogo/retorno preservados. Teste da ordem semântica, viewport 375, teclado e browser→API→DB; não exigir formulário todo na dobra |
| PROD-056 | P2 / UX + Frontend / M | 003, 012 | Copy operacional e papéis tipográficos | Substituir jargão quando prejudica operação, adotar papéis coerentes serif/sans segundo contrato CVG; breadcrumbs/aria consistentes, sem renomear conceitos de negócio indevidamente. Inventário, revisão com operadores, render claro/escuro e regressão |
| PROD-057 | P1 / Frontend QA / G | 054, 055, 056, 058 | Matriz completa de rotas/estados responsivos | Cobrir rotas críticas das 11 áreas, 375/721/768/1024/1440 e limites reais; loading/empty/error/retry/success/conflict/403/long copy. Console/network/geometry/teclado capturados; fixtures declaradas, jornadas persistentes em 035; sem autoaprovar golden |
| PROD-058 | P2 / Design system + Frontend / M | 003, 012 | Tokens, marca, ícones, assets e performance visual | Papéis semânticos, contraste e identidade preservados; asset usado tem origem/licença/recorte/resolução/peso; fonts/fallback/números/motion/reduced-motion coerentes. Manifesto e scans + render; não gerar raster de texto/UI ou trocar marca |
| PROD-059 | P0 / Acessibilidade + QA / G | 057 | A11y manual/automática e cross-browser | Matriz contratada AA, keyboard/focus/labels/erros/contraste/non-color/touch/zoom/reflow/AT nos navegadores suportados; zero blocker essencial. Axe em todas rotas críticas + evidência manual/AT real; seis runs da Agenda não bastam |
| PROD-060 | P1 / DX + Arquitetura / M | 003 | Scripts de lint e regras semânticas | Diferenciar types de lint; regras de promises/async, imports/fronteiras e segurança aplicáveis detectam fixtures ruins e aprovam boas; baseline de dívida explícita sem blanket disable. Log lint/known-bads/build/tipos e rollout incremental |
| PROD-061 | P0 / QA de ambiente + Dados / M | 003 | Suite ML PostgreSQL e dependências da suíte raiz | DB privado explicitamente disponível no contrato ML; REQUIRES_DB fail-closed quando obrigatório, sem skip silencioso; evidências documentais disponíveis no clone. Suíte raiz completa e integração executadas, falhas separadas por causa, teardown exclusivo |
| PROD-062 | P0 / Plataforma + Segurança/QA / G | 001, 010 | Verificadores específicos do release gate | Inventariar todos critérios genéricos PARTIAL; implementar verificadores por família (testes/RLS/backup/UAT/deploy/proteção/autoridade), autenticidade+bytes+alvo+medição+freshness. Conhecido-bom legítimo passa, hash/issuer/target/status/limite/autoridade falsos falham; sem flag auto-PASS |
| PROD-063 | P1 / Cadastros + QA/Produto / M | 024, 027, 055 | Tutores/pacientes e cadastros auxiliares | Campos/duplicatas/vínculos/autorizados, permissões, busca/edição/arquivamento e importação contratados; contexto preservado. UI/API/DB multi-tenant com casos negativos, dados sintéticos e aceite do dono |
| PROD-064 | P1 / Estoque/compras + Backend/QA / G | 024, 025, 027 | Produtos/serviços, reservas, compras, lotes e movimentos | Entrada/reserva/transferência/consumo/cancelamento reconciliam quantidade/custo/financeiro; concorrência e vencimento quando contratado. Jornada UI/API/DB, oracle de estoque e autorização de ajustes, sem saldo impossível |
| PROD-065 | P1 / RH/Financeiro + Backend/QA / G | 024, 027 | Profissionais/folgas/comissões | Regras aprovadas de competência, base, rateio, cancelamento/estorno/repasse e folga; cálculo/reprocessamento idempotentes, permissões e rastreabilidade. Dataset oracle e reconciliação UI/API/DB; não inventar política de remuneração |

## 7. Matriz achado → cartão → evidência de fechamento

| Achado | Cartões | Evidência que encerra o achado |
|---|---|---|
| A01 Coverage crítica | 010–018 | Cinco shards atuais + SQL/Vue + zero métrica obrigatória abaixo de 85 |
| A02 Verificadores/autoridades | 019, 039, 040, 045, 049, 062 | Verificadores executados, prova externa suficiente e autoridade específica |
| A03 PII documental | 048, 033 | Tratamento validado pelo responsável, exemplos sintéticos e rastreabilidade restrita |
| A04 SSO parcial | 019–021 | Jornada ERP real com identidade/tenant/sessão/logout e IdP homologado |
| A05 Job pendurado | 050, 025, 043 | Progresso de outro tenant, cancelamento/fencing e efeito reconciliado |
| A06 Recovery/endurance | 036–038, 044, 049 | Alvo/metas aprovados, duração real, restore e resposta observados |
| A07 Artefato stale/sintético | 002, 010, 039, 045, 047, 062 | Candidato exato e pacote autêntico/fresco sem fixture canônica |
| A08 Deploy contraditório | 049, 023, 044 | Matriz de precedência aprovada e execução do runbook correto |
| A09 Agenda tablet | 054, 057, 059 | Teste de dobra também em tablet + screenshots/interação |
| A10 Essenciais do tutor | 055, 063, 035 | Ordem essencial e jornada persistida/UAT sem regressão |
| A11 Hotspots/copy/tipo | 041–043, 056, 058, 060 | Fronteiras menores testadas e linguagem/tokens observados |
| A12 Pontos/notificações | 052, 053, 051, 025 | Decisão de pontos + contrato implementado; crash/retry de notificação |
| A13 Logs | 022, 033, 038 | Minimização/retencão aprovadas e eventos seguros auditáveis |

Os 18 itens consolidados e 14 visuais estão mapeados no plano executivo. Os 15 itens funcionais/técnicos da seção 5 do relatório ficam cobertos por: cadastros 063; agenda/atendimento 026/027/054; prontuário/prescrições e internação/alta 026; laboratório 028; estoque/farmácia 064; financeiro 006–009/030; comercial/pacotes/fidelidade 027/052/053/064; fiscal 029; workforce/comissões 065; marketing 031; relatórios 032; SSO 019–021; checker 010–018; observabilidade 038. PROD-027 deve detalhar pacotes/cotações/vendas como jornadas próprias, não deixá-los cobertos apenas por fidelidade.

## 8. Contratos prontos para a primeira retomada

### PROD-001 — primeira ação singular

Entrada: relatório e estes três documentos; `.agent/state.json` ainda aponta PROD-004 e rev12/246. Procedimento: ler instruções aplicáveis e snapshot; comparar state/ExecPlan/backlog/gate/ledgers à auditoria e código atual; não executar a ação antiga. Registrar classificação por PROD (`aceite atual`, `parcial`, `revalidar`, `não iniciado`, `dependência externa`) com evidência, preservando os IDs MA/REM e gates anteriores. Mapear 048–065 no controlador, com transições legais e origem explícita.

Allowlist: `.agent` e referências documentais estritamente necessárias. Proibido alterar produto, manifestos de coverage ou declarar DONE técnico. Atualizar o ExecPlan ativo usando o template do engineering-framework; preservar fatos e registrar revisão/descobertas. Não usar este plano executivo como `active_execplan`. Um único marker/primeiro passo/backlog.next_action/state.active_action_id/log deve resolver para a operação seguinte realmente autorizada.

Prova: `python3 /home/ricardo/.agents/skills/engineering-framework/scripts/check_state.py /home/ricardo/cvg-his-v4`, validação documental e revisão semântica fresca sobre o conjunto final. Se o skill estiver noutro host, localizar o checker instalado e não inventar caminho. A aceitação é do controle; release permanece bloqueado. Próxima tarefa candidata: PROD-002, subaceite local de identidade; confirmar disponibilidade no fim da reconciliação.

### PROD-003/061 — ambiente antes de medir

Inspecionar scripts/flags antes de executar. Reutilizar runner de stack exclusiva; nomear diretório, portas, banco, containers e processos por run-id, com manifesto de ownership. Usar dados sintéticos e `.env` de teste próprio. Executar duas vezes build/smoke integrado e tamper-negative; conferir digest servido, não só fonte no disco. Incluir os artefatos documentais necessários ou registrar claramente seu empacotamento; um clone incompleto não prova link quebrado no original.

Para ML, distinguir unit in-memory do contrato PostgreSQL; provisionar o banco real exigido, garantir falha explícita se ausente em CI/integration e rodar a suíte completa apropriada. Não desativar teste para imitar o verde da SPA. Cleanup por IDs comprovadamente próprios; nunca `kill` por porta genérica ou remoção de volume compartilhado.

### PROD-004/005 — revalidar antes de reparar

Capturar o estado de 0172 e do helper atual. Rodar primeiro as reproduções negativas históricas no candidato novo; se passarem, registrar a evidência e completar cenários ainda exigidos. Só implementar se houver contraprova atual. Migração deve ser forward-only e incluir worker consumidor nas linhas do mesmo upgrade. Relatórios devem atravessar HTTP, autorização dinâmica e replay após revogação; teste direto do helper sozinho não encerra o cartão.

## 9. Catálogo de procedimentos, com barreiras de segurança

Comandos abaixo são procedimentos existentes para descoberta/validação, **não foram todos executados na criação deste plano**. Rodar na raiz, depois de ler seus scripts e limitar ambiente. Não executar em lote às cegas.

| Procedimento | Comando/ponto de entrada | Condição |
|---|---|---|
| Docs | `pnpm docs:validate` | Local; conferir semântica além da estrutura |
| OpenAPI e fronteiras | `pnpm validate:openapi`; `pnpm validate:namespaces` | Local; não prova runtime |
| Fontes migration/deploy | `pnpm validate:migration-source`; `pnpm validate:deploy-surface` | Leitura estrutural; não aplicar migration |
| Dependências/supply chain | `pnpm validate:dependencies`; `pnpm validate:supply-chain` | Validador local não substitui scan/assinatura remotos |
| Build/tipos/lint | `pnpm build`; `pnpm typecheck`; `pnpm lint` | Cópia/ambiente com saídas próprias; lint não deve ser só tsc |
| Vitest raiz | `pnpm exec vitest run --config vitest.config.ts` | PG disponível conforme contratos e variáveis explícitas; preservar log inteiro |
| Integração DB | `pnpm test:db`; `pnpm test:integration` | Banco descartável obrigatório, ownership/cleanup validados |
| Processo crítico | `pnpm test:critical:process` | Stack exclusiva e processos próprios |
| Coverage | `node scripts/check-critical-coverage.mjs`; `node --test scripts/check-critical-coverage.test.mjs` | Checker revalida provas; coleta usa `scripts/run-critical-coverage-shard.mjs` conforme flags inspecionadas |
| Paridade | `pnpm vetus:parity:audit`; `pnpm vetus:parity` | Report-only exit 0 não significa verified |
| E2E/visual | `scripts/run-exclusive-stack.mjs` e configuração Playwright aplicável | Adaptar recursos próprios. Wrappers `test:e2e:spa`, `test:visual` e `test:smoke` contêm `fuser -k`; não usar em workspace compartilhado |
| Release gate | `pnpm release:triple-a` | Escreve artefatos e pode consultar ferramentas externas; usar destino isolado/flags inspecionadas; canônico só em promoção autorizada |
| Endurance/recovery | `infra/scripts/run-critical-soak.mjs`; `infra/scripts/restore-drill-v2.sh` | Inspeção prévia; 20 iterações não é 24/72h; alvo e ação destrutiva requerem autorização |

Não executar `test:runner:clean`, `test:db:stop`, `down -v`, scripts de cleanup ou atualizações de snapshots sem delimitar alvos e efeitos. Não reduzir timeout/carga/duração ou ignorar skip para produzir evidência verde.

## 10. Handoff obrigatório por cartão

Registrar: contrato/ID e decisão de entrada; mudanças e identidade; baseline/reprodução; comandos e resultados; crítica/sentinela; regressão integrada; provas e retenção; limites e decisões externas; estado correto e **uma próxima ação executável**. Se parar em VERIFY, não escrever DONE; se parar em blocked externo, não declarar o programa AAA. O agente recebe trabalho executável e critérios de término, não permissão para certificar a si próprio.
