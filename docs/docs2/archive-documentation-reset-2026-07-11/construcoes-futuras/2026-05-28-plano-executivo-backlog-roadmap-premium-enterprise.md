# Plano Executivo, Backlog e Roadmap - CVG-HIS v4 Premium Enterprise

Data: 2026-05-28

Base de entrada:

- `2026-05-28-relatorio-auditoria-docs-vs-programa.md`
- `2026-05-28-relatorio-vetus-vs-implementacao.md`

## 1. Resumo executivo

O CVG-HIS v4 já possui uma base enterprise real: monorepo estruturado, SPA ampla, API com OpenAPI válido, worker, módulos de domínio, migrations, RLS, autenticação avançada, integrações e uma cobertura funcional relevante do acervo Vetus.

O ponto crítico é que o produto ainda não deve ser tratado como Premium Enterprise pleno enquanto os gates técnicos estiverem quebrados. A leitura mais defensável hoje é homologação avançada / produção assistida com risco.

Objetivo deste plano:

Elevar o CVG-HIS v4 para uma versão Premium Enterprise vendável, auditável e operável, com foco em estabilidade técnica, paridade operacional Vetus, experiência premium, governança, segurança e capacidade real de implantação.

Meta executiva:

- Sair da nota consolidada atual de 76-77/100 para 90+/100.
- Transformar módulos parciais em domínios completos.
- Garantir gates verdes: typecheck, build, testes, cobertura, OpenAPI, segurança e E2E.
- Entregar um produto com pacote Enterprise demonstrável, homologável e implantável.

## 2. Princípios de entrega

1. Gate técnico primeiro: nenhuma evolução premium deve mascarar typecheck quebrado.
2. Paridade operacional antes de estética: o sistema precisa executar os fluxos críticos de uma clínica/hospital.
3. Domínio real antes de tela: módulos como pacotes, comissões e relatórios precisam de modelo, API, auditoria e testes.
4. Enterprise significa operar: observabilidade, segurança, backup, auditoria, multi-tenant, RLS e deploy precisam estar comprovados.
5. Premium significa experiência superior: UX consistente, dashboards claros, automação, atalhos, jornada rápida e baixa fricção.

## 3. Norte do produto Premium Enterprise

O CVG-HIS v4 Premium Enterprise deve ser posicionado como uma plataforma hospitalar veterinária completa, moderna e auditável, cobrindo:

- Atendimento, agenda, recepção, fila e comandas.
- Cadastro clínico completo de tutor e paciente.
- Prontuário, triagem, prescrições, diagnóstico, cirurgia e internação.
- Laboratório integrado.
- Estoque, compras, validade, transferência, produtos e fiscal.
- Financeiro, caixa, recebíveis, pagamentos, cartões, PIX, DRE e relatórios.
- Pacotes, orçamentos, fidelidade e vendas.
- RH, profissionais, permissões, comissões e produtividade.
- Marketing, notificações, WhatsApp, SMS e campanhas.
- Gestão multiunidade, governança, LGPD, auditoria e integrações.

## 4. Fases executivas

### Fase 0 - Estabilização obrigatória

Objetivo: tornar o repositório confiável para evolução.

Critérios de saída:

- `pnpm typecheck` verde na raiz.
- Typecheck verde em API, SPA e worker.
- `pnpm validate:openapi` verde.
- `pnpm build` verde.
- Testes unitários e integração executando sem falhas críticas.
- Baseline documentado de cobertura.
- Lista de riscos técnicos atualizada.

Backlog principal:

| ID | Item | Prioridade | Resultado esperado |
|---|---|---:|---|
| F0-01 | Corrigir resolução dos pacotes internos `shared-contracts`, `shared-types` e `shared-auth-sdk` | P0 | API, SPA e worker compilando |
| F0-02 | Corrigir erros de tipagem da SPA | P0 | Frontend pronto para build confiável |
| F0-03 | Corrigir typecheck do worker | P0 | Jobs e integrações com contrato estável |
| F0-04 | Executar build completo do monorepo | P0 | Artefatos geráveis |
| F0-05 | Revalidar OpenAPI após correções | P0 | Contratos HTTP preservados |
| F0-06 | Criar relatório de gates CI locais | P1 | Base objetiva para homologação |

### Fase 1 - Paridade Vetus core

