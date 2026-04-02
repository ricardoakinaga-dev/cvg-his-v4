# PROMPT MASTER — CVG-HIS-V2 — IMPLEMENTAÇÃO ENTERPRISE COMPLETA — MÓDULO ALTA / DESFECHO CLÍNICO

## Objetivo

Implementar o módulo Alta / Desfecho Clínico do CVG-HIS-V2 de forma completa, consistente e em nível enterprise, usando a documentação em `/docs` como contrato único de verdade, garantindo integração total com os módulos Atendimentos, Pacientes, Tutores, Prontuário Clínico, Prescrições, Exames, Internação e Execução de Prescrição, e entregando o módulo em estado `PRONTO PARA AUDITORIA`.

Regra central:

A documentação em `/docs` é a fonte oficial de verdade.
O código deve obedecer aos documentos.
Se houver divergência entre código atual e contrato documental, ajustar o código para aderir ao contrato, com a menor ruptura possível da arquitetura existente.

Escopo desta execução:

- banco/schema
- backend/API
- frontend
- integração com todos os módulos clínicos existentes
- registro formal de alta / desfecho do caso
- resumo clínico final
- orientações de saída
- rastreabilidade do encerramento
- validações
- testes mínimos do módulo
- preparação para auditoria

Fora do escopo desta execução:

- faturamento
- documentos PDF completos de alta
- assinatura digital avançada
- integração com sistemas externos
- auditoria final formal

## CONTEXTO DO DOMÍNIO

O módulo Alta / Desfecho Clínico representa o encerramento formal do caso clínico.

Um desfecho:

- está vinculado a um atendimento
- representa a conclusão de um episódio clínico
- resume o raciocínio, conduta e resultado
- orienta continuidade fora do hospital
- deve ser rastreável e não destrutivo

Esse módulo fecha o ciclo:

Atendimento → Prontuário → Prescrição → Exames → Internação → Execução → Alta

## CONTRATO BASE DO MÓDULO ALTA

Entidade principal:

- `discharges`

Campos obrigatórios mínimos:

- id
- encounterId
- patientId
- ownerId
- dischargeType
- outcome
- dischargedAt
- createdAt
- updatedAt
- createdByUserId
- updatedByUserId

Campos clínicos principais:

- finalDiagnosis
- clinicalSummary
- proceduresPerformed
- medicationsAtDischarge
- recommendations

Campos de continuidade:

- followUpRequired (boolean)
- followUpInstructions
- returnWarningSigns

Campos operacionais:

- hospitalizationId (opcional)
- dischargeReason
- dischargeNotes

## REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. Alta não existe sem atendimento válido.
2. Alta não existe sem paciente e tutor coerentes.
3. Cada atendimento pode ter apenas um desfecho final.
4. `dischargeType` é obrigatório.
5. `outcome` é obrigatório.
6. `dischargedAt` é obrigatório.
7. Deve existir resumo clínico final mínimo.
8. Não permitir alta duplicada para o mesmo atendimento.
9. Backend deve usar banco como fonte real.
10. Não usar memória como fonte principal.
11. Não permitir exclusão destrutiva.
12. Alta deve encerrar logicamente o atendimento.
13. Deve ser possível registrar alta após internação.
14. Deve ser possível registrar alta ambulatorial.

## ENUMS RECOMENDADOS

`dischargeType`:

- outpatient
- inpatient_discharge
- transfer
- death

`outcome`:

- recovered
- improved
- unchanged
- worsened
- deceased

## ARQUIVOS REAIS CANDIDATOS

- `apps/web/src/pages/discharges.ts`
- `apps/api/src/server.ts`
- `packages/shared/database/src/schemas/index.ts`
- `packages/shared/contracts/src/index.ts`
- `packages/shared/types/src/index.ts`
- módulo `discharges` (criar se não existir)

## FASE 0 — DOCUMENTAÇÃO

Criar/validar docs em `/docs`:

- visão geral
- contrato
- backend
- frontend
- integração
- fluxo
- plano
- testes
- gate de auditoria

Não implementar código antes disso.

## FASE 1 — INTERPRETAÇÃO

Extrair:

- contrato
- regras
- fluxos
- integrações

## FASE 2 — MAPEAMENTO

Identificar:

- o que existe
- o que falta
- riscos de inconsistência

## FASE 3 — IMPLEMENTAÇÃO

### FASE 3.1 — BANCO

- criar tabela `discharges`
- adicionar campos obrigatórios
- garantir vínculo com `encounterId`, `patientId`, `ownerId`
- criar migration

Critério:
persistência completa

### FASE 3.2 — BACKEND

Rotas obrigatórias:

- `POST /discharges`
- `GET /discharges`
- `GET /discharges/:id`
- `PATCH /discharges/:id`

Regras:

- validar encounter
- validar paciente/tutor
- impedir duplicidade por atendimento
- preencher autoria
- usar banco como fonte real

### FASE 3.3 — FRONTEND

Arquivo:

- `discharges.ts`

Listagem:

- paciente
- tutor
- tipo
- outcome
- data
- responsável

Formulário:

Bloco 1 — Contexto

- atendimento
- paciente
- tutor

Bloco 2 — Resumo clínico

- diagnóstico final
- resumo
- procedimentos

Bloco 3 — Conduta de saída

- medicações
- recomendações

Bloco 4 — Continuidade

- follow-up
- sinais de alerta

Bloco 5 — Controle

- tipo de alta
- outcome

Regras:

- sem ID manual
- validação
- UX clara

### FASE 3.4 — INTEGRAÇÃO

Fluxo:

1. atendimento concluído
2. abrir alta
3. preencher dados
4. salvar
5. atendimento encerrado

### FASE 3.5 — VALIDAÇÕES

Backend:

- encounter válido
- paciente válido
- outcome obrigatório

Frontend:

- validação por campo

### FASE 3.6 — TESTES

Cobrir:

- create alta
- impedir duplicidade
- list
- detail
- coerência com atendimento

## FASE 4 — VALIDAÇÃO

- build
- typecheck
- funcionamento

## FASE 5 — CONSISTÊNCIA

- frontend vs backend
- contrato vs banco
- integração com módulos

## FASE 6 — PRONTO PARA AUDITORIA

Confirmar:

- create funciona
- list funciona
- detail funciona
- duplicidade bloqueada
- vínculo correto com atendimento
- persistência real
- frontend sincronizado

## ENTREGA FINAL

1. arquivos alterados
2. arquivos criados
3. resumo por fase
4. pendências
5. riscos
6. confirmação:

`Módulo Alta pronto para auditoria`

## CRITÉRIO DE SUCESSO

- alta registrada corretamente
- vínculo com atendimento correto
- não há duplicidade
- fluxo clínico fechado
- pronto para auditoria

## FIM DO PROMPT
