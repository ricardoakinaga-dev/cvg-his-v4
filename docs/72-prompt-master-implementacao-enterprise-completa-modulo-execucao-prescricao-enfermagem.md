# PROMPT MASTER — CVG-HIS-V2 — IMPLEMENTAÇÃO ENTERPRISE COMPLETA — MÓDULO EXECUÇÃO DE PRESCRIÇÃO / ENFERMAGEM

## Objetivo

Implementar o módulo Execução de Prescrição / Enfermagem do CVG-HIS-V2 de forma completa, consistente e em nível enterprise, usando a documentação em `/docs` como contrato único de verdade, garantindo integração total com os módulos Prescrições / Plano Terapêutico, Internação / Hospitalização, Prontuário Clínico, Atendimentos, Pacientes e Tutores, e entregando o módulo em estado `PRONTO PARA AUDITORIA`.

Regra central:

A documentação em `/docs` é a fonte oficial de verdade.
O código deve obedecer aos documentos.
Se houver divergência entre código atual e contrato documental, ajustar o código para aderir ao contrato, com a menor ruptura possível da arquitetura existente.

Escopo desta execução:

- banco/schema
- backend/API
- frontend
- integração com Prescrições, Internação, Prontuário, Atendimentos, Pacientes e Tutores
- criação e gestão de execuções de prescrição
- checagem operacional de itens prescritos
- registro de administração, não administração, atraso, suspensão e observações
- rastreabilidade mínima de enfermagem
- validações
- testes mínimos do módulo
- preparação para auditoria

Fora do escopo desta execução:

- prontuário de enfermagem completo por turno
- aprazamento avançado e agenda de doses complexa
- bomba de infusão / integração com dispositivos
- dispensação/farmácia
- controle de estoque
- assinatura digital avançada
- auditoria final formal
- exclusão destrutiva de execuções

## CONTEXTO DO DOMÍNIO

O módulo Execução de Prescrição / Enfermagem representa a operação real da conduta terapêutica dentro do hospital.

Uma execução:

- nasce a partir de uma prescrição válida e de seus itens
- se vincula ao atendimento e, quando aplicável, à internação ativa
- registra o que foi administrado, realizado, adiado, recusado, suspenso ou não executado
- precisa registrar autoria, tempo, status e observações operacionais
- não deve ser tratado como CRUD genérico

Este módulo deve refletir uso real hospitalar veterinário:

- existe uma prescrição ativa
- a equipe executa o item
- o sistema registra quando, como, por quem e com qual resultado operacional
- a equipe clínica consegue rastrear o histórico de execução do plano terapêutico

## CONTRATO BASE DO MÓDULO EXECUÇÃO DE PRESCRIÇÃO / ENFERMAGEM

Entidades centrais recomendadas:

- `prescription_executions`
- `prescription_execution_events`
ou equivalente real do projeto, desde que mantenha o contrato documental

Campos obrigatórios mínimos da execução:

- id
- prescriptionId
- prescriptionItemId
- encounterId
- patientId
- ownerId
- hospitalizationId
- executionStatus
- scheduledFor
- createdAt
- updatedAt
- createdByUserId
- updatedByUserId

Campos operacionais principais:

- administeredAt
- notAdministeredAt
- suspendedAt
- cancelledAt
- routeUsed
- dosageGiven
- dosageUnit
- executionNotes
- nonExecutionReason
- delayReason
- administrationOutcome
- performerUserId

Campos de controle:

- versionNumber
- supersedesExecutionId
- requiresDoubleCheck
- doubleCheckedByUserId
- doubleCheckedAt

Campos opcionais relevantes:

- vitalSignsSnapshot
- infusionRate
- siteUsed
- adverseReactionFlag
- adverseReactionNotes

Entidade de evento/log recomendada:

- id
- prescriptionExecutionId
- eventType
- eventAt
- eventByUserId
- notes
- payloadSnapshot

## REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. Execução não existe sem prescrição válida.
2. Execução não existe sem item de prescrição válido.
3. Execução não existe sem vínculo coerente com atendimento, paciente e tutor.
4. Se houver internação ativa, a execução deve conseguir se vincular a ela.
5. O fluxo principal não deve depender de digitação manual de IDs.
6. `executionStatus` é obrigatório.
7. `scheduledFor` é obrigatório.
8. Deve ser possível registrar execução realizada.
9. Deve ser possível registrar não execução com motivo.
10. Deve ser possível registrar suspensão/cancelamento operacional quando aplicável.
11. Deve existir rastreabilidade mínima de quem executou e quando executou.
12. O histórico de execução não deve ser perdido por edição destrutiva simples.
13. Backend deve usar persistência/banco como fonte real de verdade.
14. Não usar memória volátil como fonte principal.
15. O módulo deve preparar terreno para aprazamento, enfermagem por turno e checagem avançada, sem implementar tudo agora.
16. Exclusão destrutiva de execução não deve ser implementada.
17. A execução deve respeitar coerência com o item prescrito e seu contexto clínico.
18. Itens cancelados/superseded/inativos da prescrição não devem continuar gerando execução ativa sem tratamento adequado.

## ENUMS E ESTRUTURAS RECOMENDADAS

Status permitidos da execução (`executionStatus`):

- pending
- administered
- not_administered
- delayed
- suspended
- cancelled

Tipos de evento (`eventType`) permitidos:

- created
- scheduled
- administered
- not_administered
- delayed
- suspended
- resumed
- cancelled
- amended
- double_checked

Outcome de administração (`administrationOutcome`) permitidos:

- successful
- partial
- failed
- adverse_reaction
- unknown

Motivos de não execução podem ser:

- patient_refusal
- unavailable_item
- clinical_contraindication
- patient_instability
- order_suspended
- scheduling_issue
- other

Estruturas auxiliares aceitáveis:

- `vitalSignsSnapshot`: objeto simples serializável
- `payloadSnapshot`: objeto simples serializável
- `flags`: lista simples de marcadores operacionais

Estratégia de histórico recomendada:

- manter eventos separados por execução
ou
- usar `supersedesExecutionId` + `versionNumber`
desde que preserve histórico e rastreabilidade

## ARQUIVOS REAIS CANDIDATOS A ALTERAÇÃO

Mapear e usar os arquivos reais existentes, priorizando:

- `apps/web/src/pages/nursing-executions.ts`
- `apps/api/src/server.ts`
- `packages/shared/database/src/schemas/index.ts`
- `packages/shared/contracts/src/index.ts`
- `packages/shared/types/src/index.ts`
- módulo real de `executions/nursing/prescription-executions`, se existir
- integrações com `prescriptions`
- integrações com `inpatient/hospitalizations`
- integrações com `medical-records`
- integrações com `encounters`
- integrações com `patients`
- integrações com `owners/tutores`
- testes existentes do `app/api`

Se houver migrations no projeto, criar migration incremental consistente com o padrão atual.

## FASE 0 — DOCUMENTAÇÃO DO MÓDULO EM /docs

Antes de implementar código:

1. Verificar se já existem documentos do módulo Execução de Prescrição / Enfermagem em `/docs`.
2. Se não existirem, criar a documentação mínima necessária do módulo em `/docs`, em formato `.md`, cobrindo:
   - visão geral
   - contrato de dados
   - backend
   - frontend
   - integração com Prescrições, Internação, Prontuário, Atendimentos, Pacientes e Tutores
   - regras de negócio
   - fluxo operacional de execução
   - estratégia de histórico/eventos
   - plano de implementação
   - critérios de aceite
   - plano de testes
   - gate de auditoria
3. Se já existirem, ler integralmente e seguir os documentos.
4. Não alterar outros arquivos fora de `/docs` nesta fase 0.

Importante:
A implementação do código só pode começar depois da leitura/consolidação documental.

## FASE 1 — INTERPRETAÇÃO DO PLANO

Ler toda a documentação do módulo Execução de Prescrição / Enfermagem em `/docs` e extrair:

- contrato de dados
- regras de negócio
- campos obrigatórios
- campos opcionais
- estratégia de histórico/eventos
- fluxos principais
- dependências com Prescrições, Internação, Prontuário, Atendimentos, Pacientes e Tutores
- critérios de aceite
- critérios de teste
- critérios de pronto para auditoria

