# CVG-HIS — Plano de implementação do R3 por sprint

Data: 2026-03-17

## Objetivo

Quebrar o **R3 — Operação clínica integrada** em sprints executáveis, respeitando:

- o estado atual do `modulo_cvg_his`
- as dependências reais entre módulos
- a necessidade de entregar valor progressivo
- a prioridade de destravar operação antes de expandir escopo

---

# Escopo do R3

O R3 cobre principalmente:

- agenda clínica
- configuração operacional da agenda
- pedidos e resultados básicos de exames
- billing clínico e itens do atendimento
- catálogo comercial mínimo
- fechamento de atendimento
- contas a receber básicas
- fluxo integrado agenda → atendimento → exame → cobrança

---

# Estratégia geral

## Princípio central

O R3 não deve começar por “agenda completa” nem por “financeiro completo”.

A ordem mais segura é:

1. criar os **blocos mínimos de catálogo e billing**
2. criar a **agenda essencial**
3. conectar atendimento, exame e cobrança
4. só então refinar o fluxo integrado

## Por quê?

Porque o produto já tem um núcleo clínico e hospitalar forte. O que falta agora é fechar a operação ambulatorial/comercial mínima sem explodir a complexidade.

---

# Visão macro dos sprints

- **Sprint R3.1** — Catálogo comercial mínimo
- **Sprint R3.2** — Billing clínico básico no atendimento
- **Sprint R3.3** — Fechamento de atendimento e contas a receber simples
- **Sprint R3.4** — Agenda clínica básica
- **Sprint R3.5** — Configuração operacional da agenda
- **Sprint R3.6** — Exames e resultados básicos
- **Sprint R3.7** — Fluxo integrado ponta a ponta
- **Sprint R3.8** — Endurecimento, UX e relatórios operacionais mínimos

---

# Sprint R3.1 — Catálogo comercial mínimo

## Objetivo
Criar a base mínima para que o atendimento possa lançar itens cobrados.

## Itens do sprint

### Backend
- criar módulo de **services**
- criar módulo de **products**
- criar schemas/tabelas mínimas para serviços e produtos
- suportar listagem, criação, edição e inativação
- garantir isolamento por tenant
- garantir trilha de auditoria nas operações críticas

### Frontend
- tela de listagem de serviços
- tela/modal de criação de serviço
- tela de listagem de produtos
- tela/modal de criação de produto
- pesquisa simples por nome/código

## Histórias cobertas
- R3-05.1 cadastrar serviços
- R3-05.2 cadastrar produtos básicos
- R3-05.3 pesquisar serviços e produtos

## Dependências
- R1 auth/RBAC
- tenant/settings base

## Critérios de pronto
- é possível cadastrar serviço
- é possível cadastrar produto
- é possível listar e pesquisar ambos
- entidades ficam segregadas por tenant
- itens podem ser marcados como ativos/inativos

## Riscos
- tentar acoplar estoque já nesse sprint
- exagerar na modelagem comercial logo no começo

## Fora de escopo
- lotes
- estoque
- preço promocional
- pacotes
- fiscal

---

# Sprint R3.2 — Billing clínico básico no atendimento

## Objetivo
Permitir lançar serviços e produtos diretamente no encounter.

## Itens do sprint

### Backend
- criar módulo **billingItems** ou equivalente
- modelar item de atendimento vinculado a encounter
- suportar inclusão, listagem, remoção e ajuste de item
- calcular subtotal/total por atendimento
- auditar alterações críticas

### Frontend
- bloco de itens dentro da tela de encounter
- inclusão de serviço no atendimento
- inclusão de produto no atendimento
- visualização do total parcial do atendimento
- remoção/edição simples de item

## Histórias cobertas
- R3-04.1 lançar serviço no atendimento
- R3-04.2 lançar produto no atendimento
- R3-04.3 consolidar itens do atendimento
- R3-04.4 visualizar total e itens lançados

## Dependências
- Sprint R3.1 concluído
- encounters já existentes (R1)

## Critérios de pronto
- atendimento aceita itens faturáveis
- total é recalculado corretamente
- cada item fica vinculado ao encounter
- itens podem ser consultados depois

## Riscos
- modelagem de billing tentar resolver tudo de uma vez
- confundir “item faturável” com “movimentação de estoque” cedo demais

## Fora de escopo
- desconto avançado
- formas de pagamento
- fatura
- contas a receber completas
- pacote comercial

