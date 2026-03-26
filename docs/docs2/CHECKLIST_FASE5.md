# Checklist Operacional - Fase 5 (MAR Optimization)

## Verificação de Estabilidade
- [ ] `/inpatient/mar` abre sem crash
- [ ] Navegação entre rotas (`/inpatient/bedmap` -> `/inpatient/mar`) mantém o estado e não causa loops.
- [ ] `pnpm build` (ou `npm run build`) passa sem erros de tipo ou lint.

## Funcionalidade: Seleção e Navegação
- [ ] Ao entrar em `/inpatient/mar` sem parâmetros:
    - [ ] Deve solicitar a seleção de uma Ala (Ward).
    - [ ] O seletor de Paciente (Stay) deve estar vazio/desabilitado.
- [ ] Ao selecionar uma Ala:
    - [ ] A lista de pacientes deve carregar na lateral.
    - [ ] A URL deve atualizar para `?wardId=...`.
- [ ] Ao selecionar um Paciente:
    - [ ] O painel principal deve carregar a lista de doses (`MedDueList`).
    - [ ] A URL deve atualizar para `?wardId=...&stayId=...`.

## Funcionalidade: MedDueList (MarConsole)
- [ ] **Overview:** A lista lateral mostra badges com contagem de overdue/upcoming.
- [ ] **Filtros Locais:** Os filtros de texto, rota e "Apenas Vencidas" funcionam instantaneamente.
- [ ] **Agrupamento:** As doses aparecem agrupadas pelo nome do paciente (útil no modo "All", mesmo que no contexto de Stay único o grupo seja um só).
- [ ] **Ação Rápida:**
    - [ ] Clicar em "Administrar Agora" pede confirmação inline ("SIM/NÃO").
    - [ ] Confirmar ("SIM") executa a ação e atualiza a lista sem recarregar a página toda.
- [ ] **Tratamento de Erros:**
    - [ ] Tentar administrar uma dose já checada (simulação de concorrência) deve exibir mensagem amigável e atualizar a lista.

## Funcionalidade: Auto-Refresh
- [ ] O toggle "Auto-refresh" liga/desliga o polling.
- [ ] Intervalos (30s, 60s, 120s) alteram a frequência de atualização.
- [ ] Abrir um modal ou iniciar uma ação PAUSA o refresh para não fechar o modal na cara do usuário.

## Integrações (Deep Linking)
- [ ] Clicar no botão "MAR" no BedMap (`/inpatient/bedmap`) abre o MAR já com ward e stay selecionados.
- [ ] Clicar em "Abrir MAR" nos detalhes da internação (`/inpatient/stays/[id]`) faz o mesmo.
