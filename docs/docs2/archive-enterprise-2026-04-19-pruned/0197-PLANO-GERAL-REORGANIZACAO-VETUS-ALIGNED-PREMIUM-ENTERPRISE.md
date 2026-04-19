# 0197 - Plano Geral de Reorganizacao Vetus-Aligned Premium Enterprise

**Status:** proposto  
**Data de validacao:** 2026-04-12  
**Objetivo:** reorganizar o `cvg-his-v2` para espelhar a logica operacional do Vetus no navbar, na taxonomia e na distribuicao de modulos, preservando os upgrades de arquitetura, seguranca, governanca e UX premium ja construidos no produto.

---

## 1. Escopo e fontes revisadas

Este plano foi consolidado a partir de quatro fontes de verdade:

1. **Acervo Vetus**
   - `vetus-screenshots/00-NAVBAR-ESTRUTURA-COMPLETA.md`
   - `vetus-screenshots/docs/00-VETUS-RELATORIO-COMPLETO.md`
   - `vetus-screenshots/docs/01-VETUS-NAVBAR-ESTRUTURA-COMPLETA.md`
   - `vetus-screenshots/docs/02-VETUS-AGENDA.md`
   - `vetus-screenshots/docs/03-VETUS-COMANDAS.md`
   - `vetus-screenshots/docs/04-VETUS-CADASTROS-ANIMAIS-CLIENTES.md`
   - `vetus-screenshots/docs/05-VETUS-ESTRUTURA-API.md`
   - `vetus-screenshots/docs/modulos/00-RELATORIO-ATENDIMENTO.md`
   - `vetus-screenshots/docs/modulos/01-RELATORIO-FINANCEIRO.md`
   - `vetus-screenshots/docs/modulos/02-RELATORIO-COMISSOES.md`
   - `vetus-screenshots/docs/modulos/03-RELATORIO-INTERNACAO.md`
   - `vetus-screenshots/docs/modulos/04-RELATORIO-LABORATORIO.md`

2. **Planejamento Enterprise do projeto**
   - leitura completa da pasta `docs/Enterprise`
   - interpretacao executiva consolidada por `0196`
   - trilha operacional atual consolidada por `0190` a `0195`

3. **Estado real do produto**
   - `apps/spa/src/navigation.ts`
   - `apps/spa/src/router/routes.ts`
   - `apps/spa/src/layouts/AppLayout.vue`
   - paginas e hubs ativos em `apps/spa/src/pages/**`
   - modulos de dominio ativos em `packages/modules/**`

4. **Validacao visual**
   - screenshots-chave do Vetus para navbar, topbar, agenda, comandas, animal e dashboard financeiro
   - snapshots visuais existentes da SPA apenas como apoio historico, sem prevalecer sobre o codigo atual

---

## 2. Veredito executivo

O `cvg-his-v2` **ja e superior ao Vetus em stack, governanca e capacidade enterprise**, mas **a organizacao funcional primaria ainda nao conversa com a logica mental de um ERP veterinario tradicional**.

Hoje o sistema esta agrupado por domínios internos do produto:

- `Inicio`
- `Cadastro`
- `Operacao`
- `Assistencial`
- `Comercial`
- `Estoque`
- `Plataforma`
- `Governanca`

O Vetus, por outro lado, organiza a operacao no eixo esperado por recepcao, atendimento, financeiro e backoffice:

- `Inicio`
- `Atendimento`
- `Laboratorio`
- `Estoque`
- `Financeiro`
- `Marketing`
- `RH`
- `Relatorios`

### Conclusao central

O trabalho correto **nao e copiar o Vetus literal**, e sim:

- **adotar a organizacao primaria do Vetus**
- **preservar a execucao moderna do CVG**
- **manter os upgrades enterprise fora de regressao**
- **absorver os modulos faltantes de ERP onde fizer sentido**
- **isolar capacidades exclusivamente enterprise em uma camada secundaria, nao no menu principal**

Em resumo:

> o `cvg-his-v2` deve virar um **ERP veterinario premium com arquitetura enterprise moderna**, nao um clone visual do legado Vetus.

---

## 3. Principios obrigatorios de reorganizacao

### 3.1 Principio de nao-regressao

Nenhuma reorganizacao de navbar ou modulo pode remover ou enfraquecer:

