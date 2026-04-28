# Backlog de Microtarefas

Toda recomendação da auditoria deve passar por uma microtarefa abaixo antes de implementação.

## P0 - corrigir confusão crítica e ações perigosas

### OWNER-P0-001 - Contextualizar ações de comanda e navegação

- Descrição: revisar links de `Abrir Nova Comanda`, `Abrir Comanda` em pet e `Animais Cadastrados` para manter `ownerId` e, quando existir, `patientId`.
- Arquivo provável: `apps/spa/src/pages/owners/OwnerDetailPage.vue`.
- Risco: médio; pode alterar fluxo operacional.
- Dependências: validar suporte de query params em `/counter-sales` e `/patients`.
- Critério de aceite: nenhuma ação operacional sai da tela sem preservar contexto do tutor ou indicar seleção manual.
- Checklist: testar header; testar ação por pet; testar tutor sem pet; validar URL gerada; validar ausência de regressão visual.

### OWNER-P0-002 - Separar alertas críticos de recomendações

- Descrição: classificar alertas em críticos, atenção e oportunidade, mantendo somente riscos no bloco superior.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: baixo.
- Dependências: nenhuma.
- Critério de aceite: financeiro em aberto, inativo e sem contato aparecem antes de recomendações comerciais.
- Checklist: tutor inativo; tutor sem contato; tutor com orçamento ativo; tutor sem pet; mobile.

### OWNER-P0-003 - Adicionar confirmação antes de criar orçamento

- Descrição: fazer `Gerar orçamento-base` e `Criar orçamento` passarem por confirmação com resumo antes do `POST /quotes`.
- Arquivo provável: `OwnerDetailPage.vue`; possível uso de componente modal existente.
- Risco: médio; altera fluxo de criação.
- Dependências: identificar modal/confirm padrão existente.
- Critério de aceite: nenhum orçamento é criado com um clique acidental.
- Checklist: confirmar cria; cancelar não cria; erro aparece próximo à ação; loading por botão; teste unitário.

### OWNER-P0-004 - Tornar comunicação externa revisável

- Descrição: deixar claro que WhatsApp/e-mail/SMS são rascunhos ou links externos e exigir revisão antes de abrir mensagem contextual.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: médio por envolver comunicação com cliente.
- Dependências: validar política de consentimento e hub `/notifications/whatsapp`.
- Critério de aceite: usuário revisa texto e canal antes de abrir envio contextual.
- Checklist: tutor com WhatsApp; tutor sem WhatsApp; template de cobrança; template de agenda; mobile.

## P1 - reorganizar layout e hierarquia visual

### OWNER-P1-001 - Reduzir CTAs do header

- Descrição: deixar o header com identidade e ações cadastrais; mover ações operacionais para bloco próprio.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: baixo.
- Dependências: OWNER-P0-001.
- Critério de aceite: não há duas ações primárias concorrendo no header.
- Checklist: desktop; mobile; tutor ativo; tutor inativo.

### OWNER-P1-002 - Explicar badges do tutor

- Descrição: padronizar labels/status e adicionar contexto textual curto quando necessário.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: baixo.
- Dependências: nenhuma.
- Critério de aceite: status e responsável financeiro são compreensíveis sem abrir outros blocos.
- Checklist: ativo; inativo; responsável financeiro; não responsável.

### OWNER-P1-003 - Corrigir semântica dos KPIs

- Descrição: mover números para `value` e labels para texto fixo nos `DsStatCard`.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: baixo.
- Dependências: verificar API de `DsStatCard`.
- Critério de aceite: cards mostram valor e rótulo de forma consistente.
- Checklist: zero pets; múltiplos pets; contato ausente; mobile.

### OWNER-P1-004 - Consolidar cadastro completo

- Descrição: agrupar ficha, identificação, endereço, Vetus e notas em um bloco `Cadastro` com resumo e detalhes recolhíveis.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: médio por reorganizar muita marcação.
- Dependências: OWNER-P1-001.
- Critério de aceite: dados cadastrais continuam visíveis, mas não ocupam o topo inteiro.
- Checklist: documento; RG; endereço; datas; notas; dados ausentes.

### OWNER-P1-005 - Priorizar pets vinculados

