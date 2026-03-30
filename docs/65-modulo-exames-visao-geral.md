# Modulo Exames — Visao Geral

## Objetivo

Fluxo diagnostico formal: pedido → execução → resultado.

## Entidades

- **ExamOrder**: cabecalho do pedido de exame
- **ExamOrderItem**: item individual do pedido
- **ExamResult**: resultado vinculado ao pedido/item

## Fluxos

1. equipe solicita exame (pedido com itens)
2. exame coletado/realizado (status collected)
3. resultado registrado
4. resultado volta para leitura clinica

## Dependencias

- Atendimentos (obrigatório)
- Pacientes/Tutores (coerentes com atendimento)
- Prontuário (opcional)
