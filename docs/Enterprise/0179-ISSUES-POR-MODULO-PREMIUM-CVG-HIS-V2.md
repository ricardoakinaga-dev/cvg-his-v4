# 0179 - Issues por Modulo Premium CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-04-11
**Base:** [0176-BACKLOG-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md](./0176-BACKLOG-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md) e [0178-PLANO-EXECUCAO-POR-SPRINTS-PREMIUM-CVG-HIS-V2.md](./0178-PLANO-EXECUCAO-POR-SPRINTS-PREMIUM-CVG-HIS-V2.md)
**Objetivo:** Detalhar cada modulo do sistema com suas issues formatadas em estilo GitHub, incluindo descricao, criterios de aceite, estimativas e labels.

---

## 1. Organizacao das Issues

### 1.1 Formato

Cada issue segue o formato:
```
## [MOD-XXX] Titulo descritivo

**Modulo:** nome-do-modulo
**Prioridade:** P0/P1/P2
**Sprint:** N
**Estimativa:** X pontos
**Labels:** label1, label2, label3

### Descricao

Contexto e o que precisa ser feito.

### Criterios de Aceite

- [ ] Criterio 1
- [ ] Criterio 2
- [ ] Criterio 3

### Tarefas

- [ ] Tarefa 1
- [ ] Tarefa 2
- [ ] Tarefa 3

### Dependencias

- Depende de: [MOD-XXX]
- Bloqueia: [MOD-YYY]
```

Todas as issues de construcao nova assumem `apps/spa` como destino. `apps/web` so deve aparecer em issues de desligamento, limpeza ou remocao de redirecionamentos.

### 1.2 Legenda de Labels

| Label | Cor | Uso |
|-------|-----|-----|
| design-system | purple | Design system e componentes |
| shell | blue | Navegacao e shell do SPA |
| dashboard | cyan | Dashboard e widgets |
| cadastro | green | Cadastro mestre |
| agenda | yellow | Agenda e scheduling |
| atendimento | orange | Atendimento e prontuario |
| financeiro | red | Faturamento e financeiro |
| governance | gray | Access control e administracao |
| platform | pink | Infraestrutura e plataforma |
| ux-premium | teal | Features premium de UX |
| security | crimson | Seguranca e MFA |
| observability | slate | Observabilidade e metricas |
| legal | gold | LGPD e compliance |
| legacy | black | Corte do legado web |

---

## 2. Modulo: Design System (P01)

### [P01-001] Storybook com componentes documentados

**Modulo:** design-system
**Prioridade:** P0
**Sprint:** 1
**Estimativa:** 5 pontos
**Labels:** design-system, documentation, infrastructure

**Descricao:**
Deployar Storybook com todos os 13 componentes atuais documentados e interativos.

**Criterios de Aceite:**
- [ ] Storybook acessivel em storybook.cvg-his-v2.internal
- [ ] Todos os 13 componentes documentados (DsButton, DsInput, DsModal, DsToast, DsTabs, etc.)
- [ ] Cada componente com controles interativos
- [ ] Token documentation com preview visual
- [ ] Search funcional por nome de componente

**Tarefas:**
- [ ] Configurar Storybook no packages/design-system
- [ ] Criar stories para cada componente existente
- [ ] Documentar props e variantes
- [ ] Criar pagina de overview com tokens
- [ ] Configurar deploy automatico

---

### [P01-002] Dark mode e light mode

**Modulo:** design-system
**Prioridade:** P0
**Sprint:** 1
**Estimativa:** 8 pontos
**Labels:** design-system, ux-premium

**Descricao:**
Implementar toggle de dark/light mode com transicao suave e persistencia.

**Criterios de Aceite:**
- [ ] Toggle no header acessivel em todas as telas
- [ ] Transicao suave sem flicker (< 200ms)
- [ ] Preferencias salvas em localStorage
- [ ] Follow system preference como padrao
- [ ] Tokens de cor consistentes em ambos modos

**Tarefas:**
- [ ] Definir tokens de dark mode (cores de superficie, texto, borda)
- [ ] Criar CSS variables para dark mode
- [ ] Implementar toggle component
- [ ] Adicionar preference detection (prefers-color-scheme)
- [ ] Implementar transicao suave com CSS transitions

---

### [P01-003] Command palette (Ctrl+K)

**Modulo:** design-system
**Prioridade:** P0
**Sprint:** 1
**Estimativa:** 13 pontos
**Labels:** design-system, ux-premium, shell

**Descricao:**
Implementar command palette global com Ctrl+K, busca fuzzy e historico.

**Criterios de Aceite:**
- [ ] Ctrl+K abre paleta em qualquer tela
- [ ] Busca fuzzy por nome de rota, acao ou entidade
- [ ] Resultados categorizados (navegacao, acoes, entidades)
- [ ] Teclas de atalho visiveis nos resultados
- [ ] Esc fecha paleta
- [ ] Historico de comandos recentes

**Tarefas:**
- [ ] Criar componente DsCommandPalette
- [ ] Implementar overlay com focus trap
- [ ] Adicionar fuzzy search (Fuse.js)
- [ ] Categorizar resultados
- [ ] Implementar keyboard navigation
- [ ] Criar comando de busca por entidades (tutores, pacientes)

---

### [P01-004] Keyboard navigation completa

**Modulo:** design-system
**Prioridade:** P0
**Sprint:** 1
**Estimativa:** 8 pontos
**Labels:** design-system, accessibility, ux-premium