- Descrição: posicionar `Animais Cadastrados` como primeiro bloco operacional após resumo rápido.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: baixo.
- Dependências: OWNER-P0-001.
- Critério de aceite: usuário vê pets sem passar por CRM/financeiro.
- Checklist: com pet; sem pet; pet inativo; ação detalhes; ação agendar.

### OWNER-P1-006 - Tornar agenda acionável

- Descrição: adicionar ação por agendamento e link para lista filtrada.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: médio.
- Dependências: validar rota de detalhe/lista de appointments.
- Critério de aceite: cada item de agenda tem caminho claro.
- Checklist: sem agenda; agenda futura; múltiplos pets; rota filtrada.

### OWNER-P1-007 - Tornar atendimentos acionáveis

- Descrição: adicionar ação por atendimento e link para histórico filtrado.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: médio.
- Dependências: validar rota de detalhe/lista de encounters.
- Critério de aceite: cada atendimento recente pode ser aberto.
- Checklist: atendimento aberto; atendimento fechado; sem atendimento; mobile.

### OWNER-P1-008 - Reposicionar comunicação

- Descrição: trazer contatos e ações de contato para perto do topo, com lista completa em bloco próprio.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: baixo.
- Dependências: OWNER-P0-004.
- Critério de aceite: telefone/WhatsApp/e-mail aparecem antes de financeiro secundário.
- Checklist: WhatsApp; telefone; e-mail; sem contato.

### OWNER-P1-009 - Melhorar estados vazios

- Descrição: substituir textos vazios simples por empty states com próxima ação segura.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: baixo.
- Dependências: OWNER-P0-001.
- Critério de aceite: cada bloco vazio orienta uma ação ou deixa claro que não há ação.
- Checklist: sem pets; sem contatos; sem agenda; sem atendimentos; sem documentos futuro.

### OWNER-P1-010 - Unificar financeiro visual

- Descrição: consolidar pendências, crédito, comandas e orçamentos em um bloco financeiro.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: médio.
- Dependências: OWNER-P2-002 para integração fina futura; pode iniciar só visual.
- Critério de aceite: não há três blocos repetindo os mesmos valores financeiros.
- Checklist: com pendência; sem pendência; com orçamento; sem orçamento.

### OWNER-P1-011 - Separar pacotes de orçamentos

- Descrição: ajustar nomenclatura e agrupamento para não confundir sugestão de pacote com orçamento real.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: baixo.
- Dependências: OWNER-P0-003.
- Critério de aceite: usuário entende se está vendo sugestão, orçamento ou pacote contratado.
- Checklist: sugestão local; orçamento ativo; sem sugestão; criação cancelada.

### OWNER-P1-012 - Remover jargão técnico da UI final

- Descrição: ocultar termos como `Fallback local`, `Resumo exposto` e detalhes técnicos de origem em área técnica ou auditoria.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: baixo.
- Dependências: nenhuma.
- Critério de aceite: usuário final não vê estado técnico de integração como conteúdo cadastral.
- Checklist: summary disponível; summary indisponível; erro parcial.

## P2 - melhorar integração com backend

### OWNER-P2-001 - Usar filtros backend para agenda e atendimentos

- Descrição: validar/criar leitura por `ownerId` para appointments e encounters em vez de carregar listas globais.
- Arquivo provável: services frontend e rotas backend de scheduling/encounters.
- Risco: médio/alto.
- Dependências: contratos de API.
- Critério de aceite: tela carrega agenda e histórico do tutor sem filtrar lista global no cliente.
- Checklist: endpoint filtrado; permissão; paginação; teste backend; teste frontend.

### OWNER-P2-002 - Criar resumo financeiro por tutor

- Descrição: validar endpoint de billing/counter-sales por `ownerId` para pendências, crédito, comandas e totais.
- Arquivo provável: rotas de billing/counter-sales e `OwnerDetailPage.vue`.
- Risco: alto por financeiro.
- Dependências: regra financeira validada.
- Critério de aceite: totais financeiros vêm de fonte backend explícita.
- Checklist: aberto; liquidado; cancelado; sem registros; permissões.

### OWNER-P2-003 - Integrar fidelidade com módulo comercial