Objetivo: fechar os fluxos operacionais que sustentam a rotina diária.

Critérios de saída:

- Agenda, comandas, clientes, animais, serviços, orçamentos, vendas e estoque operando ponta a ponta.
- Fluxos E2E dos principais atendimentos.
- Evidência funcional por módulo.

Backlog principal:

| ID | Item | Prioridade | Resultado esperado |
|---|---|---:|---|
| F1-01 | Validar e completar agenda ponta a ponta | P0 | Criar, reagendar, cancelar e concluir agendamentos |
| F1-02 | Consolidar comandas/counter-sales | P0 | Abrir, adicionar itens, pagar, fechar e cancelar comanda |
| F1-03 | Validar cadastro tutor/paciente | P0 | Cadastro, edição, busca e histórico funcionando |
| F1-04 | Completar vendas em relação ao fluxo Vetus legado | P1 | Vendas independentes de comanda quando necessário |
| F1-05 | Completar esteira de atendimento | P1 | Entrada, triagem, atendimento, conclusão e handoff |
| F1-06 | Completar esteira de exames | P1 | Pedido, coleta, resultado, liberação e vínculo ao paciente |
| F1-07 | Fechar vacinas e vermífugos | P1 | Eventos preventivos com agenda, status e notificação |
| F1-08 | Validar fidelidade/resgate de pontos | P2 | Pontuação, saldo, resgate e auditoria |

### Fase 2 - Domínios Premium faltantes

Objetivo: transformar áreas parciais em módulos completos e vendáveis.

Critérios de saída:

- Pacotes, comissões, relatórios, financeiro profundo, marketing e internação com domínio real.
- APIs, migrations, permissões, auditoria e testes por módulo.

Backlog principal:

| ID | Item | Prioridade | Resultado esperado |
|---|---|---:|---|
| F2-01 | Criar domínio real de pacotes | P0 | Pacotes com regras, vigência, saldo, consumo e renovação |
| F2-02 | Criar motor de comissões | P0 | Regras, cálculo, fechamento, revisão e pagamento |
| F2-03 | Criar motor de relatórios | P0 | Relatórios com filtros, exportação, agendamento e permissões |
| F2-04 | Aprofundar financeiro legado | P0 | Contas, cheques, cartões, bancos, split, DRE e conciliação |
| F2-05 | Completar internação | P1 | Ocorrências, diária, prescrição, evolução e alta |
| F2-06 | Completar marketing | P1 | Campanhas, segmentação, templates, SMS, WhatsApp e e-mail |
| F2-07 | Consolidar estoque transacional | P1 | NF, compras, validade, transferência, inventário e auditoria |
| F2-08 | Completar laboratório avançado | P1 | Laudos, referência, equipamentos, assinatura e integração |

Progresso registrado em 2026-05-28:

- F2-01 avancado com dominio real de pacotes.
- F2-02 avancado com motor de comissoes.
- F2-03 avancado com motor operacional e persistencia de relatorios.
- F2-04 avancado com baixa operacional de recebiveis, subledger de contas a pagar, DRE gerencial, integracao de pagaveis ao caixa, conciliacao de pagaveis nao-caixa e central consolidada de conciliacao financeira.
- F2-05 iniciado com ocorrencias estruturadas, diarias operacionais na ficha de internacao, persistencia PostgreSQL dedicada, integracao das diarias ao billing como item `daily_rate`, link visual da diaria faturada para a cobranca e fila gerencial de diarias por status, unidade e enfermaria.
- F2-06 iniciado com dominio real de marketing, segmentos, templates multicanal, campanhas agendaveis, API auditavel, OpenAPI, SPA operacional em `/marketing/campaigns`, persistencia PostgreSQL com RLS para segmentos/templates/campanhas e esteira de disparos com entregas rastreaveis por destinatario.
- F2-07 iniciado com ledger transacional de estoque, ajustes auditaveis, movimentacoes de consumo/venda, persistencia PostgreSQL opcional, endpoints `/inventory/movements` e `/inventory/adjustments`, e SPA operacional para consultar ledger, filtrar movimentacoes e registrar ajustes.
- F2-08 iniciado com liberacao assinada de resultados laboratoriais, metadados auditaveis de responsavel tecnico, hash de assinatura, persistencia PostgreSQL, OpenAPI, SPA de exames com coleta/liberacao operacional e laudo HTML imprimivel com pre-visualizacao na central de laudos.
- F3-01 iniciado com matriz RBAC/ABAC auditavel por modulo, acao, perfil, equipe, setor e usuario; endpoint `/access-control/module-permission-matrix`; OpenAPI; e painel na Governanca de Acesso.
- F3-02 iniciado com validador estatico `pnpm validate:rls`, auditoria de 91 tabelas tenant nas migrations canonicas e migration de fechamento RLS para API keys, webhooks, feature flags, anexos e internacao operacional.
- F3-03 iniciado com gate `pnpm security:enterprise`, secret scan, audit bloqueante para high/critical, CI sem `continue-on-error` para Semgrep, reducao do audit para `0 critical / 0 high` e registro das 3 vulnerabilidades moderadas restantes como divida de tooling.
- F3-04 iniciado com DSR escopado por conta, listagem geral de solicitacoes LGPD, exportacao pessoal auditavel server-side, auditoria de conclusao/rejeicao/exportacao e evidencia de eliminacao/anonimizacao com retencao legal.
- F3-05 iniciado com relatorio de cobertura operacional de auditoria, endpoint `/audit/operational-coverage`, OpenAPI, auditoria da propria leitura e painel SPA em `/audit` com requisitos cobertos/pendentes.
- F3-06 iniciado com contrato operacional de SLOs, endpoint `/slos`, alias `/health/slos`, gauges Prometheus de status/budget/burn rate, OpenAPI documentado e console SPA com leitura de disponibilidade, latencia, erro e orcamento de erro.
- F3-07/F3-08 iniciados com gate `pnpm ops:backup:check`, validacao estatica de backup/restore, sintaxe shell dos scripts operacionais, `pnpm deploy:check` e `pnpm validate:helm` estatico.
- F1-07 avancado com filtros rapidos na agenda preventiva de vacinas e vermifugos: vencidos, vence hoje, proximos 7 dias e sem aviso.

### Fase 3 - Enterprise hardening

Objetivo: tornar o produto seguro, auditável, observável e implantável.

Critérios de saída:

- Segurança e governança comprovadas.
- Observabilidade funcional.
- Deploy reproduzível.
- Plano de backup, restauração e operação.

Backlog principal:

| ID | Item | Prioridade | Resultado esperado |
|---|---|---:|---|
| F3-01 | Revisar RBAC/ABAC por módulo | P0 | Permissões por perfil, unidade e ação com matriz auditavel |
| F3-02 | Validar RLS multi-tenant | P0 | Isolamento forte entre contas/unidades com gate `validate:rls` |
| F3-03 | Executar secret scan, Semgrep e auditorias | P0 | Sem vazamento ou vulnerabilidade crítica |
| F3-04 | Validar LGPD | P0 | Consentimento, logs, exportação e eliminação quando aplicável |
| F3-05 | Fortalecer auditoria operacional | P1 | Eventos relevantes rastreados por usuário, conta e entidade |
| F3-06 | Validar health, metrics e SLOs | P1 | Operação monitorável com SLO, budget e burn rate |
| F3-07 | Validar Docker/Helm/deploy | P1 | Implantação reproduzível |
| F3-08 | Definir backup e restore testado | P1 | Recuperação comprovada |

### Fase 4 - Experiência Premium

Objetivo: elevar percepção de valor e produtividade.

Critérios de saída:

- UI consistente.
- Fluxos rápidos.
- Dashboards executivos.
- Experiência mobile/responsiva aceitável.
- Onboarding e suporte operacional.

Backlog principal:

| ID | Item | Prioridade | Resultado esperado |
|---|---|---:|---|
| F4-01 | Padronizar design system da SPA | P1 | Layout, botões, tabelas, filtros e formulários consistentes |
| F4-02 | Criar dashboards executivos Premium | P1 | Gestão clínica, financeira, operacional e estoque |
| F4-03 | Criar cockpit do paciente/tutor | P1 | Visão 360 consolidada |
| F4-04 | Otimizar busca global | P2 | Busca por tutor, paciente, produto, comanda e documento |
| F4-05 | Criar ações rápidas contextuais | P2 | Menos cliques nos fluxos de recepção e atendimento |
| F4-06 | Melhorar estados vazios, loading e erros | P2 | Experiência mais profissional |
| F4-07 | Preparar documentação de uso | P2 | Guia de implantação e operação |

