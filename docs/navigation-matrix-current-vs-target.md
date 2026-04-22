# Matriz de navegação — estado atual vs estado alvo

Data: 2026-04-22
Objetivo: mapear grupos, rotas e superfícies atuais do SPA para a árvore Vetus-aligned alvo.

## Legenda de ação
- manter = já está no lugar correto
- mover = existe, mas precisa trocar de grupo/subgrupo
- renomear = existe, mas com label/conceito inadequado
- expandir = existe, mas precisa ganhar subestrutura explícita
- placeholder = precisa estado temporário explícito
- fora da árvore principal = deve sair do menu operacional principal

## 1. Grupos principais

| Grupo atual | Estado alvo | Ação |
|---|---|---|
| Início | Início | manter |
| Atendimento | Atendimento | expandir |
| Laboratório | Laboratório | expandir |
| Estoque | Estoque | expandir |
| Financeiro | Financeiro | expandir |
| Marketing | Marketing | expandir |
| RH | RH | expandir |
| Relatórios | Relatórios | expandir |
| Console Enterprise | Fora da árvore principal | mover |

## 2. Mapeamento de rotas atuais para a árvore alvo

### Início
| Rota atual | Label atual | Alvo | Ação |
|---|---|---|---|
| `/` | Dashboard | Início > Visão geral > Dashboard | manter |

### Atendimento
| Rota atual | Label atual | Alvo | Ação |
|---|---|---|---|
| `/appointments` | Agenda | Atendimento > Atendimentos > Agenda | manter |
| `/queue` | Fila Operacional | Atendimento > Atendimentos > Fila Operacional | manter |
| `/encounters` | Atendimentos | Atendimento > Atendimentos > Atendimentos | manter |
| `/triage` | Triagem | Atendimento > Atendimentos > Triagem | manter |
| `/medical-records` | Prontuário | Atendimento > Atendimentos > Prontuário | manter |
| `/surgery` | Cirurgias | Atendimento > Atendimentos > Cirurgias | manter |
| `/counter-sales` | Comandas | Atendimento > Atendimentos > Comandas | manter |
| `/quotes` | Orçamentos | definir entre Atendimento ou Financeiro | mover / decisão |
| `/patients` | Pacientes | Atendimento > Cadastros > Pacientes | mover |
| `/owners` | Tutores | Atendimento > Cadastros > Tutores | mover |
| `/services` | Serviços | Atendimento > Cadastros > Serviços | mover |
| `/inpatient` | Internação | Atendimento > Internação > Internação | manter |
| `/inpatient/board` | Mapa de Leitos | Atendimento > Internação > Mapa de Leitos | manter |
| `/sectors` | Setores | Atendimento > Internação > Setores | mover conceitualmente |
| `/beds` | Leitos | Atendimento > Internação > Leitos | mover conceitualmente |
| `/discharges` | Altas | Atendimento > Internação > Altas | mover conceitualmente |

### Laboratório
| Rota atual | Label atual | Alvo | Ação |
|---|---|---|---|
| `/laboratory` | Laboratório | landing page do domínio | manter como landing |
| `/laboratory/orders` | Pedidos de Exame | Laboratório > Atendimentos > Exames | renomear opcionalmente |
| `/laboratory/results` | Resultados | Laboratório > Atendimentos > Laudos/Resultados | manter |
| `/diagnostics` | Central Diagnóstica | Laboratório > Atendimentos > Central Diagnóstica | manter |
| `/laboratory/equipment` | Equipamentos | Laboratório > Cadastrados > Equipamentos | mover conceitualmente |
| `/laboratory/report-types` | Tipos de Laudo | Laboratório > Cadastrados > Tipos de Laudo | mover conceitualmente |
| `/laboratory/reference-values` | Valores de Referência | Laboratório > Cadastrados > Referências | renomear/expandir |
| `/prescriptions` | Prescrições | fora do benchmark primário do menu laboratorial | decisão |
| `/prescription-executions` | Execuções | fora do benchmark primário do menu laboratorial | decisão |

