# 0178 - Plano de Execucao por Sprints Premium CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-04-11
**Base:** [0175-ROADMAP-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md](./0175-ROADMAP-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md) e [0176-BACKLOG-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md](./0176-BACKLOG-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md)
**Objetivo:** Transformar o backlog premium em sprints executaveis de 2 semanas, com historias, criterios de aceite, estimativas e dependencias claramente definidos.

---

## 1. Governanca de Sprints

### 1.1 Parametros de Sprint

| Parametro | Valor |
|-----------|-------|
| Duracao | 2 semanas (10 dias uteis) |
| Inicio | Segunda-feira |
| Sprint Planning | Terca-feira anterior (4h max) |
| Daily | Diario as 09:30 (15 min max) |
| Review | Sexta-feira final (2h max) |
| Retrospectiva | Sexta-feira final (1h max) |
| Equipe base | 4 devs + 1 tech lead + 1 product owner |

### 1.2 Ritmos de Entrega

| Tipo | Frequencia | Tamanho maximo |
|------|------------|----------------|
| Sprint | 2 semanas | 40 pontos |
| Epic | 3-4 sprints | 80-120 pontos |
| Milestone | 2-3 epics | 200-300 pontos |
| Release | 3-4 milestones | 600-800 pontos |

### 1.3 Definition of Done

| Condicao | Descricao |
|----------|-----------|
| Codigo | Feature implementada, testada e mergeada em develop |
| Testes | Unitarios >80% coverage, E2E do fluxo principal |
| Docs | Storybook atualizado, ADR se aplicavel |
| Accessibility | WCAG 2.1 AA verificado |
| Performance | LCP < 2s, API P95 < 300ms |

### 1.4 Regra de Escopo

- Todo desenvolvimento novo de interface, fluxo ou componente deve ser implementado em `apps/spa`.
- `apps/web` nao recebe novas features, telas ou refactors funcionais.
- Se aparecer trabalho em `apps/web`, ele deve ser tratado apenas como desligamento, remocao de redirects ou limpeza documental.

---

## 2. Sprint 1 - Fundacao Premium (Semanas 1-2)

**Objetivo:** Estabelecer o shell premium do SPA com design system, navegacao e command palette.

**Tema:** Foundation

### 2.1 Historias de Usuario

#### SPR-01-01: Storybook do Design System

```
Como: desenvolvedor
Quero: acessar o Storybook com todos os componentes documentados
Para: consultar usage, props, estados e guidelines

Criterios de aceite:
- [ ] Storybook accesible via storybook.cvg-his-v2.internal
- [ ] Todos os 13 componentes atuais documentados
- [ ] Cada componente com controles interativos (knobs)
- [ ] Token documentation com preview visual
- [ ] Search funcional por nome de componente

Estimativa: 5 pontos
Dependencias: Nenhuma
Labels: design-system, documentation, infrastructure
```

#### SPR-01-02: Dark Mode e Light Mode

```
Como: usuario do SPA
Quero: alternar entre dark mode e light mode
Para: trabalhar confortavelmente em qualquer ambiente de luz

Criterios de aceite:
- [ ] Toggle no header acessivel em todas as telas
- [ ] Transicao suave sem flicker (< 200ms)
- [ ] Preferencias salvas em localStorage
- [ ] Follow system preference como padrao inicial
- [ ] Tokens de cor consistentes em ambos modos

Estimativa: 8 pontos
Dependencias: SPR-01-01
Labels: design-system, ux-premium
```

#### SPR-01-03: Command Palette (Ctrl+K)

```
Como: usuario do SPA
Quero: abrir a command palette com Ctrl+K
Para: buscar rotas, acoes e entidades sem navegar menus

Criterios de aceite:
- [ ] Ctrl+K abre a paleta em qualquer tela
- [ ] Busca fuzzy por nome de rota, acao ou entidade
- [ ] Resultados categorizados (navegacao, acoes, entidades)
- [ ] Teclas de atalho visiveis nos resultados
- [ ] Esc fecha a paleta
- [ ] Historico de comandos recentes

Estimativa: 13 pontos
Dependencias: SPR-01-01, SPR-01-02
Labels: ux-premium, shell
```

#### SPR-01-04: Keyboard Navigation

```
Como: usuario do SPA
Quero: navegar completamente pelo teclado
Para: usar o sistema sem mouse para maior produtividade

Criterios de aceite:
- [ ] Tab order logical em todas as telas
- [ ] "/" foca busca global
- [ ] "?" abre help de atalhos
- [ ] Arrow keys navegam listas e grids
- [ ] Enter confirma acoes
- [ ] Escape cancela/fecha
- [ ] Focus visible em todos os elementos interativos

Estimativa: 8 pontos
Dependencias: SPR-01-01
Labels: accessibility, ux-premium
```

