# PROMPT MASTER — CVG-HIS-V2 — IMPLEMENTAÇÃO ENTERPRISE COMPLETA — MÓDULO INTERNAÇÃO / HOSPITALIZAÇÃO

## Objetivo

Implementar o módulo Internação / Hospitalização do CVG-HIS-V2 de forma completa, consistente e em nível enterprise, usando a documentação em `/docs` como contrato único de verdade, garantindo integração total com os módulos Atendimentos, Pacientes, Tutores, Prontuário Clínico, Prescrições e Exames, e entregando o módulo em estado `PRONTO PARA AUDITORIA`.

Regra central:

A documentação em `/docs` é a fonte oficial de verdade.
O código deve obedecer aos documentos.
Se houver divergência entre código atual e contrato documental, ajustar o código para aderir ao contrato, com a menor ruptura possível da arquitetura existente.

Escopo desta execução:

- banco/schema
- backend/API
- frontend
- integração com módulos clínicos existentes
- abertura, gestão e encerramento de internações
- controle de setor/leito lógico (sem sistema de leitos avançado ainda)
- status da internação
- rastreabilidade mínima
- validações
- testes mínimos do módulo
- preparação para auditoria

Fora do escopo desta execução:

- gestão completa de leitos com mapa visual
- enfermagem detalhada por turno
- prescrição executada (checagem de medicação)
- faturamento de internação
- controle de estoque hospitalar
- auditoria final formal

## CONTEXTO DO DOMÍNIO

O módulo Internação representa a permanência do paciente sob cuidado contínuo dentro do hospital.

Uma internação:

- nasce a partir de um atendimento
- está sempre vinculada a um paciente e tutor
- pode coexistir com prontuário, prescrições e exames ativos
- possui estado contínuo ao longo do tempo
- precisa registrar entrada, evolução e saída
- não deve ser tratada como um CRUD simples

Este módulo deve refletir uso real hospitalar:

- paciente chega
- é avaliado
- é decidido internar
- permanece sob cuidado
- recebe alta ou outro desfecho

## CONTRATO BASE DO MÓDULO INTERNAÇÃO

Entidade principal:

- `hospitalizations`

Campos obrigatórios mínimos:

- id
- encounterId
- patientId
- ownerId
- status
- admissionReason
- admittedAt
- createdByUserId
- createdAt
- updatedAt

Campos clínicos principais:

- initialAssessment
- clinicalSummary
- notes

Campos operacionais:

- sector
- bedLabel (string simples, sem sistema complexo de leitos)
- responsibleVeterinarianId
- responsibleTeam

Campos de controle:

- updatedByUserId
- dischargedAt
- dischargeReason
- dischargeSummary
- outcome

## REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. Internação não existe sem atendimento válido.
2. Internação não existe sem paciente e tutor coerentes com o atendimento.
3. Não permitir múltiplas internações ativas simultâneas para o mesmo paciente.
4. `status` é obrigatório.
5. `admissionReason` é obrigatório.
6. `admittedAt` é obrigatório.
7. Fluxo principal não deve depender de ID manual.
8. Deve ser possível abrir internação a partir do contexto do atendimento.
9. Deve ser possível encerrar internação com registro de saída.
10. Backend deve usar banco como fonte real.
11. Não usar memória como fonte principal.
12. Não permitir exclusão destrutiva de internação.
13. Histórico deve ser preservado.
14. Internação ativa deve ser única por paciente.
15. Integração com prontuário e prescrições deve ser possível (não obrigatoriamente expandida nesta fase).

## ENUMS RECOMENDADOS

Status da internação:

- active
- pending
- discharged
- transferred
- deceased

Outcome:

- recovered
- improved
- unchanged
- worsened
- deceased
- unknown

## ARQUIVOS REAIS CANDIDATOS

- `apps/web/src/pages/hospitalizations.ts`
- `apps/api/src/server.ts`
- `packages/shared/database/src/schemas/index.ts`
- `packages/shared/contracts/src/index.ts`
- `packages/shared/types/src/index.ts`
- módulo `hospitalizations` (se não existir, criar)

## FASE 0 — DOCUMENTAÇÃO EM /docs

Criar ou validar docs do módulo:

- visão geral
- contrato de dados
- backend
- frontend
- integração
- fluxo operacional
- plano de implementação
- critérios de aceite
- plano de testes
- gate de auditoria

Não implementar código antes disso.

## FASE 1 — INTERPRETAÇÃO

Extrair dos docs:

- contrato
- regras
- fluxos
- integrações

## FASE 2 — MAPEAMENTO DO CÓDIGO

Identificar:

- o que existe
- o que falta
- o que precisa refatorar
- riscos de inconsistência

## FASE 3 — IMPLEMENTAÇÃO

### FASE 3.1 — BANCO

- criar tabela `hospitalizations`
- adicionar campos obrigatórios
- garantir vínculo com `encounterId`, `patientId`, `ownerId`
- criar migration

Critério:
persistência completa

### FASE 3.2 — BACKEND

Rotas obrigatórias:

- `POST /hospitalizations`
- `GET /hospitalizations`
- `GET /hospitalizations/:id`
- `PATCH /hospitalizations/:id`

Regras:

- validar `encounterId`
- validar coerência `patient/owner`
- impedir múltiplas internações ativas
- preencher autoria
- persistência como fonte real

### FASE 3.3 — FRONTEND

Arquivo:

- `hospitalizations.ts`

Listagem:

- paciente
- tutor
- status
- setor
- data de entrada
- responsável

Formulário:

Bloco 1 — Contexto

- atendimento
- paciente
- tutor

Bloco 2 — Dados clínicos

- motivo da internação
- avaliação inicial

Bloco 3 — Operacional

- setor
- leito (texto simples)
- responsável

Bloco 4 — Controle

- status

Regras:

- sem ID manual
- validação
- estados UX

### FASE 3.4 — INTEGRAÇÃO

Fluxo obrigatório:

1. abrir atendimento
2. decidir internar
3. criar internação
4. salvar
5. visualizar internação ativa

### FASE 3.5 — ENCERRAMENTO

Implementar:

- alta (`discharged`)
- transferência
- óbito

Campos:

- `dischargedAt`
- `dischargeReason`
- `outcome`
- `dischargeSummary`

### FASE 3.6 — VALIDAÇÕES

Backend:

- paciente válido
- tutor válido
- não permitir duplicidade ativa

Frontend:

- validação básica

### FASE 3.7 — TESTES

Cobrir:

- create internação
- impedir duplicidade ativa
- list
- detail
- discharge

## FASE 4 — VALIDAÇÃO CONTÍNUA

- build
- typecheck
- funcionamento

## FASE 5 — CONSISTÊNCIA

- frontend vs backend
- contrato vs banco
- integrações

## FASE 6 — PRONTO PARA AUDITORIA

Confirmar:

- create funciona
- list funciona
- detail funciona
- discharge funciona
- vínculo correto com atendimento
- paciente/tutor coerentes
- sem uso de memória como fonte principal
- frontend sincronizado

## ENTREGA FINAL

1. arquivos alterados
2. arquivos criados
3. resumo por fase
4. pendências
5. riscos
6. confirmação:

`Módulo Internação pronto para auditoria`

## CRITÉRIO DE SUCESSO

- internação criada corretamente
- paciente vinculado corretamente
- não há duplicidade ativa
- fluxo hospitalar coerente
- persistência real
- pronto para auditoria

## FIM DO PROMPT