**Descricao:**
Implementar navegacao completa por teclado em todo o SPA.

**Criterios de Aceite:**
- [ ] Tab order logical em todas as telas
- [ ] "/" foca busca global
- [ ] "?" abre help de atalhos
- [ ] Arrow keys navegam listas e grids
- [ ] Enter confirma acoes
- [ ] Escape cancela/fecha
- [ ] Focus visible em todos os elementos

**Tarefas:**
- [ ] Definir tab order em todos os forms
- [ ] Implementar global keyboard handler
- [ ] Criar overlay de help (?)
- [ ] Adicionar focus ring em todos interativos
- [ ] Implementar roving tabindex em composables

---

### [P01-005] Skeleton loading

**Modulo:** design-system
**Prioridade:** P1
**Sprint:** 2
**Estimativa:** 5 pontos
**Labels:** design-system, ux-premium

**Descricao:**
Implementar componentes de skeleton loading para estados de carregamento.

**Criterios de Aceite:**
- [ ] Skeleton para lista (table rows)
- [ ] Skeleton para card (stat/widget)
- [ ] Skeleton para form (inputs)
- [ ] Skeleton para detail (mixed)
- [ ] Animacao de pulse suave

**Tarefas:**
- [ ] Criar DsSkeleton component
- [ ] Criar DsSkeletonRow para listas
- [ ] Criar DsSkeletonCard para widgets
- [ ] Adicionar animacao CSS
- [ ] Integrar com composable de loading state

---

### [P01-006] Componentes de navegacao

**Modulo:** design-system
**Prioridade:** P1
**Sprint:** 2
**Estimativa:** 8 pontos
**Labels:** design-system, shell, navigation

**Descricao:**
Implementar componentes de navegacao: sidebar, tabs, breadcrumbs.

**Criterios de Aceite:**
- [ ] DsSidebar com menu organizavel
- [ ] DsBreadcrumbs com hierarquia clickavel
- [ ] DsTabs com content switching
- [ ] Suporte a icons em todos

**Tarefas:**
- [ ] Criar DsSidebar component
- [ ] Implementar menu com collapsible groups
- [ ] Criar DsBreadcrumbs com truncation
- [ ] Criar DsTabs com router integration

---

### [P01-007] Accessibility WCAG 2.1 AA

**Modulo:** design-system
**Prioridade:** P1
**Sprint:** 2
**Estimativa:** 8 pontos
**Labels:** design-system, accessibility

**Descricao:**
Verificar e corrigir accessibility de todos os componentes para WCAG 2.1 AA.

**Criterios de Aceite:**
- [ ] Contraste minimo 4.5:1 para texto normal
- [ ] Labels em todos os inputs
- [ ] ARIA roles corretos
- [ ] Focus gerenciado em modals
- [ ] Screen reader announcements

**Tarefas:**
- [ ] Audit de contraste em todos tokens
- [ ] Adicionar labels faltantes
- [ ] Implementar ARIA em componentes complexos
- [ ] Testar com axe-core
- [ ] Adicionar live regions para updates

---

## 3. Modulo: Shell do SPA (P02)

### [P02-001] Menu por dominio unificado

**Modulo:** shell
**Prioridade:** P0
**Sprint:** 1
**Estimativa:** 8 pontos
**Labels:** shell, navigation

**Descricao:**
Implementar sidebar com menu organizado por dominio.

**Criterios de Aceite:**
- [ ] Sidebar fixa e colapsavel
- [ ] Icones por dominio (Lucide)
- [ ] Labels descritivos com contagem de itens
- [ ] Dominios: Cadastros, Agenda, Assistencial, Financeiro, Governance
- [ ] Estado ativo visivel

**Tarefas:**
- [ ] Definir estrutura de dominios
- [ ] Criar menu config
- [ ] Implementar DsSidebar com grupos
- [ ] Adicionar collapse/expand
- [ ] Implementar active state highlighting

---

### [P02-002] Topbar com contexto persistente

**Modulo:** shell
**Prioridade:** P0
**Sprint:** 2
**Estimativa:** 5 pontos
**Labels:** shell, context

**Descricao:**
Implementar topbar com informacoes de usuario, role e unidade.

**Criterios de Aceite:**
- [ ] Usuario logado visivel (avatar, nome)
- [ ] Role/perfil atual exibido
- [ ] Unidade/tenant atual visivel
- [ ] Dropdown com trocas rapidas
- [ ] Contexto mantido em todas as rotas

**Tarefas:**
- [ ] Criar DsTopbar component
- [ ] Integrar com auth store
- [ ] Implementar dropdown de contexto
- [ ] Adicionar troca de unidade
- [ ] Persistir preferencia de collapse

---

### [P02-003] Sistema de favoritos

**Modulo:** shell
**Prioridade:** P1
**Sprint:** 2
**Estimativa:** 5 pontos
**Labels:** shell, ux-premium

**Descricao:**
Implementar sistema de favoritos de rotas.

**Criterios de Aceite:**
- [ ] Icone de estrela para favoritar
- [ ] Lista de favoritos na sidebar
- [ ] Maximo de 10 favoritos
- [ ] Ordenacao por uso recente
- [ ] Persistencia em localStorage

**Tarefas:**
- [ ] Criar favorites store (Pinia)
- [ ] Implementar toggle de favorito
- [ ] Criar lista de favoritos na sidebar
- [ ] Adicionar ordenacao inteligente
- [ ] Implementar persistencia