#### SPR-01-05: Menu por Dominio Unificado

```
Como: usuario do SPA
Quero: ver menu lateral organizado por dominio
Para: navegar rapidamente para qualquer area do sistema

Criterios de aceite:
- [ ] Sidebar fixa e colapsavel
- [ ] Icones por dominio (Lucide)
- [ ] Labels descritivos com contagem de itens
- [ ] Dominios: Cadastros, Agenda, Assistencial, Financeiro, Governance
- [ ] Estado ativo visivel (highlight)
- [ ] Expansao/colapso de submenus

Estimativa: 8 pontos
Dependencias: SPR-01-01
Labels: shell, navigation
```

### 2.2 Entregas da Sprint 1

| Entrega | Status | Responsavel |
|---------|--------|-------------|
| Storybook上线 | SPR-01-01 | Frontend-1 |
| Dark mode funcional | SPR-01-02 | Frontend-2 |
| Command palette | SPR-01-03 | Frontend-3 |
| Keyboard navigation | SPR-01-04 | Frontend-4 |
| Menu por dominio | SPR-01-05 | Frontend-1 |

**Pontos total:** 42 (dentro do limite de 40 com buffer)

### 2.3 Riscos da Sprint 1

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|----------|
| Storybook deployment complexo | Media | Alto | Iniciar com deploy simples, iterar |
| Performance da command palette | Baixa | Medio | Benchmark com 1000+ itens |

---

## 3. Sprint 2 - Shell e Topbar (Semanas 3-4)

**Objetivo:** Consolidar o shell com topbar contextual, favoritos e recentes.

**Tema:** Shell Premium

### 3.1 Historias de Usuario

#### SPR-02-01: Topbar com Contexto Persistente

```
Como: usuario do SPA
Quero: ver contexto persistente no topo (usuario, role, unidade)
Para: saber sempre quem estou logado e em qual organizacao

Criterios de aceite:
- [ ] Usuario logado visivel (avatar, nome)
- [ ] Role/perfil atual exibido
- [ ] Unidade/tenant atual visivel
- [ ] Dropdown com trocas rapidas (unidade, perfil)
- [ ] Contexto mantido em todas as rotas

Estimativa: 5 pontos
Dependencias: SPR-01-05
Labels: shell, context
```

#### SPR-02-02: Sistema de Favoritos

```
Como: usuario do SPA
Quero: favoritar rotas frequentes
Para: acessar rapidamente o que mais uso

Criterios de aceite:
- [ ] Icone de estrela para favoritar
- [ ] Lista de favoritos na sidebar
- [ ] Maximo de 10 favoritos
- [ ] Ordenacao por uso recente
- [ ] Persistencia em localStorage

Estimativa: 5 pontos
Dependencias: SPR-02-01
Labels: shell, ux-premium
```

#### SPR-02-03: Recentes Automaticos

```
Como: usuario do SPA
Quero: ver minhas rotas recentes automaticamente
Para: voltar rapidamente ao que estava fazendo

Criterios de aceite:
- [ ] Lista dos ultimos 20 itens visitados
- [ ] Limitado aos ultimos 7 dias
- [ ] Exibe caminho completo (breadcrumbs)
- [ ] Limpar historico disponivel
- [ ] Persistencia em localStorage

Estimativa: 5 pontos
Dependencias: SPR-02-02
Labels: shell, ux-premium
```

#### SPR-02-04: Breadcrumbs em Todos os Fluxos

```
Como: usuario do SPA
Quero: ver breadcrumbs em todas as telas
Para: entender onde estou na hierarquia do sistema

Criterios de aceite:
- [ ] Breadcrumbs em todas as paginas (exceto dashboard)
- [ ] Clickavel para navegacao
- [ ] Truncamento inteligente para caminhos longos
- [ ] Separador padrao (">")
- [ ] Maximo de 4 niveis exibidos

Estimativa: 3 pontos
Dependencias: SPR-02-01
Labels: shell, navigation
```

#### SPR-02-05: Dashboard com KPIs Operacionais