Status em 2026-05-28:

- `F4-02` iniciado com a `Central executiva Premium` na tela inicial, consolidando SLO operacional, cobertura de auditoria, eventos auditados e prioridades do gestor a partir de contratos reais da Fase 3.
- `F4-02` expandido com `Lentes executivas` para gestao clinica, financeiro do dia, operacao comercial e estoque critico, usando internacao, diarias pendentes, dashboard comercial e cadastro de estoque como fontes reais.
- `F4-02` expandido com exames laboratoriais pendentes na lente `Gestão clínica`, usando pedidos `requested` e `collected` como sinal executivo e atalho para `/laboratory/orders`.
- `F4-03` iniciado com `Cockpit 360 tutor/paciente` no detalhe do tutor, consolidando pacientes, agenda, atendimento ativo, financeiro, alertas clinicos e proxima acao contextual.
- `F4-03` expandido com sinais reais de preventivo e laboratorio no cockpit do tutor, incluindo proximo evento preventivo por paciente, exames pendentes e contadores no resumo da jornada assistencial.
- `F4-03` expandido para o detalhe do paciente com `Cockpit 360 do paciente`, consolidando jornada clinica, preventivo, laboratorio, financeiro e proxima acao antes dos acordeoes operacionais.
- `F4-03` expandido com `Timeline 360 unificada` no detalhe do paciente, consolidando atendimento, prontuario, agenda, financeiro, laboratorio, preventivo e mensagens contextuais.
- `F4-03` expandido com `Timeline 360 do tutor`, agregando agenda, atendimento, financeiro, laboratorio, preventivo e mensagens dos pacientes vinculados.
- `F4-03` expandido com hierarquia critica na proxima acao do cockpit do paciente, priorizando triagem critica e exames pendentes antes de cobranca comum.
- `F4-03` expandido com hierarquia critica no cockpit do tutor, priorizando exames laboratoriais pendentes dos pacientes vinculados antes de cobranca comum.
- `F4-04` iniciado com busca global Premium na `Busca Mestre`, cobrindo tutores, pacientes, vinculos, produtos e comandas com atalhos operacionais.
- `F4-04` expandido com `Prioridade 360` nos resultados de pacientes da Busca Mestre, exibindo atencao clinica e atalho explicito para abrir o cockpit.
- `F4-04` expandido com contexto real na `Prioridade 360` da Busca Mestre, usando laboratorio, preventivo e billing, alem de filtro operacional por prioridade ativa.
- `F4-04` expandido com ordenacao por severidade da `Prioridade 360` na Busca Mestre, priorizando exames pendentes, preventivo vencido, pendencia financeira, atencao clinica e sem alerta.
- `F4-04` expandido com resumo agregado `Prioridade 360` na Busca Mestre, exibindo quantidade de pacientes por severidade.
- `F4-04` expandido com resumo `Prioridade 360` acionavel na Busca Mestre, filtrando pacientes e vinculos por severidade especifica.
- `F4-04` expandido com persistencia local da preferencia de filtro `Prioridade 360`, permitindo que a operacao retorne ao mesmo recorte de triagem na Busca Mestre.
- `F4-04` coberto por E2E base da jornada Busca Mestre -> cockpit 360 -> recepcao -> cockpit 360 -> esteira, validando paciente com prioridade clinica e check-in preparado.
- `F4-04` expandido com E2E da severidade `Exames pendentes`, criando atendimento e pedido laboratorial real via API e validando Busca Mestre, cockpit 360 e acao contextual da recepcao.
- `F4-04` expandido com E2E da severidade `Pendência financeira`, criando estimativa, item e faturamento aberto via API e validando Busca Mestre, cockpit 360 e acao contextual da recepcao.
- `F4-04` expandido com E2E da severidade `Preventivo vencido`, criando evento preventivo vencido via API e validando Busca Mestre, cockpit 360 e acao contextual da recepcao.
- Runtime E2E corrigido para usar store preventivo em memoria quando `API_DISABLE_INCOMPATIBLE_DB_REPOS=1`, evitando dependencia acidental de PostgreSQL local na trilha de preventivos.
- `F4-04` validado tambem com PostgreSQL real: Playwright passou 4/4 com `API_DISABLE_INCOMPATIBLE_DB_REPOS=0`, API em `persistenceMode: "database"` e migrations canonicas aplicadas ate `0054_enterprise_rls_gap_closure`.
- Migrations de comissoes e laboratorio corrigidas para destravar validacao PostgreSQL real da jornada 360.
- `F4-04/F4-05` receberam cobertura mobile visual da jornada 360 em viewport `390x844`, com screenshots de Busca Mestre, cockpit 360 e recepcao e verificacao de ausencia de overflow horizontal.
- `F4-04/F4-05` promovidos para gate CI via `pnpm test:e2e:spa:360`, rodando specs funcional e mobile como passo bloqueante no workflow `test-e2e-spa`.
- Dashboard Executivo Premium e Motor Enterprise de Relatorios promovidos para gate E2E via `pnpm test:e2e:spa:enterprise`, cobrindo KPIs/lentes executivas, execucao/exportacao/agendamento de relatorio e ausencia de overflow horizontal.
- `F4-05` iniciado com `Acoes rapidas contextuais` na Recepcao, derivando atalhos de cockpit, agenda, check-in e comanda a partir da busca atual.
- `F4-05` expandido com `Prioridade 360` nas acoes rapidas da Recepcao, destacando pacientes com alerta clinico cadastral antes de agenda, esteira ou comanda.
- `F4-05` expandido com contexto real na `Prioridade 360` da Recepcao, priorizando exames laboratoriais pendentes e preventivo vencido antes de seguir para agenda, esteira ou comanda.
- `F4-05` expandido com pendencia financeira na `Prioridade 360` da Recepcao, usando billing do tutor e preservando laboratorio/preventivo acima de cobranca comum.
- `F4-06` iniciado com estados profissionais na `Busca Mestre`: loading explicito, resultado parcial por dominio, limpeza de estado stale e erro consolidado quando todos os grupos falham.
- `F4-07` iniciado com guia operacional Premium Enterprise para demo, piloto controlado, navegacao por rotas reais, gates minimos, suporte a falha parcial, auditoria, SLO e checklist de Release Candidate.
- Experiencia Premium expandida com `Roteiro operacional Premium` na tela inicial, transformando o guia em onboarding acionavel para recepcao, busca federada, cockpit 360, auditoria e SLO/suporte.
- Relatorios agendados avancados com `nextRunAt`, consulta de agendamentos vencidos em `/reports/schedules/due`, OpenAPI atualizado e exibicao da proxima execucao/destinatarios no Motor Enterprise de Relatorios.
- Worker expandido para processar relatorios agendados vencidos, executar/exportar recorrencias, avancar `nextRunAt` e registrar `lastRunAt`, `lastExecutionId` e `lastError` para suporte operacional.
- Motor Enterprise de Relatorios expandido com controle operacional de agendamentos: pausar/reativar pela SPA, status ativo/pausado, ultima execucao, ultima falha, auditoria e contrato `PATCH /reports/schedules/{scheduleId}`.
- Observabilidade de relatorios agendados iniciada no worker com metricas Prometheus para schedules vencidos, executados, exportados, falhos e duracao do tick.
- Motor Enterprise de Relatorios recebeu alerta visual para schedules com `lastError`, mantendo status ativo/pausado e destacando `Falha no ultimo envio` na tabela operacional.
- Motor Enterprise de Relatorios recebeu KPI `Agendamentos com falha`, consolidando schedules com `lastError` no topo da pagina para triagem rapida.
- KPI `Agendamentos com falha` passou a filtrar a tabela operacional, exibindo somente schedules com `lastError` e permitindo limpar o filtro.
- Relatorios agendados passaram a registrar e exibir historico de entregas por destinatario, com status `sent`/`failed`, formato, execucao, data, erro, API dedicada e persistencia PostgreSQL com RLS.
- Historico de entregas de relatorios agendados recebeu filtros por status e periodo na SPA, permitindo triagem de enviados/falhados por janela operacional.
- Historico de entregas recebeu resumo visual de total filtrado, enviados e falhados, refletindo os filtros ativos de status e periodo.
- Entregas falhadas de relatorios agendados passaram a ter reprocessamento assistido: API auditada, nova exportacao da execucao original, novo registro `sent` e acao `Reprocessar` na SPA.
- Historico de entregas recebeu reprocessamento em lote das falhas filtradas na SPA, reutilizando o endpoint auditado de retry e atualizando os indicadores locais.
- Historico de entregas passou a destacar falhas recorrentes por destinatario, com quantidade de falhas, ultima falha e ultimo erro respeitando os filtros ativos.
- Worker de relatorios agendados recebeu resolvedores por `reportId` para `administrative-executive` e `commission-calculations`, deixando de executar recorrencias com linhas vazias por padrao.
- Resolvedor recorrente `administrative-executive` do worker foi conectado a fontes operacionais reais quando ha banco disponivel: dashboard comercial, DRE/financeiro e caixa aberto, mantendo fallback em memoria.
- Resolvedor recorrente `commission-calculations` do worker foi conectado a fechamentos persistidos via `CommissionsService` e `DatabaseCommissionRepository`, respeitando filtros de status e periodo do agendamento.
- Observabilidade de relatorios agendados foi aprofundada com a metrica Prometheus `worker_scheduled_report_executions_total`, segmentada por `report_id`, `outcome` e `row_state` para distinguir execucoes vazias, preenchidas e falhas.
- Motor Enterprise de Relatorios recebeu painel operacional de execucoes vazias versus preenchidas, usando `rowCount` das execucoes para separar `Execuções com dados` e `Execuções vazias` na SPA.
- Entregas de relatorios agendados ganharam alertas operacionais backend/API para falhas recorrentes por destinatario, com contrato `/reports/schedules/{scheduleId}/delivery-alerts`, OpenAPI e exibicao na SPA.
- Alertas operacionais de entregas de relatorios foram conectados a auditoria central: leitura de alertas grava evento `report_schedule_delivery_alerts_read` high-risk e cobre requisito `reports-delivery-alerts-read` no relatorio `/audit/operational-coverage`.
- Painel `/audit` recebeu resumo `Alertas de relatórios` e acao `Filtrar alertas`, aplicando entityType `report-schedule-delivery-alert` e risco `high` para triagem direta.
- Eventos auditados de alertas de relatorios receberam link reverso `Abrir agendamento`, levando para `/reports/engine?scheduleId=...` e carregando automaticamente entregas e alertas do agendamento.
- Motor Enterprise de Relatorios recebeu reprocessamento assistido por alerta: acao `Reprocessar alerta` reprocessa entregas falhadas do destinatario recorrente usando o endpoint auditado de retry.
- Motor Enterprise passou a exibir contexto de origem da auditoria quando aberto via `scheduleId`, com card `Agendamento aberto pela auditoria`, dados do agendamento e botao `Voltar para Auditoria`.

