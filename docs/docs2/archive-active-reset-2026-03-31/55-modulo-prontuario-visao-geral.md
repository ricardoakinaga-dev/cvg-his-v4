# Modulo Prontuario Clinico — Visao Geral

## 1. Objetivo

O modulo Prontuario Clinico (medical-records/clinical-entries) representa o registro assistencial progressivo do caso veterinario ao longo do atendimento.

## 2. Entidades

- **MedicalRecord**: registro aberto por atendimento, vincula encounter/patient
- **ClinicalEntry**: evolucao clinica individual dentro do prontuario
- **EntryRevision**: historico de revisoes de uma entrada
- **ClinicalTimeline**: linha do tempo de eventos clinicos

## 3. Fluxos principais

### 3.1 Criacao de evolucao

1. atendimento aberto
2. equipe clinica abre prontuario (auto-criado ou explicito)
3. registra anamnese/avaliacao/evolucao
4. SOAP estruturado (subjective, objective, assessment, plan)
5. salva com autoria e timestamp

### 3.2 Edicao com historico

1. editar entrada existente
2. criar nova revisao (entry_revisions)
3. preservar conteudo anterior
4. atualizar version e status

### 3.3 Arquivamento

1. soft-delete com motivo
2. status: active -> amended ou superseded
3. dados preservados

## 4. Regras de negocio

- registro nao existe sem atendimento valido
- registro deve ser coerente com paciente e tutor do atendimento
- historico nao deve ser perdido
- edicao deve preservar rastreabilidade
- exclusao destrutiva nao permitida