---

### [P02-004] Recentes automaticos

**Modulo:** shell
**Prioridade:** P1
**Sprint:** 2
**Estimativa:** 5 pontos
**Labels:** shell, ux-premium

**Descricao:**
Implementar lista automatica de rotas recentes.

**Criterios de Aceite:**
- [ ] Lista dos ultimos 20 itens visitados
- [ ] Limitado aos ultimos 7 dias
- [ ] Exibe caminho completo
- [ ] Limpar historico disponivel
- [ ] Persistencia em localStorage

**Tarefas:**
- [ ] Criar recent store (Pinia)
- [ ] Hook de router para tracking
- [ ] Filtrar duplicados
- [ ] Implementar TTL de 7 dias
- [ ] Criar UI de recentes

---

### [P02-005] Breadcrumbs em todos os fluxos

**Modulo:** shell
**Prioridade:** P1
**Sprint:** 2
**Estimativa:** 3 pontos
**Labels:** shell, navigation

**Descricao:**
Implementar breadcrumbs em todas as telas.

**Criterios de Aceite:**
- [ ] Breadcrumbs em todas as paginas
- [ ] Clickavel para navegacao
- [ ] Truncamento inteligente
- [ ] Separador padrao (">")
- [ ] Maximo de 4 niveis

**Tarefas:**
- [ ] Criar DsBreadcrumbs component
- [ ] Integrar com router
- [ ] Implementar truncation
- [ ] Adicionar click handlers

---

## 4. Modulo: Dashboard (P03)

### [P03-001] Dashboard com KPIs operacionais

**Modulo:** dashboard
**Prioridade:** P0
**Sprint:** 2
**Estimativa:** 13 pontos
**Labels:** dashboard, ux-premium

**Descricao:**
Implementar dashboard com widgets operacionais em tempo real.

**Criterios de Aceite:**
- [ ] Widgets: tutores ativos, pacientes do dia, agenda, fila
- [ ] Dados atualizados em tempo real
- [ ] Widgets configuraveis por perfil
- [ ] Click para drill-down
- [ ] Refresh manual disponivel

**Tarefas:**
- [ ] Definir widgets por perfil
- [ ] Criar DsWidget base component
- [ ] Implementar WidgetTutoresAtivos
- [ ] Implementar WidgetPacientesDia
- [ ] Implementar WidgetAgendaDia
- [ ] Implementar WidgetFilaAtual
- [ ] Adicionar WebSocket para real-time

---

### [P03-002] Atalhos de dominios prioritarios

**Modulo:** dashboard
**Prioridade:** P0
**Sprint:** 2
**Estimativa:** 5 pontos
**Labels:** dashboard, navigation

**Descricao:**
Implementar secao de atalhos para dominios mais usados.

**Criterios de Aceite:**
- [ ] Grid de atalhos rapidos
- [ ] Icone + label descritivo
- [ ] Baseado em uso recente
- [ ] Configuravel pelo usuario
- [ ] Max 8 atalhos visiveis

**Tarefas:**
- [ ] Criar WidgetAtalhos
- [ ] Calcular atalhos por frequencia
- [ ] Implementar drag para reordenar
- [ ] Persistir configuracao

---

### [P03-003] Widgets por perfil/role

**Modulo:** dashboard
**Prioridade:** P1
**Sprint:** 3
**Estimativa:** 8 pontos
**Labels:** dashboard, ux-premium

**Descricao:**
Personalizar widgets do dashboard conforme perfil do usuario.

**Criterios de Aceite:**
- [ ] Widgets diferentes para veterinario vs admin
- [ ] Permissao de adicionar/remover widgets
- [ ] Layout customizavel
- [ ] Persistencia de layout

**Tarefas:**
- [ ] Definir configuracoes por role
- [ ] Criar dashboard layout manager
- [ ] Implementar drag-and-drop de widgets
- [ ] Persistir em usuario settings

---

## 5. Modulo: Cadastro Mestre (P04)

### [P04-001] Hub de Tutores

**Modulo:** cadastro
**Prioridade:** P0
**Sprint:** 3
**Estimativa:** 13 pontos
**Labels:** cadastro, master-data

**Descricao:**
Implementar tela de tutores como hub central de relacionamento.

**Criterios de Aceite:**
- [ ] Lista com busca instantanea (< 100ms)
- [ ] Filtros: nome, telefone, email, cidade
- [ ] Colunas: nome, telefone, cidade, qtd pacientes, ultimo acesso
- [ ] Detail com resumo completo
- [ ] Form de criacao/edicao
- [ ] Acoes: ver pacientes, ver agendamentos, editar, inativar

**Tarefas:**
- [ ] Criar page TutoresList
- [ ] Implementar busca com debounce
- [ ] Criar TutoresDetail page
- [ ] Implementar TutoresForm
- [ ] Adicionar actions dropdown
- [ ] Integrar com API

---

### [P04-002] Hub de Pacientes

**Modulo:** cadastro
**Prioridade:** P0
**Sprint:** 3
**Estimativa:** 13 pontos
**Labels:** cadastro, master-data

**Descricao:**
Implementar tela de pacientes como hub assistencial.

**Criterios de Aceite:**
- [ ] Lista com busca por nome, chip, tutor
- [ ] Filtros: especie, raca, status, idade
- [ ] Detail com ficha completa
- [ ] Form com campos especie/raca
- [ ] Link para prontuario
- [ ] Status: ativo, inativo, obito

