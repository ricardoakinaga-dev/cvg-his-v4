# 0155 - Plano de Migracao do apps/web para o apps/spa por Dominio

**Data:** 2026-04-11

## Objetivo

Executar a migracao das funcoes hoje expostas em `apps/web` para o `apps/spa`, sem vazar operacao, sem vácuo funcional e sem perder a trilha de convivencia.

## Regra principal

- `apps/spa` e o destino oficial
- `apps/web` permanece vivo ate o corte por dominio
- nenhum dominio e removido do `apps/web` antes de existir paridade funcional e validacao
- o `apps/web` so pode ser apagado por completo depois que a matriz de rotas estiver encerrada e o plano de desativacao tiver sido satisfeito

## Princípios de migração

### 1. Migração por dominio, nao por arquivo

Cada corte deve ser feito por jornada de negocio.

### 2. Migração por valor, nao por quantidade de rotas

Os primeiros dominios sao os de maior uso e maior impacto operacional.

### 3. Migração com equivalencia

Nenhuma tela do `apps/web` some antes da tela equivalente existir no `apps/spa`.

### 4. Migração com convivio

Durante a transicao, o usuario pode cair no `apps/web` por fluxos ainda nao migrados.

### 5. Migração reversivel

Cada onda precisa de rollback simples por rota ou por dominio.

## Mapa de prioridades

### Prioridade P0 - fundacao do frontend oficial

1. shell enterprise do `apps/spa`
2. navbar por dominio
3. topbar com contexto e breadcrumbs
4. design tokens e layout base
5. padrao de pagina por tipo de tela
6. auth / session / permissao / logout
7. roteamento de fallback para `apps/web` quando dominio ainda nao migrou

### Prioridade P1 - core assistencial de maior uso

1. dashboard
2. tutores
3. pacientes
4. agenda
5. atendimentos
6. prontuario

### Prioridade P2 - operacao clinica avancada

1. triagem
2. execucoes de prescricao
3. prescricoes
4. altas
5. cirurgia
6. internação
7. mapa de leitos
8. diagnosticos

### Prioridade P3 - backoffice financeiro e comercial

1. faturamento
2. caixa
3. PIX
4. vendas de balcao
5. orcamentos
6. produtos
7. servicos
8. inventario
9. notificacoes

### Prioridade P4 - governanca e operacao de plataforma

1. usuarios
2. equipe
3. acesso / permissões
4. auditoria
5. fila
6. busca global
7. setores
8. leitos
9. relatorios comerciais
10. api-keys
11. webhooks

## Mapeamento funcional: apps/web -> apps/spa

| Funcao hoje em `apps/web` | Destino esperado no `apps/spa` | Prioridade | Observacao |
|---|---|---:|---|
| `/login` | `/login` | P0 | Padronizar auth e redirecionamento |
| `/` | `/` | P1 | Dashboard deve virar hub de decisao |
| `/owners` | `/owners` | P1 | Paridade funcional e detalhe completo |
| `/patients` | `/patients` | P1 | Incluir cards, historico e atalhos |
| `/encounters` | `/encounters` | P1 | Fluxo central assistencial |
| `/medical-records` | `/medical-records` | P1 | Precisa de visao narrativa premium |
| `/appointments` | `/appointments` | P1 | Kanban + agenda + agenda diaria |
| `/queue` | criar rota em `scheduling` | P4 | Hoje e gap direto |
| `/triage` | `/triage` | P2 | Formulario e timeline de triagem |
| `/inpatient` | `/inpatient` | P2 | Lista + detalhe + board |
| `/beds` e `/bed-map` | `/inpatient/board` ou alias dedicado | P2 | Normalizar conceito de leitos |
| `/diagnostics` | `/diagnostics` | P2 | Exames e laudos |
| `/surgeries` | `/surgery` | P2 | Normalizar nome de rota |
| `/prescriptions` | `/prescriptions` | P2 | Necessita padrao clinico mais denso |
| `/prescription-executions` | `/prescription-executions` | P2 | Fluxo critico da internação |
| `/discharges` | `/discharges` | P2 | Alta e checklists |
| `/billing` | `/billing` | P3 | Financeiro com maior densidade |
| `/cash-register` | `/cash` | P3 | Normalizar terminologia |
| `/counter-sales` | `/counter-sales` | P3 | PDV / venda balcão |
| `/quotes` | `/quotes` | P3 | Orçamento e conversao |
| `/inventory` | `/inventory` | P3 | Estoque precisa de fluxo melhor |
| `/products` | `/products` | P3 | Cadastros e detalhe |
| `/services` | `/services` | P3 | Cadastros e detalhe |
| `/notifications` | `/notifications` | P3 | Integrar com WhatsApp |
| `/users` | `/users` | P4 | Governanca de acesso e perfis |
| `/staff` | `/staff` | P4 | Equipe e produtividade |
| `/access-control` | criar area de governanca | P4 | Nao existe equivalente direto ainda |
| `/audit` | criar rota de auditoria | P4 | Importante para enterprise |
| `/master-search` | criar busca global | P4 | Essencial para navegacao premium |
| `/sectors` | criar rota de setores | P4 | Necessario para contexto organizacional |
| `/commercial-reports` | criar rota de relatorios | P4 | Painel comercial deve voltar ao SPA |
| `/api-keys` | `/api-keys` | P4 | Plataforma e integracoes |
| `/webhooks` | `/webhooks` | P4 | Plataforma e integracoes |

