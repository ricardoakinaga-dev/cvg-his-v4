# PROMPT MASTER — CVG-HIS-V2 — IMPLEMENTAÇÃO ENTERPRISE COMPLETA — MÓDULO EXAMES (Pedidos + Resultados)

## Objetivo

Implementar o módulo Exames (Pedidos + Resultados) do CVG-HIS-V2 de forma completa, consistente e em nível enterprise, usando a documentação em `/docs` como contrato único de verdade, garantindo integração total com os módulos Prontuário Clínico, Atendimentos, Pacientes, Tutores e Prescrições / Plano Terapêutico, e entregando o módulo em estado `PRONTO PARA AUDITORIA`.

Regra central:

A documentação em `/docs` é a fonte oficial de verdade.
O código deve obedecer aos documentos.
Se houver divergência entre código atual e contrato documental, ajustar o código para aderir ao contrato, com a menor ruptura possível da arquitetura existente.

Escopo desta execução:

- banco/schema
- backend/API
- frontend
- integração com Prontuário Clínico, Atendimentos, Pacientes, Tutores e Prescrições quando fizer sentido
- criação e gestão de pedidos de exame
- registro e visualização de resultados de exame
- fluxo operacional de solicitação → execução → resultado
- histórico e rastreabilidade mínima
- validações
- testes mínimos do módulo
- preparação para auditoria

Fora do escopo desta execução:

- integração com equipamentos laboratoriais
- LIS completo
- PACS/DICOM completo
- visualizador avançado de imagem
- laudos complexos com assinatura digital avançada
- faturamento de exames
- impressões finais refinadas
- auditoria final formal
- exclusão destrutiva de pedidos/resultados

## CONTEXTO DO DOMÍNIO

O módulo Exames representa o fluxo diagnóstico formal do caso clínico.

Um exame:

- nasce como pedido dentro de um contexto clínico
- se vincula a atendimento, paciente e tutor
- idealmente se relaciona a uma evolução/prontuário que justificou a solicitação
- pode gerar um ou mais resultados
- precisa preservar autoria, tempo, status e rastreabilidade
- não deve ser tratado como um CRUD genérico de textos soltos

Este módulo deve refletir uso real hospitalar veterinário:

- a equipe solicita exame
- o exame entra em fila/pendência
- o exame é coletado/realizado
- o resultado é registrado
- o resultado volta para leitura clínica do caso

## CONTRATO BASE DO MÓDULO EXAMES

Entidades centrais recomendadas:

- `exam_orders`
- `exam_order_items`
- `exam_results`
ou equivalente real do projeto, desde que mantenha o contrato documental

Campos obrigatórios mínimos do pedido de exame:

- id
- encounterId
- patientId
- ownerId
- medicalRecordEntryId
- orderType
- status
- requestedAt
- requestedByUserId
- createdAt
- updatedAt

Campos principais do pedido:

- title
- clinicalQuestion
- justification
- notes
- priority
- requestedSector
- externalProviderName

Campos de controle:

- updatedByUserId
- versionNumber
- supersedesOrderId
- collectedAt
- cancelledAt
- completedAt

Campos obrigatórios mínimos do item solicitado:

- id
- examOrderId
- examCode
- examName
- itemType
- sampleType
- instructions
- sequenceOrder

Campos opcionais relevantes do item:

- bodySite
- lateralization
- preparationNotes
- fastingRequired
- sedationSuggested
- urgencyReason

Campos obrigatórios mínimos do resultado:

- id
- examOrderId
- examOrderItemId
- resultType
- resultStatus
- recordedAt
- recordedByUserId
- createdAt
- updatedAt

Campos principais do resultado:

- summary
- findings
- impression
- conclusion
- structuredData
- attachmentsMeta
- abnormalFlag

Campos opcionais relevantes do resultado:

- measuredValues
- units
- referenceRange
- laboratoryName
- analystName
- signedAt

## REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. Pedido de exame não existe sem atendimento salvo.
2. Pedido de exame não existe sem paciente e tutor coerentes com o atendimento.
3. O fluxo principal não deve depender de digitação manual de IDs.
4. Deve ser possível criar pedido vinculado a uma entrada do prontuário ou, no mínimo, ao atendimento vigente.
5. `orderType` é obrigatório.
6. `status` é obrigatório.
7. `requestedAt` é obrigatório.
8. Um pedido deve conter pelo menos um item de exame.
9. Cada item deve ter `examName` ou código equivalente, `itemType` e dados mínimos suficientes para execução.
10. Resultado não existe sem item/pedido válido.
11. O sistema deve preservar rastreabilidade mínima de autoria e tempo.
12. O histórico diagnóstico não deve ser perdido por edição destrutiva simples.
13. Backend deve usar persistência/banco como fonte real de verdade.
14. Não usar memória volátil como fonte principal.
15. O módulo deve preparar terreno para anexos, laudos, laboratório e imagem, sem implementar integrações completas agora.
16. Exclusão destrutiva de pedidos e resultados não deve ser implementada.
17. Edição posterior deve preservar lógica de histórico, versionamento simples ou supersedência, conforme a arquitetura real permitir.