**Tarefas:**
- [ ] Criar page PacientesList
- [ ] Implementar busca por chip
- [ ] Criar PacientesDetail page
- [ ] Implementar PacientesForm com especie/raca dinamicos
- [ ] Adicionar link para prontuario
- [ ] Implementar status workflow

---

### [P04-003] Busca global de cadastros

**Modulo:** cadastro
**Prioridade:** P1
**Sprint:** 3
**Estimativa:** 8 pontos
**Labels:** search, ux-premium

**Descricao:**
Implementar busca global que retorna tutores e pacientes.

**Criterios de Aceite:**
- [ ] Busca via Ctrl+K retorna cadastros
- [ ] Busca fonetica para nomes
- [ ] Busca por documento (CPF)
- [ ] Resultados com tipo e status

**Tarefas:**
- [ ] Criar search endpoint otimizado
- [ ] Implementar fuzzy search
- [ ] Adicionar busca fonetica (metaphone)
- [ ] Criar resultado com link direto

---

### [P04-004] Importacao de cadastros

**Modulo:** cadastro
**Prioridade:** P2
**Sprint:** 4
**Estimativa:** 8 pontos
**Labels:** cadastro, import

**Descricao:**
Implementar wizard de importacao de cadastros com validacao.

**Criterios de Aceite:**
- [ ] Upload de CSV/Excel
- [ ] Preview dos dados
- [ ] Mapeamento de colunas
- [ ] Validacao com erros destacados
- [ ] Importacao com progress
- [ ] Log de erros

**Tarefas:**
- [ ] Criar DsImportWizard component
- [ ] Implementar parse de CSV/Excel
- [ ] Criar step de preview
- [ ] Implementar validacao
- [ ] Adicionar progress bar
- [ ] Criar log de resultados

---

## 6. Modulo: Agenda e Fila (P05)

### [P05-001] Agenda premium

**Modulo:** agenda
**Prioridade:** P0
**Sprint:** 4
**Estimativa:** 13 pontos
**Labels:** agenda, core

**Descricao:**
Implementar agenda com visoes dia/semana/mes e drag-and-drop.

**Criterios de Aceite:**
- [ ] Visoes: dia, semana, mes
- [ ] Drag-and-drop para reagendar
- [ ] Filtros: profissional, sala, status
- [ ] Cores por status
- [ ] Click abre detail
- [ ] Busca por paciente/tutor

**Tarefas:**
- [ ] Integrar FullCalendar ou similar
- [ ] Implementar drag-and-drop
- [ ] Criar filtros sidebar
- [ ] Implementar color coding
- [ ] Criar modal de detail
- [ ] Adicionar busca

---

### [P05-002] Fila operacional

**Modulo:** agenda
**Prioridade:** P0
**Sprint:** 4
**Estimativa:** 13 pontos
**Labels:** agenda, core, real-time

**Descricao:**
Implementar fila como console de trabalho em tempo real.

**Criterios de Aceite:**
- [ ] Lista em tempo real da fila do dia
- [ ] Status: aguardando, em atendimento, concluido, faltou
- [ ] Tempo de espera calculado
- [ ] Posicao na fila
- [ ] Acao: chamar prox, chamar novamente, finalizar, remarcar
- [ ] Atualizacao via WebSocket

**Tarefas:**
- [ ] Criar page Fila
- [ ] Implementar WebSocket client
- [ ] Criar componentes de controle
- [ ] Implementar logica de fila
- [ ] Adicionar timers
- [ ] Integrar com agenda

---

### [P05-003] Fluxo de atendimento

**Modulo:** agenda
**Prioridade:** P0
**Sprint:** 4
**Estimativa:** 13 pontos
**Labels:** atendimento, core

**Descricao:**
Implementar abertura, acompanhamento e fechamento de atendimento.

**Criterios de Aceite:**
- [ ] Abertura a partir da agenda ou fila
- [ ] Variavel: anamnese, exame fisico, diagnostico, prescricao
- [ ] Timeline de evolucao clinica
- [ ] Anexos (fotos, documentos)
- [ ] Finalizacao com fechamento de comanda
- [ ] Historico visivel

**Tarefas:**
- [ ] Criar page AtendimentoDetail
- [ ] Implementar form de anamnese
- [ ] Criar timeline component
- [ ] Implementar upload de anexos
- [ ] Adicionar form de diagnostico
- [ ] Criar modal de fechamento

---

### [P05-004] Formulario de agendamento aprimorado

**Modulo:** agenda
**Prioridade:** P1
**Sprint:** 4
**Estimativa:** 5 pontos
**Labels:** agenda, ux-premium

**Descricao:**
Melhorar formulario de agendamento com auto-complete e suggestions.

**Criterios de Aceite:**
- [ ] Auto-complete de paciente/tutor
- [ ] Suggestion de horarios disponiveis
- [ ] Duracao padrao por tipo
- [ ] Validacao de conflitos
- [ ] Confirmacao rapida

**Tarefas:**
- [ ] Melhorar DsInput com autocomplete
- [ ] Implementar busca de horarios
- [ ] Adicionar duracao por tipo
- [ ] Criar validacao de conflitos
- [ ] Simplificar flow de confirmacao

---

## 7. Modulo: Assistencial (P06)

### [P06-001] Prontuario linha do tempo

**Modulo:** atendimento
**Prioridade:** P0
**Sprint:** 5
**Estimativa:** 13 pontos
**Labels:** prontuario, clinical

