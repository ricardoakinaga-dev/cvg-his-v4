# Modulo Atendimentos — Visao Geral

## 1. Objetivo

O modulo Atendimentos (encounters) representa a abertura e controle operacional do contato assistencial do paciente com o hospital veterinario.

## 2. Papel no contexto hospitalar

- nasce na recepcao, triagem ou fluxo clinico
- conecta paciente e tutor
- registra motivo principal e classificacao inicial
- sustenta continuidade futura para prontuario, exames, internacao e desfecho

## 3. Dependencias

- **Pacientes**: vinculo obrigatorio (patientId)
- **Tutores**: vinculo obrigatorio (ownerId), coerente com tutor do paciente
- **Fila/Queue**: integracao com check-in
- **Triagem**: integracao com classificacao
- **Prontuario, Exames, Internacao, Faturamento**: downstream

## 4. Fluxos principais

### 4.1 Abertura de atendimento

1. localizar tutor
2. localizar paciente
3. abrir atendimento com dados iniciais
4. vincular paciente e tutor coerentes
5. registrar motivo, prioridade e snapshot clinico

### 4.2 Transicao de status

- reception -> in_triage -> in_care -> observation -> closed

### 4.3 Finalizacao/Cancelamento

- controlado por status e timestamps
- sem exclusao destrutiva

## 5. Objetivos da evolucao

- schema completo com todos os campos do contrato
- persistencia como fonte principal
- autoria em create/update
- snapshot clinico inicial
- integracao robusta com pacientes e tutores
