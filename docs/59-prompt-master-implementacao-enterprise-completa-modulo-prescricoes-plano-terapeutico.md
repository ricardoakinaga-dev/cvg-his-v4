# PROMPT MASTER — CVG-HIS-V2 — IMPLEMENTAÇÃO ENTERPRISE COMPLETA — MÓDULO PRESCRIÇÕES / PLANO TERAPÊUTICO

## Objetivo

Implementar o módulo Prescrições / Plano Terapêutico do CVG-HIS-V2 de forma completa, consistente e em nível enterprise, usando a documentação em `/docs` como contrato único de verdade, garantindo integração total com os módulos Prontuário Clínico, Atendimentos, Pacientes e Tutores, e entregando o módulo em estado `PRONTO PARA AUDITORIA`.

Regra central:

A documentação em `/docs` é a fonte oficial de verdade.
O código deve obedecer aos documentos.
Se houver divergência entre código atual e contrato documental, ajustar o código para aderir ao contrato, com a menor ruptura possível da arquitetura existente.

Escopo desta execução:

- banco/schema
- backend/API
- frontend
- integração com Prontuário Clínico, Atendimentos, Pacientes e Tutores
- criação e edição controlada de prescrições
- plano terapêutico estruturado
- instruções de uso/orientações
- histórico e rastreabilidade mínima
- validações
- testes mínimos do módulo
- preparação para auditoria

Fora do escopo desta execução:

- estoque/farmácia completa
- checagem farmacológica avançada
- dispensação
- assinatura digital complexa
- impressão formal de receita com layout final
- faturamento terapêutico
- auditoria final formal
- exclusão destrutiva de prescrições

## CONTEXTO DO DOMÍNIO

O módulo Prescrições / Plano Terapêutico representa o registro formal da conduta terapêutica definida para um caso clínico.

Uma prescrição/plano terapêutico:

- sempre se relaciona a um atendimento válido e, preferencialmente, a uma evolução/prontuário relacionado
- se conecta indiretamente a paciente e tutor
- precisa registrar o que foi prescrito, orientado ou planejado
- precisa permitir múltiplos itens terapêuticos no mesmo plano
- precisa preservar autoria, tempo e histórico mínimo
- não deve ser tratado como um CRUD genérico de texto

Este módulo deve refletir uso real hospitalar veterinário:

- o atendimento existe
- a evolução clínica define uma conduta
- a equipe registra medicamentos, procedimentos, orientações e plano
- o sistema mantém rastreabilidade do que foi prescrito naquele episódio

## CONTRATO BASE DO MÓDULO PRESCRIÇÕES / PLANO TERAPÊUTICO

Entidades centrais recomendadas:

- `prescriptions`
- `prescription_items`
ou equivalente real do projeto, desde que mantenha o contrato documental

Campos obrigatórios mínimos da prescrição:

- id
- encounterId
- patientId
- ownerId
- medicalRecordEntryId
- prescriptionType
- status
- prescribedAt
- createdByUserId
- createdAt
- updatedAt

Campos principais da prescrição:

- title
- summary
- instructions
- therapeuticGoals
- notes

Campos de controle:

- updatedByUserId
- versionNumber
- supersedesPrescriptionId

Campos obrigatórios mínimos do item prescrito:

- id
- prescriptionId
- itemType
- itemName
- dosage
- route
- frequency
- duration
- sequenceOrder

Campos opcionais relevantes do item:

- concentration
- quantity
- unit
- administrationInstructions
- startAt
- endAt
- asNeeded
- asNeededReason
- cautionNotes

## REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. Prescrição não existe sem atendimento salvo.
2. Prescrição não existe sem paciente e tutor coerentes com o atendimento.
3. O fluxo principal não deve depender de digitação manual de IDs.
4. Deve ser possível criar uma prescrição ligada a uma entrada do prontuário ou, no mínimo, ao atendimento vigente.
5. `prescriptionType` é obrigatório.
6. `status` é obrigatório.
7. `prescribedAt` é obrigatório.
8. Uma prescrição deve conter pelo menos um item terapêutico ou orientação clínica formal equivalente, conforme o contrato adotado.
9. Cada item prescrito deve ter `itemType`, `itemName`, `dosage`, `route`, `frequency` e `duration` definidos, salvo exceções documentadas por tipo.
10. O sistema deve preservar rastreabilidade mínima de autoria e tempo.
11. O histórico terapêutico não deve ser perdido por edição destrutiva simples.
12. Backend deve usar persistência/banco como fonte real de verdade.
13. Não usar memória volátil como fonte principal.
14. O módulo deve preparar terreno para impressão, farmácia, alta e internação, sem implementar esses módulos completos agora.
15. Exclusão destrutiva de prescrição não deve ser implementada.
16. Edição posterior deve preservar lógica de histórico, versionamento simples ou supersedência, conforme a arquitetura real permitir.

## ENUMS E ESTRUTURAS RECOMENDADAS

Tipos de prescrição permitidos (`prescriptionType`):

- inpatient_medication
- outpatient_prescription
- therapeutic_plan
- discharge_instructions
- procedure_plan
- supportive_care_plan

Status permitidos:

- draft
- active
- amended
- superseded
- cancelled
- completed

Tipos de item permitidos (`itemType`):

- medication
- procedure
- care_instruction
- diet
- fluid_therapy
- monitoring
- exam_followup
- restriction

Vias permitidas (`route`) — aceitar conjunto simples e extensível:

- oral
- intravenous
- intramuscular
- subcutaneous
- topical
- ophthalmic
- otic
- inhaled
- rectal
- other

Estruturas auxiliares aceitáveis:

- `therapeuticGoals`: lista de strings
- `cautionNotes`: lista simples de strings
- `flags`: lista simples de marcadores terapêuticos/operacionais
- `instructions`: texto livre estruturado
- `administrationInstructions`: texto livre curto

Estratégia de histórico recomendada:

- manter prescrição separada por revisão
ou
- usar `supersedesPrescriptionId` + `versionNumber`
desde que preserve histórico e rastreabilidade

## ARQUIVOS REAIS CANDIDATOS A ALTERAÇÃO

Mapear e usar os arquivos reais existentes, priorizando:

- `apps/web/src/pages/prescriptions.ts`
- `apps/api/src/server.ts`
- `packages/shared/database/src/schemas/index.ts`
- `packages/shared/contracts/src/index.ts`
- `packages/shared/types/src/index.ts`
- módulo real de `prescriptions`, se existir
- integrações com `medical-records`
- integrações com `encounters`
- integrações com `patients`
- integrações com `owners/tutores`
- testes existentes do `app/api`

Se houver migrations no projeto, criar migration incremental consistente com o padrão atual.

## FASE 0 — DOCUMENTAÇÃO DO MÓDULO EM /docs

Antes de implementar código:

1. Verificar se já existem documentos do módulo Prescrições / Plano Terapêutico em `/docs`.
2. Se não existirem, criar a documentação mínima necessária do módulo em `/docs`, em formato `.md`, cobrindo:
   - visão geral
   - contrato de dados
   - backend
   - frontend
   - integração com Prontuário, Atendimentos, Pacientes e Tutores
   - regras de negócio
   - fluxo terapêutico operacional
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

Ler toda a documentação do módulo Prescrições / Plano Terapêutico em `/docs` e extrair:

- contrato de dados
- regras de negócio
- campos obrigatórios
- campos opcionais
- estratégia de histórico
- fluxos principais
- dependências com Prontuário, Atendimentos, Pacientes e Tutores
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
- onde há risco de sobrescrever histórico terapêutico de forma inadequada
- onde há risco de fluxo manual frágil entre atendimento, prontuário e prescrição

Saída esperada:
um entendimento interno claro do gap entre contrato e código.

## FASE 3 — IMPLEMENTAÇÃO CONTROLADA

### FASE 3.1 — BANCO / SCHEMA

Objetivo:
Fazer o banco suportar 100% do contrato do módulo Prescrições / Plano Terapêutico.

Ações obrigatórias:

- criar ou expandir schema de `prescriptions`
- criar ou expandir schema de `prescription_items`
- adicionar campos obrigatórios
- adicionar campos terapêuticos estruturados
- adicionar campos de histórico/rastreabilidade
- adicionar auditoria mínima
- garantir vínculo consistente com `encounterId`, `patientId`, `ownerId` e `medicalRecordEntryId` quando aplicável
- preparar persistência para listas simples e estruturas auxiliares
- criar migration incremental, se houver mecanismo de migrations