**Descricao:**
Implementar prontuario como linha do tempo vertical.

**Criterios de Aceite:**
- [ ] Timeline vertical com eventos cronologicos
- [ ] Tipos: consulta, exame, cirurgia, prescricao, internacao
- [ ] Filtros por tipo e periodo
- [ ] Click abre detail do evento
- [ ] Busca em conteudo
- [ ] Export PDF

**Tarefas:**
- [ ] Criar ProntuarioTimeline component
- [ ] Implementar aggregation de eventos
- [ ] Criar filtros por tipo
- [ ] Implementar detail modal
- [ ] Adicionar busca full-text
- [ ] Implementar export PDF

---

### [P06-002] Triagem

**Modulo:** atendimento
**Prioridade:** P0
**Sprint:** 5
**Estimativa:** 8 pontos
**Labels:** triagem, clinical

**Descricao:**
Implementar tela de triagem com controle de prioridade.

**Criterios de Aceite:**
- [ ] Form de triagem rapida
- [ ] Prioridade: emergencia, urgente, eletivo
- [ ] Destino: consulta, internacao, cirurgia, alta
- [ ] Anotacoes de triagem
- [ ] Tempo de triagem registrado
- [ ] Atualizacao em tempo real

**Tarefas:**
- [ ] Criar page Triagem
- [ ] Implementar form de triagem
- [ ] Adicionar logica de prioridade
- [ ] Implementar routing de destino
- [ ] Criar registro de tempo
- [ ] Integrar com fila

---

### [P06-003] Mapa de internacao

**Modulo:** atendimento
**Prioridade:** P0
**Sprint:** 5
**Estimativa:** 13 pontos
**Labels:** internacao, clinical

**Descricao:**
Implementar mapa visual de setores e leitos.

**Criterios de Aceite:**
- [ ] Mapa visual de setores e leitos
- [ ] Status: livre, ocupado, em limpeza, reservado
- [ ] Paciente no leito com dados basicos
- [ ] Tempo de internacao
- [ ] Acoes: internar, liberar, mover
- [ ] Filtros: setor, status, veterinario

**Tarefas:**
- [ ] Criar BedBoard component
- [ ] Implementar visualizacao de mapa
- [ ] Adicionar status colors
- [ ] Implementar actions de leito
- [ ] Criar modal de internacao
- [ ] Adicionar filtros

---

### [P06-004] Cirurgia rastreavel

**Modulo:** atendimento
**Prioridade:** P1
**Sprint:** 6
**Estimativa:** 13 pontos
**Labels:** cirurgia, clinical

**Descricao:**
Implementar fluxo cirurgico com timeline e rastreamento.

**Criterios de Aceite:**
- [ ] Status: agendada, preparacao, em curso, finalizada, cancelada
- [ ] Profissionais alocados
- [ ] Timeline de eventos
- [ ] Tempo de cada etapa
- [ ] Material utilizado
- [ ] Relatorio cirurgico automatico

**Tarefas:**
- [ ] Criar page CirurgiaDetail
- [ ] Implementar status workflow
- [ ] Criar timeline de eventos
- [ ] Implementar alocacao de profissionais
- [ ] Adicionar registro de materiais
- [ ] Gerar relatorio automatico

---

### [P06-005] Prescricoes

**Modulo:** atendimento
**Prioridade:** P1
**Sprint:** 6
**Estimativa:** 8 pontos
**Labels:** prescricao, clinical

**Descricao:**
Implementar prescricao de medicamentos com validacao.

**Criterios de Aceite:**
- [ ] Lista de medicamentos com posologia
- [ ] Via de administracao
- [ ] Frequencia e duracao
- [ ] Validacao de interacoes
- [ ] Alertas de dosagem
- [ ] Assinatura digital

**Tarefas:**
- [ ] Criar page PrescricaoForm
- [ ] Implementar busca de medicamentos
- [ ] Adicionar validacao de interacoes
- [ ] Criar alertas de dosagem
- [ ] Implementar assinatura digital
- [ ] Integrar com prontuario

---

### [P06-006] Execucao de prescricoes

**Modulo:** atendimento
**Prioridade:** P1
**Sprint:** 6
**Estimativa:** 8 pontos
**Labels:** prescricao, execution

**Descricao:**
Implementar execucao e registro de aplicacao de prescricoes.

**Criterios de Aceite:**
- [ ] Lista de prescricoes pendentes
- [ ] Registro de aplicacao: hora, profissional, observacao
- [ ] Horarios programados
- [ ] Alerta de atrasos
- [ ] Validacao de aplicacao
- [ ] Historico de aplicacoes

**Tarefas:**
- [ ] Criar page ExecucaoPrescricoes
- [ ] Implementar lista de pendentes
- [ ] Criar form de registro
- [ ] Adicionar agendamento de horarios
- [ ] Implementar alertas
- [ ] Criar historico

---

### [P06-007] Alta com proxima acao

**Modulo:** atendimento
**Prioridade:** P1
**Sprint:** 6
**Estimativa:** 5 pontos
**Labels:** alta, clinical

**Descricao:**
Implementar processo de alta com checklist e orientacoes.

**Criterios de Aceite:**
- [ ] Checklist de alta
- [ ] Prescricoes de alta
- [ ] Retorno agendado
- [ ] Orientacoes ao tutor
- [ ] Resumo de internacao
- [ ] Assinatura do tutor

