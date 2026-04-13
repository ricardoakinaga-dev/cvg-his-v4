# VETUS — Agenda
**Evidências principais:** `agenda-01-visao-geral.png`, `agenda-02-calendario.png`, `agenda-03-view-mes.png`, `agenda-04-view-semana.png`, `agenda-05-dialog-criar.png`

## 1. Papel do módulo

A agenda é um dos módulos beta mais maduros do acervo. Ela funciona como cockpit de operação ambulatorial e de especialidades, centralizando:

- visualização da carga horária;
- distribuição por profissional;
- filtros clínicos;
- criação de agendamento com vinculação imediata a cliente.

## 2. Estrutura da tela principal

### 2.1 Cabeçalho da página

Elementos observados:

- breadcrumb `Início > Agenda`;
- título `Agenda`;
- CTA laranja `+ Criar agendamento`;
- navegação temporal com setas;
- botão `Hoje`;
- alternância entre `Mês`, `Semana` e `Dia`.

### 2.2 Coluna lateral esquerda

O painel esquerdo concentra filtro e contexto:

- mini calendário mensal;
- status;
- profissional;
- serviço;
- ações para limpar filtros.

Esse painel deixa claro que a agenda foi desenhada para uso operacional contínuo, não apenas consulta eventual.

## 3. Grade de agenda

### 3.1 Visão diária

Na captura principal a grade mostra:

- eixo vertical por hora;
- colunas por profissional;
- coluna `Sem profissional`;
- profissionais especializados como cardiologia, dermato, endocrino, neuro e ultrassom.

Isso indica suporte nativo a agenda multiprofissional e multiagenda em paralelo.

### 3.2 Visão semanal

`agenda-04-view-semana.png` amplia o período mantendo o mesmo raciocínio de alocação. A inferência mais segura é:

- continuidade do modelo por recurso;
- comparação de disponibilidade em janela maior;
- uso para planejamento e não apenas encaixe imediato.

### 3.3 Visão mensal

`agenda-03-view-mes.png` cobre o uso mais analítico:

- leitura macro de carga;
- identificação de concentração de atendimentos;
- navegação para datas específicas.

## 4. Fluxo de criação de agendamento

### 4.1 Entrada no fluxo

O botão `+ Criar agendamento` abre modal, não navega para página dedicada.

### 4.2 Modal de seleção de cliente

Em `agenda-05-dialog-criar.png` aparecem:

- título `Selecione um cliente`;
- busca por nome, id, CPF, telefone ou e-mail;
- CTA `Filtrar`;
- abas `Clientes Cadastrados` e `Novo Cliente`;
- lista paginada;
- opção `Ver mais informações`;
- botões `Cancelar` e `Adicionar Cliente`.

### 4.3 Leitura de produto

O desenho do modal mostra uma decisão importante:

- o agendamento é **centrado no cliente**;
- o cadastro de cliente pode ocorrer **dentro do fluxo**;
- a criação não depende de sair para um módulo externo.

## 5. Padrões de usabilidade observados

### 5.1 Padrões positivos

- CTA principal muito evidente;
- filtragem lateral clara;
- recursos profissionais legíveis;
- múltiplas visões de calendário;
- onboarding operacional simples para abrir agendamento.

### 5.2 Padrões de atenção

- o widget de NPS cobre a base da tela;
- a agenda depende de largura considerável para leitura confortável;
- o grande número de profissionais pode pressionar responsividade horizontal.

## 6. Entidades implícitas do módulo

Pelas capturas, a agenda se apoia em:

- cliente;
- profissional;
- serviço;
- data/hora;
- status do agendamento.

Isso a posiciona como módulo de orquestração, não apenas de calendário visual.

## 7. Relação com outros módulos

A agenda se conecta diretamente com:

- clientes;
- comandas;
- atendimento;
- profissionais do RH.

Para uma reimplementação, ela deveria ser tratada como elo entre operação clínica e cadastro mestre.

## 8. Conclusão

Entre as telas SPA do acervo, a Agenda está entre as mais fortes em clareza funcional. O módulo já apresenta:

- estrutura estável;
- fluxo claro de criação;
- boa densidade operacional;
- e evidência visual suficiente para servir como referência de UX e modelagem.