Critério de conclusão:

- persistência suporta create, update controlado, detail, list e histórico
- contrato do módulo está refletido no schema
- não há campo terapêutico central só no frontend sem persistência real

### FASE 3.2 — BACKEND / API

Objetivo:
Implementar a API do módulo aderente ao contrato e usando banco como fonte real.

Rotas mínimas obrigatórias:

- `POST /prescriptions`
- `GET /prescriptions`
- `GET /prescriptions/:id`
- `PATCH /prescriptions/:id`

Rotas opcionais aceitáveis se a arquitetura pedir:

- `GET /encounters/:id/prescriptions`
- `GET /medical-records/:id/prescriptions`
- `POST /prescriptions/:id/amend`
- `POST /prescriptions/:id/supersede`
- `POST /prescriptions/:id/cancel`
- `POST /prescriptions/:id/complete`

Ações obrigatórias:

- validar `encounterId` existente
- validar `patientId` e `ownerId` coerentes com o atendimento
- validar `medicalRecordEntryId` quando fornecido
- validar `prescriptionType`
- validar `status`
- validar `prescribedAt`
- validar existência de pelo menos um item ou orientação formal equivalente conforme contrato adotado
- validar itens prescritos
- preencher `createdByUserId` e `updatedByUserId`
- retornar payloads coerentes para list/detail
- permitir recuperar histórico por atendimento e, quando aplicável, por prontuário
- usar persistência como fonte operacional de verdade
- não depender de memória como base principal

Critério de conclusão:

- API funcional ponta a ponta
- contratos coerentes com frontend
- prescrição inválida rejeitada corretamente
- dados persistem e voltam do banco
- detail retorna atendimento/paciente/tutor com grau de expansão suficiente para uso clínico e operacional

### FASE 3.3 — FRONTEND / LISTAGEM E FORMULÁRIO

Objetivo:
Implementar UI utilizável, terapêutica e coerente com backend.

Arquivo prioritário:

- `apps/web/src/pages/prescriptions.ts`

Listagem deve exibir no mínimo:

- identificador da prescrição
- tipo da prescrição
- atendimento
- paciente
- tutor
- data/hora da prescrição
- status
- resumo ou título
- autor, se disponível
- busca e filtros

Formulário de criação/edição deve ser dividido em blocos:

Bloco 1 — Contexto do caso

- atendimento
- paciente
- tutor
- vínculo com prontuário/evolução, se houver
- tipo da prescrição
- data/hora da prescrição

Bloco 2 — Plano terapêutico principal

- title
- summary
- instructions
- therapeuticGoals
- notes

Bloco 3 — Itens prescritos

- itemType
- itemName
- dosage
- route
- frequency
- duration
- concentration
- quantity
- unit
- administrationInstructions
- asNeeded
- asNeededReason
- cautionNotes

Bloco 4 — Controle e status

- status
- versionamento/supersedes, se aplicável

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
- frontend está sincronizado com backend
- UX não depende de fluxo manual frágil

### FASE 3.4 — INTEGRAÇÃO COM PRONTUÁRIO, ATENDIMENTOS, PACIENTES E TUTORES

Objetivo:
Fechar o fluxo operacional Evolução Clínica → Prescrição.

Fluxos obrigatórios:

1. localizar atendimento
2. abrir contexto clínico do caso
3. criar prescrição/plano terapêutico
4. salvar
5. visualizar histórico terapêutico do caso

Fluxo recomendado adicional:

1. abrir detalhe da evolução clínica ou do atendimento
2. clicar `Nova prescrição` ou `Novo plano terapêutico`
3. abrir formulário com atendimento, paciente, tutor e evolução já preenchidos
4. registrar plano e itens
5. salvar
6. voltar ao histórico do caso

Ações obrigatórias:

- reaproveitar o que já foi construído em Prontuário, Atendimentos, Pacientes e Tutores
- impedir que o fluxo principal recaia em campo manual
- impedir incoerência entre `encounterId`, `patientId`, `ownerId` e `medicalRecordEntryId`
- manter fallback técnico apenas se estritamente necessário e nunca como UX principal

