# Modulo Pacientes — Frontend

## 1. Listagem

Colunas:

- nome do paciente
- tutor principal
- especie
- status
- alertas (indicador)
- acoes

Recursos:

- busca por nome, raca, microchip
- filtros por especie, status
- paginacao

## 2. Formulario em blocos

### Bloco 1 — Identificacao

- nome (obrigatorio)
- especie (obrigatorio)
- raca
- sexo (obrigatorio)
- status

### Bloco 2 — Tutor

- selecao obrigatoria de tutor salvo
- busca por tutor
- pre-preenchimento quando vier do fluxo do tutor

### Bloco 3 — Dados clinicos

- castrado (sim/nao)
- data de nascimento
- idade estimada
- peso
- pelagem
- microchip

### Bloco 4 — Alertas clinicos

- alertas estruturados
- destaque visual claro

### Bloco 5 — Observacoes

- notes
- behavioralNotes

## 3. Detalhe

- dados completos do paciente
- dados do tutor vinculado
- alertas com destaque
- botao de edicao

## 4. Estados de UX

- loading
- empty
- error
- success

## 5. Regras

- nao aceitar ID manual de tutor como caminho principal
- validacao por campo
- mensagens claras
- payload sincronizado com backend