## O que migra primeiro

### Onda 1 - fundacao do shell

Entrega:

- navegao por dominio
- topbar com breadcrumbs e contexto
- perfis e permissao no shell
- landing do dashboard
- sistema de layout e espacamento

Saida:

- o `apps/spa` vira navegavel como produto principal

### Onda 2 - core assistencial

Entrega:

- tutores
- pacientes
- agendamentos
- atendimentos
- prontuario

Saida:

- os fluxos de maior volume deixam de depender do `apps/web`

### Onda 3 - operacao clinica

Entrega:

- triagem
- internação
- leitos / mapa de leitos
- exames
- cirurgia
- prescricoes e execucoes
- altas

Saida:

- a operacao hospitalar fica concentrada no `apps/spa`

### Onda 4 - backoffice

Entrega:

- faturamento
- caixa
- PIX
- vendas
- orcamentos
- produtos
- servicos
- inventory

Saida:

- o suporte financeiro/comercial fica completo no `apps/spa`

### Onda 5 - governanca e plataforma

Entrega:

- usuarios
- staff
- access-control
- audit
- master-search
- sectors
- reports
- api-keys
- webhooks

Saida:

- o `apps/web` passa a ser somente convivio residual ate desligamento

## Estrategia de corte

### Critérios de corte por dominio

Um dominio so pode ser desligado do `apps/web` quando tiver:

- rota equivalente no `apps/spa`
- fluxo principal funcionando
- fluxo de erro tratado
- mobile validado
- teste automatizado do caminho principal
- aprovacao funcional dos usuarios-chave

### Cutover tecnico

- manter redirect temporario do `apps/web` para `apps/spa`
- registrar feature flag por dominio
- manter fallback por sessao se falhar a tela nova
- monitorar erros e tempo de carregamento

### Cutover operacional

- comunicar usuarios por onda
- listar rotas migradas e rotas ainda legadas
- manter janela de convivencia ate estabilizacao

## Sequencia recomendada de trabalho

1. definir shell do `apps/spa`
2. padronizar navbar e topbar
3. implementar dashboard premium
4. migrar owners e patients
5. migrar appointments e encounters
6. migrar medical records
7. migrar inpatient, triage, diagnostics, surgery e discharges
8. migrar billing, cash, quotes, inventory e counter sales
9. migrar governance, audit, search e platform tools
10. desligar `apps/web` por dominio, nao por data arbitraria

## Riscos

- duplicidade de experiencia durante a convivencia
- divergencia entre contratos da API e componentes do SPA
- perda de velocidade se a navegao nao for padronizada cedo
- risco de migrar backoffice antes do core assistencial estar estabilizado

## Mitigacoes

- manter um catalogo unico de rotas e dominios
- criar contratos de pagina antes da implementacao
- migrar primeiro os fluxos de maior valor
- validar por onda com checklist de corte

## Resultado esperado

Ao final da migracao:

- `apps/spa` e o frontend oficial
- `apps/web` vira legado convivente ou fica desativado por dominio
- a navegacao segue a logica do `vetus-like`
- os modulos ficam mais densos, premium e consistentes
- o apagamento definitivo do `apps/web` so acontece depois do plano de desativacao formal

## Ver tambem

- [0159 - Plano de Desativacao e Apagamento do apps/web](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0159-PLANO-DESATIVACAO-APAGAMENTO-WEB.md)