```
Como: usuario do SPA
Quero: ver dashboard com KPIs relevantes ao meu perfil
Para: ter visibilidade imediata do estado operacional

Criterios de aceite:
- [ ] Widgets: tutores ativos, pacientes do dia, agenda, fila
- [ ] Dados atualizados em tempo real
- [ ] Widgets configuraveis por perfil
- [ ] Click para drill-down
- [ ] Refresh manual disponivel

Estimativa: 13 pontos
Dependencias: SPR-02-01, SPR-02-02, SPR-02-03
Labels: dashboard, ux-premium
```

### 3.2 Entregas da Sprint 2

| Entrega | Status | Responsavel |
|---------|--------|-------------|
| Topbar contextual | SPR-02-01 | Frontend-2 |
| Favoritos | SPR-02-02 | Frontend-1 |
| Recentes | SPR-02-03 | Frontend-3 |
| Breadcrumbs | SPR-02-04 | Frontend-4 |
| Dashboard premium | SPR-02-05 | Frontend-1 + Frontend-2 |

**Pontos total:** 31 (abaixo do maximo para permitir foco em qualidade)

---

## 4. Sprint 3 - Cadastro Mestre (Semanas 5-6)

**Objetivo:** Implementar tutores e pacientes como hubs de dominio com list/detail/form completos.

**Tema:** Cadastro Mestre

### 4.1 Historias de Usuario

#### SPR-03-01: Hub de Tutores

```
Como: operador do sistema
Quero: gerenciar tutores como hub central de relacionamento
Para: ter visao unificada de proprietarios e seus animais

Criterios de aceite:
- [ ] Lista com busca instantanea (< 100ms)
- [ ] Filtros: nome, telefone, email, cidade
- [ ] List com colunas: nome, telefone, cidade, qtd pacientes, ultimo acesso
- [ ] Detail com resumo completo: dados pessoais, pacientes, historico
- [ ] Form de criacao/edicao com validacao
- [ ] Acoes: ver pacientes, ver agendamentos, editar, inativar

Estimativa: 13 pontos
Dependencias: SPR-02-05
Labels: cadastro, master-data
```

#### SPR-03-02: Hub de Pacientes

```
Como: operador do sistema
Quero: gerenciar pacientes como hub assistencial
Para: ter ficha completa do animal com contexto de tutor

Criterios de aceite:
- [ ] Lista com busca por nome, chip, tutor
- [ ] Filtros: especie, raca, status, idade
- [ ] Detail com ficha do paciente: dados, tutor, vacinas, historico
- [ ] Form com campos especie/raca especifica
- [ ] Link para prontuario e agendamentos
- [ ] Status: ativo, inativo, obito

Estimativa: 13 pontos
Dependencias: SPR-03-01
Labels: cadastro, master-data
```

#### SPR-03-03: Busca e Filtros de Cadastro

```
Como: operador do sistema
Quero: localizar tutor ou paciente em poucos cliques
Para: nao perder tempo navegando listas extensas

Criterios de aceite:
- [ ] Busca global (Ctrl+K) retorna tutores e pacientes
- [ ] Filtros salvos por usuario
- [ ] Ordenacao por qualquer coluna
- [ ] Busca phonetica para nomes similares
- [ ] Busca por documento (CPF/CNPJ)

Estimativa: 8 pontos
Dependencias: SPR-03-01, SPR-03-02
Labels: search, ux-premium
```

#### SPR-03-04: Telas de Detalhe Densas

```
Como: operador do sistema
Quero: que o detalhe do tutor/paciente seja ponto de decisao
Para: tomar acoes diretamente da tela de detail sem navegar mais

Criterios de aceite:
- [ ] KPIs visiveis no detail (total pacientes, ultimo acesso, etc)
- [ ] Acoes rapidas na lateral (ver agendamentos, novo paciente)
- [ ] Timeline de atividade no detail
- [ ] Cards de resumen: agendamentos pendentes, ultime servico
- [ ] Links rapidos para ferramentas relacionadas

Estimativa: 8 pontos
Dependencias: SPR-03-01, SPR-03-02
Labels: ux-premium, detail
```

### 4.2 Entregas da Sprint 3

| Entrega | Status | Responsavel |
|---------|--------|-------------|
| Hub Tutores completo | SPR-03-01 | Frontend-2 |
| Hub Pacientes completo | SPR-03-02 | Frontend-3 |
| Busca avançada | SPR-03-03 | Frontend-1 |
| Detail denso | SPR-03-04 | Frontend-2 + Frontend-3 |

**Pontos total:** 42

---

## 5. Sprint 4 - Agenda e Fila (Semanas 7-8)

**Objetivo:** Implementar agenda premium com leitura operacional e fila como console de trabalho.

**Tema:** Agenda e Fila

### 5.1 Historias de Usuario

