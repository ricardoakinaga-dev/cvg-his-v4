# Backlog executável para paridade Vetus 100/100

**Status:** substituido em 2026-07-11 por `2026-07-11-backlog-premium-executavel.md`
**Roadmap:** `2026-07-11-roadmap-100-paridade-vetus.md`

## Definition of Done

Todo ticket exige teste RED anterior, implementação integrada, validação/autorização no boundary, auditoria, documentação e evidência no gate. Quando aplicável, também exige tenant real, rollback, concorrência, idempotência e E2E sem `skip`.

## P0 - fundação e jornada principal

| ID         | Entrega                                        | Dependências         | Aceite                                                                                                  | Estado                                                                                                     |
| ---------- | ---------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| GATE-001   | Gate por evidência comportamental              | -                    | cada ponto referencia teste/artefato; blocker força falha                                               | pendente                                                                                                   |
| GATE-002   | `test:e2e` representa a coleção crítica        | GATE-001             | inventário explícito, zero `skip`, relatório de cenários                                                | pendente                                                                                                   |
| SEC-001    | Roles separadas para migration/API/worker      | -                    | serviços sem superuser ou `BYPASSRLS`                                                                   | concluído 2026-07-11; Compose reaplica grants em volumes existentes e Helm exige o gate                    |
| SEC-002    | Unit of Work tenant-aware                      | SEC-001              | query e `SET LOCAL` na mesma transação                                                                  | parcial: escopo por transação e UoW atômica da admissão concluídos; demais agregados em BILL-002           |
| AUTH-001   | Login resolve conta e associação               | SEC-002              | login ambíguo rejeitado; tenant validado na sessão                                                      | parcial: ambiguidade rejeitada e conta validada; descoberta amigável da conta ainda pendente               |
| AUTH-002   | MFA challenge compartilhado                    | AUTH-001             | funciona entre instâncias e após restart                                                                | pendente                                                                                                   |
| DB-001     | Migrations canônicas completas                 | SEC-002              | tabelas/colunas obrigatórias presentes e verificadas                                                    | parcial: gate RLS 117/117 e internação reconciliada; outros domínios do roadmap ainda abertos              |
| DB-001A    | Governança de acesso canônica e multitenant    | DB-001               | 7 tabelas, FKs compostas, RLS, hidratação de múltiplas contas e migration limpa                         | concluído 2026-07-11                                                                                       |
| DB-001B    | Ponte persistente do estoque operacional       | DB-001A              | tabelas runtime, FKs, RLS, isolamento, atomicidade e concorrência; repository deixa de bloquear startup | parcial: schema/startup/isolamento concluídos; Unit of Work e lock pendentes                               |
| DB-001C    | Agenda canônica compatível com runtime         | DB-001B              | `start_at/end_at` canônicos, UUID, round-trip, isolamento, restart e startup DB                         | concluído 2026-07-11; check-in atômico depende de SEC-002                                                  |
| DB-001D    | Runtime PostgreSQL sem guard                   | DB-001C              | API inicia/reinicia em modo database e relê massa persistida                                            | concluído 2026-07-11 no ambiente local; release ainda depende dos gates SEC/RLS                            |
| DB-001E    | MFA, webhooks e clínica dependente multitenant | DB-001D              | conta UUID, FKs compostas, RLS e predicates explícitos                                                  | concluído 2026-07-11; role de runtime depende de SEC-001/002                                               |
| DB-001F    | Internação e cirurgia canônicas                | DB-001E              | progressos/casos/stays persistem, hidratam e sobrevivem restart                                         | concluído 2026-07-11; restart e E2E avançado comprovados                                                   |
| RBAC-001   | Catálogo operacional coerente com rotas        | DB-001E              | perfis recebem permissões necessárias; páginas não falham silenciosamente                               | parcial: admin corrigido por `0067`; matriz dos demais perfis pendente                                     |
| DB-002     | Proibir fallback fora de dev/test explícito    | DB-001               | startup falha quando schema obrigatório falta                                                           | pendente                                                                                                   |
| OUTBOX-001 | Consumidores reais e idempotentes              | DB-001               | claim concorrente, retry e estado terminal provados                                                     | pendente                                                                                                   |
| DATA-001A  | Remover bloqueio por prefixo na SPA            | -                    | IDs `patient_`/`owner_` não são inferidos como Vetus                                                    | concluído 2026-07-11                                                                                       |
| DATA-001B  | Não expor seed não persistido com PostgreSQL   | DB-001               | lista contém somente entidades persistidas/canônicas                                                    | concluído 2026-07-11; ativação depende de DB-001                                                           |
| DATA-001C  | Importar/migrar cadastros para UUID            | DATA-001B            | todo animal listado abre atendimento; Vetus fica em `legacyVetusId`                                     | parcial: massa UUID tutor/paciente criada e relida após restart; importador Vetus pendente                 |
| REG-001    | Vínculos tutor-paciente completos              | DATA-001C            | principal, autorizados, troca, merge e inativação                                                       | pendente                                                                                                   |
| CLIN-001   | Episódio encerrado é read-only                 | DATA-001C            | add/update/archive rejeitados; reabertura auditada                                                      | parcial: domínio protegido; UI/reabertura pendentes                                                        |
| CLIN-002   | Separar ativo de último episódio               | CLIN-001             | nenhuma ação usa episódio fechado implicitamente                                                        | pendente                                                                                                   |
| UX-001     | Simplificar Animais e Novo Atendimento         | DATA-001C            | iniciar em até duas ações, um CTA primário, sem bloqueio                                                | pendente                                                                                                   |
| BILL-001   | Ledger canônico por atendimento/comanda        | CLIN-001, OUTBOX-001 | uma fonte para itens, pagamentos e estornos                                                             | pendente                                                                                                   |
| BILL-002   | Atomicidade clínica/estoque/financeiro         | BILL-001             | falha reverte tudo; retry não duplica                                                                   | pendente                                                                                                   |
| INP-001    | Admissão SPA/API                               | CLIN-001, DB-001     | leito, responsável, plano, comanda e auditoria                                                          | parcial: admissão/leito/responsável/auditoria e UoW concluídos; plano/comanda integrados pendentes         |
| FLOW-001   | Checklist de fechamento                        | BILL-001, INP-001    | bloqueia pendências clínicas/financeiras/handoff                                                        | pendente                                                                                                   |
| E2E-001    | Agendado até recebimento                       | P0 jornada           | login real e PostgreSQL, sem atalho/skip/retry                                                          | pendente                                                                                                   |
| E2E-002    | Avulso até recebimento                         | P0 jornada           | busca/cadastro até pagamento/fechamento                                                                 | pendente                                                                                                   |
| E2E-003    | Dois tenants reais                             | SEC/AUTH             | mesma jornada sem leitura/escrita cruzada                                                               | pendente                                                                                                   |