## ENUMS E ESTRUTURAS RECOMENDADAS

Tipos de pedido (`orderType`) permitidos:

- laboratory
- imaging
- cardiology
- pathology
- point_of_care
- external_exam
- monitoring_panel

Status permitidos do pedido:

- draft
- requested
- scheduled
- collected
- in_progress
- completed
- cancelled

Prioridade permitida:

- low
- normal
- high
- critical

Tipos de item (`itemType`) permitidos:

- lab_test
- imaging_test
- pathology_test
- panel
- measurement
- monitoring

Tipos de amostra (`sampleType`) permitidos:

- blood
- urine
- feces
- cytology
- tissue
- image
- none
- other

Tipos de resultado (`resultType`) permitidos:

- numeric
- textual
- imaging_report
- pathology_report
- panel_result
- attachment_only

Status permitidos do resultado (`resultStatus`):

- preliminary
- final
- amended
- cancelled

Estruturas auxiliares aceitáveis:

- `structuredData`: objeto simples serializável
- `measuredValues`: lista simples ou objeto simples
- `attachmentsMeta`: lista simples de metadados
- `flags`: lista simples de marcadores diagnósticos/operacionais

Estratégia de histórico recomendada:

- manter pedido e resultados separados por revisão
ou
- usar `supersedesOrderId` / `versionNumber`
ou
- usar result revisions
desde que preserve histórico e rastreabilidade

## ARQUIVOS REAIS CANDIDATOS A ALTERAÇÃO

Mapear e usar os arquivos reais existentes, priorizando:

- `apps/web/src/pages/exams.ts`
- `apps/api/src/server.ts`
- `packages/shared/database/src/schemas/index.ts`
- `packages/shared/contracts/src/index.ts`
- `packages/shared/types/src/index.ts`
- módulo real de `exams/exam-orders/exam-results`, se existir
- integrações com `medical-records`
- integrações com `encounters`
- integrações com `patients`
- integrações com `owners/tutores`
- testes existentes do `app/api`

Se houver migrations no projeto, criar migration incremental consistente com o padrão atual.

## FASE 0 — DOCUMENTAÇÃO DO MÓDULO EM /docs

Antes de implementar código:

1. Verificar se já existem documentos do módulo Exames em `/docs`.
2. Se não existirem, criar a documentação mínima necessária do módulo em `/docs`, em formato `.md`, cobrindo:
   - visão geral
   - contrato de dados
   - backend
   - frontend
   - integração com Prontuário, Atendimentos, Pacientes e Tutores
   - regras de negócio
   - fluxo operacional de pedido e resultado
   - estratégia de histórico/revisão
   - plano de implementação
   - critérios de aceite
   - plano de testes
   - gate de auditoria
3. Se já existirem, ler integralmente e seguir os documentos.
4. Não alterar outros arquivos fora de `/docs` nesta fase 0.

Importante:
A implementação do código só pode começar depois da leitura/consolidação documental.

## FASE 1 — INTERPRETAÇÃO DO PLANO

Ler toda a documentação do módulo Exames em `/docs` e extrair:

- contrato de dados
- regras de negócio
- campos obrigatórios
- campos opcionais
- estratégia de histórico
- fluxos principais
- dependências com Prontuário, Atendimentos, Pacientes, Tutores e Prescrições quando aplicável
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
- onde há risco de sobrescrever histórico diagnóstico de forma inadequada
- onde há risco de fluxo manual frágil entre atendimento, prontuário e exames

Saída esperada:
um entendimento interno claro do gap entre contrato e código.

## FASE 3 — IMPLEMENTAÇÃO CONTROLADA

### FASE 3.1 — BANCO / SCHEMA

Objetivo:
Fazer o banco suportar 100% do contrato do módulo Exames.

Ações obrigatórias:

- criar ou expandir schema de `exam_orders`
- criar ou expandir schema de `exam_order_items`
- criar ou expandir schema de `exam_results`
- adicionar campos obrigatórios
- adicionar campos diagnósticos estruturados
- adicionar campos de histórico/rastreabilidade
- adicionar auditoria mínima
- garantir vínculo consistente com `encounterId`, `patientId`, `ownerId` e `medicalRecordEntryId` quando aplicável
- preparar persistência para estruturas auxiliares e metadados
- criar migration incremental, se houver mecanismo de migrations