### Estoque
| Rota atual | Label atual | Alvo | Ação |
|---|---|---|---|
| `/inventory` | Estoque | Estoque > Controles > Estoque | manter |
| `/inventory/movements` | Movimentações | Estoque > Controles > Movimentações | manter |
| `/inventory/validity` | Validade e Lotes | Estoque > Controles > Validade de Produtos | renomear leve |
| `/products` | Produtos | Estoque > Cadastrados > Produtos | mover conceitualmente |

### Fiscal
| Rota atual | Label atual | Alvo | Ação |
|---|---|---|---|
| `/fiscal` | Configuração Fiscal | Estoque > Configurações Fiscais > Fiscal | manter |
| `/fiscal/icms` | ICMS | Estoque > Configurações Fiscais > Tabela ICMS | manter |
| `/fiscal/pis-cofins` | PIS / COFINS | Estoque > Configurações Fiscais > Tabela PIS / COFINS | manter |
| `/fiscal/cfop` | CFOP | Estoque > Configurações Fiscais > Tabela CFOP | manter |
| `/fiscal/nfse` | NFS-e | Estoque > Configurações Fiscais > Tabela NFS-e | manter |
| `/fiscal/ncm` | IBPT / NCM | Estoque > Configurações Fiscais > NCM / IBPT | manter |
| `/fiscal/icms-matrix` | Matriz ICMS | Estoque > Configurações Fiscais > Matriz ICMS | manter |

### Financeiro
| Rota atual | Label atual | Alvo | Ação |
|---|---|---|---|
| `/cash` | Caixa | Financeiro > Gaveta > Caixa | manter |
| `/billing` | Faturamento | Financeiro > Controles > Faturamento | manter |
| `/pix` | PIX | Financeiro > Controles > PIX | manter |
| `/quotes` | Orçamentos | Financeiro > Controles > Orçamentos | manter ou mover |

### Marketing
| Rota atual | Label atual | Alvo | Ação |
|---|---|---|---|
| `/notifications` | Central de Notificações | Marketing > Comunicação > Central de Notificações | decisão |
| `/notifications/whatsapp` | WhatsApp Operacional | Marketing > Comunicação > WhatsApp Operacional | decisão |

### RH
| Rota atual | Label atual | Alvo | Ação |
|---|---|---|---|
| `/users` | Usuários | RH > Usuários > Usuários | manter |
| `/staff` | Equipe | RH > Usuários > Profissionais / Equipe | manter |

### Relatórios
| Rota atual | Label atual | Alvo | Ação |
|---|---|---|---|
| `/administrative-reports` | Hubs Administrativos | landing page de Relatórios | renomear / expandir |

### Fora da árvore principal
| Rota atual | Label atual | Alvo | Ação |
|---|---|---|---|
| `/access-control` | Governança de Acesso | Console Enterprise / plataforma | fora da árvore principal |
| `/audit` | Auditoria | Console Enterprise / plataforma | fora da árvore principal |
| `/lgpd` | LGPD | Console Enterprise / plataforma | fora da árvore principal |
| `/api-keys` | Chaves de API | Console Enterprise / plataforma | fora da árvore principal |
| `/webhooks` | Webhooks | Console Enterprise / plataforma | fora da árvore principal |
| `/api-client` | Cliente API | Console Enterprise / plataforma | fora da árvore principal |
| `/master-search` | Busca mestre | utilitário global | fora da árvore principal |

## 3. Gaps prioritários descobertos

### P0
- subárvore de Financeiro ainda rasa frente ao alvo
- subárvore de RH sem Comissões e Cadastros explícitos
- Relatórios ainda concentrado em um hub genérico
- Favoritos/Recentes/Enterprise competindo com menu principal

### P1
- Atendimento já é forte, mas precisa recontar a jornada oficial via menu
- Laboratório precisa explicitar melhor Hemogramas, Urina e Bioquímico
- Estoque precisa ganhar Cadastrados e Controles com semântica explícita

## 4. Uso da matriz

Esta matriz deve orientar:
- refatoração de `navigation.ts`
- refatoração de `routes.ts`
- ordenação da Fase A
- decisão de placeholders específicos
- testes estruturais do Sprint 1
