# Owner Detail - Fase 0.5 Contencao de Risco

Data: 2026-04-28

## Escopo executado

Fase executada somente na tela de detalhe do tutor, com foco em contencao de risco operacional.

Arquivos alterados:

- `apps/spa/src/pages/owners/OwnerDetailPage.vue`
- `docs/micro-build/owners/09_owner_detail_phase_0_5_containment.md`

Nao foram alterados backend, banco de dados, endpoints, schemas, regras de negocio, componentes globais ou modulos externos.

## Tarefas executadas

### OWNER-P0-003 - Proteger criacao de orcamento

As acoes que chamavam `quoteService.create` foram protegidas por confirmacao local.

Acoes protegidas:

- `Gerar orcamento-base`
- `Criar orcamento` em pacotes sugeridos

Comportamento atual:

- O primeiro clique apenas abre um estado de confirmacao.
- A confirmacao mostra tutor, tipo da acao e observacao enviada como `notes`.
- `Cancelar` fecha a confirmacao e nao chama API.
- `Confirmar criacao` e a unica acao que executa `quoteService.create`.
- O erro da criacao aparece no bloco de confirmacao, proximo da acao.
- Loading fica restrito ao botao de confirmacao da acao em andamento.

Comportamento preservado:

- Mesmo payload de criacao de orcamento: `ownerId` e `notes`.
- Mesmas mensagens de sucesso apos criacao.
- Mesma atualizacao local da lista de orcamentos.

### OWNER-P0-001 - Contextualizar comandas e navegacao

Rotas ajustadas para preservar contexto quando ha suporte local validado.

Rotas alteradas:

- `Abrir Nova Comanda`: `/counter-sales?ownerId=<ownerId>`
- `Abrir Comanda` em acoes rapidas: `/counter-sales?ownerId=<ownerId>`
- `Abrir Comanda` dentro do card do animal: `/counter-sales?ownerId=<ownerId>&patientId=<patientId>`
- `Ver animais deste tutor`: `/patients?ownerId=<ownerId>`

Rotas validadas no frontend:

- `apps/spa/src/pages/sales/CounterSalesPage.vue` le `ownerId` e `patientId` via `readWorkflowContext()`.
- `apps/spa/src/pages/patients/PatientsListPage.vue` le `ownerId` da query string e filtra animais por tutor.

Rotas que ainda precisam validacao futura:

- Validar via E2E se `/counter-sales?ownerId=<ownerId>&patientId=<patientId>` preenche corretamente o fluxo completo de nova comanda, nao apenas o contexto inicial.
- `/billing` permanece global nesta fase; precisa validacao antes de receber filtro por tutor.
- `/quotes` permanece global nesta fase; precisa validacao antes de receber filtro por tutor.

### OWNER-P0-004 - Comunicacao externa revisavel

Comunicacao externa foi renomeada para nao parecer envio automatico.

Ajustes:

- Acao rapida de WhatsApp: `Abrir WhatsApp externo`.
- Card de mensageria: `Mensageria contextual (rascunhos)`.
- Botao de mensagem: `Abrir rascunho externo`.

Comportamento preservado:

- Links externos continuam abrindo a URL existente.
- Nenhum envio automatico foi implementado.
- Nenhuma integracao nova de CRM, SMS, e-mail ou WhatsApp foi criada.

TODO futuro:

- Definir fluxo formal de revisao, consentimento e auditoria antes de qualquer envio integrado.

### OWNER-P0-002 - Separar alertas criticos de oportunidades

Alertas do topo agora ficam restritos a risco operacional ou atencao de cadastro.

Alertas mantidos no topo:

- Documento ausente
- Sem contatos
- Cliente inativo
- Sem animais cadastrados
- Financeiro em aberto

Oportunidades comerciais foram separadas:

- Orcamentos ativos passam a aparecer como `Oportunidade comercial`.
- Oportunidades nao sao mais exibidas junto dos alertas criticos/atencao do topo.

## Acoes protegidas

- Criacao de orcamento-base: protegida por confirmacao.
- Criacao de orcamento de pacote: protegida por confirmacao.
- Cancelamento de confirmacao: nao chama API.
- Falha de API: exibida junto ao bloco da acao.

## Riscos restantes

- A tela ainda possui excesso de blocos e duplicidades visuais herdadas; isso deve ser tratado na Fase 1, nao nesta contencao.
- O suporte a `ownerId` e `patientId` em `/counter-sales` foi validado por leitura do frontend, mas ainda precisa validacao E2E do fluxo completo.
- Links globais de financeiro e orcamentos permanecem globais para evitar inventar suporte de filtro nao confirmado.
- O WhatsApp segue como link externo simples; nao ha trilha de consentimento, preview formal ou auditoria de envio.

## Proximos itens

P0:

- Adicionar teste unitario ou de componente cobrindo confirmacao antes de `quoteService.create`.
- Validar E2E de `/counter-sales?ownerId=<ownerId>&patientId=<patientId>`.

P1:

- Reorganizar hierarquia visual completa conforme especificacao da Fase 1.
- Consolidar financeiro, fidelidade, comandas e vendas em blocos unicos.
- Melhorar estados vazios com CTAs contextuais.

P2:

- Confirmar contratos de filtros por tutor em financeiro e orcamentos antes de alterar links globais.
- Desenhar fluxo seguro de comunicacao externa com revisao, consentimento e auditoria.

## Validacao executada

Comandos executados:

- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run test`: falhou.
- `npm run build`: passou.

Detalhe da falha em `npm run test`:

- Falha em `apps/spa/tests/unit/labels.test.ts`: teste espera `🐕 Canino`, mas `speciesLabel('canine')` retornou `🐕 Canina`.
- Vitest tambem reportou erros de teardown ao carregar estilo de `DashboardPage.vue` a partir de `src/pages/webhooks/__tests__/WebhooksListPage.test.ts`.
- A falha nao esta relacionada diretamente a `OwnerDetailPage.vue`, mas impede considerar a suite completa aprovada.

## Checklist de aceite

- [x] Nenhum orcamento e criado sem confirmacao.
- [x] Confirmacao mostra tutor, tipo da acao e observacao enviada.
- [x] Cancelar confirmacao nao chama API.
- [x] Loading fica restrito ao botao da acao de orcamento.
- [x] Erro de criacao aparece proximo da acao.
- [x] Acoes de comanda preservam `ownerId` quando disponivel.
- [x] Acao de comanda dentro do animal preserva `patientId`.
- [x] Comunicacao externa esta identificada como link externo/rascunho.
- [x] Oportunidades comerciais nao aparecem como alerta critico no topo.
- [x] `npm run typecheck` passou.
- [x] `npm run lint` passou.
- [ ] `npm run test` passou.
- [x] `npm run build` passou.