Critério de conclusão:

- persistência suporta create, update controlado, detail, list, histórico e resultado
- contrato do módulo está refletido no schema
- não há campo diagnóstico central só no frontend sem persistência real

### FASE 3.2 — BACKEND / API

Objetivo:
Implementar a API do módulo aderente ao contrato e usando banco como fonte real.

Rotas mínimas obrigatórias:

- `POST /exam-orders`
- `GET /exam-orders`
- `GET /exam-orders/:id`
- `PATCH /exam-orders/:id`
- `POST /exam-results`
- `GET /exam-results/:id`
- `PATCH /exam-results/:id`

Rotas opcionais aceitáveis se a arquitetura pedir:

- `GET /encounters/:id/exam-orders`
- `GET /medical-records/:id/exam-orders`
- `POST /exam-orders/:id/cancel`
- `POST /exam-orders/:id/complete`
- `POST /exam-results/:id/amend`

Ações obrigatórias:

- validar `encounterId` existente
- validar `patientId` e `ownerId` coerentes com o atendimento
- validar `medicalRecordEntryId` quando fornecido
- validar `orderType`
- validar `status`
- validar `requestedAt`
- validar existência de pelo menos um item de exame
- validar itens do pedido
- validar resultados vinculados a pedido/item existentes
- preencher `requestedByUserId`, `recordedByUserId`, `createdByUserId` e `updatedByUserId` conforme aplicável
- retornar payloads coerentes para list/detail
- permitir recuperar histórico por atendimento e, quando aplicável, por prontuário
- usar persistência como fonte operacional de verdade
- não depender de memória como base principal

Critério de conclusão:

- API funcional ponta a ponta
- contratos coerentes com frontend
- pedido/resultado inválido rejeitado corretamente
- dados persistem e voltam do banco
- detail retorna atendimento/paciente/tutor com grau de expansão suficiente para uso clínico e operacional

### FASE 3.3 — FRONTEND / LISTAGEM E FORMULÁRIO

Objetivo:
Implementar UI utilizável, diagnóstica e coerente com backend.

Arquivo prioritário:

- `apps/web/src/pages/exams.ts`

Listagem deve exibir no mínimo:

- identificador do pedido
- tipo do pedido
- atendimento
- paciente
- tutor
- data/hora da solicitação
- status
- prioridade
- resumo/título
- busca e filtros

Formulário de criação/edição do pedido deve ser dividido em blocos:

Bloco 1 — Contexto do caso

- atendimento
- paciente
- tutor
- vínculo com prontuário/evolução, se houver
- tipo do pedido
- data/hora da solicitação
- prioridade

Bloco 2 — Justificativa diagnóstica

- title
- clinicalQuestion
- justification
- notes

Bloco 3 — Itens do pedido

- examCode
- examName
- itemType
- sampleType
- instructions
- bodySite
- lateralization
- preparationNotes
- fastingRequired
- sedationSuggested
- urgencyReason

Bloco 4 — Controle do pedido

- status
- requestedSector
- externalProviderName

Formulário de resultado deve permitir:

- vincular ao pedido/item
- registrar `summary`
- `findings`
- `impression`
- `conclusion`
- `structuredData`
- `measuredValues`
- `referenceRange`
- `abnormalFlag`
- `resultStatus`
- `laboratoryName`
- `analystName`

Regras obrigatórias:

- não aceitar ID manual de atendimento, paciente, tutor e prontuário como caminho principal
- usar contexto de entidades salvas
- permitir criação a partir do contexto do atendimento e/ou da evolução clínica
- implementar estados de loading, error, success, empty quando aplicável
- implementar validação por campo
- manter sincronização de `names/types/payload` com backend

Critério de conclusão:

- formulário cria e edita corretamente
- listagem funciona
- detail funciona
- frontend está sincronizado com backend
- UX não depende de fluxo manual frágil

### FASE 3.4 — INTEGRAÇÃO COM PRONTUÁRIO, ATENDIMENTOS, PACIENTES E TUTORES

Objetivo:
Fechar o fluxo operacional Evolução Clínica → Pedido de Exame → Resultado.

Fluxos obrigatórios:

1. localizar atendimento
2. abrir contexto clínico do caso
3. criar pedido de exame
4. salvar
5. registrar resultado
6. visualizar histórico diagnóstico do caso

Fluxo recomendado adicional:

1. abrir detalhe da evolução clínica ou do atendimento
2. clicar `Novo exame` ou `Novo pedido`
3. abrir formulário com atendimento, paciente, tutor e evolução já preenchidos
4. registrar pedido e itens
5. salvar
6. depois abrir o pedido para lançar resultado
7. voltar ao histórico do caso