#### SPR-04-01: Agenda Premium

```
Como: operador do sistema
Quero: agenda com leitura operacional densa
Para: ver o dia/semana/mes de forma rapida e tomar decisoes

Criterios de aceite:
- [ ] Visoes: dia, semana, mes
- [ ] Drag-and-drop para reagendar
- [ ] Filtros: profissional, sala, status
- [ ] Cores por status (agendado, confirmado, cancelado, realizado)
- [ ] Click abre detail do agendamento
- [ ] Indicador de conflito de horario
- [ ] Busca por paciente/tutor

Estimativa: 13 pontos
Dependencias: SPR-03-01, SPR-03-02
Labels: agenda, core
```

#### SPR-04-02: Fila Operacional

```
Como: operador do sistema
Quero: fila como console de trabalho do dia
Para: saber quem esta esperando, quem e prox e acompanhar fluxo

Criterios de aceite:
- [ ] Lista em tempo real da fila do dia
- [ ] Status: aguardando, em atendimento, concluido, faltou
- [ ] Tempo de espera calculado
- [ ] Posicao na fila
- [ ] Acao: chamar prox, chamar novamente, finalizar, remarcar
- [ ] Filtros: profissional, especie, urgente
- [ ] Atualizacao em tempo real (WebSocket)

Estimativa: 13 pontos
Dependencias: SPR-04-01
Labels: fila, core, real-time
```

#### SPR-04-03: Atendimentos como Fluxo Principal

```
Como: operador do sistema
Quero: abrir, acompanhar e concluir atendimento sem vacuo
Para: registrar tudo sem perder informacao ou tempo

Criterios de aceite:
- [ ] Abertura de atendimento a partir da agenda ou fila
- [ ] Variavel: anamnese, exame fisico, diagnostico, prescricao
- [ ] Timeline de evolucao clinica
- [ ] Anexos (fotos, documentos)
- [ ] Finalizacao com fechamento de comanda
- [ ] Historico de atendimentos do paciente visivel

Estimativa: 13 pontos
Dependencias: SPR-04-02
Labels: atendimento, core
```

#### SPR-04-04: Formulario de Agendamento Aprimorado

```
Como: operador do sistema
Quero: criar agendamento com menos friccao
Para: nao perder tempo ao agendar

Criterios de aceite:
- [ ] Auto-complete de paciente/tutor
- [ ] Suggestion de horarios disponiveis
- [ ] Duracao padrao por tipo de atendimento
- [ ] Validacao de conflitos
- [ ] Campos obrigatorios claros
- [ ] Confirmacao rapida

Estimativa: 5 pontos
Dependencias: SPR-04-01
Labels: agenda, ux-premium
```

### 5.2 Entregas da Sprint 4

| Entrega | Status | Responsavel |
|---------|--------|-------------|
| Agenda premium | SPR-04-01 | Frontend-1 |
| Fila operacional | SPR-04-02 | Frontend-2 |
| Fluxo atendimento | SPR-04-03 | Frontend-3 |
| Form agendamento | SPR-04-04 | Frontend-4 |

**Pontos total:** 44

---

## 6. Sprint 5 - Prontuario e Assistencial (Semanas 9-10)

**Objetivo:** Implementar prontuario como linha do tempo, triagem e internacao.

**Tema:** Assistencial

### 6.1 Historias de Usuario

#### SPR-05-01: Prontuario como Linha do Tempo

```
Como: veterinario
Quero: ver prontuario como linha do tempo do paciente
Para: ter contexto rapido do historico clinico

Criterios de aceite:
- [ ] Timeline vertical com eventos cronologicos
- [ ] Tipos: consulta, exame, cirurgia, prescricao, internacao
- [ ] Filtros por tipo de evento e periodo
- [ ] Click abre detail do evento
- [ ] Busca em conteudo de evolucoes
- [ ] Export em PDF

Estimativa: 13 pontos
Dependencias: SPR-04-03
Labels: prontuario, clinical
```

#### SPR-05-02: Triagem como Etapa Critica

```
Como: enfermeiro/atendente
Quero: realizar triagem com controle de prioridade
Para: direcionar corretamente cada paciente

Criterios de aceite:
- [ ] Form de triagem rapida
- [ ] Prioridade: emergencia, urgente, eletivo
- [ ] Destino: consulta, internacao, cirurgia, alta
- [ ] Anotacoes de triagem
- [ ] Tempo de triagem registrado
- [ ] Atualizacao em tempo real na fila

Estimativa: 8 pontos
Dependencias: SPR-04-03
Labels: triagem, clinical
```