---

# Sprint R3.3 — Fechamento de atendimento e contas a receber simples

## Objetivo
Fechar o ciclo mínimo de cobrança do atendimento.

## Itens do sprint

### Backend
- criar status financeiro para encounter/comanda
- suportar fechamento do atendimento com total consolidado
- suportar marcação como:
  - pago
  - parcial
  - pendente
- criar registro simples de conta a receber quando houver saldo em aberto
- endpoint de listagem de pendências básicas

### Frontend
- ação de “fechar atendimento/conta”
- resumo final de cobrança
- marcação de situação financeira
- listagem básica de atendimentos pendentes

## Histórias cobertas
- R3-06.1 fechar conta/comanda do atendimento
- R3-06.2 marcar como paga/parcial/pendente
- R3-06.3 gerar pendência/conta a receber básica
- R3-06.4 consultar pendências financeiras

## Dependências
- Sprint R3.2 concluído

## Critérios de pronto
- atendimento pode ser fechado financeiramente
- sistema registra situação financeira
- saldo pendente gera conta simples a receber
- pendências podem ser listadas

## Riscos
- virar módulo financeiro completo antes da hora
- discutir caixa/gaveta cedo demais

## Fora de escopo
- contas a pagar
- caixa/gaveta
- conciliação
- parcelamento avançado
- fiscal

---

# Sprint R3.4 — Agenda clínica básica

## Objetivo
Criar a primeira agenda funcional de recepção/profissional.

## Itens do sprint

### Backend
- criar entidade de agendamento/appointment
- criar rotas para:
  - criar agendamento
  - listar por dia/profissional
  - reagendar
  - cancelar
- vincular appointment a patient, owner e professional

### Frontend
- tela de agenda do dia
- criação simples de agendamento
- reagendamento/cancelamento
- filtro por profissional

## Histórias cobertas
- R3-01.1 agendar paciente com profissional
- R3-01.2 reagendar/cancelar
- R3-01.3 visualizar agenda diária
- R3-01.4 pesquisar agenda por dia/profissional

## Dependências
- patients / owners / profissionais já disponíveis

## Critérios de pronto
- agendamento pode ser criado
- agenda diária pode ser visualizada
- reagendamento e cancelamento funcionam
- vínculo com paciente e profissional está correto

## Riscos
- tentar fazer calendário super sofisticado cedo demais
- travar no componente visual antes de fechar a regra

## Fora de escopo
- disponibilidade avançada
- encaixe complexo
- recorrência
- marcadores sofisticados

---

# Sprint R3.5 — Configuração operacional da agenda

## Objetivo
Dar mais controle real à agenda, sem transformar o módulo em um projeto infinito.

## Itens do sprint

### Backend
- disponibilidade básica por profissional
- tipos de atendimento
- status/marcadores básicos de agenda

### Frontend
- configuração básica de agenda do profissional
- definição de tipo de atendimento
- status visual do agendamento

## Histórias cobertas
- R3-02.1 disponibilidade de profissional
- R3-02.2 tipos de atendimento
- R3-02.3 status/marcadores na agenda

## Dependências
- Sprint R3.4 concluído

## Critérios de pronto
- profissional pode ter disponibilidade configurada
- agendamento pode receber tipo de atendimento
- agenda mostra status operacionais básicos

## Riscos
- exagerar em regras de grade/turno
- querer resolver agenda multiunidade complexa cedo demais

## Fora de escopo
- regra avançada de encaixe
- otimização automática
- agenda coletiva sofisticada

---

# Sprint R3.6 — Exames e resultados básicos

## Objetivo
Recolocar o módulo de exames em operação mínima, com vínculo real ao paciente e ao atendimento.

## Itens do sprint

### Backend
- criar ou reativar módulo de pedidos de exame
- criar ou reativar módulo de resultados/laudos básicos
- vincular pedido ao patient/encounter
- suportar listagem por paciente
- suporte inicial a valores de referência simples

### Frontend
- solicitar exame dentro do atendimento
- listar exames do paciente
- registrar/visualizar resultado básico

## Histórias cobertas
- R3-03.1 solicitar exame
- R3-03.2 registrar resultado/laudo básico
- R3-03.3 consultar resultados anteriores
- R3-03.4 apresentar valores de referência quando houver

## Dependências
- encounters
- patient context
- patients

## Critérios de pronto
- exame pode ser solicitado
- resultado pode ser registrado
- histórico por paciente pode ser consultado
- pedido fica contextualizado no atendimento

