# Backlog premium executavel do CVG-HIS V4

**Status:** vigente
**Baseline:** 58/100
**Plano:** `2026-07-11-plano-produto-premium-erp-veterinario.md`
**Roadmap:** `2026-07-11-roadmap-premium-58-a-90.md`

## 1. Convencoes

Prioridades: `P0` bloqueia operacao/seguranca; `P1` necessario para piloto premium; `P2` amplia ERP; `P3` diferenciacao. Pontos sao relativos (`3, 5, 8, 13`) e incluem codigo e testes, nao equivalem a dias.

Owners sao equipes responsaveis: `PLAT` plataforma/backend, `CLIN` dominio clinico, `WEB` SPA/UX, `FIN` financeiro/fiscal, `QA` qualidade/SRE, `PROD` produto/operacao.

Todo ticket exige TDD, validacao de entrada, tenant/RBAC/RLS, auditoria, OpenAPI, observabilidade e evidencia anexada ao gate quando aplicavel.

## 2. P0 - estabilizacao e integridade

| ID | Entrega | Owner | SP | Dependencia | Criterio de aceite |
|---|---|---:|---:|---|---|
| PLAT-001 | `TenantUnitOfWork` transacional | PLAT | 13 | - | repositorios compartilham transacao/tenant; rollback e teste NOBYPASSRLS |
| PLAT-002 | Idempotency key e inbox/outbox | PLAT | 13 | PLAT-001 | mesma chave nao duplica; payload diferente retorna 409; retry/DLQ testados |
| PLAT-003 | Fail-closed em modo database | PLAT | 5 | PLAT-001 | producao nao inicia com repositorio obrigatorio em memoria |
| LAB-001 | Persistencia sincrona de pedidos/resultados | CLIN | 8 | PLAT-001 | banco falha -> HTTP falha; nenhum `Map` ou sucesso fantasma |
| FIN-001 | Ownership tenant na captura de cartao | FIN | 5 | PLAT-001 | intent de outro tenant retorna 404 e provider nao e chamado |
| FIN-002 | Ledger canonico e modelo de migracao | FIN | 13 | PLAT-001 | ADR contabil, journal balanceado, unicidade, reversao e projecoes reconstruiveis |
| FIN-003 | Fechamento UoW venda/estoque/caixa | FIN | 13 | FIN-002 | falha injetada reverte tudo; concorrencia fecha uma vez |
| CACHE-001 | DELETE consistente e invalidacao | PLAT | 5 | PLAT-002 | 204 apos commit; leitura imediata 404 em duas instancias |
| AUTH-001 | Refresh cookie e access token em memoria | PLAT/WEB | 13 | - | nenhum token persistente em localStorage; rotacao/revogacao/CSRF testados |
| AUTH-002 | CSP e headers de seguranca | WEB/PLAT | 5 | AUTH-001 | CSP report-only, depois enforce; testes de headers e assets |
| AUTH-003 | Rate limit Redis e proxy trust | PLAT | 8 | - | multi-instancia, chave tenant/login/IP e proxy confiavel testados |
| DEP-001 | Zerar vulnerabilidades criticas/altas | PLAT | 8 | - | enterprise audit sem critical/high; excecao temporaria nao torna gate verde |
| TEST-001 | Corrigir gate de cobertura | QA | 8 | - | 1.342/1.342 ou inventario atualizado; zero rejeicao nao tratada |
| GATE-001 | Gate de paridade comportamental | QA | 8 | TEST-001 | evidencia aponta para teste/artefato; nenhum score por presenca de arquivo |
| GATE-002 | Colecao E2E critica real | QA | 8 | GATE-001 | `test:e2e` executa agenda, clinica, exame, internacao, caixa e dois tenants |
| CONTRACT-001 | OpenAPI e estados canonicos | PLAT | 5 | PLAT-001 | contrato validado contra runtime e clientes gerados; billing sem enums divergentes |

**Total P0 estimado:** 138 SP.

### Estado de execucao em 2026-07-11

| ID | Estado | Evidencia | Bloqueio para concluir |
|---|---|---|---|
| PLAT-001 | parcial, fundacao validada | UoW, mesma conexao/helper, rollback, concorrencia e papel NOBYPASSRLS em `2026-07-11-execucao-m0-sprint-1-fundacao-transacional.md` | migrar uma mutacao HTTP critica e provar dominio/audit/outbox/idempotencia atomicos |
| PLAT-002 | parcial avancado | lease owner/token/version/heartbeat/CAS, inbox por consumidor, retry parcial, takeover sem duplicar efeito, isolamento tenant explicito e readiness fail-closed; evidencias em `2026-07-11-execucao-m0-sprint-1-fundacao-transacional.md` | compor consumidores reais no worker, child outbox para efeitos externos, primeira rota HTTP transacional e operacao de retencao/DLQ |