**Tarefas:**
- [ ] Criar page AltaForm
- [ ] Implementar checklist interativo
- [ ] Adicionar prescricoes de alta
- [ ] Criar scheduling de retorno
- [ ] Implementar orientacoes
- [ ] Adicionar assinatura digital

---

## 8. Modulo: Governance (P07)

### [P07-001] Access control completo

**Modulo:** governance
**Prioridade:** P0
**Sprint:** 7
**Estimativa:** 13 pontos
**Labels:** governance, access-control

**Descricao:**
Implementar access control com teams, sectors, roles e grants.

**Criterios de Aceite:**
- [ ] Teams com membros e permissoes
- [ ] Sectors organizacionais
- [ ] Roles pre-definidos com permissoes
- [ ] Grants diretos a usuarios
- [ ] Matriz de permissoes visual
- [ ] Origem da permissao explicita

**Tarefas:**
- [ ] Criar page AccessControl
- [ ] Implementar CRUD de teams
- [ ] Implementar CRUD de sectors
- [ ] Criar matriz de roles
- [ ] Implementar grants diretos
- [ ] Visualizar origem da permissao

---

### [P07-002] User detail com memberships

**Modulo:** governance
**Prioridade:** P0
**Sprint:** 7
**Estimativa:** 8 pontos
**Labels:** governance, users

**Descricao:**
Implementar detail de usuario com todos os memberships e permissoes.

**Criterios de Aceite:**
- [ ] Detail com todos os memberships
- [ ] Permissoes por team
- [ ] Permissoes por role
- [ ] Grants diretos
- [ ] Data de validade
- [ ] Acao: revogar, adicionar, modificar

**Tarefas:**
- [ ] Criar page UserDetail
- [ ] Listar memberships
- [ ] Listar permissoes por fonte
- [ ] Implementar validacao de datas
- [ ] Adicionar actions de gestao

---

### [P07-003] Auditoria consultavel

**Modulo:** governance
**Prioridade:** P0
**Sprint:** 7
**Estimativa:** 8 pontos
**Labels:** governance, audit

**Descricao:**
Implementar busca e filtros de eventos de auditoria.

**Criterios de Aceite:**
- [ ] Busca por usuario, acao, data, modulo
- [ ] Filtros: tipo de evento, modulo, data range
- [ ] Detail com antes/depois
- [ ] Export CSV
- [ ] Retention de 2 anos
- [ ] Alertas para eventos criticos

**Tarefas:**
- [ ] Criar page Auditoria
- [ ] Implementar busca elasticsearch
- [ ] Criar filtros
- [ ] Implementar detail modal
- [ ] Adicionar export CSV
- [ ] Configurar alertas

---

### [P07-004] MFA para perfis criticos

**Modulo:** governance
**Prioridade:** P0
**Sprint:** 7
**Estimativa:** 13 pontos
**Labels:** security, mfa

**Descricao:**
Implementar MFA com TOTP para perfis administrativos e financeiros.

**Criterios de Aceite:**
- [ ] Perfis que exigem MFA: Admin, Financeiro, Auditor
- [ ] Setup de TOTP (QR code)
- [ ] Verificacao em login
- [ ] Codigos de backup
- [ ] Recovery por email
- [ ] Desabilitar MFA (admin only)

**Tarefas:**
- [ ] Implementar TOTP secret generation
- [ ] Criar QR code para setup
- [ ] Implementar verificacao em login
- [ ] Criar codes de backup
- [ ] Implementar recovery
- [ ] Criar admin override

---

### [P07-005] Staff management

**Modulo:** governance
**Prioridade:** P1
**Sprint:** 7
**Estimativa:** 8 pontos
**Labels:** governance, staff

**Descricao:**
Implementar gestao de equipe/staff com visualizacao operacional.

**Criterios de Aceite:**
- [ ] Lista de profissionais
- [ ] Especialidades e competencias
- [ ] Agenda/carga horaria
- [ ] Status: ativo, inativo, ferias
- [ ] Alocacao em procedimentos

**Tarefas:**
- [ ] Criar page StaffList
- [ ] Implementar detail com agenda
- [ ] Adicionar gestao de especialidades
- [ ] Implementar status workflow
- [ ] Criar alocacao

---

### [P07-006] API keys e webhooks

**Modulo:** governance
**Prioridade:** P1
**Sprint:** 7
**Estimativa:** 8 pontos
**Labels:** governance, integration

**Descricao:**
Implementar gestao de API keys e webhooks no SPA.

**Criterios de Aceite:**
- [ ] CRUD de API keys
- [ ] Scopes por key
- [ ] Logs de uso
- [ ] CRUD de webhooks
- [ ] Teste de webhook
- [ ] Status de entrega

**Tarefas:**
- [ ] Criar page APIClient
- [ ] Implementar CRUD de keys
- [ ] Adicionar scopes
- [ ] Implementar logs
- [ ] Criar page Webhooks
- [ ] Adicionar teste de delivery

---

## 9. Modulo: Comercial (P08)

### [P08-001] Billing com painel de leitura

**Modulo:** financeiro
**Prioridade:** P0
**Sprint:** 8
**Estimativa:** 8 pontos
**Labels:** billing, financial

**Descricao:**
Implementar painel de faturamento e recebiveis.

**Criterios de Aceite:**
- [ ] KPIs: total faturado, receber, receber vencido
- [ ] Lista de transacoes
- [ ] Filtros: periodo, status, cliente, servico
- [ ] Detail com historico de pagamentos
- [ ] Status: em aberto, parcial, quitado, cancelado

