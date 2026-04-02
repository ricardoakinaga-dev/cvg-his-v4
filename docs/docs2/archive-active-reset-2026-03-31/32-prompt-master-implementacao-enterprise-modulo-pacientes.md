# PROMPT MASTER — CVG-HIS-V2 — IMPLEMENTAÇÃO ENTERPRISE — MÓDULO PACIENTES

## Objetivo

Implementar o módulo Pacientes do CVG-HIS-V2 de forma completa, consistente e em nível enterprise, utilizando a documentação em `/docs` como contrato único de verdade, garantindo integração total com o módulo Tutores e prontidão para auditoria.

## CONTEXTO DO DOMÍNIO

O módulo Pacientes representa o núcleo clínico do hospital veterinário.

Um paciente:

- sempre pertence a um tutor (ou múltiplos responsáveis)
- possui dados clínicos relevantes
- será utilizado por:
  - recepção
  - equipe médica
  - prontuário
  - exames
  - internação
  - agenda

Este módulo deve ser construído com base em uso real hospitalar, não como CRUD genérico.

## CONTRATO DE DADOS — PACIENTE

Campos obrigatórios:

- id
- name (nome do animal)
- species (cão, gato, etc.)
- tutorId (obrigatório)
- status (ativo, inativo, óbito)

Campos clínicos essenciais:

- breed (raça)
- sex (M/F)
- neutered (castrado: sim/não)
- birthDate (data de nascimento, opcional)
- estimatedAge (idade estimada, opcional)
- weight (peso base)
- coat (pelagem)
- microchip (opcional)

Campos médicos iniciais:

- alerts (alergias, condições críticas)
- notes (observações gerais)
- behavioralNotes (comportamento)

Campos administrativos:

- createdAt
- updatedAt
- createdByUserId
- updatedByUserId

## REGRAS DE NEGÓCIO

1. Paciente NÃO existe sem tutor
2. Tutor deve ser selecionado via sistema (não digitado manualmente)
3. Nome do paciente é obrigatório
4. Espécie é obrigatória
5. Status deve existir
6. Deve ser possível cadastrar com idade estimada quando não houver data exata
7. Deve permitir múltiplos responsáveis no futuro (estrutura preparada)
8. Alertas clínicos devem ser visíveis e persistidos
9. Não permitir exclusão destrutiva (apenas inativação)

## FASES DE EXECUÇÃO

## FASE 1 — INTERPRETAÇÃO DO PLANO

Ler documentos do módulo Pacientes em `/docs` (se existirem)
+ usar este prompt como contrato base

Extrair:

- estrutura de dados
- regras clínicas
- integração com Tutores
- fluxo operacional

## FASE 2 — MAPEAMENTO DO CÓDIGO REAL

Mapear:

- `patients.ts`
- `server.ts`
- schema atual (`index.ts`)
- integração com `owners` (Tutores)

Identificar:

- o que já existe
- o que está incompleto
- o que está incorreto
- gaps com o contrato acima

## FASE 3 — IMPLEMENTAÇÃO

### FASE 3.1 — BANCO

Ações:

- expandir schema de patients
- adicionar campos clínicos
- adicionar campos administrativos
- garantir relacionamento com tutor

Regra crítica:

`banco deve suportar 100% do contrato`

### FASE 3.2 — BACKEND

Arquivos principais:

- `server.ts`
- módulo `patients`

Implementar:

- `POST /patients`
- `GET /patients`
- `GET /patients/:id`
- `PATCH /patients/:id`

Regras:

- usar banco como fonte de verdade
- validar `tutorId` existente
- preencher `createdByUserId` / `updatedByUserId`
- validar dados clínicos mínimos
- implementar busca por:
  - nome
  - tutor
  - espécie

### FASE 3.3 — FRONTEND

Arquivo principal:

- `patients.ts`

Implementar:

#### Listagem

- nome do paciente
- tutor
- espécie
- status
- busca e filtros

#### Formulário

Dividir em blocos:

1. Identificação
2. Tutor (seleção obrigatória)
3. Dados clínicos
4. Alertas médicos
5. Observações

Regras:

- tutor deve ser selecionado via busca
- não permitir digitação manual de ID
- validar campos obrigatórios
- estados de loading/erro/sucesso

### FASE 3.4 — INTEGRAÇÃO COM TUTORES

Implementar:

- seleção de tutor existente
- pré-preenchimento quando vindo do fluxo:
  - `Adicionar paciente` a partir do tutor

Fluxo obrigatório:

1. criar tutor
2. abrir tutor
3. clicar `Adicionar paciente`
4. abrir formulário com tutor já selecionado

Proibido:

- depender de campo manual de tutor

### FASE 3.5 — ALERTAS CLÍNICOS

Implementar:

- campo estruturado de alertas
- exibição destacada no frontend
- persistência no backend

Exemplos:

- alergias
- agressividade
- risco anestésico

### FASE 3.6 — VALIDAÇÕES

Backend:

- validar `tutorId`
- validar espécie
- validar nome
- validar status

Frontend:

- validação por campo
- UX clara de erro

### FASE 3.7 — TESTES

Criar testes mínimos:

- create paciente
- update paciente
- list paciente
- vínculo com tutor
- validação de tutor inexistente

## FASE 4 — VALIDAÇÃO CONTÍNUA

Após cada etapa:

- build
- typecheck
- funcionamento básico

Corrigir antes de avançar

## FASE 5 — CORREÇÕES AUTOMÁTICAS

Verificar:

- frontend vs backend
- contrato vs persistência
- fluxo tutor → paciente

Corrigir automaticamente inconsistências

## FASE 6 — PREPARAÇÃO PARA AUDITORIA

Validar:

- fluxo completo funciona
- dados persistem
- tutor sempre presente
- backend usa banco como fonte real
- frontend está sincronizado
- alertas funcionam
- integração funciona

## REGRAS GLOBAIS

- não usar memória como fonte principal
- não permitir fluxo manual frágil
- não quebrar módulo Tutores
- não duplicar lógica
- não criar abstração desnecessária

## ENTREGA FINAL

1. arquivos alterados
2. arquivos criados
3. resumo por fase
4. pendências
5. confirmação:

`Módulo Pacientes pronto para auditoria`

## CRITÉRIO DE SUCESSO

- paciente criado corretamente
- vínculo com tutor obrigatório e funcional
- fluxo clínico coerente
- frontend e backend sincronizados
- pronto para auditoria enterprise

## FIM DO PROMPT