`Parcial` nao satisfaz dependencia de homologacao nem altera score, conforme a politica da secao 9.

## 3. P1 - estacao clinica premium

| ID | Entrega | Owner | SP | Dependencia | Criterio de aceite |
|---|---|---:|---:|---|---|
| CLIN-001 | Agregado do episodio clinico | CLIN | 13 | PLAT-001/002 | estados, version, fechamento read-only e reabertura auditada |
| CLIN-002 | Comando atomico `clinical-sheet` | CLIN | 13 | CLIN-001 | ficha/receita/exame/procedimento salvam todos ou nenhum |
| CLIN-003 | Rascunho versionado/autosave | CLIN/WEB | 8 | CLIN-002 | rascunho recuperavel; publicacao atomica; conflito 409 tratado |
| WEB-001 | Cockpit do atendimento | WEB/PROD | 13 | CLIN-002 | contexto compacto, SOAP central, pendencias/comanda, um CTA por estado |
| WEB-002 | Timeline longitudinal sob demanda | WEB | 8 | CLIN-001 | filtros, paginacao e nomes; sem IDs tecnicos na operacao |
| WEB-003 | Busca global e cadastro rapido | WEB/CLIN | 8 | - | tutor/animal/telefone, deduplicacao e inicio em ate duas acoes |
| DOC-001 | Object storage privado | PLAT | 8 | PLAT-001 | S3/MinIO, criptografia, URL curta e isolamento tenant |
| DOC-002 | Upload streaming e validacao | PLAT | 13 | DOC-001 | quarentena privada, PUT restrito, MIME/magic/hash, bombs/polyglot e sem buffer integral |
| DOC-003 | Antivirus/quarentena/reconciliacao | PLAT/QA | 8 | DOC-002 | arquivo infectado indisponivel; objetos orfaos reconciliados |
| DOC-004 | Anexos no prontuario/timeline | CLIN/WEB | 8 | DOC-003 | PDF/JPEG/PNG com preview, categoria, versao, autor e auditoria |
| DOC-005 | Relatorios e documentos clinicos | CLIN/WEB | 13 | CLIN-002,DOC-001,RX-003 | atestado, laudo, encaminhamento, declaracao, termo e resumo versionados/assinados |
| RX-001 | Prescricao estruturada | CLIN | 13 | CLIN-001 | dose/via/frequencia/duracao/quantidade e validacao de boundary |
| RX-002 | Templates e calculo assistido por peso | CLIN/WEB | 8 | RX-001 | exige confirmacao profissional e registra formula/versao |
| RX-003 | PDF imutavel e verificavel | CLIN/PLAT | 13 | RX-001,DOC-001 | snapshot, hash, QR, CRMV, assinatura, cancelamento/substituicao |
| RX-004 | Discovery regulatoria de controlados | CLIN/PROD | 8 | CLIN-001 | requisitos MAPA/Anvisa e assinatura definidos por RT/juridico antes de RX-003 |
| DIS-001 | Alta e orientacoes | CLIN/WEB | 8 | CLIN-002,RX-003 | documento, retorno, sinais de alerta e envio auditado |
| E2E-001 | Atendimento agendado clinico | QA | 13 | CLIN-002/003,WEB-001,DOC-004,RX-003,DIS-001 | UI real ate alta clinica, PostgreSQL, restart, zero skip/retry |
| E2E-002 | Atendimento avulso clinico | QA | 13 | CLIN-002/003,WEB-001/003,DOC-004,RX-003,DIS-001 | cadastro/busca ate alta clinica, sem atalhos por API |
| E2E-003 | Jornada de dois tenants | QA | 13 | AUTH-001,CLIN-002,DOC-004,RX-003 | mesmas entidades logicas sem leitura/escrita cruzada |

**Total P1 clinico estimado:** 202 SP.

## 4. P1 - agenda, fila e laboratorio