## 5. Backlog consolidado por prioridade

### P0 - Obrigatório para virar Enterprise

- Corrigir typecheck de API, SPA e worker.
- Garantir build completo.
- Garantir OpenAPI verde.
- Corrigir contratos internos compartilhados.
- Criar domínio real de pacotes.
- Criar motor real de comissões.
- Criar motor de relatórios.
- Aprofundar financeiro operacional.
- Validar RBAC/ABAC por módulo.
- Validar RLS multi-tenant.
- Executar auditorias de segurança.
- Criar E2E dos fluxos críticos.

### P1 - Necessário para Premium competitivo

- Completar esteira de atendimento.
- Completar esteira de exames.
- Fechar internação com ocorrência, diária, prescrição, evolução e alta.
- Consolidar estoque transacional.
- Completar marketing.
- Completar laboratório avançado.
- Padronizar design system.
- Criar dashboards executivos.
- Validar observabilidade, deploy, backup e restore.

### P2 - Diferenciais de maturidade

- Fidelidade avançada.
- Busca global premium.
- Ações rápidas contextuais.
- Onboarding assistido.
- Guias operacionais.
- Melhorias de usabilidade fina.
- Automação de campanhas e lembretes.
- Relatórios agendados.

## 6. Roadmap sugerido

### Sprint 1-2: Gates e fundação

