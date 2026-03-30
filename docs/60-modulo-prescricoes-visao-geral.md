# Modulo Prescricoes / Plano Terapeutico — Visao Geral

## 1. Objetivo

O modulo Prescricoes representa o registro formal da conduta terapeutica definida para um caso clinico veterinario.

## 2. Entidades

- **Prescription**: cabecalho da prescrição/plano terapeutico
- **PrescriptionItem**: item individual prescrito (medicamento, procedimento, orientacao)

## 3. Dependencias

- **Atendimentos (encounters)**: obrigatorio (encounterId)
- **Pacientes (patients)**: coerente com atendimento
- **Tutores (owners)**: coerente com atendimento
- **Prontuario (clinical_entries)**: vinculo opcional

## 4. Fluxos

1. atendimento aberto com evolucao clinica
2. equipe define conduta terapeutica
3. registra prescrição com itens
4. historico preservado por revisao/supersedencia

## 5. Regras de negocio

- prescrição nao existe sem atendimento valido
- itens obrigatorios (pelo menos um)
- exclusao destrutiva nao permitida
- edicao preserva historico