| ID | Entrega | Owner | SP | Dependencia | Criterio de aceite |
|---|---|---:|---:|---|---|
| SCH-001 | Schema de configuracao persistente | CLIN | 13 | PLAT-001 | tipos, disponibilidade, excecoes, recursos e status sobrevivem restart |
| SCH-002 | Motor de disponibilidade | CLIN | 13 | SCH-001 | exclusion constraint tenant/recurso/`tstzrange`, DST, recorrencia e estados ocupantes |
| SCH-003 | Recursos, bloqueios e encaixe | CLIN/WEB | 8 | SCH-002 | profissional/sala/equipamento; override autorizado/auditado |
| SCH-004 | Agenda dia/semana/recursos | WEB | 13 | SCH-002 | navegacao rapida, filtros, status e layout responsivo |
| SCH-005 | Confirmacao, lembrete e no-show | CLIN/PLAT | 8 | SCH-001,PLAT-002,CRM-002 | canais, retry, resposta, cancelamento e historico |
| SCH-006 | Lista de espera e recorrencia | CLIN/WEB | 8 | SCH-002 | cancelamento oferece slot; serie permite editar ocorrencia/futuras |
| SCH-007 | Check-in, fila e SLA | CLIN/WEB | 13 | SCH-001,CLIN-001 | chegada, prioridade, chamada, atraso e inicio do atendimento |
| LAB-002 | Pipeline laboratorial completo | CLIN | 13 | LAB-001,DOC-004 | pedido ate liberacao/retificacao com estados validos |
| LAB-003 | Resultado estruturado e laudo | CLIN/WEB | 13 | LAB-002,RX-003 | referencia, flags, assinatura, versao, PDF e timeline |
| LAB-004 | Integracao de laboratorio | PLAT | 13 | LAB-002,PLAT-002 | pedido/resultado bidirecional, correlacao, retry e dedup |
| E2E-004 | Agenda concorrente | QA | 8 | SCH-002,SCH-003 | duas reservas simultaneas nunca ocupam o mesmo recurso |
| E2E-005 | Exame com upload e restart | QA | 8 | LAB-003 | pedido/coleta/upload/liberacao/visualizacao e persistencia |

**Total agenda/laboratorio estimado:** 131 SP.

## 5. P1/P2 - hospital, estoque e financeiro

| ID | Pri | Entrega | Owner | SP | Dependencia | Criterio de aceite |
|---|---|---|---:|---:|---|---|
| INP-001 | P1 | Whiteboard de internacao | CLIN/WEB | 13 | CLIN-001 | leito, risco, responsavel, previsao, pendencias e filtros |
| INP-002 | P1 | Plano terapeutico 24h | CLIN | 13 | INP-001 | aprazamento, administracao, atraso, ocorrencia e handoff |
| INP-003 | P1 | Consumo e diaria automaticos | CLIN/FIN | 13 | INP-002,FIN-002,FIN-003,INV-001 | execucao gera estoque e charge atomicamente |
| SUR-001 | P2 | Cirurgia/anestesia premium | CLIN/WEB | 13 | INP-002,INV-001,CLIN-002,DOC-005 | checklist, equipe, materiais, monitoracao, recuperacao e alta |
| INV-001 | P1 | Lote, validade, FEFO e reserva | FIN | 13 | FIN-003 | concorrencia, devolucao e saldo nao negativo testados |
| INV-002 | P2 | Multiestoque e transferencia | FIN | 13 | INV-001 | transito, parcial, divergencia e auditoria |
| PUR-001 | P2 | Compras e entrada por XML | FIN | 13 | INV-001,FIN-006 | pedido/aprovacao/entrada/lote/financeiro reconciliados |
| FIN-004 | P1 | Pagamento parcial/misto/estorno | FIN | 13 | FIN-002 | alocacao, troco, credito e reversao append-only |
| FIN-005 | P1 | Caixa completo | FIN/WEB | 13 | FIN-004 | abertura, suprimento, sangria, deposito e fechamento |
| PAY-001 | P1 | PIX/cartao homologados | FIN/PLAT | 13 | FIN-001,FIN-004,PLAT-002 | webhook assinado, timeout, replay, chargeback e conciliacao |
| FIN-006 | P2 | Contas e DRE | FIN | 13 | FIN-002 | pagar/receber, competencia, centro de custo e drilldown |
| COM-001 | P2 | Comissao por recebido | FIN | 8 | FIN-004 | estorno recalcula; fechamento e pagamento auditados |
| FISC-001 | P2 | Abstracao de provider fiscal | FIN/PLAT | 8 | FIN-002,PLAT-002 | contrato, sandbox, idempotencia, webhook e secrets |
| FISC-002 | P2 | NFS-e homologada | FIN | 13 | FISC-001 | emissao, rejeicao, correcao, cancelamento e PDF/XML |
| E2E-006 | P1 | Consulta ate recebimento | QA | 13 | CLIN-002,FIN-002/003/004/005,INV-001 | comanda, estoque, caixa e ledger fecham sem divergencia |
| E2E-007 | P1 | Internacao ate alta/caixa | QA | 13 | INP-001/002/003,FIN-002/003/004/005,INV-001 | 24h simuladas, consumo, diaria, alta, recebimento e restart |

**Total hospital/ERP estimado:** 198 SP.

## 6. P2/P3 - relatorios, relacionamento e escala