## Riscos
- tentar reconstruir laboratório completo cedo demais
- misturar laboratório e imagem de forma excessiva no primeiro corte

## Fora de escopo
- integração externa com laboratório
- workflow laboratorial avançado
- painel técnico completo de laboratório

---

# Sprint R3.7 — Fluxo integrado ponta a ponta

## Objetivo
Conectar os módulos já construídos para evitar ilhas funcionais.

## Itens do sprint

### Fluxos a fechar
- abrir encounter a partir de appointment
- lançar exame dentro do encounter
- lançar itens faturáveis dentro do encounter
- fechar atendimento com pendência/pagamento
- exibir vínculo entre agenda, encounter, exames e cobrança

### Ajustes técnicos
- padronizar IDs e navegação entre módulos
- revisar consistência de permissões
- revisar trilha de auditoria do fluxo

## Histórias cobertas
- R3-07.1 abrir atendimento a partir de agendamento
- R3-07.2 solicitar exame no contexto do atendimento
- R3-07.3 fechar cobrança no mesmo atendimento
- R3-07.4 manter vínculo entre agenda, atendimento, exames e conta

## Dependências
- Sprints R3.2, R3.3, R3.4 e R3.6 concluídos

## Critérios de pronto
- fluxo ponta a ponta funciona sem retrabalho manual relevante
- entidades ficam devidamente vinculadas
- navegação entre telas principais está consistente

## Riscos
- descobrir inconsistências de domínio só na integração final
- acoplamento excessivo entre módulos

## Fora de escopo
- automações avançadas
- notificações transacionais complexas

---

# Sprint R3.8 — Endurecimento, UX e relatórios operacionais mínimos

## Objetivo
Dar acabamento suficiente para uso real e preparar a base do R4.

## Itens do sprint

### Qualidade
- corrigir gaps de UX no fluxo agenda → atendimento → exame → cobrança
- revisar erros, validações e mensagens
- reforçar testes de integração do R3

### Relatórios mínimos
- lista de agendamentos do período
- lista de atendimentos com pendência financeira
- lista simples de exames por período/paciente

## Dependências
- sprints anteriores concluídos

## Critérios de pronto
- fluxo principal tem usabilidade aceitável
- testes críticos de R3 passam
- relatórios operacionais mínimos existem

## Riscos
- virar sprint infinita de polimento
- tentar incluir dashboard completo aqui

## Fora de escopo
- BI executivo
- financeiro avançado
- estoque profundo

---

# Ordem recomendada de execução

## Ordem principal
1. Sprint R3.1 — Catálogo comercial mínimo
2. Sprint R3.2 — Billing clínico básico
3. Sprint R3.3 — Fechamento e contas a receber simples
4. Sprint R3.4 — Agenda clínica básica
5. Sprint R3.5 — Configuração operacional da agenda
6. Sprint R3.6 — Exames e resultados básicos
7. Sprint R3.7 — Fluxo integrado ponta a ponta
8. Sprint R3.8 — Endurecimento, UX e relatórios mínimos

## Ordem alternativa se a dor principal for recepção
Se a urgência do produto estiver mais na porta de entrada do atendimento do que na cobrança, usar esta ordem:

1. R3.4
2. R3.5
3. R3.1
4. R3.2
5. R3.3
6. R3.6
7. R3.7
8. R3.8

---

# Recomendações práticas

## Recomendação de foco
Se o objetivo é destravar valor de produto mais rápido, a melhor sequência é:

- **catálogo + billing + fechamento simples**
- depois **agenda**
- depois **exames**
- depois **integração ponta a ponta**

## Motivo
O sistema já é forte no núcleo assistencial e hospitalar. O maior gargalo agora é o ciclo operacional/comercial mínimo.

---

# Marco de conclusão do R3

O R3 pode ser considerado funcionalmente concluído quando o sistema permitir este fluxo real:

1. agendar paciente
2. abrir atendimento
3. registrar contexto clínico
4. solicitar exame
5. lançar serviço/produto
6. fechar atendimento
7. gerar pendência simples quando necessário

---

# Próximo passo recomendado

A partir deste plano, o próximo artefato mais útil é um destes:

1. abrir **issues GitHub** por sprint
2. quebrar cada sprint em **tarefas backend/frontend/schema**
3. mapear **o que já existe parcialmente** no código para reaproveitamento imediato