#### SPR-05-03: Internacao com Setores e Leitos

```
Como: veterinario/enfermeiro
Quero: gerenciar internacao com mapa de setores e leitos
Para: acompanhar ocupacao e status de cada leito

Criterios de aceite:
- [ ] Mapa visual de setores e leitos
- [ ] Status do leito: livre, ocupado, em limpeza, reservado
- [ ] Paciente Internado no leito com dados basicos
- [ ] Tempo de internacao
- [ ] Acoes: internar, liberar, mover
- [ ] Filtros: setor, status, veterinario

Estimativa: 13 pontos
Dependencias: SPR-05-01
Labels: internacao, clinical
```

#### SPR-05-04: Diagnosticos com Resumo Executivo

```
Como: veterinario
Quero: ver diagnosticos e exames com contexto executivo
Para: tomar decisao rapida sem ler detalhes extensos

Criterios de aceite:
- [ ] Lista de diagnosticos por paciente
- [ ] Status: pendente, resultado disponivel, urgente
- [ ] Resumo visual do resultado
- [ ] Link para detalhe completo
- [ ] Interpretation aided (valores de referencia)
- [ ] Anotacao do veterinario

Estimativa: 5 pontos
Dependencias: SPR-05-01
Labels: diagnosticos, clinical
```

### 6.2 Entregas da Sprint 5

| Entrega | Status | Responsavel |
|---------|--------|-------------|
| Prontuario timeline | SPR-05-01 | Frontend-2 |
| Triagem | SPR-05-02 | Frontend-1 |
| Mapa de internacao | SPR-05-03 | Frontend-3 |
| Diagnosticos | SPR-05-04 | Frontend-4 |

**Pontos total:** 39

---

## 7. Sprint 6 - Cirurgia e Prescricoes (Semanas 11-12)

**Objetivo:** Implementar fluxo cirurgico e prescricoes com execucao.

**Tema:** Assistencial Avancado

### 7.1 Historias de Usuario

#### SPR-06-01: Cirurgia com Status e Acompanhamento

```
Como: veterinario/cirurgiao
Quero: rastrear caso cirurgico do inicio ao fim
Para: saber status, profissionais e tempos de cada etapa

Criterios de aceite:
- [ ] Status: agendada, em preparacao, em curso, finalizada, cancelada
- [ ] Profissionais alocados
- [ ] Timeline de eventos (inicio anestesia, incisao, fechamento, etc)
- [ ] Tempo de cada etapa
- [ ] Material utilizado
- [ ] Anotacoes ciricas
- [ ] Relatorio cirurgico automatico

Estimativa: 13 pontos
Dependencias: SPR-05-01
Labels: cirurgia, clinical
```

#### SPR-06-02: Prescricoes e Execucao

```
Como: veterinario
Quero: prescrever medicamentos com validacao
Para: garantir dosage e interacoes corretas

Criterios de aceite:
- [ ] Lista de medicamentos com posologia
- [ ] Via de administracao
- [ ] Frequencia e duracao
- [ ] Validacao de interacoes medicamentosas
- [ ] Alertas de dosagem
- [ ] Assinatura digital do veterinario

Estimativa: 8 pontos
Dependencias: SPR-05-01
Labels: prescricao, clinical
```

#### SPR-06-03: Execucao de Prescricoes

```
Como: enfermeiro
Quero: executar prescricoes com registro
Para: garantir que a medicação foi aplicada

Criterios de aceite:
- [ ] Lista de prescricoes pendentes
- [ ] Registro de aplicacao: hora, profissional, observacao
- [ ] Horarios programados
- [ ] Alerta de atrasos
- [ ] Validacao de aplicacao
- [ ] history de aplicacoes anteriores

Estimativa: 8 pontos
Dependencias: SPR-06-02
Labels: prescricao, execution
```

#### SPR-06-04: Altas com Proxima Acao

```
Como: veterinario
Quero: dar alta com proxima acao claramente definida
Para: garantir continuidade do cuidado

Criterios de aceite:
- [ ] Checklist de alta
- [ ] Prescricoes de alta
- [ ] Retorno agendado
- [ ] Orientações ao tutor
- [ ] Resumo de internacao
- [ ] Assinatura do tutor

Estimativa: 5 pontos
Dependencias: SPR-05-03, SPR-06-02
Labels: alta, clinical
```

### 7.2 Entregas da Sprint 6

