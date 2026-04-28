# Mapa da Tela Atual

Tela auditada: `OwnerDetailPage.vue`
Rota: `/owners/:id`
Exemplo: `/owners/owner_maria_silva`

## Estrutura visual atual

## Inventário estrutural solicitado

| Tipo | Existe na tela atual? | Itens encontrados | Observação |
|---|---|---|---|
| Seções | Sim | loading, erro, header, KPIs, alertas, ações rápidas, cadastro, hub operacional, CRM/financeiro, contatos/pets, agenda/atendimentos, pacotes/mensageria | Todas ficam em uma única página vertical |
| Cards | Sim | `DsCard`, `DsStatCard` e cards customizados `vetus-client-card` | Há excesso de cards abertos ao mesmo tempo |
| Tabelas | Não | Nenhuma tabela nativa na tela de detalhe | Listas são renderizadas como cards/linhas flexíveis |
| Formulários | Não na tela de detalhe | Não há `<form>` nesta page; editar/cadastrar abre rotas separadas | Ações levam para `/owners/:id/edit` e `/patients/new` |
| Botões | Sim | Header, ações rápidas, histórico, financeiro, pets, pacotes, mensageria | Vários botões apontam para rotas globais sem contexto |
| Menus dropdown | Não identificado | Nenhum dropdown nesta page | Precisa validação visual em runtime autenticado |
| Abas | Não | Nenhum tab/segmented control | A ausência contribui para excesso vertical |
| Accordions | Não na implementação atual | Nenhum accordion na page | O Vetus observado usa acordeões no cadastro do cliente |
| Modais | Não | Nenhum modal no detalhe | Ações perigosas não têm confirmação |
| Links | Sim | Via `DsButton tag="a"` e `href` externo para WhatsApp | Alguns links precisam preservar `ownerId`/`patientId` |
| Ícones clicáveis | Parcial | Emojis em `icon`/cards | Não há botões puramente icônicos |

### 1. Estado de loading

- Renderiza `SkeletonLoader` de heading e três linhas de texto.
- Não simula a estrutura real da tela.
- Não há loading parcial por bloco.

### 2. Estado de erro global

- Renderiza `DsAlert` danger quando `loadOwnerHub` falha.
- O erro é descartável.
- Não há botão de tentar novamente.

### 3. Header do cliente

Componente: `AppPageHeader`.

Conteúdo:

- Breadcrumb fixo: `Atendimento > Cadastros > Clientes > {nome}`.
- Título: nome completo do tutor.
- Badges: status ativo/inativo e responsável financeiro.
- Subtítulos: `Atendimento > Cadastros` e ID Vetus ou ID interno.

Ações:

- `Abrir Nova Comanda` -> `/counter-sales`.
- `Cadastrar Novo Animal` -> `/patients/new?ownerId={owner.id}`.
- `Editar Cadastro` -> `/owners/{owner.id}/edit`.
- `Voltar` -> `/owners`.

Problemas:

- `Abrir Nova Comanda` não passa `ownerId`.
- Há duas ações primárias competindo: comanda e novo animal.
- `Cadastrar Novo Animal` aparece também em ações rápidas.

### 4. KPIs

Quatro `DsStatCard`:

- quantidade de animais.
- quantidade de agendamentos futuros.
- quantidade de atendimentos ativos.
- contato principal.

Problemas:

- O valor do card fica vazio e o número entra no label.
- Contato principal é tratado como KPI, mas é dado acionável de comunicação.
- Ícones são emoji, não seguem padrão visual consistente com botões do design system.

### 5. Alertas do tutor

Renderiza `DsAlert` para:

- documento ausente.
- sem contatos.
- cliente inativo.
- sem animais.
- financeiro em aberto.
- orçamento ativo.

Problemas:

- Todos aparecem no mesmo peso.
- Alertas comerciais e cadastrais competem com alertas críticos.
- Alertas são descartáveis sem persistência aparente.

### 6. Ações rápidas

Card `Ações rápidas` com:

- `Cadastrar Novo Animal`.
- `Agendar`.
- `Animais Cadastrados`.
- `Abrir Comanda`.
- `Enviar mensagem`.

Problemas:

- Duplica ações do header.
- `Animais Cadastrados` vai para `/patients` sem `ownerId`.
- `Abrir Comanda` vai para `/counter-sales` sem `ownerId`.
- `Enviar mensagem` abre `wa.me` sem confirmação e sem texto contextual.

### 7. Cards cadastrais

Grid `owner-summary-grid` com seis cards:

- `Ficha do cliente`.
- `Identificação do cliente`.
- `Relacionamento`.
- `Endereço e contato`.
- `Resgate de pontos e limite`.
- `Resumo do cadastro`.

Problemas:

- Muitos dados abertos antes dos pets e histórico.
- Duplicidade de pontos, financeiro e relacionamento em blocos posteriores.
- `Resumo do cadastro` expõe detalhe técnico (`Fallback local`) para usuário final.
- Campos de origem Vetus, datas internas e resumo técnico aparecem com a mesma prioridade de contato.

### 8. Hub operacional Vetus-like

Grid `vetus-client-grid` com sete cards:

- `Resgate de Pontos`.
- `Live Animal e Live Lab`.
- `Agenda`.
- `Comandas e Vendas`.
- `Pacotes`.
- `Orçamentos`.
- `Situação Financeira`.

Problemas:

- Repete informações de pontos, financeiro, agenda e orçamentos.
- Botões `Histórico` apontam para rotas globais e não necessariamente mantêm contexto do tutor.
- `Live Animal e Live Lab` exibe inferências simples, não integração real confirmada.
- `Pacotes` mistura sugestão local e orçamento.

### 9. Alertas parciais e mensagens de ação

Cards de alertas para:

- `Visão parcial`: falha de owner-summary, financeiro ou orçamentos.
- `actionError`.
- `actionMessage`.

Problemas:

- Só cobre falhas de módulos carregados com `Promise.allSettled`.
- Falhas de owner, pets, agenda e atendimentos derrubam a tela inteira.
- Sucesso/erro de orçamento aparece longe da ação em páginas longas.

### 10. CRM financeiro e comandas

Grid com:

- `CRM financeiro`.
- `Comandas e Vendas`.

Ações:

- `Abrir financeiro`.
- `Abrir orçamentos`.
- `Gerar orçamento-base`.

Problemas:

- Dados de pontos e financeiro aparecem pela terceira vez.
- `Gerar orçamento-base` cria registro real sem confirmação.
- `CRM financeiro` é derivado no frontend e precisa validação como regra de negócio.

### 11. Contatos e animais

Grid com:

- `Contatos`.
- `Animais Cadastrados`.

Problemas:

- Contatos aparecem tarde, apesar de serem essenciais.
- `Animais Cadastrados` tem ação `Abrir Comanda` sem contexto de `ownerId` ou `patientId`.
- Não há ação direta para iniciar atendimento no pet.

### 12. Agenda e últimos atendimentos

Grid com:

- `Agenda vinculada`.
- `Últimos atendimentos`.

Problemas:

- Itens não têm ação para abrir agendamento ou atendimento.
- Não mostra status.
- Lista limitada a quatro sem link claro para ver todos filtrados pelo tutor.

### 13. Pacotes sugeridos e mensageria contextual

Grid com:

- `Pacotes sugeridos`.
- `Mensageria contextual`.

Problemas:

- Recomendações são calculadas localmente.
- `Criar orçamento` gera registro real sem confirmação.
- Mensagens são templates locais e podem soar como comunicação oficial sem aprovação.
- Não há distinção entre sugestão, rascunho e envio real.

## Microcomponentes identificados

| Microelemento | Nome sugerido | Função esperada | Estado atual | Problema | Recomendação |
|---|---|---|---|---|---|
| Header | `OwnerDetailHeader` | Identidade, status e ações principais | Embutido na page | CTAs competem e perdem contexto | OWNER-P0-001, OWNER-P1-001 |
| Badge status | `OwnerStatusBadge` | Mostrar ativo/inativo | `StatusBadge` genérico | OK, mas sem descrição operacional | OWNER-P1-002 |
| Badge financeiro | `FinancialResponsibleBadge` | Indicar responsável financeiro | `StatusBadge` genérico | Baixa explicação | OWNER-P1-002 |
| KPI | `OwnerQuickStats` | Resumo rápido | `DsStatCard` com valor vazio | Semântica visual fraca | OWNER-P1-003 |
| Alertas | `OwnerCriticalAlerts` | Riscos críticos | Lista de `DsAlert` | Mistura severidades | OWNER-P0-002 |
| Ações rápidas | `OwnerActionBar` | Ações contextuais | Card aberto | Duplicidade e links globais | OWNER-P0-001 |
| Card cadastral | `OwnerIdentityCard` | Dados de identificação | Seis cards soltos | Excesso aberto | OWNER-P1-004 |
| Card endereço | `OwnerAddressCard` | Endereço | Card aberto | Prioridade alta demais | OWNER-P1-004 |
| Card pontos | `OwnerLoyaltySummary` | Pontos reais | Duplicado | Origem confusa | OWNER-P2-003 |
| Card financeiro | `OwnerFinancialSummary` | Pendências e crédito | Duplicado | Usa lista global filtrada | OWNER-P2-002 |
| Card pets | `OwnerLinkedPatients` | Pets vinculados | Lista simples | Ações incompletas | OWNER-P1-005 |
| Card agenda | `OwnerAppointmentsPreview` | Próximos agendamentos | Lista sem link | Não abre item | OWNER-P1-006 |
| Card atendimentos | `OwnerRecentEncounters` | Histórico recente | Lista sem link | Não abre atendimento | OWNER-P1-007 |
| Card contatos | `OwnerContactChannels` | Comunicação | Lista tardia | Sem ações por canal | OWNER-P1-008 |
| Card CRM | `OwnerCrmInsight` | Etapa de relacionamento | Derivado local | Precisa validação | OWNER-P2-004 |
| Card pacotes | `OwnerPackageSuggestions` | Sugestões comerciais | Derivado local | Pode criar orçamento sem confirmação | OWNER-P0-003 |
| Mensageria | `OwnerCommunicationDrafts` | Rascunhos de contato | Templates locais | Sem revisão/confirmação | OWNER-P0-004 |
| Botão criar orçamento | `CreateOwnerQuoteButton` | Criar rascunho | Ação direta | Sem confirmação | OWNER-P0-003 |
| Botão WhatsApp | `OwnerWhatsAppAction` | Abrir contato | Link externo direto | Sem máscara/origem/consentimento | OWNER-P0-004 |
| Estado vazio | `OwnerEmptyState` | Orientar próximo passo | Texto simples | Sem CTA contextual | OWNER-P1-009 |
| Estado parcial | `OwnerPartialDataAlert` | Indicar falha parcial | Só alguns módulos | Incompleto | OWNER-P2-005 |