Foco:

- Typecheck.
- Build.
- OpenAPI.
- Ajuste dos pacotes compartilhados.
- Correção dos erros principais da SPA e worker.

Entrega:

- Repositório tecnicamente confiável.
- Relatório de baseline.

### Sprint 3-4: Core operacional

Foco:

- Agenda.
- Comandas.
- Cadastros.
- Serviços.
- Orçamentos.
- Vendas.
- E2E dos fluxos diários.

Entrega:

- Core Vetus moderno operável.

### Sprint 5-7: Domínios críticos Premium

Foco:

- Pacotes.
- Comissões.
- Relatórios.
- Financeiro profundo.

Entrega:

- Primeira versão Premium comercialmente defensável.

### Sprint 8-10: Clínica avançada e operação hospitalar

Foco:

- Internação.
- Laboratório.
- Esteira.
- Esteira de exames.
- Vacinas e vermífugos.

Entrega:

- Operação hospitalar completa.

### Sprint 11-12: Enterprise hardening

Foco:

- Segurança.
- RBAC/ABAC.
- RLS.
- LGPD.
- Auditoria.
- Observabilidade.
- Deploy.
- Backup e restore.

Entrega:

- Produto pronto para homologação enterprise.

### Sprint 13-14: Experiência Premium e go-to-market técnico