| Entrega | Status | Responsavel |
|---------|--------|-------------|
| Cirurgia rastreavel | SPR-06-01 | Frontend-2 |
| Prescricoes | SPR-06-02 | Frontend-1 |
| Execucao prescricoes | SPR-06-03 | Frontend-3 |
| Alta com seguimento | SPR-06-04 | Frontend-4 |

**Pontos total:** 34

---

## 8. Sprint 7 - Governance e Access Control (Semanas 13-14)

**Objetivo:** Implementar access-control como governance real com teams, sectors e grants explicaveis.

**Tema:** Governance

### 8.1 Historias de Usuario

#### SPR-07-01: Access Control como Governance Real

```
Como: administrador
Quero: gerenciar acessos com teams, sectors e roles
Para: ter governance explicavel e rastreavel

Criterios de aceite:
- [ ] Teams com membros e permissoes
- [ ] Sectors organizacionais
- [ ] Roles pre-definidos com permissoes
- [ ] Grants diretos a usuarios
- [ ] Matriz de permissoes visual
- [ ] Origem da permissao explicita (team, role, direct grant)

Estimativa: 13 pontos
Dependencias: nenhuma
Labels: governance, access-control
```

#### SPR-07-02: Users com Membership e Origem

```
Como: administrador
Quero: ver usuario com permissao efetiva e fontes
Para: entender exatamente o que cada pessoa pode fazer

Criterios de aceite:
- [ ] Detail do usuario com todos os memberships
- [ ] Permissoes por team
- [ ] Permissoes por role
- [ ] Grants diretos
- [ ] Data de validade de acessos temporarios
- [ ] Acao: revogar, adicionar, modificar

Estimativa: 8 pontos
Dependencias: SPR-07-01
Labels: governance, users
```

#### SPR-07-03: Auditoria Consultavel

```
Como: administrador/auditor
Quero: buscar e filtrar eventos auditaveis
Para: rastrear mudancas e acessos

Criterios de aceite:
- [ ] Busca por usuario, acao, data, modulo
- [ ] Filtros: tipo de evento, modulo, data range
- [ ] Detail do evento com antes/depois
- [ ] Export em CSV
- [ ] Retention de 2 anos
- [ ] Alertas para eventos criticos

Estimativa: 8 pontos
Dependencias: nenhuma
Labels: governance, audit
```

#### SPR-07-04: MFA para Perfis Criticos

```
Como: administrador
Quero: forcar MFA para perfis administrativos e financeiros
Para: garantir seguranca em acessos sensiveis

Criterios de aceite:
- [ ] Perfis que exigem MFA: Admin, Financeiro, Auditor
- [ ] Setup de TOTP (QR code)
- [ ] Verificacao em login
- [ ] Codigos de backup
- [ ] Recovery por email
- [ ] Desabilitar MFA (admin only)

Estimativa: 13 pontos
Dependencias: SPR-07-01
Labels: security, mfa
```

### 8.2 Entregas da Sprint 7

| Entrega | Status | Responsavel |
|---------|--------|-------------|
| Access control completo | SPR-07-01 | Backend-1 + Frontend-2 |
| User detail com memberships | SPR-07-02 | Frontend-3 |
| Auditoria consultavel | SPR-07-03 | Backend-2 |
| MFA implementado | SPR-07-04 | Backend-1 |

**Pontos total:** 42

---

## 9. Sprint 8 - Comercial e Financeiro (Semanas 15-16)

**Objetivo:** Implementar billing, caixa, produtos/servicos e vendas como fluxo comercial fechado.

**Tema:** Comercial

### 9.1 Historias de Usuario

#### SPR-08-01: Billing com Painel de Leitura

```
Como: operador financeiro
Quero: ver faturamento e recebiveis de forma compreensivel
Para: entender o estado financeiro do negocio

Criterios de aceite:
- [ ] KPIs: total faturado, receber, receber vencido
- [ ] Lista de transacoes
- [ ] Filtros: periodo, status, cliente, servico
- [ ] Detail com historico de pagamentos
- [ ] Status: em aberto, parcial, quitado, cancelado

Estimativa: 8 pontos
Dependencias: SPR-04-03
Labels: billing, financial
```

#### SPR-08-02: Caixa com Abertura, Movimentacao e Fechamento

```
Como: operador de caixa
Quero: gerenciar caixa com visibilidade operacional
Para: ter controle de entradas e saidas

Criterios de aceite:
- [ ] Abertura de caixa com valor inicial
- [ ] Movimentacoes: entrada, saida, transferencia
- [ ] Formas de pagamento: dinheiro, pix, cartao
- [ ] Fechamento com conferencia
- [ ] Saldo atual em tempo real
- [ ] Historico de movimentacoes

Estimativa: 8 pontos
Dependencias: SPR-08-01
Labels: cash, financial
```

