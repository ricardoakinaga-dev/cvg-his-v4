# 0175 - Roadmap de Construcao Premium do CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-04-11
**Base:** [0174-RELATORIO-COMPARATIVO-PREMIUM-VETUS-LIKE-VS-CVG-HIS-V2.md](./0174-RELATORIO-COMPARATIVO-PREMIUM-VETUS-LIKE-VS-CVG-HIS-V2.md)
**Objetivo:** Orientar a construcao do CVG-HIS V2 com as diretrizes premium do Vetus-like, mantendo `apps/spa` como unico frontend oficial e proibindo novas entregas em `apps/web`.

---

## 1. Principios do Roadmap

| Principio | Diretriz |
|-----------|----------|
| Uma trilha oficial | Nada de novo em `apps/web`; todo build novo vai para `apps/spa` |
| Um frontend canonico | `apps/spa` e a base oficial de longo prazo |
| Um shell coerente | Menu por dominio, contexto, favoritos, recentes e CTA padrao |
| Um modulo = um hub | Cada dominio deve expor KPI, alerta, acao e detalhe |
| Uma documentacao viva | Docs devem seguir o codigo real, nao o contrario |
| Um backlog por impacto | Prioridade por risco operacional, ganho funcional e corte de legado |

---

## 2. Horizontes Estrategicos

### H1 - Consolidacao do Shell Premium

**Janela:** 0 a 30 dias

**Objetivo:**
- Estabilizar o `apps/spa` como experiencia oficial
- Padronizar shell, header, menu e linguagem de acao
- Reduzir divergencia visual entre modulos

**Entregas:**
- Shell consistente em todos os dominios
- Breadcrumbs, favoritos e recentes em todos os fluxos
- Dashboard com leitura operacional mais forte
- Pages base de list/detail/form com padrao comum
- Command palette (Ctrl+K)
- Dark mode

**Squads:** Frontend (4) + Design System (2)

**Marco H1:** UX consistente por toda a SPA

---

### H2 - Hubs Operacionais por Dominio

**Janela:** 30 a 90 dias

**Objetivo:**
- Transformar paginas soltas em centros de dominio
- Aprofundar densidade funcional dos modulos mais usados

**Dominios prioritarios:**
- Tutores e pacientes
- Agenda e fila
- Atendimentos e prontuario
- Triagem, internacao e leitos
- Faturamento, caixa e estoque

**Squads:** Frontend (4) + Backend (4) + Domain (2)

**Marco H2:** Core operacional fechado e navegavel ponta a ponta

---

### H3 - Governance e Plataforma Premium

**Janela:** 90 a 150 dias

**Objetivo:**
- Consolidar administracao, auditoria, acessos, notificacoes, integracoes e operacao
- Transformar a plataforma em algo governavel e explicavel

**Dominios prioritarios:**
- Access-control
- Users
- Staff
- Audit
- Notifications
- API-client
- API-keys
- Webhooks

**Squads:** Backend (4) + Security (2) + Frontend (2)

**Marco H3:** Governance explicavel, auditavel e administravel

---

### H4 - Comercial e Expansao de Valor

**Janela:** 150 a 240 dias

**Objetivo:**
- Fechar a camada comercial e analitica com leitura executiva
- Elevar a percepcao de produto premium

**Dominios prioritarios:**
- Products
- Services
- Counter-sales
- Quotes
- Commercial-reports
- Billing
- Cash
- Inventory

**Squads:** Frontend (3) + Backend (3) + Domain (2)

**Marco H4:** Fluxo comercial completo e mensuravel

---

### H5 - Fechamento do Legado e Endurecimento

**Janela:** 240 dias em diante

**Objetivo:**
- Concluir a desativacao operacional do `apps/web`
- Reduzir o residual documental
- Manter so uma trilha oficial de construcao

**Squads:** All (consolidacao)

**Marco H5:** Nenhum fluxo critico depende de `apps/web`

---

## 3. Roadmap por Fase

