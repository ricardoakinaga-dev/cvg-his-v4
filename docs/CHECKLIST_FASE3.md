# Checklist de Validação - Fase 3 (Internação)

Este checklist confirma que a "Linha de Cuidado" de internação está completa e integrada.

## Navegação & Estrutura
- [ ] Sidebar possui o link "Internações (Stays)" com ícone/texto corretos.
- [ ] Sidebar destaca o item "Internações (Stays)" quando em `/inpatient/stays/*`.
- [ ] BedMap exibe botão "Abrir Stay" apenas em leitos ocupados.
- [ ] Clique no "Abrir Stay" do BedMap leva para a URL correta `/inpatient/stays/[uuid]`.

## Dashboard de Stays (`/inpatient/stays`)
- [ ] Lista carrega e exibe internações ativas por padrão.
- [ ] Filtro por Ala (Ward) atualiza a lista.
- [ ] Filtro por Status (Active/Discharged) funciona.
- [ ] Cards exibem nome do paciente, leito e tempo de internação.

## Detalhes do Stay / Nurse Station (`/inpatient/stays/[id]`)
- [ ] Página carrega sem erros com ID válido.
- [ ] Página exibe erro amigável com ID inválido ou inexistente.
- [ ] **Header**:
  - [ ] Labels corretas (Paciente, Admissão, Leito).
  - [ ] Botões para perfil do paciente e prontuário (se disponíveis) funcionam.
- **Painel de Prescrições (Orders)**:
  - [ ] Lista ordens ativas.
  - [ ] Permite criar nova ordem (se permissionado).
- **Painel MAR**:
  - [ ] Carrega doses vencidas/próximas.
  - [ ] Botões "Administrar/Recusar/Atrasar" abrem modal/confirmam ação.
  - [ ] Atualiza lista após ação.
  - [ ] Histórico abaixo do painel exibe ações recentes.
- **Painel Logs**:
  - [ ] Exibe logs brutos de administração.
- **Sidebar de Ações**:
  - [ ] Botão "Abrir Plantão da Ala" aparece se WardId existe.
  - [ ] Link do Plantão leva para `/inpatient/handovers` com QueryString correta.
  - [ ] Botão "Transferir" abre modal e processa sucesso.
  - [ ] Botão "Dar Alta" abre modal e processa sucesso.

## Técnica
- [ ] Build de produção (`pnpm build` ou `tsc`) passa sem erros.
- [ ] Permissões de acesso (`permissions.ts`) estão sendo respeitadas nos botões críticos.