#### SPR-08-03: Produtos e Servicos como Catalogos Premium

```
Como: operador
Quero: gerenciar produtos e servicos com catalogos organizados
Para: ter dados corretos para vendas e faturamento

Criterios de aceite:
- [ ] Lista com busca e filtros
- [ ] Detail: preco, estoque, categoria, servicos relacionados
- [ ] Form com validacao de campos
- [ ] Importacao em massa
- [ ] Precos por unidade de negocio

Estimativa: 8 pontos
Dependencias: nenhuma
Labels: catalog, commercial
```

#### SPR-08-04: Vendas de Balcao / Comanda

```
Como: operador de vendas
Quero: realizar vendas e fechar comandas
Para: registrar movimento comercial corretamente

Criterios de aceite:
- [ ] Selecao de produtos/servicos
- [ ] Calculo automatico de totais
- [ ] Aplicacao de descontos
- [ ] Formas de pagamento
- [ ] Fechamento de comanda
- [ ] Comprovante de venda

Estimativa: 13 pontos
Dependencias: SPR-08-03
Labels: sales, commercial
```

### 9.2 Entregas da Sprint 8

| Entrega | Status | Responsavel |
|---------|--------|-------------|
| Billing painel | SPR-08-01 | Frontend-2 + Backend-2 |
| Caixa operacional | SPR-08-02 | Frontend-1 |
| Catalogos premium | SPR-08-03 | Frontend-3 |
| Vendas/Comanda | SPR-08-04 | Frontend-2 + Frontend-4 |

**Pontos total:** 37

---

## 10. Sprint 9-10 - Multi-Tenancy e Observabilidade (Semanas 17-20)

**Objetivo:** Implementar multi-tenancy, endpoint de metricas e dashboards.

**Tema:** Plataforma

### 10.1 Historias de Usuario

#### SPR-09-01: Modelo de Tenancy Multi-Level

```
Como: plataforma
Quero: suportar multi-level tenancy (tenant, company, branch, sector)
Para: permitir multiple organizacoes com hierarquia

Criterios de aceite:
- [ ] Tabela tenants com configuracoes
- [ ] Tabela companies por tenant
- [ ] Tabela branches por company
- [ ] Tabela sectors por branch
- [ ] Relacionamentos corretos
- [ ] Queries com filtro de tenancy automatico

Estimativa: 13 pontos
Dependencias: nenhuma
Labels: platform, multi-tenancy
```

#### SPR-09-02: Middleware de Contexto de Tenant

```
Como: plataforma
Quero: isolar dados por tenant automaticamente
Para: garantir que cada organizacao veja apenas seus dados

Criterios de aceite:
- [ ] Middleware extrai tenant do token/JWT
- [ ] Contexto disponivel em toda a requisicao
- [ ] Queries automaticamente filtradas
- [ ] Header X-Tenant-Id suportado
- [ ] Erro claro se tenant nao especificado

Estimativa: 8 pontos
Dependencias: SPR-09-01
Labels: platform, security
```

#### SPR-09-03: Endpoint /metrics (Prometheus)

```
Como: engenharia
Quelo: acessar metricas no formato Prometheus
Para: monitorar sitema e criar alertas

Criterios de aceite:
- [ ] /metrics exposto
- [ ] Formato Prometheus
- [ ] Metricas HTTP: request count, latency, errors
- [ ] Metricas de negocio: usuarios ativos, transacoes
- [ ] Metricas de DB: connection pool, query latency

Estimativa: 5 pontos
Dependencias: nenhuma
Labels: observability, infrastructure
```

#### SPR-09-04: Dashboards Grafana

```
Como: engenharia/operacao
Quero: visualizar metricas em dashboards Grafana
Para: entender health do sistema

Criterios de aceite:
- [ ] Dashboard de infraestrutura (CPU, memoria, rede)
- [ ] Dashboard de aplicacao (requests, latency, errors)
- [ ] Dashboard de negocio (usuarios, transacoes, revenue)
- [ ] Dashboard de DB (connections, queries, slow queries)
- [ ] Alertas configuradas

Estimativa: 13 pontos
Dependencias: SPR-09-03
Labels: observability, infrastructure
```

#### SPR-09-05: Tracing Distribuido