- SPA como frontend oficial
- command palette
- favoritos e recentes
- dark mode e theming
- MFA, LGPD, auditoria e RBAC/ABAC
- webhooks, API keys, API client e runtime de integracoes
- observabilidade, tracing, backups e trilha SOC2
- design system e padroes de hub page

### 3.2 Principio de aderencia operacional

O menu principal deve refletir a linguagem da operacao veterinaria:

- recepcao entende `Atendimento`
- laboratorio entende `Laboratorio`
- caixa entende `Financeiro`
- RH entende `Usuarios`, `Profissionais`, `Comissoes`
- diretoria entende `Relatorios`

### 3.3 Principio de dupla camada

O produto passa a ter duas camadas de navegacao:

1. **Camada primaria ERP**
   - espelha a organizacao do Vetus
   - usada no dia a dia da operacao

2. **Camada secundaria enterprise**
   - expoe recursos exclusivos do CVG
   - governanca, integracoes, LGPD, APIs, observabilidade, seguranca
   - acessada por console administrativo, drawer contextual ou area utilitaria

### 3.4 Principio de hub por modulo

Cada modulo principal deve ter:

- KPI operacional
- alertas
- acessos rapidos
- listagem principal
- links para detalhes
- acoes de entrada
- conexoes com modulos vizinhos

### 3.5 Principio de paridade organizacional, nao de defeito

Paginas quebradas ou fluxos legados ruins do Vetus **nao devem ser replicados**.

Exemplos:

- telas 404 do Vetus nao sao referencia
- densidade visual antiga nao deve ser copiada
- sem reintroduzir duplicidade de rotas
- sem trocar hubs modernos por telas monoliticas legacy

---

## 4. Diagnostico atual vs alvo

| Eixo | Vetus | CVG atual | Diretriz alvo |
| --- | --- | --- | --- |
| Menu principal | por macroareas de ERP | por domínios internos de produto | migrar para macroareas Vetus |
| Sidebar | hierarquia 2-3 niveis | grupos simples com itens diretos | adotar hierarquia por grupo e subgrupo |
| Topbar | busca, suporte, WhatsApp, perfil, empresa | breadcrumbs, busca por palette, logout, tema | convergir para topbar operacional Vetus+CVG |
| Cadastros | embutidos em Atendimento/Estoque/RH | separados em grupo `Cadastro` | redistribuir cadastros para seus contextos |
| Laboratorio | grupo proprio | diluido em `Assistencial` e `Diagnostics` | criar dominio proprio no menu |
| Financeiro | subdominios claros | billing/cash/pix em `Comercial` | migrar para grupo Financeiro |
| RH | usuarios, grupos, comissoes, profissionais | distribuido entre `Plataforma` e `Governanca` | consolidar sob RH |
| Relatorios | grupo proprio | comercial-reports e audit isolados | criar trilha de relatorios por area |
| Capacidades enterprise | inexistentes no legado | varias ja prontas no CVG | manter fora do menu ERP principal |

---

## 5. Arquitetura-alvo da navegacao

## 5.1 Modelo de shell alvo

O shell alvo deve ser composto por:

1. **Topbar fixa**
2. **Sidebar primaria Vetus-aligned**
3. **Console secundario enterprise**
4. **Workspace com breadcrumbs, hubs e contexto**

### 5.1.1 Topbar alvo

Itens obrigatorios:

- logo `CVG HIS`
- toggle da sidebar
- contexto organizacional: tenant, empresa, unidade e setor
- busca global unica
- acesso a command palette
- notificacoes
- suporte e documentacao
- atalho WhatsApp operacional
- favoritos e recentes
- tema claro/escuro
- perfil do usuario

### 5.1.2 Sidebar primaria alvo

A sidebar principal deve seguir a mesma logica do Vetus:

```text
Início
Atendimento
Laboratório
Estoque
Financeiro
Marketing
RH
Relatórios
```

### 5.1.3 Console secundario enterprise

Itens que nao devem poluir o menu principal, mas precisam continuar visiveis:

- governanca de acesso
- auditoria
- LGPD
- API keys
- webhooks
- API client
- MFA e seguranca
- status de integrações
- evidencias SOC2 e saude operacional

Este console pode existir como:

- drawer lateral direito
- area utilitaria no footer da sidebar
- hub administrativo com acesso restrito