Proibido iniciar implementação sem concluir esta fase.

## FASE 2 — MAPEAMENTO DO CÓDIGO REAL

Mapear o estado atual do projeto e comparar docs vs código real.

Identificar:

- o que já existe
- o que está parcial
- o que está incorreto
- o que precisa ser criado
- o que precisa ser refatorado minimamente
- onde há risco de desalinhamento entre frontend/backend/banco
- onde há risco de sobrescrever histórico operacional de forma inadequada
- onde há risco de fluxo manual frágil entre prescrição, internação e execução

Saída esperada:
um entendimento interno claro do gap entre contrato e código.

## FASE 3 — IMPLEMENTAÇÃO CONTROLADA

### FASE 3.1 — BANCO / SCHEMA

Objetivo:
Fazer o banco suportar 100% do contrato do módulo Execução de Prescrição / Enfermagem.

Ações obrigatórias:

- criar ou expandir schema de `prescription_executions`
- criar ou expandir schema de `prescription_execution_events`
- adicionar campos obrigatórios
- adicionar campos operacionais estruturados
- adicionar campos de histórico/rastreabilidade
- adicionar auditoria mínima
- garantir vínculo consistente com `prescriptionId`, `prescriptionItemId`, `encounterId`, `patientId`, `ownerId` e `hospitalizationId` quando aplicável
- preparar persistência para snapshots e metadados simples
- criar migration incremental, se houver mecanismo de migrations

Critério de conclusão:

- persistência suporta create, update controlado, detail, list e histórico de eventos
- contrato do módulo está refletido no schema
- não há campo operacional central só no frontend sem persistência real

### FASE 3.2 — BACKEND / API

Objetivo:
Implementar a API do módulo aderente ao contrato e usando banco como fonte real.

Rotas mínimas obrigatórias:

- `POST /prescription-executions`
- `GET /prescription-executions`
- `GET /prescription-executions/:id`
- `PATCH /prescription-executions/:id`

Rotas opcionais aceitáveis se a arquitetura pedir:

- `GET /prescriptions/:id/executions`
- `GET /hospitalizations/:id/executions`
- `POST /prescription-executions/:id/administer`
- `POST /prescription-executions/:id/not-administer`
- `POST /prescription-executions/:id/suspend`
- `POST /prescription-executions/:id/cancel`
- `POST /prescription-executions/:id/double-check`

Ações obrigatórias:

- validar `prescriptionId` existente
- validar `prescriptionItemId` existente e coerente com a prescrição
- validar `encounterId`, `patientId` e `ownerId` coerentes com a prescrição/atendimento
- validar `hospitalizationId` quando fornecido
- validar `executionStatus`
- validar `scheduledFor`
- validar `performerUserId` quando aplicável
- validar campos mínimos para `administered`, `not_administered`, `delayed`, `suspended` e `cancelled`
- preencher `createdByUserId` e `updatedByUserId`
- registrar eventos operacionais mínimos
- retornar payloads coerentes para list/detail
- permitir recuperar histórico por prescrição e, quando aplicável, por internação
- usar persistência como fonte operacional de verdade
- não depender de memória como base principal

Critério de conclusão:

- API funcional ponta a ponta
- contratos coerentes com frontend
- execução inválida rejeitada corretamente
- dados persistem e voltam do banco
- detail retorna contexto suficiente de prescrição, paciente e internação para uso operacional

### FASE 3.3 — FRONTEND / LISTAGEM E FORMULÁRIO

Objetivo:
Implementar UI utilizável, operacional e coerente com backend.

Arquivo prioritário:

- `apps/web/src/pages/nursing-executions.ts`

Listagem deve exibir no mínimo:

- identificador da execução
- prescrição/item
- atendimento
- paciente
- tutor
- internação, se houver
- horário previsto
- status
- responsável/quem executou
- sinais de atraso/pendência
- busca e filtros

Fluxos de criação/edição/operação devem ser divididos em blocos:

Bloco 1 — Contexto do caso

- prescrição
- item prescrito
- atendimento
- paciente
- tutor
- internação, se houver

Bloco 2 — Planejamento de execução