| Fase | Foco | Entregas Chave | Condicao de Saida |
|------|------|----------------|-------------------|
| F0 | Base Viva | Docs alinhadas, trilha oficial clara, decisoes sem ambiguidade | Nenhuma duvida sobre frontend, deploy e cutover |
| F1 | Shell Premium | Navegacao, contexto, favoritos, recentes, CTA, dashboard, command palette, dark mode | UX consistente por toda a SPA |
| F2 | Core Operacional | Owners, patients, appointments, encounters, records | Operacao diaria completa e confiavel |
| F3 | Assistencial Avancado | Triage, inpatient, beds, board, diagnostics, surgery, prescriptions, discharges | Leitura clinica e operacional densa |
| F4 | Governance | Access-control, users, staff, audit, notifications | Administracao e rastreabilidade premium |
| F5 | Comercial | Products, services, counter-sales, quotes, cash, inventory, reports | Fluxo de receita e consumo fechado |
| F6 | Cutover Final | Remover dependencias de `apps/web` | Nenhuma jornada critica depende do legado |

---

## 4. Sequencia de Execucao

### Etapa A - Alinhar a Experiencia de Topo

1. Revisar shell e topbar do `apps/spa`
2. Padronizar card, button, alert e input
3. Garantir menu por dominio e contexto fixo
4. Ajustar dashboard como centro de operacao
5. Implementar command palette (Ctrl+K)
6. Implementar dark mode

### Etapa B - Fechar o Core de Uso Diario

1. Tutores
2. Pacientes
3. Agenda
4. Fila
5. Atendimentos
6. Prontuario

### Etapa C - Ampliar o Assistencial Premium

1. Triagem
2. Internacao
3. Mapa de leitos
4. Setores e leitos
5. Diagnosticos
6. Cirurgia
7. Prescricoes
8. Execucao de prescricoes
9. Altas

### Etapa D - Consolidar Administracao e Governance

1. Usuarios
2. Equipe
3. Access-control
4. Audit
5. Notifications
6. API keys
7. Webhooks
8. API client

### Etapa E - Fechar a Camada Comercial e Analitica

1. Produtos
2. Servicos
3. Comanda de balcao
4. Orcamentos
5. Caixa
6. Faturamento
7. Relatorios comerciais
8. Inventario

### Etapa F - Desligar o Legado

1. Manter web somente como fallback controlado durante migracao por dominio
2. Remover redirects antigos
3. Encerrar deploy canonico do web
4. Eliminar a trilha operacional residual

---

## 5. Marcos Executivos

| Marco | Prazo | Entrega |
|-------|-------|---------|
| M1 | M1 | Fundacao premium pronta (shell, dark mode, command palette) |
| M2 | M3 | Cadastros com qualidade premium (tutores, pacientes) |
| M3 | M4 | Agenda e atendimento operando com UX premium |
| M4 | M5 | Assistencial avancado (triagem, internacao, prontuario) |
| M5 | M6 | Governance implementada (access-control, audit) |
| M6 | M8 | Comercial completo (billing, caixa, estoque) |
| M7 | M10 | Legacy desativado, SPA como unico frontend |
| M8 | M12 | Estabilizacao final e otimizacao |

---

## 6. Decisoes de Arquitetura Assumidas

| Decisao | Implicacao |
|---------|------------|
| `apps/spa` e o frontend oficial alvo | Novas telas e evolucoes vao para o SPA |
| `apps/web` e trilha encerrada | Sem novas features, apenas desligamento controlado e limpeza documental |
| Design system manda na padronizacao | Shell e modulos seguem o mesmo conjunto de componentes |
| Hubs sao por dominio | Páginas devem juntar KPIs, lista, detalhe e acao |
| Governance precisa ser explicavel | Permissao efetiva e origem devem estar visiveis |

---

## 7. Riscos do Roadmap

| Risco | Impacto | Mitigacao |
|-------|---------|----------|
| Duplicar a trilha de frontend | Confusao operacional | Manter SPA como unica trilha oficial |
| Crescer sem padrao de shell | Experiencia fragmentada | Consolidar layout, CTA e hierarquia antes de expandir |
| Migrar sem corte por dominio | Vacuo operacional | Cortar por dominio com aceite claro |
| Priorizar visual acima de fluxo | Produto bonito mas fraco | Backlog deve sempre partir do fluxo critico |
| Deixar docs desatualizarem | Perda de confianca | Cada fase precisa fechar com validacao documental |

---

## 8. Resultado Esperado

Ao fim do roadmap, o CVG-HIS V2 deve estar em um destes estados:

1. `apps/spa` consolidado como unico frontend oficial
2. `apps/web` sem novas entregas e fora da trilha operacional
3. Shell premium com linguagem consistente em todo o produto
4. Hubs de dominio com KPI, alertas e acoes
5. Governance e comercial com acabamento enterprise