**Tarefas:**
- [ ] Criar page Billing
- [ ] Implementar KPIs widgets
- [ ] Criar lista de transacoes
- [ ] Implementar filtros
- [ ] Adicionar detail modal
- [ ] Implementar status workflow

---

### [P08-002] Caixa operacional

**Modulo:** financeiro
**Prioridade:** P0
**Sprint:** 8
**Estimativa:** 8 pontos
**Labels:** cash, financial

**Descricao:**
Implementar gestao de caixa com abertura, movimentacao e fechamento.

**Criterios de Aceite:**
- [ ] Abertura de caixa com valor inicial
- [ ] Movimentacoes: entrada, saida, transferencia
- [ ] Formas de pagamento: dinheiro, pix, cartao
- [ ] Fechamento com conferencia
- [ ] Saldo atual em tempo real
- [ ] Historico de movimentacoes

**Tarefas:**
- [ ] Criar page Caixa
- [ ] Implementar abertura/fechamento
- [ ] Criar form de movimentacao
- [ ] Adicionar formas de pagamento
- [ ] Implementar saldo em tempo real
- [ ] Criar historico

---

### [P08-003] Catalogos premium

**Modulo:** comercial
**Prioridade:** P0
**Sprint:** 8
**Estimativa:** 8 pontos
**Labels:** catalog, commercial

**Descricao:**
Implementar gerenciamento de produtos e servicos como catalogos.

**Criterios de Aceite:**
- [ ] Lista com busca e filtros
- [ ] Detail: preco, estoque, categoria
- [ ] Form com validacao
- [ ] Importacao em massa
- [ ] Precos por unidade

**Tarefas:**
- [ ] Criar page ProdutosList
- [ ] Implementar busca e filtros
- [ ] Criar ProdutosDetail
- [ ] Implementar ProdutosForm
- [ ] Adicionar importacao
- [ ] Implementar precificacao

---

### [P08-004] Vendas de balcao

**Modulo:** comercial
**Prioridade:** P0
**Sprint:** 8
**Estimativa:** 13 pontos
**Labels:** sales, commercial

**Descricao:**
Implementar fluxo de vendas e fechamento de comanda.

**Criterios de Aceite:**
- [ ] Selecao de produtos/servicos
- [ ] Calculo automatico de totais
- [ ] Aplicacao de descontos
- [ ] Formas de pagamento
- [ ] Fechamento de comanda
- [ ] Comprovante de venda

**Tarefas:**
- [ ] Criar page Vendas
- [ ] Implementar seletor de produtos
- [ ] Criar calculadora de totais
- [ ] Implementar descontos
- [ ] Adicionar formas de pagamento
- [ ] Criar fechamento e comprovante

---

## 10. Modulo: Plataforma (P09)

### [P09-001] Modelo de tenancy multi-level

**Modulo:** platform
**Prioridade:** P0
**Sprint:** 9
**Estimativa:** 13 pontos
**Labels:** platform, multi-tenancy

**Descricao:**
Implementar modelo de dados para multi-tenancy.

**Criterios de Aceite:**
- [ ] Tabela tenants
- [ ] Tabela companies
- [ ] Tabela branches
- [ ] Tabela sectors
- [ ] Relacionamentos corretos
- [ ] Indices otimizados

**Tarefas:**
- [ ] Criar migration de tenancy
- [ ] Implementar models
- [ ] Criar seeders
- [ ] Adicionar indices
- [ ] Implementar relacionamentos
- [ ] Documentar modelo

---

### [P09-002] Middleware de contexto de tenant

**Modulo:** platform
**Prioridade:** P0
**Sprint:** 9
**Estimativa:** 8 pontos
**Labels:** platform, security

**Descricao:**
Implementar middleware para isolamento de dados por tenant.

**Criterios de Aceite:**
- [ ] Middleware extrai tenant do token
- [ ] Contexto disponivel em toda requisicao
- [ ] Queries automaticamente filtradas
- [ ] Header X-Tenant-Id suportado
- [ ] Erro claro se tenant missing

**Tarefas:**
- [ ] Criar TenantMiddleware
- [ ] Implementar TenantContext
- [ ] Criar query scopes
- [ ] Adicionar header support
- [ ] Implementar error handling
- [ ] Criar testes

---

### [P09-003] Endpoint /metrics Prometheus

**Modulo:** platform
**Prioridade:** P0
**Sprint:** 9
**Estimativa:** 5 pontos
**Labels:** observability, infrastructure

**Descricao:**
Implementar endpoint de metricas no formato Prometheus.

**Criterios de Aceite:**
- [ ] /metrics exposto
- [ ] Formato Prometheus
- [ ] Metricas HTTP
- [ ] Metricas de negocio
- [ ] Metricas de DB

**Tarefas:**
- [ ] Integrar prom-client
- [ ] Criar metricas HTTP
- [ ] Implementar metricas de negocio
- [ ] Adicionar metricas de DB
- [ ] Documentar formato

---

### [P09-004] Dashboards Grafana

**Modulo:** platform
**Prioridade:** P0
**Sprint:** 10
**Estimativa:** 13 pontos
**Labels:** observability, infrastructure

**Descricao:**
Implementar dashboards de observabilidade no Grafana.

**Criterios de Aceite:**
- [ ] Dashboard de infraestrutura
- [ ] Dashboard de aplicacao
- [ ] Dashboard de negocio
- [ ] Dashboard de DB
- [ ] Alertas configuradas