Foco:

- UX.
- Dashboards.
- Busca global.
- Ações rápidas.
- Documentação de implantação.
- Demonstração executiva.

Entrega:

- CVG-HIS v4 Premium Enterprise pronto para demo, piloto controlado e venda assistida.

## 7. Marcos de aprovação

### Marco A - Enterprise Technical Ready

Requisitos:

- Typecheck verde.
- Build verde.
- OpenAPI verde.
- Testes principais verdes.
- Segurança sem crítico.
- RLS validado.

### Marco B - Vetus Parity Ready

Requisitos:

- Agenda, comandas, clientes, animais, serviços, estoque, fiscal, laboratório e financeiro core validados.
- E2E dos fluxos principais.
- Matriz Vetus atualizada com nota acima de 85.

### Marco C - Premium Modules Ready

Requisitos:

- Pacotes completo.
- Comissões completo.
- Relatórios completo.
- Financeiro profundo validado.
- Internação avançada validada.

### Marco D - Enterprise Release Candidate

Requisitos:

- Cobertura mínima definida e atingida.
- Observabilidade operacional.
- Deploy reproduzível.
- Backup/restore testado.
- Documentação de operação.
- Plano de suporte e rollback.

## 8. Métricas de sucesso

| Métrica | Meta |
|---|---:|
| Nota consolidada docs vs programa | 90+ |
| Aderência Vetus | 88+ |
| Typecheck | 100% verde |
| OpenAPI | 100% verde |
| Build | 100% verde |
| Segurança crítica | 0 |
| Fluxos E2E críticos | 100% verdes |
| Módulos P0 completos | 100% |
| RLS multi-tenant | Validado |
| Deploy reproduzível | Validado |

Atualização de progresso em 2026-05-28:

- A Central executiva Premium agora exibe `Alertas resolvidos`, contabilizando reprocessamentos auditados de entregas de relatórios e ligando o indicador à auditoria filtrada por `report-schedule-delivery`.

## 9. Riscos executivos

| Risco | Impacto | Mitigação |
|---|---|---|
| Evoluir features com typecheck quebrado | Alto | Fase 0 obrigatória antes de novas entregas grandes |
| Telas sem domínio real | Alto | Cada módulo Premium precisa de migration, API, service, UI, testes e auditoria |
| Relatórios virarem apenas dashboards | Alto | Criar motor com filtros, exportação, permissões e agendamento |
| Financeiro sem paridade operacional | Alto | Comparar rotina a rotina contra Vetus legado |
| Segurança multi-tenant incompleta | Crítico | Testes RLS, RBAC/ABAC e auditoria por módulo |
| Deploy não reproduzível | Alto | Validar Docker/Helm/ambiente antes do release candidate |

## 10. Recomendação final

A ordem correta para construir o CVG-HIS v4 Premium Enterprise é:

1. Estabilizar gates técnicos.
2. Validar core operacional já existente.
3. Completar módulos parciais de maior valor: pacotes, comissões, relatórios, financeiro e internação.
4. Endurecer segurança, multi-tenancy, auditoria, observabilidade e deploy.
5. Refinar experiência premium e preparar demonstração executiva.

Com essa sequência, o projeto deixa de ser apenas uma base avançada em homologação e passa a sustentar uma narrativa enterprise defensável: produto completo, auditável, seguro, operável e comercialmente apresentável.