| ID | Pri | Entrega | Owner | SP | Dependencia | Criterio de aceite |
|---|---|---|---:|---:|---|---|
| REP-001 | P2 | Camada semantica de relatorios | PLAT/FIN | 13 | FIN-002 | fonte/periodo/timezone/version declarados; totais reconciliam |
| REP-002 | P2 | Relatorios clinicos/operacionais | CLIN/WEB | 13 | CLIN-002,LAB-002,INP-002 | atendimento, preventivo, laboratorio, internacao e SLA com drilldown |
| REP-003 | P2 | Relatorios financeiros/estoque | FIN/WEB | 13 | REP-001,INV-001 | faturamento, recebimento, margem, validade e perdas com drilldown |
| REP-004 | P2 | Exportacao e agendamento | PLAT | 8 | REP-001,PLAT-002 | CSV/XLSX/PDF, RBAC, auditoria, worker, retry e entrega unica |
| CRM-002 | P2 | Consentimento e preferencias | PLAT | 8 | - | opt-in/out por finalidade/canal bloqueia envio indevido |
| CRM-001 | P2 | Inbox e timeline de comunicacao | WEB/PLAT | 13 | CRM-002,PLAT-002 | WhatsApp/SMS/email/portal vinculados a tutor/animal |
| PREV-001 | P2 | Protocolos preventivos | CLIN/WEB | 13 | CLIN-001,CRM-002 | vacina/verme, lote, execucao, proxima dose e lembrete |
| PORTAL-001 | P3 | Portal do tutor | WEB/PLAT | 13 | AUTH-001,CRM-002 | agenda, exames, receitas, vacinas, faturas e mensagens autorizadas |
| MOB-001 | P3 | PWA operacional | WEB | 13 | WEB-001,SCH-004,INP-001 | agenda, cockpit e internacao usaveis em tablet/mobile |
| AI-001 | P3 | Ditado/resumo assistido | CLIN/PLAT | 13 | CLIN-002,CRM-002 | consentimento, revisao humana, provenance e nenhum envio indevido |
| INT-001 | P2 | API/webhooks publicos | PLAT | 13 | PLAT-002,AUTH-003 | versionamento, scopes, assinatura, rate limit e sandbox |
| MIG-001 | P2 | Importacao Vetus | PLAT/QA | 13 | schemas canonicos dos dominios alvo | dry-run, idempotencia, rejeitados, retomada e reconciliacao |
| A11Y-001 | P2 | WCAG 2.2 AA critica | WEB/QA | 13 | WEB-001,SCH-004 | teclado, foco, leitor, contraste e dialogs nos 3 E2E principais |
| PERF-001 | P2 | SLO e performance | QA/PLAT | 13 | jornadas criticas completas | p95 leitura <400ms, comando <800ms sem provider, erro <1% |
| OPS-001 | P2 | Backup/restore e game day | QA/PLAT | 13 | PLAT-003 | RPO/RTO medidos, restore e failover ensaiados |

## 7. Fechamento e homologacao dos nove bloqueios

O backlog completo soma aproximadamente **854 SP** antes de refinamento. Com a capacidade de referencia do roadmap (duas squads, 55-65 SP combinados por sprint), sao 14-16 sprints de construcao liquida; descoberta, providers, migracao, homologacao e reserva elevam o compromisso para 20-22 sprints.

| Bloqueio auditado | Correcao M0 e homologacao definitiva |
|---|---|
| Laboratorio responde antes do commit | PLAT-001, LAB-001, LAB-002 |
| Venda/estoque/caixa nao atomicos | FIN-002, FIN-003, INV-001, E2E-006 |
| Billing/recebiveis divergentes | FIN-002, FIN-004, REP-001 |
| Captura de cartao cross-tenant | FIN-001, PAY-001 |
| Cache obsoleto apos exclusao | CACHE-001, PLAT-002 |
| Agenda em memoria | SCH-001 a SCH-003 |
| Prontuario salva parcialmente | CLIN-001 a CLIN-003 |
| localStorage/CSP/rate limit | AUTH-001 a AUTH-003 |
| Dez vulnerabilidades no workspace | DEP-001, GATE-001 |

## 8. Gates de aceite

- `G0 Integridade`: P0 fechado, coverage/security verdes e nenhuma escrita fire-and-forget.
- `G1 Piloto clinico`: E2E-001/002/003/005 verdes, restart e homologacao veterinaria.
- `G2 Agenda/laboratorio`: E2E-004/005 verdes, sem dupla reserva ou resultado perdido.
- `G3 Hospital/ERP`: E2E-006/007 verdes, tarefas, consumo, ledger, caixa e estoque reconciliados.
- `G4 Premium`: 20 execucoes sem flake, SLOs, WCAG, backup/restore e operacao assinada.

## 9. Politica de backlog

Um item so muda para `concluido` com PR, testes, evidencia e gate. A cobertura minima e 80% global e 90% nas linhas criticas alteradas. E2E critico roda com `retries=0`, zero `skip` e PostgreSQL real. `Parcial` nao eleva dominio a homologado. Mudanca de escopo exige decisao de produto registrada. Bugs P0 interrompem novas features do mesmo agregado ate correcao.