**Tarefas:**
- [ ] Criar datasource Prometheus
- [ ] Implementar dashboard infra
- [ ] Criar dashboard app
- [ ] Implementar dashboard negocio
- [ ] Adicionar dashboard DB
- [ ] Configurar alertas

---

### [P09-005] Tracing distribuido

**Modulo:** platform
**Prioridade:** P1
**Sprint:** 10
**Estimativa:** 8 pontos
**Labels:** observability, infrastructure

**Descricao:**
Implementar tracing distribuido com OpenTelemetry.

**Criterios de Aceite:**
- [ ] OpenTelemetry SDK integrado
- [ ] Trace em todos endpoints HTTP
- [ ] Trace em filas e workers
- [ ] Propagacao de correlation IDs
- [ ] Backend configurado (Jaeger/Tempo)

**Tarefas:**
- [ ] Integrar OpenTelemetry SDK
- [ ] Instrumentar HTTP middleware
- [ ] Adicionar tracing em filas
- [ ] Implementar propagacao
- [ ] Configurar exporter
- [ ] Criar testes

---

## 11. Modulo: LGPD/Compliance (P11)

### [P11-001] Consent management UI

**Modulo:** legal
**Prioridade:** P0
**Sprint:** 10
**Estimativa:** 8 pontos
**Labels:** legal, lgpd

**Descricao:**
Implementar UI para gestao de consentimentos.

**Criterios de Aceite:**
- [ ] Lista de consentimentos por cliente
- [ ] Tipo: marketing, termos, privacidade
- [ ] Data de consentimento
- [ ] Revogacao de consentimento
- [ ] Audit trail

**Tarefas:**
- [ ] Criar page ConsentManagement
- [ ] Implementar listagem
- [ ] Criar form de captura
- [ ] Implementar revogacao
- [ ] Adicionar audit trail

---

### [P11-002] Data subject requests portal

**Modulo:** legal
**Prioridade:** P0
**Sprint:** 10
**Estimativa:** 8 pontos
**Labels:** legal, lgpd

**Descricao:**
Implementar portal para requisicoes de titular de dados.

**Criterios de Aceite:**
- [ ] Tipos: acesso, correcao, exclusao, portabilidade
- [ ] Abertura de requisicao
- [ ] Acompanhamento de status
- [ ] Prazo de resposta (15 dias)
- [ ] Notificacoes

**Tarefas:**
- [ ] Criar page DataSubjectRequests
- [ ] Implementar abertura de requisicao
- [ ] Criar acompanhamento
- [ ] Implementar workflow
- [ ] Adicionar notificacoes

---

## 12. Modulo: Corte do Legado (P12)

### [P12-001] Matriz de corte por dominio

**Modulo:** legacy
**Prioridade:** P0
**Sprint:** 10
**Estimativa:** 5 pontos
**Labels:** legacy, cutover

**Descricao:**
Definir matriz de migracao por dominio web para SPA.

**Criterios de Aceite:**
- [ ] Dominios mapeados para paginas equivalentes
- [ ] Status de migracao por dominio
- [ ] Dependencias identificadas
- [ ] Data de corte por dominio

**Tarefas:**
- [ ] Mapear dominios para paginas
- [ ] Definir status de migracao
- [ ] Identificar dependencias
- [ ] Definir datas de corte
- [ ] Documentar

---

### [P12-002] Checklist de desligamento

**Modulo:** legacy
**Prioridade:** P1
**Sprint:** 10
**Estimativa:** 5 pontos
**Labels:** legacy, cutover

**Descricao:**
Criar checklist de desligamento do web.

**Criterios de Aceite:**
- [ ] 100% dos fluxos criticos migrados
- [ ] Nenhum redirect vivo para web
- [ ] DNS atualizado
- [ ] Certificate removido
- [ ] Docs atualizadas

**Tarefas:**
- [ ] Criar checklist
- [ ] Definir criterios de aceite
- [ ] Adicionar verificacao de fluxos
- [ ] Implementar sign-off

---

## 13. Resumo de Issues por Modulo

| Modulo | P0 | P1 | P2 | Total |
|--------|----|----|----|----|
| Design System | 4 | 3 | 0 | 7 |
| Shell SPA | 2 | 3 | 0 | 5 |
| Dashboard | 2 | 1 | 0 | 3 |
| Cadastro | 2 | 1 | 1 | 4 |
| Agenda | 3 | 1 | 0 | 4 |
| Assistencial | 3 | 4 | 0 | 7 |
| Governance | 4 | 2 | 0 | 6 |
| Comercial | 4 | 0 | 0 | 4 |
| Plataforma | 4 | 1 | 0 | 5 |
| LGPD | 2 | 0 | 0 | 2 |
| Legacy | 1 | 1 | 0 | 2 |
| **Total** | **31** | **17** | **1** | **49** |

---

## 14. Issues Criticas (Blocking)

| Issue | Modulo | Sprint | Motivo |
|-------|--------|--------|--------|
| P01-001 | Design System | 1 | Base para todos os outros |
| P01-002 | Design System | 1 | UX premium requer dark mode |
| P01-003 | Design System | 1 | Command palette e diferenciador |
| P02-001 | Shell | 1 | Navegacao base |
| P02-002 | Shell | 2 | Contexto de usuario |
| P04-001 | Cadastro | 3 | Core do sistema |
| P05-001 | Agenda | 4 | Core do sistema |
| P07-001 | Governance | 7 | Security critico |