- Descrição: substituir fórmula local de pontos por `commercial/loyalty` quando validado.
- Arquivo provável: `apps/spa/src/services/commercial.ts`, `OwnerDetailPage.vue`, rotas comerciais.
- Risco: médio.
- Dependências: regra de pontos oficial.
- Critério de aceite: pontos e resgate exibidos batem com API oficial.
- Checklist: saldo disponível; bloqueado; resgates; owner sem pontos; erro parcial.

### OWNER-P2-004 - Validar CRM e recomendações comerciais

- Descrição: remover ou formalizar `crmStage` e `packageRecommendations` como contrato backend.
- Arquivo provável: `OwnerDetailPage.vue`; possível módulo CRM/commercial futuro.
- Risco: médio.
- Dependências: decisão de produto.
- Critério de aceite: toda recomendação comercial tem origem declarada ou aparece como heurística interna.
- Checklist: estágio por pendência; estágio por orçamento; sugestão de pacote; sem dados.

### OWNER-P2-005 - Isolar loading/error por bloco

- Descrição: carregar módulos relacionados com estado independente e retry local.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: médio.
- Dependências: organização visual P1.
- Critério de aceite: falha em financeiro não derruba pets/contato/header.
- Checklist: falha owner; falha pets; falha financeiro; falha quotes; retry.

### OWNER-P2-006 - Mapear e adicionar documentos/anexos do tutor

- Descrição: validar entidade e endpoints de anexos para `owner`.
- Arquivo provável: `attachments.ts`, rotas de attachments, `OwnerDetailPage.vue`.
- Risco: médio.
- Dependências: contrato de attachments por entidade.
- Critério de aceite: bloco exibe documentos reais do tutor ou fica marcado como não suportado.
- Checklist: sem documento; com documento; erro; permissões; download/preview.

### OWNER-P2-007 - Mapear auditoria/logs por tutor

- Descrição: usar `/audit/events` filtrado por módulo/entityId para logs do cadastro.
- Arquivo provável: `access-control-routes.ts`, serviço `audit.ts`, `OwnerDetailPage.vue`.
- Risco: baixo/médio.
- Dependências: permissão `audit.read`.
- Critério de aceite: usuário autorizado vê eventos recentes do tutor.
- Checklist: sem permissão; com permissão; evento read; evento update; paginação.

### OWNER-P2-008 - Validar permissões de ações

- Descrição: garantir que botões respeitam RBAC/ABAC antes de aparecerem.
- Arquivo provável: `OwnerDetailPage.vue`, composable/session access.
- Risco: médio.
- Dependências: modelo de permissões frontend.
- Critério de aceite: usuário sem permissão não vê ou não executa ação gerencial.
- Checklist: owners.read; owners.manage; patients.manage; billing manage; quotes manage.

## P3 - polish visual e responsividade

### OWNER-P3-001 - Validar responsividade desktop/tablet/mobile

- Descrição: testar a tela reorganizada em larguras comuns e corrigir overflow, ordem e espaçamento.
- Arquivo provável: `OwnerDetailPage.vue`.
- Risco: baixo.
- Dependências: P1.
- Critério de aceite: sem overflow horizontal e ações seguem contexto em mobile.
- Checklist: 390px; 768px; 1280px; cards longos; textos longos.

### OWNER-P3-002 - Padronizar ícones

- Descrição: substituir emojis por ícones do padrão usado pelo projeto quando aplicável.
- Arquivo provável: `OwnerDetailPage.vue` e design system se necessário.
- Risco: baixo.
- Dependências: biblioteca de ícones disponível.
- Critério de aceite: ícones ficam consistentes com a UI operacional.
- Checklist: header; KPIs; botões; contraste; tooltips se necessário.

### OWNER-P3-003 - Revisar densidade e espaçamento

- Descrição: reduzir repetição visual, alinhar cards e ajustar hierarquia tipográfica.
- Arquivo provável: CSS scoped de `OwnerDetailPage.vue`.
- Risco: baixo.
- Dependências: P1.
- Critério de aceite: tela fica escaneável sem parecer dashboard duplicado.
- Checklist: primeiro viewport; blocos secundários; listas; mobile; tema claro/escuro.