## P1 - clínica e hospital

| ID         | Entrega                          | Dependências      | Aceite                                                                 |
| ---------- | -------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| CLIN-003   | Cockpit paciente + episódio      | CLIN-002          | identidade compacta, editor central, pendências e timeline sob demanda |
| CLIN-004   | SOAP, receita e alta versionados | CLIN-001          | assinatura, autoria, impressão e sem reutilização acidental            |
| QUEUE-001  | Esteira multissetorial           | CLIN-001          | SLA, responsável, transferência, colisão e histórico                   |
| LAB-001    | Esteira laboratorial             | CLIN-004          | pedido, coleta, análise, laudo, assinatura, entrega e recoleta         |
| FILE-001   | Upload clínico seguro            | SEC-002           | binário, MIME/tamanho, checksum, antivírus e autorização               |
| INP-002    | Mapa terapêutico 24h             | INP-001, BILL-002 | aprazamento, administração, ocorrência, consumo, diária e alta         |
| INV-001    | Lote, validade e custo           | BILL-002          | FEFO, reserva, consumo, devolução e inventário concorrente             |
| PUR-001    | Compra/NF transacional           | INV-001           | documento, lotes, saldo, fiscal e financeiro atômicos                  |
| INV-002    | Transferência entre estoques     | INV-001           | trânsito, recebimento parcial, divergência e auditoria                 |
| AGENDA-001 | Agenda completa                  | AUTH-001          | concorrência, recorrência, confirmação, cancelamento e no-show         |
| UX-002     | Design system e termos canônicos | UX-001            | padrão único de cabeçalho, alerta, diálogo e vocabulário               |
| UX-003     | Decompor páginas gigantes        | UX-002            | módulos focados com comportamento preservado                           |
| A11Y-001   | WCAG 2.2 AA                      | UX-002            | automação e teclado nos fluxos críticos                                |