```
Como: engenharia
Quero: instrumentar tracing distribuido
Para: debugar problemas em ambientes distribuidos

Criterios de aceite:
- [ ] OpenTelemetry SDK integrado
- [ ] Trace em todos os endpoints HTTP
- [ ] Trace em filas e workers
- [ ] Propagacao de correlation IDs
- [ ] Jaeger/Tempo como backend

Estimativa: 8 pontos
Dependencias: SPR-09-03
Labels: observability, infrastructure
```

### 10.2 Entregas das Sprints 9-10

| Entrega | Status | Responsavel |
|---------|--------|-------------|
| Modelo tenancy | SPR-09-01 | Backend-1 |
| Middleware tenant | SPR-09-02 | Backend-1 |
| /metrics Prometheus | SPR-09-03 | Backend-2 |
| Grafana dashboards | SPR-09-04 | Backend-2 |
| Tracing | SPR-09-05 | Backend-1 + Backend-2 |

**Pontos total:** 47 (2 sprints)

---

## 11. Matriz de Dependencias entre Sprints

```
Sprint 1 (Foundation)
    |
    v
Sprint 2 (Shell) ---------> Sprint 1
    |
    v
Sprint 3 (Cadastro) ------> Sprint 2
    |                           |
    v                           v
Sprint 4 (Agenda) ---------> Sprint 3
    |
    v
Sprint 5 (Prontuario) -----> Sprint 4
    |
    v
Sprint 6 (Cirurgia) -------> Sprint 5
    |
    v
Sprint 7 (Governance) <----> Sprint 1 (independente)
    |
    v
Sprint 8 (Comercial) -----> Sprint 4
    |
    v
Sprints 9-10 (Plataforma) -> Sprint 1 (independente)
```

---

## 12. Resumo de Pontos por Sprint

| Sprint | Tema | Pontos | semanas |
|--------|------|--------|---------|
| Sprint 1 | Foundation | 42 | 1-2 |
| Sprint 2 | Shell Premium | 31 | 3-4 |
| Sprint 3 | Cadastro Mestre | 42 | 5-6 |
| Sprint 4 | Agenda e Fila | 44 | 7-8 |
| Sprint 5 | Prontuario | 39 | 9-10 |
| Sprint 6 | Cirurgia/Prescricoes | 34 | 11-12 |
| Sprint 7 | Governance | 42 | 13-14 |
| Sprint 8 | Comercial | 37 | 15-16 |
| Sprint 9-10 | Plataforma | 47 | 17-20 |
| **Total** | | **358** | **20 semanas** |

---

## 13. Milestones Derivados

| Milestone | Sprints | Entregas | Data-alvo |
|-----------|---------|---------|-----------|
| M1 - Foundation | 1-2 | Shell, DS, Command Palette | Sem 4 |
| M2 - Core Operacional | 3-4 | Cadastro, Agenda, Fila | Sem 8 |
| M3 - Assistencial | 5-6 | Prontuario, Triagem, Cirurgia | Sem 12 |
| M4 - Governance | 7 | Access Control, MFA, Audit | Sem 14 |
| M5 - Comercial | 8 | Billing, Caixa, Vendas | Sem 16 |
| M6 - Plataforma | 9-10 | Multi-tenancy, Observability | Sem 20 |

---

## 14. Riscos Globais do Plano

| Risco | Prob | Impact | Mitigacao |
|-------|------|--------|-----------|
| Escopo muito aggressivo | Media | Alto | Buffer de 20% em estimativas |
| Dívidas tecnicas acumuladas | Media | Medio | Sprint extras de hardening |
| Dependencias de terceiro | Baixa | Alto | SPOCs dedicados |
| Turnover de equipe | Baixa | Alto | Cross-training e docs |

---

## 15. Calendario de Sprints

| Sprint | Inicio | Fim | Focus |
|--------|--------|-----|-------|
| Sprint 1 | 2026-04-13 | 2026-04-24 | Foundation |
| Sprint 2 | 2026-04-27 | 2026-05-08 | Shell |
| Sprint 3 | 2026-05-11 | 2026-05-22 | Cadastro |
| Sprint 4 | 2026-05-25 | 2026-06-05 | Agenda |
| Sprint 5 | 2026-06-08 | 2026-06-19 | Prontuario |
| Sprint 6 | 2026-06-22 | 2026-07-03 | Cirurgia |
| Sprint 7 | 2026-07-06 | 2026-07-17 | Governance |
| Sprint 8 | 2026-07-20 | 2026-07-31 | Comercial |
| Sprint 9 | 2026-08-03 | 2026-08-14 | Plataforma |
| Sprint 10 | 2026-08-17 | 2026-08-28 | Plataforma |