Recomendacao deste plano:

- **menu principal espelha o Vetus**
- **console enterprise concentra o que o Vetus nao tinha**

---

## 6. Navbar alvo detalhado

## 6.1 Início

### Objetivo

Ser o ponto de entrada operacional, com linguagem de escritorio e recepcao.

### Subestrutura alvo

- `Dashboard`
- `Central operacional`
- `Acessos rapidos`
- `Pendencias do dia`

### Reuso do que ja existe

- `DashboardPage.vue`
- favoritos
- recentes
- command palette
- KPIs baseados em permissao

### Evolucao necessaria

- cards de atalhos por macroarea
- lembretes, alertas e pendencias
- widgets por perfil

## 6.2 Atendimento

### Subgrupos alvo

#### Atendimentos

- `Agenda`
- `Agenda Operacional`
- `Fila / Esteira`
- `Atendimentos`
- `Prontuarios`
- `Comandas / Faturamento de atendimento`
- `Orcamentos`
- `Vendas assistidas`
- `Pacotes` - futuro
- `Vacinas e protocolos` - futuro

#### Internacao

- `Internacoes`
- `Mapa de Leitos / Boxes`
- `Setores`
- `Leitos`
- `Passagem de Plantao`
- `Altas`

#### Cadastrados

- `Pacientes`
- `Tutores`
- `Servicos`
- `Protocolos`
- `Termos`

### Mapeamento do que ja existe

| Alvo | Estado atual no CVG | Acao |
| --- | --- | --- |
| Agenda | `appointments` | manter e reposicionar |
| Agenda Operacional | `scheduling` | manter e reposicionar |
| Fila / Esteira | `queue` | renomear e reposicionar |
| Atendimentos | `encounters` | manter |
| Prontuarios | `medical-records` | manter |
| Comandas / faturamento assistencial | `billing` | manter e reposicionar |
| Orcamentos | `quotes` | manter |
| Vendas assistidas | `counter-sales` | manter e aproximar de comandas |
| Internacoes | `inpatient` | manter |
| Mapa de leitos | `inpatient/board` | manter |
| Setores | `sectors` | manter |
| Leitos | `beds` | manter |
| Altas | `discharges` | manter |
| Pacientes | `patients` | mover do grupo `Cadastro` |
| Tutores | `owners` | mover do grupo `Cadastro` |
| Servicos | `services` | mover de `Estoque` para atendimento/cadastro funcional |

## 6.3 Laboratorio

### Subgrupos alvo

#### Atendimentos

- `Exames`
- `Laudos`
- `Hemogramas`
- `Bioquimico`
- `Urina`

#### Cadastrados

- `Equipamentos`
- `Tipos de Laudo`
- `Valores de Referencia`

### Estado atual

O repositorio possui base funcional dispersa em:

- `diagnostics`
- `exam_orders`
- `exam_results`
- componentes assistenciais
- modulo `ml` que pode depois enriquecer analise

### Gap

Falta a **superficie de produto organizada como Laboratorio**, com paginas, filtros, hubs e cadastros especificos.

### Diretriz

Laboratorio deixa de ser apenas uma capacidade clinica e vira um **dominio navegavel de primeira classe**.

## 6.4 Estoque

### Subgrupos alvo

#### Controles

- `Estoque`
- `Movimentacoes`
- `Consumo clinico`
- `Validade / lote`
- `Compras`
- `Reposicao`
- `Transferencias`

#### Cadastrados

- `Produtos`
- `Fornecedores e despesas`
- `Fabricantes`
- `Grupos de produto`
- `Unidades de medida`
- `Tabelas de preco`

#### Fiscal

- `ICMS`
- `IPI`
- `PIS`
- `COFINS`
- `CFOP`
- `NFS-e`
- `Matriz ICMS`
- `IBS / CBS`

### Estado atual

Existe:

- `inventory`
- `products`
- `services`
- `fiscal`
- modelos e contratos de pagamento/comercial

### Gap

Falta a organizacao de backoffice de estoque e fiscal em submodulos claros.

## 6.5 Financeiro

### Subgrupos alvo

#### Gaveta

- `Caixa / Gaveta`
- `Abertura e fechamento`

#### Controles

- `Faturamento`
- `Contas a receber`
- `Contas a pagar`
- `PIX`
- `Cartoes e transacoes`
- `Fluxo de caixa`
- `Linha do tempo financeira`
- `DRE`

