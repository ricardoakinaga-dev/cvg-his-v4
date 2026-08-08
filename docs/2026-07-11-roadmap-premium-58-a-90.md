# Roadmap premium do CVG-HIS V4: 58 a 90+

**Status:** vigente
**Data inicial:** 2026-07-11
**Horizonte de referencia:** 40 a 44 semanas
**Plano:** `2026-07-11-plano-produto-premium-erp-veterinario.md`
**Backlog:** `2026-07-11-backlog-premium-executavel.md`

## 1. Premissas de capacidade

Calendario base para uma equipe estavel:

- duas squads, somando 3 backend/plataforma e 3 frontend/full-stack;
- 2 QA automacao/SRE compartilhados;
- produto/UX e medico-veterinario responsavel tecnico com dedicacao parcial;
- seguranca/DevOps e fiscal/juridico sob demanda.

Sprints de duas semanas, 55-65 SP combinados depois da estabilizacao. Pontos nao sao horas. Com uma unica squad, a previsao passa para 48-60 semanas; com uma pessoa, deve ser recalculada por throughput observado, sem assumir proporcionalidade. Adicionar pessoas depois do inicio nao reduz linearmente o calendario.

## 2. Marcos

| Marco | Sprints | Semanas | Score alvo | Saida |
|---|---:|---:|---:|---|
| M0 Fundacao segura | 1-4 | 1-8 | 65 | nove bloqueios corrigidos ou fail-closed, gates confiaveis |
| M1 Estacao clinica interna | 5-8 | 9-16 | 74 | prontuario, upload, documentos e receita em piloto interno |
| M2 Agenda e laboratorio | 9-12 | 17-24 | 80 condicional | jornada agendada completa e agenda persistente |
| M3 Hospital e ERP | 13-16 | 25-32 | 85 condicional | internacao, estoque, comanda, ledger e caixa integrados |
| M4 Fiscal e gestao | 17-19 | 33-38 | 89 condicional | provider-alvo, relatorios e comunicacao homologados |
| M5 Certificacao premium | 20-22 | 39-44 | 92+ condicional | reauditoria, SLO, WCAG, restore e operacao estavel |

As notas so sobem apos gate executavel. Datas devem ser recalculadas pela velocidade real das duas primeiras sprints.

## 3. M0 - fundacao segura

### Sprint 1: fundacao transacional

- PLAT-001 Unit of Work tenant-aware;
- PLAT-002 idempotencia/inbox/outbox;
- testes RED de rollback, tenant, concorrencia e repeticao.

### Sprint 2: parar perda e vazamento

- FIN-001 ownership do intent antes da captura;
- LAB-001 persistencia aguardada;
- CACHE-001 DELETE e cache consistente;
- DEP-001 vulnerabilidades criticas/altas;
- feature flags fail-closed para caminho ainda nao corrigido.
- TEST-001, GATE-001, GATE-002 e CONTRACT-001.

### Sprint 3: autenticacao e persistencia operacional

- AUTH-001 a AUTH-003;
- PLAT-003 fail-closed;
- SCH-001 configuracao persistente;
- CRM-002 consentimento/preferencias antes de lembretes externos.

### Sprint 4: prontuario e financeiro atomicos

- CLIN-001 e CLIN-002;
- FIN-002 e FIN-003;
- reconciliador de divergencias;
- reexecucao dos nove cenarios bloqueadores.

**Gate M0:** cada um dos nove bloqueios esta corrigido ou tecnicamente inacessivel por fail-closed especifico; build/type/lint/test/coverage/security/RLS verdes; API reinicia sem fallback obrigatorio. Nenhuma excecao de vulnerabilidade torna o gate verde.

## 4. M1 - estacao clinica

### Sprint 5: rascunho e cockpit

- CLIN-003 rascunho/autosave;
- WEB-001 cockpit;
- WEB-002 timeline;
- WEB-003 busca/cadastro;
- estados de erro, concorrencia e recuperacao.

### Sprint 6: documentos e upload

- DOC-001 a DOC-004;
- anexos reais no atendimento.

### Sprint 7: receita e regulacao

- RX-004 discovery regulatoria;
- RX-001 e RX-002;
- inicio de RX-003.

### Sprint 8: emissao e homologacao interna

- concluir RX-003;
- DOC-005 documentos clinicos;
- DIS-001;
- E2E-001 e E2E-002;

**Gate M1:** veterinario conclui consulta, anexa exame, emite receita/alta e reabre historico apos restart; nenhuma secao fica parcialmente salva.

## 5. M2 - agenda e laboratorio

### Sprint 9: motor da agenda

- SCH-002 e SCH-003 sobre a configuracao persistida no M0;
- SCH-004 agenda dia/semana/recursos;
- E2E-004 concorrencia;

### Sprint 10: fluxo operacional da agenda

- SCH-005 a SCH-007;
- metricas de no-show, espera e SLA.

### Sprint 11: laboratorio funcional

- LAB-002 e LAB-003;
- E2E-005 exame.

### Sprint 12: integracao e gate clinico

- LAB-004;
- E2E-003 isolamento entre tenants;
- execucao de G1 e do gate de agenda/laboratorio;
- homologacao assistida com recepcao e veterinario.

**Gate M2 / 80:** `agenda -> chegada -> prontuario -> exame/receita -> alta` passa por UI, PostgreSQL, dois tenants e restart, sem skip/retry.

## 6. M3 - hospital e ERP

### Sprint 13: ledger expandido e contas