## P2 - comercial, continuidade e gestão

| ID        | Entrega                      | Aceite                                                             |
| --------- | ---------------------------- | ------------------------------------------------------------------ |
| FIN-001   | Caixa completo               | abertura, suprimento, sangria, depósito e fechamento reconciliados |
| FIN-002   | Pagamentos e conciliação     | split, parcelas, estorno, chargeback e idempotência                |
| PAY-001   | PIX/cartão homologados       | webhook assinado, replay bloqueado e reconciliação                 |
| FISC-001  | NFS-e homologada             | certificado seguro, emissão, rejeição, correção e cancelamento     |
| PREV-001  | Preventivo                   | protocolo, execução, próxima dose e reagendamento                  |
| MKT-001   | Consentimento                | opt-in/out por canal e bloqueio antes do envio                     |
| MKT-002   | Entrega de comunicação       | template, fila, retry, idempotência, entrega e bounce              |
| HR-001    | Profissões e folgas          | persistência, conflito de agenda e autorização                     |
| COMM-001  | Comissão até pagamento       | cálculo, revisão, fechamento, estorno e pagamento                  |
| REP-001   | Relatório agendado           | worker gera, entrega e reprocessa sem duplicação                   |
| INT-001   | Portal/Live Pet equivalente  | animal, vacinas, exames, receitas e agenda autorizados             |
| INT-002   | Laboratório integrado        | pedido/resultado bidirecional com correlação e retry               |
| MIG-001   | Importação Vetus idempotente | dry-run, rejeitados, retomada, rollback e reconciliação            |
| LGPD-001  | Direitos e retenção          | exportação, anonimização, retenção e legal hold                    |
| ADMIN-001 | Remover cenografia           | nenhuma rota ativa com hardcode ou ação principal inativa          |

## Rastreabilidade das notas

| Item auditado        | Tickets principais                   |
| -------------------- | ------------------------------------ |
| Produto integrado 46 | todos                                |
| Jornada clínica 49   | DATA, REG, CLIN, UX, BILL, FLOW, E2E |
| Provas 54            | GATE, E2E, concorrência e restart    |
| Paridade 0/11        | todos os domínios do contrato        |
| Governança 78        | GATE-001 e evidência por release     |
| UX 41                | UX-001/002/003 e A11Y-001            |
| Tutor/paciente 58    | DATA-001 e REG-001                   |
| Agenda 67            | AGENDA-001                           |
| Esteira 61           | QUEUE-001                            |
| Atendimento 73       | CLIN-001/002/003/004                 |
| Receita/alta 65      | CLIN-004 e FLOW-001                  |
| Comanda 49           | BILL-001/002 e FIN-001/002           |
| Estoque 47           | INV-001/002 e PUR-001                |
| Laboratório 43       | LAB-001 e FILE-001                   |
| Internação 41        | INP-001/002                          |
| Preventivo 31        | PREV-001 e MKT-001/002               |
| Fiscal 34            | FISC-001                             |
| RH/comissões 34      | HR-001 e COMM-001                    |
| Relatórios 39        | REP-001                              |
| Integrações 42       | OUTBOX-001, INT-001/002 e MIG-001    |
| Acesso/LGPD 33       | SEC, AUTH e LGPD-001                 |

## Evidência da execução

Cada ticket concluído deve registrar:

- teste RED executado;
- arquivos alterados;
- testes GREEN e comandos;
- evidência UI/API/DB quando aplicável;
- riscos residuais;
- alteração objetiva do score, ou justificativa para mantê-lo.

O diário vigente da primeira onda está em `2026-07-11-execucao-onda-1-paridade-vetus.md`.