#### Cadastrados

- `Formas de pagamento`
- `Bancos`
- `Centros de custo`
- `Custos e despesas`

### Estado atual

Existe:

- `billing`
- `cash`
- `pix`
- pagamentos, accounts, financial accounts
- dashboards comerciais parciais

### Gap

O produto possui base financeira, mas ainda esta narrado como `Comercial` e nao como `Financeiro ERP`.

## 6.6 Marketing

### Subgrupos alvo

#### Envios

- `Notificacoes`
- `WhatsApp operacional`
- `Campanhas`
- `SMS`
- `Email`

#### Configuracoes

- `Templates`
- `Consentimento de comunicacao`
- `Preferencias por canal`

### Estado atual

Existe:

- `notifications`
- `notifications-whatsapp`
- `webhooks` e event bus
- trilha de campanhas ainda ausente

### Gap

Falta transformar notificacao tecnica em **modulo de relacionamento e campanhas**.

## 6.7 RH

### Subgrupos alvo

#### Usuarios

- `Usuarios`
- `Equipe / Profissionais`
- `Grupos de acesso`
- `MFA e seguranca do usuario`

#### Comissoes

- `Regras de comissao`
- `Calculo de comissao`
- `Produtividade`

#### Cadastrados

- `Profissoes`
- `Departamentos`
- `Folgas`

### Estado atual

Existe:

- `users`
- `staff`
- `access-control`
- `mfa`
- `audit`

### Diretriz

RH passa a ser o grupo humano-administrativo.  
Governanca de acesso deixa de ser grupo primario isolado e vira parte do ecossistema de RH e console enterprise.

## 6.8 Relatorios

### Subgrupos alvo

#### Financeiros

- `Fluxo de caixa`
- `DRE`
- `Recebimentos`
- `Pagamentos`
- `Caixa`

#### Atendimento

- `Agenda`
- `Atendimentos`
- `Producao`
- `Atendimento por profissional`

#### Cadastros

- `Pacientes`
- `Tutores`
- `Produtos`
- `Servicos`

#### Plataforma

- `Auditoria`
- `LGPD`
- `Integracoes`
- `Saude operacional`

### Estado atual

Existe:

- `commercial-reports`
- `audit`
- `lgpd`
- dados observaveis de operacao

### Gap

Falta um hub de relatorios por area, com narrativa de diretoria e backoffice.

---

## 7. Distribuicao alvo dos modulos atuais

| Modulo atual | Grupo atual | Grupo alvo | Decisao |
| --- | --- | --- | --- |
| dashboard | Inicio | Inicio | manter |
| owners | Cadastro | Atendimento > Cadastrados | mover |
| patients | Cadastro | Atendimento > Cadastrados | mover |
| appointments | Operacao | Atendimento > Atendimentos | mover |
| scheduling | Operacao | Atendimento > Atendimentos | mover |
| queue | Operacao | Atendimento > Atendimentos | mover e renomear para esteira/fila |
| encounters | Operacao | Atendimento > Atendimentos | manter |
| medical-records | Operacao | Atendimento > Atendimentos | mover |
| triage | Assistencial | Atendimento > Atendimentos | mover |
| diagnostics | Assistencial | Laboratorio > Atendimentos | mover e desmembrar |
| prescriptions | Assistencial | Atendimento ou Laboratorio conforme fluxo | manter e reclassificar |
| prescription-executions | Assistencial | Atendimento / Internacao | manter |
| inpatient | Assistencial | Atendimento > Internacao | mover |
| bed board | Assistencial | Atendimento > Internacao | mover |
| sectors | Assistencial | Atendimento > Internacao | mover |
| beds | Assistencial | Atendimento > Internacao | mover |
| surgery | Assistencial | Atendimento > Atendimentos | manter |
| discharges | Assistencial | Atendimento > Internacao | manter |
| billing | Comercial | Financeiro > Controles | mover |
| cash | Comercial | Financeiro > Gaveta | mover |
| pix | Comercial | Financeiro > Controles | mover |
| counter-sales | Comercial | Atendimento > Atendimentos ou Financeiro > Controles | manter, com dupla entrada contextual |
| quotes | Comercial | Atendimento > Atendimentos | mover |
| commercial-reports | Comercial | Relatorios | mover |
| inventory | Estoque | Estoque > Controles | manter |
| products | Estoque | Estoque > Cadastrados | manter |
| services | Estoque | Atendimento > Cadastrados | mover de contexto |
| users | Plataforma | RH > Usuarios | mover |
| staff | Plataforma | RH > Usuarios | mover |
| notifications | Plataforma | Marketing > Envios | mover |
| notifications-whatsapp | Plataforma | Marketing > Envios | mover |
| access-control | Governanca | RH > Usuarios e Console Enterprise | fundir narrativamente |
| audit | Governanca | Relatorios > Plataforma e Console Enterprise | fundir narrativamente |
| lgpd | Governanca | Relatorios > Plataforma e Console Enterprise | fundir narrativamente |
| api-keys | Plataforma | Console Enterprise | preservar fora do menu ERP |
| webhooks | Plataforma | Console Enterprise | preservar fora do menu ERP |
| api-client | Plataforma | Console Enterprise | preservar fora do menu ERP |
| mfa | Governanca | RH > Usuarios e Console Enterprise | preservar |
| soc2 | Governanca | Console Enterprise | preservar |