- evoluir FIN-002/003, ja fechados no M0, para pagamentos parciais e operacao hospitalar;
- schema e implementacao inicial de FIN-004 e INV-001;
- FIN-006 contas a pagar/receber e centros de custo;
- reconciliador e relatorio de divergencias.

### Sprint 14: estoque, checkout e caixa

- concluir INV-001;
- concluir FIN-004 e implementar FIN-005;
- E2E-006 consulta ate recebimento;

### Sprint 15: internacao operacional

- INP-001 a INP-003;
- whiteboard e handoff de turno.

### Sprint 16: cirurgia, compras e pagamento

- SUR-001;
- INV-002 e PUR-001;
- PAY-001 PIX/cartao;
- E2E-007 internacao ate alta/caixa.

**Gate M3 / 85:** clinica, estoque, comanda, recebivel e caixa reconciliam; falha injetada nao deixa efeito parcial; internacao captura diaria/consumo.

## 7. M4 - fiscal, relatorios e continuidade

### Sprint 17: fiscal e gestao

- FISC-001/002 com provider sandbox;
- COM-001 comissoes;
- REP-001 camada semantica.

O escopo fiscal deve nomear um provider e municipios-alvo na discovery. Dependencias externas podem consumir a reserva sem reduzir criterios de aceite.

### Sprint 18: relatorios

- REP-002 a REP-004;
- reconciliacao e exportacoes auditadas.

### Sprint 19: relacionamento e continuidade

- CRM-001 sobre consentimento CRM-002 entregue no M0;
- PREV-001;
- INT-001 API/webhooks;
- piloto de importacao MIG-001.

**Gate M4 / 89:** emissao/rejeicao/cancelamento fiscal homologados, relatorios reconciliados e comunicacao respeita consentimento/retry.

## 8. M5 - certificacao premium

### Sprint 20: UX, acessibilidade e performance

- A11Y-001;
- PERF-001;
- decompor paginas gigantes por jornada;
- tablet/mobile nos fluxos clinicos;
- observabilidade de negocio e tecnica.

### Sprint 21: resiliencia

- OPS-001 backup/restore/game day;
- carga, concorrencia, restart e falhas de provider;
- correcoes dos achados tecnicos.

### Sprint 22: reauditoria e homologacao

- 20 execucoes dos E2E criticos sem flake;
- correcao dos achados de recepcao, veterinario e caixa;
- runbooks, treinamento e decisao go/no-go.

**Gate M5 / 92+:** zero critical/high, SLOs atendidos, WCAG critica, restore medido e operacao assinada. A nota e definida pela reauditoria; concluir tickets nao garante automaticamente 92 nem 11/11 dominios.

## 9. Entregas posteriores

Somente apos M3:

- portal completo do tutor e PWA;
- DICOM/PACS e novas integracoes laboratoriais;
- ditado, resumo e suporte clinico assistido por IA;
- wellness plans, fidelidade e assinatura;
- BI avancado e benchmark multiunidade;
- farmacia online e telemedicina conforme regulacao.

IA nao entra no caminho critico. Primeiro o sistema precisa salvar corretamente, reconciliar cobranca e apresentar informacao clinica confiavel.

## 10. KPIs por marco

| KPI | M1 | M2 | M3 | M5 |
|---|---:|---:|---:|---:|
| Atendimento clinico ate alta sem sair do cockpit | 80% | 90% | 95% | 98% |
| Prontuarios finalizados no mesmo turno | 75% | 85% | 90% | 95% |
| Falha/efeito parcial em comando critico | 0 | 0 | 0 | 0 |
| Exame liberado vinculado ao prontuario | - | 98% | 99% | 99,5% |
| Charge executado capturado na comanda | - | - | 99% | 99,5% |
| Divergencia ledger/caixa/recebivel | - | - | 0 | 0 |
| No-show | medir baseline | hipotese -10% | reavaliar | reavaliar |
| E2E criticos sem flake | 5 runs | 10 | 15 | 20 |
| Vulnerabilidades critical/high | 0 | 0 | 0 | 0 |

KPIs comerciais dependem de baseline real da clinica e periodo minimo de observacao. Percentuais de reducao sao hipoteses a validar, nao compromissos de entrega.

## 11. Riscos e mitigacoes

| Risco | Mitigacao |
|---|---|
| Dados financeiros atuais divergentes | reconciliador, relatorio de diferencas e cutover por unidade |
| Deadlock em estoque/ledger | ordem global de locks, transacoes curtas e retry limitado |
| Duplicidade durante migracao | idempotencia e identificadores externos unicos; evitar dual-write |
| Arquivos infectados/orfaos | quarentena, scanner, cleanup e storage privado |
| Quebra ao migrar auth | feature flag curta, CSRF e testes multi-instancia |
| Receita/fiscal juridicamente inadequados | RT, contador/juridico e provider homologado |
| Escopo premium crescer sem fim | vertical clinica primeiro; WIP limitado; gate antes da proxima onda |
| Teste verde sem cobrir runtime | E2E PostgreSQL, restart, dois tenants e falha intermediaria |

## 12. Governanca

- Product owner prioriza valor e aceita UX.
- Responsavel tecnico veterinario aceita seguranca e fluxo clinico.
- Tech lead aceita arquitetura, migracao e observabilidade.
- Security aceita auth, tenant, upload e pagamentos.
- Financeiro/contador aceita ledger, caixa, conciliacao e fiscal.
- QA mantem rastreabilidade requisito -> teste -> artefato.

Revisao de roadmap ao final de cada sprint. Score atualizado apenas em gates. P0 interrompe desenvolvimento do agregado afetado. Nenhuma data de go-live e anunciada antes de M3.