- `scheduledFor`
- `routeUsed`
- `dosageGiven` planejada ou valor operacional quando aplicável
- `requiresDoubleCheck`

Bloco 3 — Registro da execução

- `executionStatus`
- `administeredAt`
- `performerUserId`
- `administrationOutcome`
- `executionNotes`

Bloco 4 — Não execução / suspensão / atraso

- `notAdministeredAt`
- `nonExecutionReason`
- `delayReason`
- `suspendedAt`
- `cancelledAt`
- `adverseReactionFlag`
- `adverseReactionNotes`

Bloco 5 — Snapshot operacional

- `vitalSignsSnapshot`
- `siteUsed`
- `infusionRate`
- observações adicionais

Regras obrigatórias:

- não aceitar ID manual de prescrição, item, atendimento, paciente, tutor e internação como caminho principal
- usar contexto de entidades salvas
- permitir criação a partir do contexto da prescrição e/ou da internação
- implementar estados de loading, error, success, empty quando aplicável
- implementar validação por campo
- manter sincronização de `names/types/payload` com backend

Critério de conclusão:

- formulário/operação cria e atualiza corretamente
- listagem funciona
- detail funciona
- frontend está sincronizado com backend
- UX não depende de fluxo manual frágil

### FASE 3.4 — INTEGRAÇÃO COM PRESCRIÇÕES, INTERNAÇÃO, PRONTUÁRIO, ATENDIMENTOS, PACIENTES E TUTORES

Objetivo:
Fechar o fluxo operacional Prescrição → Execução → Rastreabilidade assistencial.

Fluxos obrigatórios:

1. localizar prescrição ativa
2. abrir contexto do item prescrito
3. registrar execução ou não execução
4. salvar
5. visualizar histórico operacional do item/caso

Fluxo recomendado adicional:

1. abrir detalhe da internação ou prescrição
2. clicar `Executar item` ou `Registrar execução`
3. abrir formulário com prescrição, item, atendimento, paciente e tutor já preenchidos
4. registrar a execução
5. salvar
6. voltar ao histórico do caso

Ações obrigatórias:

- reaproveitar o que já foi construído em Prescrições, Internação, Prontuário, Atendimentos, Pacientes e Tutores
- impedir que o fluxo principal recaia em campo manual
- impedir incoerência entre `prescriptionId`, `prescriptionItemId`, `encounterId`, `patientId`, `ownerId` e `hospitalizationId`
- manter fallback técnico apenas se estritamente necessário e nunca como UX principal

Critério de conclusão:

- fluxo assistencial real funciona ponta a ponta
- incoerência entre entidades é barrada no backend

### FASE 3.5 — HISTÓRICO, EVENTOS E RASTREABILIDADE

Objetivo:
Garantir que o módulo preserve o histórico operacional sem sobrescrita destrutiva simples.

Ações obrigatórias:

- permitir múltiplos eventos por execução quando fizer sentido
- permitir atualização controlada de execução sem apagar o histórico dos eventos
- garantir recuperação do histórico em ordem útil
- registrar eventos mínimos de criação, administração, não administração, atraso, suspensão e cancelamento quando ocorrerem
- impedir que edições simples destruam rastreabilidade do que foi executado ou não executado sem controle
- manter arquitetura simples e evolutiva

Critério de conclusão:

- histórico operacional fica visível
- alteração nova não apaga silenciosamente a anterior
- rastreabilidade mínima existe

### FASE 3.6 — VALIDAÇÕES

Backend:

- `prescriptionId` válido
- `prescriptionItemId` válido e coerente
- `encounterId` válido
- `patientId` válido
- `ownerId` válido
- `hospitalizationId` coerente quando informado
- `executionStatus` obrigatório
- `scheduledFor` obrigatório
- validação dos campos mínimos por tipo de execução
- item prescrito ativo/coerente quando aplicável

Frontend:

- validação por campo
- mensagens claras
- impedir envio evidentemente inválido

Critério de conclusão:

- erros críticos barrados no backend
- UX mínima de validação funcionando no frontend

### FASE 3.7 — TESTES MÍNIMOS

Criar testes focados do módulo cobrindo no mínimo:

- create execução
- update execução
- list execução
- detail execução
- create evento operacional quando aplicável
- rejeição de prescrição inexistente
- rejeição de item incoerente com a prescrição
- rejeição de incoerência entre prescrição/atendimento/paciente/tutor/internação
- autoria mínima, se aplicável
- fluxo de leitura persistida, se aplicável ao padrão do projeto
- registro de administração
- registro de não administração com motivo
- persistência correta do histórico de eventos

Critério de conclusão:

- testes focados do módulo executam com sucesso
- build e typecheck passam

## FASE 4 — VALIDAÇÃO CONTÍNUA

Após cada subfase:

- rodar build
- rodar typecheck
- validar funcionamento básico
- corrigir antes de avançar

Não avançar com erro aberto que afete a fase atual.

## FASE 5 — CORREÇÕES AUTOMÁTICAS DE CONSISTÊNCIA

Antes de finalizar:

- revisar frontend vs backend
- revisar contrato vs persistência
- revisar payloads
- revisar nomes divergentes
- revisar `executionStatus`, `eventType` e `administrationOutcome`
- revisar integração `prescription/item/encounter/patient/owner/hospitalization`
- revisar histórico e eventos
- corrigir automaticamente inconsistências básicas encontradas

Não deixar:

- campo novo sem persistência
- persistência sem exposição na API
- API sem consumo correto no frontend
- fluxo principal dependendo de atalho manual frágil
- histórico operacional sendo sobrescrito de forma destrutiva sem controle

## FASE 6 — PREPARAÇÃO PARA AUDITORIA

Confirmar:

- create execução funciona
- update execução funciona
- list execução funciona
- detail execução funciona
- prescrição/item sempre vinculados corretamente
- execução sempre coerente com paciente, tutor e internação quando houver
- integração com Prescrições, Internação, Prontuário, Atendimentos, Pacientes e Tutores funciona
- histórico operacional funciona
- backend usa banco como fonte real nos fluxos expostos
- frontend está sincronizado
- módulo está pronto para auditoria

Se houver bloqueio crítico:

- corrigir antes de encerrar

## SAÍDA INTERNA OBRIGATÓRIA POR FASE

Ao concluir cada fase principal, registrar internamente:

- o que foi alterado
- quais arquivos foram impactados
- quais critérios da fase foram atendidos
- quais riscos surgiram
- se existe alguma pendência bloqueante antes de seguir

Não avançar para a próxima fase se a fase atual ainda tiver bloqueio crítico aberto.

## REGRAS GLOBAIS DE IMPLEMENTAÇÃO

1. Não improvisar arquitetura.
2. Não criar abstração excessiva.
3. Não criar módulos paralelos desnecessários.
4. Não quebrar os módulos Prescrições, Internação, Prontuário, Atendimentos, Pacientes e Tutores.
5. Não usar memória como fonte principal.
6. Não aceitar fluxo manual frágil como caminho principal.
7. Não duplicar lógica sem necessidade.
8. Não expandir escopo para enfermagem por turno completa, farmácia, estoque ou aprazamento avançado.
9. Fazer apenas a refatoração mínima necessária.
10. Se houver conflito entre docs e código, seguir os docs com a menor ruptura possível.

## ENTREGA FINAL OBRIGATÓRIA

Ao final, entregar:

1. lista de arquivos alterados
2. lista de arquivos criados
3. resumo por fase do que foi implementado
4. pendências remanescentes, se existirem
5. riscos conhecidos, se existirem
6. confirmação final exata:

`Módulo Execução de Prescrição / Enfermagem pronto para auditoria`

Importante:
Não declarar pronto para produção.
Declarar apenas pronto para auditoria.

## CRITÉRIO DE SUCESSO

O módulo será considerado bem implementado se:

- a execução for registrada corretamente
- o vínculo com prescrição, item, atendimento, paciente, tutor e, quando aplicável, internação for obrigatório e funcional
- o fluxo assistencial operacional for coerente
- o histórico de execução for preservado
- frontend, backend e banco estiverem sincronizados
- o módulo estiver apto para auditoria enterprise

## FIM DO PROMPT