---

## 8. Capacidades faltantes para atingir paridade organizacional premium

## 8.1 Lacunas P0

- navbar primaria Vetus-aligned
- redistribuicao dos cadastros para seus dominios operacionais
- grupo `Laboratorio` real no menu
- grupo `Financeiro` real no menu
- grupo `RH` consolidado
- grupo `Relatorios` consolidado
- empresa/unidade/setor como contexto visivel no shell

## 8.2 Lacunas P1

- modulos laboratoriais dedicados
- contas a receber
- contas a pagar
- fluxo de caixa
- DRE
- bancos
- formas de pagamento
- centros de custo
- regras e calculo de comissoes
- campanhas de marketing
- relatorios por area

## 8.3 Lacunas P2

- pacotes
- vacinas e protocolos com hub proprio
- fidelidade / pontuacao
- fornecedores, fabricantes e grupos de produto completos
- configuracoes fiscais expandidas na UI
- console executivo de BI por area

---

## 9. Regras de preservacao dos upgrades do CVG

As seguintes capacidades devem ser mantidas e elevadas, nunca removidas:

1. **Shell moderno**
   - command palette
   - favoritos
   - recentes
   - dark mode
   - breadcrumb contextual

2. **Base enterprise**
   - MFA
   - LGPD
   - auditoria
   - access control
   - SOC2
   - backup/restore
   - observabilidade

3. **Capacidades de plataforma**
   - API keys
   - webhooks
   - API client
   - event bus
   - PIX
   - canais de notificacao

4. **Padrao de UI melhor que o legado**
   - hub pages
   - quick actions
   - skeletons
   - estados vazios
   - componentes do design system
   - responsividade

---

## 10. Entregas esperadas deste programa de reorganizacao

Ao final da trilha, o `cvg-his-v2` deve apresentar:

- navbar principal com organizacao Vetus-like
- console enterprise separado para capacidades avancadas
- modulos atuais redistribuidos sem perda de funcionalidade
- dominios faltantes priorizados por valor de negocio
- topbar mais operacional, com suporte, busca e contexto organizacional
- dashboards e hubs alinhados a cada macroarea
- relatorios estruturados por dominio
- narrativa unica entre produto, codigo e documentacao

---

## 11. Criterios de aceite do plano geral

Este plano so sera considerado atendido quando houver:

1. mapa oficial do navbar alvo aprovado
2. mapeamento modulo-atual para grupo-alvo aprovado
3. lista de modulos faltantes priorizada
4. estrategia de preservacao dos upgrades enterprise formalizada
5. backlog e roadmap derivados deste plano publicados

---

## 12. Decisao executiva

Este plano recomenda formalmente:

- **adotar a estrutura organizacional primaria do Vetus**
- **manter o CVG como produto tecnicamente superior**
- **separar o ERP operacional do console enterprise**
- **tratar a reorganizacao do navbar como trabalho de arquitetura de informacao, nao como cosmetica**

Esta e a forma mais segura de atingir o pedido do programa:

> ter a mesma estrutura organizacional do Vetus, com os modulos semelhantes, sem perder os upgrades premium enterprise ja construidos no `cvg-his-v2`.
