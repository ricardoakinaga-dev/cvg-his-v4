# Modulo Execucao de Prescricao / Enfermagem — Visao Geral

## Objetivo

Operacao real da conduta terapeutica: registrar quem executou, quando, como e com qual resultado.

## Entidades

- **PrescriptionExecution**: execucao de um item prescrito
- **PrescriptionExecutionEvent**: evento/log operacional

## Fluxos

1. prescrição ativa com itens
2. equipe registra execução (ou não execução)
3. sistema salva com autoria, tempo e status
4. histórico operacional preservado

## Dependencias

- Prescrições (obrigatório)
- Atendimentos (coerente com prescrição)
- Internação (opcional)
- Pacientes/Tutores (coerentes)