Critério de conclusão:

- fluxo terapêutico real funciona ponta a ponta
- incoerência entre entidades é barrada no backend

### FASE 3.5 — HISTÓRICO, REVISÃO E RASTREABILIDADE

Objetivo:
Garantir que a prescrição preserve continuidade e rastreabilidade sem sobrescrita destrutiva simples.

Ações obrigatórias:

- permitir múltiplas prescrições por atendimento quando fizer sentido
- permitir múltiplos itens na mesma prescrição
- garantir recuperação do histórico terapêutico em ordem útil
- implementar estratégia mínima de revisão/supersedência se houver edição relevante
- impedir que edições simples destruam rastreabilidade do que foi prescrito anteriormente sem controle
- manter arquitetura simples e evolutiva

Critério de conclusão:

- histórico terapêutico do caso fica visível
- revisão nova não apaga silenciosamente a anterior
- rastreabilidade mínima existe

### FASE 3.6 — VALIDAÇÕES

Backend:

- `encounterId` válido
- `patientId` válido
- `ownerId` válido
- `medicalRecordEntryId` coerente quando informado
- coerência entre `encounterId`, `patientId`, `ownerId` e `medicalRecordEntryId`
- `prescriptionType` obrigatório
- `status` obrigatório
- `prescribedAt` obrigatório
- item terapêutico ou orientação formal mínima obrigatória
- validação dos campos centrais de cada item

Frontend:

- validação por campo
- mensagens claras
- impedir envio evidentemente inválido

Critério de conclusão:

- erros críticos barrados no backend
- UX mínima de validação funcionando no frontend

### FASE 3.7 — TESTES MÍNIMOS

Criar testes focados do módulo cobrindo no mínimo:

- create prescrição
- update/amend prescrição
- list prescrição
- detail prescrição
- histórico por atendimento
- rejeição de atendimento inexistente
- rejeição de incoerência entre atendimento/paciente/tutor/prontuário
- autoria mínima, se aplicável
- fluxo de leitura persistida, se aplicável ao padrão do projeto
- criação de prescrição a partir do contexto da evolução ou do atendimento, se implementado
- preservação do histórico após revisão/supersedência
- persistência correta dos itens prescritos

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
- revisar `prescriptionType`, `status`, `itemType` e `route`
- revisar integração `encounter/patient/owner/medicalRecordEntry`
- revisar histórico e supersedência
- corrigir automaticamente inconsistências básicas encontradas

Não deixar:

- campo novo sem persistência
- persistência sem exposição na API
- API sem consumo correto no frontend
- fluxo principal dependendo de atalho manual frágil
- histórico terapêutico sendo sobrescrito de forma destrutiva sem controle

## FASE 6 — PREPARAÇÃO PARA AUDITORIA

Confirmar:

- create funciona
- update/amend funciona
- list funciona
- detail funciona
- prescrição sempre vinculada a atendimento válido
- prescrição sempre coerente com paciente e tutor
- integração com Prontuário, Atendimentos, Pacientes e Tutores funciona
- histórico terapêutico funciona
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
4. Não quebrar os módulos Prontuário, Atendimentos, Pacientes e Tutores.
5. Não usar memória como fonte principal.
6. Não aceitar fluxo manual frágil como caminho principal.
7. Não duplicar lógica sem necessidade.
8. Não expandir escopo para farmácia completa, exames completos ou internação completa.
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

`Módulo Prescrições / Plano Terapêutico pronto para auditoria`

Importante:
Não declarar pronto para produção.
Declarar apenas pronto para auditoria.

## CRITÉRIO DE SUCESSO

O módulo será considerado bem implementado se:

- a prescrição for criada corretamente
- o vínculo com atendimento, paciente, tutor e, quando aplicável, prontuário for obrigatório e funcional
- o fluxo terapêutico inicial for coerente
- os itens prescritos forem persistidos corretamente
- o histórico terapêutico for preservado
- frontend, backend e banco estiverem sincronizados
- o módulo estiver apto para auditoria enterprise

## FIM DO PROMPT