Ações obrigatórias:

- reaproveitar o que já foi construído em Prontuário, Atendimentos, Pacientes e Tutores
- impedir que o fluxo principal recaia em campo manual
- impedir incoerência entre `encounterId`, `patientId`, `ownerId` e `medicalRecordEntryId`
- manter fallback técnico apenas se estritamente necessário e nunca como UX principal

Critério de conclusão:

- fluxo diagnóstico real funciona ponta a ponta
- incoerência entre entidades é barrada no backend

### FASE 3.5 — HISTÓRICO, RESULTADOS E RASTREABILIDADE

Objetivo:
Garantir que o módulo preserve o histórico diagnóstico sem sobrescrita destrutiva simples.

Ações obrigatórias:

- permitir múltiplos pedidos por atendimento quando fizer sentido
- permitir múltiplos itens por pedido
- permitir um ou mais resultados por pedido/item conforme o contrato adotado
- garantir recuperação do histórico diagnóstico em ordem útil
- implementar estratégia mínima de revisão/amend quando houver alteração relevante
- impedir que edições simples destruam rastreabilidade do que foi solicitado ou resultado anteriormente sem controle
- manter arquitetura simples e evolutiva

Critério de conclusão:

- histórico diagnóstico do caso fica visível
- alteração nova não apaga silenciosamente a anterior
- rastreabilidade mínima existe

### FASE 3.6 — VALIDAÇÕES

Backend:

- `encounterId` válido
- `patientId` válido
- `ownerId` válido
- `medicalRecordEntryId` coerente quando informado
- coerência entre `encounterId`, `patientId`, `ownerId` e `medicalRecordEntryId`
- `orderType` obrigatório
- `status` obrigatório
- `requestedAt` obrigatório
- pelo menos um item obrigatório no pedido
- validação dos campos centrais de cada item
- validação dos campos centrais do resultado

Frontend:

- validação por campo
- mensagens claras
- impedir envio evidentemente inválido

Critério de conclusão:

- erros críticos barrados no backend
- UX mínima de validação funcionando no frontend

### FASE 3.7 — TESTES MÍNIMOS

Criar testes focados do módulo cobrindo no mínimo:

- create pedido de exame
- update/amend pedido de exame
- list pedido de exame
- detail pedido de exame
- create resultado
- detail resultado
- histórico por atendimento
- rejeição de atendimento inexistente
- rejeição de incoerência entre atendimento/paciente/tutor/prontuário
- autoria mínima, se aplicável
- fluxo de leitura persistida, se aplicável ao padrão do projeto
- criação de pedido a partir do contexto da evolução ou do atendimento, se implementado
- persistência correta dos itens do pedido
- persistência correta do resultado

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
- revisar `orderType`, `status`, `resultType`, `resultStatus` e `itemType`
- revisar integração `encounter/patient/owner/medicalRecordEntry`
- revisar histórico e revisões
- corrigir automaticamente inconsistências básicas encontradas

Não deixar:

- campo novo sem persistência
- persistência sem exposição na API
- API sem consumo correto no frontend
- fluxo principal dependendo de atalho manual frágil
- histórico diagnóstico sendo sobrescrito de forma destrutiva sem controle

## FASE 6 — PREPARAÇÃO PARA AUDITORIA

Confirmar:

- create pedido funciona
- update/amend pedido funciona
- list pedido funciona
- detail pedido funciona
- create resultado funciona
- detail resultado funciona
- pedido sempre vinculado a atendimento válido
- pedido sempre coerente com paciente e tutor
- integração com Prontuário, Atendimentos, Pacientes e Tutores funciona
- histórico diagnóstico funciona
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
4. Não quebrar os módulos Prontuário, Atendimentos, Pacientes, Tutores e Prescrições.
5. Não usar memória como fonte principal.
6. Não aceitar fluxo manual frágil como caminho principal.
7. Não duplicar lógica sem necessidade.
8. Não expandir escopo para LIS completo, imagem avançada, farmácia ou internação completa.
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

`Módulo Exames (Pedidos + Resultados) pronto para auditoria`

Importante:
Não declarar pronto para produção.
Declarar apenas pronto para auditoria.

## CRITÉRIO DE SUCESSO

O módulo será considerado bem implementado se:

- o pedido de exame for criado corretamente
- o resultado for registrado corretamente
- o vínculo com atendimento, paciente, tutor e, quando aplicável, prontuário for obrigatório e funcional
- o fluxo diagnóstico inicial for coerente
- os itens do pedido e os resultados forem persistidos corretamente
- o histórico diagnóstico for preservado
- frontend, backend e banco estiverem sincronizados
- o módulo estiver apto para auditoria enterprise

## FIM DO PROMPT
