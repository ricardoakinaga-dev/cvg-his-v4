# Módulo Alta — Frontend

## Visão Geral

O frontend do módulo Alta fornece interface para gestão de altas/desfechos clínicos, com listagem, criação e detalhe de registros.

## Página: /discharges

### Listagem

A listagem de altas exibe:

- **Paciente**: Nome do paciente
- **Tutor**: Nome do tutor/proprietário
- **Tipo**: Tipo de alta (ambulatorial, internação, transferência, óbito)
- **Outcome**: Desfecho clínico
- **Data**: Data da alta
- **Responsável**: Usuário que registrou

#### Filtros

- Busca por paciente
- Filtro por tipo de alta
- Filtro por outcome
- Filtro por data

#### Ações

- Novo registro de alta
- Visualizar detalhes
- Editar

### Formulário de Alta

O formulário é dividido em blocos:

#### Bloco 1 — Contexto

- **Atendimento**: Selecionar atendimento (obrigatório)
- **Paciente**: Preenchido automaticamente
- **Tutor**: Preenchido automaticamente
- **Internação**: Vincular a internação (opcional)

#### Bloco 2 — Resumo Clínico

- **Diagnóstico Final**: Campo de texto
- **Resumo Clínico**: Área de texto
- **Procedimentos Realizados**: Área de texto

#### Bloco 3 — Conduta de Saída

- **Medicações na Alta**: Campo de texto
- **Recomendações**: Área de texto

#### Bloco 4 — Continuidade

- **Follow-up Necessário**: Checkbox
- **Instruções de Retorno**: Área de texto
- **Sinais de Alerta**: Campo de texto

#### Bloco 5 — Controle

- **Tipo de Alta**: Select (obrigatório)
  - Ambulatório
  - Alta de Internação
  - Transferência
  - Óbito
- **Outcome**: Select (obrigatório)
  - Recuperado
  - Melhorado
  - Inalterado
  - Piorado
  - Óbito
- **Data/Hora da Alta**: Datetime (obrigatório)
- **Motivo**: Campo de texto
- **Observações**: Área de texto

### Detalhe da Alta

Exibe todos os campos do registro de alta de forma organizada, com opção de edição.

## UX/UI

- Feedback visual de sucesso/erro
- Loading states
- Validação inline
- Confirmação antes de salvar
- Navegação clara
